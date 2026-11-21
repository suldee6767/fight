import type * as Phaser from 'phaser';

import type { CharacterDefinition, HeroBoundsFrame } from './hero';
import {
  buildFighterCharacter,
  collisionBounds,
  hitBounds,
  rect,
  type FighterActionSpec
} from './fighterCharacter';
import { MY_FIGHTERS, type MyFighter } from './myFighters';
import {
  RAW_CELL,
  buildBlitzSheet,
  frameToCanvas,
  loadFirstImage,
  placeholderRawSheet,
  reverseRawSheet,
  sliceRawSheet,
  type RawSheet
} from './rawSheet';
import type { Rect } from './types';

/**
 * Fighters listed in `myFighters.ts` are built from raw AI-drawn pose sheets
 * at boot (see `rawSheet.ts`) instead of hand-made 256px spritesheets. A
 * missing picture falls back to the next one in its `sources` list, so a
 * fighter works with `idle` alone and improves as pictures are added.
 */

const SHEET_NAMES = ['idle', 'walk', 'punch', 'kick', 'hit', 'ko', 'jump', 'crouch', 'block', 'special'] as const;

type SheetName = (typeof SHEET_NAMES)[number];

interface ActionPlan {
  action: string;
  label: string;
  /** Picture names to try, best first. */
  sources: SheetName[];
  frameRate: number;
  repeat: number;
  reverse?: boolean;
  /** Vertical slice of the frame the attack covers (the reach is measured). */
  attack?: { y: number; height: number };
  guard?: Rect;
}

const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const STANDING = rect(76, 28, 104, 204);
const CROUCHING = rect(72, 104, 112, 126);
const PUNCH_ZONE = { y: 84, height: 46 };
const KICK_ZONE = { y: 48, height: 80 };
const SPECIAL_ZONE = { y: 36, height: 100 };

const ACTION_PLANS: ActionPlan[] = [
  { action: 'idle', label: 'Idle', sources: ['idle'], frameRate: 6, repeat: -1 },
  { action: 'walk-forward', label: 'Walk Forward', sources: ['walk', 'idle'], frameRate: 8, repeat: -1 },
  {
    action: 'walk-backward',
    label: 'Walk Backward',
    sources: ['walk', 'idle'],
    frameRate: 8,
    repeat: -1,
    reverse: true
  },
  { action: 'crouch', label: 'Crouch', sources: ['crouch', 'idle'], frameRate: 10, repeat: 0 },
  { action: 'jump', label: 'Jump', sources: ['jump', 'idle'], frameRate: 8, repeat: 0 },
  {
    action: 'block-high',
    label: 'Block High',
    sources: ['block', 'idle'],
    frameRate: 10,
    repeat: 0,
    guard: rect(60, 44, 136, 116)
  },
  {
    action: 'block-low',
    label: 'Block Low',
    sources: ['block', 'crouch', 'idle'],
    frameRate: 10,
    repeat: 0,
    guard: rect(60, 110, 136, 120)
  },
  { action: 'hit-high', label: 'Hit', sources: ['hit', 'idle'], frameRate: 10, repeat: 0 },
  {
    action: 'light-punch',
    label: 'Punch',
    sources: ['punch', 'idle'],
    frameRate: 12,
    repeat: 0,
    attack: PUNCH_ZONE
  },
  {
    action: 'heavy-kick',
    label: 'Kick',
    sources: ['kick', 'punch', 'idle'],
    frameRate: 10,
    repeat: 0,
    attack: KICK_ZONE
  },
  { action: 'special-charge', label: 'Special Charge', sources: ['crouch', 'idle'], frameRate: 10, repeat: 0 },
  {
    action: 'special',
    label: 'Special',
    sources: ['special', 'kick', 'punch', 'idle'],
    frameRate: 10,
    repeat: 0,
    attack: SPECIAL_ZONE
  },
  { action: 'knockdown', label: 'Knockdown', sources: ['ko', 'hit', 'idle'], frameRate: 8, repeat: 0 }
];

const PLACEHOLDER_FRAMES = 1;

function toSpec(plan: ActionPlan): FighterActionSpec {
  return {
    action: plan.action,
    label: plan.label,
    file: `${plan.sources[0]}.png`,
    frames: PLACEHOLDER_FRAMES,
    frameRate: plan.frameRate,
    repeat: plan.repeat,
    defaultVisual: STANDING,
    guard: plan.guard
  };
}

function buildMyFighter(fighter: MyFighter): CharacterDefinition {
  const character = buildFighterCharacter({
    id: fighter.id,
    label: fighter.name,
    assetRoot: `/assets/${fighter.id}`,
    anchorUsage: `${fighter.name} (built from raw pose sheets)`,
    portraitFile: 'portrait.png',
    actions: ACTION_PLANS.map(toSpec)
  });

  // Textures for these assets are made in `prepareMyFighters`, not by the loader.
  character.assets.forEach((asset) => {
    asset.auto = true;
  });

  return character;
}

export const MY_FIGHTER_CHARACTERS: CharacterDefinition[] = MY_FIGHTERS.filter(
  (fighter) => /^[a-z0-9][a-z0-9-]*$/.test(fighter.id)
).map(buildMyFighter);

export const MY_FIGHTER_IDS: string[] = MY_FIGHTER_CHARACTERS.map((character) => character.id);

/**
 * Load, slice and register every picture of the fighters in `myFighters.ts`.
 * Must finish before animations are registered.
 * @param scene - The boot scene (owner of the texture manager).
 */
export async function prepareMyFighters(scene: Phaser.Scene): Promise<void> {
  MY_FIGHTERS.filter((fighter) => !MY_FIGHTER_IDS.includes(fighter.id)).forEach((fighter) => {
    console.warn(`[my-fighter] "${fighter.id}" skipped: id must be lowercase english letters, numbers or "-"`);
  });

  for (const character of MY_FIGHTER_CHARACTERS) {
    const fighter = MY_FIGHTERS.find((candidate) => candidate.id === character.id);

    if (fighter) {
      await prepareFighter(scene, character, fighter);
    }
  }
}

async function prepareFighter(
  scene: Phaser.Scene,
  character: CharacterDefinition,
  fighter: MyFighter
): Promise<void> {
  const root = `/assets/${fighter.id}`;
  const urls = (name: string): string[] => EXTENSIONS.map((extension) => `${root}/${name}.${extension}`);
  const sheets = new Map<SheetName, RawSheet | null>();

  const getSheet = async (name: SheetName): Promise<RawSheet | null> => {
    if (!sheets.has(name)) {
      const image = await loadFirstImage(urls(name));
      const sheet = image ? sliceRawSheet(image, { flip: fighter.flip, frames: fighter.frames?.[name] }) : null;

      sheets.set(name, sheet);
    }

    return sheets.get(name) ?? null;
  };

  for (const plan of ACTION_PLANS) {
    const animation = character.animations.find((candidate) => candidate.action === plan.action);

    if (!animation) {
      continue;
    }

    let used: SheetName | null = null;
    let sheet: RawSheet | null = null;
    let customActiveFrames: number[] | undefined;

    if (plan.action === 'special' && fighter.traits?.blitzSpecial) {
      const dedicatedSpecial = await getSheet('special');
      if (dedicatedSpecial) {
        sheet = dedicatedSpecial;
        used = 'special';
      } else {
        const punchSheet = await getSheet('punch');
        const kickSheet = await getSheet('kick');
        if (punchSheet && kickSheet) {
          const blitz = buildBlitzSheet(punchSheet, kickSheet);
          sheet = blitz.sheet;
          customActiveFrames = blitz.activeFrames;
          used = 'kick';
        }
      }
    }

    if (!sheet) {
      const sources: SheetName[] =
        plan.action === 'special-charge' && fighter.traits?.blitzSpecial
          ? ['crouch', 'punch', 'idle']
          : plan.sources;

      for (const name of sources) {
        sheet = await getSheet(name);

        if (sheet) {
          used = name;
          break;
        }
      }
    }

    if (!sheet) {
      sheet = placeholderRawSheet();
    }

    if (plan.reverse) {
      sheet = reverseRawSheet(sheet);
    }

    const usesRangedSpecial = Boolean(
      fighter.traits?.hollowPurpleSpecial ||
        fighter.traits?.beamSpecial ||
        fighter.traits?.meteorSpecial ||
        fighter.traits?.domainSlashSpecial ||
        fighter.traits?.angledOrbSpecial
    );

    if (plan.action === 'light-punch' && fighter.traits?.doubleLightPunch && sheet.frames >= 5) {
      customActiveFrames = [1, 3];
    } else if (plan.action === 'heavy-kick' && fighter.traits?.projectileHeavy) {
      customActiveFrames = [];
    } else if (plan.action === 'special' && usesRangedSpecial) {
      customActiveFrames = [];
    } else if (plan.action === 'heavy-kick' && fighter.traits?.swordSlashStyle && sheet.frames >= 6) {
      customActiveFrames = [2, 4];
    }

    const customRate = fighter.traits?.actionFrameRates?.[plan.action];
    if (typeof customRate === 'number' && customRate > 0) {
      animation.frameRate = customRate;
    }

    animation.sheet.frames = sheet.frames;
    animation.bounds = buildBounds(
      sheet,
      plan,
      used,
      customActiveFrames,
      Boolean(fighter.traits?.swordSlashStyle),
      Boolean(fighter.traits?.longReach)
    );
    addSheetTexture(scene, animation.sheet.key, sheet);
  }

  const portrait = await loadFirstImage(urls('portrait'));
  const idle = sheets.get('idle') ?? placeholderRawSheet();
  const fallbackPortrait = cropToPose(idle);

  replaceTexture(scene, character.portrait.key);

  if (portrait) {
    scene.textures.addImage(character.portrait.key, portrait);
  } else {
    scene.textures.addCanvas(character.portrait.key, fallbackPortrait);
  }

  if (character.anchorAsset.key !== character.portrait.key) {
    replaceTexture(scene, character.anchorAsset.key);
    scene.textures.addCanvas(character.anchorAsset.key, frameToCanvas(idle));
  }

  const report = SHEET_NAMES.map((name) => `${name} ${sheets.get(name)?.frames ?? '-'}`);

  console.info(`[my-fighter] ${fighter.id}: ${report.join(', ')}   (number = poses found, "-" = no picture)`);

  if (!sheets.get('idle')) {
    console.warn(`[my-fighter] ${fighter.id}: public${root}/idle.png not found or has no pose in it`);
  }
}

function buildBounds(
  sheet: RawSheet,
  plan: ActionPlan,
  used: SheetName | null,
  customActiveFrames?: number[],
  hasSword = false,
  longReach = false
): HeroBoundsFrame[] {
  const body = used === 'crouch' ? CROUCHING : STANDING;
  const active = plan.attack ? (customActiveFrames ?? attackFrames(sheet)) : [];
  const isBlitz = Boolean(customActiveFrames && customActiveFrames.length > 0 && plan.action === 'special');

  return sheet.boxes.map((box, frame) => {
    const extraLeft = isBlitz || hasSword || longReach ? 22 : 0;
    const attackLeft = Math.max(0, box.x - extraLeft);
    const attackWidth = Math.max(
      isBlitz || hasSword || longReach ? 78 : 48,
      RAW_CELL / 2 + (isBlitz ? 10 : hasSword || longReach ? 20 : -10) - attackLeft
    );
    const attackHeight = isBlitz ? 140 : hasSword ? 110 : plan.attack?.height ?? 60;

    return {
      frame,
      visual: { ...box },
      collision: collisionBounds(body, RAW_CELL, RAW_CELL),
      hit: hitBounds(box, RAW_CELL, RAW_CELL),
      attack:
        plan.attack && active.includes(frame)
          ? rect(attackLeft, plan.attack.y, attackWidth, attackHeight)
          : null,
      guard: plan.guard ? { ...plan.guard } : null
    };
  });
}

/**
 * The frames where the attack can land: those where the pose reaches furthest
 * forward (fighters face left, so "forward" is the left edge of the pose).
 */
function attackFrames(sheet: RawSheet): number[] {
  const reaches = sheet.boxes.map((box) => RAW_CELL / 2 - box.x);
  const furthest = Math.max(...reaches);

  if (furthest - Math.min(...reaches) < 15) {
    return [Math.floor(sheet.frames / 2)];
  }

  return reaches.flatMap((reach, frame) => (reach >= furthest - 12 ? [frame] : []));
}

function addSheetTexture(scene: Phaser.Scene, key: string, sheet: RawSheet): void {
  replaceTexture(scene, key);
  // Phaser accepts a canvas here at runtime; the typings only list images.
  scene.textures.addSpriteSheet(key, sheet.canvas as unknown as HTMLImageElement, {
    frameWidth: RAW_CELL,
    frameHeight: RAW_CELL,
    startFrame: 0,
    endFrame: sheet.frames - 1
  });
}

function replaceTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
}

/** First idle pose, cropped square around the body, for the select card. */
function cropToPose(sheet: RawSheet): HTMLCanvasElement {
  const box = sheet.boxes[0];
  const size = Math.max(box.width, box.height) + 16;
  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext('2d')
    ?.drawImage(
      frameToCanvas(sheet),
      box.x,
      box.y,
      box.width,
      box.height,
      Math.round((size - box.width) / 2),
      Math.round((size - box.height) / 2),
      box.width,
      box.height
    );

  return canvas;
}

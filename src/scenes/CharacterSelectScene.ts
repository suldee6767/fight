import * as Phaser from 'phaser';

import { AUDIO_KEYS, playAudioCue } from '../game/core/audio';
import { getSkillRankDefinition } from '../game/combatSystem';
import { FIGHTER_CHARACTER_DEFINITIONS, type CharacterDefinition } from '../game/hero';
import { getFighterMeta } from '../game/myFighters';
import { TITLE_ARENA_BG_KEY } from '../game/stageConfig';
import { createSelectionCard, type SelectionCard } from '../game/ui';
import { SCENE_KEYS, type MatchMode } from '../game/types';
import { BaseScene } from './BaseScene';

interface CharacterSelectData {
  mode: MatchMode;
  stageId: string;
}

const P1_COLOR = 0x38bdf8;
const P2_COLOR = 0xf43f5e;

const HERO_IDS = ['gojo', 'tanjiro', 'naruto', 'goku', 'luffy', 'street-hero', 'bayasaa'];
const VILLAIN_AND_CHALLENGER_IDS = ['sukuna', 'muzan', 'madara', 'frieza', 'red-brawler', 'jiujitsu-fighter'];

const HERO_ROSTER = HERO_IDS.flatMap((id) =>
  FIGHTER_CHARACTER_DEFINITIONS.filter((character) => character.id === id)
);
const VILLAIN_ROSTER = VILLAIN_AND_CHALLENGER_IDS.flatMap((id) =>
  FIGHTER_CHARACTER_DEFINITIONS.filter((character) => character.id === id)
);
const SELECTABLE_ROSTER: CharacterDefinition[] = [...HERO_ROSTER, ...VILLAIN_ROSTER];

const CARD_WIDTH = 148;
const CARD_HEIGHT = 164;
const CARD_GAP = 16;

interface PlayerCursor {
  index: number;
  locked: boolean;
  outline: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface SpotlightSide {
  portrait: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Text;
  rankBg: Phaser.GameObjects.Rectangle;
  rankText: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  special: Phaser.GameObjects.Text;
  summary: Phaser.GameObjects.Text;
  offense: Phaser.GameObjects.Text;
  defense: Phaser.GameObjects.Text;
}

/**
 * Final step of the Play flow: 2-row Heroes vs Villains & Rivals roster grid
 * with a live bottom P1 vs P2 Spotlight Panel showing portrait, series, special
 * move name, and gameplay kit summary.
 */
export class CharacterSelectScene extends BaseScene {
  private mode: MatchMode = '1v1';
  private stageId = '';
  private cards: SelectionCard[] = [];
  private cardPositions: Array<{ x: number; y: number }> = [];
  private p1!: PlayerCursor;
  private p2!: PlayerCursor;
  private p1Spot!: SpotlightSide;
  private p2Spot!: SpotlightSide;
  private transitioning = false;

  constructor() {
    super(SCENE_KEYS.CharacterSelect);
  }

  init(data: CharacterSelectData): void {
    this.mode = data?.mode ?? '1v1';
    this.stageId = data?.stageId ?? '';
  }

  create(): void {
    this.cards = [];
    this.cardPositions = [];
    this.transitioning = false;

    this.markActiveScene(SCENE_KEYS.CharacterSelect);
    this.setGameState('title');
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x020617);

    if (this.textures.exists(TITLE_ARENA_BG_KEY)) {
      const bg = this.add.image(width / 2, height / 2, TITLE_ARENA_BG_KEY).setAlpha(0.18).setDepth(0);
      bg.setScale(Math.max(width / (bg.width || width), height / (bg.height || height)));
    }

    this.createHeading(
      'Select Fighter',
      this.mode === '1v1'
        ? 'P1: WASD + Space/F   •   P2: Arrows + Enter'
        : 'WASD / Arrows to choose   •   Enter / Click to lock in'
    );

    this.buildCards();
    this.buildSpotlightPanel();
    this.buildCursors();
    this.registerInput();

    this.createFooterHint('Esc to go back');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cards.forEach((card) => card.destroy());
      this.cards = [];
    });
  }

  private buildCards(): void {
    const { centerX } = this.cameras.main;

    this.add
      .text(centerX, 108, 'HEROES', {
        color: '#38bdf8',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const row1Width = CARD_WIDTH * HERO_ROSTER.length + CARD_GAP * (HERO_ROSTER.length - 1);
    const row1StartX = centerX - row1Width / 2 + CARD_WIDTH / 2;
    const row1Y = 200;

    HERO_ROSTER.forEach((character, i) => {
      const x = row1StartX + i * (CARD_WIDTH + CARD_GAP);
      const index = this.cardPositions.length;
      this.cardPositions.push({ x, y: row1Y });
      const meta = getFighterMeta(character.id);
      const rankDef = getSkillRankDefinition(meta.rank);

      const card = createSelectionCard(this, {
        x,
        y: row1Y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        title: character.label,
        texture: this.textures.exists(character.portrait.key) ? character.portrait.key : undefined,
        badge: { text: meta.series, color: meta.accentColor },
        rankBadge: { text: rankDef.label, color: rankDef.colorNum },
        baseBorderColor: rankDef.colorNum,
        imageMaxSize: 98,
        imageOffsetY: -6,
        onHover: () => this.hoverCard(index),
        onClick: () => this.clickCard(index)
      });

      this.cards.push(card);
    });

    this.add
      .text(centerX, 300, 'VILLAINS & RIVALS', {
        color: '#f43f5e',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const row2Width = CARD_WIDTH * VILLAIN_ROSTER.length + CARD_GAP * (VILLAIN_ROSTER.length - 1);
    const row2StartX = centerX - row2Width / 2 + CARD_WIDTH / 2;
    const row2Y = 392;

    VILLAIN_ROSTER.forEach((character, i) => {
      const x = row2StartX + i * (CARD_WIDTH + CARD_GAP);
      const index = this.cardPositions.length;
      this.cardPositions.push({ x, y: row2Y });
      const meta = getFighterMeta(character.id);
      const rankDef = getSkillRankDefinition(meta.rank);

      const card = createSelectionCard(this, {
        x,
        y: row2Y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        title: character.label,
        texture: this.textures.exists(character.portrait.key) ? character.portrait.key : undefined,
        badge: { text: meta.series, color: meta.accentColor },
        rankBadge: { text: rankDef.label, color: rankDef.colorNum },
        baseBorderColor: rankDef.colorNum,
        imageMaxSize: 98,
        imageOffsetY: -6,
        onHover: () => this.hoverCard(index),
        onClick: () => this.clickCard(index)
      });

      this.cards.push(card);
    });
  }

  private buildSpotlightPanel(): void {
    const { centerX } = this.cameras.main;
    const panelY = 580;
    const panelW = 1132;
    const panelH = 160;

    this.add
      .rectangle(centerX, panelY, panelW, panelH, 0x0b1222, 0.94)
      .setStrokeStyle(2, 0x334155, 1)
      .setDepth(5);

    this.add
      .text(centerX, panelY, 'VS', {
        color: '#facc15',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(8);

    // P1 left side
    const p1LeftX = centerX - panelW / 2 + 138;
    const p1Portrait = this.add.image(centerX - panelW / 2 + 72, panelY, '').setDepth(7).setFlipX(true);
    const p1Tag = this.add
      .text(p1LeftX, panelY - 58, 'PLAYER 1', {
        color: '#38bdf8',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '12px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(7);
    const p1RankBg = this.add
      .rectangle(p1LeftX + 180, panelY - 58, 78, 18, 0xfacc15, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(7);
    const p1RankText = this.add
      .text(p1LeftX + 219, panelY - 58, 'MYTHIC', {
        color: '#020617',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(8);
    const p1Name = this.add
      .text(p1LeftX, panelY - 30, '', {
        color: '#ffffff',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '32px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(7);
    const p1Special = this.add
      .text(p1LeftX, panelY, '', {
        color: '#facc15',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(7);
    const p1Summary = this.add
      .text(p1LeftX, panelY + 22, '', {
        color: '#cbd5e1',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '12px'
      })
      .setOrigin(0, 0.5)
      .setDepth(7);
    const p1Offense = this.add
      .text(p1LeftX, panelY + 42, '', {
        color: '#fca5a5',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(7);
    const p1Defense = this.add
      .text(p1LeftX, panelY + 60, '', {
        color: '#7dd3fc',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(7);

    this.p1Spot = {
      portrait: p1Portrait,
      tag: p1Tag,
      rankBg: p1RankBg,
      rankText: p1RankText,
      name: p1Name,
      special: p1Special,
      summary: p1Summary,
      offense: p1Offense,
      defense: p1Defense
    };

    // P2 right side
    const p2RightX = centerX + panelW / 2 - 138;
    const p2Portrait = this.add.image(centerX + panelW / 2 - 72, panelY, '').setDepth(7);
    const p2Tag = this.add
      .text(p2RightX, panelY - 58, this.mode === '1vcpu' ? 'CPU OPPONENT' : 'PLAYER 2', {
        color: '#f43f5e',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '12px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0.5)
      .setDepth(7);
    const p2RankBg = this.add
      .rectangle(p2RightX - 180, panelY - 58, 78, 18, 0xfacc15, 0.95)
      .setOrigin(1, 0.5)
      .setDepth(7);
    const p2RankText = this.add
      .text(p2RightX - 219, panelY - 58, 'MYTHIC', {
        color: '#020617',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(8);
    const p2Name = this.add
      .text(p2RightX, panelY - 30, '', {
        color: '#ffffff',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '32px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0.5)
      .setDepth(7);
    const p2Special = this.add
      .text(p2RightX, panelY, '', {
        color: '#facc15',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0.5)
      .setDepth(7);
    const p2Summary = this.add
      .text(p2RightX, panelY + 22, '', {
        color: '#cbd5e1',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '12px'
      })
      .setOrigin(1, 0.5)
      .setDepth(7);
    const p2Offense = this.add
      .text(p2RightX, panelY + 42, '', {
        color: '#fca5a5',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0.5)
      .setDepth(7);
    const p2Defense = this.add
      .text(p2RightX, panelY + 60, '', {
        color: '#7dd3fc',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0.5)
      .setDepth(7);

    this.p2Spot = {
      portrait: p2Portrait,
      tag: p2Tag,
      rankBg: p2RankBg,
      rankText: p2RankText,
      name: p2Name,
      special: p2Special,
      summary: p2Summary,
      offense: p2Offense,
      defense: p2Defense
    };
  }

  private buildCursors(): void {
    this.p1 = this.createCursor('P1', P1_COLOR, 0);
    const villainStart = Math.min(HERO_ROSTER.length, this.cards.length - 1);
    this.p2 = this.createCursor(this.mode === '1vcpu' ? 'CPU' : 'P2', P2_COLOR, villainStart);

    if (this.mode === '1vcpu') {
      this.p2.outline.setVisible(false);
      this.p2.label.setVisible(false);
    }

    this.refreshCursor(this.p1);
    this.refreshCursor(this.p2);
    this.refreshSpotlights();
  }

  private createCursor(label: string, color: number, index: number): PlayerCursor {
    const outline = this.add
      .rectangle(0, 0, CARD_WIDTH + 10, CARD_HEIGHT + 10, color, 0)
      .setStrokeStyle(4, color, 1)
      .setDepth(20);

    const text = this.add
      .text(0, 0, label, {
        color: '#020617',
        backgroundColor: colorToCss(color),
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 7, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(21);

    return { index, locked: false, outline, label: text };
  }

  private refreshCursor(cursor: PlayerCursor): void {
    const position = this.cardPositions[cursor.index];
    if (!position) {
      return;
    }

    cursor.outline.setPosition(position.x, position.y);
    cursor.outline.setStrokeStyle(cursor.locked ? 6 : 4, cursor.outline.strokeColor, 1);
    cursor.label.setPosition(position.x + (cursor === this.p1 ? -34 : 34), position.y - CARD_HEIGHT / 2 - 4);
  }

  private refreshSpotlights(): void {
    const p1Char = SELECTABLE_ROSTER[this.p1.index];
    if (p1Char) {
      const meta = getFighterMeta(p1Char.id);
      const rankDef = getSkillRankDefinition(meta.rank);
      if (this.textures.exists(p1Char.portrait.key)) {
        this.p1Spot.portrait.setTexture(p1Char.portrait.key).setVisible(true);
        const s = 104 / Math.max(this.p1Spot.portrait.width || 104, this.p1Spot.portrait.height || 104);
        this.p1Spot.portrait.setScale(s);
      }
      this.p1Spot.tag.setText(`PLAYER 1  •  ${meta.series.toUpperCase()}`);
      const p1RankX = this.p1Spot.tag.x + this.p1Spot.tag.width + 12;
      this.p1Spot.rankBg.setPosition(p1RankX, this.p1Spot.tag.y).setFillStyle(rankDef.colorNum, 0.96).setVisible(true);
      this.p1Spot.rankText.setPosition(p1RankX + 39, this.p1Spot.tag.y).setText(rankDef.label).setVisible(true);
      this.p1Spot.name.setText(p1Char.label.toUpperCase());
      this.p1Spot.special.setText(`SPECIAL: ${meta.specialName.toUpperCase()}`);
      this.p1Spot.summary.setText(meta.kitSummary);
      this.p1Spot.offense.setText(`OFFENSE: ${meta.offenseSkill}`);
      this.p1Spot.defense.setText(`DEFENSE: ${meta.defenseSkill}`);
    }

    if (this.mode === '1vcpu' && !this.p2.outline.visible) {
      this.p2Spot.portrait.setVisible(false);
      this.p2Spot.tag.setText('CPU OPPONENT');
      this.p2Spot.rankBg.setVisible(false);
      this.p2Spot.rankText.setVisible(false);
      this.p2Spot.name.setText('RANDOM CHALLENGER');
      this.p2Spot.special.setText('AUTO-SELECTED ON LOCK');
      this.p2Spot.summary.setText('Lock in Player 1 to reveal your rival');
      this.p2Spot.offense.setText('OFFENSE: Dynamic Stance Switching');
      this.p2Spot.defense.setText('DEFENSE: Timed Parry & Guard');
      return;
    }

    const p2Char = SELECTABLE_ROSTER[this.p2.index];
    if (p2Char) {
      const meta = getFighterMeta(p2Char.id);
      const rankDef = getSkillRankDefinition(meta.rank);
      if (this.textures.exists(p2Char.portrait.key)) {
        this.p2Spot.portrait.setTexture(p2Char.portrait.key).setVisible(true);
        const s = 104 / Math.max(this.p2Spot.portrait.width || 104, this.p2Spot.portrait.height || 104);
        this.p2Spot.portrait.setScale(s);
      }
      this.p2Spot.tag.setText(`${this.mode === '1vcpu' ? 'CPU' : 'PLAYER 2'}  •  ${meta.series.toUpperCase()}`);
      const p2RankX = this.p2Spot.tag.x - this.p2Spot.tag.width - 12;
      this.p2Spot.rankBg.setPosition(p2RankX, this.p2Spot.tag.y).setFillStyle(rankDef.colorNum, 0.96).setVisible(true);
      this.p2Spot.rankText.setPosition(p2RankX - 39, this.p2Spot.tag.y).setText(rankDef.label).setVisible(true);
      this.p2Spot.name.setText(p2Char.label.toUpperCase());
      this.p2Spot.special.setText(`SPECIAL: ${meta.specialName.toUpperCase()}`);
      this.p2Spot.summary.setText(meta.kitSummary);
      this.p2Spot.offense.setText(`OFFENSE: ${meta.offenseSkill}`);
      this.p2Spot.defense.setText(`DEFENSE: ${meta.defenseSkill}`);
    }
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    if (this.mode === '1v1') {
      keyboard.on('keydown-A', () => this.movePlayer(this.p1, -1));
      keyboard.on('keydown-D', () => this.movePlayer(this.p1, 1));
      keyboard.on('keydown-W', () => this.moveRow(this.p1, -1));
      keyboard.on('keydown-S', () => this.moveRow(this.p1, 1));

      keyboard.on('keydown-LEFT', () => this.movePlayer(this.p2, -1));
      keyboard.on('keydown-RIGHT', () => this.movePlayer(this.p2, 1));
      keyboard.on('keydown-UP', () => this.moveRow(this.p2, -1));
      keyboard.on('keydown-DOWN', () => this.moveRow(this.p2, 1));

      keyboard.on('keydown-SPACE', () => this.confirmPlayer(this.p1));
      keyboard.on('keydown-F', () => this.confirmPlayer(this.p1));
      keyboard.on('keydown-ENTER', () => this.confirmPlayer(this.p2));
    } else {
      keyboard.on('keydown-A', () => this.movePlayer(this.p1, -1));
      keyboard.on('keydown-LEFT', () => this.movePlayer(this.p1, -1));
      keyboard.on('keydown-D', () => this.movePlayer(this.p1, 1));
      keyboard.on('keydown-RIGHT', () => this.movePlayer(this.p1, 1));
      keyboard.on('keydown-W', () => this.moveRow(this.p1, -1));
      keyboard.on('keydown-UP', () => this.moveRow(this.p1, -1));
      keyboard.on('keydown-S', () => this.moveRow(this.p1, 1));
      keyboard.on('keydown-DOWN', () => this.moveRow(this.p1, 1));
      keyboard.on('keydown-SPACE', () => this.confirmPlayer(this.p1));
      keyboard.on('keydown-F', () => this.confirmPlayer(this.p1));
      keyboard.on('keydown-ENTER', () => this.confirmPlayer(this.p1));
    }

    keyboard.on('keydown-ESC', () => this.goBack());
    keyboard.on('keydown-BACKSPACE', () => this.goBack());
  }

  private moveRow(cursor: PlayerCursor, rowDelta: -1 | 1): void {
    if (this.transitioning || cursor.locked) {
      return;
    }

    const row1Count = HERO_ROSTER.length;
    const inRow1 = cursor.index < row1Count;
    let targetIndex: number;

    if (inRow1 && rowDelta > 0) {
      targetIndex = row1Count + Math.min(cursor.index, VILLAIN_ROSTER.length - 1);
    } else if (!inRow1 && rowDelta < 0) {
      targetIndex = Math.min(cursor.index - row1Count, row1Count - 1);
    } else if (inRow1) {
      targetIndex = row1Count + Math.min(cursor.index, VILLAIN_ROSTER.length - 1);
    } else {
      targetIndex = Math.min(cursor.index - row1Count, row1Count - 1);
    }

    const other = this.otherCursor(cursor);
    if (this.mode === '1v1' && targetIndex === other.index) {
      const next = Phaser.Math.Wrap(targetIndex + 1, 0, this.cards.length);
      if (next !== other.index) {
        targetIndex = next;
      } else {
        return;
      }
    }

    cursor.index = targetIndex;
    this.refreshCursor(cursor);
    this.refreshSpotlights();
  }

  private movePlayer(cursor: PlayerCursor, direction: number): void {
    if (this.transitioning || cursor.locked) {
      return;
    }

    const count = this.cards.length;
    const other = this.otherCursor(cursor);
    let next = Phaser.Math.Wrap(cursor.index + direction, 0, count);

    if (this.mode === '1v1' && next === other.index) {
      const skip = Phaser.Math.Wrap(next + direction, 0, count);

      if (skip !== cursor.index) {
        next = skip;
      } else if (!other.locked) {
        other.index = cursor.index;
        cursor.index = next;
        this.refreshCursor(cursor);
        this.refreshCursor(other);
        this.refreshSpotlights();
        return;
      } else {
        return;
      }
    }

    cursor.index = next;
    this.refreshCursor(cursor);
    this.refreshSpotlights();
  }

  private otherCursor(cursor: PlayerCursor): PlayerCursor {
    return cursor === this.p1 ? this.p2 : this.p1;
  }

  private hoverCard(index: number): void {
    if (this.transitioning || this.mode !== '1vcpu' || this.p1.locked) {
      return;
    }

    this.p1.index = index;
    this.refreshCursor(this.p1);
    this.refreshSpotlights();
  }

  private clickCard(index: number): void {
    if (this.transitioning) {
      return;
    }

    if (this.mode === '1vcpu') {
      this.p1.index = index;
      this.refreshCursor(this.p1);
      this.refreshSpotlights();
      this.confirmPlayer(this.p1);
    }
  }

  private confirmPlayer(cursor: PlayerCursor): void {
    if (this.transitioning || cursor.locked) {
      return;
    }

    cursor.locked = true;
    this.refreshCursor(cursor);
    playAudioCue(this, AUDIO_KEYS.uiConfirm, this.app.settingsStore.getState());

    this.cards[cursor.index].flashLock(() => {
      if (this.mode === '1vcpu') {
        this.runCpuSelection();
        return;
      }

      if (this.p1.locked && this.p2.locked) {
        this.startMatch();
      }
    });
  }

  private runCpuSelection(): void {
    if (this.transitioning) {
      return;
    }

    this.transitioning = true;

    const choices = this.cards.map((_, index) => index).filter((index) => index !== this.p1.index);
    const cpuIndex = choices.length > 0 ? Phaser.Math.RND.pick(choices) : this.p1.index;

    this.p2.index = cpuIndex;
    this.p2.outline.setVisible(true);
    this.p2.label.setVisible(true);
    this.p2.label.setText('CPU');
    this.refreshCursor(this.p2);
    this.refreshSpotlights();

    this.time.delayedCall(450, () => {
      this.p2.locked = true;
      this.refreshCursor(this.p2);
      playAudioCue(this, AUDIO_KEYS.uiConfirm, this.app.settingsStore.getState());
      this.cards[cpuIndex].flashLock(() => this.startMatch());
    });
  }

  private startMatch(): void {
    if (this.transitioning && this.mode === '1v1') {
      return;
    }

    this.transitioning = true;

    this.scene.start(SCENE_KEYS.Match, {
      mode: this.mode,
      stageId: this.stageId,
      p1CharacterId: SELECTABLE_ROSTER[this.p1.index].id,
      p2CharacterId: SELECTABLE_ROSTER[this.p2.index].id
    });
  }

  private goBack(): void {
    if (this.transitioning) {
      return;
    }

    this.scene.start(SCENE_KEYS.LevelSelect, { mode: this.mode });
  }
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

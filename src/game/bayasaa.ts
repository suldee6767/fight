import type { CharacterDefinition } from './hero';
import { buildFighterCharacter, rect, type FighterActionSpec } from './fighterCharacter';

export const BAYASAA_CHARACTER_ID = 'bayasaa';

const BAYASAA_ACTIONS: FighterActionSpec[] = [
  {
    action: 'idle',
    label: 'Idle',
    file: 'idle.png',
    frames: 12,
    frameRate: 8,
    repeat: -1,
    defaultVisual: rect(76, 28, 104, 204)
  },
  {
    action: 'walk-forward',
    label: 'Walk Forward',
    file: 'walk-forward.png',
    frames: 8,
    frameRate: 8,
    repeat: -1,
    defaultVisual: rect(72, 28, 112, 204)
  },
  {
    action: 'walk-backward',
    label: 'Walk Backward',
    file: 'walk-backward.png',
    frames: 8,
    frameRate: 8,
    repeat: -1,
    defaultVisual: rect(72, 28, 112, 204)
  },
  {
    action: 'crouch',
    label: 'Crouch',
    file: 'crouch.png',
    frames: 5,
    frameRate: 10,
    repeat: 0,
    defaultVisual: rect(72, 104, 112, 126)
  },
  {
    action: 'jump',
    label: 'Jump',
    file: 'jump.png',
    frames: 8,
    frameRate: 10,
    repeat: 0,
    defaultVisual: rect(70, 16, 116, 206)
  },
  {
    action: 'block-high',
    label: 'Block High',
    file: 'block-high.png',
    frames: 4,
    frameRate: 10,
    repeat: 0,
    defaultVisual: rect(76, 28, 104, 204),
    guard: rect(60, 44, 136, 116)
  },
  {
    action: 'block-low',
    label: 'Block Low',
    file: 'block-low.png',
    frames: 4,
    frameRate: 10,
    repeat: 0,
    defaultVisual: rect(72, 104, 112, 126),
    guard: rect(60, 110, 136, 120)
  },
  {
    action: 'hit-high',
    label: 'Hit High',
    file: 'hit-high.png',
    frames: 6,
    frameRate: 12,
    repeat: 0,
    defaultVisual: rect(72, 28, 112, 204)
  },
  {
    action: 'light-punch',
    label: 'Light Punch',
    file: 'light-punch.png',
    frames: 6,
    frameRate: 14,
    repeat: 0,
    defaultVisual: rect(60, 28, 128, 204),
    attack: { frames: [2, 3], bounds: rect(18, 84, 84, 46) }
  },
  {
    action: 'heavy-kick',
    label: 'Spinning High Kick',
    file: 'heavy-kick.png',
    frames: 8,
    frameRate: 10,
    repeat: 0,
    defaultVisual: rect(64, 28, 128, 204),
    attack: { frames: [2, 3, 4], bounds: rect(20, 48, 110, 80) }
  },
  {
    action: 'special-charge',
    label: 'Special Charge',
    file: 'special-charge.png',
    frames: 5,
    frameRate: 12,
    repeat: 0,
    defaultVisual: rect(72, 40, 112, 192)
  },
  {
    action: 'special',
    label: 'Cyclone Kick Blitz',
    file: 'special.png',
    frames: 12,
    frameRate: 14,
    repeat: 0,
    defaultVisual: rect(60, 24, 136, 208),
    attackSpans: [
      { frames: [2, 3], bounds: rect(20, 48, 110, 80) },
      { frames: [4, 5], bounds: rect(16, 36, 120, 90) },
      { frames: [6, 7, 8], bounds: rect(12, 30, 130, 100) }
    ]
  },
  {
    action: 'knockdown',
    label: 'Knockdown',
    file: 'knockdown.png',
    frames: 10,
    frameRate: 10,
    repeat: 0,
    defaultVisual: rect(40, 150, 176, 80)
  }
];

export const BAYASAA_CHARACTER: CharacterDefinition = buildFighterCharacter({
  id: BAYASAA_CHARACTER_ID,
  label: 'Bayasaa',
  assetRoot: '/assets/bayasaa',
  anchorUsage: 'bayasaa fighter west-facing high-fidelity anchor',
  portraitFile: 'portrait.jpg',
  actions: BAYASAA_ACTIONS
});

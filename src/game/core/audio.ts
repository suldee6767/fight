import * as Phaser from 'phaser';

import type { GameSettings } from '../types';

export type AudioCategory = 'music' | 'sfx';
type VolumeAdjustableSound = Phaser.Sound.BaseSound & {
  setVolume?: (value: number) => unknown;
  volume?: number;
};

export interface StarterAudioAsset {
  kind: 'audio';
  key: string;
  url: string;
  category: AudioCategory;
  durationSeconds?: number;
  volume: number;
  loop: boolean;
  usage: string;
}

export interface GeneratedAudioCue {
  kind: 'generated-audio';
  key: string;
  category: AudioCategory;
  frequency: number;
  durationSeconds: number;
  volume: number;
  usage: string;
}

export const AUDIO_KEYS = {
  uiConfirm: 'ui-confirm'
} as const;

export type AudioKey = (typeof AUDIO_KEYS)[keyof typeof AUDIO_KEYS];

export const STARTER_AUDIO_ASSETS: StarterAudioAsset[] = [
  audio(AUDIO_KEYS.uiConfirm, 'sfx', '/assets/audio/sfx/ui-confirm.mp3', 0.38, false, 'menu confirmation cue')
];
export const STARTER_AUDIO_CUES: GeneratedAudioCue[] = [
  cue('starter-jump', 'sfx', 380, 0.08, 0.34, 'generated jump cue'),
  cue('starter-pickup', 'sfx', 720, 0.1, 0.38, 'generated pickup cue'),
  cue('starter-complete', 'sfx', 520, 0.18, 0.42, 'generated level complete cue'),
  cue('starter-deny', 'sfx', 160, 0.12, 0.28, 'generated blocked/deny cue')
];

let audioContext: AudioContext | null = null;

export function getEffectiveVolume(
  assetVolume: number,
  category: AudioCategory,
  settings: GameSettings
): number {
  if (settings.muted) {
    return 0;
  }

  return assetVolume * (category === 'music' ? settings.musicVolume : settings.sfxVolume);
}

export function playAudioAsset(
  scene: Phaser.Scene,
  asset: StarterAudioAsset,
  settings: GameSettings
): void {
  if (scene.sound.locked || !scene.cache.audio.exists(asset.key)) {
    return;
  }

  const volume = getEffectiveVolume(asset.volume, asset.category, settings);

  if (volume <= 0) {
    return;
  }

  scene.sound.play(asset.key, {
    loop: asset.loop,
    volume
  });
}

export function playAudioCue(scene: Phaser.Scene, key: AudioKey | string, settings: GameSettings): void {
  const asset = STARTER_AUDIO_ASSETS.find((candidate) => candidate.key === key);

  if (asset) {
    playAudioAsset(scene, asset, settings);
    return;
  }

  playGeneratedAudioCue(key, settings);
}

export function stopAudioAsset(scene: Phaser.Scene, key: string): void {
  scene.sound.stopByKey(key);
}

export function syncLoopingAudioAsset(
  scene: Phaser.Scene,
  key: AudioKey | string,
  settings: GameSettings
): void {
  const asset = STARTER_AUDIO_ASSETS.find((candidate) => candidate.key === key);

  if (!asset || !asset.loop || scene.sound.locked || !scene.cache.audio.exists(asset.key)) {
    return;
  }

  const volume = getEffectiveVolume(asset.volume, asset.category, settings);
  const existingSounds = scene.sound.getAll<VolumeAdjustableSound>(asset.key);
  const isAlreadyPlaying = existingSounds.some((sound) => sound.isPlaying);

  existingSounds.forEach((sound) => {
    if (typeof sound.setVolume === 'function') {
      sound.setVolume(volume);
      return;
    }

    sound.volume = volume;
  });

  if (!isAlreadyPlaying && volume > 0) {
    scene.sound.play(asset.key, {
      loop: true,
      volume
    });
  }
}

export function playGeneratedAudioCue(
  key: string,
  settings: GameSettings,
  audioCtx: AudioContext = getAudioContext()
): void {
  const cueAsset = STARTER_AUDIO_CUES.find((candidate) => candidate.key === key);

  if (!cueAsset) {
    return;
  }

  const volume = getEffectiveVolume(cueAsset.volume, cueAsset.category, settings);

  if (volume <= 0) {
    return;
  }

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(cueAsset.frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + cueAsset.durationSeconds);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + cueAsset.durationSeconds + 0.02);
}

function cue(
  key: string,
  category: AudioCategory,
  frequency: number,
  durationSeconds: number,
  volume: number,
  usage: string
): GeneratedAudioCue {
  return {
    kind: 'generated-audio',
    key,
    category,
    frequency,
    durationSeconds,
    volume,
    usage
  };
}

function audio(
  key: AudioKey,
  category: AudioCategory,
  url: string,
  volume: number,
  loop: boolean,
  usage: string
): StarterAudioAsset {
  return {
    kind: 'audio',
    key,
    url,
    category,
    volume,
    loop,
    usage
  };
}

export type CombatSfxKind =
  | 'hit-light'
  | 'hit-heavy'
  | 'block'
  | 'parry'
  | 'guard-break'
  | 'stance'
  | 'special'
  | 'beam'
  | 'ko'
  | 'jump';

/**
 * Synthesizes crisp punchy Web Audio combat SFX with subtle pitch randomization
 * while respecting mute and sfxVolume settings. Safe in headless browsers.
 */
export function playCombatSfx(kind: CombatSfxKind, settings: GameSettings): void {
  if (settings.muted || settings.sfxVolume <= 0) {
    return;
  }

  let ctx: AudioContext;
  try {
    ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    return;
  }

  const vol = Math.min(0.45, settings.sfxVolume * 0.34);
  const now = ctx.currentTime;
  const jitter = 0.92 + Math.random() * 0.16;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  if (kind === 'hit-light') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
    return;
  }

  if (kind === 'hit-heavy') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190 * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    gain.gain.setValueAtTime(vol * 1.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
    return;
  }

  if (kind === 'block') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(520 * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);
    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
    return;
  }

  if (kind === 'parry') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.09);
    gain.gain.setValueAtTime(vol * 0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
    return;
  }

  if (kind === 'guard-break') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.34);
    gain.gain.setValueAtTime(vol * 1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
    return;
  }

  if (kind === 'stance') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
    gain.gain.setValueAtTime(vol * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
    return;
  }

  if (kind === 'jump') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260 * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.09);
    gain.gain.setValueAtTime(vol * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
    return;
  }

  if (kind === 'special' || kind === 'beam') {
    osc.type = kind === 'beam' ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(kind === 'beam' ? 320 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'beam' ? 760 : 620, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.42);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
    return;
  }

  // 'ko'
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.48);
  gain.gain.setValueAtTime(vol * 1.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.52);
}

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

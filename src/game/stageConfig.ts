import type { ImageAsset } from './assets';
import type { StagePreviewDebugState } from './types';

export type StageAtmosphere = 'cursed' | 'embers' | 'mist' | 'dust' | 'ash' | 'sakura' | 'sparks';

/**
 * A full-frame fighting-stage background candidate. Stages are single images
 * (not parallax layers) used by MatchScene and the Stage Preview gym.
 */
export interface StageDefinition {
  id: string;
  label: string;
  subtitle: string;
  key: string;
  url: string;
  width: number;
  height: number;
  accentColor: number;
  atmosphere: StageAtmosphere;
}

/**
 * The computed placement of a stage when fit to a viewport: vertical-fit scale,
 * resulting on-screen size, and how far it can scroll horizontally.
 */
export interface StageLayout {
  scale: number;
  displayWidth: number;
  displayHeight: number;
  maxScroll: number;
}

export const STAGE_PREVIEW_DEFAULT_PAN_SPEED = 140;
export const STAGE_PREVIEW_MIN_PAN_SPEED = 20;
export const STAGE_PREVIEW_MAX_PAN_SPEED = 600;

export const TITLE_ARENA_BG_KEY = 'title-arena-bg';

const STAGE_ASSET_ROOT = '/assets/backgrounds';

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 'shibuya-station',
    label: 'Shibuya Crossing',
    subtitle: 'Midnight Cursed District',
    key: 'shibuya-station-stage',
    url: `${STAGE_ASSET_ROOT}/shibuya-station-stage.png`,
    width: 1664,
    height: 768,
    accentColor: 0x38bdf8,
    atmosphere: 'cursed'
  },
  {
    id: 'infinity-castle',
    label: 'Infinity Castle',
    subtitle: 'Endless Lantern Labyrinth',
    key: 'infinity-castle-stage',
    url: `${STAGE_ASSET_ROOT}/infinity-castle-stage.png`,
    width: 1664,
    height: 768,
    accentColor: 0xf97316,
    atmosphere: 'embers'
  },
  {
    id: 'final-valley',
    label: 'Final Valley',
    subtitle: 'Twin Statues Waterfall',
    key: 'final-valley-stage',
    url: `${STAGE_ASSET_ROOT}/final-valley-stage.png`,
    width: 1664,
    height: 768,
    accentColor: 0x60a5fa,
    atmosphere: 'mist'
  },
  {
    id: 'cell-arena',
    label: 'Tournament Ring',
    subtitle: 'Sunlit Desert Plateau',
    key: 'cell-arena-stage',
    url: `${STAGE_ASSET_ROOT}/cell-arena-stage.png`,
    width: 1664,
    height: 768,
    accentColor: 0xfacc15,
    atmosphere: 'dust'
  },
  {
    id: 'hueco-mundo',
    label: 'Hueco Mundo',
    subtitle: 'Silver Moon Quartz Desert',
    key: 'hueco-mundo-stage',
    url: `${STAGE_ASSET_ROOT}/hueco-mundo-stage.png`,
    width: 1664,
    height: 768,
    accentColor: 0xc084fc,
    atmosphere: 'ash'
  },
  {
    id: 'sakura-shrine',
    label: 'Sakura Shrine',
    subtitle: 'Crimson Torii Courtyard',
    key: 'sakura-shrine-stage',
    url: `${STAGE_ASSET_ROOT}/sakura-shrine-stage.png`,
    width: 1664,
    height: 768,
    accentColor: 0xfb7185,
    atmosphere: 'sakura'
  },
  {
    id: 'rooftop-twilight',
    label: 'Rooftop Twilight',
    subtitle: 'Neon Skyline Deck',
    key: 'rooftop-twilight-stage',
    url: `${STAGE_ASSET_ROOT}/rooftop-twilight-stage.png`,
    width: 1774,
    height: 887,
    accentColor: 0xa855f7,
    atmosphere: 'sparks'
  },
  {
    id: 'rooftop-sunset',
    label: 'Rooftop Sunset',
    subtitle: 'Golden Helipad Roof',
    key: 'rooftop-sunset-stage',
    url: `${STAGE_ASSET_ROOT}/rooftop-sunset-stage.png`,
    width: 2048,
    height: 768,
    accentColor: 0xf59e0b,
    atmosphere: 'embers'
  }
];

export const STAGE_IMAGE_ASSETS: ImageAsset[] = [
  {
    kind: 'image',
    key: TITLE_ARENA_BG_KEY,
    url: `${STAGE_ASSET_ROOT}/title-arena-bg.jpg`,
    usage: 'illustrated anime arena title backdrop'
  },
  ...STAGE_DEFINITIONS.map((stage) => ({
    kind: 'image' as const,
    key: stage.key,
    url: stage.url,
    width: stage.width,
    height: stage.height,
    usage: `${stage.label} fighting stage background`
  }))
];

export const DEFAULT_STAGE_PREVIEW_STATE: StagePreviewDebugState = {
  stageId: STAGE_DEFINITIONS[0].id,
  scrollX: 0,
  maxScroll: 0,
  displayWidth: 0,
  autoPan: false,
  panSpeed: STAGE_PREVIEW_DEFAULT_PAN_SPEED,
  showGuides: true
};

/**
 * Resolves a stage definition by id, falling back to the first stage when the
 * id is unknown.
 * @param stageId - The stage identifier to resolve.
 * @returns The matching {@link StageDefinition} or the first stage.
 */
export function getStageDefinition(stageId: string): StageDefinition {
  return STAGE_DEFINITIONS.find((stage) => stage.id === stageId) ?? STAGE_DEFINITIONS[0];
}

/**
 * Computes how a stage is placed when fit to the viewport height and centered,
 * including the horizontal scroll range produced by the overflow.
 * @param stageId - The stage to lay out.
 * @param viewportWidth - The game viewport width in pixels.
 * @param viewportHeight - The game viewport height in pixels.
 * @returns The {@link StageLayout} for the stage at this viewport size.
 */
export function getStageLayout(
  stageId: string,
  viewportWidth: number,
  viewportHeight: number
): StageLayout {
  const stage = getStageDefinition(stageId);
  const scale = viewportHeight / stage.height;
  const displayWidth = stage.width * scale;

  return {
    scale,
    displayWidth,
    displayHeight: viewportHeight,
    maxScroll: Math.max(0, displayWidth - viewportWidth)
  };
}

/**
 * Clamps a horizontal scroll value to the valid range for a layout.
 * @param value - The desired scroll position in pixels.
 * @param maxScroll - The maximum scroll for the current stage layout.
 * @returns The clamped scroll position.
 */
export function clampStageScroll(value: number, maxScroll: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(0, maxScroll), Math.max(0, value));
}

/**
 * Clamps a pan speed to the supported range.
 * @param value - The desired pan speed in pixels/second.
 * @returns The clamped pan speed.
 */
export function clampStagePanSpeed(value: number): number {
  if (!Number.isFinite(value)) {
    return STAGE_PREVIEW_DEFAULT_PAN_SPEED;
  }

  return Math.min(STAGE_PREVIEW_MAX_PAN_SPEED, Math.max(STAGE_PREVIEW_MIN_PAN_SPEED, Math.round(value)));
}

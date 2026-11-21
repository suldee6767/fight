import type { Rect } from './types';

/**
 * Turns a "raw" AI-drawn pose sheet (a row or grid of poses on one flat
 * background colour) into a game-ready spritesheet canvas: background removed,
 * every pose scaled to the same body height, feet on the same line, one pose
 * per 256x256 cell, 5 cells per row.
 */

export const RAW_CELL = 256;
export const RAW_COLS = 5;
/** Feet line and standing body height shared with the bundled fighters. */
const FEET_Y = 229;
const BODY_HEIGHT = 200;
const MAX_POSE_WIDTH = 244;
const MAX_FRAMES = 10;
const MAX_SOURCE_SIDE = 2048;

export interface RawSheet {
  canvas: HTMLCanvasElement;
  frames: number;
  /** Tight box around each pose inside its 256x256 cell. */
  boxes: Rect[];
}

export interface RawSheetOptions {
  /** Mirror every pose. Use when the art faces right instead of left. */
  flip?: boolean;
  /** Force this many equal-width poses instead of auto-detecting them. */
  frames?: number;
}

interface Pose {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  feetX: number;
}

/**
 * Load the first URL that decodes as an image.
 * @param urls - Candidate URLs, tried in order.
 */
export async function loadFirstImage(urls: string[]): Promise<HTMLImageElement | null> {
  for (const url of urls) {
    const image = await loadImage(url);

    if (image) {
      return image;
    }
  }

  return null;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (result: HTMLImageElement | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(null), 6000);
    image.onload = () => finish(image.naturalWidth > 0 ? image : null);
    image.onerror = () => finish(null);
    image.src = url;
  });
}

/**
 * Slice a raw pose sheet into a normalized spritesheet.
 * @param image - The decoded source image.
 * @param options - Flip and frame-count overrides.
 * @returns The spritesheet, or null when no pose was found.
 */
export function sliceRawSheet(image: HTMLImageElement, options: RawSheetOptions = {}): RawSheet | null {
  const shrink = Math.min(1, MAX_SOURCE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * shrink));
  const height = Math.max(1, Math.round(image.naturalHeight * shrink));
  const source = makeCanvas(width, height);
  const sourceContext = source.getContext('2d', { willReadFrequently: true });

  if (!sourceContext) {
    return null;
  }

  sourceContext.drawImage(image, 0, 0, width, height);

  const pixels = sourceContext.getImageData(0, 0, width, height);

  removeBackground(pixels.data, width, height);
  sourceContext.putImageData(pixels, 0, 0);

  const mask = new Uint8Array(width * height);

  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = pixels.data[index * 4 + 3] > 40 ? 1 : 0;
  }

  const detected = findPoses(mask, width, height);
  const poses = (
    options.frames && options.frames !== detected.length
      ? splitEvenly(mask, width, height, options.frames)
      : detected
  ).slice(0, MAX_FRAMES);

  if (poses.length === 0) {
    return null;
  }

  const tallest = Math.max(...poses.map((pose) => pose.height));
  const widest = Math.max(...poses.map((pose) => pose.width));
  const scale = Math.min(BODY_HEIGHT / tallest, MAX_POSE_WIDTH / widest);
  const rows = Math.ceil(poses.length / RAW_COLS);
  const canvas = makeCanvas(RAW_COLS * RAW_CELL, rows * RAW_CELL);
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const boxes = poses.map((pose, frame) => {
    const drawWidth = Math.max(1, Math.round(pose.width * scale));
    const drawHeight = Math.max(1, Math.round(pose.height * scale));
    const centered = Math.round(RAW_CELL / 2 - (pose.feetX - pose.x) * scale);
    const left = Math.max(2, Math.min(RAW_CELL - 2 - drawWidth, centered));
    const top = FEET_Y - drawHeight;
    const cellX = (frame % RAW_COLS) * RAW_CELL;
    const cellY = Math.floor(frame / RAW_COLS) * RAW_CELL;

    context.save();

    if (options.flip) {
      context.translate(cellX + RAW_CELL, cellY);
      context.scale(-1, 1);
    } else {
      context.translate(cellX, cellY);
    }

    context.drawImage(source, pose.x, pose.y, pose.width, pose.height, left, top, drawWidth, drawHeight);
    context.restore();

    return {
      x: options.flip ? RAW_CELL - left - drawWidth : left,
      y: top,
      width: drawWidth,
      height: drawHeight
    };
  });

  return { canvas, frames: poses.length, boxes };
}

/**
 * Copy a spritesheet with its frames in reverse order (walk -> walk backward).
 * @param sheet - The sheet to reverse.
 */
export function reverseRawSheet(sheet: RawSheet): RawSheet {
  const canvas = makeCanvas(sheet.canvas.width, sheet.canvas.height);
  const context = canvas.getContext('2d');

  for (let frame = 0; frame < sheet.frames; frame += 1) {
    const from = sheet.frames - 1 - frame;

    context?.drawImage(
      sheet.canvas,
      (from % RAW_COLS) * RAW_CELL,
      Math.floor(from / RAW_COLS) * RAW_CELL,
      RAW_CELL,
      RAW_CELL,
      (frame % RAW_COLS) * RAW_CELL,
      Math.floor(frame / RAW_COLS) * RAW_CELL,
      RAW_CELL,
      RAW_CELL
    );
  }

  return { canvas, frames: sheet.frames, boxes: [...sheet.boxes].reverse() };
}

/**
 * Compose an 8-frame multi-hit blitz spritesheet from `punch` and `kick` sheets
 * with non-attack windup/recovery frames between strikes so each strike opens
 * a fresh hit window.
 * @param punch - Sliced punch sheet.
 * @param kick - Sliced kick sheet.
 * @returns The composite sheet and the indices of active strike frames.
 */
export function buildBlitzSheet(
  punch: RawSheet,
  kick: RawSheet
): { sheet: RawSheet; activeFrames: number[] } {
  const clampPunch = (index: number): number => Math.min(index, Math.max(0, punch.frames - 1));
  const clampKick = (index: number): number => Math.min(index, Math.max(0, kick.frames - 1));

  const sequence: Array<{ source: RawSheet; frame: number; active: boolean }> = [
    { source: punch, frame: clampPunch(1), active: false },
    { source: punch, frame: clampPunch(2), active: true },
    { source: punch, frame: clampPunch(3), active: false },
    { source: punch, frame: clampPunch(2), active: true },
    { source: kick, frame: clampKick(1), active: false },
    { source: kick, frame: clampKick(2), active: false },
    { source: kick, frame: clampKick(3), active: true },
    { source: kick, frame: 0, active: false }
  ];

  const rows = Math.ceil(sequence.length / RAW_COLS);
  const canvas = makeCanvas(RAW_COLS * RAW_CELL, rows * RAW_CELL);
  const context = canvas.getContext('2d');
  const boxes: Rect[] = [];
  const activeFrames: number[] = [];

  sequence.forEach((entry, index) => {
    const srcX = (entry.frame % RAW_COLS) * RAW_CELL;
    const srcY = Math.floor(entry.frame / RAW_COLS) * RAW_CELL;
    const dstX = (index % RAW_COLS) * RAW_CELL;
    const dstY = Math.floor(index / RAW_COLS) * RAW_CELL;

    context?.drawImage(entry.source.canvas, srcX, srcY, RAW_CELL, RAW_CELL, dstX, dstY, RAW_CELL, RAW_CELL);
    boxes.push({ ...(entry.source.boxes[entry.frame] ?? entry.source.boxes[0]) });

    if (entry.active) {
      activeFrames.push(index);
    }
  });

  return {
    sheet: { canvas, frames: sequence.length, boxes },
    activeFrames
  };
}

/**
 * Cut one frame out of a spritesheet as a square image (used for portraits).
 * @param sheet - The source sheet.
 * @param frame - Frame index to copy.
 */
export function frameToCanvas(sheet: RawSheet, frame = 0): HTMLCanvasElement {
  const canvas = makeCanvas(RAW_CELL, RAW_CELL);

  canvas
    .getContext('2d')
    ?.drawImage(
      sheet.canvas,
      (frame % RAW_COLS) * RAW_CELL,
      Math.floor(frame / RAW_COLS) * RAW_CELL,
      RAW_CELL,
      RAW_CELL,
      0,
      0,
      RAW_CELL,
      RAW_CELL
    );

  return canvas;
}

/**
 * A stand-in sheet (one grey silhouette with a question mark) for a fighter
 * whose images are missing, so the game still runs.
 */
export function placeholderRawSheet(): RawSheet {
  const canvas = makeCanvas(RAW_COLS * RAW_CELL, RAW_CELL);
  const context = canvas.getContext('2d');
  const box = { x: 88, y: FEET_Y - BODY_HEIGHT, width: 80, height: BODY_HEIGHT };

  if (context) {
    context.fillStyle = '#64748b';
    context.fillRect(box.x, box.y + 50, box.width, box.height - 50);
    context.beginPath();
    context.arc(RAW_CELL / 2, box.y + 26, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f8fafc';
    context.font = 'bold 64px monospace';
    context.textAlign = 'center';
    context.fillText('?', RAW_CELL / 2, box.y + 140);
  }

  return { canvas, frames: 1, boxes: [box] };
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

/**
 * Make the flat background transparent. The background colour is read from the
 * image border, so green, magenta or white backgrounds all work. Images that
 * are already transparent are left alone.
 */
function removeBackground(data: Uint8ClampedArray, width: number, height: number): void {
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];

  if (corners.some((corner) => data[corner * 4 + 3] < 16)) {
    return;
  }

  const [red, green, blue] = borderColour(data, width, height);
  const greenScreen = green > red + 50 && green > blue + 50;
  const solid = 85;
  const soft = 135;

  for (let offset = 0; offset < data.length; offset += 4) {
    const distance = Math.hypot(data[offset] - red, data[offset + 1] - green, data[offset + 2] - blue);

    if (distance < solid) {
      data[offset + 3] = 0;
    } else if (distance < soft) {
      data[offset + 3] = Math.round(((distance - solid) / (soft - solid)) * 255);

      if (greenScreen) {
        data[offset + 1] = Math.min(data[offset + 1], Math.max(data[offset], data[offset + 2]));
      }
    }
  }
}

function borderColour(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const samples: Array<[number, number, number]> = [];
  const push = (x: number, y: number): void => {
    const offset = (y * width + x) * 4;

    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };

  for (let x = 0; x < width; x += 8) {
    push(x, 0);
    push(x, height - 1);
  }

  for (let y = 0; y < height; y += 8) {
    push(0, y);
    push(width - 1, y);
  }

  const median = (channel: 0 | 1 | 2): number =>
    samples.map((sample) => sample[channel]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];

  return [median(0), median(1), median(2)];
}

/**
 * Find the poses: split the image into rows of poses, then each row into
 * poses, using the empty background between them. Small specks and text
 * labels are ignored.
 */
function findPoses(mask: Uint8Array, width: number, height: number): Pose[] {
  const rowCounts = new Array<number>(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      rowCounts[y] += mask[y * width + x];
    }
  }

  const bands = findRuns(rowCounts, Math.max(2, width * 0.003), Math.max(4, height * 0.015));
  const tallestBand = Math.max(0, ...bands.map(([start, end]) => end - start));
  const poses: Pose[] = [];

  bands
    .filter(([start, end]) => end - start >= tallestBand * 0.3)
    .forEach(([bandTop, bandBottom]) => {
      const columnCounts = new Array<number>(width).fill(0);

      for (let y = bandTop; y < bandBottom; y += 1) {
        for (let x = 0; x < width; x += 1) {
          columnCounts[x] += mask[y * width + x];
        }
      }

      findRuns(columnCounts, 2, Math.max(4, width * 0.01)).forEach(([left, right]) => {
        const pose = measurePose(mask, width, left, right, bandTop, bandBottom);

        if (pose) {
          poses.push(pose);
        }
      });
    });

  const areas = poses.map((pose) => pose.area).sort((a, b) => a - b);
  const medianArea = areas[Math.floor(areas.length / 2)] ?? 0;

  return poses.filter((pose) => pose.area >= medianArea * 0.12);
}

/** Split the image into equal-width cells and take the pose inside each. */
function splitEvenly(mask: Uint8Array, width: number, height: number, frames: number): Pose[] {
  const poses: Pose[] = [];

  for (let frame = 0; frame < frames; frame += 1) {
    const pose = measurePose(
      mask,
      width,
      Math.round((frame * width) / frames),
      Math.round(((frame + 1) * width) / frames),
      0,
      height
    );

    if (pose) {
      poses.push(pose);
    }
  }

  return poses;
}

/** Runs of "filled" lines, merging runs separated by less than `minGap`. */
function findRuns(counts: number[], minCount: number, minGap: number): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let start = -1;

  for (let index = 0; index <= counts.length; index += 1) {
    const filled = index < counts.length && counts[index] >= minCount;

    if (filled && start < 0) {
      start = index;
    } else if (!filled && start >= 0) {
      const previous = runs[runs.length - 1];

      if (previous && start - previous[1] < minGap) {
        previous[1] = index;
      } else {
        runs.push([start, index]);
      }

      start = -1;
    }
  }

  return runs;
}

/** Tight box, pixel count and feet centre of the pose inside a region. */
function measurePose(
  mask: Uint8Array,
  width: number,
  left: number,
  right: number,
  top: number,
  bottom: number
): Pose | null {
  let minX = right;
  let maxX = left - 1;
  let minY = bottom;
  let maxY = top - 1;
  let area = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      if (mask[y * width + x]) {
        area += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (area === 0) {
    return null;
  }

  const poseHeight = maxY - minY + 1;
  const feetTop = maxY - Math.max(2, Math.round(poseHeight * 0.1));
  let feetLeft = maxX;
  let feetRight = minX;

  for (let y = feetTop; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (mask[y * width + x]) {
        feetLeft = Math.min(feetLeft, x);
        feetRight = Math.max(feetRight, x);
      }
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: poseHeight,
    area,
    feetX: (feetLeft + feetRight) / 2
  };
}

/**
 * Flood-fills from the outer image border to strip flat chroma-green or
 * solid-white studio backgrounds from legacy fighter portraits without touching
 * interior highlights or clothing.
 */
export function stripFlatPortraitBackgroundCanvas(
  source: HTMLImageElement | HTMLCanvasElement
): HTMLCanvasElement {
  const srcW = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const srcH = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
  const scale = Math.min(1, 512 / Math.max(srcW || 1, srcH || 1));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const work = makeCanvas(width, height);
  const ctx = work.getContext('2d');
  if (!ctx) {
    return work;
  }

  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  // Already transparent around corners? Keep as-is.
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  if (corners.some((idx) => data[idx * 4 + 3] < 20)) {
    return work;
  }

  const [bgR, bgG, bgB] = borderColour(data, width, height);
  const isGreenScreen = bgG > bgR + 40 && bgG > bgB + 40;
  const isNearWhite = bgR > 220 && bgG > 220 && bgB > 220;
  if (!isGreenScreen && !isNearWhite) {
    return work;
  }

  const threshold = isGreenScreen ? 115 : 58;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const tryPush = (idx: number): void => {
    if (visited[idx]) {
      return;
    }
    const off = idx * 4;
    const dist = Math.hypot(data[off] - bgR, data[off + 1] - bgG, data[off + 2] - bgB);
    if (dist <= threshold) {
      visited[idx] = 1;
      queue[tail] = idx;
      tail += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    tryPush(x);
    tryPush((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    tryPush(y * width);
    tryPush(y * width + (width - 1));
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;
    data[idx * 4 + 3] = 0;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) tryPush(idx - 1);
    if (x + 1 < width) tryPush(idx + 1);
    if (y > 0) tryPush(idx - width);
    if (y + 1 < height) tryPush(idx + width);
  }

  if (isGreenScreen) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && data[i + 1] > Math.max(data[i], data[i + 2]) + 28) {
        const dist = Math.hypot(data[i] - bgR, data[i + 1] - bgG, data[i + 2] - bgB);
        if (dist < 130) {
          data[i + 3] = 0;
        }
      }
    }
  }

  ctx.putImageData(image, 0, 0);

  // Tightly center the cutout inside a 256x256 square frame so every card matches
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return work;
  }

  const out = makeCanvas(RAW_CELL, RAW_CELL);
  const outCtx = out.getContext('2d');
  if (outCtx) {
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const fitScale = Math.min((RAW_CELL - 24) / cropW, (RAW_CELL - 20) / cropH);
    const drawW = Math.round(cropW * fitScale);
    const drawH = Math.round(cropH * fitScale);
    outCtx.drawImage(
      work,
      minX,
      minY,
      cropW,
      cropH,
      Math.round((RAW_CELL - drawW) / 2),
      Math.round((RAW_CELL - drawH) / 2),
      drawW,
      drawH
    );
  }

  return out;
}


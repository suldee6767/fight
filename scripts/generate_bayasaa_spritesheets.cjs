const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const FRAME_W = 256;
const FRAME_H = 256;
const COLS = 5;

// Load Bayasaa source frames
const dir = path.join(__dirname, '../public/assets/bayasaa/kick');
const srcF1 = PNG.sync.read(fs.readFileSync(path.join(dir, 'ezgif-frame-001-removebg-preview.png')));
const srcF3 = PNG.sync.read(fs.readFileSync(path.join(dir, 'ezgif-frame-003-removebg-preview.png')));
const srcF9 = PNG.sync.read(fs.readFileSync(path.join(dir, 'ezgif-frame-009-removebg-preview.png')));
const srcF11 = PNG.sync.read(fs.readFileSync(path.join(dir, 'ezgif-frame-011-removebg-preview.png')));

// Get crop & bounds of source PNG
function getCrop(png) {
  let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      if (png.data[idx + 3] > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const cropF1 = getCrop(srcF1);
const cropF3 = getCrop(srcF3);
const cropF9 = getCrop(srcF9);
const cropF11 = getCrop(srcF11);

// Draw scaled sprite into a target frame canvas with bilinear interpolation
function drawTransformed(target, src, crop, options = {}) {
  const {
    targetFrameX = 0,
    targetFrameY = 0,
    scale = 0.54,
    scaleX = scale,
    scaleY = scale,
    offsetX = 0,
    offsetY = 0,
    anchorX = 128,
    anchorY = 230,
    skewX = 0,
    rotation = 0,
    alpha = 1.0,
    tintR = 1.0,
    tintG = 1.0,
    tintB = 1.0
  } = options;

  const srcCenterX = (crop.minX + crop.maxX) / 2;
  const srcFootY = crop.maxY;

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  for (let dy = -160; dy <= 40; dy++) {
    for (let dx = -100; dx <= 100; dx++) {
      const outX = Math.round(anchorX + offsetX + dx);
      const outY = Math.round(anchorY + offsetY + dy);

      if (outX < targetFrameX || outX >= targetFrameX + FRAME_W ||
          outY < targetFrameY || outY >= targetFrameY + FRAME_H) {
        continue;
      }

      // Reverse transform to source coordinates
      const rx = (dx * cos + dy * sin) / scaleX - dy * skewX;
      const ry = (-dx * sin + dy * cos) / scaleY;

      const sx = srcCenterX + rx;
      const sy = srcFootY + ry;

      if (sx < 0 || sx >= src.width - 1 || sy < 0 || sy >= src.height - 1) {
        continue;
      }

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;

      const idx00 = (src.width * y0 + x0) << 2;
      const idx10 = (src.width * y0 + (x0 + 1)) << 2;
      const idx01 = (src.width * (y0 + 1) + x0) << 2;
      const idx11 = (src.width * (y0 + 1) + (x0 + 1)) << 2;

      const a00 = src.data[idx00 + 3];
      const a10 = src.data[idx10 + 3];
      const a01 = src.data[idx01 + 3];
      const a11 = src.data[idx11 + 3];

      const a = (a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy) + a01 * (1 - fx) * fy + a11 * fx * fy) * alpha;

      if (a < 5) continue;

      const r = (src.data[idx00] * (1 - fx) * (1 - fy) + src.data[idx10] * fx * (1 - fy) + src.data[idx01] * (1 - fx) * fy + src.data[idx11] * fx * fy) * tintR;
      const g = (src.data[idx00 + 1] * (1 - fx) * (1 - fy) + src.data[idx10 + 1] * fx * (1 - fy) + src.data[idx01 + 1] * (1 - fx) * fy + src.data[idx11 + 1] * fx * fy) * tintG;
      const b = (src.data[idx00 + 2] * (1 - fx) * (1 - fy) + src.data[idx10 + 2] * fx * (1 - fy) + src.data[idx01 + 2] * (1 - fx) * fy + src.data[idx11 + 2] * fx * fy) * tintB;

      const outIdx = (target.width * outY + outX) << 2;
      const existingAlpha = target.data[outIdx + 3] / 255;
      const srcAlpha = a / 255;
      const blendedAlpha = srcAlpha + existingAlpha * (1 - srcAlpha);

      if (blendedAlpha > 0) {
        target.data[outIdx] = Math.min(255, Math.round((r * srcAlpha + target.data[outIdx] * existingAlpha * (1 - srcAlpha)) / blendedAlpha));
        target.data[outIdx + 1] = Math.min(255, Math.round((g * srcAlpha + target.data[outIdx + 1] * existingAlpha * (1 - srcAlpha)) / blendedAlpha));
        target.data[outIdx + 2] = Math.min(255, Math.round((b * srcAlpha + target.data[outIdx + 2] * existingAlpha * (1 - srcAlpha)) / blendedAlpha));
        target.data[outIdx + 3] = Math.min(255, Math.round(blendedAlpha * 255));
      }
    }
  }
}

function buildSheet(totalFrames, frameDrawer) {
  const rows = Math.ceil(totalFrames / COLS);
  const width = COLS * FRAME_W;
  const height = rows * FRAME_H;
  const png = new PNG({ width, height });
  png.data.fill(0);

  for (let f = 0; f < totalFrames; f++) {
    const col = f % COLS;
    const row = Math.floor(f / COLS);
    const targetFrameX = col * FRAME_W;
    const targetFrameY = row * FRAME_H;
    frameDrawer(png, f, targetFrameX, targetFrameY);
  }

  return png;
}

const outDir = path.join(__dirname, '../public/assets/bayasaa');

console.log('Generating Idle (12 frames)...');
const idlePng = buildSheet(12, (png, f, fx, fy) => {
  const breathe = Math.sin((f / 12) * Math.PI * 2);
  const scaleY = 0.54 + breathe * 0.012;
  const scaleX = 0.54 - breathe * 0.006;
  const offsetY = -breathe * 2.5;
  drawTransformed(png, srcF1, cropF1, {
    targetFrameX: fx,
    targetFrameY: fy,
    scaleX,
    scaleY,
    offsetY,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'idle.png'), PNG.sync.write(idlePng));

console.log('Generating Walk Forward (8 frames)...');
const walkFwdPng = buildSheet(8, (png, f, fx, fy) => {
  const cycle = (f / 8) * Math.PI * 2;
  const bob = Math.abs(Math.sin(cycle)) * 4;
  const lean = Math.sin(cycle) * 0.04;
  const src = (f % 4 === 1 || f % 4 === 2) ? srcF3 : srcF1;
  const crop = (f % 4 === 1 || f % 4 === 2) ? cropF3 : cropF1;
  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetY: -bob,
    offsetX: Math.sin(cycle) * 6 - 2,
    rotation: lean,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'walk-forward.png'), PNG.sync.write(walkFwdPng));

console.log('Generating Walk Backward (8 frames)...');
const walkBwdPng = buildSheet(8, (png, f, fx, fy) => {
  const cycle = (f / 8) * Math.PI * 2;
  const bob = Math.abs(Math.sin(cycle)) * 3;
  const lean = -Math.sin(cycle) * 0.03;
  const src = (f % 4 === 1 || f % 4 === 2) ? srcF3 : srcF1;
  const crop = (f % 4 === 1 || f % 4 === 2) ? cropF3 : cropF1;
  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetY: -bob,
    offsetX: -Math.sin(cycle) * 5 + 2,
    rotation: lean,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'walk-backward.png'), PNG.sync.write(walkBwdPng));

console.log('Generating Crouch (5 frames)...');
const crouchPng = buildSheet(5, (png, f, fx, fy) => {
  const progress = Math.min(1, f / 3);
  const src = progress > 0.5 ? srcF3 : srcF1;
  const crop = progress > 0.5 ? cropF3 : cropF1;
  const scaleY = 0.54 - progress * 0.06;
  const offsetY = progress * 6;
  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scaleX: 0.54 + progress * 0.02,
    scaleY,
    offsetY,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'crouch.png'), PNG.sync.write(crouchPng));

console.log('Generating Jump (8 frames)...');
const jumpPng = buildSheet(8, (png, f, fx, fy) => {
  let src = srcF1;
  let crop = cropF1;
  let offsetY = 0;
  let scaleY = 0.54;

  if (f === 0) {
    src = srcF3; crop = cropF3; offsetY = 4;
  } else if (f === 1) {
    src = srcF11; crop = cropF11; offsetY = -18;
  } else if (f === 2 || f === 3) {
    src = srcF11; crop = cropF11; offsetY = -36;
  } else if (f === 4 || f === 5) {
    src = srcF9; crop = cropF9; offsetY = -30;
  } else if (f === 6) {
    src = srcF3; crop = cropF3; offsetY = -10;
  } else {
    src = srcF3; crop = cropF3; offsetY = 2;
  }

  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scaleX: 0.54,
    scaleY,
    offsetY,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'jump.png'), PNG.sync.write(jumpPng));

console.log('Generating Block High (4 frames)...');
const blockHighPng = buildSheet(4, (png, f, fx, fy) => {
  drawTransformed(png, srcF1, cropF1, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetX: 4,
    rotation: -0.04,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'block-high.png'), PNG.sync.write(blockHighPng));

console.log('Generating Block Low (4 frames)...');
const blockLowPng = buildSheet(4, (png, f, fx, fy) => {
  drawTransformed(png, srcF3, cropF3, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetX: 4,
    offsetY: 4,
    rotation: -0.04,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'block-low.png'), PNG.sync.write(blockLowPng));

console.log('Generating Hit High (6 frames)...');
const hitHighPng = buildSheet(6, (png, f, fx, fy) => {
  const recoil = Math.max(0, 1 - f / 5);
  const offsetX = -recoil * 14;
  const rotation = recoil * 0.12;
  const tint = recoil > 0.5 ? 1.2 : 1.0;
  drawTransformed(png, srcF1, cropF1, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetX,
    rotation,
    tintR: tint,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'hit-high.png'), PNG.sync.write(hitHighPng));

console.log('Generating Light Punch (6 frames)...');
const lightPunchPng = buildSheet(6, (png, f, fx, fy) => {
  let src = srcF1;
  let crop = cropF1;
  let offsetX = 0;
  let scaleX = 0.54;

  if (f === 0) {
    src = srcF1; crop = cropF1; offsetX = -2;
  } else if (f === 1 || f === 2) {
    src = srcF9; crop = cropF9; offsetX = 8;
  } else if (f === 3) {
    src = srcF9; crop = cropF9; offsetX = 4;
  } else {
    src = srcF1; crop = cropF1; offsetX = 0;
  }

  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scaleX,
    scaleY: 0.54,
    offsetX,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'light-punch.png'), PNG.sync.write(lightPunchPng));

console.log('Generating Heavy Kick (8 frames)...');
const heavyKickPng = buildSheet(8, (png, f, fx, fy) => {
  let src = srcF1;
  let crop = cropF1;
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;

  if (f === 0) {
    src = srcF3; crop = cropF3; offsetX = -4; offsetY = 2;
  } else if (f === 1) {
    src = srcF11; crop = cropF11; offsetX = 2; offsetY = -6;
  } else if (f === 2 || f === 3) {
    src = srcF9; crop = cropF9; offsetX = 14; offsetY = -10; rotation = 0.05;
  } else if (f === 4 || f === 5) {
    src = srcF11; crop = cropF11; offsetX = 8; offsetY = -4;
  } else if (f === 6) {
    src = srcF3; crop = cropF3; offsetX = 2; offsetY = 2;
  } else {
    src = srcF1; crop = cropF1; offsetX = 0;
  }

  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetX,
    offsetY,
    rotation,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'heavy-kick.png'), PNG.sync.write(heavyKickPng));

console.log('Generating Special Charge (5 frames)...');
const specChargePng = buildSheet(5, (png, f, fx, fy) => {
  const shake = (f % 2 === 0 ? 1 : -1) * 2;
  drawTransformed(png, srcF3, cropF3, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetX: shake,
    tintB: 1.3,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'special-charge.png'), PNG.sync.write(specChargePng));

console.log('Generating Special (12 frames)...');
const specialPng = buildSheet(12, (png, f, fx, fy) => {
  let src = srcF1;
  let crop = cropF1;
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;

  if (f <= 1) {
    src = srcF3; crop = cropF3; offsetX = 4;
  } else if (f === 2 || f === 3) {
    src = srcF9; crop = cropF9; offsetX = 16; offsetY = -8;
  } else if (f === 4 || f === 5) {
    src = srcF11; crop = cropF11; offsetX = 20; offsetY = -16; rotation = 0.1;
  } else if (f === 6 || f === 7) {
    src = srcF9; crop = cropF9; offsetX = 26; offsetY = -12;
  } else if (f === 8 || f === 9) {
    src = srcF11; crop = cropF11; offsetX = 16; offsetY = -6;
  } else if (f === 10) {
    src = srcF3; crop = cropF3; offsetX = 6;
  } else {
    src = srcF1; crop = cropF1; offsetX = 0;
  }

  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetX,
    offsetY,
    rotation,
    tintR: 1.1,
    tintG: 0.95,
    tintB: 1.2,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'special.png'), PNG.sync.write(specialPng));

console.log('Generating Knockdown (10 frames)...');
const knockdownPng = buildSheet(10, (png, f, fx, fy) => {
  let rot = 0;
  let offY = 0;
  let offX = 0;
  let src = srcF1;
  let crop = cropF1;

  if (f === 0) {
    src = srcF1; crop = cropF1; offX = -12; rot = 0.2;
  } else if (f === 1 || f === 2) {
    src = srcF11; crop = cropF11; offX = -24; offY = -12; rot = 0.7;
  } else if (f >= 3 && f <= 6) {
    src = srcF3; crop = cropF3; offX = -32; offY = 16; rot = 1.4;
  } else if (f === 7 || f === 8) {
    src = srcF3; crop = cropF3; offX = -16; offY = 8; rot = 0.6;
  } else {
    src = srcF1; crop = cropF1; offX = -4; rot = 0;
  }

  drawTransformed(png, src, crop, {
    targetFrameX: fx,
    targetFrameY: fy,
    scale: 0.54,
    offsetX: offX,
    offsetY: offY,
    rotation: rot,
    anchorX: fx + 128,
    anchorY: fy + 230
  });
});
fs.writeFileSync(path.join(outDir, 'knockdown.png'), PNG.sync.write(knockdownPng));

// Generate high-res anchor-w.png (1024x1024)
console.log('Generating Anchor-W (1024x1024)...');
const anchorPng = new PNG({ width: 1024, height: 1024 });
anchorPng.data.fill(0);
drawTransformed(anchorPng, srcF1, cropF1, {
  targetFrameX: 0,
  targetFrameY: 0,
  scale: 2.15,
  anchorX: 512,
  anchorY: 960
});
fs.writeFileSync(path.join(outDir, 'anchor-w.png'), PNG.sync.write(anchorPng));

console.log('All Bayasaa spritesheets generated successfully!');

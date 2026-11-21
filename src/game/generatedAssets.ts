import * as Phaser from 'phaser';

const UI_BUTTON_SIZE = { width: 320, height: 60 };
const UI_PANEL_SIZE = { width: 520, height: 420 };
const PLAYER_SIZE = { width: 42, height: 54 };

export interface GeneratedTextureAsset {
  id: string;
  kind: 'generated-texture';
  width: number;
  height: number;
  usage: string;
}

export const GENERATED_TEXTURE_ASSETS: GeneratedTextureAsset[] = [
  generated('ui-button', UI_BUTTON_SIZE.width, UI_BUTTON_SIZE.height, 'menu button background'),
  generated('ui-button-active', UI_BUTTON_SIZE.width, UI_BUTTON_SIZE.height, 'selected menu button background'),
  generated('ui-panel', UI_PANEL_SIZE.width, UI_PANEL_SIZE.height, 'settings panel background'),
  generated('sample-actor', PLAYER_SIZE.width, PLAYER_SIZE.height, 'neutral starter actor'),
  generated('sample-platform', 180, 38, 'neutral starter platform tile'),
  generated('sample-pickup', 28, 28, 'neutral starter collectible'),
  generated('sample-exit', 70, 112, 'neutral starter level exit'),
  generated('sample-hazard', 56, 30, 'neutral starter hazard'),
  generated('sample-bg-sky', 1280, 720, 'generated sky/background layer'),
  generated('sample-bg-far', 1280, 720, 'generated far parallax layer'),
  generated('sample-bg-mid', 1280, 720, 'generated mid parallax layer'),
  generated('mode-card-1v1', 400, 300, 'mode card art for 1v1 battle'),
  generated('mode-card-1vcpu', 400, 300, 'mode card art for 1vCPU arcade mode'),
  generated('rooftop-twilight-stage', 1774, 887, 'rooftop twilight arena stage background'),
  generated('rooftop-sunset-stage', 2048, 768, 'rooftop sunset arena stage background')
];

function generated(
  id: string,
  width: number,
  height: number,
  usage: string
): GeneratedTextureAsset {
  return {
    id,
    kind: 'generated-texture',
    width,
    height,
    usage
  };
}

function generateRectangleTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  fillColor: number,
  strokeColor = 0x0f172a
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.add.graphics();
  graphics.fillStyle(fillColor, 1);
  graphics.fillRect(0, 0, width, height);
  graphics.lineStyle(3, strokeColor, 1);
  graphics.strokeRect(1.5, 1.5, width - 3, height - 3);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function generatePickupTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('sample-pickup')) {
    return;
  }

  const graphics = scene.add.graphics();
  graphics.fillStyle(0xfacc15, 1);
  graphics.fillCircle(14, 14, 13);
  graphics.lineStyle(3, 0xfef3c7, 1);
  graphics.strokeCircle(14, 14, 11);
  graphics.generateTexture('sample-pickup', 28, 28);
  graphics.destroy();
}

function generateBackgroundTexture(
  scene: Phaser.Scene,
  key: string,
  baseColor: number,
  accentColor: number
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.add.graphics();
  graphics.fillStyle(baseColor, 1);
  graphics.fillRect(0, 0, 1280, 720);

  for (let index = 0; index < 10; index += 1) {
    graphics.fillStyle(accentColor, 0.08 + index * 0.01);
    graphics.fillRect(index * 140 - 60, 380 + (index % 3) * 42, 260, 260);
  }

  graphics.generateTexture(key, 1280, 720);
  graphics.destroy();
}

/**
 * Generates the 1v1 Mode Selection Card texture.
 */
function generateModeCard1v1(scene: Phaser.Scene): void {
  if (scene.textures.exists('mode-card-1v1')) {
    return;
  }

  const width = 400;
  const height = 300;
  const graphics = scene.add.graphics();

  // Dark card background
  graphics.fillStyle(0x0f172a, 1);
  graphics.fillRect(0, 0, width, height);

  // Red vs Blue ambient split lighting
  graphics.fillStyle(0xef4444, 0.22);
  graphics.fillCircle(90, 140, 110);
  graphics.fillStyle(0x3b82f6, 0.22);
  graphics.fillCircle(310, 140, 110);

  // Background grid lines
  graphics.lineStyle(1, 0x1e293b, 0.7);
  for (let x = 20; x < width; x += 30) {
    graphics.lineBetween(x, 10, x, height - 10);
  }
  for (let y = 20; y < height; y += 30) {
    graphics.lineBetween(10, y, width - 10, y);
  }

  // P1 Fighter silhouette (Red side)
  graphics.fillStyle(0xef4444, 0.9);
  graphics.fillRoundedRect(70, 70, 75, 140, 16);
  graphics.fillCircle(107, 60, 26);
  // Fist forward
  graphics.fillRect(135, 100, 45, 24);
  graphics.fillCircle(175, 112, 14);

  // P2 Fighter silhouette (Blue side)
  graphics.fillStyle(0x3b82f6, 0.9);
  graphics.fillRoundedRect(255, 70, 75, 140, 16);
  graphics.fillCircle(292, 60, 26);
  // Fist forward
  graphics.fillRect(220, 100, 45, 24);
  graphics.fillCircle(225, 112, 14);

  // Center Clash / VS Spark
  graphics.fillStyle(0xfacc15, 1);
  graphics.fillCircle(200, 112, 22);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(200, 112, 12);

  // Card Outer Glow & Border
  graphics.lineStyle(3, 0xfacc15, 0.85);
  graphics.strokeRoundedRect(4, 4, width - 8, height - 8, 12);

  // Bottom Badge
  graphics.fillStyle(0x020617, 0.85);
  graphics.fillRoundedRect(110, 230, 180, 45, 8);
  graphics.lineStyle(2, 0xfacc15, 1);
  graphics.strokeRoundedRect(110, 230, 180, 45, 8);

  graphics.generateTexture('mode-card-1v1', width, height);
  graphics.destroy();
}

/**
 * Generates the 1vCPU Mode Selection Card texture.
 */
function generateModeCard1vCpu(scene: Phaser.Scene): void {
  if (scene.textures.exists('mode-card-1vcpu')) {
    return;
  }

  const width = 400;
  const height = 300;
  const graphics = scene.add.graphics();

  // Dark card background
  graphics.fillStyle(0x0b132b, 1);
  graphics.fillRect(0, 0, width, height);

  // Neon Cyan / Purple cyber glow
  graphics.fillStyle(0x06b6d4, 0.22);
  graphics.fillCircle(90, 140, 110);
  graphics.fillStyle(0xa855f7, 0.25);
  graphics.fillCircle(310, 140, 110);

  // Digital Circuit Grid
  graphics.lineStyle(1, 0x1e1e38, 0.8);
  for (let x = 20; x < width; x += 25) {
    graphics.lineBetween(x, 10, x, height - 10);
  }
  for (let y = 20; y < height; y += 25) {
    graphics.lineBetween(10, y, width - 10, y);
  }

  // P1 Player Silhouette (Cyan)
  graphics.fillStyle(0x06b6d4, 0.9);
  graphics.fillRoundedRect(70, 70, 75, 140, 16);
  graphics.fillCircle(107, 60, 26);
  graphics.fillRect(135, 100, 40, 22);

  // CPU Robot / Boss Head (Purple/Gold)
  graphics.fillStyle(0x8b5cf6, 0.9);
  graphics.fillRoundedRect(250, 65, 85, 145, 12);
  // Visor Eye
  graphics.fillStyle(0xef4444, 1);
  graphics.fillRect(235, 95, 80, 16);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(265, 98, 20, 10);

  // Robot Antenna
  graphics.lineStyle(4, 0xa855f7, 1);
  graphics.lineBetween(292, 65, 292, 40);
  graphics.fillStyle(0xfacc15, 1);
  graphics.fillCircle(292, 38, 8);

  // Center Lightning / Data Beam
  graphics.lineStyle(3, 0x38bdf8, 0.9);
  graphics.lineBetween(175, 110, 245, 105);

  // Card Outer Glow & Border
  graphics.lineStyle(3, 0x38bdf8, 0.85);
  graphics.strokeRoundedRect(4, 4, width - 8, height - 8, 12);

  // Bottom Badge
  graphics.fillStyle(0x020617, 0.85);
  graphics.fillRoundedRect(110, 230, 180, 45, 8);
  graphics.lineStyle(2, 0x38bdf8, 1);
  graphics.strokeRoundedRect(110, 230, 180, 45, 8);

  graphics.generateTexture('mode-card-1vcpu', width, height);
  graphics.destroy();
}

/**
 * Generates the Rooftop Twilight fighting arena background stage texture.
 */
function generateRooftopTwilightStage(scene: Phaser.Scene): void {
  if (scene.textures.exists('rooftop-twilight-stage')) {
    return;
  }

  const width = 1774;
  const height = 887;
  const groundY = 700;
  const graphics = scene.add.graphics();

  // 1. Sky Gradient (Deep Night Navy -> Twilight Purple -> Horizon Warm Glow)
  const skySteps = 24;
  for (let i = 0; i < skySteps; i++) {
    const y1 = (i / skySteps) * groundY;
    const h = groundY / skySteps + 2;
    const t = i / skySteps;
    let color: number;
    if (t < 0.35) {
      color = 0x070b19;
    } else if (t < 0.65) {
      color = 0x1a0f37;
    } else if (t < 0.85) {
      color = 0x3b1154;
    } else {
      color = 0x6b2158;
    }
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, y1, width, h);
  }

  // 2. Glowing Moon & Atmospheric Halo
  graphics.fillStyle(0xfef08a, 0.12);
  graphics.fillCircle(1380, 170, 95);
  graphics.fillStyle(0xfef08a, 0.25);
  graphics.fillCircle(1380, 170, 65);
  graphics.fillStyle(0xfffbeb, 0.95);
  graphics.fillCircle(1380, 170, 42);

  // 3. Stars in the night sky
  const seedStarX = [120, 280, 410, 560, 720, 890, 1020, 1180, 1530, 1660, 200, 650, 950, 1250, 1450, 70, 340, 810, 1120];
  const seedStarY = [45, 80, 35, 110, 65, 90, 40, 130, 75, 115, 160, 190, 150, 210, 50, 210, 240, 230, 250];
  graphics.fillStyle(0xffffff, 0.85);
  for (let s = 0; s < seedStarX.length; s++) {
    const sz = (s % 3 === 0) ? 3 : 2;
    graphics.fillRect(seedStarX[s], seedStarY[s], sz, sz);
  }

  // 4. Distant City Skyline Silhouettes (Layer 1 - Far Dark Towers)
  graphics.fillStyle(0x0e1329, 0.92);
  for (let bx = -40; bx < width + 60; bx += 85) {
    const bHeight = 220 + ((bx * 7) % 180);
    const bWidth = 65 + ((bx * 3) % 40);
    graphics.fillRect(bx, groundY - bHeight - 120, bWidth, bHeight + 120);

    // Antenna & red beacon light
    if ((bx / 85) % 3 === 0) {
      graphics.lineStyle(2, 0x1e293b, 1);
      graphics.lineBetween(bx + bWidth / 2, groundY - bHeight - 120, bx + bWidth / 2, groundY - bHeight - 165);
      graphics.fillStyle(0xef4444, 0.9);
      graphics.fillCircle(bx + bWidth / 2, groundY - bHeight - 167, 3);
      graphics.fillStyle(0x0e1329, 0.92);
    }
  }

  // 5. Mid-ground City Skyline Silhouettes (Layer 2 with glowing windows)
  graphics.fillStyle(0x161a36, 1);
  for (let bx = -20; bx < width + 80; bx += 115) {
    const bHeight = 160 + ((bx * 13) % 150);
    const bWidth = 85 + ((bx * 5) % 35);
    const bTop = groundY - bHeight - 60;
    graphics.fillRect(bx, bTop, bWidth, bHeight + 60);

    // Glowing Office Windows
    for (let wx = bx + 12; wx < bx + bWidth - 12; wx += 14) {
      for (let wy = bTop + 18; wy < groundY - 70; wy += 22) {
        if ((wx + wy) % 7 > 2) {
          const winColor = ((wx + wy) % 5 === 0) ? 0x38bdf8 : 0xfef08a;
          graphics.fillStyle(winColor, 0.65);
          graphics.fillRect(wx, wy, 7, 10);
        }
      }
    }
    graphics.fillStyle(0x161a36, 1);
  }

  // 6. Rooftop Arena Horizon & Fencing (Safety Railing along the edge)
  graphics.lineStyle(3, 0x334155, 1);
  graphics.lineBetween(0, groundY - 45, width, groundY - 45);
  graphics.lineBetween(0, groundY - 20, width, groundY - 20);
  for (let rx = 0; rx < width; rx += 45) {
    graphics.lineBetween(rx, groundY - 50, rx, groundY);
  }

  // Rooftop Left Penthouse / Elevator Shaft
  graphics.fillStyle(0x1e293b, 1);
  graphics.fillRect(40, groundY - 140, 160, 140);
  graphics.fillStyle(0x0f172a, 1);
  graphics.fillRect(70, groundY - 100, 50, 100);
  // Air conditioning unit & exhaust fans
  graphics.fillStyle(0x334155, 1);
  graphics.fillRect(240, groundY - 75, 80, 75);
  graphics.fillCircle(280, groundY - 40, 22);

  // Rooftop Right Water Tower
  graphics.fillStyle(0x382314, 1);
  graphics.fillRect(width - 240, groundY - 170, 130, 110);
  // Water tower legs & roof
  graphics.lineStyle(4, 0x1e293b, 1);
  graphics.lineBetween(width - 230, groundY - 60, width - 230, groundY);
  graphics.lineBetween(width - 120, groundY - 60, width - 120, groundY);
  graphics.lineBetween(width - 230, groundY - 60, width - 120, groundY);
  graphics.lineBetween(width - 120, groundY - 60, width - 230, groundY);
  // Conical top
  graphics.fillStyle(0x451a03, 1);
  graphics.fillTriangle(width - 245, groundY - 170, width - 105, groundY - 170, width - 175, groundY - 215);

  // 7. Rooftop Combat Ground Floor (Heavy Concrete Slabs with Cyber Edge Glow)
  // Base floor
  graphics.fillStyle(0x111827, 1);
  graphics.fillRect(0, groundY, width, height - groundY);

  // Perspective floor tiles / concrete panels
  graphics.lineStyle(2, 0x1f293d, 1);
  for (let gx = 0; gx < width; gx += 110) {
    graphics.lineBetween(gx, groundY, gx - 50, height);
  }
  for (let gy = groundY; gy < height; gy += 45) {
    graphics.lineBetween(0, gy, width, gy);
  }

  // Neon Floor Edge Strip (Cyan & Magenta Underglow)
  graphics.fillStyle(0x06b6d4, 0.7);
  graphics.fillRect(0, groundY, width, 4);
  graphics.fillStyle(0xa855f7, 0.35);
  graphics.fillRect(0, groundY + 4, width, 8);

  // Arena Center Battle Ring Marker
  graphics.lineStyle(3, 0xfacc15, 0.4);
  graphics.strokeCircle(width / 2, groundY + 130, 220);
  graphics.strokeCircle(width / 2, groundY + 130, 80);

  // Arena Spotlight Cones
  graphics.fillStyle(0x38bdf8, 0.04);
  graphics.fillTriangle(300, groundY - 200, 100, height, 700, height);
  graphics.fillStyle(0xf43f5e, 0.04);
  graphics.fillTriangle(width - 300, groundY - 200, width - 700, height, width - 100, height);

  graphics.generateTexture('rooftop-twilight-stage', width, height);
  graphics.destroy();
}

/**
 * Generates the Rooftop Sunset fighting arena background stage texture.
 */
function generateRooftopSunsetStage(scene: Phaser.Scene): void {
  if (scene.textures.exists('rooftop-sunset-stage')) {
    return;
  }

  const width = 2048;
  const height = 768;
  const groundY = 610;
  const graphics = scene.add.graphics();

  // 1. Sky Sunset Gradient (Deep Purple -> Crimson -> Fiery Orange -> Warm Gold)
  const skySteps = 22;
  for (let i = 0; i < skySteps; i++) {
    const y1 = (i / skySteps) * groundY;
    const h = groundY / skySteps + 2;
    const t = i / skySteps;
    let color: number;
    if (t < 0.25) {
      color = 0x2e0854;
    } else if (t < 0.5) {
      color = 0x6b1043;
    } else if (t < 0.75) {
      color = 0xb91c1c;
    } else if (t < 0.9) {
      color = 0xd97706;
    } else {
      color = 0xf59e0b;
    }
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, y1, width, h);
  }

  // 2. Glowing Golden Sun on the Horizon
  graphics.fillStyle(0xfef08a, 0.25);
  graphics.fillCircle(width / 2, groundY - 80, 130);
  graphics.fillStyle(0xfef3c7, 0.5);
  graphics.fillCircle(width / 2, groundY - 80, 90);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillCircle(width / 2, groundY - 80, 55);

  // 3. Sunset Clouds with golden highlights
  graphics.fillStyle(0x7c2d12, 0.5);
  graphics.fillRoundedRect(180, 120, 360, 35, 18);
  graphics.fillRoundedRect(840, 90, 480, 40, 20);
  graphics.fillRoundedRect(1420, 160, 320, 30, 15);
  graphics.fillStyle(0xfbbf24, 0.6);
  graphics.fillRect(200, 150, 320, 5);
  graphics.fillRect(860, 125, 440, 5);

  // 4. Distant Skyline Silhouettes (Bathed in Golden Rim Light)
  graphics.fillStyle(0x1c0f24, 0.95);
  for (let bx = -30; bx < width + 60; bx += 90) {
    const bHeight = 180 + ((bx * 9) % 170);
    const bWidth = 70 + ((bx * 3) % 35);
    const bTop = groundY - bHeight - 40;
    graphics.fillRect(bx, bTop, bWidth, bHeight + 40);

    // Warm Sun Rim Highlight on building tops
    graphics.fillStyle(0xf59e0b, 0.65);
    graphics.fillRect(bx, bTop, bWidth, 3);
    graphics.fillStyle(0x1c0f24, 0.95);
  }

  // 5. Rooftop Fence & Construction Elements
  graphics.lineStyle(3, 0x451a03, 1);
  graphics.lineBetween(0, groundY - 40, width, groundY - 40);
  graphics.lineBetween(0, groundY - 15, width, groundY - 15);
  for (let rx = 0; rx < width; rx += 45) {
    graphics.lineBetween(rx, groundY - 45, rx, groundY);
  }

  // Helipad & Rooftop Structure
  graphics.fillStyle(0x1f1412, 1);
  graphics.fillRect(100, groundY - 110, 180, 110);
  graphics.fillRect(width - 320, groundY - 130, 220, 130);

  // 6. Rooftop Battle Floor (Warm Asphalt & Hazard Warning Markings)
  graphics.fillStyle(0x181116, 1);
  graphics.fillRect(0, groundY, width, height - groundY);

  // Floor grid
  graphics.lineStyle(2, 0x2b1c23, 1);
  for (let gx = 0; gx < width; gx += 120) {
    graphics.lineBetween(gx, groundY, gx - 60, height);
  }
  for (let gy = groundY; gy < height; gy += 40) {
    graphics.lineBetween(0, gy, width, gy);
  }

  // Yellow / Black Hazard Stripes on Arena Edge
  for (let hx = 0; hx < width; hx += 36) {
    graphics.fillStyle(0xfacc15, 0.85);
    graphics.fillRect(hx, groundY, 18, 6);
    graphics.fillStyle(0x1c1917, 0.9);
    graphics.fillRect(hx + 18, groundY, 18, 6);
  }

  // Helipad Circle & "H" mark in center
  graphics.lineStyle(4, 0xfacc15, 0.6);
  graphics.strokeCircle(width / 2, groundY + 110, 130);
  graphics.lineStyle(6, 0xfacc15, 0.65);
  graphics.lineBetween(width / 2 - 35, groundY + 80, width / 2 - 35, groundY + 140);
  graphics.lineBetween(width / 2 + 35, groundY + 80, width / 2 + 35, groundY + 140);
  graphics.lineBetween(width / 2 - 35, groundY + 110, width / 2 + 35, groundY + 110);

  graphics.generateTexture('rooftop-sunset-stage', width, height);
  graphics.destroy();
}

export function registerGeneratedAssets(scene: Phaser.Scene): void {
  generateRectangleTexture(
    scene,
    'ui-button',
    UI_BUTTON_SIZE.width,
    UI_BUTTON_SIZE.height,
    0x1e293b,
    0x7dd3fc
  );
  generateRectangleTexture(
    scene,
    'ui-button-active',
    UI_BUTTON_SIZE.width,
    UI_BUTTON_SIZE.height,
    0x334155,
    0xf8fafc
  );
  generateRectangleTexture(
    scene,
    'ui-panel',
    UI_PANEL_SIZE.width,
    UI_PANEL_SIZE.height,
    0x111827,
    0x475569
  );
  generateRectangleTexture(
    scene,
    'sample-actor',
    PLAYER_SIZE.width,
    PLAYER_SIZE.height,
    0x38bdf8,
    0xe0f2fe
  );
  generateRectangleTexture(scene, 'sample-platform', 180, 38, 0x475569, 0x94a3b8);
  generateRectangleTexture(scene, 'sample-exit', 70, 112, 0x14532d, 0x86efac);
  generateRectangleTexture(scene, 'sample-hazard', 56, 30, 0x7f1d1d, 0xfca5a5);
  generatePickupTexture(scene);
  generateBackgroundTexture(scene, 'sample-bg-sky', 0x12263a, 0x38bdf8);
  generateBackgroundTexture(scene, 'sample-bg-far', 0x0f3a3a, 0x22c55e);
  generateBackgroundTexture(scene, 'sample-bg-mid', 0x172554, 0xfacc15);

  // Mode Cards & Stage Backgrounds
  generateModeCard1v1(scene);
  generateModeCard1vCpu(scene);
  generateRooftopTwilightStage(scene);
  generateRooftopSunsetStage(scene);
}

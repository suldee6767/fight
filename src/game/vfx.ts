import * as Phaser from 'phaser';

import { FIGHTING_UI_ATLAS_TEXTURE_KEY } from './fightingUiAtlas';
import type { StageAtmosphere } from './stageConfig';

/** Render depth for combat VFX: above fighters, below the HUD. */
const VFX_DEPTH = 90;
const ATMOSPHERE_DEPTH = 4;

/** Tint/spark colour keyed to the kind of impact. */
export type VfxColor = 'red' | 'gold' | 'blue';

const SPARK_FRAME: Record<VfxColor, string> = {
  red: 'icon-hit-red',
  gold: 'icon-hit-gold',
  blue: 'icon-hit-blue'
};

const FLASH_TINT: Record<VfxColor, number> = {
  red: 0xff5a5a,
  gold: 0xffd24a,
  blue: 0x7ec8ff
};

/**
 * Spawns a short-lived hit spark (an atlas impact icon) at a contact point that
 * pops in, scales up, and fades out. Used when an attack connects.
 */
export function spawnHitSpark(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: VfxColor = 'red',
  scale = 1
): void {
  const frame = SPARK_FRAME[color];
  if (!scene.textures.exists(FIGHTING_UI_ATLAS_TEXTURE_KEY)) {
    spawnImpactFlash(scene, x, y, color, 40 * scale);
    return;
  }

  const spark = scene.add
    .image(x, y, FIGHTING_UI_ATLAS_TEXTURE_KEY, frame)
    .setDepth(VFX_DEPTH)
    .setScrollFactor(1)
    .setScale(0.2 * scale)
    .setAngle(Phaser.Math.Between(-30, 30))
    .setAlpha(1);

  scene.tweens.add({
    targets: spark,
    scale,
    alpha: 0,
    duration: 220,
    ease: 'Cubic.Out',
    onComplete: () => spark.destroy()
  });

  spawnImpactFlash(scene, x, y, color, 34 * scale);
}

/**
 * Spawns an expanding ring flash at a point that fades as it grows.
 */
export function spawnImpactFlash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: VfxColor,
  radius = 40
): void {
  const ring = scene.add
    .circle(x, y, radius * 0.3, FLASH_TINT[color], 0.55)
    .setDepth(VFX_DEPTH - 1)
    .setScrollFactor(1);

  scene.tweens.add({
    targets: ring,
    scale: 2.4,
    alpha: 0,
    duration: 260,
    ease: 'Cubic.Out',
    onComplete: () => ring.destroy()
  });
}

/**
 * Spawns a special-move charge burst around a fighter: concentric rings that
 * expand outward and fade, telegraphing the wind-up before the move executes.
 */
export function spawnChargeAura(scene: Phaser.Scene, x: number, y: number, color: VfxColor = 'gold'): void {
  for (let index = 0; index < 3; index += 1) {
    const ring = scene.add
      .circle(x, y, 18, FLASH_TINT[color], 0)
      .setStrokeStyle(4, FLASH_TINT[color], 0.9)
      .setDepth(VFX_DEPTH - 1)
      .setScrollFactor(1)
      .setScale(1.6);

    scene.tweens.add({
      targets: ring,
      scale: 0.2,
      alpha: 0,
      delay: index * 120,
      duration: 420,
      ease: 'Sine.In',
      onComplete: () => ring.destroy()
    });
  }
}

/**
 * Spawns a crisp sapphire+gold Perfect Parry shockwave ring when a timed guard deflects a strike.
 */
export function spawnParryShockwave(scene: Phaser.Scene, x: number, y: number): void {
  const outer = scene.add
    .circle(x, y, 22, 0x38bdf8, 0.25)
    .setStrokeStyle(5, 0xfacc15, 0.95)
    .setDepth(VFX_DEPTH + 2)
    .setScrollFactor(1);

  scene.tweens.add({
    targets: outer,
    scale: 3.1,
    alpha: 0,
    duration: 280,
    ease: 'Cubic.Out',
    onComplete: () => outer.destroy()
  });

  const core = scene.add
    .circle(x, y, 14, 0xffffff, 0.95)
    .setDepth(VFX_DEPTH + 2)
    .setScrollFactor(1);

  scene.tweens.add({
    targets: core,
    scale: 2.2,
    alpha: 0,
    duration: 180,
    ease: 'Quad.Out',
    onComplete: () => core.destroy()
  });
}

/**
 * Spawns shattering crimson/gold shield shards when a defender's Guard Gauge hits 0.
 */
export function spawnGuardBreakBurst(scene: Phaser.Scene, x: number, y: number): void {
  const ring = scene.add
    .circle(x, y, 28, 0xef4444, 0.35)
    .setStrokeStyle(5, 0xfef08a, 0.95)
    .setDepth(VFX_DEPTH + 2)
    .setScrollFactor(1);

  scene.tweens.add({
    targets: ring,
    scale: 2.9,
    alpha: 0,
    duration: 340,
    ease: 'Cubic.Out',
    onComplete: () => ring.destroy()
  });

  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    const shard = scene.add
      .rectangle(x, y, 14, 7, i % 2 === 0 ? 0xfacc15 : 0xef4444, 0.95)
      .setAngle(Phaser.Math.RadToDeg(angle))
      .setDepth(VFX_DEPTH + 2)
      .setScrollFactor(1);

    scene.tweens.add({
      targets: shard,
      x: x + Math.cos(angle) * 95,
      y: y + Math.sin(angle) * 80,
      angle: shard.angle + 160,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.Out',
      onComplete: () => shard.destroy()
    });
  }
}

/**
 * Spawns an arcade "STUNNED!" floating callout above a fighter.
 */
export function spawnStunPopText(scene: Phaser.Scene, x: number, y: number): void {
  const label = scene.add
    .text(x, y, 'STUNNED!', {
      color: '#facc15',
      fontFamily: '"Barlow Condensed", sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 6
    })
    .setOrigin(0.5)
    .setDepth(VFX_DEPTH + 3)
    .setScrollFactor(1)
    .setScale(0.6);

  scene.tweens.add({
    targets: label,
    y: y - 44,
    scale: 1.05,
    duration: 240,
    ease: 'Back.Out',
    onComplete: () => {
      scene.tweens.add({
        targets: label,
        y: y - 72,
        alpha: 0,
        duration: 650,
        ease: 'Quad.In',
        onComplete: () => label.destroy()
      });
    }
  });
}

/**
 * Spawns a crisp damage / combo burst popup above an impacted fighter.
 */
export function spawnComboCallout(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#facc15'
): void {
  const label = scene.add
    .text(x, y, text, {
      color,
      fontFamily: '"Barlow Condensed", sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 6
    })
    .setOrigin(0.5)
    .setDepth(VFX_DEPTH + 3)
    .setScrollFactor(1)
    .setScale(0.7);

  scene.tweens.add({
    targets: label,
    y: y - 42,
    scale: 1.08,
    duration: 200,
    ease: 'Back.Out',
    onComplete: () => {
      scene.tweens.add({
        targets: label,
        y: y - 68,
        alpha: 0,
        duration: 420,
        ease: 'Quad.In',
        onComplete: () => label.destroy()
      });
    }
  });
}

/**
 * Persistent per-fighter stun visual: crackling cyan-gold electric aura around
 * the torso plus 3 orbiting stars spinning above the head for the stun window.
 */
export class StunVisualEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(VFX_DEPTH + 1).setScrollFactor(1).setVisible(false);
  }

  setActive(active: boolean): void {
    if (this.active === active) {
      return;
    }

    this.active = active;
    this.graphics.setVisible(active);

    if (!active) {
      this.graphics.clear();
    } else {
      this.elapsed = 0;
    }
  }

  update(centerX: number, feetY: number, bodyHeight: number, deltaSeconds: number): void {
    if (!this.active) {
      return;
    }

    this.elapsed += deltaSeconds;
    const g = this.graphics;
    g.clear();

    const height = Math.max(120, bodyHeight);
    const torsoY = feetY - height * 0.48;
    const headY = feetY - height * 0.88;
    const pulse = 0.85 + 0.15 * Math.sin(this.elapsed * 22);

    g.lineStyle(3, 0x38bdf8, 0.8);
    g.strokeEllipse(centerX, torsoY, 96 * pulse, height * 0.68);
    g.lineStyle(2, 0xfacc15, 0.75);
    g.strokeEllipse(centerX, torsoY, 76 * (1.9 - pulse), height * 0.56);

    for (let arc = 0; arc < 4; arc += 1) {
      const baseAngle = this.elapsed * 9 + (arc * Math.PI) / 2;
      const startX = centerX + Math.cos(baseAngle) * 34;
      const startY = torsoY + Math.sin(baseAngle) * (height * 0.24);
      const midX = centerX + Math.cos(baseAngle + 0.45) * 52;
      const midY = torsoY + Math.sin(baseAngle + 0.45) * (height * 0.32);
      const endX = centerX + Math.cos(baseAngle + 0.9) * 32;
      const endY = torsoY + Math.sin(baseAngle + 0.9) * (height * 0.22);

      g.lineStyle(2.5, arc % 2 === 0 ? 0x38bdf8 : 0xfacc15, 0.92);
      g.beginPath();
      g.moveTo(startX, startY);
      g.lineTo(midX, midY);
      g.lineTo(endX, endY);
      g.strokePath();
    }

    for (let index = 0; index < 3; index += 1) {
      const angle = this.elapsed * 5.2 + (index * Math.PI * 2) / 3;
      const starX = centerX + Math.cos(angle) * 40;
      const starY = headY + Math.sin(angle) * 11;
      const starRadius = 9 + Math.sin(angle) * 2.5;
      drawFourPointStar(g, starX, starY, starRadius);
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}

function drawFourPointStar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number
): void {
  const inner = radius * 0.38;
  g.fillStyle(0xfacc15, 1);
  g.lineStyle(2, 0x020617, 1);
  g.beginPath();
  g.moveTo(cx, cy - radius);
  g.lineTo(cx + inner, cy - inner);
  g.lineTo(cx + radius, cy);
  g.lineTo(cx + inner, cy + inner);
  g.lineTo(cx, cy + radius);
  g.lineTo(cx - inner, cy + inner);
  g.lineTo(cx - radius, cy);
  g.lineTo(cx - inner, cy - inner);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/**
 * Spawns Gojo's Red + Blue orbs spiraling together and fusing into a violet flash.
 */
export function spawnHollowPurpleCharge(scene: Phaser.Scene, x: number, y: number, facing: 1 | -1): void {
  const redOrb = scene.add.circle(x - facing * 34, y - 28, 16, 0xef4444, 0.95).setDepth(VFX_DEPTH + 1);
  const blueOrb = scene.add.circle(x - facing * 34, y + 28, 16, 0x3b82f6, 0.95).setDepth(VFX_DEPTH + 1);
  const mergeX = x + facing * 38;

  scene.tweens.add({
    targets: redOrb,
    x: mergeX,
    y,
    scale: 1.35,
    duration: 280,
    ease: 'Cubic.In',
    onComplete: () => redOrb.destroy()
  });

  scene.tweens.add({
    targets: blueOrb,
    x: mergeX,
    y,
    scale: 1.35,
    duration: 280,
    ease: 'Cubic.In',
    onComplete: () => {
      blueOrb.destroy();
      const burst = scene.add
        .circle(mergeX, y, 22, 0xa855f7, 0.9)
        .setStrokeStyle(5, 0xf3e8ff, 1)
        .setDepth(VFX_DEPTH + 2);
      scene.tweens.add({
        targets: burst,
        scale: 2.6,
        alpha: 0,
        duration: 240,
        ease: 'Cubic.Out',
        onComplete: () => burst.destroy()
      });
    }
  });
}

/**
 * Slams Gojo's black Prison Realm sealing cube around a defeated opponent.
 */
export function spawnPrisonRealmSeal(
  scene: Phaser.Scene,
  x: number,
  groundY: number,
  onClosed?: () => void
): void {
  const boxSize = 190;
  const centerY = groundY - boxSize * 0.45;
  const container = scene.add.container(x, centerY).setDepth(VFX_DEPTH + 4).setScale(1.8).setAlpha(0.2);

  const box = scene.add
    .rectangle(0, 0, boxSize, boxSize, 0x050508, 0.96)
    .setStrokeStyle(4, 0x9333ea, 0.95);
  const innerBorder = scene.add
    .rectangle(0, 0, boxSize - 22, boxSize - 22, 0x000000, 0)
    .setStrokeStyle(2, 0xef4444, 0.75);
  const sealEye = scene.add
    .ellipse(0, 0, 44, 24, 0x0f172a, 1)
    .setStrokeStyle(2.5, 0xef4444, 0.95);
  const pupil = scene.add.circle(0, 0, 8, 0xef4444, 1);

  container.add([box, innerBorder, sealEye, pupil]);

  scene.tweens.add({
    targets: container,
    scale: 1,
    alpha: 1,
    duration: 260,
    ease: 'Back.Out',
    onComplete: () => {
      onClosed?.();
      scene.cameras.main.shake(180, 0.01);

      scene.tweens.add({
        targets: container,
        scale: 1.06,
        duration: 180,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          scene.tweens.add({
            targets: container,
            scale: 0,
            alpha: 0,
            angle: 18,
            duration: 340,
            ease: 'Back.In',
            onComplete: () => container.destroy()
          });
        }
      });
    }
  });
}

/**
 * Spawns curved blade slash arcs in Water Breathing, Crimson Demon, or Hinokami flame colours.
 */
export function spawnSwordSlashArc(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: 1 | -1,
  style: 'light' | 'spin' | 'hinokami' | 'crimson'
): void {
  const g = scene.add.graphics({ x, y }).setDepth(VFX_DEPTH + 1).setScrollFactor(1);

  if (style === 'spin') {
    g.lineStyle(6, 0x38bdf8, 0.9);
    g.strokeCircle(0, 0, 74);
    g.lineStyle(3, 0xe0f2fe, 0.95);
    g.strokeCircle(0, 0, 58);

    scene.tweens.add({
      targets: g,
      scale: 1.32,
      alpha: 0,
      angle: facing * 140,
      duration: 240,
      ease: 'Cubic.Out',
      onComplete: () => g.destroy()
    });
    return;
  }

  const outerColor =
    style === 'hinokami' ? 0xf97316 : style === 'crimson' ? 0xe11d48 : 0x38bdf8;
  const innerColor =
    style === 'hinokami' ? 0xfef08a : style === 'crimson' ? 0xffe4e6 : 0xe0f2fe;
  const radius = style === 'hinokami' ? 96 : 68;
  const startAngle = facing === 1 ? -Math.PI * 0.42 : Math.PI * 0.58;
  const endAngle = facing === 1 ? Math.PI * 0.38 : Math.PI * 1.42;

  g.lineStyle(style === 'hinokami' ? 9 : 6, outerColor, 0.92);
  g.beginPath();
  g.arc(0, 0, radius, startAngle, endAngle, false);
  g.strokePath();

  g.lineStyle(3, innerColor, 0.95);
  g.beginPath();
  g.arc(0, 0, radius - 8, startAngle, endAngle, false);
  g.strokePath();

  scene.tweens.add({
    targets: g,
    scale: 1.24,
    alpha: 0,
    duration: 210,
    ease: 'Cubic.Out',
    onComplete: () => g.destroy()
  });
}

/**
 * Stylized anime Hinokami Kagura lethal slash flash across neck height.
 */
export function spawnHinokamiFinisher(
  scene: Phaser.Scene,
  targetX: number,
  neckY: number,
  facing: 1 | -1
): void {
  const cam = scene.cameras.main;
  const dim = scene.add
    .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x09040a, 0.48)
    .setScrollFactor(0)
    .setDepth(VFX_DEPTH + 2);

  scene.tweens.add({
    targets: dim,
    alpha: 0,
    delay: 140,
    duration: 280,
    onComplete: () => dim.destroy()
  });

  const slash = scene.add.graphics({ x: targetX, y: neckY }).setDepth(VFX_DEPTH + 4);
  slash.lineStyle(12, 0xf97316, 0.95);
  slash.beginPath();
  slash.moveTo(-facing * 170, 56);
  slash.lineTo(facing * 170, -56);
  slash.strokePath();

  slash.lineStyle(5, 0xfef9c3, 1);
  slash.beginPath();
  slash.moveTo(-facing * 185, 62);
  slash.lineTo(facing * 185, -62);
  slash.strokePath();

  scene.tweens.add({
    targets: slash,
    scaleX: 1.4,
    scaleY: 0.25,
    alpha: 0,
    duration: 360,
    ease: 'Cubic.Out',
    onComplete: () => slash.destroy()
  });

  for (let i = 0; i < 12; i += 1) {
    const ember = scene.add
      .circle(
        targetX + Phaser.Math.Between(-24, 24),
        neckY + Phaser.Math.Between(-24, 24),
        Phaser.Math.Between(3, 7),
        i % 2 === 0 ? 0xf97316 : 0xfacc15,
        0.95
      )
      .setDepth(VFX_DEPTH + 3);

    scene.tweens.add({
      targets: ember,
      x: ember.x + Phaser.Math.Between(-130, 130),
      y: ember.y + Phaser.Math.Between(-110, 60),
      alpha: 0,
      scale: 0.2,
      duration: Phaser.Math.Between(320, 540),
      ease: 'Cubic.Out',
      onComplete: () => ember.destroy()
    });
  }
}

/**
 * Goku's surging full-stage Kamehameha energy beam from (x, y) in `facing`.
 */
export function spawnKamehamehaBeam(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: 1 | -1,
  color: 'blue' | 'gold' = 'blue'
): void {
  const outerTint = color === 'gold' ? 0xfacc15 : 0x0ea5e9;
  const innerTint = color === 'gold' ? 0xfef9c3 : 0xe0f2fe;
  const beamLength = 1280;

  const container = scene.add.container(x, y).setDepth(VFX_DEPTH + 2);
  const muzzle = scene.add.circle(0, 0, 38, outerTint, 0.85).setStrokeStyle(4, innerTint, 1);
  const outerBeam = scene.add
    .rectangle(0, 0, beamLength, 68, outerTint, 0.8)
    .setOrigin(facing === 1 ? 0 : 1, 0.5)
    .setScale(0.06, 1);
  const coreBeam = scene.add
    .rectangle(0, 0, beamLength, 28, innerTint, 0.98)
    .setOrigin(facing === 1 ? 0 : 1, 0.5)
    .setScale(0.06, 1);

  container.add([outerBeam, coreBeam, muzzle]);

  scene.tweens.add({
    targets: [outerBeam, coreBeam],
    scaleX: 1,
    duration: 130,
    ease: 'Cubic.Out',
    onComplete: () => {
      scene.tweens.add({
        targets: container,
        alpha: 0,
        scaleY: 0.2,
        delay: 260,
        duration: 240,
        ease: 'Quad.In',
        onComplete: () => container.destroy()
      });
    }
  });
}

/**
 * Sukuna's Malevolent Shrine domain flash + crisscrossing crimson cleave slashes
 * directly over the opponent's position.
 */
export function spawnMalevolentShrine(
  scene: Phaser.Scene,
  targetX: number,
  groundY: number,
  onCleave?: () => void
): void {
  const cam = scene.cameras.main;
  const crimsonVeil = scene.add
    .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x450a0a, 0)
    .setScrollFactor(0)
    .setDepth(VFX_DEPTH + 1);

  scene.tweens.add({
    targets: crimsonVeil,
    alpha: 0.52,
    duration: 140,
    yoyo: true,
    hold: 260,
    onComplete: () => crimsonVeil.destroy()
  });

  const centerY = groundY - 120;
  for (let i = 0; i < 9; i += 1) {
    scene.time.delayedCall(i * 42, () => {
      const sx = targetX + Phaser.Math.Between(-95, 95);
      const sy = centerY + Phaser.Math.Between(-90, 70);
      const g = scene.add.graphics({ x: sx, y: sy }).setDepth(VFX_DEPTH + 4);
      const angle = Phaser.Math.FloatBetween(-Math.PI * 0.45, Math.PI * 0.45);
      const dx = Math.cos(angle) * 115;
      const dy = Math.sin(angle) * 115;

      g.lineStyle(8, 0xe11d48, 0.95);
      g.beginPath();
      g.moveTo(-dx, -dy);
      g.lineTo(dx, dy);
      g.strokePath();

      g.lineStyle(3, 0xffe4e6, 1);
      g.beginPath();
      g.moveTo(-dx, -dy);
      g.lineTo(dx, dy);
      g.strokePath();

      scene.tweens.add({
        targets: g,
        alpha: 0,
        scaleX: 1.25,
        duration: 210,
        onComplete: () => g.destroy()
      });

      if (i === 4) {
        onCleave?.();
      }
    });
  }
}

/**
 * Madara's Tengai Shinsei: summons a colossal glowing dark-violet meteor high above
 * that slams into the arena floor at `targetX` with a shockwave.
 */
export function spawnTengaiMeteor(
  scene: Phaser.Scene,
  targetX: number,
  groundY: number,
  onImpact: () => void
): void {
  const startY = -140;
  const meteor = scene.add.container(targetX, startY).setDepth(VFX_DEPTH + 4);
  const aura = scene.add.circle(0, 0, 86, 0x7e22ce, 0.45);
  const rock = scene.add
    .circle(0, 0, 58, 0x1e1b4b, 1)
    .setStrokeStyle(5, 0xc084fc, 0.95);
  const core = scene.add.circle(-12, -10, 22, 0x4c1d95, 0.9);
  meteor.add([aura, rock, core]);

  // Ground warning ring
  const targetRing = scene.add
    .ellipse(targetX, groundY - 8, 170, 38, 0x9333ea, 0.25)
    .setStrokeStyle(3, 0xe9d5ff, 0.9)
    .setDepth(VFX_DEPTH);

  scene.tweens.add({
    targets: meteor,
    y: groundY - 62,
    duration: 380,
    ease: 'Cubic.In',
    onComplete: () => {
      targetRing.destroy();
      onImpact();
      scene.cameras.main.shake(300, 0.018);

      const blast = scene.add
        .circle(targetX, groundY - 40, 40, 0xa855f7, 0.85)
        .setStrokeStyle(6, 0xf3e8ff, 1)
        .setDepth(VFX_DEPTH + 4);

      scene.tweens.add({
        targets: [blast, meteor],
        scale: 3.1,
        alpha: 0,
        duration: 360,
        ease: 'Cubic.Out',
        onComplete: () => {
          blast.destroy();
          meteor.destroy();
        }
      });
    }
  });
}

interface AmbientParticle {
  node: Phaser.GameObjects.Shape;
  vx: number;
  vy: number;
  wobbleAmp: number;
  wobbleFreq: number;
  phase: number;
}

/**
 * Fixed-pool ambient weather particles (sakura petals, glowing embers, cursed motes,
 * silver ash, mist, dust, sparks) updated in-place with zero per-frame allocation.
 */
export class StageAtmosphereEffect {
  private readonly particles: AmbientParticle[] = [];
  private readonly worldWidth: number;
  private readonly height: number;
  private readonly atmosphere: StageAtmosphere;
  private elapsed = 0;

  constructor(
    scene: Phaser.Scene,
    worldWidth: number,
    height: number,
    atmosphere: StageAtmosphere
  ) {
    this.worldWidth = worldWidth;
    this.height = height;
    this.atmosphere = atmosphere;

    const count = 26;
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.FloatBetween(0, worldWidth);
      const y = Phaser.Math.FloatBetween(0, height * 0.92);

      let node: Phaser.GameObjects.Shape;
      let vx = 0;
      let vy = 0;
      let wobbleAmp = 18;

      if (atmosphere === 'sakura') {
        node = scene.add
          .ellipse(x, y, Phaser.Math.Between(7, 11), Phaser.Math.Between(4, 6), i % 2 === 0 ? 0xfda4af : 0xfecdd3, 0.72)
          .setAngle(Phaser.Math.Between(0, 180));
        vx = Phaser.Math.FloatBetween(-42, -16);
        vy = Phaser.Math.FloatBetween(24, 48);
        wobbleAmp = 28;
      } else if (atmosphere === 'embers') {
        node = scene.add.circle(x, y, Phaser.Math.FloatBetween(2, 4.2), i % 2 === 0 ? 0xf97316 : 0xfacc15, 0.78);
        vx = Phaser.Math.FloatBetween(-12, 18);
        vy = Phaser.Math.FloatBetween(-55, -24);
        wobbleAmp = 16;
      } else if (atmosphere === 'cursed') {
        node = scene.add.circle(x, y, Phaser.Math.FloatBetween(2.5, 5), i % 2 === 0 ? 0x38bdf8 : 0xa855f7, 0.6);
        vx = Phaser.Math.FloatBetween(-18, 18);
        vy = Phaser.Math.FloatBetween(-32, -12);
      } else if (atmosphere === 'mist') {
        node = scene.add.circle(x, y, Phaser.Math.FloatBetween(3, 6), 0xbae6fd, 0.35);
        vx = Phaser.Math.FloatBetween(-26, 26);
        vy = Phaser.Math.FloatBetween(-16, 12);
      } else if (atmosphere === 'ash') {
        node = scene.add.circle(x, y, Phaser.Math.FloatBetween(2, 4), i % 2 === 0 ? 0xe2e8f0 : 0xc084fc, 0.5);
        vx = Phaser.Math.FloatBetween(-14, 14);
        vy = Phaser.Math.FloatBetween(12, 32);
      } else if (atmosphere === 'dust') {
        node = scene.add.circle(x, y, Phaser.Math.FloatBetween(2, 4), 0xfef08a, 0.45);
        vx = Phaser.Math.FloatBetween(-30, -8);
        vy = Phaser.Math.FloatBetween(-8, 10);
      } else {
        // sparks
        node = scene.add.circle(x, y, Phaser.Math.FloatBetween(2, 3.8), i % 2 === 0 ? 0x38bdf8 : 0xf43f5e, 0.65);
        vx = Phaser.Math.FloatBetween(-16, 16);
        vy = Phaser.Math.FloatBetween(-38, -14);
      }

      node.setDepth(ATMOSPHERE_DEPTH).setScrollFactor(1);
      this.particles.push({
        node,
        vx,
        vy,
        wobbleAmp,
        wobbleFreq: Phaser.Math.FloatBetween(1.4, 3.0),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
      });
    }
  }

  update(seconds: number): void {
    this.elapsed += seconds;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.node.x += (p.vx + Math.sin(this.elapsed * p.wobbleFreq + p.phase) * p.wobbleAmp) * seconds;
      p.node.y += p.vy * seconds;

      if (this.atmosphere === 'sakura') {
        p.node.angle += 65 * seconds;
      }

      if (p.node.y < -20) {
        p.node.y = this.height + 10;
        p.node.x = Phaser.Math.FloatBetween(0, this.worldWidth);
      } else if (p.node.y > this.height + 20) {
        p.node.y = -10;
        p.node.x = Phaser.Math.FloatBetween(0, this.worldWidth);
      }

      if (p.node.x < -20) {
        p.node.x = this.worldWidth + 10;
      } else if (p.node.x > this.worldWidth + 20) {
        p.node.x = -10;
      }
    }
  }

  destroy(): void {
    for (let i = 0; i < this.particles.length; i += 1) {
      this.particles[i].node.destroy();
    }
    this.particles.length = 0;
  }
}

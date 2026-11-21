import * as Phaser from 'phaser';

import type { Fighter } from './fighter';
import type { AttackProfile, OrbColor } from './types';
import { spawnImpactFlash, type VfxColor } from './vfx';

export type { OrbColor };

export interface OrbSpawnOptions {
  owner: Fighter;
  x: number;
  y: number;
  facing: 1 | -1;
  color: OrbColor;
  profile: AttackProfile;
  /** Optional vertical velocity (px/s), e.g., Frieza Supernova descending blast. */
  vy?: number;
  /** Optional radius override for mega specials. */
  radiusScale?: number;
}

interface ActiveOrb {
  owner: Fighter;
  facing: 1 | -1;
  color: OrbColor;
  profile: AttackProfile;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ttl: number;
  elapsed: number;
  container: Phaser.GameObjects.Container;
  outerRing: Phaser.GameObjects.Shape;
  core: Phaser.GameObjects.Shape;
}

const ORB_DEPTH = 40;

const ORB_STYLE: Record<
  OrbColor,
  { speed: number; radius: number; outer: number; inner: number; glow: number; beam?: boolean }
> = {
  red: { speed: 640, radius: 26, outer: 0xef4444, inner: 0xfecaca, glow: 0xdc2626 },
  blue: { speed: 600, radius: 26, outer: 0x3b82f6, inner: 0xdbeafe, glow: 0x1d4ed8 },
  purple: { speed: 760, radius: 56, outer: 0xa855f7, inner: 0xf3e8ff, glow: 0x6b21a8 },
  amber: { speed: 690, radius: 22, outer: 0xf97316, inner: 0xffedd5, glow: 0xea580c },
  gold: { speed: 720, radius: 24, outer: 0xfacc15, inner: 0xfef9c3, glow: 0xca8a04 },
  crimson: { speed: 780, radius: 24, outer: 0xe11d48, inner: 0xffe4e6, glow: 0x881337 },
  fire: { speed: 620, radius: 30, outer: 0xf97316, inner: 0xfef08a, glow: 0xb91c1c },
  magenta: { speed: 980, radius: 16, outer: 0xd946ef, inner: 0xfdf4ff, glow: 0xa21caf, beam: true },
  cyan: { speed: 700, radius: 32, outer: 0x06b6d4, inner: 0xe0f2fe, glow: 0x0284c7 }
};

/**
 * Manages active arena energy-orb & laser-bolt projectiles.
 */
export class ProjectileManager {
  private readonly scene: Phaser.Scene;
  private readonly orbs: ActiveOrb[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Spawns a glowing energy orb or piercing laser bolt flying in `facing`. */
  spawnOrb(options: OrbSpawnOptions): void {
    const style = ORB_STYLE[options.color];
    const radiusScale = options.radiusScale ?? 1;
    const radius = style.radius * radiusScale;
    const container = this.scene.add.container(options.x, options.y).setDepth(ORB_DEPTH);

    let outerRing: Phaser.GameObjects.Shape;
    let core: Phaser.GameObjects.Shape;

    if (style.beam) {
      const halo = this.scene.add.rectangle(0, 0, 88, 22, style.glow, 0.35);
      outerRing = this.scene.add
        .rectangle(0, 0, 74, 12, style.outer, 0.92)
        .setStrokeStyle(2, style.inner, 0.95);
      core = this.scene.add.rectangle(0, 0, 60, 5, style.inner, 1);
      container.add([halo, outerRing, core]);
    } else {
      const halo = this.scene.add.circle(0, 0, radius * 1.45, style.glow, 0.34);
      outerRing = this.scene.add
        .circle(0, 0, radius, style.outer, 0.85)
        .setStrokeStyle(3, style.inner, 0.95);
      core = this.scene.add.circle(0, 0, radius * 0.48, style.inner, 1);
      container.add([halo, outerRing, core]);
    }

    this.orbs.push({
      owner: options.owner,
      facing: options.facing,
      color: options.color,
      profile: options.profile,
      x: options.x,
      y: options.y,
      vx: options.facing * style.speed,
      vy: options.vy ?? 0,
      radius,
      ttl: 2.2,
      elapsed: 0,
      container,
      outerRing,
      core
    });
  }

  /**
   * Advances all active orbs, animates pulsing aura trails, and tests collisions
   * against the opponent fighter.
   */
  update(
    seconds: number,
    worldWidth: number,
    p1: Fighter,
    p2: Fighter,
    onHit: (orb: ActiveOrb, defender: Fighter, hitRect: Phaser.Geom.Rectangle, hurtRect: Phaser.Geom.Rectangle) => void
  ): void {
    for (let index = this.orbs.length - 1; index >= 0; index -= 1) {
      const orb = this.orbs[index];
      orb.ttl -= seconds;
      orb.elapsed += seconds;
      orb.x += orb.vx * seconds;
      orb.y += orb.vy * seconds;
      orb.container.setPosition(orb.x, orb.y);

      const pulse = 1 + 0.1 * Math.sin(orb.elapsed * 26);
      orb.outerRing.setScale(pulse);
      orb.core.setScale(1.15 - 0.1 * Math.sin(orb.elapsed * 30));

      if (orb.ttl <= 0 || orb.x < -140 || orb.x > worldWidth + 140 || orb.y > 900) {
        this.destroyOrb(index);
        continue;
      }

      const target = orb.owner === p1 ? p2 : p1;
      if (target.isDefeated) {
        continue;
      }

      const hurt = target.getHurtRect();
      if (!hurt) {
        continue;
      }

      const hitRect = new Phaser.Geom.Rectangle(
        orb.x - orb.radius,
        orb.y - orb.radius,
        orb.radius * 2,
        orb.radius * 2
      );

      if (Phaser.Geom.Intersects.RectangleToRectangle(hitRect, hurt)) {
        const flashColor: VfxColor =
          orb.color === 'blue' || orb.color === 'cyan'
            ? 'blue'
            : orb.color === 'purple' || orb.color === 'gold' || orb.color === 'amber'
              ? 'gold'
              : 'red';
        spawnImpactFlash(this.scene, orb.x, orb.y, flashColor, orb.radius * 1.45);
        onHit(orb, target, hitRect, hurt);
        this.destroyOrb(index);
      }
    }
  }

  /** Clears every active orb from the stage (round reset / scene shutdown). */
  clear(): void {
    while (this.orbs.length > 0) {
      this.destroyOrb(this.orbs.length - 1);
    }
  }

  private destroyOrb(index: number): void {
    const [orb] = this.orbs.splice(index, 1);
    orb?.container.destroy(true);
  }
}

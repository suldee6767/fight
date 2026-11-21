import * as Phaser from 'phaser';

import {
  calculateLiveSkillRank,
  resolveStrikeExchange,
  type SkillRankTier
} from '../game/combatSystem';
import { AUDIO_KEYS, playAudioCue, playCombatSfx } from '../game/core/audio';
import { Fighter, NEUTRAL_FIGHTER_INPUT, type FighterInput } from '../game/fighter';
import { getFighterTraits } from '../game/fighterConfig';
import { getCharacterDefinition } from '../game/hero';
import { MatchHud } from '../game/matchHud';
import { getFighterMeta } from '../game/myFighters';
import { ProjectileManager } from '../game/projectiles';
import { getStageDefinition } from '../game/stageConfig';
import { playSuperCutIn } from '../game/superCutIn';
import { SCENE_KEYS, type AttackProfile, type MatchConfig } from '../game/types';
import {
  StageAtmosphereEffect,
  spawnComboCallout,
  spawnGuardBreakBurst,
  spawnHinokamiFinisher,
  spawnHitSpark,
  spawnParryShockwave,
  spawnPrisonRealmSeal,
  spawnSwordSlashArc,
  type VfxColor
} from '../game/vfx';
import { BaseScene } from './BaseScene';

const GROUND_FRACTION = 0.82;
const EDGE_MARGIN = 170;
const DEPTH_FRONT = 8;
const DEPTH_BACK = 5;

const SPAWN_OFFSET_FRACTION = 0.18;
const CAMERA_LERP = 0.14;

const ROUNDS_TO_WIN = 2;
const ROUND_SECONDS = 60;
const HUD_DEPTH = 100;
const BANNER_DEPTH = 200;
const OVERLAY_DEPTH = 300;
const COMBO_DECAY_SECONDS = 1.65;

type MatchPhase = 'intro' | 'fighting' | 'roundEnd' | 'matchOver';

interface PlayerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  crouch: Phaser.Input.Keyboard.Key;
  block: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  light: Phaser.Input.Keyboard.Key;
  heavy: Phaser.Input.Keyboard.Key;
  special: Phaser.Input.Keyboard.Key;
  stance: Phaser.Input.Keyboard.Key;
}

interface PauseAction {
  label: string;
  action: () => void;
}

/**
 * The versus match: two fighters spawn facing each other and fight a best-of-3
 * (first to {@link ROUNDS_TO_WIN} rounds) across 8 panoramic anime stages with
 * atmospheric weather, hitstop juice, combo tracking, Pause modal, and victory summary.
 */
export class MatchScene extends BaseScene {
  private config: MatchConfig = {
    mode: '1vcpu',
    stageId: 'shibuya-station',
    p1CharacterId: 'gojo',
    p2CharacterId: 'sukuna'
  };

  private p1!: Fighter;
  private p2!: Fighter;
  private p1Keys!: PlayerKeys;
  private p2Keys!: PlayerKeys;
  private cpu?: CpuController;

  private phase: MatchPhase = 'intro';
  private paused = false;
  private roundNumber = 1;
  private p1Wins = 0;
  private p2Wins = 0;

  private spawnX1 = 0;
  private spawnX2 = 0;
  private stageWorldWidth = 0;
  private maxScroll = 0;

  private hud!: MatchHud;
  private projectiles!: ProjectileManager;
  private atmosphere?: StageAtmosphereEffect;
  private banner!: Phaser.GameObjects.Text;
  private roundTimeMs = ROUND_SECONDS * 1000;
  private matchElapsedMs = 0;
  private hitstopTimer = 0;
  private koEndDelayMs = 1100;

  private p1Combo = 0;
  private p2Combo = 0;
  private p1ComboTimer = 0;
  private p2ComboTimer = 0;
  private p1PeakCombo = 0;
  private p2PeakCombo = 0;
  private p1DamageDealt = 0;
  private p2DamageDealt = 0;
  private p1Parries = 0;
  private p2Parries = 0;
  private p1LiveRank: SkillRankTier = 'blue';
  private p2LiveRank: SkillRankTier = 'blue';

  private overlay: Phaser.GameObjects.GameObject[] = [];
  private pauseOverlay: Phaser.GameObjects.GameObject[] = [];
  private pauseButtons: Phaser.GameObjects.Text[] = [];
  private pauseActions: PauseAction[] = [];
  private pauseSelectedIndex = 0;

  constructor() {
    super(SCENE_KEYS.Match);
  }

  init(data: MatchConfig): void {
    if (data && data.p1CharacterId && data.p2CharacterId) {
      this.config = data;
    }
  }

  create(): void {
    this.cpu = undefined;
    this.phase = 'intro';
    this.paused = false;
    this.roundNumber = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.matchElapsedMs = 0;
    this.hitstopTimer = 0;
    this.p1Combo = 0;
    this.p2Combo = 0;
    this.p1ComboTimer = 0;
    this.p2ComboTimer = 0;
    this.p1PeakCombo = 0;
    this.p2PeakCombo = 0;
    this.p1DamageDealt = 0;
    this.p2DamageDealt = 0;
    this.p1Parries = 0;
    this.p2Parries = 0;
    this.p1LiveRank = 'blue';
    this.p2LiveRank = 'blue';
    this.overlay = [];
    this.pauseOverlay = [];
    this.pauseButtons = [];
    this.pauseActions = [];

    this.time.paused = false;
    this.tweens.resumeAll();

    this.markActiveScene(SCENE_KEYS.Match);
    this.setGameState('playing');
    this.cameras.main.setBackgroundColor(0x05070d);

    this.buildStage();
    this.projectiles = new ProjectileManager(this);
    this.spawnFighters();
    this.registerKeys();
    this.createControlsLegend();

    this.hud = new MatchHud(this, {
      mode: this.config.mode,
      p1CharacterId: this.config.p1CharacterId,
      p2CharacterId: this.config.p2CharacterId,
      roundsToWin: ROUNDS_TO_WIN,
      depth: HUD_DEPTH
    });
    this.hud.slideIn();

    this.banner = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY - 40, '', {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '76px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 10
      })
      .setOrigin(0.5)
      .setDepth(BANNER_DEPTH)
      .setScrollFactor(0)
      .setAlpha(0);

    if (this.config.mode === '1vcpu') {
      this.cpu = new CpuController();
    }

    this.startRound();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.time.paused = false;
      this.tweens.resumeAll();
      this.projectiles?.clear();
      this.atmosphere?.destroy();
      this.atmosphere = undefined;
      this.p1?.destroy();
      this.p2?.destroy();
      this.hud?.destroy();
    });
  }

  update(time: number, delta: number): void {
    if (this.paused) {
      return;
    }

    const seconds = Math.min(delta / 1000, 0.05);
    this.atmosphere?.update(seconds);
    this.hud.update(seconds);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - seconds);
      return;
    }

    const fighting = this.phase === 'fighting';
    if (fighting) {
      this.matchElapsedMs += delta;
      this.tickComboTimers(seconds);
    }

    const p1Input = fighting ? this.readKeys(this.p1Keys) : { ...NEUTRAL_FIGHTER_INPUT };
    const p2Input = fighting
      ? this.cpu
        ? this.cpu.update(time, this.p2, this.p1)
        : this.readKeys(this.p2Keys)
      : { ...NEUTRAL_FIGHTER_INPUT };

    p1Input.crouch = false;
    p2Input.crouch = false;

    if (fighting && this.cpu && this.p2.isMeterReady && Phaser.Math.Between(0, 140) === 0) {
      p2Input.special = true;
    }

    this.p1.faceToward(this.p2.x);
    this.p2.faceToward(this.p1.x);

    if (fighting) {
      if (isActing(p1Input)) {
        this.p1.setDepthBase(DEPTH_FRONT);
        this.p2.setDepthBase(DEPTH_BACK);
      } else if (isActing(p2Input)) {
        this.p2.setDepthBase(DEPTH_FRONT);
        this.p1.setDepthBase(DEPTH_BACK);
      }
    }

    this.p1.update(seconds, p1Input);
    this.p2.update(seconds, p2Input);

    this.updateCamera(false);

    if (fighting) {
      this.resolveCombat();
      this.projectiles.update(seconds, this.stageWorldWidth, this.p1, this.p2, (orb, defender, hitRect, hurtRect) => {
        const guard = defender.getGuardRect();
        const blocked = guard !== null && Phaser.Geom.Intersects.RectangleToRectangle(hitRect, guard);
        const isSpecial = orb.profile.kind === 'special';

        this.applyCombatExchange(
          orb.owner,
          defender,
          orb.profile,
          orb.facing,
          blocked,
          isSpecial,
          Boolean(orb.profile.finisher && !blocked),
          hitRect,
          hurtRect
        );
      });

      this.hud.applyHealth(this.p1.health01, this.p2.health01);
      this.checkForKnockout();

      if (this.phase === 'fighting') {
        this.tickRoundTimer(delta);
      }
    }

    this.hud.setMeter(this.p1.meter01, this.p2.meter01);
    this.hud.setStance('left', this.p1.currentStance);
    this.hud.setStance('right', this.p2.currentStance);
    this.hud.setGuard('left', this.p1.guard01, this.p1.isGuardBroken);
    this.hud.setGuard('right', this.p2.guard01, this.p2.isGuardBroken);
    this.hud.setTime(Math.ceil(this.roundTimeMs / 1000));
    this.hud.updateWins(this.p1Wins, this.p2Wins);
  }

  private tickComboTimers(seconds: number): void {
    if (this.p1ComboTimer > 0) {
      this.p1ComboTimer = Math.max(0, this.p1ComboTimer - seconds);
      if (this.p1ComboTimer === 0 && this.p1Combo > 0) {
        this.p1Combo = 0;
        this.hud.setCombo('left', 0);
        this.p1LiveRank = calculateLiveSkillRank(0, this.p1Parries).tier;
        this.hud.setLiveRank('left', this.p1LiveRank, 0);
      }
    }

    if (this.p2ComboTimer > 0) {
      this.p2ComboTimer = Math.max(0, this.p2ComboTimer - seconds);
      if (this.p2ComboTimer === 0 && this.p2Combo > 0) {
        this.p2Combo = 0;
        this.hud.setCombo('right', 0);
        this.p2LiveRank = calculateLiveSkillRank(0, this.p2Parries).tier;
        this.hud.setLiveRank('right', this.p2LiveRank, 0);
      }
    }
  }

  private resolveCombat(): void {
    this.tryHit(this.p1, this.p2);
    this.tryHit(this.p2, this.p1);
  }

  private tryHit(attacker: Fighter, defender: Fighter): void {
    if (defender.isDefeated) {
      return;
    }

    const attack = attacker.getActiveAttack();
    if (!attack) {
      return;
    }

    const hurt = defender.getHurtRect();
    if (!hurt || !Phaser.Geom.Intersects.RectangleToRectangle(attack.rect, hurt)) {
      return;
    }

    const guard = defender.getGuardRect();
    const blocked = guard !== null && Phaser.Geom.Intersects.RectangleToRectangle(attack.rect, guard);
    const isSpecial = attack.profile.kind === 'special';
    const finisher = attack.finisher && !blocked;

    const profile = finisher
      ? {
          ...attack.profile,
          knockback: attack.profile.stunEffect ? attack.profile.knockback : attack.profile.knockback * 1.9,
          hitstun: attack.profile.stunEffect ? attack.profile.hitstun : attack.profile.hitstun * 1.4
        }
      : attack.profile;

    attacker.markAttackConnected(!blocked ? (profile.maxHealthFraction ?? 0) : 0);

    this.applyCombatExchange(
      attacker,
      defender,
      profile,
      attacker.facingDirection,
      blocked,
      isSpecial,
      finisher,
      attack.rect,
      hurt
    );
  }

  private resolveArenaSpecialHit(options: {
    owner: Fighter;
    kind: 'beam' | 'domain' | 'meteor';
    rect: Phaser.Geom.Rectangle;
    profile: AttackProfile;
    impactX: number;
    impactY: number;
  }): void {
    if (this.phase !== 'fighting' || this.paused) {
      return;
    }

    const defender = options.owner === this.p1 ? this.p2 : this.p1;
    if (defender.isDefeated) {
      return;
    }

    const hurt = defender.getHurtRect();
    if (!hurt || !Phaser.Geom.Intersects.RectangleToRectangle(options.rect, hurt)) {
      return;
    }

    const guard = defender.getGuardRect();
    const blocked = guard !== null && Phaser.Geom.Intersects.RectangleToRectangle(options.rect, guard);

    this.applyCombatExchange(
      options.owner,
      defender,
      options.profile,
      options.owner.facingDirection,
      blocked,
      true,
      !blocked,
      options.rect,
      hurt
    );

    this.hud.applyHealth(this.p1.health01, this.p2.health01);
    this.checkForKnockout();
  }

  private applyCombatExchange(
    attacker: Fighter,
    defender: Fighter,
    profile: AttackProfile,
    direction: 1 | -1,
    blocked: boolean,
    isSpecial: boolean,
    finisher: boolean,
    attackRect: Phaser.Geom.Rectangle,
    hurtRect: Phaser.Geom.Rectangle
  ): void {
    const isP1Attacker = attacker === this.p1;
    const attackerMeta = getFighterMeta(attacker.characterId);
    const defenderMeta = getFighterMeta(defender.characterId);
    const attackerTraits = getFighterTraits(attacker.characterId);
    const defenderTraits = getFighterTraits(defender.characterId);
    const attackerLiveRank = isP1Attacker ? this.p1LiveRank : this.p2LiveRank;

    const exchange = resolveStrikeExchange({
      attackerStance: attacker.currentStance,
      defenderStance: defender.currentStance,
      attackerBaseRank: attackerMeta.rank,
      defenderBaseRank: defenderMeta.rank,
      attackerLiveRank,
      attackKind: profile.kind,
      baseDamage: profile.damage,
      maxHealthFraction: profile.maxHealthFraction,
      defenderMaxHp: defender.maxHp,
      blocked,
      parryActive: blocked && defender.isParryWindowActive,
      defenderGuardHealth: defender.guardHealthValue
    });

    const sparkX = (Phaser.Geom.Rectangle.GetCenter(attackRect).x + Phaser.Geom.Rectangle.GetCenter(hurtRect).x) / 2;
    const sparkY = (Phaser.Geom.Rectangle.GetCenter(attackRect).y + Phaser.Geom.Rectangle.GetCenter(hurtRect).y) / 2;

    if (exchange.attackerMeterGain > 0) {
      attacker.gainMeter(exchange.attackerMeterGain * (attackerTraits.meterGainMultiplier ?? 1));
    }
    if (exchange.defenderMeterGain > 0) {
      defender.gainMeter(exchange.defenderMeterGain * (defenderTraits.meterGainMultiplier ?? 1));
    }

    if (exchange.outcome === 'parried') {
      defender.setGuardHealth(exchange.nextGuardHealth);
      defender.flashHit(true);
      attacker.applyParryRecoil(defender.facingDirection, exchange.attackerStunMs);

      if (defender === this.p1) {
        this.p1Parries += 1;
        const nextRank = calculateLiveSkillRank(this.p1Combo, this.p1Parries);
        const promoted = nextRank.tier !== this.p1LiveRank;
        this.p1LiveRank = nextRank.tier;
        this.hud.setLiveRank('left', nextRank.tier, this.p1Combo);
        if (promoted && nextRank.tier !== 'blue') {
          spawnComboCallout(
            this,
            defender.x,
            defender.groundLineY - defender.displayHeight * 1.08,
            `${nextRank.label} RANK!`,
            nextRank.colorHex
          );
        }
      } else {
        this.p2Parries += 1;
        const nextRank = calculateLiveSkillRank(this.p2Combo, this.p2Parries);
        const promoted = nextRank.tier !== this.p2LiveRank;
        this.p2LiveRank = nextRank.tier;
        this.hud.setLiveRank('right', nextRank.tier, this.p2Combo);
        if (promoted && nextRank.tier !== 'blue') {
          spawnComboCallout(
            this,
            defender.x,
            defender.groundLineY - defender.displayHeight * 1.08,
            `${nextRank.label} RANK!`,
            nextRank.colorHex
          );
        }
      }

      spawnParryShockwave(this, sparkX, sparkY);
      spawnComboCallout(
        this,
        defender.x,
        defender.groundLineY - defender.displayHeight * 0.94,
        'PERFECT PARRY!',
        '#38bdf8'
      );
      playCombatSfx('parry', this.app.settingsStore.getState());
      this.hitstopTimer = 0.075;
      this.cameras.main.shake(120, 0.007);
      return;
    }

    if (exchange.outcome === 'guard-break') {
      defender.applyGuardBreak(direction, exchange.damage, exchange.defenderStunMs);
      defender.flashHit(false);
      if (isP1Attacker) {
        this.p1DamageDealt += exchange.damage;
      } else {
        this.p2DamageDealt += exchange.damage;
      }
      spawnGuardBreakBurst(this, sparkX, sparkY);
      spawnComboCallout(
        this,
        defender.x,
        defender.groundLineY - defender.displayHeight * 0.96,
        'GUARD BREAK!',
        '#ef4444'
      );
      playCombatSfx('guard-break', this.app.settingsStore.getState());
      this.hitstopTimer = 0.09;
      this.cameras.main.shake(240, 0.014);
    } else if (exchange.outcome === 'blocked') {
      defender.setGuardHealth(exchange.nextGuardHealth);
      defender.applyBlockReaction(profile.knockback, direction, Boolean(profile.pullTowardAttacker));
      defender.flashHit(true);
      playCombatSfx('block', this.app.settingsStore.getState());
      this.hitstopTimer = 0.036;
      this.spawnHitFx(attackRect, hurtRect, true, isSpecial, false);
      return;
    } else {
      defender.applyDamageAndReaction(
        exchange.damage,
        profile.knockback,
        profile.hitstun,
        direction,
        Boolean(profile.pullTowardAttacker),
        Boolean(profile.stunEffect)
      );
      defender.flashHit(false);

      if (isP1Attacker) {
        this.p1DamageDealt += exchange.damage;
        this.p1Combo += 1;
        this.p1ComboTimer = COMBO_DECAY_SECONDS;
        this.p1PeakCombo = Math.max(this.p1PeakCombo, this.p1Combo);
        this.hud.setCombo('left', this.p1Combo);

        const nextRank = calculateLiveSkillRank(this.p1Combo, this.p1Parries);
        const promoted = nextRank.tier !== this.p1LiveRank;
        this.p1LiveRank = nextRank.tier;
        this.hud.setLiveRank('left', nextRank.tier, this.p1Combo);

        if (promoted && nextRank.tier !== 'blue') {
          spawnComboCallout(
            this,
            attacker.x,
            attacker.groundLineY - attacker.displayHeight * 1.04,
            `${nextRank.label} RANK!`,
            nextRank.colorHex
          );
        }

        if (this.p1Combo >= 3) {
          spawnComboCallout(
            this,
            defender.x,
            defender.groundLineY - defender.displayHeight * 0.92,
            `${this.p1Combo} HITS!`,
            '#facc15'
          );
        }
      } else {
        this.p2DamageDealt += exchange.damage;
        this.p2Combo += 1;
        this.p2ComboTimer = COMBO_DECAY_SECONDS;
        this.p2PeakCombo = Math.max(this.p2PeakCombo, this.p2Combo);
        this.hud.setCombo('right', this.p2Combo);

        const nextRank = calculateLiveSkillRank(this.p2Combo, this.p2Parries);
        const promoted = nextRank.tier !== this.p2LiveRank;
        this.p2LiveRank = nextRank.tier;
        this.hud.setLiveRank('right', nextRank.tier, this.p2Combo);

        if (promoted && nextRank.tier !== 'blue') {
          spawnComboCallout(
            this,
            attacker.x,
            attacker.groundLineY - attacker.displayHeight * 1.04,
            `${nextRank.label} RANK!`,
            nextRank.colorHex
          );
        }

        if (this.p2Combo >= 3) {
          spawnComboCallout(
            this,
            defender.x,
            defender.groundLineY - defender.displayHeight * 0.92,
            `${this.p2Combo} HITS!`,
            '#fb7185'
          );
        }
      }

      if (profile.lifestealFraction && profile.lifestealFraction > 0) {
        const healed = Math.max(1, Math.round(exchange.damage * profile.lifestealFraction));
        attacker.heal(healed);
        spawnComboCallout(
          this,
          attacker.x,
          attacker.groundLineY - attacker.displayHeight * 0.95,
          `+${healed} HP`,
          '#4ade80'
        );
      }

      const sfxKind = defender.isDefeated
        ? 'ko'
        : isSpecial || profile.kind === 'low'
          ? 'hit-heavy'
          : 'hit-light';
      playCombatSfx(sfxKind, this.app.settingsStore.getState());
      this.hitstopTimer = defender.isDefeated || isSpecial || profile.kind === 'low' ? 0.065 : 0.036;
      this.spawnHitFx(attackRect, hurtRect, false, isSpecial, finisher);
    }

    if (defender.isDefeated) {
      if (profile.koVisual === 'prison-realm') {
        this.koEndDelayMs = 1550;
        spawnPrisonRealmSeal(this, defender.x, defender.groundLineY, () => {
          defender.concealForPrisonRealm();
        });
      } else if (profile.koVisual === 'hinokami-slash') {
        this.koEndDelayMs = 1400;
        spawnHinokamiFinisher(
          this,
          defender.x,
          defender.groundLineY - defender.displayHeight * 0.78,
          direction
        );
        this.cameras.main.shake(280, 0.016);
      } else if (profile.koVisual === 'shrine-cleave') {
        this.koEndDelayMs = 1400;
        spawnSwordSlashArc(this, defender.x, defender.groundLineY - defender.displayHeight * 0.55, direction, 'crimson');
        this.cameras.main.shake(300, 0.017);
      } else if (profile.koVisual === 'meteor-crush') {
        this.koEndDelayMs = 1350;
        this.cameras.main.shake(340, 0.02);
      }
    }
  }

  private spawnHitFx(
    attackRect: Phaser.Geom.Rectangle,
    hurtRect: Phaser.Geom.Rectangle,
    blocked: boolean,
    isSpecial: boolean,
    finisher: boolean
  ): void {
    const sparkX = (Phaser.Geom.Rectangle.GetCenter(attackRect).x + Phaser.Geom.Rectangle.GetCenter(hurtRect).x) / 2;
    const sparkY = (Phaser.Geom.Rectangle.GetCenter(attackRect).y + Phaser.Geom.Rectangle.GetCenter(hurtRect).y) / 2;

    const color: VfxColor = blocked ? 'blue' : finisher ? 'gold' : 'red';
    const sparkScale = finisher ? 1.7 : isSpecial ? 1.1 : 0.9;
    spawnHitSpark(this, sparkX, sparkY, color, sparkScale);

    if (finisher) {
      this.cameras.main.shake(220, 0.012);
    } else if (isSpecial) {
      this.cameras.main.shake(blocked ? 60 : 90, blocked ? 0.003 : 0.005);
    } else {
      this.cameras.main.shake(blocked ? 60 : 120, blocked ? 0.003 : 0.006);
    }
  }

  private checkForKnockout(): void {
    if (this.p1.isDefeated) {
      this.endRound(2);
    } else if (this.p2.isDefeated) {
      this.endRound(1);
    }
  }

  private tickRoundTimer(delta: number): void {
    this.roundTimeMs = Math.max(0, this.roundTimeMs - delta);

    if (this.roundTimeMs <= 0) {
      this.resolveTimeOut();
    }
  }

  private resolveTimeOut(): void {
    const p1 = this.p1.health01;
    const p2 = this.p2.health01;

    if (p1 > p2) {
      this.endRound(1, 'TIME UP', '#facc15');
    } else if (p2 > p1) {
      this.endRound(2, 'TIME UP', '#facc15');
    } else {
      this.drawRound();
    }
  }

  private drawRound(): void {
    if (this.phase !== 'fighting') {
      return;
    }

    this.phase = 'roundEnd';
    this.showBanner('DRAW', '#e2e8f0', 1.1);
    this.time.delayedCall(1100, () => this.startRound());
  }

  private buildStage(): void {
    const cam = this.cameras.main;
    const stage = getStageDefinition(this.config.stageId);
    const source = this.textures.get(stage.key).getSourceImage();
    const scale = cam.height / (source.height || stage.height);
    this.stageWorldWidth = (source.width || stage.width) * scale;
    this.maxScroll = Math.max(0, this.stageWorldWidth - cam.width);

    this.add.image(0, 0, stage.key).setOrigin(0, 0).setScale(scale).setDepth(0);
    cam.setBounds(0, 0, this.stageWorldWidth, cam.height);

    this.atmosphere = new StageAtmosphereEffect(this, this.stageWorldWidth, cam.height, stage.atmosphere);
  }

  private spawnFighters(): void {
    const cam = this.cameras.main;
    const groundY = Math.round(cam.height * GROUND_FRACTION);
    const minX = EDGE_MARGIN;
    const maxX = this.stageWorldWidth - EDGE_MARGIN;
    const center = this.stageWorldWidth / 2;
    this.spawnX1 = Math.round(center - cam.width * SPAWN_OFFSET_FRACTION);
    this.spawnX2 = Math.round(center + cam.width * SPAWN_OFFSET_FRACTION);

    this.p1 = new Fighter({
      scene: this,
      app: this.app,
      characterId: this.config.p1CharacterId,
      x: this.spawnX1,
      groundY,
      facing: 1,
      minX,
      maxX,
      depth: DEPTH_FRONT,
      onSpecialStart: (fighter) => playSuperCutIn(this, { characterId: fighter.characterId, side: 'left' }),
      onProjectileLaunch: (options) => this.projectiles.spawnOrb(options),
      onArenaSpecialHit: (options) => this.resolveArenaSpecialHit(options),
      getOpponentX: () => this.p2.x
    });

    this.p2 = new Fighter({
      scene: this,
      app: this.app,
      characterId: this.config.p2CharacterId,
      x: this.spawnX2,
      groundY,
      facing: -1,
      minX,
      maxX,
      depth: DEPTH_BACK,
      onSpecialStart: (fighter) => playSuperCutIn(this, { characterId: fighter.characterId, side: 'right' }),
      onProjectileLaunch: (options) => this.projectiles.spawnOrb(options),
      onArenaSpecialHit: (options) => this.resolveArenaSpecialHit(options),
      getOpponentX: () => this.p1.x
    });
  }

  private updateCamera(snap: boolean): void {
    const cam = this.cameras.main;
    const viewWidth = cam.width;
    const midpoint = (this.p1.x + this.p2.x) / 2;
    const targetScroll = Phaser.Math.Clamp(midpoint - viewWidth / 2, 0, this.maxScroll);
    const scrollX = snap ? targetScroll : Phaser.Math.Linear(cam.scrollX, targetScroll, CAMERA_LERP);

    cam.setScroll(scrollX, 0);

    const leftWall = scrollX + EDGE_MARGIN;
    const rightWall = scrollX + viewWidth - EDGE_MARGIN;
    this.p1.setHorizontalBounds(leftWall, rightWall);
    this.p2.setHorizontalBounds(leftWall, rightWall);
  }

  private registerKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('MatchScene requires keyboard input');
    }

    const codes = Phaser.Input.Keyboard.KeyCodes;
    this.p1Keys = {
      left: keyboard.addKey(codes.A),
      right: keyboard.addKey(codes.D),
      crouch: keyboard.addKey(codes.S),
      block: keyboard.addKey(codes.C),
      jump: keyboard.addKey(codes.W),
      light: keyboard.addKey(codes.F),
      heavy: keyboard.addKey(codes.G),
      special: keyboard.addKey(codes.V),
      stance: keyboard.addKey(codes.Q)
    };

    this.p2Keys = {
      left: keyboard.addKey(codes.LEFT),
      right: keyboard.addKey(codes.RIGHT),
      crouch: keyboard.addKey(codes.DOWN),
      block: keyboard.addKey(codes.FORWARD_SLASH),
      jump: keyboard.addKey(codes.UP),
      light: keyboard.addKey(codes.COMMA),
      heavy: keyboard.addKey(codes.PERIOD),
      special: keyboard.addKey(codes.L),
      stance: keyboard.addKey(codes.K)
    };

    keyboard.on('keydown-ESC', () => {
      if (this.phase === 'matchOver') {
        this.goToMenu();
        return;
      }
      this.togglePause();
    });

    keyboard.on('keydown-P', () => {
      if (this.phase !== 'matchOver') {
        this.togglePause();
      }
    });

    keyboard.on('keydown-UP', () => {
      if (this.paused) {
        this.movePauseSelection(-1);
      }
    });
    keyboard.on('keydown-W', () => {
      if (this.paused) {
        this.movePauseSelection(-1);
      }
    });
    keyboard.on('keydown-DOWN', () => {
      if (this.paused) {
        this.movePauseSelection(1);
      }
    });
    keyboard.on('keydown-S', () => {
      if (this.paused) {
        this.movePauseSelection(1);
      }
    });
    keyboard.on('keydown-ENTER', () => {
      if (this.paused) {
        this.pauseActions[this.pauseSelectedIndex]?.action();
      }
    });
    keyboard.on('keydown-SPACE', () => {
      if (this.paused) {
        this.pauseActions[this.pauseSelectedIndex]?.action();
      }
    });

    keyboard.on('keydown-R', () => {
      if (this.phase === 'matchOver') {
        this.rematch();
      }
    });
  }

  private togglePause(): void {
    if (this.paused) {
      this.resumeMatch();
    } else {
      this.pauseMatch();
    }
  }

  private pauseMatch(): void {
    if (this.paused || this.phase === 'matchOver') {
      return;
    }

    this.paused = true;
    this.setGameState('paused');
    this.time.paused = true;
    this.tweens.pauseAll();
    playAudioCue(this, AUDIO_KEYS.uiConfirm, this.app.settingsStore.getState());

    const { centerX, centerY, width, height } = this.cameras.main;
    const stage = getStageDefinition(this.config.stageId);
    const p1Label = getCharacterDefinition(this.config.p1CharacterId).label.toUpperCase();
    const p2Label = getCharacterDefinition(this.config.p2CharacterId).label.toUpperCase();

    const dim = this.add
      .rectangle(centerX, centerY, width, height, 0x020617, 0.72)
      .setDepth(OVERLAY_DEPTH)
      .setScrollFactor(0);

    const card = this.add
      .rectangle(centerX, centerY, 440, 380, 0x0b1222, 0.96)
      .setStrokeStyle(2, 0x38bdf8, 0.9)
      .setDepth(OVERLAY_DEPTH)
      .setScrollFactor(0);

    const heading = this.add
      .text(centerX, centerY - 142, 'PAUSED', {
        color: '#f8fafc',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '48px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 1)
      .setScrollFactor(0);

    const sub = this.add
      .text(centerX, centerY - 96, `${p1Label} vs ${p2Label}  •  ${stage.label}`, {
        color: '#94a3b8',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '14px'
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 1)
      .setScrollFactor(0);

    this.pauseActions = [
      { label: 'Resume Match', action: () => this.resumeMatch() },
      { label: 'Restart Match', action: () => this.restartFromPause() },
      { label: 'Change Fighters', action: () => this.goToCharacterSelect() },
      { label: 'Main Menu', action: () => this.goToMenu() }
    ];

    this.pauseButtons = [];
    this.pauseSelectedIndex = 0;

    this.pauseActions.forEach((item, index) => {
      const btn = this.add
        .text(centerX, centerY - 30 + index * 54, item.label, {
          color: '#e2e8f0',
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          padding: { x: 24, y: 8 }
        })
        .setOrigin(0.5)
        .setDepth(OVERLAY_DEPTH + 1)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => this.setPauseSelection(index));
      btn.on('pointerdown', () => item.action());
      this.pauseButtons.push(btn);
    });

    this.pauseOverlay = [dim, card, heading, sub, ...this.pauseButtons];
    this.setPauseSelection(0);
  }

  private setPauseSelection(index: number): void {
    this.pauseSelectedIndex = index;
    this.pauseButtons.forEach((btn, i) => {
      const active = i === index;
      btn.setColor(active ? '#facc15' : '#e2e8f0');
      btn.setBackgroundColor(active ? 'rgba(30, 58, 138, 0.92)' : 'rgba(15, 23, 42, 0.92)');
    });
  }

  private movePauseSelection(delta: number): void {
    if (this.pauseButtons.length === 0) {
      return;
    }
    const next = Phaser.Math.Wrap(this.pauseSelectedIndex + delta, 0, this.pauseButtons.length);
    this.setPauseSelection(next);
  }

  private resumeMatch(): void {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.pauseOverlay.forEach((obj) => obj.destroy());
    this.pauseOverlay = [];
    this.pauseButtons = [];
    this.pauseActions = [];
    this.time.paused = false;
    this.tweens.resumeAll();
    this.setGameState(this.phase === 'matchOver' ? 'gameover' : 'playing');
  }

  private restartFromPause(): void {
    this.resumeMatch();
    this.rematch();
  }

  private goToCharacterSelect(): void {
    this.resumeMatch();
    this.scene.start(SCENE_KEYS.CharacterSelect, {
      mode: this.config.mode,
      stageId: this.config.stageId
    });
  }

  private readKeys(keys: PlayerKeys): FighterInput {
    return {
      left: keys.left.isDown,
      right: keys.right.isDown,
      crouch: keys.crouch.isDown,
      block: keys.block.isDown,
      jump: Phaser.Input.Keyboard.JustDown(keys.jump),
      light: Phaser.Input.Keyboard.JustDown(keys.light),
      lightHeld: keys.light.isDown,
      heavy: Phaser.Input.Keyboard.JustDown(keys.heavy),
      special: Phaser.Input.Keyboard.JustDown(keys.special),
      stance: Phaser.Input.Keyboard.JustDown(keys.stance)
    };
  }

  private createControlsLegend(): void {
    const { centerX, height } = this.cameras.main;
    const p1 = 'P1: WASD • F light • G heavy • C block/parry • Q stance • V special';
    const p2 =
      this.config.mode === '1vcpu'
        ? 'P2: CPU'
        : 'P2: Arrows • , light • . heavy • / block/parry • K stance • L special';

    this.add
      .text(centerX, height - 20, `${p1}      ${p2}      Esc / P Pause`, {
        color: '#cbd5e1',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '12px',
        backgroundColor: 'rgba(2, 6, 23, 0.65)',
        padding: { x: 12, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setScrollFactor(0);
  }

  private startRound(): void {
    this.phase = 'intro';
    this.setGameState('playing');
    this.roundTimeMs = ROUND_SECONDS * 1000;
    this.koEndDelayMs = 1100;
    this.hitstopTimer = 0;
    this.p1Combo = 0;
    this.p2Combo = 0;
    this.p1ComboTimer = 0;
    this.p2ComboTimer = 0;
    this.p1Parries = 0;
    this.p2Parries = 0;
    this.p1LiveRank = 'blue';
    this.p2LiveRank = 'blue';
    this.hud.setCombo('left', 0);
    this.hud.setCombo('right', 0);
    this.hud.setStance('left', 'offense');
    this.hud.setStance('right', 'offense');
    this.hud.setGuard('left', 1, false);
    this.hud.setGuard('right', 1, false);
    this.hud.setLiveRank('left', 'blue', 0);
    this.hud.setLiveRank('right', 'blue', 0);
    this.projectiles.clear();

    const fullMin = EDGE_MARGIN;
    const fullMax = this.stageWorldWidth - EDGE_MARGIN;
    this.p1.setHorizontalBounds(fullMin, fullMax);
    this.p2.setHorizontalBounds(fullMin, fullMax);

    this.p1.resetForRound(this.spawnX1, 1);
    this.p2.resetForRound(this.spawnX2, -1);
    this.p1.setDepthBase(DEPTH_FRONT);
    this.p2.setDepthBase(DEPTH_BACK);
    this.updateCamera(true);
    this.hud.animateFill();
    this.hud.updateWins(this.p1Wins, this.p2Wins);

    this.showBanner(`ROUND ${this.roundNumber}`, '#f8fafc');

    this.time.delayedCall(900, () => {
      if (this.phase !== 'intro') {
        return;
      }

      this.showBanner('FIGHT!', '#facc15', 1.15);
      this.phase = 'fighting';
      this.p1.setFrozen(false);
      this.p2.setFrozen(false);

      this.time.delayedCall(650, () => this.hideBanner());
    });
  }

  private endRound(winner: 1 | 2, bannerText = 'K.O.', bannerColor = '#f43f5e'): void {
    if (this.phase !== 'fighting') {
      return;
    }

    this.phase = 'roundEnd';

    if (winner === 1) {
      this.p1Wins += 1;
    } else {
      this.p2Wins += 1;
    }

    const winnerName =
      winner === 1
        ? `P1 ${getCharacterDefinition(this.config.p1CharacterId).label}`
        : `${this.config.mode === '1vcpu' ? 'CPU' : 'P2'} ${getCharacterDefinition(this.config.p2CharacterId).label}`;
    this.showBanner(bannerText, bannerColor, 1.2);

    this.time.delayedCall(this.koEndDelayMs, () => {
      const matchOver = this.p1Wins >= ROUNDS_TO_WIN || this.p2Wins >= ROUNDS_TO_WIN;

      if (matchOver) {
        this.endMatch(winnerName);
      } else {
        this.roundNumber += 1;
        this.startRound();
      }
    });
  }

  private endMatch(winnerName: string): void {
    this.phase = 'matchOver';
    this.setGameState('gameover');
    this.hideBanner();

    const { centerX, centerY, width, height } = this.cameras.main;

    const dim = this.add
      .rectangle(centerX, centerY, width, height, 0x020617, 0.72)
      .setDepth(OVERLAY_DEPTH)
      .setScrollFactor(0);

    const card = this.add
      .rectangle(centerX, centerY, 540, 400, 0x0b1222, 0.96)
      .setStrokeStyle(2, 0xfacc15, 0.9)
      .setDepth(OVERLAY_DEPTH)
      .setScrollFactor(0);

    const title = this.add
      .text(centerX, centerY - 140, `${winnerName.toUpperCase()} WINS!`, {
        color: '#facc15',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '50px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 6,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 1)
      .setScrollFactor(0);

    const score = this.add
      .text(centerX, centerY - 84, `FINAL SCORE  ${this.p1Wins} - ${this.p2Wins}`, {
        color: '#f8fafc',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '20px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 1)
      .setScrollFactor(0);

    const elapsedSec = Math.max(1, Math.round(this.matchElapsedMs / 1000));
    const stats = this.add
      .text(
        centerX,
        centerY - 30,
        `Peak Combo: ${Math.max(this.p1PeakCombo, this.p2PeakCombo)} Hits   •   Damage: ${this.p1DamageDealt + this.p2DamageDealt}   •   Time: ${elapsedSec}s`,
        {
          color: '#94a3b8',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '15px'
        }
      )
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 1)
      .setScrollFactor(0);

    const rematch = this.makeOverlayButton(centerX, centerY + 34, 'Rematch  (R)', () => this.rematch());
    const fighters = this.makeOverlayButton(centerX, centerY + 92, 'Character Select', () =>
      this.goToCharacterSelect()
    );
    const menu = this.makeOverlayButton(centerX, centerY + 150, 'Main Menu  (Esc)', () => this.goToMenu());

    this.overlay = [dim, card, title, score, stats, rematch, fighters, menu];
  }

  private makeOverlayButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        color: '#e2e8f0',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        padding: { x: 24, y: 9 }
      })
      .setOrigin(0.5)
      .setDepth(OVERLAY_DEPTH + 1)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setColor('#facc15'));
    button.on('pointerout', () => button.setColor('#e2e8f0'));
    button.on('pointerdown', onClick);

    return button;
  }

  private rematch(): void {
    this.overlay.forEach((object) => object.destroy());
    this.overlay = [];
    this.roundNumber = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.matchElapsedMs = 0;
    this.p1PeakCombo = 0;
    this.p2PeakCombo = 0;
    this.p1DamageDealt = 0;
    this.p2DamageDealt = 0;
    this.cpu = this.config.mode === '1vcpu' ? new CpuController() : undefined;
    this.startRound();
  }

  private showBanner(text: string, color: string, peakScale = 1): void {
    this.banner.setText(text).setColor(color).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: peakScale, duration: 260, ease: 'Back.Out' });
  }

  private hideBanner(): void {
    this.tweens.add({ targets: this.banner, alpha: 0, duration: 300 });
  }
}

function isActing(input: FighterInput): boolean {
  return input.left || input.right || input.jump || input.light || input.heavy;
}

class CpuController {
  private nextDecisionAt = 0;
  private holdUntil = 0;
  private moveDir = 0;
  private holdCrouch = false;
  private holdBlock = false;
  private nextStanceEvalAt = 2400;

  update(timeMs: number, cpuFighter: Fighter, opponentFighter: Fighter): FighterInput {
    const input: FighterInput = { ...NEUTRAL_FIGHTER_INPUT };
    const distance = Math.abs(cpuFighter.x - opponentFighter.x);

    if (timeMs >= this.nextStanceEvalAt) {
      this.nextStanceEvalAt = timeMs + Phaser.Math.Between(1800, 3400);
      const wantDefense =
        (cpuFighter.health01 < 0.42 && cpuFighter.guard01 > 0.35) ||
        (opponentFighter.currentStance === 'offense' && cpuFighter.health01 < 0.65 && Math.random() < 0.45);
      const wantOffense =
        opponentFighter.isGuardBroken ||
        cpuFighter.isMeterReady ||
        (cpuFighter.health01 >= 0.5 && Math.random() < 0.65);

      if (wantDefense && cpuFighter.currentStance === 'offense') {
        input.stance = true;
      } else if (wantOffense && cpuFighter.currentStance === 'defense') {
        input.stance = true;
      }
    }

    if (timeMs >= this.nextDecisionAt) {
      this.decide(timeMs, input, cpuFighter, opponentFighter, distance);
      this.nextDecisionAt = timeMs + Phaser.Math.Between(550, 1250);
    }

    if (timeMs < this.holdUntil) {
      if (this.moveDir < 0) {
        input.left = true;
      } else if (this.moveDir > 0) {
        input.right = true;
      }
      input.crouch = input.crouch || this.holdCrouch;
      input.block = input.block || this.holdBlock;
    } else {
      this.moveDir = 0;
      this.holdCrouch = false;
      this.holdBlock = false;
    }

    return input;
  }

  private decide(
    timeMs: number,
    input: FighterInput,
    cpuFighter: Fighter,
    opponentFighter: Fighter,
    distance: number
  ): void {
    if (opponentFighter.isMidAttack && distance < 230 && !cpuFighter.isGuardBroken && Math.random() < 0.38) {
      this.holdBlock = true;
      input.block = true;
      this.holdUntil = timeMs + Phaser.Math.Between(240, 420);
      return;
    }

    const roll = Math.random();

    if (distance > 250 && roll < 0.48) {
      this.moveDir = opponentFighter.x < cpuFighter.x ? -1 : 1;
      this.holdUntil = timeMs + Phaser.Math.Between(350, 680);
      return;
    }

    if (roll < 0.22) {
      return;
    }
    if (roll < 0.48) {
      input.light = true;
      return;
    }
    if (roll < 0.66) {
      input.heavy = true;
      return;
    }
    if (roll < 0.76) {
      input.jump = true;
      return;
    }
    if (roll < 0.9) {
      this.moveDir = Math.random() < 0.5 ? -1 : 1;
      this.holdUntil = timeMs + Phaser.Math.Between(320, 720);
      return;
    }

    this.holdBlock = true;
    this.holdUntil = timeMs + Phaser.Math.Between(320, 620);
  }
}

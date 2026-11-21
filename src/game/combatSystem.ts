import type { AttackKind } from './types';

export type SkillRankTier = 'blue' | 'purple' | 'red' | 'golden';
export type CombatStance = 'offense' | 'defense';

export interface SkillRankDefinition {
  tier: SkillRankTier;
  label: string;
  colorHex: string;
  colorNum: number;
  /** Baseline passive damage bonus for fighter tier (0..0.10). */
  powerBonus: number;
  /** Live combo damage bonus when achieved mid-round (0..0.20). */
  liveComboDamageBonus: number;
  /** Meter generation multiplier when achieved (1.0..1.20). */
  meterBonus: number;
}

export interface StanceModifiers {
  stance: CombatStance;
  label: string;
  shortLabel: string;
  colorHex: string;
  colorNum: number;
  damageOutMultiplier: number;
  damageInMultiplier: number;
  meterGainMultiplier: number;
  guardShredMultiplier: number;
  guardRegenPerSec: number;
  parryWindowSeconds: number;
}

export const GUARD_MAX = 100;
export const GUARD_BREAK_STUN_MS = 1800;
export const PARRY_STUN_MS = 950;
export const PARRY_METER_REWARD = 22;
export const STANCE_SWITCH_COOLDOWN_SEC = 0.45;

export const SKILL_RANK_ORDER: SkillRankTier[] = ['blue', 'purple', 'red', 'golden'];

export const SKILL_RANK_TIERS: Record<SkillRankTier, SkillRankDefinition> = {
  blue: {
    tier: 'blue',
    label: 'RARE',
    colorHex: '#38bdf8',
    colorNum: 0x38bdf8,
    powerBonus: 0,
    liveComboDamageBonus: 0,
    meterBonus: 1
  },
  purple: {
    tier: 'purple',
    label: 'EPIC',
    colorHex: '#a855f7',
    colorNum: 0xa855f7,
    powerBonus: 0.03,
    liveComboDamageBonus: 0.06,
    meterBonus: 1.06
  },
  red: {
    tier: 'red',
    label: 'LEGENDARY',
    colorHex: '#ef4444',
    colorNum: 0xef4444,
    powerBonus: 0.06,
    liveComboDamageBonus: 0.12,
    meterBonus: 1.12
  },
  golden: {
    tier: 'golden',
    label: 'MYTHIC',
    colorHex: '#facc15',
    colorNum: 0xfacc15,
    powerBonus: 0.1,
    liveComboDamageBonus: 0.2,
    meterBonus: 1.2
  }
};

export const STANCE_MODIFIERS: Record<CombatStance, StanceModifiers> = {
  offense: {
    stance: 'offense',
    label: 'OFFENSE',
    shortLabel: 'OFF',
    colorHex: '#ef4444',
    colorNum: 0xef4444,
    damageOutMultiplier: 1.25,
    damageInMultiplier: 1.12,
    meterGainMultiplier: 1.3,
    guardShredMultiplier: 1.45,
    guardRegenPerSec: 8,
    parryWindowSeconds: 0.16
  },
  defense: {
    stance: 'defense',
    label: 'DEFENSE',
    shortLabel: 'DEF',
    colorHex: '#38bdf8',
    colorNum: 0x38bdf8,
    damageOutMultiplier: 0.88,
    damageInMultiplier: 0.72,
    meterGainMultiplier: 1.0,
    guardShredMultiplier: 0.85,
    guardRegenPerSec: 18,
    parryWindowSeconds: 0.24
  }
};

export function getSkillRankDefinition(tier: SkillRankTier): SkillRankDefinition {
  return SKILL_RANK_TIERS[tier];
}

export function getStanceModifiers(stance: CombatStance): StanceModifiers {
  return STANCE_MODIFIERS[stance];
}

/**
 * Computes a fighter's live in-match Skill Rank tier from their current combo
 * chain and Perfect Parries landed this round.
 *
 * Score = comboHits + parries * 2:
 *  - 0..2  => Blue (RARE)
 *  - 3..5  => Purple (EPIC)
 *  - 6..9  => Red (LEGENDARY)
 *  - 10+   => Golden (MYTHIC)
 */
export function calculateLiveSkillRank(comboHits: number, parries: number): SkillRankDefinition {
  const safeHits = Math.max(0, Math.floor(comboHits));
  const safeParries = Math.max(0, Math.floor(parries));
  const score = safeHits + safeParries * 2;

  if (score >= 10) {
    return SKILL_RANK_TIERS.golden;
  }
  if (score >= 6) {
    return SKILL_RANK_TIERS.red;
  }
  if (score >= 3) {
    return SKILL_RANK_TIERS.purple;
  }

  return SKILL_RANK_TIERS.blue;
}

export interface StrikeResolutionInput {
  attackerStance: CombatStance;
  defenderStance: CombatStance;
  attackerBaseRank: SkillRankTier;
  defenderBaseRank: SkillRankTier;
  attackerLiveRank: SkillRankTier;
  attackKind: AttackKind;
  baseDamage: number;
  maxHealthFraction?: number;
  defenderMaxHp: number;
  blocked: boolean;
  parryActive: boolean;
  defenderGuardHealth: number;
}

export interface StrikeResolutionResult {
  outcome: 'parried' | 'guard-break' | 'blocked' | 'hit';
  damage: number;
  nextGuardHealth: number;
  attackerStunMs: number;
  defenderStunMs: number;
  attackerMeterGain: number;
  defenderMeterGain: number;
}

/**
 * Pure combat resolver incorporating Offensive/Defensive Stances, Skill Rank
 * scaling, timed Perfect Parries, and Guard Shield Break.
 */
export function resolveStrikeExchange(input: StrikeResolutionInput): StrikeResolutionResult {
  const offMod = STANCE_MODIFIERS[input.attackerStance];
  const defMod = STANCE_MODIFIERS[input.defenderStance];
  const atkBaseDef = SKILL_RANK_TIERS[input.attackerBaseRank];
  const defBaseDef = SKILL_RANK_TIERS[input.defenderBaseRank];
  const atkLiveDef = SKILL_RANK_TIERS[input.attackerLiveRank];

  const rawHitDamage =
    input.maxHealthFraction && input.maxHealthFraction > 0
      ? Math.max(1, Math.round(input.defenderMaxHp * input.maxHealthFraction))
      : Math.max(1, input.baseDamage);

  const offenseScale =
    offMod.damageOutMultiplier * (1 + atkBaseDef.powerBonus + atkLiveDef.liveComboDamageBonus);
  const defenseMitigation = defMod.damageInMultiplier * (1 - defBaseDef.powerBonus * 0.4);
  const scaledDamage = Math.max(1, Math.round(rawHitDamage * offenseScale * defenseMitigation));

  if (input.blocked && input.parryActive) {
    return {
      outcome: 'parried',
      damage: 0,
      nextGuardHealth: Math.min(GUARD_MAX, input.defenderGuardHealth + 18),
      attackerStunMs: PARRY_STUN_MS,
      defenderStunMs: 0,
      attackerMeterGain: 0,
      defenderMeterGain: PARRY_METER_REWARD
    };
  }

  if (input.blocked) {
    const baseGuardCost = input.attackKind === 'special' ? 44 : input.attackKind === 'low' ? 28 : 14;
    const defenseResistance = input.defenderStance === 'defense' ? 1.35 : 1;
    const guardDrain = Math.round((baseGuardCost * offMod.guardShredMultiplier) / defenseResistance);
    const nextGuard = Math.max(0, input.defenderGuardHealth - guardDrain);

    if (nextGuard <= 0) {
      return {
        outcome: 'guard-break',
        damage: Math.max(1, Math.round(scaledDamage * 0.45)),
        nextGuardHealth: 0,
        attackerStunMs: 0,
        defenderStunMs: GUARD_BREAK_STUN_MS,
        attackerMeterGain: input.attackKind === 'special' ? 0 : Math.round(14 * offMod.meterGainMultiplier),
        defenderMeterGain: 5
      };
    }

    return {
      outcome: 'blocked',
      damage: 0,
      nextGuardHealth: nextGuard,
      attackerStunMs: 0,
      defenderStunMs: 140,
      attackerMeterGain: input.attackKind === 'special' ? 0 : Math.round(4 * offMod.meterGainMultiplier),
      defenderMeterGain: input.defenderStance === 'defense' ? 7 : 4
    };
  }

  const baseMeterOnHit = input.attackKind === 'special' ? 0 : 12;
  return {
    outcome: 'hit',
    damage: scaledDamage,
    nextGuardHealth: input.defenderGuardHealth,
    attackerStunMs: 0,
    defenderStunMs: 0,
    attackerMeterGain: Math.round(baseMeterOnHit * offMod.meterGainMultiplier * atkLiveDef.meterBonus),
    defenderMeterGain: 7
  };
}

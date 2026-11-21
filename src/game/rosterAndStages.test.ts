import { describe, expect, it } from 'vitest';

import {
  STAGE_DEFINITIONS,
  STAGE_IMAGE_ASSETS,
  TITLE_ARENA_BG_KEY,
  getStageDefinition,
  getStageLayout
} from './stageConfig';
import { FIGHTER_ROSTER_META, MY_FIGHTERS, getFighterMeta } from './myFighters';
import { FIGHTER_CHARACTER_DEFINITIONS } from './hero';
import {
  buildDefaultFighterCombat,
  buildDefaultFighterStats,
  getFighterTraits
} from './fighterConfig';

describe('roster and stage configuration', () => {
  it('registers all 8 panoramic stages plus the title backdrop', () => {
    expect(STAGE_DEFINITIONS).toHaveLength(8);
    expect(STAGE_IMAGE_ASSETS.some((asset) => asset.key === TITLE_ARENA_BG_KEY)).toBe(true);
    expect(getStageDefinition('unknown').id).toBe(STAGE_DEFINITIONS[0].id);

    for (const stage of STAGE_DEFINITIONS) {
      const layout = getStageLayout(stage.id, 1280, 720);
      expect(layout.displayWidth).toBeGreaterThanOrEqual(1280);
      expect(layout.displayHeight).toBe(720);
    }
  });

  it('registers all 14 fighter definitions with roster metadata, stats, and combat tuning', () => {
    expect(FIGHTER_CHARACTER_DEFINITIONS).toHaveLength(14);
    expect(MY_FIGHTERS).toHaveLength(10);

    const stats = buildDefaultFighterStats();
    const combat = buildDefaultFighterCombat();

    for (const character of FIGHTER_CHARACTER_DEFINITIONS) {
      expect(FIGHTER_ROSTER_META[character.id]).toBeDefined();
      expect(getFighterMeta(character.id).id).toBe(character.id);
      expect(stats[character.id]).toBeDefined();
      expect(combat[character.id]).toBeDefined();
    }
  });

  it('wires bespoke special traits for heroes and villains', () => {
    expect(getFighterTraits('gojo').hollowPurpleSpecial).toBe(true);
    expect(getFighterTraits('tanjiro').leapSlashSpecial).toBe(true);
    expect(getFighterTraits('goku').beamSpecial?.color).toBe('blue');
    expect(getFighterTraits('sukuna').domainSlashSpecial?.color).toBe('crimson');
    expect(getFighterTraits('muzan').rushSpecial?.lifestealFraction).toBe(0.4);
    expect(getFighterTraits('madara').meteorSpecial?.damageFraction).toBe(0.78);
    expect(getFighterTraits('frieza').angledOrbSpecial?.color).toBe('fire');
  });

  it('validates skill ranks, stances, perfect parry, and guard break mechanics', async () => {
    const {
      GUARD_BREAK_STUN_MS,
      GUARD_MAX,
      PARRY_STUN_MS,
      SKILL_RANK_TIERS,
      STANCE_MODIFIERS,
      calculateLiveSkillRank,
      resolveStrikeExchange
    } = await import('./combatSystem');

    expect(SKILL_RANK_TIERS.blue.label).toBe('RARE');
    expect(SKILL_RANK_TIERS.purple.label).toBe('EPIC');
    expect(SKILL_RANK_TIERS.red.label).toBe('LEGENDARY');
    expect(SKILL_RANK_TIERS.golden.label).toBe('MYTHIC');
    expect(STANCE_MODIFIERS.offense.damageOutMultiplier).toBeGreaterThan(
      STANCE_MODIFIERS.defense.damageOutMultiplier
    );
    expect(STANCE_MODIFIERS.defense.damageInMultiplier).toBeLessThan(
      STANCE_MODIFIERS.offense.damageInMultiplier
    );

    expect(calculateLiveSkillRank(0, 0).tier).toBe('blue');
    expect(calculateLiveSkillRank(3, 0).tier).toBe('purple');
    expect(calculateLiveSkillRank(2, 2).tier).toBe('red');
    expect(calculateLiveSkillRank(6, 2).tier).toBe('golden');

    for (const meta of Object.values(FIGHTER_ROSTER_META)) {
      expect(SKILL_RANK_TIERS[meta.rank]).toBeDefined();
      expect(meta.offenseSkill.length).toBeGreaterThan(0);
      expect(meta.defenseSkill.length).toBeGreaterThan(0);
    }

    const parry = resolveStrikeExchange({
      attackerStance: 'offense',
      defenderStance: 'defense',
      attackerBaseRank: 'golden',
      defenderBaseRank: 'blue',
      attackerLiveRank: 'blue',
      attackKind: 'low',
      baseDamage: 24,
      defenderMaxHp: 100,
      blocked: true,
      parryActive: true,
      defenderGuardHealth: 50
    });
    expect(parry.outcome).toBe('parried');
    expect(parry.damage).toBe(0);
    expect(parry.attackerStunMs).toBe(PARRY_STUN_MS);

    const guardBreak = resolveStrikeExchange({
      attackerStance: 'offense',
      defenderStance: 'offense',
      attackerBaseRank: 'red',
      defenderBaseRank: 'blue',
      attackerLiveRank: 'red',
      attackKind: 'low',
      baseDamage: 24,
      defenderMaxHp: 100,
      blocked: true,
      parryActive: false,
      defenderGuardHealth: 10
    });
    expect(guardBreak.outcome).toBe('guard-break');
    expect(guardBreak.nextGuardHealth).toBe(0);
    expect(guardBreak.defenderStunMs).toBe(GUARD_BREAK_STUN_MS);
    expect(GUARD_MAX).toBe(100);
  });
});

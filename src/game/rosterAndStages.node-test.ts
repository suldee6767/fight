import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARENA_WORLD_TILES,
  STAGE_DEFINITIONS,
  STAGE_IMAGE_ASSETS,
  TITLE_ARENA_BG_KEY,
  clampStagePanSpeed,
  clampStageScroll,
  getArenaWorldLayout,
  getStageDefinition,
  getStageLayout
} from './stageConfig';
import { FIGHTER_ROSTER_META, MY_FIGHTERS, getFighterMeta } from './myFighters';
import { FIGHTER_CHARACTER_DEFINITIONS } from './hero';
import {
  buildDefaultFighterCombat,
  buildDefaultFighterStats,
  createDefaultFighterPlaygroundState,
  getAttackProfile,
  getFighterCombat,
  getFighterStats,
  getFighterTraits
} from './fighterConfig';

test('stage catalog includes all 8 panoramic stages and title arena backdrop', () => {
  assert.equal(STAGE_DEFINITIONS.length, 8);
  const ids = STAGE_DEFINITIONS.map((stage) => stage.id);
  for (const requiredId of [
    'shibuya-station',
    'infinity-castle',
    'final-valley',
    'cell-arena',
    'hueco-mundo',
    'sakura-shrine',
    'rooftop-twilight',
    'rooftop-sunset'
  ]) {
    assert.ok(ids.includes(requiredId), `Missing stage id ${requiredId}`);
  }

  assert.equal(getStageDefinition('unknown-stage').id, STAGE_DEFINITIONS[0].id);
  assert.ok(STAGE_IMAGE_ASSETS.some((asset) => asset.key === TITLE_ARENA_BG_KEY));

  for (const stage of STAGE_DEFINITIONS) {
    const layout = getStageLayout(stage.id, 1280, 720);
    assert.equal(layout.displayHeight, 720);
    assert.ok(layout.displayWidth >= 1280, `${stage.id} should cover 1280px width`);
    assert.ok(layout.maxScroll >= 0);

    const worldLayout = getArenaWorldLayout(stage.id, 1280, 720);
    assert.equal(ARENA_WORLD_TILES, 5);
    assert.equal(worldLayout.tiles, 5);
    assert.ok(worldLayout.displayWidth >= 1280 * 5, `${stage.id} 5x world should be at least 6400px`);
  }

  assert.equal(clampStageScroll(-20, 200), 0);
  assert.equal(clampStageScroll(500, 200), 200);
  assert.equal(clampStagePanSpeed(5), 20);
});

test('all 15 fighter definitions exist with complete roster metadata, stats, and combat kits', () => {
  assert.equal(FIGHTER_CHARACTER_DEFINITIONS.length, 15);

  const expectedIds = [
    'gojo',
    'tanjiro',
    'naruto',
    'goku',
    'luffy',
    'street-hero',
    'bayasaa',
    'sukuna',
    'muzan',
    'madara',
    'frieza',
    'genghis-khan',
    'red-brawler',
    'jiujitsu-fighter',
    'green-boxer'
  ];

  for (const id of expectedIds) {
    assert.ok(
      FIGHTER_CHARACTER_DEFINITIONS.some((character) => character.id === id),
      `Missing fighter character definition for ${id}`
    );
    assert.ok(FIGHTER_ROSTER_META[id], `Missing roster metadata for ${id}`);
    const meta = getFighterMeta(id);
    assert.equal(meta.id, id);
    assert.ok(meta.specialName.length > 0);
    assert.ok(meta.kitSummary.length > 0);
  }

  assert.equal(MY_FIGHTERS.length, 11);

  const statsMap = buildDefaultFighterStats();
  const combatMap = buildDefaultFighterCombat();
  const state = createDefaultFighterPlaygroundState();

  for (const id of expectedIds) {
    assert.ok(statsMap[id], `Missing default stats for ${id}`);
    assert.ok(combatMap[id], `Missing default combat for ${id}`);
    assert.ok(getFighterStats(state, id).walkSpeed >= 200);
    assert.ok(getFighterCombat(state, id).maxHealth >= 100);
  }
});

test('custom anime fighter kits and special attack traits match design specs', () => {
  const gojo = getFighterTraits('gojo');
  assert.equal(gojo.doubleLightPunch, true);
  assert.equal(gojo.lightCooldownMs, 1000);
  assert.equal(gojo.polarityCycleMs, 4000);
  assert.equal(gojo.hollowPurpleSpecial, true);
  assert.equal(gojo.specialMaxHealthFraction, 0.8);

  const tanjiro = getFighterTraits('tanjiro');
  assert.equal(tanjiro.swordSlashStyle, 'water');
  assert.equal(tanjiro.leapSlashSpecial, true);
  assert.equal(tanjiro.specialMaxHealthFraction, 1.5);

  const streetHero = getFighterTraits('street-hero');
  assert.equal(streetHero.cancelableCombos, true);
  assert.equal(streetHero.blitzSpecial, true);
  assert.equal(streetHero.specialMaxHealthFraction, 0.5);
  assert.equal(streetHero.specialStunMs, 2000);

  const naruto = getFighterTraits('naruto');
  assert.equal(naruto.projectileColor, 'amber');
  assert.equal(naruto.rushSpecial?.color, 'cyan');

  const goku = getFighterTraits('goku');
  assert.equal(goku.projectileColor, 'gold');
  assert.equal(goku.beamSpecial?.color, 'blue');

  const luffy = getFighterTraits('luffy');
  assert.equal(luffy.longReach, true);
  assert.equal(luffy.rushSpecial?.color, 'fire');

  const sukuna = getFighterTraits('sukuna');
  assert.equal(sukuna.swordSlashStyle, 'crimson');
  assert.equal(sukuna.domainSlashSpecial?.color, 'crimson');

  const muzan = getFighterTraits('muzan');
  assert.equal(muzan.longReach, true);
  assert.equal(muzan.rushSpecial?.lifestealFraction, 0.4);

  const madara = getFighterTraits('madara');
  assert.equal(madara.projectileColor, 'fire');
  assert.equal(madara.meteorSpecial?.damageFraction, 0.78);

  const frieza = getFighterTraits('frieza');
  assert.equal(frieza.projectileColor, 'magenta');
  assert.equal(frieza.angledOrbSpecial?.color, 'fire');

  const khan = getFighterTraits('genghis-khan');
  assert.equal(khan.projectileLight?.color, 'arrow');
  assert.equal(khan.cavalryHeavy, true);
  assert.equal(khan.khanHordeSpecial?.damageFraction, 0.78);

  const state = createDefaultFighterPlaygroundState();
  const gokuSpecial = getAttackProfile(getFighterCombat(state, 'goku'), 'special');
  assert.equal(gokuSpecial.kind, 'special');
  assert.ok(gokuSpecial.damage >= 50);
});

import {
  GUARD_BREAK_STUN_MS,
  GUARD_MAX,
  PARRY_METER_REWARD,
  PARRY_STUN_MS,
  SKILL_RANK_TIERS,
  STANCE_MODIFIERS,
  calculateLiveSkillRank,
  resolveStrikeExchange
} from './combatSystem';

test('offensive/defensive stance system, skill ranks, parry, and guard break behave deterministically', () => {
  // Skill Rank tier hierarchy
  assert.equal(SKILL_RANK_TIERS.blue.label, 'RARE');
  assert.equal(SKILL_RANK_TIERS.purple.label, 'EPIC');
  assert.equal(SKILL_RANK_TIERS.red.label, 'LEGENDARY');
  assert.equal(SKILL_RANK_TIERS.golden.label, 'MYTHIC');
  assert.ok(SKILL_RANK_TIERS.golden.powerBonus > SKILL_RANK_TIERS.red.powerBonus);
  assert.ok(SKILL_RANK_TIERS.red.powerBonus > SKILL_RANK_TIERS.purple.powerBonus);
  assert.ok(SKILL_RANK_TIERS.purple.powerBonus > SKILL_RANK_TIERS.blue.powerBonus);

  // Stance tradeoffs
  assert.ok(STANCE_MODIFIERS.offense.damageOutMultiplier > STANCE_MODIFIERS.defense.damageOutMultiplier);
  assert.ok(STANCE_MODIFIERS.defense.damageInMultiplier < STANCE_MODIFIERS.offense.damageInMultiplier);
  assert.ok(STANCE_MODIFIERS.defense.parryWindowSeconds > STANCE_MODIFIERS.offense.parryWindowSeconds);
  assert.ok(STANCE_MODIFIERS.defense.guardRegenPerSec > STANCE_MODIFIERS.offense.guardRegenPerSec);

  // Live combo + parry rank progression
  assert.equal(calculateLiveSkillRank(0, 0).tier, 'blue');
  assert.equal(calculateLiveSkillRank(3, 0).tier, 'purple');
  assert.equal(calculateLiveSkillRank(2, 2).tier, 'red');
  assert.equal(calculateLiveSkillRank(6, 2).tier, 'golden');

  // Every roster fighter has a valid rank and offense/defense skills
  for (const meta of Object.values(FIGHTER_ROSTER_META)) {
    assert.ok(meta.rank in SKILL_RANK_TIERS, `Invalid rank for ${meta.id}`);
    assert.ok(meta.offenseSkill.length > 0, `Missing offenseSkill for ${meta.id}`);
    assert.ok(meta.defenseSkill.length > 0, `Missing defenseSkill for ${meta.id}`);
  }

  // Offense hit vs Defense hit scaling
  const offenseHit = resolveStrikeExchange({
    attackerStance: 'offense',
    defenderStance: 'offense',
    attackerBaseRank: 'golden',
    defenderBaseRank: 'blue',
    attackerLiveRank: 'golden',
    attackKind: 'low',
    baseDamage: 20,
    defenderMaxHp: 100,
    blocked: false,
    parryActive: false,
    defenderGuardHealth: GUARD_MAX
  });
  const defenseHit = resolveStrikeExchange({
    attackerStance: 'defense',
    defenderStance: 'defense',
    attackerBaseRank: 'blue',
    defenderBaseRank: 'golden',
    attackerLiveRank: 'blue',
    attackKind: 'low',
    baseDamage: 20,
    defenderMaxHp: 100,
    blocked: false,
    parryActive: false,
    defenderGuardHealth: GUARD_MAX
  });
  assert.equal(offenseHit.outcome, 'hit');
  assert.equal(defenseHit.outcome, 'hit');
  assert.ok(offenseHit.damage > defenseHit.damage);

  // Perfect Parry negates damage, restores guard, rewards meter, and stuns attacker
  const parry = resolveStrikeExchange({
    attackerStance: 'offense',
    defenderStance: 'defense',
    attackerBaseRank: 'red',
    defenderBaseRank: 'purple',
    attackerLiveRank: 'blue',
    attackKind: 'low',
    baseDamage: 25,
    defenderMaxHp: 100,
    blocked: true,
    parryActive: true,
    defenderGuardHealth: 60
  });
  assert.equal(parry.outcome, 'parried');
  assert.equal(parry.damage, 0);
  assert.equal(parry.attackerStunMs, PARRY_STUN_MS);
  assert.equal(parry.defenderMeterGain, PARRY_METER_REWARD);
  assert.equal(parry.nextGuardHealth, 84);

  // Guard Break shatters shield, applies chip damage and 1100ms stun
  const guardBreak = resolveStrikeExchange({
    attackerStance: 'offense',
    defenderStance: 'offense',
    attackerBaseRank: 'red',
    defenderBaseRank: 'blue',
    attackerLiveRank: 'purple',
    attackKind: 'low',
    baseDamage: 24,
    defenderMaxHp: 100,
    blocked: true,
    parryActive: false,
    defenderGuardHealth: 15
  });
  assert.equal(guardBreak.outcome, 'guard-break');
  assert.equal(guardBreak.nextGuardHealth, 0);
  assert.equal(guardBreak.defenderStunMs, GUARD_BREAK_STUN_MS);
  assert.equal(GUARD_BREAK_STUN_MS, 1100);
  assert.equal(GUARD_MAX, 140);
  assert.ok(guardBreak.damage > 0);

  // Special attacks against a full guard bar cannot 1-shot guard-break
  const blockedSpecial = resolveStrikeExchange({
    attackerStance: 'offense',
    defenderStance: 'offense',
    attackerBaseRank: 'golden',
    defenderBaseRank: 'blue',
    attackerLiveRank: 'golden',
    attackKind: 'special',
    baseDamage: 80,
    defenderMaxHp: 100,
    blocked: true,
    parryActive: false,
    defenderGuardHealth: GUARD_MAX
  });
  assert.equal(blockedSpecial.outcome, 'blocked');
  assert.ok(blockedSpecial.nextGuardHealth > 0);
});

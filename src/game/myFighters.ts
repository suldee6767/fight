/**
 * YOUR FIGHTERS — add one line per fighter.
 *
 *   id    the folder name: public/assets/<id>/   (english, lowercase, no spaces)
 *   name  the name shown in the game
 *   flip  true if your pictures face RIGHT (the game needs fighters facing LEFT)
 *
 * Pictures go in public/assets/<id>/ :
 *   idle  walk  punch  kick  hit  ko        (needed)
 *   jump  crouch  block  special  portrait  (bonus)
 *
 * Full rules: ADD_CHARACTER.md
 */
import type { SkillRankTier } from './combatSystem';
import type { FighterTraits } from './types';

export type FighterFaction = 'hero' | 'villain' | 'challenger';

export interface MyFighter {
  id: string;
  name: string;
  flip?: boolean;
  /** Sheet names whose pose frames appear right-to-left / end-to-start and should be reversed. */
  reverseSheets?: string[];
  /** Only if auto-detect counts the poses wrong: { kick: 4 } */
  frames?: Record<string, number>;
  /** Optional rapid rushdown & special traits. */
  traits?: FighterTraits;
}

export interface FighterRosterMeta {
  id: string;
  faction: FighterFaction;
  series: string;
  rank: SkillRankTier;
  specialName: string;
  kitSummary: string;
  offenseSkill: string;
  defenseSkill: string;
  accentColor: number;
}

export const MY_FIGHTERS: MyFighter[] = [
  {
    id: 'gojo',
    name: 'Gojo',
    traits: {
      actionFrameRates: {
        idle: 6,
        'walk-forward': 9,
        'walk-backward': 9,
        'light-punch': 14,
        'heavy-kick': 10,
        'special-charge': 10,
        special: 10
      },
      doubleLightPunch: true,
      lightCooldownMs: 1000,
      polarityCycleMs: 4000,
      projectileHeavy: true,
      hollowPurpleSpecial: true,
      specialMaxHealthFraction: 0.8
    }
  },
  {
    id: 'tanjiro',
    name: 'Tanjiro',
    traits: {
      actionFrameRates: {
        idle: 6,
        'walk-forward': 10,
        'walk-backward': 10,
        'light-punch': 14,
        'heavy-kick': 16,
        'special-charge': 12,
        special: 12
      },
      swordSlashStyle: 'water',
      leapSlashSpecial: true,
      specialMaxHealthFraction: 1.5
    }
  },
  {
    id: 'naruto',
    name: 'Naruto',
    traits: {
      actionFrameRates: {
        idle: 8,
        'walk-forward': 11,
        'walk-backward': 11,
        'light-punch': 18,
        'heavy-kick': 14,
        'special-charge': 12,
        special: 14
      },
      cancelableCombos: true,
      meterGainMultiplier: 1.25,
      projectileHeavy: true,
      projectileColor: 'amber',
      rushSpecial: { color: 'cyan', damageFraction: 0.68 },
      specialMaxHealthFraction: 0.68
    }
  },
  {
    id: 'goku',
    name: 'Goku',
    traits: {
      actionFrameRates: {
        idle: 8,
        'walk-forward': 12,
        'walk-backward': 12,
        'light-punch': 20,
        'heavy-kick': 14,
        'special-charge': 11,
        special: 12
      },
      cancelableCombos: true,
      meterGainMultiplier: 1.2,
      projectileHeavy: true,
      projectileColor: 'gold',
      beamSpecial: { color: 'blue', damageFraction: 0.72 },
      specialMaxHealthFraction: 0.72
    }
  },
  {
    id: 'luffy',
    name: 'Luffy',
    traits: {
      actionFrameRates: {
        idle: 8,
        'walk-forward': 11,
        'walk-backward': 11,
        'light-punch': 18,
        'heavy-kick': 15,
        'special-charge': 12,
        special: 14
      },
      longReach: true,
      cancelableCombos: true,
      meterGainMultiplier: 1.35,
      rushSpecial: { color: 'fire', damageFraction: 0.7 },
      specialMaxHealthFraction: 0.7
    }
  },
  {
    id: 'street-hero',
    name: 'Street Hero',
    traits: {
      actionFrameRates: {
        idle: 10,
        'walk-forward': 12,
        'walk-backward': 12,
        'hit-high': 14,
        'light-punch': 26,
        'heavy-kick': 22,
        'special-charge': 14,
        special: 16
      },
      cancelableCombos: true,
      meterGainMultiplier: 2.2,
      blitzSpecial: true,
      specialMaxHealthFraction: 0.5,
      specialStunMs: 2000
    }
  },
  {
    id: 'sukuna',
    name: 'Sukuna',
    traits: {
      actionFrameRates: {
        idle: 7,
        'walk-forward': 10,
        'walk-backward': 10,
        'light-punch': 17,
        'heavy-kick': 14,
        'special-charge': 10,
        special: 12
      },
      swordSlashStyle: 'crimson',
      projectileHeavy: true,
      projectileColor: 'crimson',
      domainSlashSpecial: { color: 'crimson', damageFraction: 0.76 },
      specialMaxHealthFraction: 0.76
    }
  },
  {
    id: 'muzan',
    name: 'Muzan',
    traits: {
      actionFrameRates: {
        idle: 7,
        'walk-forward': 10,
        'walk-backward': 10,
        'light-punch': 17,
        'heavy-kick': 15,
        'special-charge': 11,
        special: 13
      },
      longReach: true,
      swordSlashStyle: 'crimson',
      rushSpecial: { color: 'crimson', damageFraction: 0.65, lifestealFraction: 0.4 },
      specialMaxHealthFraction: 0.65
    }
  },
  {
    id: 'madara',
    name: 'Madara',
    traits: {
      actionFrameRates: {
        idle: 7,
        'walk-forward': 10,
        'walk-backward': 10,
        'light-punch': 16,
        'heavy-kick': 14,
        'special-charge': 10,
        special: 12
      },
      projectileHeavy: true,
      projectileColor: 'fire',
      meteorSpecial: { damageFraction: 0.78 },
      specialMaxHealthFraction: 0.78
    }
  },
  {
    id: 'frieza',
    name: 'Frieza',
    traits: {
      actionFrameRates: {
        idle: 8,
        'walk-forward': 12,
        'walk-backward': 12,
        'light-punch': 18,
        'heavy-kick': 15,
        'special-charge': 11,
        special: 12
      },
      projectileHeavy: true,
      projectileColor: 'magenta',
      angledOrbSpecial: { color: 'fire', damageFraction: 0.76 },
      specialMaxHealthFraction: 0.76
    }
  },
  {
    id: 'genghis-khan',
    name: 'Genghis Khan',
    flip: true,
    frames: {
      idle: 3,
      walk: 4,
      punch: 3,
      kick: 3,
      hit: 3,
      ko: 3,
      special: 3
    },
    traits: {
      actionFrameRates: {
        idle: 6,
        'walk-forward': 10,
        'walk-backward': 10,
        'light-punch': 16,
        'heavy-kick': 12,
        'special-charge': 10,
        special: 12
      },
      projectileLight: { color: 'arrow' },
      cavalryHeavy: true,
      khanHordeSpecial: { damageFraction: 0.78 },
      specialMaxHealthFraction: 0.78
    }
  }
];

export const FIGHTER_ROSTER_META: Record<string, FighterRosterMeta> = {
  gojo: {
    id: 'gojo',
    faction: 'hero',
    series: 'Sorcerer',
    rank: 'golden',
    specialName: 'Hollow Purple',
    kitSummary: '4s Red/Blue orbs · 80% Prison Realm KO',
    offenseSkill: 'Limitless Surge (+25% dmg & guard shred)',
    defenseSkill: 'Infinity Barrier (240ms Parry + Shield)',
    accentColor: 0xa855f7
  },
  tanjiro: {
    id: 'tanjiro',
    faction: 'hero',
    series: 'Slayer',
    rank: 'red',
    specialName: 'Hinokami Kagura',
    kitSummary: 'Water blade combos · 150% Lethal Leap',
    offenseSkill: 'Sun Breathing (High slash guard break)',
    defenseSkill: 'Water Wheel (Fast parry counter)',
    accentColor: 0x38bdf8
  },
  naruto: {
    id: 'naruto',
    faction: 'hero',
    series: 'Shinobi',
    rank: 'red',
    specialName: 'Spiraling Rasengan',
    kitSummary: 'Cancelable combos · Chakra Orb + Dash',
    offenseSkill: 'Kurama Cloak (Rapid rushdown meter)',
    defenseSkill: 'Chakra Guard (Quick shield recovery)',
    accentColor: 0xf97316
  },
  goku: {
    id: 'goku',
    faction: 'hero',
    series: 'Saiyan',
    rank: 'golden',
    specialName: 'Kamehameha',
    kitSummary: 'Ki blasts · Full-screen piercing beam',
    offenseSkill: 'Super Saiyan Burst (25% Strike Amp)',
    defenseSkill: 'Ultra Instinct (Extended parry window)',
    accentColor: 0xfacc15
  },
  luffy: {
    id: 'luffy',
    faction: 'hero',
    series: 'Pirate',
    rank: 'purple',
    specialName: 'Gomu Red Hawk',
    kitSummary: 'Long rubber reach · Blazing fist rush',
    offenseSkill: 'Gear Rush (Long-reach guard shred)',
    defenseSkill: 'Rubber Cushion (-28% dmg taken)',
    accentColor: 0xef4444
  },
  'street-hero': {
    id: 'street-hero',
    faction: 'hero',
    series: 'Brawler',
    rank: 'purple',
    specialName: 'Volt Combo Blitz',
    kitSummary: '2.2x meter · 50% HP + 2s electric stun',
    offenseSkill: 'Overdrive Blitz (Hyper meter rush)',
    defenseSkill: 'Street Counter (Snap parry punish)',
    accentColor: 0x3b82f6
  },
  bayasaa: {
    id: 'bayasaa',
    faction: 'challenger',
    series: 'Champion',
    rank: 'blue',
    specialName: 'Apex Barrage',
    kitSummary: 'Heavy high-health kickboxer',
    offenseSkill: 'Heavy Clinch (Guard-crushing kicks)',
    defenseSkill: 'Iron Shell (110 HP + high guard)',
    accentColor: 0xf59e0b
  },
  sukuna: {
    id: 'sukuna',
    faction: 'villain',
    series: 'Cursed King',
    rank: 'golden',
    specialName: 'Malevolent Shrine',
    kitSummary: 'Dismantle slash orbs · Domain cleave',
    offenseSkill: 'Cleave Pressure (45% extra guard shred)',
    defenseSkill: 'Hollow Wicker (240ms cursed parry)',
    accentColor: 0xe11d48
  },
  muzan: {
    id: 'muzan',
    faction: 'villain',
    series: 'Demon Lord',
    rank: 'red',
    specialName: 'Black Blood Storm',
    kitSummary: 'Long whip reach · 40% Lifesteal drain',
    offenseSkill: 'Demon Whips (Wide range pressure)',
    defenseSkill: 'Flesh Regen (Parry + shield regen)',
    accentColor: 0xbe123c
  },
  madara: {
    id: 'madara',
    faction: 'villain',
    series: 'Uchiha',
    rank: 'red',
    specialName: 'Tengai Shinsei',
    kitSummary: 'Majestic flame orb · Sky meteor drop',
    offenseSkill: 'Susanoo Might (Heavy flame shatter)',
    defenseSkill: 'Uchiha Reflection (Timed parry stun)',
    accentColor: 0x9333ea
  },
  frieza: {
    id: 'frieza',
    faction: 'villain',
    series: 'Emperor',
    rank: 'purple',
    specialName: 'Supernova',
    kitSummary: 'Piercing Death Beam · Planet buster orb',
    offenseSkill: 'Death Barrage (Fast ranged pressure)',
    defenseSkill: 'Golden Guard (-28% dmg mitigation)',
    accentColor: 0xd946ef
  },
  'genghis-khan': {
    id: 'genghis-khan',
    faction: 'villain',
    series: 'Great Khan',
    rank: 'golden',
    specialName: 'Sky Volley & 100-Row Horde',
    kitSummary: 'Bow arrows · 5x10 Mini Cavalry · 100-Row Sky Volley',
    offenseSkill: 'Mongol Conquest (5x10 Cavalry & Sky Volley)',
    defenseSkill: 'Steppe Guard (240ms Parry + Arrow Volley)',
    accentColor: 0xd97706
  },
  'red-brawler': {
    id: 'red-brawler',
    faction: 'challenger',
    series: 'Arcade',
    rank: 'blue',
    specialName: 'Crimson Rush',
    kitSummary: 'Classic balanced street martial artist',
    offenseSkill: 'Crimson Knuckle (Balanced offense)',
    defenseSkill: 'Arcade Parry (Reliable guard & counter)',
    accentColor: 0xf43f5e
  },
  'jiujitsu-fighter': {
    id: 'jiujitsu-fighter',
    faction: 'challenger',
    series: 'Grappler',
    rank: 'blue',
    specialName: 'Iron Lock',
    kitSummary: '110 HP · High knockback & stun',
    offenseSkill: 'Submission Break (Heavy stun blows)',
    defenseSkill: 'Mat Defense (Fast shield recovery)',
    accentColor: 0x10b981
  },
  'green-boxer': {
    id: 'green-boxer',
    faction: 'challenger',
    series: 'Boxer',
    rank: 'blue',
    specialName: 'Southpaw Flurry',
    kitSummary: 'Fast jab & heavy counter boxer',
    offenseSkill: 'Counter Hook (Sharp jab pressure)',
    defenseSkill: 'Peek-a-Boo (Tight guard & parry)',
    accentColor: 0x22c55e
  }
};

export function getFighterMeta(characterId: string): FighterRosterMeta {
  return (
    FIGHTER_ROSTER_META[characterId] ?? {
      id: characterId,
      faction: 'challenger',
      series: 'Fighter',
      rank: 'blue',
      specialName: 'Overdrive',
      kitSummary: 'Balanced melee combatant',
      offenseSkill: 'Assault Stance (+25% dmg)',
      defenseSkill: 'Guard Stance (-28% dmg taken)',
      accentColor: 0x38bdf8
    }
  );
}

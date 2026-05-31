import { ModuleId, HackId, UpgradeId, UpgradeEntry, TriggerId } from '../types'

import atmosphericScoopImg from '../images/modules/atmospheric_scoop.png'
import ramjetImg from '../images/modules/ramjet.png'
import gravityStabilizerImg from '../images/modules/gravity_stabilizer.png'
import blackBoxImg from '../images/modules/black_box.png'
import windShieldImg from '../images/modules/wind_shield.png'
import magnetoScrapperImg from '../images/modules/magneto_scrapper.png'
import {
  ATMOSPHERIC_SCOOP_DURATION,
  ATMOSPHERIC_SCOOP_MULTIPLIER,
  ATMOSPHERIC_SCOOP_V2_DURATION,
  ATMOSPHERIC_SCOOP_V2_MULTIPLIER,
  RAMJET_SHIELD_ADD,
  RAMJET_SHIELD_DURATION,
  RAMJET_V2_SHIELD_ADD,
  RAMJET_V2_SHIELD_DURATION,
  GRAVITY_STABILIZER_BONUS_DATA,
  GRAVITY_STABILIZER_V2_BONUS_DATA,
  BLACK_BOX_BONUS_DATA,
  BLACK_BOX_V2_BONUS_DATA,
  MAGNETO_SCRAPPER_RANGE_ADD,
  MAGNETO_SCRAPPER_V2_RANGE_ADD
} from './moduleConstants'

export const UPGRADE_REGISTRY: Record<UpgradeId, UpgradeEntry> = {
  [ModuleId.ATMOSPHERIC_SCOOP]: {
    id: ModuleId.ATMOSPHERIC_SCOOP,
    name: 'Atmospheric scoop',
    short: 'AS',
    type: 'module',
    cost: 3,
    color: 'var(--glow-cyan)',
    desc: `Increases data collection rate by ${ATMOSPHERIC_SCOOP_MULTIPLIER.toFixed(0)}x for ${ATMOSPHERIC_SCOOP_DURATION.toFixed(0)} seconds.`,
    blurb: "Sucking up atmospheric particles at terminal velocity. Don't inhale the space dust!",
    triggerId: TriggerId.LEAVE_ATMOSPHERE,
    image: atmosphericScoopImg
  },
  [ModuleId.RAMJET]: {
    id: ModuleId.RAMJET,
    name: 'Ramjet',
    short: 'RJ',
    type: 'module',
    cost: 4,
    color: 'var(--glow-green)',
    desc: `Generates +${RAMJET_SHIELD_ADD} shield level and adds +${RAMJET_SHIELD_DURATION}s shield duration upon collecting a beacon.`,
    blurb: "A solid magnetic layer of dynamic plasma shielding.",
    triggerId: TriggerId.HIT_BEACON,
    image: ramjetImg
  },
  [ModuleId.GRAVITY_STABILIZER]: {
    id: ModuleId.GRAVITY_STABILIZER,
    name: 'Gravity stabilizer',
    short: 'GS',
    type: 'module',
    cost: 3,
    color: 'var(--glow-orange)',
    desc: `Generates ${GRAVITY_STABILIZER_BONUS_DATA} bonus data.`,
    blurb: "When you hit rock bottom, bounce back with a stack of sweet, sweet numbers.",
    triggerId: TriggerId.PLANET_BOUNCE,
    image: gravityStabilizerImg
  },
  [ModuleId.BLACK_BOX]: {
    id: ModuleId.BLACK_BOX,
    name: 'Black box',
    short: 'BB',
    type: 'module',
    cost: 5,
    color: '#ff4757',
    desc: `Instantly recovers ${BLACK_BOX_BONUS_DATA} data.`,
    blurb: "Sure, your probe exploded, but the telemetry logs are absolutely gorgeous.",
    triggerId: TriggerId.PROBE_DEATH_BY_COLLISION,
    image: blackBoxImg
  },
  [ModuleId.BAROSPHERE_SIEVE]: {
    id: ModuleId.BAROSPHERE_SIEVE,
    name: 'Barosphere Sieve',
    short: 'BS',
    type: 'module',
    cost: 4,
    color: '#2ed573',
    desc: 'Awards 25% of the sector data quota on escape from a gas planet.',
    blurb: "Designed to sift valuable helium-3 and other light isotopes from high-altitude atmospheres.",
    triggerId: TriggerId.ESCAPE_GAS_PLANET,
    image: windShieldImg
  },
  [ModuleId.MAGNETO_SCRAPPER]: {
    id: ModuleId.MAGNETO_SCRAPPER,
    name: 'Magneto Scrapper',
    short: 'MS',
    type: 'module',
    cost: 3,
    color: '#a0a0ff',
    desc: `Increases probe's magnet collection range by +${MAGNETO_SCRAPPER_RANGE_ADD.toFixed(1)}.`,
    blurb: "A gigantic electromagnet duct-taped to the front hull. What could go wrong?",
    triggerId: TriggerId.HIT_BEACON,
    image: magnetoScrapperImg
  },
  [ModuleId.AUTO_TURRET]: {
    id: ModuleId.AUTO_TURRET,
    name: 'Auto Turret',
    short: 'AT',
    type: 'module',
    cost: 3,
    color: '#ff9800',
    desc: 'Every 3 seconds, fire a homing rocket at the nearest asteroid dealing 2 damage.',
    blurb: 'Heat-seeking telemetry missile clusters locked onto target debris.',
    triggerId: TriggerId.EVERY_3_SECONDS,
    image: gravityStabilizerImg
  },
  [HackId.DEEP_SPACE_SENSOR]: {
    id: HackId.DEEP_SPACE_SENSOR,
    name: 'Deep Space Sensor',
    short: '☉',
    type: 'hack',
    cost: 4,
    color: 'var(--glow-cyan)',
    desc: 'Doubles the rate of data generation over time.',
    blurb: "Like wearing high-prescription reading glasses, but for the entire sector."
  },
  [HackId.DEATH_RATTLE_LOOP]: {
    id: HackId.DEATH_RATTLE_LOOP,
    name: 'Death-Rattle Loop',
    short: '☠',
    type: 'hack',
    cost: 5,
    color: '#ff3333',
    desc: 'On probe death, triggers all active death-triggered modules an extra time.',
    blurb: "Makes the ultimate catastrophic failure extremely productive."
  },
  [HackId.OVERCLOCKED_OSCILLATOR]: {
    id: HackId.OVERCLOCKED_OSCILLATOR,
    name: 'Overclocked Oscillator',
    short: '⚡',
    type: 'hack',
    cost: 6,
    color: '#ffea00',
    desc: 'Every 1 second of flight, triggers a random equipped module.',
    blurb: "Chaos in a bottle. Keep away from flammable materials."
  },
  [HackId.METRONOME_MALFUNCTION]: {
    id: HackId.METRONOME_MALFUNCTION,
    name: 'Metronome Malfunction',
    short: '⏱',
    type: 'hack',
    cost: 4,
    color: '#00ff66',
    desc: 'Every 3 seconds of flight, triggers the module in Slot #3.',
    blurb: "Tick, tock, tick, BOOM. Highly predictable instability."
  },
  [HackId.EJECTION_ROUTE_6]: {
    id: HackId.EJECTION_ROUTE_6,
    name: 'Ejection Route #6',
    short: '➏',
    type: 'hack',
    cost: 5,
    color: '#ff00ff',
    desc: 'On probe death, triggers the module in Slot #6 three times.',
    blurb: "The ultimate backup plan, wired directly to the ejection seat."
  },
  [HackId.SHORT_CIRCUIT]: {
    id: HackId.SHORT_CIRCUIT,
    name: 'Short-Circuit',
    short: '↯',
    type: 'hack',
    cost: 4,
    color: '#00ffff',
    desc: 'On beacon collection, grants a 5% chance to trigger a random module.',
    blurb: "A spark here, a spark there, and suddenly the engines are roaring."
  },
  [HackId.WIND_SHIELD]: {
    id: HackId.WIND_SHIELD,
    name: 'Wind Shield',
    short: '🛡',
    type: 'hack',
    cost: 4,
    color: '#2ed573',
    desc: 'Passively reduces gas giant core drag by 98% (101% for 2+ stacks, granting a thrust boost).',
    blurb: "Designed to take a beating from heavy helium winds. Smells slightly like old balloons."
  },
  [ModuleId.ATMOSPHERIC_SCOOP_V2]: {
    id: ModuleId.ATMOSPHERIC_SCOOP_V2,
    name: 'Atmospheric scoop v2',
    short: 'AS²',
    type: 'module',
    cost: 6,
    color: 'var(--glow-cyan)',
    desc: `Increases data collection rate by ${ATMOSPHERIC_SCOOP_V2_MULTIPLIER.toFixed(0)}x for ${ATMOSPHERIC_SCOOP_V2_DURATION.toFixed(0)} seconds.`,
    blurb: "Dual-inflow ion scoops. Don't inhale the solar storm!",
    triggerId: TriggerId.LEAVE_ATMOSPHERE,
    image: atmosphericScoopImg
  },
  [ModuleId.RAMJET_V2]: {
    id: ModuleId.RAMJET_V2,
    name: 'Ramjet v2',
    short: 'RJ²',
    type: 'module',
    cost: 8,
    color: 'var(--glow-green)',
    desc: `Generates +${RAMJET_V2_SHIELD_ADD} shield level and adds +${RAMJET_V2_SHIELD_DURATION}s shield duration upon collecting a beacon.`,
    blurb: "Hyper-compressed scram-plasma shielding manifold. Double protection!",
    triggerId: TriggerId.HIT_BEACON,
    image: ramjetImg
  },
  [ModuleId.GRAVITY_STABILIZER_V2]: {
    id: ModuleId.GRAVITY_STABILIZER_V2,
    name: 'Gravity stabilizer v2',
    short: 'GS²',
    type: 'module',
    cost: 6,
    color: 'var(--glow-orange)',
    desc: `Generates ${GRAVITY_STABILIZER_V2_BONUS_DATA} bonus data.`,
    blurb: "High-yield deflection buffers. Bouncing off planets has never been this profitable.",
    triggerId: TriggerId.PLANET_BOUNCE,
    image: gravityStabilizerImg
  },
  [ModuleId.BLACK_BOX_V2]: {
    id: ModuleId.BLACK_BOX_V2,
    name: 'Black box v2',
    short: 'BB²',
    type: 'module',
    cost: 10,
    color: '#ff4757',
    desc: `Instantly recovers ${BLACK_BOX_V2_BONUS_DATA} data.`,
    blurb: "Quantum-encrypted recovery archives. Beautiful data from a beautiful wreck.",
    triggerId: TriggerId.PROBE_DEATH_BY_COLLISION,
    image: blackBoxImg
  },
  [ModuleId.BAROSPHERE_SIEVE_V2]: {
    id: ModuleId.BAROSPHERE_SIEVE_V2,
    name: 'Barosphere Sieve v2',
    short: 'BS²',
    type: 'module',
    cost: 8,
    color: '#2ed573',
    desc: 'Awards 50% of the sector data quota on escape from a gas planet.',
    blurb: "Advanced isotope extraction manifolds. Sifts gas giant atmospheres like a hot knife through butter.",
    triggerId: TriggerId.ESCAPE_GAS_PLANET,
    image: windShieldImg
  },
  [ModuleId.MAGNETO_SCRAPPER_V2]: {
    id: ModuleId.MAGNETO_SCRAPPER_V2,
    name: 'Magneto Scrapper v2',
    short: 'MS²',
    type: 'module',
    cost: 6,
    color: '#a0a0ff',
    desc: `Increases probe's magnet collection range by +${MAGNETO_SCRAPPER_V2_RANGE_ADD.toFixed(1)}.`,
    blurb: "Superconducting electromagnet rigs. Draws in metallic beacons from across the orbit.",
    triggerId: TriggerId.HIT_BEACON,
    image: magnetoScrapperImg
  },
  [ModuleId.AUTO_TURRET_V2]: {
    id: ModuleId.AUTO_TURRET_V2,
    name: 'Auto Turret v2',
    short: 'AT²',
    type: 'module',
    cost: 6,
    color: '#ff5500',
    desc: 'Every 2 seconds, fire a homing rocket at the nearest asteroid dealing 3 damage.',
    blurb: 'Supercharged micro-rocket launcher firing high-yield plasma charges.',
    triggerId: TriggerId.EVERY_2_SECONDS,
    image: gravityStabilizerImg
  }
}

export const UPGRADE_MAPPING: Record<ModuleId, ModuleId> = {
  [ModuleId.ATMOSPHERIC_SCOOP]: ModuleId.ATMOSPHERIC_SCOOP_V2,
  [ModuleId.ATMOSPHERIC_SCOOP_V2]: ModuleId.ATMOSPHERIC_SCOOP_V2,
  [ModuleId.RAMJET]: ModuleId.RAMJET_V2,
  [ModuleId.RAMJET_V2]: ModuleId.RAMJET_V2,
  [ModuleId.GRAVITY_STABILIZER]: ModuleId.GRAVITY_STABILIZER_V2,
  [ModuleId.GRAVITY_STABILIZER_V2]: ModuleId.GRAVITY_STABILIZER_V2,
  [ModuleId.BLACK_BOX]: ModuleId.BLACK_BOX_V2,
  [ModuleId.BLACK_BOX_V2]: ModuleId.BLACK_BOX_V2,
  [ModuleId.BAROSPHERE_SIEVE]: ModuleId.BAROSPHERE_SIEVE_V2,
  [ModuleId.BAROSPHERE_SIEVE_V2]: ModuleId.BAROSPHERE_SIEVE_V2,
  [ModuleId.MAGNETO_SCRAPPER]: ModuleId.MAGNETO_SCRAPPER_V2,
  [ModuleId.MAGNETO_SCRAPPER_V2]: ModuleId.MAGNETO_SCRAPPER_V2,
  [ModuleId.AUTO_TURRET]: ModuleId.AUTO_TURRET_V2,
  [ModuleId.AUTO_TURRET_V2]: ModuleId.AUTO_TURRET_V2,
}

export const ALL_UPGRADES = Object.values(UPGRADE_REGISTRY)
export const MODULES_REGISTRY = ALL_UPGRADES.filter(u => u.type === 'module' && !u.id.endsWith('_V2'))
export const HACKS_REGISTRY = ALL_UPGRADES.filter(u => u.type === 'hack')


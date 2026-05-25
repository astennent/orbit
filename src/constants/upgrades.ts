import { ModuleId, HackId, UpgradeId, UpgradeEntry, TriggerId } from '../types'

export const UPGRADE_REGISTRY: Record<UpgradeId, UpgradeEntry> = {
  [ModuleId.ATMOSPHERIC_SCOOP]: {
    id: ModuleId.ATMOSPHERIC_SCOOP,
    name: 'Atmospheric scoop',
    short: 'AS',
    type: 'module',
    cost: 3,
    color: 'var(--glow-cyan)',
    desc: "Increases data collection rate by 10x for 3 seconds.",
    triggerId: TriggerId.LEAVE_ATMOSPHERE
  },
  [ModuleId.RAMJET]: {
    id: ModuleId.RAMJET,
    name: 'Ramjet',
    short: 'RJ',
    type: 'module',
    cost: 4,
    color: 'var(--glow-green)',
    desc: "Boosts speed by 10% and restores 1 hull integrity.",
    triggerId: TriggerId.HIT_BEACON
  },
  [ModuleId.GRAVITY_STABILIZER]: {
    id: ModuleId.GRAVITY_STABILIZER,
    name: 'Gravity stabilizer',
    short: 'GS',
    type: 'module',
    cost: 3,
    color: 'var(--glow-orange)',
    desc: "Generates 100 bonus data.",
    triggerId: TriggerId.PLANET_BOUNCE
  },
  [ModuleId.BLACK_BOX]: {
    id: ModuleId.BLACK_BOX,
    name: 'Black box',
    short: 'BB',
    type: 'module',
    cost: 5,
    color: '#ff4757',
    desc: "Instantly recovers 300 data.",
    triggerId: TriggerId.PROBE_DEATH
  },
  [ModuleId.WIND_SHIELD]: {
    id: ModuleId.WIND_SHIELD,
    name: 'Wind Shield',
    short: 'WS',
    type: 'module',
    cost: 4,
    color: '#2ed573',
    desc: "Restores 10 hull integrity (active on gas giant planets).",
    triggerId: TriggerId.ENTER_GAS_PLANET
  },
  // TODO: Beacon extrapolator: Grants +1 data for each beacon collected this turn, triggered on hit_beacon
  // TODO: Asteroid extrapolator: Grants +1 data for each asteroid hit this entire run, triggered on hit_asteroid
  // TODO: Autoturret: Fires a rocket at the nearest asteroid every 1 second
  // TODO: Deep space plunger: When going out of bounds, fires a mini drone with 1 hp and 6 seconds of battery backward directly toward each planet.
  // TODO: Magneto scapper: Grants +1 magnet, triggered on hit_beacon
  [HackId.LUCKY_CHARM]: {
    id: HackId.LUCKY_CHARM,
    name: 'Lucky Charm',
    short: '★',
    type: 'hack',
    cost: 2,
    color: 'var(--gold-shiny)',
    desc: 'Grants +1 bonus Data Core on win.'
  },
  [HackId.DEEP_SPACE_SENSOR]: {
    id: HackId.DEEP_SPACE_SENSOR,
    name: 'Deep Space Sensor',
    short: '☉',
    type: 'hack',
    cost: 4,
    color: 'var(--glow-cyan)',
    desc: 'Doubles the rate of data generation over time.'
  }
  // TODO The Death-Rattle Loop: On probe death, trigger all 'on probe death' items again
  // TODO Overclocked Oscillator: Every second, force-trigger a random module
  // TODO Metronome Malfunction: Every 3 seconds: Trigger the module in Slot #3"
  // TODO Ejection Route #6: On probe death, trigger the module in Slot #6 three times
  // TODO Short-Circuit: On beacon collection, 5% chance to trigger 
}

export const ALL_UPGRADES = Object.values(UPGRADE_REGISTRY)
export const MODULES_REGISTRY = ALL_UPGRADES.filter(u => u.type === 'module')
export const HACKS_REGISTRY = ALL_UPGRADES.filter(u => u.type === 'hack')


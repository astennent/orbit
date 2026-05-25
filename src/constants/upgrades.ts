import { ModuleId, HackId, UpgradeId, UpgradeEntry, TriggerId } from '../types'

import atmosphericScoopImg from '../images/modules/atmospheric_scoop.png'
import ramjetImg from '../images/modules/ramjet.png'
import gravityStabilizerImg from '../images/modules/gravity_stabilizer.png'
import blackBoxImg from '../images/modules/black_box.png'
import windShieldImg from '../images/modules/wind_shield.png'
import magnetoScrapperImg from '../images/modules/magneto_scrapper.png'

export const UPGRADE_REGISTRY: Record<UpgradeId, UpgradeEntry> = {
  [ModuleId.ATMOSPHERIC_SCOOP]: {
    id: ModuleId.ATMOSPHERIC_SCOOP,
    name: 'Atmospheric scoop',
    short: 'AS',
    type: 'module',
    cost: 3,
    color: 'var(--glow-cyan)',
    desc: "Increases data collection rate by 10x for 3 seconds.",
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
    desc: "Boosts speed by 10% and restores 1 hull integrity.",
    blurb: "Fuel is for cowards. True pilots fly on collision-boosts!",
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
    desc: "Generates 100 bonus data.",
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
    desc: "Instantly recovers 300 data.",
    blurb: "Sure, your probe exploded, but the telemetry logs are absolutely gorgeous.",
    triggerId: TriggerId.PROBE_DEATH_BY_COLLISION,
    image: blackBoxImg
  },
  [ModuleId.WIND_SHIELD]: {
    id: ModuleId.WIND_SHIELD,
    name: 'Wind Shield',
    short: 'WS',
    type: 'module',
    cost: 4,
    color: '#2ed573',
    desc: "Restores 10 hull integrity (active on gas giant planets).",
    blurb: "Designed to take a beating from heavy helium winds. Smells slightly like old balloons.",
    triggerId: TriggerId.ENTER_GAS_PLANET,
    image: windShieldImg
  },
  [ModuleId.MAGNETO_SCRAPPER]: {
    id: ModuleId.MAGNETO_SCRAPPER,
    name: 'Magneto Scrapper',
    short: 'MS',
    type: 'module',
    cost: 3,
    color: '#a0a0ff',
    desc: "Increases probe's magnet collection range by +1.0.",
    blurb: "A gigantic electromagnet duct-taped to the front hull. What could go wrong?",
    triggerId: TriggerId.HIT_BEACON,
    image: magnetoScrapperImg
  },
  // TODO: Beacon extrapolator: Grants +1 data for each beacon collected this turn, triggered on hit_beacon
  // TODO: Asteroid extrapolator: Grants +1 data for each asteroid hit this entire run, triggered on hit_asteroid
  // TODO: Autoturret: Fires a rocket at the nearest asteroid every 1 second
  // TODO: Deep space plunger: When going out of bounds, fires a mini drone with 1 hp and 6 seconds of battery backward directly toward each planet.
  [HackId.LUCKY_CHARM]: {
    id: HackId.LUCKY_CHARM,
    name: 'Lucky Charm',
    short: '★',
    type: 'hack',
    cost: 2,
    color: 'var(--gold-shiny)',
    desc: 'Grants +1 bonus Data Core on win.',
    blurb: "A fuzzy green dice dangling inside the control deck. 100% scientifically proven."
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


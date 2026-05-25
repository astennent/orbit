import * as THREE from 'three'

// High‑level game flow state
export enum GameStatus {
  IDLE = 'IDLE',
  LAUNCHING = 'LAUNCHING',
  COMPLETED = 'COMPLETED', // level finished (win or loss)
  SHOP = 'SHOP', // shop modal visible
}

export interface Planet {
  id: string;
  name: string;
  pos: THREE.Vector3;
  radius: number;
  mass: number;
  color: string;
  atmosphereRadius: number;
  isGasGiant?: boolean;
}

export interface LevelData {
  planet: Planet;
  // future: hazards, asteroids, etc.
}

export interface GameLoopState {
  level: number;          // current level (starts at 1)
  dataCores: number;      // accumulated Data Cores
  status: GameStatus;     // current high‑level status
  isShopOpen: boolean;    // UI flag for shop modal
  currentLevelData: LevelData;
}

export type GameState =
  | 'IDLE'         // Before launch, aiming trajectory visible
  | 'LAUNCHING'    // Holding down, dragging the launcher
  | 'FLIGHT'       // Probe is moving, hands-off physics running
  | 'STOPPED'      // Probe came to a stop below quota (Game Over / Loss)
  | 'CRASHED'      // Probe hit a planet (Game Over / Loss)
  | 'WIN'          // Probe came to a stop above quota (Win / Data Core mint)
  | 'PORTAL_EXIT'; // Probe hit the exit portal (Win / Data Core bonus)

export interface Probe {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  data: number;
  trail: THREE.Vector3[];
  integrity: number;
  maxIntegrity: number;
  magnetRadius: number;
  scoopActiveTimer?: number;
}

export interface Planet {
  id: string;
  name: string;
  pos: THREE.Vector3;
  radius: number;
  mass: number;
  color: string;
  atmosphereRadius: number; // Ring in which gravity/drag applies
  isGasGiant?: boolean;
}

export interface ExitPortal {
  pos: THREE.Vector3;
  radius: number;
}

export interface Beacon {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  value: number;
  collected: boolean;
}

export interface DataToast {
  id: string;
  text: string;
  pos: THREE.Vector3;
  color?: string;
}

export interface Asteroid {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  type: 'ice' | 'carbon' | 'metallic';
  size: 'small' | 'medium' | 'large';
  health: number;
  maxHealth: number;
}

export enum ModuleId {
  ATMOSPHERIC_SCOOP = 'ATMOSPHERIC_SCOOP',
  RAMJET = 'RAMJET',
  GRAVITY_STABILIZER = 'GRAVITY_STABILIZER',
  BLACK_BOX = 'BLACK_BOX',
  WIND_SHIELD = 'WIND_SHIELD',
  MAGNETO_SCRAPPER = 'MAGNETO_SCRAPPER',
}

export enum HackId {
  LUCKY_CHARM = 'LUCKY_CHARM',
  DEEP_SPACE_SENSOR = 'DEEP_SPACE_SENSOR',
}

export type UpgradeId = ModuleId | HackId;

export enum TriggerId {
  ENTER_ATMOSPHERE = 'ENTER_ATMOSPHERE',
  LEAVE_ATMOSPHERE = 'LEAVE_ATMOSPHERE',
  ENTER_GAS_PLANET = 'ENTER_GAS_PLANET',
  HIT_ASTEROID = 'HIT_ASTEROID',
  HIT_BEACON = 'HIT_BEACON',
  PLANET_BOUNCE = 'PLANET_BOUNCE',
  PLANET_DEATH = 'PLANET_DEATH',
  PROBE_DEATH = 'PROBE_DEATH',
  OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
  PROBE_DEATH_BY_COLLISION = 'PROBE_DEATH_BY_COLLISION',
}

export interface UpgradeEntry {
  id: UpgradeId;
  name: string;
  short: string;
  type: 'module' | 'hack';
  cost: number;
  color: string;
  desc: string;
  blurb?: string;
  triggerId?: TriggerId;
  image?: string;
}



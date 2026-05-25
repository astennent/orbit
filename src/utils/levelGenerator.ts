import * as THREE from 'three';
import { Planet, Beacon, ExitPortal, Asteroid } from '../types';
import {
  MIN_PLANET_DISTANCE,
  MAX_PLANET_DISTANCE,
  LAUNCH_PAD_X,
  LAUNCH_PAD_Z
} from '../constants/levelConstants';

const PLANET_NAMES = [
  'AURELIA', 'ZEPHYROS', 'KRONOS', 'XENON', 'HELIOS',
  'NEPTUNIS', 'VOYAGER', 'CYGNUS', 'SOLARIS', 'HALO'
];

const NEON_COLORS = [
  '#ff3d6a', // Neon Pink
  '#00e5ff', // Electric Blue
  '#a020f0', // Electric Purple
  '#39ff14', // Neon Green
  '#ff9f00', // Neon Orange
  '#ff00ff', // Magenta
];

/**
 * Generates an array of at least two planets for a level,
 * ensuring they are safely spaced from the launchpad and each other.
 */
export function generatePlanets(level: number): Planet[] {
  const launchPad = new THREE.Vector3(LAUNCH_PAD_X, 0, LAUNCH_PAD_Z);
  const planets: Planet[] = [];

  // Planet 1: Primary attractor
  const p1Radius = 1.8 + Math.floor(level / 5) * 0.15;
  const clampedRadius1 = Math.min(2.8, p1Radius);
  const name1 = `${PLANET_NAMES[(level - 1) % PLANET_NAMES.length]}-${level}A`;
  const color1 = NEON_COLORS[(level - 1) % NEON_COLORS.length];
  const mass1 = 45 + (level * 1.5) + Math.random() * 10;

  let pos1 = new THREE.Vector3();
  let attempts = 0;
  while (attempts < 150) {
    const angle = Math.random() * Math.PI * 2;
    const distance = MIN_PLANET_DISTANCE + Math.random() * (MAX_PLANET_DISTANCE - MIN_PLANET_DISTANCE);
    pos1.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
    if (pos1.distanceTo(launchPad) >= 7.0) break;
    attempts++;
  }

  const isGasGiant1 = level > 1 && Math.random() < 0.25;
  planets.push({
    id: `core-planet-${level}-a`,
    name: isGasGiant1 ? `${name1} (Gas Giant)` : name1,
    pos: pos1.clone(),
    radius: clampedRadius1,
    mass: Math.min(75, mass1),
    color: color1,
    atmosphereRadius: clampedRadius1 * 2.5,
    isGasGiant: isGasGiant1
  });

  // Planet 2: Secondary attractor (always spawned!)
  const p2Radius = 1.5 + Math.floor(level / 6) * 0.12;
  const clampedRadius2 = Math.min(2.4, p2Radius);
  const name2 = `${PLANET_NAMES[level % PLANET_NAMES.length]}-${level}B`;
  const color2 = NEON_COLORS[level % NEON_COLORS.length];
  const mass2 = 35 + (level * 1.2) + Math.random() * 8;

  let pos2 = new THREE.Vector3();
  attempts = 0;
  while (attempts < 200) {
    const angle = Math.random() * Math.PI * 2;
    const distance = MIN_PLANET_DISTANCE + Math.random() * (MAX_PLANET_DISTANCE - MIN_PLANET_DISTANCE);
    pos2.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

    // Safety check: must be away from launchpad and at least 8.0 units away from Planet 1
    if (pos2.distanceTo(launchPad) >= 7.0 && pos2.distanceTo(pos1) >= 8.0) break;
    attempts++;
  }

  const isGasGiant2 = level > 2 && Math.random() < 0.25;
  planets.push({
    id: `core-planet-${level}-b`,
    name: isGasGiant2 ? `${name2} (Gas Giant)` : name2,
    pos: pos2.clone(),
    radius: clampedRadius2,
    mass: Math.min(60, mass2),
    color: color2,
    atmosphereRadius: clampedRadius2 * 2.5,
    isGasGiant: isGasGiant2
  });

  // Planet 3: Tertiary attractor (always spawned!)
  const p3Radius = 1.2 + Math.floor(level / 7) * 0.10;
  const clampedRadius3 = Math.min(2.0, p3Radius);
  const name3 = `${PLANET_NAMES[(level + 1) % PLANET_NAMES.length]}-${level}C`;
  const color3 = NEON_COLORS[(level + 1) % NEON_COLORS.length];
  const mass3 = 25 + (level * 1.0) + Math.random() * 6;

  let pos3 = new THREE.Vector3();
  attempts = 0;
  while (attempts < 250) {
    const angle = Math.random() * Math.PI * 2;
    const distance = MIN_PLANET_DISTANCE + Math.random() * (MAX_PLANET_DISTANCE - MIN_PLANET_DISTANCE);
    pos3.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

    // Safety check: must be away from launchpad and at least 8.0 units away from Planet 1 & 2
    if (pos3.distanceTo(launchPad) >= 7.0 && pos3.distanceTo(pos1) >= 8.0 && pos3.distanceTo(pos2) >= 8.0) break;
    attempts++;
  }

  const isGasGiant3 = level > 3 && Math.random() < 0.25;
  planets.push({
    id: `core-planet-${level}-c`,
    name: isGasGiant3 ? `${name3} (Gas Giant)` : name3,
    pos: pos3.clone(),
    radius: clampedRadius3,
    mass: Math.min(45, mass3),
    color: color3,
    atmosphereRadius: clampedRadius3 * 2.5,
    isGasGiant: isGasGiant3
  });

  return planets;
}

/**
 * Randomizes the exit portal location safely away from the launch pad and all planets.
 */
export function generateExitPortal(planets: Planet[]): ExitPortal {
  const launchPad = new THREE.Vector3(LAUNCH_PAD_X, 0, LAUNCH_PAD_Z);
  const pos = new THREE.Vector3();
  let attempts = 0;

  while (attempts < 150) {
    const angle = Math.random() * Math.PI * 2;
    // Spawns exit portal between 11 and 20 units from origin
    const distance = 11 + Math.random() * 9;
    pos.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

    // Safety check: at least 7.0 units from launchpad and 6.5 units from both planets
    let safe = pos.distanceTo(launchPad) >= 7.0;
    for (const p of planets) {
      if (pos.distanceTo(p.pos) < 6.5) {
        safe = false;
        break;
      }
    }

    if (safe) {
      break;
    }
    attempts++;
  }

  return {
    pos: pos.clone(),
    radius: 1.4
  };
}

/**
 * Dynamically generates scattered space beacons.
 * Orbiting planetary beacons are worth 30 (high value) because they are harder to collect.
 * Deep space beacons are worth 12 (low value) and are placed away from gravity fields.
 */
export function generateBeacons(planets: Planet[]): Beacon[] {
  const launchPad = new THREE.Vector3(LAUNCH_PAD_X, 0, LAUNCH_PAD_Z);
  const points: Beacon[] = [];

  // 1. Planetary Orbit Beacons (2 around each of the 2 planets = 4 total, worth 30 each)
  for (const planet of planets) {
    for (let i = 0; i < 2; i++) {
      let dpPos = new THREE.Vector3();
      let attempts = 0;
      while (attempts < 100) {
        const minOrb = planet.radius + 1.2;
        const maxOrb = planet.atmosphereRadius + 0.8;
        const orbitDistance = minOrb + Math.random() * (maxOrb - minOrb);
        const angle = Math.random() * Math.PI * 2;

        dpPos.set(
          planet.pos.x + Math.cos(angle) * orbitDistance,
          0,
          planet.pos.z + Math.sin(angle) * orbitDistance
        );

        let tooClose = dpPos.distanceTo(launchPad) < 3.5;
        for (const p of points) {
          if (dpPos.distanceTo(p.pos) < 2.0) tooClose = true;
        }

        if (!tooClose) break;
        attempts++;
      }

      points.push({
        id: `dp-planet-${planet.id}-${i}`,
        pos: dpPos.clone(),
        radius: 0.52, // slightly larger for visibility
        value: 30, // worth more!
        collected: false
      });
    }
  }

  // 2. Scattered Deep Space Beacons (many scattered in void, worth 12 each)
  for (let i = 0; i < 30; i++) {
    let dpPos = new THREE.Vector3();
    let attempts = 0;
    while (attempts < 150) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 6 + Math.random() * 12;
      dpPos.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

      // Must be safely away from launchpad, planet atmospheres, and other beacons
      let safe = dpPos.distanceTo(launchPad) >= 3.5;
      for (const p of planets) {
        if (dpPos.distanceTo(p.pos) < p.atmosphereRadius + 1.5) safe = false;
      }
      for (const p of points) {
        if (dpPos.distanceTo(p.pos) < 2.2) safe = false;
      }

      if (safe) break;
      attempts++;
    }

    points.push({
      id: `dp-space-${i}`,
      pos: dpPos.clone(),
      radius: 0.38, // slightly smaller
      value: 12, // worth less!
      collected: false
    });
  }

  return points;
}

/**
 * Dynamically generates scattered space asteroids.
 * ice, carbon, metallic.
 * small, medium, large.
 * Level < 10: Always small.
 * Level >= 10: Spawns larger sizes.
 */
export function generateAsteroids(planets: Planet[], exitPortal: ExitPortal, beacons: Beacon[], level: number): Asteroid[] {
  const launchPad = new THREE.Vector3(LAUNCH_PAD_X, 0, LAUNCH_PAD_Z);
  const asteroids: Asteroid[] = [];

  // Decide how many asteroids to spawn based on level
  let count = 2;
  if (level >= 20) count = 8;
  else if (level >= 15) count = 6;
  else if (level >= 10) count = 5;
  else if (level >= 5) count = 3;

  const types: ('ice' | 'carbon' | 'metallic')[] = ['ice', 'carbon', 'metallic'];

  for (let i = 0; i < count; i++) {
    let pos = new THREE.Vector3();
    let attempts = 0;

    // Choose size based on level
    let size: 'small' | 'medium' | 'large' = 'small';
    if (level >= 10) {
      const rand = Math.random();
      if (level >= 20) {
        // 30% small, 40% medium, 30% large
        if (rand < 0.3) size = 'small';
        else if (rand < 0.7) size = 'medium';
        else size = 'large';
      } else if (level >= 15) {
        // 50% small, 35% medium, 15% large
        if (rand < 0.5) size = 'small';
        else if (rand < 0.85) size = 'medium';
        else size = 'large';
      } else {
        // level >= 10: 75% small, 25% medium, 0% large
        if (rand < 0.75) size = 'small';
        else size = 'medium';
      }
    }

    // Radius based on size
    const radius = size === 'large' ? 1.15 : size === 'medium' ? 0.75 : 0.42;
    const type = types[Math.floor(Math.random() * types.length)];

    while (attempts < 150) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 5.5 + Math.random() * 14.5; // 5.5 to 20 units
      pos.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

      // Safety checks:
      // 1. Launch pad: >= 3.5 units
      let safe = pos.distanceTo(launchPad) >= 3.5;

      // 2. Exit portal: >= 2.5 units
      if (pos.distanceTo(exitPortal.pos) < 2.5) safe = false;

      // 3. Planet cores: >= planet.radius + 1.2
      for (const p of planets) {
        if (pos.distanceTo(p.pos) < p.radius + 1.2) safe = false;
      }

      // 4. Other asteroids: >= 3.0 units
      for (const ast of asteroids) {
        if (pos.distanceTo(ast.pos) < 3.0) safe = false;
      }

      // 5. Beacons: >= 1.5 units
      for (const b of beacons) {
        if (pos.distanceTo(b.pos) < 1.5) safe = false;
      }

      if (safe) break;
      attempts++;
    }

    asteroids.push({
      id: `asteroid-${level}-${i}`,
      pos: pos.clone(),
      radius,
      type,
      size,
      health: 10,
      maxHealth: 10
    });
  }

  return asteroids;
}

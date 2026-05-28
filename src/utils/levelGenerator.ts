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
  const suffixes = ['A', 'B', 'C'];

  for (let i = 0; i < 3; i++) {
    const suffix = suffixes[i];
    const planetId = `core-planet-${level}-${suffix.toLowerCase()}`;

    // level > 1 prevents gas giants on first level.
    // i > 0 ensures at least the first planet is always rocky.
    const isGasGiant = level > 1 && i > 0 && Math.random() < 0.25;

    // Gas giants are always physically larger than rocky worlds (Gas: 2.2 to 3.2, Rocky: 1.1 to 1.8)
    const radius = isGasGiant 
      ? 2.2 + Math.random() * 1.0 
      : 1.1 + Math.random() * 0.7;

    const mass = radius * 20 + Math.random() * 15;

    const nameIndex = level - 1 + i;
    const colorIndex = level - 1 + i;

    const positiveNameIdx = ((nameIndex % PLANET_NAMES.length) + PLANET_NAMES.length) % PLANET_NAMES.length;
    const positiveColorIdx = ((colorIndex % NEON_COLORS.length) + NEON_COLORS.length) % NEON_COLORS.length;

    const name = `${PLANET_NAMES[positiveNameIdx]}-${level}${suffix}`;
    const color = NEON_COLORS[positiveColorIdx];

    let pos = new THREE.Vector3();
    let attempts = 0;
    const maxAttempts = 150 + i * 50;

    while (attempts < maxAttempts) {
      const angle = Math.random() * Math.PI * 2;
      const distance = MIN_PLANET_DISTANCE + Math.random() * (MAX_PLANET_DISTANCE - MIN_PLANET_DISTANCE);
      pos.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

      // Safe distance check from launchpad and all previously generated planets
      let safe = pos.distanceTo(launchPad) >= 7.0;
      for (const p of planets) {
        if (pos.distanceTo(p.pos) < 8.0) {
          safe = false;
          break;
        }
      }

      if (safe) break;
      attempts++;
    }

    planets.push({
      id: planetId,
      name: isGasGiant ? `${name} (Gas Giant)` : name,
      pos: pos.clone(),
      radius: radius,
      mass: mass,
      color: color,
      atmosphereRadius: radius * 2.5,
      isGasGiant: isGasGiant
    });
  }

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

      const randomValue = 35 + Math.floor(Math.random() * 4) * 5; // 35 to 50 inclusive (35, 40, 45, 50)
      points.push({
        id: `dp-planet-${planet.id}-${i}`,
        pos: dpPos.clone(),
        radius: 0.52, // slightly larger for visibility
        value: randomValue,
        collected: false
      });
    }
  }

  // 2. Scattered Deep Space Beacons (many scattered in void, worth 10 to 25, divisible by 5)
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

    const randomValue = 10 + Math.floor(Math.random() * 4) * 5; // 10 to 25 inclusive (10, 15, 20, 25)
    points.push({
      id: `dp-space-${i}`,
      pos: dpPos.clone(),
      radius: 0.38, // slightly smaller
      value: randomValue,
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

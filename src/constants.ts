export const GRAVITATIONAL_CONSTANT = 18.0;

export const ATMOSPHERE_DRAG = 0.45; // Friction coefficient inside atmosphere

export const MIN_SPEED_THRESHOLD = 0.06; // Below this speed, probe comes to a halt
export const GAS_GIANT_MIN_SPEED_THRESHOLD = 2; // Below this speed inside a gas giant, probe comes to a halt

export const getSectorQuota = (level: number): number => {
  return Math.floor(100 * Math.pow(1.1, level - 1));
};

export const MAX_TRAJECTORY_STEPS = 250; // Steps to predict trajectory path

export const LAUNCH_SPEED_MULTIPLIER = 0.06; // Drag vector to velocity multiplier

export const PHYSICS_DT = 0.016; // Fixed timestep dt for deterministic integration

export const OUT_OF_BOUNDS_LIMIT = 80.0; // Perimeter boundary radius to prevent infinite drift

export const DEFAULT_MAGNET_RADIUS = 1.0; // Default probe collection magnet radius

export const ROCKET_SPEED = 24.0; // Snappy speed for active homing missiles

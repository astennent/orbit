export const GRAVITATIONAL_CONSTANT = 18.0;

export const ATMOSPHERE_DRAG = 0.45; // Friction coefficient inside atmosphere

export const MIN_SPEED_THRESHOLD = 0.06; // Below this speed, probe comes to a halt

export const SECTOR_QUOTA = 100; // Target data points to win

export const MAX_TRAJECTORY_STEPS = 250; // Steps to predict trajectory path

export const LAUNCH_SPEED_MULTIPLIER = 0.06; // Drag vector to velocity multiplier

export const PHYSICS_DT = 0.016; // Fixed timestep dt for deterministic integration

export const OUT_OF_BOUNDS_LIMIT = 80.0; // Perimeter boundary radius to prevent infinite drift

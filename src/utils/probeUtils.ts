import * as THREE from 'three'
import { Probe } from '../types'
import { DEFAULT_MAGNET_RADIUS } from '../constants'

/**
 * Creates a fresh, fully initialized Probe state object.
 * 
 * @param aimStartPos The starting anchor position for the probe.
 * @param vel Optional initial velocity vector (defaults to 0,0,0).
 * @param trail Optional initial flight trail (defaults to empty).
 */
export function createFreshProbe(
  aimStartPos: THREE.Vector3,
  vel: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  trail: THREE.Vector3[] = []
): Probe {
  return {
    pos: aimStartPos.clone(),
    vel: vel.clone(),
    data: 0,
    trail: trail.map(p => p.clone()),
    trailColors: trail.map(() => ({ r: 0, g: 0, b: 0 })),
    integrity: 10,
    maxIntegrity: 10,
    magnetRadius: DEFAULT_MAGNET_RADIUS,
    scoopActiveTimer: 0,
    shieldLevel: 0,
    shieldDuration: 0
  }
}

/**
 * Processes damage against a probe's shield and hull integrity, updating both properties.
 * Returns a boolean indicating whether any hull integrity (HP) damage was taken.
 * 
 * @param pState The active Probe state.
 * @param damage The raw damage incoming.
 * @param triggerDataToast Optional callback to show a data toast for shield/integrity damage.
 */
export function applyDamage(
  pState: Probe,
  damage: number,
  triggerDataToast?: (text: string, pos: THREE.Vector3, color?: string) => void
): boolean {
  let damageTaken = damage;
  if (pState.shieldDuration > 0 && pState.shieldLevel > 0) {
    const blocked = Math.min(damageTaken, pState.shieldLevel);
    pState.shieldLevel -= blocked;
    damageTaken -= blocked;
    if (pState.shieldLevel <= 0) {
      pState.shieldDuration = 0;
    }
    if (triggerDataToast && blocked > 0) {
      triggerDataToast(`Shield: -${blocked} HP`, pState.pos, '#00e5ff');
    }
  }

  if (damageTaken > 0) {
    pState.integrity = Math.max(0, pState.integrity - damageTaken);
    if (triggerDataToast) {
      triggerDataToast(`-${damageTaken} Hull`, pState.pos, '#ff4757');
    }
    return true;
  }
  return false;
}

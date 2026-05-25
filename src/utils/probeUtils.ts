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
    integrity: 10,
    maxIntegrity: 10,
    magnetRadius: DEFAULT_MAGNET_RADIUS
  }
}

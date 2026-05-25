import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { GameState } from '../types'
import { LAUNCH_SPEED_MULTIPLIER } from '../constants'

interface UseSlingshotControlsProps {
  gameStateRef: React.MutableRefObject<GameState>
  aimStartPos: THREE.Vector3
  onLaunch: (firingVelocity: THREE.Vector3) => void
}

export function useSlingshotControls({
  gameStateRef,
  aimStartPos,
  onLaunch
}: UseSlingshotControlsProps) {
  const [aimActive, setAimActive] = useState(false)
  const [aimVel, setAimVel] = useState<THREE.Vector3 | null>(null)

  const handleAimStart = (_worldPoint: THREE.Vector3) => {
    if (gameStateRef.current !== 'IDLE') return
    setAimActive(true)
    setAimVel(new THREE.Vector3(0, 0, 0))
  }

  const handleAimMove = (worldPoint: THREE.Vector3) => {
    if (gameStateRef.current !== 'LAUNCHING' && !aimActive) return

    // Slingshot vector: pull backwards to launch forward!
    const dragVector = new THREE.Vector3().subVectors(aimStartPos, worldPoint)
    dragVector.y = 0 // Keep on X-Z plane

    // Clamp maximum launcher pull strength
    const maxPull = 12.0
    if (dragVector.length() > maxPull) {
      dragVector.normalize().multiplyScalar(maxPull)
    }

    // Multiply by constant to get actual firing velocity
    const launchMult = LAUNCH_SPEED_MULTIPLIER * 22;
    const firingVelocity = dragVector.clone().multiplyScalar(launchMult)
    setAimVel(firingVelocity)
  }

  const handleAimRelease = () => {
    setAimActive(false)
  }

  // Listen to spacebar keydown events to launch the probe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll down

        // Only allow launch if we are in IDLE or LAUNCHING state and have aiming velocity
        if ((gameStateRef.current === 'IDLE' || gameStateRef.current === 'LAUNCHING') && aimVel) {
          if (aimVel.lengthSq() > 0) {
            onLaunch(aimVel)
            setAimActive(false)
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [aimVel, aimActive, onLaunch]);

  return {
    aimActive,
    aimVel,
    setAimVel,
    handleAimStart,
    handleAimMove,
    handleAimRelease
  }
}

import { useMemo } from 'react'
import * as THREE from 'three'
import { Planet } from '../../types'
import {
  GRAVITATIONAL_CONSTANT,
  ATMOSPHERE_DRAG,
  PHYSICS_DT,
  MIN_SPEED_THRESHOLD,
  GAS_GIANT_MIN_SPEED_THRESHOLD,
  MAX_TRAJECTORY_STEPS
} from '../../constants'

interface TrajectoryLineProps {
  startPos: THREE.Vector3
  startVel: THREE.Vector3 | null
  planets: Planet[]
}

interface Segment {
  points: THREE.Vector3[]
  inAtmosphere: boolean
}

export function TrajectoryLine({ startPos, startVel, planets }: TrajectoryLineProps) {
  // 1. Calculate future trajectory points by running virtual integration
  const segments = useMemo(() => {
    if (!startVel || startVel.lengthSq() === 0 || !planets || planets.length === 0) return []

    const tempPos = startPos.clone()
    const tempVel = startVel.clone()
    const tempAcc = new THREE.Vector3()

    const rawPoints: { pos: THREE.Vector3; inAtmosphere: boolean }[] = []

    for (let step = 0; step < MAX_TRAJECTORY_STEPS; step++) {
      let inAtmosphere = false
      tempAcc.set(0, 0, 0)
      let hitPlanet = false

      for (const planet of planets) {
        const diff = new THREE.Vector3().subVectors(planet.pos, tempPos)
        diff.y = 0 // enforce 2D horizontal plane simulation

        const dist = diff.length()
        
        // Collision with core: stop predicting (Skipped for Gas Giants!)
        if (!planet.isGasGiant && dist < planet.radius) {
          rawPoints.push({ pos: tempPos.clone(), inAtmosphere: false })
          hitPlanet = true
          break
        }

        // Check if inside gravity atmosphere
        if (dist < planet.atmosphereRadius) {
          inAtmosphere = true
        }

        // Compute gravity pull acceleration
        if (dist > 0.1) {
          let force: number
          if (planet.isGasGiant && dist < planet.radius) {
            // Newton's Shell Theorem: linear gravity inside Gas Giant cores
            force = (GRAVITATIONAL_CONSTANT * planet.mass * dist) / (planet.radius * planet.radius * planet.radius)
          } else {
            // Inverse-square outside core
            force = (GRAVITATIONAL_CONSTANT * planet.mass) / (dist * dist)
          }
          const dir = diff.normalize()
          tempAcc.addScaledVector(dir, force)
        }
      }

      if (hitPlanet) {
        break
      }

      // Apply atmospheric drag/friction slowdown
      if (inAtmosphere) {
        let drag = ATMOSPHERE_DRAG
        for (const planet of planets) {
          if (planet.isGasGiant) {
            const diff = new THREE.Vector3().subVectors(planet.pos, tempPos)
            diff.y = 0
            if (diff.length() < planet.radius) {
              drag = ATMOSPHERE_DRAG * 30.0 // 30x core drag inside Gas Giant
              break
            }
          }
        }
        tempVel.multiplyScalar(1 - drag * PHYSICS_DT)
      }

      // Integrate step
      tempVel.addScaledVector(tempAcc, PHYSICS_DT)
      tempPos.addScaledVector(tempVel, PHYSICS_DT)

      rawPoints.push({
        pos: tempPos.clone(),
        inAtmosphere
      })

      // Stop predicting if velocity hits threshold (GAS_GIANT_MIN_SPEED_THRESHOLD inside Gas Giants, MIN_SPEED_THRESHOLD otherwise)
      let stopThreshold = MIN_SPEED_THRESHOLD
      for (const planet of planets) {
        if (planet.isGasGiant) {
          const diff = new THREE.Vector3().subVectors(planet.pos, tempPos)
          diff.y = 0
          if (diff.length() < planet.radius) {
            stopThreshold = GAS_GIANT_MIN_SPEED_THRESHOLD
            break
          }
        }
      }

      if (tempVel.length() < stopThreshold) {
        break
      }
    }

    // 2. Parse raw points into contiguous "Solid" and "Atmosphere (Dotted)" chunks
    const parsedSegments: Segment[] = []
    if (rawPoints.length === 0) return []

    let currentSegment: Segment = {
      points: [startPos.clone(), rawPoints[0].pos],
      inAtmosphere: rawPoints[0].inAtmosphere
    }

    for (let i = 1; i < rawPoints.length; i++) {
      const pt = rawPoints[i]
      if (pt.inAtmosphere === currentSegment.inAtmosphere) {
        currentSegment.points.push(pt.pos)
      } else {
        // Close old segment, open new one starting at the end of the previous one
        parsedSegments.push(currentSegment)
        currentSegment = {
          points: [rawPoints[i - 1].pos, pt.pos],
          inAtmosphere: pt.inAtmosphere
        }
      }
    }
    parsedSegments.push(currentSegment)

    return parsedSegments
  }, [startPos, startVel, planets])

  return (
    <group>
      {segments.map((seg, idx) => {
        if (seg.points.length < 2) return null

        // Format points for native ThreeJS Line component
        const positions = new Float32Array(seg.points.flatMap(p => [p.x, p.y, p.z]))
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

        if (seg.inAtmosphere) {
          // Inside gravity well: dotted (dashed) and faded purple/red
          return (
            <line key={idx}>
              <primitive object={geometry} attach="geometry" />
              <lineBasicMaterial
                color="#ff4757"
                transparent
                opacity={0.35}
              />
            </line>
          )
        } else {
          // In deep space: solid electric cyan
          return (
            <line key={idx}>
              <primitive object={geometry} attach="geometry" />
              <lineBasicMaterial
                color="#00e5ff"
                linewidth={2.5}
                transparent
                opacity={0.8}
              />
            </line>
          )
        }
      })}
    </group>
  )
}

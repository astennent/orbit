import { useMemo, useRef, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Planet, GameState } from '../../types'
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
  gameState: GameState
}

interface Segment {
  points: THREE.Vector3[]
  inAtmosphere: boolean
}

function TrajectoryLineComponent({ startPos, startVel, planets, gameState }: TrajectoryLineProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const frozenSegmentsRef = useRef<Segment[]>([])
  const fadeOpacityRef = useRef(1.0)

  // 1. Calculate future trajectory points by running virtual integration
  const segments = useMemo(() => {
    // If launched (in flight/crashed/win), preserve the last calculated segment lines so they can be smoothly faded out!
    if (gameState !== 'IDLE' && gameState !== 'LAUNCHING') {
      return frozenSegmentsRef.current
    }

    if (!startVel || startVel.lengthSq() === 0 || !planets || planets.length === 0) {
      frozenSegmentsRef.current = []
      return []
    }

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

    frozenSegmentsRef.current = parsedSegments
    return parsedSegments
  }, [startPos, startVel, planets, gameState])

  // Performant R3F animation hook: directly updates WebGL material opacities on the frame tick
  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (gameState !== 'IDLE' && gameState !== 'LAUNCHING') {
      // Fade out smoothly over ~1.1 seconds
      fadeOpacityRef.current = Math.max(0, fadeOpacityRef.current - delta * 0.9)

      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Line) {
          const mat = child.material as THREE.LineBasicMaterial
          mat.transparent = true
          mat.opacity = (child.userData.baseOpacity || 0.8) * fadeOpacityRef.current
          if (fadeOpacityRef.current === 0) {
            child.visible = false
          }
        }
      })
    } else {
      // Aiming: fully visible with base opacities
      fadeOpacityRef.current = 1.0
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Line) {
          child.visible = true
          const mat = child.material as THREE.LineBasicMaterial
          mat.opacity = child.userData.baseOpacity || 0.8
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {segments.map((seg, idx) => {
        if (seg.points.length < 2) return null

        // Format points for native ThreeJS Line component with dynamic gravity-well height warping
        const warpedPositions = new Float32Array(seg.points.length * 3)
        for (let i = 0; i < seg.points.length; i++) {
          const pt = seg.points[i]
          let depth = 0
          for (const p of planets) {
            const dx = pt.x - p.pos.x
            const dz = pt.z - p.pos.z
            let dist = Math.sqrt(dx * dx + dz * dz)
            if (!p.isGasGiant && dist < p.radius) {
              dist = p.radius
            }
            const pull = (0.2 * p.mass) / (dist + 1.0)
            depth -= pull
          }
          depth = Math.max(-8.0, depth)

          warpedPositions[i * 3] = pt.x
          warpedPositions[i * 3 + 1] = depth // Bends down into the wells in 3D!
          warpedPositions[i * 3 + 2] = pt.z
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(warpedPositions, 3))

        const baseOpacity = seg.inAtmosphere ? 0.65 : 0.9

        if (seg.inAtmosphere) {
          // Inside gravity well: faded dark crimson red
          return (
            <line key={idx} {...({ userData: { baseOpacity } } as any)}>
              <primitive object={geometry} attach="geometry" />
              <lineBasicMaterial
                color="#6e0a0d"
                transparent
                opacity={baseOpacity}
              />
            </line>
          )
        } else {
          // In deep space: solid dark slate-teal
          return (
            <line key={idx} {...({ userData: { baseOpacity } } as any)}>
              <primitive object={geometry} attach="geometry" />
              <lineBasicMaterial
                color="#003b41"
                linewidth={3.5}
                transparent
                opacity={baseOpacity}
              />
            </line>
          )
        }
      })}
    </group>
  )
}

export const TrajectoryLine = memo(TrajectoryLineComponent, (prevProps, nextProps) => {
  return (
    prevProps.gameState === nextProps.gameState &&
    prevProps.planets === nextProps.planets &&
    prevProps.startPos.equals(nextProps.startPos) &&
    ((prevProps.startVel === null && nextProps.startVel === null) ||
      (prevProps.startVel !== null &&
        nextProps.startVel !== null &&
        prevProps.startVel.equals(nextProps.startVel)))
  )
})


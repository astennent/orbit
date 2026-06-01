import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Rocket, Planet } from '../../types'

interface RocketComponentProps {
  rocket: Rocket
  planets: Planet[]
}

export function RocketComponent({ rocket, planets }: RocketComponentProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Pre-calculate the initial height of the rocket on mount/update to prevent single-frame flashes
  const initialHeight = useMemo(() => {
    let depth = 0
    for (const p of planets) {
      const dx = rocket.pos.x - p.pos.x
      const dz = rocket.pos.z - p.pos.z
      let dist = Math.sqrt(dx * dx + dz * dz)
      if (!p.isGasGiant && dist < p.radius) {
        dist = p.radius
      }
      const pull = (0.2 * p.mass) / (dist + 1.0)
      depth -= pull
    }
    return Math.max(-8.0, depth)
  }, [planets, rocket.pos.x, rocket.pos.z])

  useFrame(() => {
    if (groupRef.current) {
      let depth = 0
      for (const p of planets) {
        const dx = rocket.pos.x - p.pos.x
        const dz = rocket.pos.z - p.pos.z
        let dist = Math.sqrt(dx * dx + dz * dz)
        if (!p.isGasGiant && dist < p.radius) {
          dist = p.radius
        }
        const pull = (0.2 * p.mass) / (dist + 1.0)
        depth -= pull
      }
      const rocketHeight = Math.max(-8.0, depth)

      // Smoothly update position in 3D WebGL space directly
      groupRef.current.position.set(rocket.pos.x, rocketHeight, rocket.pos.z)

      if (rocket.vel.length() > 0.01) {
        // Point group in the direction of travel in global space
        // Look ahead along velocity and warp height to naturally tilt rocket along slopes
        const targetPos = rocket.pos.clone().add(rocket.vel)
        let targetDepth = 0
        for (const p of planets) {
          const dx = targetPos.x - p.pos.x
          const dz = targetPos.z - p.pos.z
          let dist = Math.sqrt(dx * dx + dz * dz)
          if (!p.isGasGiant && dist < p.radius) {
            dist = p.radius
          }
          const pull = (0.2 * p.mass) / (dist + 1.0)
          targetDepth -= pull
        }
        const targetHeight = Math.max(-8.0, targetDepth)

        groupRef.current.lookAt(new THREE.Vector3(targetPos.x, targetHeight, targetPos.z))
      }
    }
  })

  return (
    <group ref={groupRef} position={[rocket.pos.x, initialHeight, rocket.pos.z]}>
      {/* Main rocket body - rotated flat along the Z-axis (lookAt orientates Z) */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* Homing missile shell */}
        <mesh>
          <cylinderGeometry args={[0.05, 0.08, 0.45, 8]} />
          <meshStandardMaterial
            color="#ff3300"
            roughness={0.2}
            metalness={0.8}
            emissive="#ff3300"
            emissiveIntensity={1.2}
          />
        </mesh>

        {/* Glowing thruster tail flame */}
        <mesh position={[0, -0.3, 0]}>
          <coneGeometry args={[0.06, 0.2, 8]} />
          <meshBasicMaterial
            color="#ffaa00"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
      
      {/* Dynamic orange exhaust flare trail glow */}
      <pointLight
        position={[0, 0, 0]}
        intensity={2.8}
        distance={3.5}
        color="#ffaa00"
      />
    </group>
  )
}

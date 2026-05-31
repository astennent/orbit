import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Rocket } from '../../types'

interface RocketComponentProps {
  rocket: Rocket
}

export function RocketComponent({ rocket }: RocketComponentProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      // Smoothly update position in 3D WebGL space directly
      groupRef.current.position.copy(rocket.pos)

      if (rocket.vel.length() > 0.01) {
        // Point group in the direction of travel in global space
        groupRef.current.lookAt(rocket.pos.clone().add(rocket.vel))
      }
    }
  })

  return (
    <group ref={groupRef} position={rocket.pos}>
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

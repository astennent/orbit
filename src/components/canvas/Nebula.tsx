import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export function Nebula() {
  const groupRef = useRef<THREE.Group>(null!)
  const texture = useTexture('/nebula_cloud.png')

  // Create a set of giant, soft, textured cloud sprites
  const clouds = useMemo(() => {
    const data = []
    const colors = [
      '#4400aa', // Purple
      '#0044ff', // Blue
      '#ff00aa', // Pink
      '#00aa44', // Green
    ]

    // Internal scattered clouds
    for (let i = 0; i < 20; i++) {
      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 3000,
          (Math.random() - 0.5) * 3000,
          (Math.random() - 0.5) * 3000
        ),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 800 + Math.random() * 1200,
        rotation: Math.random() * Math.PI * 2,
      })
    }

    // Outer shell clouds
    for (let i = 0; i < 30; i++) {
      const radius = 4000 + Math.random() * 1000
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      data.push({
        position: new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        ),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4000 + Math.random() * 3000, // Massive clouds on the horizon
        rotation: Math.random() * Math.PI * 2,
      })
    }
    return data
  }, [])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.005
    }
  })

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <sprite
          key={i}
          position={cloud.position}
          scale={[cloud.size, cloud.size, 1]}
        >
          <spriteMaterial
            map={texture}
            color={cloud.color}
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            rotation={cloud.rotation}
          />
        </sprite>
      ))}
    </group>
  )
}

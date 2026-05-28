import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Asteroid } from '../../types'

interface AsteroidComponentProps {
  asteroid: Asteroid
}

export function AsteroidComponent({ asteroid }: AsteroidComponentProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<boolean>(false)

  // Pre-load the high-fidelity AI-generated asteroid textures
  const iceTexture = useTexture('/asteroid_ice_texture.png')
  const carbonTexture = useTexture('/asteroid_carbon_texture.png')
  const metallicTexture = useTexture('/asteroid_metallic_texture.png')

  // Bind the appropriate high-fidelity texture based on classification
  const texture = useMemo(() => {
    let t = metallicTexture
    if (asteroid.type === 'ice') {
      t = iceTexture
    } else if (asteroid.type === 'carbon') {
      t = carbonTexture
    }
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    return t
  }, [asteroid.type, iceTexture, carbonTexture, metallicTexture])

  // Slow spin in randomized axes to look like realistic drifting debris
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.14
      meshRef.current.rotation.y += delta * 0.08
    }
  })

  const getAsteroidDetails = () => {
    switch (asteroid.type) {
      case 'ice':
        return {
          color: '#ffd32a', // Crystalline Yellow
          roughness: 0.15,
          metalness: 0.1,
          emissive: '#ffb300', // Yellow/Gold glow
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.75,
          label: 'Ice Asteroid',
          desc: 'Brittle crystalline ice. High hack/module drop rate but extremely cold. Yields 10-30 data.'
        }
      case 'carbon':
        return {
          color: '#ffa500', // Deep Orange
          roughness: 0.85,
          metalness: 0.1,
          emissive: '#ff5500', // Molten orange lava glow
          emissiveIntensity: 0.5,
          transparent: false,
          opacity: 1.0,
          label: 'Carbon Asteroid',
          desc: 'Dense organic carbonaceous matrix. Solid resistance. Yields 10-30 data.'
        }
      case 'metallic':
        return {
          color: '#ff4d4d', // Industrial Red
          roughness: 0.25,
          metalness: 0.55,
          emissive: '#ff002b', // Energetic volcanic red glow
          emissiveIntensity: 0.75,
          transparent: false,
          opacity: 1.0,
          label: 'Metallic Asteroid',
          desc: 'Rich nickel-iron-gold ore. Extremely dense. High hack rate. Yields 15-50 data.'
        }
    }
  }

  const details = getAsteroidDetails()

  // Faceted low-poly look: dodecahedron with detail 1 is perfect!
  const geomArgs = [asteroid.radius, 1] as [number, number]

  const getDamageValue = () => {
    const baseDamage = asteroid.type === 'ice' ? 3 : asteroid.type === 'carbon' ? 4 : 6
    const multiplier = asteroid.size === 'large' ? 4 : asteroid.size === 'medium' ? 2 : 1
    return baseDamage * multiplier
  }

  return (
    <group position={asteroid.pos}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
        <dodecahedronGeometry args={geomArgs} />
        <meshStandardMaterial
          color="#ffffff"
          map={texture || undefined}
          bumpMap={texture || undefined}
          bumpScale={asteroid.type === 'ice' ? 0.06 : asteroid.type === 'carbon' ? 0.15 : 0.25}
          roughness={details.roughness}
          metalness={details.metalness}
          emissive={details.emissive}
          emissiveIntensity={details.emissiveIntensity}
          transparent={details.transparent}
          opacity={details.opacity}
        />
      </mesh>

      {/* Retro outline ring for visual highlighting when hovered */}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[asteroid.radius * 1.1, asteroid.radius * 1.15, 32]} />
          <meshBasicMaterial color={details.color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating immersive 3D Tooltip Overlay */}
      {hovered && (
        <Html position={[0, asteroid.radius + 1.0, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="tooltip-card">
            <span className="badge hazard" style={{ background: 'rgba(255, 71, 87, 0.15)', color: '#ff4757', borderColor: '#ff4757' }}>
              {details.label} ({asteroid.size.toUpperCase()})
            </span>
            <h4>ASTEROID THREAT</h4>
            <div><strong>Size Class:</strong> {asteroid.size.toUpperCase()}</div>
            <div><strong>Hull Impact:</strong> <span style={{ color: 'var(--glow-red)' }}>-{getDamageValue()} Integrity</span></div>
            <div><strong>Health Integrity:</strong> {asteroid.health.toFixed(0)} / {asteroid.maxHealth} HP</div>

            <div style={{ marginTop: '6px', color: 'var(--chrome-dim)', fontSize: '9.5px', lineHeight: '1.3' }}>
              {details.desc} Size increases damage, yields, and hack/module drop chances. Breaks on impact.
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Planet } from '../../types'

interface PlanetComponentProps {
  planet: Planet
}

export function PlanetComponent({ planet }: PlanetComponentProps) {
  const coreRef = useRef<THREE.Mesh>(null!)
  const atmoRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<boolean>(false)

  // Pre-load the high-fidelity AI-generated planet textures
  const rockyTexture = useTexture('/rocky_planet_texture.png')
  const gasTexture = useTexture('/gas_planet_texture.png')

  // Bind the appropriate high-fidelity texture based on planet classification
  const texture = useMemo(() => {
    if (planet.isGasGiant) {
      gasTexture.wrapS = THREE.RepeatWrapping
      gasTexture.wrapT = THREE.ClampToEdgeWrapping
      return gasTexture
    } else {
      rockyTexture.wrapS = THREE.RepeatWrapping
      rockyTexture.wrapT = THREE.ClampToEdgeWrapping
      return rockyTexture
    }
  }, [planet.isGasGiant, gasTexture, rockyTexture])

  // Add a nice slow rotation to the planet core
  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y -= delta * 0.15 // Spin horizontally to showcase spherical wrapping
    }
    if (atmoRef.current) {
      atmoRef.current.rotation.z += delta * 0.05
    }
  })

  return (
    <group position={planet.pos}>
      {/* Atmosphere Gravity boundary satin disk */}
      <mesh ref={atmoRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.radius, planet.atmosphereRadius, 64]} />
        <meshBasicMaterial
          color={planet.color}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sleek retro gold/brass colored horizontal ring for atmospheric entry */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.atmosphereRadius - 0.06, planet.atmosphereRadius + 0.06, 64]} />
        <meshStandardMaterial
          color="#ffd700"
          transparent
          opacity={0.4}
          roughness={0.1}
          metalness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid core polished candy sphere with custom procedural texture mapping and relief bump mapping */}
      <mesh
        ref={coreRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          map={texture || undefined}
          bumpMap={texture || undefined}
          bumpScale={planet.isGasGiant ? 0.02 : 0.22} // High bump relief for craggy Rocky worlds
          roughness={planet.isGasGiant ? 0.35 : 0.85} // Matte finish for rock, higher gloss for gas
          metalness={planet.isGasGiant ? 0.25 : 0.0}
          opacity={planet.isGasGiant ? 0.95 : 1}
          emissive={planet.color}
          emissiveIntensity={planet.isGasGiant ? 0.38 : 0.12} // Gas giants glow from within to look bright and distinct
        />
      </mesh>

      {/* Immersive 3D Tooltip Overlay */}
      {hovered && (
        <Html position={[0, planet.radius + 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="tooltip-card">
            <span className="badge hazard" style={{ borderColor: planet.isGasGiant ? '#2ed573' : '#ff4757', color: planet.isGasGiant ? '#2ed573' : '#ff4757', background: planet.isGasGiant ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 135, 0.15)' }}>
              {planet.isGasGiant ? 'GAS PLANET' : 'ROCKY WORLD'}
            </span>
            <h4>{planet.name}</h4>
            <div><strong>Gravity:</strong> Strong ({planet.mass.toFixed(0)} MT)</div>
            <div><strong>Atmosphere:</strong> {planet.atmosphereRadius.toFixed(1)} km</div>
            <div style={{ marginTop: '5px', color: 'var(--chrome-dim)', fontSize: '10px' }}>
              Exerts active gravitational pull. Atmosphere applies friction drag slowdown but boosts telemetry data collection rate by <strong>10x</strong>!{' '}
              {planet.isGasGiant ? (
                <strong style={{ color: '#2ed573', display: 'block', marginTop: '3px' }}>Gaseous Core: passes through safely with no damage, but experiences extremely heavy core drag!</strong>
              ) : (
                <strong style={{ color: '#ff4757', display: 'block', marginTop: '3px' }}>Rocky Surface: avoid impact collision!</strong>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

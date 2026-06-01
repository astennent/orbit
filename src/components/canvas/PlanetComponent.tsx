import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Planet } from '../../types'

interface PlanetComponentProps {
  planet: Planet
  planets: Planet[]
}

export function PlanetComponent({ planet, planets }: PlanetComponentProps) {
  const coreRef = useRef<THREE.Mesh>(null!)
  const atmoRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<boolean>(false)

  // Torus geometry parameters for Core: outer radius is equal to planet.radius
  const tubeRadius = 0.06
  const torusRadius = planet.radius - tubeRadius

  // Torus geometry parameters for Atmosphere Ring: outer radius is equal to planet.atmosphereRadius
  const atmoTubeRadius = 0.04
  const atmoTorusRadius = planet.atmosphereRadius - atmoTubeRadius

  // Dynamically compute the planet's warped core height (sampling 8 points to find the highest grid edge)
  const planetHeight = useMemo(() => {
    let maxDepth = -Infinity
    const sampleRadius = torusRadius

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4
      const sampleX = planet.pos.x + sampleRadius * Math.cos(angle)
      const sampleZ = planet.pos.z + sampleRadius * Math.sin(angle)

      let depth = 0
      for (const p of planets) {
        if (p.id === planet.id) {
          // Distance to own center is exactly sampleRadius
          const pull = (0.2 * p.mass) / (sampleRadius + 1.0)
          depth -= pull
        } else {
          // Distance to other planets
          const dx = sampleX - p.pos.x
          const dz = sampleZ - p.pos.z
          let dist = Math.sqrt(dx * dx + dz * dz)
          if (!p.isGasGiant && dist < p.radius) {
            dist = p.radius
          }
          const pull = (0.2 * p.mass) / (dist + 1.0)
          depth -= pull
        }
      }
      depth = Math.max(-8.0, depth)
      if (depth > maxDepth) {
        maxDepth = depth
      }
    }
    // Add half thickness of the cylinder coin (0.06) to sit cleanly on top
    return maxDepth + 0.06
  }, [planets, planet.pos.x, planet.pos.z, torusRadius, planet.id])

  // Dynamically compute the planet's warped atmosphere height (sampling 8 points to find the highest grid edge)
  const atmosphereHeight = useMemo(() => {
    let maxDepth = -Infinity
    const sampleRadius = atmoTorusRadius

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4
      const sampleX = planet.pos.x + sampleRadius * Math.cos(angle)
      const sampleZ = planet.pos.z + sampleRadius * Math.sin(angle)

      let depth = 0
      for (const p of planets) {
        if (p.id === planet.id) {
          // Distance to own center is exactly sampleRadius
          const pull = (0.2 * p.mass) / (sampleRadius + 1.0)
          depth -= pull
        } else {
          // Distance to other planets
          const dx = sampleX - p.pos.x
          const dz = sampleZ - p.pos.z
          let dist = Math.sqrt(dx * dx + dz * dz)
          if (!p.isGasGiant && dist < p.radius) {
            dist = p.radius
          }
          const pull = (0.2 * p.mass) / (dist + 1.0)
          depth -= pull
        }
      }
      depth = Math.max(-8.0, depth)
      if (depth > maxDepth) {
        maxDepth = depth
      }
    }
    // Add the tube radius thickness (atmoTubeRadius = 0.04) to prevent any grid overlaps
    return maxDepth + atmoTubeRadius
  }, [planets, planet.pos.x, planet.pos.z, atmoTorusRadius, atmoTubeRadius, planet.id])

  // Add a nice slow rotation to the planet core
  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.15 // Spin around its vertical Y-axis
    }
    if (atmoRef.current) {
      atmoRef.current.rotation.z += delta * 0.05
    }
  })

  return (
    <group position={planet.pos}>
      {/* Sleek retro horizontal torus ring for atmospheric entry */}
      <mesh
        ref={atmoRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, atmosphereHeight, 0]}
        onPointerOver={planet.isGasGiant ? (e) => {
          e.stopPropagation()
          setHovered(true)
        } : undefined}
        onPointerOut={planet.isGasGiant ? (e) => {
          e.stopPropagation()
          setHovered(false)
        } : undefined}
      >
        <torusGeometry args={[atmoTorusRadius, atmoTubeRadius, 16, 64]} />
        <meshStandardMaterial
          color={planet.isGasGiant ? '#ff3333' : '#ffffff'}
          emissive={planet.isGasGiant ? '#ff3333' : '#ffffff'}
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Solid thin cylinder core sitting at the bottom of the warped gravity well */}
      {!planet.isGasGiant && (
        <mesh
          ref={coreRef}
          rotation={[0, 0, 0]}
          position={[0, planetHeight + 0.05, 0]}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            setHovered(false)
          }}
        >
          <cylinderGeometry args={[planet.radius, planet.radius, 0.12, 64]} />
          <meshStandardMaterial
            color={planet.color}
            emissive={planet.color}
            emissiveIntensity={1.8}
            roughness={0.1}
            metalness={0.9}
            transparent={false}
            opacity={1.0}
          />
        </mesh>
      )}

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

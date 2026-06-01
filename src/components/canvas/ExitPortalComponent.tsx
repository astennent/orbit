import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ExitPortal, Planet } from '../../types'

interface ExitPortalComponentProps {
  portal: ExitPortal
  planets: Planet[]
}

export function ExitPortalComponent({ portal, planets }: ExitPortalComponentProps) {
  const outerHexRef = useRef<THREE.Mesh>(null!)
  const innerGlowRef = useRef<THREE.Mesh>(null!)
  const innerDiskRef = useRef<THREE.Mesh>(null!)
  const outerDiskRef = useRef<THREE.Mesh>(null!)
  
  const pointsGeomRef = useRef<THREE.BufferGeometry>(null)
  const [hovered, setHovered] = useState<boolean>(false)

  // Dynamically compute the exit portal's warped height (sampling 8 points along its outer radius to find the highest grid edge)
  const portalHeight = useMemo(() => {
    let maxDepth = -Infinity
    const sampleRadius = portal.radius * 1.8 // Outer accretion disk radius

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4
      const sampleX = portal.pos.x + sampleRadius * Math.cos(angle)
      const sampleZ = portal.pos.z + sampleRadius * Math.sin(angle)

      let depth = 0
      for (const p of planets) {
        const dx = sampleX - p.pos.x
        const dz = sampleZ - p.pos.z
        let dist = Math.sqrt(dx * dx + dz * dz)
        if (!p.isGasGiant && dist < p.radius) {
          dist = p.radius
        }
        const pull = (0.2 * p.mass) / (dist + 1.0)
        depth -= pull
      }
      depth = Math.max(-8.0, depth)
      if (depth > maxDepth) {
        maxDepth = depth
      }
    }
    // Add a small safety offset (+0.08) to completely prevent any z-fighting or grid overlaps
    return maxDepth + 0.08
  }, [planets, portal.pos.x, portal.pos.z, portal.radius])

  // Pre-calculate Keplerian particle parameters in useMemo for maximum performance
  const particlesData = useMemo(() => {
    const count = 120
    const angles = new Float32Array(count)
    const radii = new Float32Array(count)
    const speeds = new Float32Array(count)
    const drifts = new Float32Array(count)
    const waves = new Float32Array(count * 2) // [frequency, amplitude]
    const colors = new Float32Array(count * 3) // [R, G, B]
    
    const portalRad = portal.radius
    
    for (let i = 0; i < count; i++) {
      angles[i] = Math.random() * Math.PI * 2
      radii[i] = portalRad * (0.3 + Math.random() * 2.2)
      
      // Keplerian orbit speed: faster near core, slower far out
      const baseSpeed = 1.6 / (radii[i] + 0.1)
      speeds[i] = baseSpeed * (0.85 + Math.random() * 0.3)
      
      // Inward radial suction drift speed
      drifts[i] = portalRad * (0.15 + Math.random() * 0.25)
      
      // Wave parameters for vertical Y waving
      waves[i * 2] = 2.0 + Math.random() * 4.0 // frequency
      waves[i * 2 + 1] = 0.05 + Math.random() * 0.07 // amplitude
      
      // High-fidelity color palette: gold, magenta, electric cyan
      const colorType = Math.random()
      if (colorType < 0.45) {
        // Space Gold
        colors[i * 3] = 1.0     // R
        colors[i * 3 + 1] = 0.82 // G
        colors[i * 3 + 2] = 0.05 // B
      } else if (colorType < 0.78) {
        // Cosmic Magenta / Pink
        colors[i * 3] = 0.95    // R
        colors[i * 3 + 1] = 0.0  // G
        colors[i * 3 + 2] = 0.95 // B
      } else {
        // Electric Plasma Cyan
        colors[i * 3] = 0.0     // R
        colors[i * 3 + 1] = 0.88 // G
        colors[i * 3 + 2] = 1.0  // B
      }
    }
    return { count, angles, radii, speeds, drifts, waves, colors }
  }, [portal.radius])

  const anglesRef = useRef<Float32Array>(particlesData.angles)
  const radiiRef = useRef<Float32Array>(particlesData.radii)

  // Keep references updated on level updates
  useEffect(() => {
    anglesRef.current = particlesData.angles
    radiiRef.current = particlesData.radii
  }, [particlesData])

  // Setup points geometry attributes imperatively on load/level change to guarantee rendering
  useEffect(() => {
    if (pointsGeomRef.current) {
      const geom = pointsGeomRef.current
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particlesData.count * 3), 3))
      geom.setAttribute('color', new THREE.BufferAttribute(particlesData.colors, 3))
    }
  }, [particlesData])

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    
    // Hexagonal deck rotations
    if (outerHexRef.current) {
      outerHexRef.current.rotation.z = elapsed * 0.4
    }
    if (innerGlowRef.current) {
      const scale = 1.0 + Math.sin(elapsed * 4.0) * 0.08
      innerGlowRef.current.scale.set(scale, scale, 1)
    }

    // Counter-rotating accretion halo layers
    if (innerDiskRef.current) {
      innerDiskRef.current.rotation.z = elapsed * 0.6
    }
    if (outerDiskRef.current) {
      outerDiskRef.current.rotation.z = -elapsed * 0.35
    }

    // Swirling inward cosmic telemetry dust particles
    if (pointsGeomRef.current) {
      const geom = pointsGeomRef.current
      const posAttr = geom.getAttribute('position')
      const count = particlesData.count
      
      const angles = anglesRef.current
      const radii = radiiRef.current
      
      const dt = 0.016 // Keep motion consistent and hitch-free
      const portalRad = portal.radius

      for (let i = 0; i < count; i++) {
        angles[i] += particlesData.speeds[i] * dt
        radii[i] -= particlesData.drifts[i] * dt

        // Recycle particles reaching the center back to far boundaries
        if (radii[i] < portalRad * 0.22) {
          radii[i] = portalRad * (1.5 + Math.random() * 1.0)
          angles[i] = Math.random() * Math.PI * 2
        }

        const px = radii[i] * Math.cos(angles[i])
        const pz = radii[i] * Math.sin(angles[i])

        // Vertical Y fluctuation
        const waveFreq = particlesData.waves[i * 2]
        const waveAmp = particlesData.waves[i * 2 + 1]
        const py = Math.sin(radii[i] * waveFreq - elapsed * 5.0) * waveAmp

        posAttr.setXYZ(i, px, py, pz)
      }
      posAttr.needsUpdate = true
    }
  })

  return (
    <group position={[portal.pos.x, portalHeight, portal.pos.z]}>
      {/* Swirling Accretion Disk - Clockwise Inner Gold Halo */}
      <mesh ref={innerDiskRef} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[portal.radius * 0.42, portal.radius * 1.2, 64]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Swirling Accretion Disk - Counter-Clockwise Outer Magenta Halo */}
      <mesh ref={outerDiskRef} position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[portal.radius * 0.75, portal.radius * 1.8, 64]} />
        <meshBasicMaterial
          color="#ff00ff"
          transparent
          opacity={0.10}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cosmic Telemetry Dust Spirals */}
      <points>
        <bufferGeometry ref={pointsGeomRef} />
        <pointsMaterial
          vertexColors
          size={0.11}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Outer Hexagonal Solid Gold Ring */}
      <mesh ref={outerHexRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[portal.radius * 0.85, portal.radius, 6]} />
        <meshStandardMaterial
          color="#ffd700"
          roughness={0.1}
          metalness={0.95}
          emissive="#ffd700"
          emissiveIntensity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sleek inner brass hexagonal deck ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[portal.radius * 0.5, portal.radius * 0.75, 6]} />
        <meshStandardMaterial
          color="#d4af37"
          roughness={0.15}
          metalness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Pulsing Glass Core (Interactive Hover Target) */}
      <mesh 
        ref={innerGlowRef} 
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
        <ringGeometry args={[0, portal.radius * 0.45, 32]} />
        <meshStandardMaterial
          color="#ffe875"
          transparent
          opacity={0.5}
          roughness={0.05}
          metalness={0.2}
          emissive="#ffd700"
          emissiveIntensity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid warm vacuum tube glow aura */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, portal.radius * 1.5, 32]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Immersive 3D Tooltip Overlay */}
      {hovered && (
        <Html position={[0, portal.radius + 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="tooltip-card">
            <span className="badge portal">EXTRACTION LANDING</span>
            <h4>EXTRACTION PORTAL</h4>
            <div><strong>Status:</strong> Active escape gate</div>
            <div style={{ marginTop: '5px', color: 'var(--chrome-dim)', fontSize: '10px' }}>
              Slingshot the probe here to escape. Adds +100% target quota (worth +1 Data Core bonus) to your current data and safely secures all accumulated Data Cores!
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

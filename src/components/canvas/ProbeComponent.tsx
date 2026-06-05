import { useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Probe, Planet } from '../../types'

interface ProbeComponentProps {
  probe: Probe
  gameState: string
  planets: Planet[]
}

export function ProbeComponent({ probe, gameState, planets }: ProbeComponentProps) {
  const [hovered, setHovered] = useState<boolean>(false)

  // Generate geometry for the flight history ribbon with dynamic gravity-well height warping
  // Uses a flat ribbon (quad-strip) mesh instead of WebGL line primitives because
  // linewidth is capped at 1px on most GPUs, making trails invisible.
  const ribbonGeometry = useMemo(() => {
    if (probe.trail.length < 2) return null

    const HALF_WIDTH = 0.05 // Half-width of the ribbon in world units

    const count = probe.trail.length
    // Each segment between two trail points = 2 triangles = 6 indices
    const vertCount = count * 2
    const triCount = (count - 1) * 2

    const positions = new Float32Array(vertCount * 3)
    const colors = new Float32Array(vertCount * 3)
    const indices = new Uint32Array(triCount * 3)

    for (let i = 0; i < count; i++) {
      const pt = probe.trail[i]

      // Compute warped Y height
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
      depth = Math.max(-8.0, depth) + 0.02 // Slight offset above grid

      // Compute perpendicular direction for ribbon width
      let perpX = 0, perpZ = 0
      if (i < count - 1) {
        const next = probe.trail[i + 1]
        const dx = next.x - pt.x
        const dz = next.z - pt.z
        const len = Math.sqrt(dx * dx + dz * dz) || 1
        perpX = -dz / len
        perpZ = dx / len
      } else if (i > 0) {
        const prev = probe.trail[i - 1]
        const dx = pt.x - prev.x
        const dz = pt.z - prev.z
        const len = Math.sqrt(dx * dx + dz * dz) || 1
        perpX = -dz / len
        perpZ = dx / len
      }

      // Left vertex
      const li = i * 2
      positions[li * 3] = pt.x + perpX * HALF_WIDTH
      positions[li * 3 + 1] = depth
      positions[li * 3 + 2] = pt.z + perpZ * HALF_WIDTH

      // Right vertex
      const ri = i * 2 + 1
      positions[ri * 3] = pt.x - perpX * HALF_WIDTH
      positions[ri * 3 + 1] = depth
      positions[ri * 3 + 2] = pt.z - perpZ * HALF_WIDTH

      // Use ink color from trailColors, otherwise fall back to gradient
      let r = 0, g = 0, b = 0
      if (probe.trailColors && probe.trailColors[i]) {
        r = probe.trailColors[i].r
        g = probe.trailColors[i].g
        b = probe.trailColors[i].b
      } else {
        const t = count > 1 ? i / (count - 1) : 1.0
        r = (1 - t) * 0.204
        g = (1 - t) * 0.282
        b = (1 - t) * 0.231
      }
      colors[li * 3] = r; colors[li * 3 + 1] = g; colors[li * 3 + 2] = b
      colors[ri * 3] = r; colors[ri * 3 + 1] = g; colors[ri * 3 + 2] = b
    }

    // Build triangle indices for the quad strip
    for (let i = 0; i < count - 1; i++) {
      const bl = i * 2
      const br = i * 2 + 1
      const tl = (i + 1) * 2
      const tr = (i + 1) * 2 + 1
      const idx = i * 6
      indices[idx] = bl; indices[idx + 1] = tl; indices[idx + 2] = br
      indices[idx + 3] = br; indices[idx + 4] = tl; indices[idx + 5] = tr
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    return geometry
  }, [probe.trail, probe.trailColors, planets])

  // Determine core color based on state
  const getProbeColor = () => {
    if (gameState === 'CRASHED') return '#ff4757' // radioactive danger red
    if (gameState === 'STOPPED') return '#ff9800' // orange warning halt
    if (gameState === 'WIN' || gameState === 'PORTAL_EXIT') return '#00ff9d' // win green
    return '#00e5ff' // default electric cyan
  };

  const probeColor = getProbeColor()

  // Check if probe is currently within any planet's atmosphere (gravitational drag boundary)
  const isInsideAtmosphere = useMemo(() => {
    if (!planets) return false
    return planets.some(planet => {
      const diff = new THREE.Vector3().subVectors(planet.pos, probe.pos)
      diff.y = 0
      return diff.length() < planet.atmosphereRadius
    })
  }, [planets, probe.pos])

  // Dynamically compute the probe's warped height over the space-time grid
  const probeHeight = useMemo(() => {
    let depth = 0
    for (const p of planets) {
      const dx = probe.pos.x - p.pos.x
      const dz = probe.pos.z - p.pos.z
      let dist = Math.sqrt(dx * dx + dz * dz)
      if (!p.isGasGiant && dist < p.radius) {
        dist = p.radius
      }
      const pull = (0.2 * p.mass) / (dist + 1.0)
      depth -= pull
    }
    return Math.max(-8.0, depth)
  }, [planets, probe.pos.x, probe.pos.z])

  return (
    <group>
      {/* Flight trail / history ribbon mesh */}
      {ribbonGeometry && (
        <mesh>
          <primitive object={ribbonGeometry} attach="geometry" />
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Hoverable Main Probe Group positioned at probe.pos */}
      {probe.integrity > 0 && (
        <group
          position={[probe.pos.x, probeHeight, probe.pos.z]}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            setHovered(false)
          }}
        >
          {/* Dynamic searchlight / headlight that travels with the probe to illuminate nearby planets and hazards */}
          <pointLight
            position={[0, 0.5, 0]} // slightly raised to cast beautiful oblique shadows on craters and terrain relief
            intensity={8.0}
            distance={32.0}
            decay={1.5}
            color="#dcf6ff" // Crisp cool white headlight
          />

          {/* Main Probe Body — Polished reflective chrome sphere */}
          <mesh>
            <sphereGeometry args={[0.38, 32, 32]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.05}
              metalness={0.95}
              emissive={probeColor}
              emissiveIntensity={0.15}
            />
          </mesh>

          {/* Telemetry Sensor Ring — Solid glass sensor ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.62, 32]} />
            <meshStandardMaterial
              color={probeColor}
              transparent
              opacity={0.4}
              roughness={0.1}
              metalness={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Magnet collection range ring indicator */}
          {probe.magnetRadius > 0 && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
              <ringGeometry args={[probe.magnetRadius - 0.04, probe.magnetRadius + 0.04, 64]} />
              <meshStandardMaterial
                color="#a0a0ff"
                transparent
                opacity={0.35}
                roughness={0.2}
                metalness={0.9}
                emissive="#7070ff"
                emissiveIntensity={1.2}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Active Translucent Glowing Plasma Shield Bubble Mesh */}
          {probe.shieldDuration > 0 && probe.shieldLevel > 0 && (
            <mesh>
              <sphereGeometry args={[0.55, 32, 32]} />
              <meshStandardMaterial
                color="#00e5ff"
                transparent
                opacity={0.35}
                roughness={0.15}
                metalness={0.1}
                emissive="#00e5ff"
                emissiveIntensity={1.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Immersive 3D Tooltip Overlay */}
          {hovered && (
            <Html position={[0, 0.8, 0]} center style={{ pointerEvents: 'none' }}>
              <div className="tooltip-card">
                <span className="badge data" style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', borderColor: '#00e5ff' }}>
                  TELEMETRY PROBE
                </span>
                {isInsideAtmosphere && (
                  <span className="badge hazard" style={{ background: 'rgba(0, 255, 157, 0.15)', color: 'var(--glow-green)', borderColor: 'var(--glow-green)', marginLeft: '6px' }}>
                    10x ACCEL
                  </span>
                )}
                <h4>HARVEST PROBE</h4>
                <div><strong>Status:</strong> {gameState}</div>
                <div><strong>Velocity:</strong> {(new THREE.Vector3(probe.vel.x, 0, probe.vel.z).length() * 10).toFixed(1)} km/s</div>
                <div><strong>Telemetry Data:</strong> {probe.data.toFixed(0)} Collected</div>
                <div><strong>Magnet Radius:</strong> {probe.magnetRadius.toFixed(1)} km</div>
                {probe.shieldDuration > 0 && probe.shieldLevel > 0 && (
                  <div style={{ color: '#00e5ff', fontWeight: 'bold', marginTop: '2px' }}>
                    <strong>Plasma Shield:</strong> {probe.shieldLevel} SP ({probe.shieldDuration.toFixed(1)}s)
                  </div>
                )}

                {isInsideAtmosphere && (
                  <div style={{
                    color: 'var(--glow-green)',
                    fontWeight: 'bold',
                    fontSize: '9.5px',
                    marginTop: '5px',
                    textShadow: '0 0 4px rgba(0, 255, 157, 0.5)'
                  }}>
                    ⚡ ATMOSPHERIC HARVEST ACTIVE (10x!)
                  </div>
                )}

                <div style={{ marginTop: '5px', color: 'var(--chrome-dim)', fontSize: '10px' }}>
                  Collects telemetry data over time while in flight. Watch fuel reserves and gravitational corridors!
                </div>
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  )
}


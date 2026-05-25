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

  // Generate geometry for the flight history ribbon
  const lineGeometry = useMemo(() => {
    if (probe.trail.length < 2) return null
    
    // Extract x, y, z floats for the BufferAttribute
    const positions = new Float32Array(probe.trail.flatMap(p => [p.x, p.y, p.z]))
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [probe.trail])

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

  return (
    <group>
      {/* Flight trail / history solid neon ribbon */}
      {lineGeometry && (
        <line>
          <primitive object={lineGeometry} attach="geometry" />
          <lineBasicMaterial
            color={probeColor}
            linewidth={3}
            transparent
            opacity={0.75}
          />
        </line>
      )}

      {/* Hoverable Main Probe Group positioned at probe.pos */}
      <group 
        position={probe.pos}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
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
    </group>
  )
}


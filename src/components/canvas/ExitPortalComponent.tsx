import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ExitPortal } from '../../types'

interface ExitPortalComponentProps {
  portal: ExitPortal
}

export function ExitPortalComponent({ portal }: ExitPortalComponentProps) {
  const outerHexRef = useRef<THREE.Mesh>(null!)
  const innerGlowRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<boolean>(false)

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    
    // Rotating outer ring
    if (outerHexRef.current) {
      outerHexRef.current.rotation.z = elapsed * 0.4
    }
    
    // Pulsing inner glow scale
    if (innerGlowRef.current) {
      const scale = 1.0 + Math.sin(elapsed * 4.0) * 0.08
      innerGlowRef.current.scale.set(scale, scale, 1)
    }
  })

  return (
    <group position={portal.pos}>
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

import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Planet } from '../types'

interface PlanetComponentProps {
  planet: Planet
}

export function PlanetComponent({ planet }: PlanetComponentProps) {
  const coreRef = useRef<THREE.Mesh>(null!)
  const atmoRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<boolean>(false)

  // Procedurally generate a detailed 512x256 equirectangular canvas texture for each planet
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 1. Solid background base color
    ctx.fillStyle = planet.color
    ctx.fillRect(0, 0, 512, 256)

    if (planet.isGasGiant) {
      // ── GASEOUS PLANET TEXTURE (Latitudinal Bands & Great Red Spot Storms) ──
      const numBands = 9
      for (let i = 0; i < numBands; i++) {
        const y = (256 / numBands) * i + Math.random() * 8 - 4
        const height = (256 / numBands) * (0.35 + Math.random() * 0.45)
        
        const grad = ctx.createLinearGradient(0, y, 0, y + height)
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.28)')
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)')
        
        ctx.fillStyle = grad
        ctx.fillRect(0, y, 512, height)
      }

      for (let i = 0; i < 4; i++) {
        const cx = Math.random() * 512
        const cy = 40 + Math.random() * 176
        const r = 16 + Math.random() * 26

        const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r)
        radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.38)')
        radGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.22)')
        radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.fillStyle = radGrad
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      for (let i = 0; i < 220; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 256
        const size = 1 + Math.random() * 2.5
        ctx.fillRect(x, y, size, size)
      }
    } else {
      // ── ROCKY PLANET TEXTURE (Tectonic Plates, Fractures & 3D Shaded Craters) ──
      // 1. Draw craggy landmass patches/continent outlines
      for (let i = 0; i < 8; i++) {
        const cx = Math.random() * 512
        const cy = Math.random() * 256
        const r = 40 + Math.random() * 75
        const radGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, r)
        radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.32)') // Valley shadow
        radGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.08)') // Highland glow
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = radGrad
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // 2. Draw craggy tectonic fractal faults/crevices
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)'
      ctx.lineWidth = 1.6
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        let px = Math.random() * 512
        let py = Math.random() * 256
        ctx.moveTo(px, py)
        for (let j = 0; j < 5; j++) {
          px += (Math.random() * 60 - 30)
          py += (Math.random() * 40 - 20)
          ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // 3. Draw procedural impact craters with light-shadow rim offsets
      for (let i = 0; i < 16; i++) {
        const cx = Math.random() * 512
        const cy = Math.random() * 256
        const r = 3 + Math.random() * 11

        // Shadow side offset (bottom-right shadow cast)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
        ctx.beginPath()
        ctx.arc(cx + 0.8, cy + 0.8, r, 0, Math.PI * 2)
        ctx.fill()

        // Highlight side offset (top-left rim sun catch)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
        ctx.beginPath()
        ctx.arc(cx - 0.8, cy - 0.8, r, 0, Math.PI * 2)
        ctx.fill()

        // Inner crater basin floor depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
        ctx.beginPath()
        ctx.arc(cx, cy, r - 1.2, 0, Math.PI * 2)
        ctx.fill()
      }

      // 4. Add fine high-frequency rocky noise/pebbles specks
      for (let i = 0; i < 750; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 256
        const shade = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'
        ctx.fillStyle = shade
        ctx.fillRect(x, y, 1, 1)
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [planet.color, planet.isGasGiant])

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
          color={planet.color}
          map={texture || undefined}
          bumpMap={texture || undefined}
          bumpScale={0.05}
          roughness={planet.isGasGiant ? 0.45 : 0.65} // Matte finish for rock, slightly more lustrous for gas bands
          metalness={planet.isGasGiant ? 0.15 : 0.05}
          emissive={planet.color}
          emissiveIntensity={0.15}
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
                <strong style={{ color: '#2ed573', display: 'block', marginTop: '3px' }}>Gaseous Core: passes through safely with no damage!</strong>
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

import { useRef, useMemo, useEffect, useState, Suspense } from 'react'
import { Canvas, ThreeEvent, useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Planet, ExitPortal, Probe, Beacon, GameState, DataToast, Asteroid, Explosion, Rocket } from '../../types'
import { PlanetComponent } from './PlanetComponent'
import { ExitPortalComponent } from './ExitPortalComponent'
import { ProbeComponent } from './ProbeComponent'
import { TrajectoryLine } from './TrajectoryLine'
import { AsteroidComponent } from './AsteroidComponent'
import { Nebula } from './Nebula'
import { ExplosionEffect } from './ExplosionEffect'
import { RocketComponent } from './RocketComponent'
import { LAUNCH_SPEED_MULTIPLIER, OUT_OF_BOUNDS_LIMIT } from '../../constants'
import { getBeaconColor } from '../../utils/statusFormatters'

interface CameraControllerProps {
  probe: Probe
  gameState: GameState
}

function CameraController({ probe, gameState }: CameraControllerProps) {
  const { camera, gl } = useThree()
  const zoomLevelRef = useRef<number>(1.0)
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const baseOffset = useMemo(() => new THREE.Vector3(0, 18, 22), [])
  const wasdOffset = useRef(new THREE.Vector3(0, 0, 0))
  const activeKeys = useRef<{ [key: string]: boolean }>({})

  // Reset pan offset on level / state reset to ensure camera focuses cleanly on the launchpad
  useEffect(() => {
    if (gameState === 'IDLE' || gameState === 'LAUNCHING') {
      wasdOffset.current.set(0, 0, 0)
    }
  }, [gameState])

  // Listen to keyboard events to track keys pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        activeKeys.current[key] = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        activeKeys.current[key] = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Listen to wheel events on the canvas element to zoom in and out
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomSpeed = 0.05
      zoomLevelRef.current += e.deltaY * zoomSpeed * 0.01
      // Clamp zoom level to prevent zoom in too close or out too far
      zoomLevelRef.current = Math.max(0.4, Math.min(2.5, zoomLevelRef.current))
    }

    const canvasEl = gl.domElement
    canvasEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      canvasEl.removeEventListener('wheel', handleWheel)
    }
  }, [gl])

  useFrame((_, delta) => {
    if (!camera) return

    let targetCenter = new THREE.Vector3(0, 0, 0)
    const isFlight = gameState === 'FLIGHT'
    const isPostRun = gameState === 'CRASHED' || gameState === 'STOPPED' || gameState === 'WIN' || gameState === 'PORTAL_EXIT'

    if (isFlight) {
      // Smoothly lerp wasdOffset back to zero when launched to refocus on the probe
      wasdOffset.current.lerp(new THREE.Vector3(0, 0, 0), 0.08)
    } else {
      // Apply keyboard movement when not in flight (IDLE, LAUNCHING, or Post-Run outcomes)
      const keys = activeKeys.current
      let dx = 0
      let dz = 0
      if (keys['w'] || keys['arrowup']) dz -= 1
      if (keys['s'] || keys['arrowdown']) dz += 1
      if (keys['a'] || keys['arrowleft']) dx -= 1
      if (keys['d'] || keys['arrowright']) dx += 1

      if (dx !== 0 || dz !== 0) {
        // Move with a speed of 18 units per second, scaled by current zoom level so movement feels natural at all zooms!
        const moveSpeed = 18 * zoomLevelRef.current
        const moveDir = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(moveSpeed * delta)
        wasdOffset.current.add(moveDir)
      }
    }

    // Set target center: follow the probe (if launched / post-run outcomes) + wasdOffset, or just wasdOffset if still at launchpad
    if (isFlight || isPostRun) {
      targetCenter.copy(probe.pos).add(wasdOffset.current)
    } else {
      targetCenter.copy(wasdOffset.current)
    }

    // Desired camera position: center + baseOffset scaled by zoom level
    const desiredCamPos = new THREE.Vector3()
      .copy(baseOffset)
      .multiplyScalar(zoomLevelRef.current)
      .add(targetCenter)

    // Smoothly lerp camera position
    camera.position.lerp(desiredCamPos, 0.08)

    // Smoothly lerp look-at point
    currentLookAt.current.lerp(targetCenter, 0.08)
    camera.lookAt(currentLookAt.current)
  })

  return null
}

interface BeaconComponentProps {
  beacon: Beacon
  isHovered: boolean
  setHoveredBeaconId: (id: string | null) => void
}

function BeaconComponent({ beacon: b, isHovered, setHoveredBeaconId }: BeaconComponentProps) {
  const color = getBeaconColor(b.value)

  return (
    <group
      position={b.pos}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredBeaconId(b.id)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHoveredBeaconId(null)
      }}
    >
      {/* Outer translucent glass capsule shell */}
      <mesh>
        <sphereGeometry args={[b.radius * 0.95, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.25}
          roughness={0.02}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid nucleus core */}
      <mesh>
        <sphereGeometry args={[b.radius * 0.42, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.05}
          metalness={0.95}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Thin chrome equator ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[b.radius * 0.9, b.radius * 0.98, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.05}
          metalness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dynamic scaled Hover Tooltip overlay */}
      {isHovered && (
        <Html position={[0, b.radius + 1.8, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="tooltip-card" style={{ borderColor: color, boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 20px ${color}40` }}>
            <span className="badge data" style={{ background: color, color: '#000', textShadow: 'none', fontWeight: 'bold' }}>
              {b.value >= 35 ? 'PLANETARY BEACON' : 'DEEP SPACE BEACON'}
            </span>
            <h4>DATA BEACON</h4>
            <div><strong>Value:</strong> +{b.value} Data</div>
            <div style={{ marginTop: '5px', color: 'var(--chrome-dim)', fontSize: '10px' }}>
              {b.value >= 35
                ? 'High-density beacon trapped inside the gravity well. High risk, high telemetry capture!'
                : 'Low-density telemetry node drifting safely in the void.'}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

interface GameCanvasProps {
  gameState: GameState
  level: number
  probe: Probe
  planets: Planet[]
  portal: ExitPortal
  beacons: Beacon[]
  asteroids: Asteroid[]
  rockets: Rocket[]
  aimActive: boolean
  aimStartPos: THREE.Vector3
  aimVel: THREE.Vector3 | null
  onAimStart: (worldPoint: THREE.Vector3) => void
  onAimMove: (worldPoint: THREE.Vector3) => void
  onAimRelease: () => void
  toasts: DataToast[]
  explosions: Explosion[]
  onExplosionComplete: (id: string) => void
}

export function GameCanvas({
  gameState,
  level,
  probe,
  planets,
  portal,
  beacons,
  asteroids,
  rockets,
  aimActive,
  aimStartPos,
  aimVel,
  onAimStart,
  onAimMove,
  onAimRelease,
  toasts,
  explosions,
  onExplosionComplete
}: GameCanvasProps) {
  const dragPlaneRef = useRef<THREE.Mesh>(null!)
  const [hoveredBeaconId, setHoveredBeaconId] = useState<string | null>(null)
  const [hoveredLaunchPad, setHoveredLaunchPad] = useState<boolean>(false)

  // Handle pointer down on the invisible drag plane
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (gameState !== 'IDLE' && gameState !== 'LAUNCHING') return
    e.stopPropagation()
      // Capture the pointer to receive events even outside the canvas boundaries
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    onAimStart(e.point)
  }

  // Handle pointer drag
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!aimActive) return
    e.stopPropagation()
    onAimMove(e.point)
  }

  // Handle pointer up (launch!)
  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!aimActive) return
    e.stopPropagation()
      ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    onAimRelease()
  }

  // Generates custom starry background vertices
  const starPositions = useMemo(() => {
    const coords = []
    const count = 1200 // Denser star count to cover the wider perimeter
    const radius = 180.0 // Extends well past the 80-radius boundary to prevent screen-edge clipping
    for (let i = 0; i < count; i++) {
      // Spread stars across the X and Z axes (the gameplay plane)
      const x = (Math.random() - 0.5) * radius * 2
      const z = (Math.random() - 0.5) * radius * 2
      // Position them below the gameplay plane (Y depth) to form a true background starfield
      const y = -12.0 - Math.random() * 25.0

      coords.push(x, y, z)
    }
    return new Float32Array(coords)
  }, [])

  const pullVector = useMemo(() => {
    if (!aimVel) return null
    // Firing velocity is directed opposite to drag pull. Let's scale back to visual units
    return aimVel.clone().multiplyScalar(-1 / (LAUNCH_SPEED_MULTIPLIER * 22))
  }, [aimVel])

  const pullAngle = useMemo(() => {
    if (!pullVector) return 0
    return Math.atan2(pullVector.x, pullVector.z)
  }, [pullVector])

  const powerSegments = useMemo(() => {
    if (!pullVector) return []
    const dir = pullVector.clone().normalize()
    const length = pullVector.length()
    const maxPull = 12.0
    const N = 16 // More segments for a detailed retro VU-meter resolution

    const activeCount = Math.ceil((length / maxPull) * N)
    const segList = []

    for (let i = 0; i < activeCount; i++) {
      // Calculate individual segment lengths to be much squatter (45% of spacing)
      const segLength = (length / activeCount) * 0.45
      const distance = (i + 0.5) * (length / activeCount)
      const pos = aimStartPos.clone().addScaledVector(dir, distance)

      // Sleeker flared widths for a tighter, more precise wedge profile
      const width = 0.16 + i * 0.085

      // Custom color-coded indicators representing energy charging in fine steps
      let color = '#ffd700' // Yellow (low power: index 0-4)
      if (i >= 11) {
        color = '#ff4757' // Red (high power warning: index 11-15)
      } else if (i >= 5) {
        color = '#ff9800' // Orange (moderate power: index 5-10)
      }

      segList.push({
        id: `power-seg-${i}`,
        pos,
        width,
        segLength,
        color
      })
    }

    return segList
  }, [pullVector, aimStartPos])

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 18, 22], fov: 50, near: 0.1, far: 10000 }}
        orthographic={false}
      >
        <CameraController probe={probe} gameState={gameState} />
        {/* Deep space color */}
        <color attach="background" args={['#020810']} />

        {/* Volumetric background clouds */}
        <Suspense fallback={null}>
          <Nebula key={level} />
        </Suspense>

        {/* Raygun Gothic lighting — warm key light + cold fill + global sunlight */}
        <ambientLight intensity={0.65} color="#b0c8f0" />
        {/* Powerful global sunlight to fully illuminate the entire sandbox map */}
        <directionalLight position={[30, 50, 30]} intensity={2.8} color="#ffffff" />

        {/* Beautiful Particle Starfield */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[starPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ffffff"
            size={0.15}
            transparent
            opacity={0.7}
          />
        </points>

        {/* Launch Pad Group */}
        <group
          position={aimStartPos}
          onPointerOver={(e) => {
            if (gameState === 'IDLE' || gameState === 'LAUNCHING') {
              e.stopPropagation()
              setHoveredLaunchPad(true)
            }
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            setHoveredLaunchPad(false)
          }}
        >
          {/* Launch Pad — Solid chrome diamond crosshair ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.65, 0.82, 4]} />
            <meshStandardMaterial
              color="#c0d8f0"
              roughness={0.1}
              metalness={0.95}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Inner gold bullseye dot */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.18, 32]} />
            <meshStandardMaterial
              color="#ffd700"
              roughness={0.05}
              metalness={0.9}
              emissive="#ffd700"
              emissiveIntensity={0.4}
            />
          </mesh>

          {/* Immersive 3D Tooltip Overlay */}
          {hoveredLaunchPad && (gameState === 'IDLE' || gameState === 'LAUNCHING') && (
            <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
              <div className="tooltip-card">
                <span className="badge portal">LAUNCH MODULE</span>
                <h4>SLINGSHOT RETORT</h4>
                <div><strong>Status:</strong> Charged & Ready</div>
                <div style={{ marginTop: '5px', color: 'var(--chrome-dim)', fontSize: '10px' }}>
                  Click and drag backwards to configure the slingshot force vector. Release to lock-in trajectory, then press the <strong>SPACEBAR</strong> to initiate ignition!
                </div>
              </div>
            </Html>
          )}
        </group>

        {/* Floating Beacons — Circled flat numbers (laid coin) */}
        {beacons.map(b => {
          if (b.collected) return null
          const isHovered = hoveredBeaconId === b.id
          return (
            <BeaconComponent
              key={b.id}
              beacon={b}
              isHovered={isHovered}
              setHoveredBeaconId={setHoveredBeaconId}
            />
          )
        })}

        {/* Celestial Attractors (Planets) — Wrapped in Suspense to safely pre-load static texture maps */}
        <Suspense fallback={null}>
          {planets.map(p => (
            <PlanetComponent key={p.id} planet={p} />
          ))}
        </Suspense>

        {/* Scattered Asteroids — Wrapped in Suspense to safely pre-load static texture maps */}
        <Suspense fallback={null}>
          {asteroids && asteroids.map(a => (
            a.health > 0 && <AsteroidComponent key={a.id} asteroid={a} />
          ))}
        </Suspense>

        {/* Homing Rocket Missiles */}
        {rockets && rockets.map(r => (
          <RocketComponent key={r.id} rocket={r} />
        ))}

        {/* The Target Exit Portal */}
        <ExitPortalComponent portal={portal} />

        {/* Out of Bounds Red Warning Ring */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[OUT_OF_BOUNDS_LIMIT - 0.25, OUT_OF_BOUNDS_LIMIT + 0.25, 128]} />
          <meshStandardMaterial
            color="#ff3344"
            roughness={0.2}
            metalness={0.95}
            emissive="#ff0022"
            emissiveIntensity={1.8}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Predictive Trajectory Line */}
        <TrajectoryLine
          startPos={aimStartPos}
          startVel={aimVel}
          planets={planets}
          gameState={gameState}
        />

        {/* Slingshot Visualizer — Curved force wedge / segmented power pyramid */}
        {(gameState === 'IDLE' || gameState === 'LAUNCHING') && aimVel && powerSegments.map(seg => (
          <group key={seg.id} position={seg.pos} rotation={[0, pullAngle, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[seg.width, seg.segLength]} />
              <meshStandardMaterial
                color={seg.color}
                roughness={0.1}
                metalness={0.1}
                emissive={seg.color}
                emissiveIntensity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}

        {/* The active Probe */}
        {gameState !== 'IDLE' && gameState !== 'LAUNCHING' && (
          <ProbeComponent probe={probe} gameState={gameState} planets={planets} />
        )}

        {/* Dynamic hardware-accelerated particle explosions on collisions */}
        {explosions.map(expl => (
          <ExplosionEffect
            key={expl.id}
            position={expl.pos}
            color={expl.color}
            count={expl.count}
            onComplete={() => onExplosionComplete(expl.id)}
          />
        ))}

        {/* Immersive 3D Floating Data Toasts */}
        {toasts.map(toast => (
          <group key={toast.id} position={toast.pos}>
            <Html center>
              <div
                className="data-toast"
                style={{
                  color: toast.color || 'var(--glow-green)',
                  textShadow: toast.color
                    ? `0 0 6px ${toast.color}, 0 0 12px ${toast.color}60`
                    : '0 0 6px rgba(0, 255, 157, 0.8), 0 0 12px rgba(0, 255, 157, 0.4)'
                }}
              >
                {toast.text}
              </div>
            </Html>
          </group>
        ))}

        {/* Large invisible raycasting background plane for intercepting pointer aims */}
        <mesh
          ref={dragPlaneRef}
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Canvas>
    </div>
  )
}

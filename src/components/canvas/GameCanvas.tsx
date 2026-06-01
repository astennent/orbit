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
  planets: Planet[]
}

function BeaconComponent({ beacon: b, isHovered, setHoveredBeaconId, planets }: BeaconComponentProps) {
  const color = getBeaconColor(b.value)

  // Dynamically compute the exit portal's warped height and grid normal vector to tilt orthogonal to the sloped grid
  const orientation = useMemo(() => {
    const eps = 0.05
    const x = b.pos.x
    const z = b.pos.z

    const getDepthAt = (tx: number, tz: number) => {
      let depth = 0
      for (const p of planets) {
        const dx = tx - p.pos.x
        const dz = tz - p.pos.z
        let dist = Math.sqrt(dx * dx + dz * dz)
        if (!p.isGasGiant && dist < p.radius) {
          dist = p.radius
        }
        const pull = (0.2 * p.mass) / (dist + 1.0)
        depth -= pull
      }
      return Math.max(-8.0, depth)
    }

    const hCenter = getDepthAt(x, z)
    const hX = getDepthAt(x + eps, z)
    const hZ = getDepthAt(x, z + eps)

    const dhdx = (hX - hCenter) / eps
    const dhdz = (hZ - hCenter) / eps

    // Normal vector is perpendicular to tangent vectors: N = (-dhdx, 1, -dhdz)
    const normal = new THREE.Vector3(-dhdx, 1.0, -dhdz).normalize()

    // Rotate standard up vector (0, 1, 0) to align with normal
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal)

    return { height: hCenter, quaternion }
  }, [planets, b.pos.x, b.pos.z])

  // Mathematically generate a clean 3D teardrop/droplet geometry via Lathe profile
  const dropletGeometry = useMemo(() => {
    const points = []
    const segments = 12
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      // Teardrop profile curve: y from -0.38 to 0.8
      const y = -0.38 + t * 1.18
      // Fat base, pinched top
      const r = Math.sin(t * Math.PI) * (1.15 - t) * 0.45
      points.push(new THREE.Vector2(r, y))
    }
    // 12 radial segments for a beautiful low-poly gem-like faceted droplet!
    return new THREE.LatheGeometry(points, 12)
  }, [])

  const scaleX = b.radius * 1.85
  const scaleY = b.radius * 2.15

  // To make the base of the droplet (y = -0.38 locally) sit exactly at local Y = 0 (grid surface)
  const yOffset = 0.38 * scaleY

  return (
    <group
      position={[b.pos.x, orientation.height, b.pos.z]}
      quaternion={orientation.quaternion}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredBeaconId(b.id)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHoveredBeaconId(null)
      }}
    >
      {/* Fake light: glowing circular shadow projected flat on the grid below the stem */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, b.radius * 1.0, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glassy, metallic 3D faceted low-poly droplet */}
      <mesh
        geometry={dropletGeometry}
        position={[0, yOffset, 0]}
        scale={[scaleX, scaleY, scaleX]}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.08}
          metalness={0.85}
          emissive={color}
          emissiveIntensity={0.65}
          transparent={true}
          opacity={0.8}
          flatShading={true}
        />
      </mesh>

      {/* Dynamic scaled Hover Tooltip overlay */}
      {isHovered && (
        <Html position={[0, yOffset + scaleY * 0.9, 0]} center style={{ pointerEvents: 'none' }}>
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

interface WarpedSpaceGridProps {
  planets: Planet[]
}

function WarpedSpaceGrid({ planets }: WarpedSpaceGridProps) {

  const geometry = useMemo(() => {
    // 140x140 area, 200x200 segments (ultra-high granularity wireframe backdrop)
    const geo = new THREE.PlaneGeometry(140, 140, 200, 200)
    const posAttr = geo.attributes.position

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const y = posAttr.getY(i) // original Y in PlaneGeometry

      // 1. Horizontally warp coordinates towards planet centers to adaptively cluster granularity
      let warpedX = x
      let warpedY = y

      for (const p of planets) {
        const dx = p.pos.x - x
        const dy = -p.pos.z - y // PlaneGeometry Y increases upwards in X-Y plane, so we map to Z
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Smooth horizontal pull: strongest near the planet, decays quickly outside (increased strength!)
        const pullStrength = 0.42 * Math.min(0.65, (p.mass * 0.58) / (dist * dist + 8.0))
        warpedX += dx * pullStrength
        warpedY += dy * pullStrength
      }

      // 2. Project any vertices that lie inside solid rocky cores exactly onto their boundaries
      // This completely prevents grid lines from cutting across the flat top face of the core cylinders!
      for (const p of planets) {
        if (p.isGasGiant) continue
        const dx = warpedX - p.pos.x
        const dy = warpedY - (-p.pos.z)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < p.radius) {
          const scale = (p.radius * 1.002) / (dist + 0.0001)
          warpedX = p.pos.x + dx * scale
          warpedY = -p.pos.z + dy * scale
        }
      }

      // Write horizontally warped coordinates back so grid lines visually bend ("space contraction lensing")
      posAttr.setX(i, warpedX)
      posAttr.setY(i, warpedY)

      // 3. Compute depth based on warped coordinates
      let depth = 0
      for (const p of planets) {
        const dx = warpedX - p.pos.x
        const dz = -warpedY - p.pos.z
        let dist = Math.sqrt(dx * dx + dz * dz)

        // Clamp distance inside solid planet's radius to flatten grid bottoms
        if (!p.isGasGiant && dist < p.radius) {
          dist = p.radius
        }

        // General relativity gravity potential
        const pull = (0.2 * p.mass) / (dist + 1.0)
        depth -= pull
      }

      // Clamp max depth to keep grid within neat vertical clearance limits
      depth = Math.max(-8.0, depth)

      // Set the Z coordinate of PlaneGeometry (which is Y in our XZ world space after rotation)
      posAttr.setZ(i, depth)
    }

    geo.computeVertexNormals()
    return geo
  }, [planets])

  const gridLinesGeometry = useMemo(() => {
    // 200 widthSegments and 200 heightSegments = 201x201 vertices.
    const segmentsX = 200
    const segmentsY = 200
    const posAttr = geometry.attributes.position

    const linePoints: number[] = []

    // 1. Add horizontal line segments (connect vertex (col, row) to (col + 1, row))
    for (let r = 0; r <= segmentsY; r++) {
      for (let c = 0; c < segmentsX; c++) {
        const idx1 = r * (segmentsX + 1) + c
        const idx2 = idx1 + 1

        linePoints.push(posAttr.getX(idx1), posAttr.getY(idx1), posAttr.getZ(idx1))
        linePoints.push(posAttr.getX(idx2), posAttr.getY(idx2), posAttr.getZ(idx2))
      }
    }

    // 2. Add vertical line segments (connect vertex (col, row) to (col, row + 1))
    for (let c = 0; c <= segmentsX; c++) {
      for (let r = 0; r < segmentsY; r++) {
        const idx1 = r * (segmentsX + 1) + c
        const idx2 = (r + 1) * (segmentsX + 1) + c

        linePoints.push(posAttr.getX(idx1), posAttr.getY(idx1), posAttr.getZ(idx1))
        linePoints.push(posAttr.getX(idx2), posAttr.getY(idx2), posAttr.getZ(idx2))
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePoints), 3))
    return geo
  }, [geometry])

  return (
    <group>
      {/* Solid warped dark green terrain with flat shading */}
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <meshStandardMaterial
          color="#cde1d4"
          roughness={0.7}
          metalness={0.1}
          flatShading={true}
          transparent={false}
          opacity={1.0}
        />
      </mesh>

      {/* Retro neon wireframe grid overlay on top of the dark green terrain - Quads only (no diagonals!) */}
      <lineSegments geometry={gridLinesGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <lineBasicMaterial
          color="#003b41"
          transparent
          opacity={0.26}
          depthWrite={false}
        />
      </lineSegments>
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

  // Dynamically calculate Launch Pad height using grid gravity equation
  const launchPadHeight = useMemo(() => {
    let depth = 0
    for (const p of planets) {
      const dx = aimStartPos.x - p.pos.x
      const dz = aimStartPos.z - p.pos.z
      let dist = Math.sqrt(dx * dx + dz * dz)
      if (!p.isGasGiant && dist < p.radius) {
        dist = p.radius
      }
      const pull = (0.2 * p.mass) / (dist + 1.0)
      depth -= pull
    }
    return Math.max(-8.0, depth)
  }, [planets, aimStartPos.x, aimStartPos.z])

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

      // Calculate depth at pos.x and pos.z
      let depth = 0
      for (const p of planets) {
        const dx = pos.x - p.pos.x
        const dz = pos.z - p.pos.z
        let dist = Math.sqrt(dx * dx + dz * dz)
        if (!p.isGasGiant && dist < p.radius) {
          dist = p.radius
        }
        const pull = (0.2 * p.mass) / (dist + 1.0)
        depth -= pull
      }
      pos.y = Math.max(-8.0, depth) + 0.02 // Offset slightly to sit flush above grid

      segList.push({
        id: `power-seg-${i}`,
        pos,
        width,
        segLength,
        color
      })
    }

    return segList
  }, [pullVector, aimStartPos, planets])

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
        {/* Large central point light to beautifully illuminate the green grid with a wide radial falloff */}
        <pointLight position={[0, 16, 0]} intensity={4.5} distance={150} decay={1.2} color="#f2fff5" />

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

        {/* 3D Warped Gravity-Well space-time grid */}
        <Suspense fallback={null}>
          <WarpedSpaceGrid planets={planets} />
        </Suspense>

        {/* Launch Pad Group */}
        <group
          position={[aimStartPos.x, launchPadHeight + 0.02, aimStartPos.z]}
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
              planets={planets}
            />
          )
        })}

        {/* Celestial Attractors (Planets) — Wrapped in Suspense to safely pre-load static texture maps */}
        <Suspense fallback={null}>
          {planets.map(p => (
            <PlanetComponent key={p.id} planet={p} planets={planets} />
          ))}
        </Suspense>

        {/* Scattered Asteroids — Wrapped in Suspense to safely pre-load static texture maps */}
        <Suspense fallback={null}>
          {asteroids && asteroids.map(a => (
            a.health > 0 && <AsteroidComponent key={a.id} asteroid={a} planets={planets} />
          ))}
        </Suspense>

        {/* Homing Rocket Missiles */}
        {rockets && rockets.map(r => (
          <RocketComponent key={r.id} rocket={r} planets={planets} />
        ))}

        {/* The Target Exit Portal */}
        <ExitPortalComponent portal={portal} planets={planets} />

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
        {explosions.map(expl => {
          let depth = 0
          for (const p of planets) {
            const dx = expl.pos.x - p.pos.x
            const dz = expl.pos.z - p.pos.z
            let dist = Math.sqrt(dx * dx + dz * dz)
            if (!p.isGasGiant && dist < p.radius) {
              dist = p.radius
            }
            const pull = (0.2 * p.mass) / (dist + 1.0)
            depth -= pull
          }
          const explosionHeight = Math.max(-8.0, depth)
          const warpedPos = new THREE.Vector3(expl.pos.x, explosionHeight, expl.pos.z)

          return (
            <ExplosionEffect
              key={expl.id}
              position={warpedPos}
              color={expl.color}
              count={expl.count}
              onComplete={() => onExplosionComplete(expl.id)}
            />
          )
        })}

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

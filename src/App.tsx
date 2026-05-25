import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GameState, UpgradeId, UpgradeEntry } from './types'
import { GameCanvas } from './components/GameCanvas'
import { generatePlanets, generateExitPortal, generateBeacons, generateAsteroids } from './utils/levelGenerator'
import { ShopOverlay } from './components/ShopOverlay'
import { TelemetryPanel } from './components/TelemetryPanel'
import { BuildSpecsPanel } from './components/BuildSpecsPanel'
import { ObjectivesPanel } from './components/ObjectivesPanel'
import { LaunchControlPanel } from './components/LaunchControlPanel'
import { OutcomeBanner } from './components/OutcomeBanner'
import { usePhysicsLoop } from './hooks/usePhysicsLoop'
import { useSlingshotControls } from './hooks/useSlingshotControls'
import { getStatusDisplay } from './utils/statusFormatters'
import { GRAVITATIONAL_CONSTANT, SECTOR_QUOTA } from './constants'
import { UPGRADE_REGISTRY } from './constants/upgrades'

export default function App() {
  // --- Core Game State React Hooks ---
  const [gameState, setGameState] = useState<GameState>('IDLE')
  
  const [dataCores, setDataCores] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('orbit_data_cores')
      return saved ? Math.min(100, parseInt(saved, 10)) : 0
    } catch (e) {
      return 0
    }
  })

  const [moduleSlots, setModuleSlots] = useState<(UpgradeId | null)[]>(() => {
    try {
      const saved = localStorage.getItem('orbit_module_slots')
      return saved ? JSON.parse(saved) : [null, null, null, null, null, null]
    } catch (e) {
      return [null, null, null, null, null, null]
    }
  })

  const [hackSlots, setHackSlots] = useState<(UpgradeId | null)[]>(() => {
    try {
      const saved = localStorage.getItem('orbit_hack_slots')
      return saved ? JSON.parse(saved) : [null, null]
    } catch (e) {
      return [null, null]
    }
  })

  const [level, setLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('orbit_level')
      return saved ? Math.max(1, parseInt(saved, 10)) : 1
    } catch (e) {
      return 1
    }
  })

  // Derive all owned upgrades list for back-compat with physics loops
  const purchasedUpgrades = [
    ...moduleSlots.filter((id): id is UpgradeId => id !== null),
    ...hackSlots.filter((id): id is UpgradeId => id !== null)
  ]
  
  const aimStartPos = useRef(new THREE.Vector3(-12, 0, 5)).current

  // Shared initial sector matching loaded level
  const [initialSector] = useState(() => {
    let savedLevel = 1
    try {
      const saved = localStorage.getItem('orbit_level')
      if (saved) savedLevel = Math.max(1, parseInt(saved, 10))
    } catch (e) {}
    
    const p = generatePlanets(savedLevel)
    const port = generateExitPortal(p)
    const d = generateBeacons(p)
    const ast = generateAsteroids(p, port, d, savedLevel)
    return { planets: p, portal: port, beacons: d, asteroids: ast }
  })

  const [planets, setPlanets] = useState(initialSector.planets)
  const [portal, setPortal] = useState(initialSector.portal)
  const [isShopOpen, setIsShopOpen] = useState(false)

  // --- Game Engine Refs (to prevent stale React closures at 60fps) ---
  const gameStateRef = useRef<GameState>('IDLE')
  const dataCoresRef = useRef<number>(0)
  const purchasedUpgradesRef = useRef<UpgradeId[]>([])

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    dataCoresRef.current = dataCores
  }, [dataCores])

  useEffect(() => {
    purchasedUpgradesRef.current = purchasedUpgrades
  }, [purchasedUpgrades])

  // --- Persistent Storage Sync ---
  useEffect(() => {
    try {
      localStorage.setItem('orbit_data_cores', dataCores.toString())
    } catch (e) {
      console.error('Failed to save data cores to localStorage', e)
    }
  }, [dataCores])

  useEffect(() => {
    try {
      localStorage.setItem('orbit_level', level.toString())
    } catch (e) {
      console.error('Failed to save level to localStorage', e)
    }
  }, [level])

  useEffect(() => {
    try {
      localStorage.setItem('orbit_module_slots', JSON.stringify(moduleSlots))
    } catch (e) {
      console.error('Failed to save module slots to localStorage', e)
    }
  }, [moduleSlots])

  useEffect(() => {
    try {
      localStorage.setItem('orbit_hack_slots', JSON.stringify(hackSlots))
    } catch (e) {
      console.error('Failed to save hack slots to localStorage', e)
    }
  }, [hackSlots])

  // Custom interceptor to handle physics loot drops and slot them automatically
  const handleLootInject: React.Dispatch<React.SetStateAction<UpgradeId[]>> = (updater) => {
    const tempCurrent = [
      ...moduleSlots.filter((id): id is UpgradeId => id !== null),
      ...hackSlots.filter((id): id is UpgradeId => id !== null)
    ]
    const updated = typeof updater === 'function' ? updater(tempCurrent) : updater
    const droppedId = updated[updated.length - 1]
    if (!droppedId) return
    
    const upgrade = UPGRADE_REGISTRY[droppedId]
    if (upgrade.type === 'module') {
      setModuleSlots(prev => {
        const next = [...prev]
        const emptyIdx = next.indexOf(null)
        if (emptyIdx !== -1) {
          next[emptyIdx] = droppedId
        }
        return next
      })
    } else {
      setHackSlots(prev => {
        const next = [...prev]
        const emptyIdx = next.indexOf(null)
        if (emptyIdx !== -1) {
          next[emptyIdx] = droppedId
        }
        return next
      })
    }
  }

  // --- Physics Loop Custom Hook Integration ---
  const {
    probe,
    setProbe,
    probeRef,
    beacons,
    setBeacons,
    beaconsRef,
    asteroids,
    setAsteroids,
    asteroidsRef,
    toasts,
    showSelfDestruct,
    setShowSelfDestruct,
    selfDestructTimeoutRef,
    handleSelfDestruct
  } = usePhysicsLoop({
    gameState,
    setGameState,
    gameStateRef,
    planets,
    portal,
    initialSector,
    purchasedUpgradesRef,
    setPurchasedUpgrades: handleLootInject,
    aimStartPos,
    onSecureDataCores: (cores) => {
      setDataCores(current => Math.min(100, current + cores))
    }
  })

  // --- Aiming Slingshot Interactivity Hook Integration ---
  const {
    aimActive,
    aimVel,
    setAimVel,
    handleAimStart,
    handleAimMove,
    handleAimRelease
  } = useSlingshotControls({
    gameStateRef,
    aimStartPos,
    onLaunch: (firingVelocity) => {
      probeRef.current = {
        pos: aimStartPos.clone(),
        vel: firingVelocity.clone(),
        data: 0,
        trail: [aimStartPos.clone()],
        integrity: 10,
        maxIntegrity: 10
      }
      setProbe({ ...probeRef.current })
      setGameState('FLIGHT')

      if (selfDestructTimeoutRef.current) {
        clearTimeout(selfDestructTimeoutRef.current)
      }
      setShowSelfDestruct(false)
      selfDestructTimeoutRef.current = setTimeout(() => {
        setShowSelfDestruct(true)
      }, 3000)
    }
  })

  // Advance level helper
  const advanceLevel = () => {
    const nextLevel = level + 1
    setLevel(nextLevel)
    
    const newPlanets = generatePlanets(nextLevel)
    setPlanets(newPlanets)
    
    const newPortal = generateExitPortal(newPlanets)
    setPortal(newPortal)
    
    const newBeacons = generateBeacons(newPlanets)
    setBeacons(newBeacons)
    beaconsRef.current = newBeacons

    const newAsteroids = generateAsteroids(newPlanets, newPortal, newBeacons, nextLevel)
    setAsteroids(newAsteroids)
    asteroidsRef.current = newAsteroids

    setGameState('IDLE')
    const freshProbe = {
      pos: aimStartPos.clone(),
      vel: new THREE.Vector3(0, 0, 0),
      data: 0,
      trail: [],
      integrity: 10,
      maxIntegrity: 10
    }
    probeRef.current = freshProbe
    setProbe(freshProbe)
    setAimVel(null)

    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current)
      selfDestructTimeoutRef.current = null
    }
    setShowSelfDestruct(false)
  }

  // Handle Next Sector button trigger
  const handleNextLevel = () => {
    if (level % 5 === 0) {
      setIsShopOpen(true)
    } else {
      advanceLevel()
    }
  }

  // Shop purchase trigger (specifying target console slot index)
  const handlePurchase = (upgrade: UpgradeEntry, slotIndex: number) => {
    setDataCores(prev => Math.max(0, prev - upgrade.cost))
    if (upgrade.type === 'module') {
      setModuleSlots(prev => {
        const next = [...prev]
        next[slotIndex] = upgrade.id
        return next
      })
    } else {
      setHackSlots(prev => {
        const next = [...prev]
        next[slotIndex] = upgrade.id
        return next
      })
    }
  }

  // Shop rearrange modules trigger
  const handleRearrangeModules = (sourceIndex: number, targetIndex: number) => {
    setModuleSlots(prev => {
      const next = [...prev]
      const temp = next[sourceIndex]
      next[sourceIndex] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  // Shop sell-back trigger (50% refund, rounded down, freeing specific slot index)
  const handleSell = (upgrade: UpgradeEntry, slotIndex: number) => {
    const refund = Math.floor(upgrade.cost / 2)
    setDataCores(prev => Math.min(100, prev + refund))
    if (upgrade.type === 'module') {
      setModuleSlots(prev => {
        const next = [...prev]
        next[slotIndex] = null
        return next
      })
    } else {
      setHackSlots(prev => {
        const next = [...prev]
        next[slotIndex] = null
        return next
      })
    }
  }

  // Close shop and advance
  const handleShopClose = () => {
    setIsShopOpen(false)
    advanceLevel()
  }

  // Reset the probe level simulation layout
  const handleResetLevel = () => {
    setGameState('IDLE')
    const freshProbe = {
      pos: aimStartPos.clone(),
      vel: new THREE.Vector3(0, 0, 0),
      data: 0,
      trail: [],
      integrity: 10,
      maxIntegrity: 10
    }
    probeRef.current = freshProbe
    setProbe(freshProbe)

    const freshBeacons = beacons.map(p => ({ ...p, collected: false }))
    beaconsRef.current = freshBeacons
    setBeacons(freshBeacons)

    const freshAsteroids = asteroids.map(a => ({ ...a, health: 10 }))
    asteroidsRef.current = freshAsteroids
    setAsteroids(freshAsteroids)

    setAimVel(null)

    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current)
      selfDestructTimeoutRef.current = null
    }
    setShowSelfDestruct(false)
  }

  // Entirely resets Data Cores vault and starts fresh from Level 1
  const handleResetYieldVault = () => {
    try {
      localStorage.removeItem('orbit_data_cores')
      localStorage.removeItem('orbit_level')
      localStorage.removeItem('orbit_module_slots')
      localStorage.removeItem('orbit_hack_slots')
    } catch (e) {
      console.error('Failed to clear state in localStorage', e)
    }

    setDataCores(0)
    setModuleSlots([null, null, null, null, null, null])
    setHackSlots([null, null])
    setLevel(1)
    
    const freshPlanets = generatePlanets(1)
    setPlanets(freshPlanets)
    
    const freshPortal = generateExitPortal(freshPlanets)
    setPortal(freshPortal)
    
    const freshBeacons = generateBeacons(freshPlanets)
    setBeacons(freshBeacons)
    beaconsRef.current = freshBeacons

    const freshAsteroids = generateAsteroids(freshPlanets, freshPortal, freshBeacons, 1)
    setAsteroids(freshAsteroids)
    asteroidsRef.current = freshAsteroids

    setGameState('IDLE')
    const freshProbe = {
      pos: aimStartPos.clone(),
      vel: new THREE.Vector3(0, 0, 0),
      data: 0,
      trail: [],
      integrity: 10,
      maxIntegrity: 10
    }
    probeRef.current = freshProbe
    setProbe(freshProbe)
    setAimVel(null)

    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current)
      selfDestructTimeoutRef.current = null
    }
    setShowSelfDestruct(false)
  }

  // Dev-only handler to cheat/advance sector with +3 Data Cores
  const handleDevAdvance = () => {
    setDataCores(current => Math.min(100, current + 3))
    if (level % 5 === 0) {
      setIsShopOpen(true)
    } else {
      advanceLevel()
    }
  }

  // Helper metrics for rendering
  const currentSpeed = probe.vel.length()
  const distanceToPlanetSurface = planets.length > 0
    ? Math.min(...planets.map(p => Math.max(0, probe.pos.distanceTo(p.pos) - p.radius))).toFixed(2)
    : '0.00'

  const statusObj = getStatusDisplay(gameState)

  // Modules and Hacks formatting for Build Specs Panel using the slots structure
  const activeModules = moduleSlots.map(id => id ? UPGRADE_REGISTRY[id] : null)
  const activeHacks = hackSlots.map(id => id ? UPGRADE_REGISTRY[id] : null).filter((h): h is UpgradeEntry => h !== null)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* THREEJS Visual Canvas */}
      <GameCanvas
        gameState={gameState}
        level={level}
        probe={probe}
        planets={planets}
        portal={portal}
        beacons={beacons}
        asteroids={asteroids}
        aimActive={aimActive}
        aimStartPos={aimStartPos}
        aimVel={aimVel}
        onAimStart={handleAimStart}
        onAimMove={handleAimMove}
        onAimRelease={handleAimRelease}
        toasts={toasts}
      />

      {/* Shop Overlay Modal */}
      {isShopOpen && (
        <ShopOverlay
          dataCores={dataCores}
          moduleSlots={moduleSlots}
          hackSlots={hackSlots}
          onPurchase={handlePurchase}
          onRearrange={handleRearrangeModules}
          onSell={handleSell}
          onClose={handleShopClose}
        />
      )}

      {/* Center Top Context Controller Button & Status Banner */}
      <OutcomeBanner
        gameState={gameState}
        probeData={probe.data}
        purchasedUpgrades={purchasedUpgrades}
        showSelfDestruct={showSelfDestruct}
        onSelfDestruct={handleSelfDestruct}
        onNextSector={handleNextLevel}
        onResetProbe={handleResetLevel}
      />

      {/* Header Banner Overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 100
      }}>
        <div className="panel" style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '20px', pointerEvents: 'auto' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }} className="text-cyan">
            ORBIT HARVEST
          </h1>
          <span className="font-orbitron text-gold" style={{ fontSize: '16px', fontWeight: 'bold', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '15px' }}>
            SECTOR {level}
          </span>
          <span className="font-script text-cyan" style={{ fontSize: '18px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '15px' }}>
            Retro-Future Rocketry Console
          </span>
        </div>

        <div className="panel" style={{ padding: '8px 24px', display: 'flex', gap: '15px', pointerEvents: 'auto' }}>
          {(import.meta as any).env.DEV && (
            <button className="btn-arcade success" style={{ fontSize: '11px', padding: '6px 16px' }} onClick={handleDevAdvance}>
              DEV ADVANCE (+3)
            </button>
          )}
          <button className="btn-arcade danger" style={{ fontSize: '11px', padding: '6px 16px' }} onClick={handleResetYieldVault}>
            RESET VAULT
          </button>
        </div>
      </div>

      {/* Left Column: Telemetry Panels */}
      <div style={{
        position: 'absolute',
        top: '100px',
        left: '20px',
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 90
      }}>
        <TelemetryPanel
          statusLabel={statusObj.label}
          statusCss={statusObj.css}
          currentSpeed={currentSpeed}
          distanceToPlanetSurface={distanceToPlanetSurface}
          planets={planets}
          probe={probe}
          gravitationalConstant={GRAVITATIONAL_CONSTANT}
        />
      </div>

      {/* Right Column: Build Specs & Objectives Panels */}
      <div style={{
        position: 'absolute',
        top: '100px',
        right: '20px',
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 90
      }}>
        <BuildSpecsPanel
          dataCores={dataCores}
          activeModules={activeModules}
          activeHacks={activeHacks}
        />

        <ObjectivesPanel
          harvestQuota={SECTOR_QUOTA}
          activeBeaconsCount={beacons.filter(d => !d.collected).length}
          activeThreatsCount={asteroids.filter(a => a.health > 0).length}
        />
      </div>

      {/* Bottom HUD: Data progress and control tray */}
      <LaunchControlPanel
        probeData={probe.data}
        sectorQuota={SECTOR_QUOTA}
      />
    </div>
  )
}

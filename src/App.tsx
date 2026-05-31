import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GameState, UpgradeEntry, ModuleId, HackId } from './types'
import { GameCanvas } from './components/canvas/GameCanvas'
import { generatePlanets, generateExitPortal, generateBeacons, generateAsteroids } from './utils/levelGenerator'
import { ShopOverlay } from './components/ui/ShopOverlay'
import { HackSelectionOverlay } from './components/ui/HackSelectionOverlay'
import { TelemetryPanel } from './components/ui/TelemetryPanel'
import { ShipsLogPanel } from './components/ui/ShipsLogPanel'
import { BuildSpecsPanel } from './components/ui/BuildSpecsPanel'
import { LaunchControlPanel } from './components/ui/LaunchControlPanel'
import { OutcomeBanner } from './components/ui/OutcomeBanner'
import { LootOverlay } from './components/ui/LootOverlay'
import { usePhysicsLoop } from './hooks/usePhysicsLoop'
import { useSlingshotControls } from './hooks/useSlingshotControls'
import { getStatusDisplay } from './utils/statusFormatters'
import { getSectorQuota } from './constants'
import { createFreshProbe } from './utils/probeUtils'
import { UPGRADE_REGISTRY, UPGRADE_MAPPING } from './constants/upgrades'

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

  const [moduleSlots, setModuleSlots] = useState<(ModuleId | null)[]>(() => {
    try {
      const saved = localStorage.getItem('orbit_module_slots')
      return saved ? JSON.parse(saved) : [null, null, null, null, null, null]
    } catch (e) {
      return [null, null, null, null, null, null]
    }
  })

  const [hackSlots, setHackSlots] = useState<HackId[]>(() => {
    try {
      const saved = localStorage.getItem('orbit_hack_slots')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  // --- Game Engine Refs (to prevent stale React closures at 60fps) ---
  const activeModulesRef = useRef<(ModuleId | null)[]>(moduleSlots)
  const activeHacksRef = useRef<HackId[]>(hackSlots)

  useEffect(() => {
    activeModulesRef.current = moduleSlots
  }, [moduleSlots])

  useEffect(() => {
    activeHacksRef.current = hackSlots
  }, [hackSlots])

  const [level, setLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('orbit_level')
      return saved ? Math.max(1, parseInt(saved, 10)) : 1
    } catch (e) {
      return 1
    }
  })

  const sectorQuota = getSectorQuota(level)

  const aimStartPos = useRef(new THREE.Vector3(-12, 0, 5)).current

  // Shared initial sector matching loaded level
  const [initialSector] = useState(() => {
    let savedLevel = 1
    try {
      const saved = localStorage.getItem('orbit_level')
      if (saved) savedLevel = Math.max(1, parseInt(saved, 10))
    } catch (e) { }

    const p = generatePlanets(savedLevel)
    const port = generateExitPortal(p)
    const d = generateBeacons(p)
    const ast = generateAsteroids(p, port, d, savedLevel)
    return { planets: p, portal: port, beacons: d, asteroids: ast }
  })

  const [planets, setPlanets] = useState(initialSector.planets)
  const [portal, setPortal] = useState(initialSector.portal)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [isHackStoreOpen, setIsHackStoreOpen] = useState(false)
  const [isLootOpen, setIsLootOpen] = useState(false)
  const [pendingLoot, setPendingLoot] = useState<{ modules: ModuleId[]; hacks: HackId[] }>({ modules: [], hacks: [] })

  const gameStateRef = useRef<GameState>('IDLE')
  const dataCoresRef = useRef<number>(0)

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    dataCoresRef.current = dataCores
  }, [dataCores])

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
    rockets,
    toasts,
    showSelfDestruct,
    setShowSelfDestruct,
    selfDestructTimeoutRef,
    handleSelfDestruct,
    logs,
    setLogs,
    explosions,
    handleExplosionComplete
  } = usePhysicsLoop({
    gameState,
    setGameState,
    gameStateRef,
    planets,
    portal,
    initialSector,
    aimStartPos,
    onSecureDataCores: (cores) => {
      setDataCores(current => Math.min(100, current + cores))
    },
    activeModulesRef,
    activeHacksRef,
    sectorQuota,
    setPendingLoot
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
      setPendingLoot({ modules: [], hacks: [] })
      probeRef.current = createFreshProbe(aimStartPos, firingVelocity, [aimStartPos])
      setProbe({ ...probeRef.current })
      setGameState('FLIGHT')
      setAimVel(null) // Clear aim velocity on launch so it cleans up on level resets

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
    const freshProbe = createFreshProbe(aimStartPos)
    probeRef.current = freshProbe
    setProbe(freshProbe)
    setAimVel(null)

    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current)
      selfDestructTimeoutRef.current = null
    }
    setShowSelfDestruct(false)
    setLogs([])
  }

  // Handle Next Sector button trigger
  const handleNextLevel = () => {
    const hasLoot = pendingLoot.modules.length > 0 || pendingLoot.hacks.length > 0
    if (hasLoot) {
      setIsLootOpen(true)
    } else {
      if (level % 10 === 7) {
        setIsHackStoreOpen(true)
      } else if (level % 5 === 4) {
        setIsShopOpen(true)
      } else {
        advanceLevel()
      }
    }
  }

  // Equip a module salvaged from an asteroid
  const handleEquipLootModule = (moduleId: ModuleId, slotIndex: number, lootIndex: number) => {
    setModuleSlots(prev => {
      const next = [...prev]
      const existing = next[slotIndex]
      if (existing && existing === moduleId && !existing.endsWith('_V2')) {
        next[slotIndex] = UPGRADE_MAPPING[existing]
        console.log(`[Fusion Loot] Upgraded slot ${slotIndex} to V2!`)
      } else {
        next[slotIndex] = moduleId
      }
      return next
    })

    setPendingLoot(prev => {
      const nextModules = [...prev.modules]
      nextModules.splice(lootIndex, 1)
      return { ...prev, modules: nextModules }
    })
  }

  // Discard a currently equipped module from the player slots
  const handleDiscardEquippedModule = (slotIndex: number) => {
    setModuleSlots(prev => {
      const next = [...prev]
      next[slotIndex] = null
      return next
    })
  }

  // Collect a hack salvaged from an asteroid
  const handleCollectHack = (hackId: HackId, lootIndex: number) => {
    setHackSlots(prev => [...prev, hackId])
    setPendingLoot(prev => {
      const nextHacks = [...prev.hacks]
      nextHacks.splice(lootIndex, 1)
      return { ...prev, hacks: nextHacks }
    })
  }

  // Close Loot extraction overlay and continue to next level or shop
  const handleLootClose = () => {
    setIsLootOpen(false)
    setPendingLoot({ modules: [], hacks: [] })

    if (level % 10 === 7) {
      setIsHackStoreOpen(true)
    } else if (level % 5 === 4) {
      setIsShopOpen(true)
    } else {
      advanceLevel()
    }
  }

  // Shop purchase trigger (specifying target console slot index)
  const handlePurchase = (upgrade: UpgradeEntry, slotIndex?: number) => {
    setDataCores(prev => Math.max(0, prev - upgrade.cost))
    if (upgrade.type === 'module') {
      if (slotIndex !== undefined) {
        setModuleSlots(prev => {
          const next = [...prev]
          const existing = next[slotIndex]
          if (existing && existing === upgrade.id && !existing.endsWith('_V2')) {
            next[slotIndex] = UPGRADE_MAPPING[existing]
            console.log(`[Fusion Purchase] Upgraded slot ${slotIndex} to V2!`)
          } else {
            next[slotIndex] = upgrade.id as ModuleId
          }
          return next
        })
      }
    } else {
      setHackSlots(prev => [...prev, upgrade.id as HackId])
    }
  }

  // Shop rearrange modules trigger
  const handleRearrangeModules = (sourceIndex: number, targetIndex: number) => {
    setModuleSlots(prev => {
      const next = [...prev]
      const sourceId = next[sourceIndex]
      const targetId = next[targetIndex]

      if (sourceId && targetId && sourceId === targetId && !sourceId.endsWith('_V2')) {
        const upgradedId = UPGRADE_MAPPING[sourceId]
        if (upgradedId) {
          next[targetIndex] = upgradedId
          next[sourceIndex] = null
          console.log(`[Fusion Rearrange] Upgraded slot ${targetIndex} to ${upgradedId}!`)
          return next
        }
      }

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
    setPendingLoot({ modules: [], hacks: [] })
    const freshProbe = createFreshProbe(aimStartPos)
    probeRef.current = freshProbe
    setProbe(freshProbe)

    const freshBeacons = beacons.map(p => ({ ...p, collected: false }))
    beaconsRef.current = freshBeacons
    setBeacons(freshBeacons)

    const freshAsteroids = asteroids.map(a => ({ ...a, health: a.maxHealth }))
    asteroidsRef.current = freshAsteroids
    setAsteroids(freshAsteroids)

    setAimVel(null)

    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current)
      selfDestructTimeoutRef.current = null
    }
    setShowSelfDestruct(false)
    setLogs([])
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
    setHackSlots([])
    setPendingLoot({ modules: [], hacks: [] })
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
    const freshProbe = createFreshProbe(aimStartPos)
    probeRef.current = freshProbe
    setProbe(freshProbe)
    setAimVel(null)

    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current)
      selfDestructTimeoutRef.current = null
    }
    setShowSelfDestruct(false)
    setLogs([])
  }

  // Dev-only handler to cheat/advance sector with +3 Data Cores
  const handleDevAdvance = () => {
    setDataCores(current => Math.min(100, current + 3))
    setPendingLoot({ modules: [], hacks: [] })
    if (level % 10 === 7) {
      setIsHackStoreOpen(true)
    } else if (level % 5 === 4) {
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
  const activeHacks = hackSlots.map(id => UPGRADE_REGISTRY[id]).filter((h): h is UpgradeEntry => h !== null)

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
        rockets={rockets}
        aimActive={aimActive}
        aimStartPos={aimStartPos}
        aimVel={aimVel}
        onAimStart={handleAimStart}
        onAimMove={handleAimMove}
        onAimRelease={handleAimRelease}
        toasts={toasts}
        explosions={explosions}
        onExplosionComplete={handleExplosionComplete}
      />

      {/* Shop Overlay Modal */}
      {isShopOpen && (
        <ShopOverlay
          dataCores={dataCores}
          moduleSlots={moduleSlots}
          onPurchase={handlePurchase}
          onRearrange={handleRearrangeModules}
          onSell={handleSell}
          onClose={handleShopClose}
        />
      )}

      {/* Hack Selection Overlay Modal */}
      {isHackStoreOpen && (
        <HackSelectionOverlay
          onSelect={(hackId) => {
            setHackSlots(prev => [...prev, hackId])
            setIsHackStoreOpen(false)
            advanceLevel()
          }}
        />
      )}

      {/* Loot Extraction Overlay Modal */}
      {isLootOpen && (
        <LootOverlay
          pendingLoot={pendingLoot}
          moduleSlots={moduleSlots}
          onEquipModule={handleEquipLootModule}
          onRearrangeModules={handleRearrangeModules}
          onDiscardEquippedModule={handleDiscardEquippedModule}
          onCollectHack={handleCollectHack}
          onClose={handleLootClose}
        />
      )}

      {/* Center Top Context Controller Button & Status Banner */}
      {!isShopOpen && !isHackStoreOpen && !isLootOpen && (
        <OutcomeBanner
          gameState={gameState}
          probeData={probe.data}
          sectorQuota={sectorQuota}
          showSelfDestruct={showSelfDestruct}
          onSelfDestruct={handleSelfDestruct}
          onNextSector={handleNextLevel}
          onResetProbe={handleResetLevel}
          hasPendingLoot={pendingLoot.modules.length > 0 || pendingLoot.hacks.length > 0}
        />
      )}

      {/* Left Column: Telemetry Panels */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 90
      }}>
        <TelemetryPanel
          level={level}
          statusLabel={statusObj.label}
          statusCss={statusObj.css}
          currentSpeed={currentSpeed}
          distanceToPlanetSurface={distanceToPlanetSurface}
          probe={probe}
          activeBeaconsCount={beacons.filter(d => !d.collected).length}
          activeThreatsCount={asteroids.filter(a => a.health > 0).length}
        />
        <ShipsLogPanel logs={logs} />
      </div>

      {/* Right Column: Build Specs Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        bottom: '20px',
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 90
      }}>
        <BuildSpecsPanel
          dataCores={dataCores}
          activeModules={activeModules}
          activeHacks={activeHacks}
          onRearrange={handleRearrangeModules}
        />
      </div>

      {/* Bottom Left Debug Controls */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        display: 'flex',
        gap: '8px',
        zIndex: 100
      }}>
        {(import.meta as any).env.DEV && (
          <button 
            className="btn-arcade success" 
            style={{ fontSize: '8px', padding: '4px 8px', borderRadius: '4px', minWidth: 'auto', letterSpacing: '0.5px' }} 
            onClick={handleDevAdvance}
          >
            DEV ADVANCE
          </button>
        )}
        <button 
          className="btn-arcade danger" 
          style={{ fontSize: '8px', padding: '4px 8px', borderRadius: '4px', minWidth: 'auto', letterSpacing: '0.5px' }} 
          onClick={handleResetYieldVault}
        >
          RESET VAULT
        </button>
      </div>

      {/* Bottom HUD: Data progress and control tray */}
      <LaunchControlPanel
        probeData={probe.data}
        sectorQuota={sectorQuota}
      />
    </div>
  )
}

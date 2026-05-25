import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Probe, Planet, ExitPortal, Beacon, Asteroid, DataToast, GameState, UpgradeId, ModuleId, HackId, TriggerId } from '../types'
import { UPGRADE_REGISTRY } from '../constants/upgrades'
import { handleTrigger } from '../utils/moduleEffects'
import { createFreshProbe } from '../utils/probeUtils'
import {
  GRAVITATIONAL_CONSTANT,
  ATMOSPHERE_DRAG,
  PHYSICS_DT,
  MIN_SPEED_THRESHOLD,
  SECTOR_QUOTA,
  OUT_OF_BOUNDS_LIMIT
} from '../constants'

const BASE_PLANET_DAMAGE = 5
const GRAVITY_STABILIZER_SHIELD_ABSORPTION = 2

interface UsePhysicsLoopProps {
  gameState: GameState
  setGameState: (state: GameState) => void
  gameStateRef: React.MutableRefObject<GameState>
  planets: Planet[]
  portal: ExitPortal
  initialSector: { beacons: Beacon[]; asteroids: Asteroid[] }
  purchasedUpgradesRef: React.MutableRefObject<UpgradeId[]>
  setPurchasedUpgrades: React.Dispatch<React.SetStateAction<UpgradeId[]>>
  aimStartPos: THREE.Vector3
  onSecureDataCores: (cores: number) => void
}

export function usePhysicsLoop({
  gameState,
  setGameState,
  gameStateRef,
  planets,
  portal,
  initialSector,
  purchasedUpgradesRef,
  setPurchasedUpgrades,
  aimStartPos,
  onSecureDataCores
}: UsePhysicsLoopProps) {
  const [probe, setProbe] = useState<Probe>(() => createFreshProbe(aimStartPos))

  const [beacons, setBeacons] = useState<Beacon[]>(initialSector.beacons)
  const [asteroids, setAsteroids] = useState<Asteroid[]>(initialSector.asteroids)
  const [toasts, setToasts] = useState<DataToast[]>([])
  const [showSelfDestruct, setShowSelfDestruct] = useState<boolean>(false)

  const probeRef = useRef<Probe>(createFreshProbe(aimStartPos))
  const beaconsRef = useRef<Beacon[]>(initialSector.beacons)
  const asteroidsRef = useRef<Asteroid[]>(initialSector.asteroids)
  const selfDestructTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasInsideAtmosphereRef = useRef(false)
  const activeCollidingPlanetIdRef = useRef<string | null>(null)

  const triggerDataToast = (text: string, pos: THREE.Vector3, color?: string) => {
    const newToast: DataToast = {
      id: `toast-${Date.now()}-${Math.random()}`,
      text,
      pos: pos.clone(),
      color
    };
    setToasts(current => [...current, newToast]);
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== newToast.id));
    }, 1200);
  }

  // Self-destruct action
  const handleSelfDestruct = () => {
    if (gameStateRef.current !== 'FLIGHT') return

    const pState = { ...probeRef.current }
    pState.vel.set(0, 0, 0)
    probeRef.current = pState
    setProbe(pState)

    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current);
      selfDestructTimeoutRef.current = null;
    }
    setShowSelfDestruct(false);

    if (pState.data >= SECTOR_QUOTA) {
      gameStateRef.current = 'WIN'
      setGameState('WIN')
      const earnedDataCores = Math.floor(pState.data / SECTOR_QUOTA)
      const bonus = purchasedUpgradesRef.current.includes(HackId.LUCKY_CHARM) ? 1 : 0
      console.log("Self-Destruct Win! Data:", pState.data, "Data Cores:", earnedDataCores, "Bonus:", bonus)
      onSecureDataCores(earnedDataCores + bonus)
    } else {
      gameStateRef.current = 'STOPPED'
      setGameState('STOPPED')
    }
  }

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (selfDestructTimeoutRef.current) {
        clearTimeout(selfDestructTimeoutRef.current)
      }
    }
  }, [])

  // Core Hands-Off Simulation Loop (60fps animation)
  useEffect(() => {
    if (gameState !== 'FLIGHT') return

    wasInsideAtmosphereRef.current = false
    let animFrameId: number

    const physicsLoop = () => {
      if (gameStateRef.current !== 'FLIGHT') return

      const pState = { ...probeRef.current }
      pState.pos = pState.pos.clone()
      pState.vel = pState.vel.clone()
      pState.trail = [...pState.trail]

      // 1. Gravity Integration
      const acc = new THREE.Vector3()
      let hitPlanet = false
      let currentCollidingPlanetId: string | null = null

      for (const planet of planets) {
        const diff = new THREE.Vector3().subVectors(planet.pos, pState.pos)
        diff.y = 0
        const dist = diff.length()

        // Planet Impact (Bounce Check) - Skipped for Gas Giants!
        if (!planet.isGasGiant && dist < planet.radius + 0.35) {
          currentCollidingPlanetId = planet.id

          const normal = new THREE.Vector3().subVectors(pState.pos, planet.pos)
          normal.y = 0
          normal.normalize()

          pState.pos.copy(planet.pos).addScaledVector(normal, planet.radius + 0.35)

          const dot = pState.vel.dot(normal)
          if (dot < 0) {
            const e = 1.1 // super-elastic restitution
            pState.vel.addScaledVector(normal, -(1 + e) * dot)
          }

          // Trigger collision logic only if this is the first frame of contact
          if (activeCollidingPlanetIdRef.current !== planet.id) {
            const gsCount = purchasedUpgradesRef.current.filter(id => id === ModuleId.GRAVITY_STABILIZER).length
            const damage = Math.max(1, BASE_PLANET_DAMAGE - gsCount * GRAVITY_STABILIZER_SHIELD_ABSORPTION)

            pState.integrity = Math.max(0, pState.integrity - damage)
            triggerDataToast(`-${damage} Hull`, pState.pos, '#ff4757')

            if (pState.integrity <= 0) {
              hitPlanet = true
              handleTrigger(TriggerId.PROBE_DEATH, pState, purchasedUpgradesRef.current, { triggerDataToast });
              handleTrigger(TriggerId.PROBE_DEATH_BY_COLLISION, pState, purchasedUpgradesRef.current, { triggerDataToast });
              pState.vel.set(0, 0, 0); // Stop probe movement on death!
            } else {
              handleTrigger(TriggerId.PLANET_BOUNCE, pState, purchasedUpgradesRef.current, { triggerDataToast });
            }
          }
          break
        }

        if (dist > 0.2) {
          const forceMagnitude = (GRAVITATIONAL_CONSTANT * planet.mass) / (dist * dist)
          const direction = diff.normalize()
          acc.addScaledVector(direction, forceMagnitude)
        }

        // 2. Atmospheric Drag
        if (dist < planet.atmosphereRadius) {
          const drag = ATMOSPHERE_DRAG
          pState.vel.multiplyScalar(1.0 - drag * PHYSICS_DT)
        }
      }

      // Update active colliding planet ID ref for consecutive frame checks
      activeCollidingPlanetIdRef.current = currentCollidingPlanetId

      if (hitPlanet) {
        probeRef.current = pState
        setProbe(pState)
        if (pState.data >= SECTOR_QUOTA) {
          gameStateRef.current = 'WIN'
          setGameState('WIN')
          const earnedDataCores = Math.floor(pState.data / SECTOR_QUOTA)
          const bonus = purchasedUpgradesRef.current.includes(HackId.LUCKY_CHARM) ? 1 : 0
          console.log("Planet Crash Win! Data:", pState.data, "Data Cores:", earnedDataCores, "Bonus:", bonus)
          onSecureDataCores(earnedDataCores + bonus)
        } else {
          gameStateRef.current = 'CRASHED'
          setGameState('CRASHED')
        }
        if (selfDestructTimeoutRef.current) {
          clearTimeout(selfDestructTimeoutRef.current);
          selfDestructTimeoutRef.current = null;
        }
        setShowSelfDestruct(false);
        return
      }

      // 3. Update coordinates
      pState.vel.addScaledVector(acc, PHYSICS_DT)
      pState.pos.addScaledVector(pState.vel, PHYSICS_DT)

      // 3.5. Out of bounds checking
      if (pState.pos.length() > OUT_OF_BOUNDS_LIMIT) {
        handleTrigger(TriggerId.OUT_OF_BOUNDS, pState, purchasedUpgradesRef.current, { triggerDataToast });
        pState.integrity = 0;
        pState.vel.set(0, 0, 0); // Stop probe movement on death!
        handleTrigger(TriggerId.PROBE_DEATH, pState, purchasedUpgradesRef.current, { triggerDataToast });
        probeRef.current = pState
        setProbe(pState)
        if (pState.data >= SECTOR_QUOTA) {
          gameStateRef.current = 'WIN'
          setGameState('WIN')
          const earnedDataCores = Math.floor(pState.data / SECTOR_QUOTA)
          const bonus = purchasedUpgradesRef.current.includes(HackId.LUCKY_CHARM) ? 1 : 0
          console.log("Out of Bounds Win! Data:", pState.data, "Data Cores:", earnedDataCores, "Bonus:", bonus)
          onSecureDataCores(earnedDataCores + bonus)
        } else {
          gameStateRef.current = 'CRASHED'
          setGameState('CRASHED')
          triggerDataToast("OUT OF BOUNDS!", pState.pos, '#ff4757');
        }
        if (selfDestructTimeoutRef.current) {
          clearTimeout(selfDestructTimeoutRef.current);
          selfDestructTimeoutRef.current = null;
        }
        setShowSelfDestruct(false);
        return;
      }

      let insideAtmosphere = false
      let currentAtmospherePlanet: Planet | null = null
      for (const planet of planets) {
        const diff = new THREE.Vector3().subVectors(planet.pos, pState.pos)
        diff.y = 0
        const dist = diff.length()
        if (dist < planet.atmosphereRadius) {
          insideAtmosphere = true
          currentAtmospherePlanet = planet
          break
        }
      }

      // Atmospheric Transitions
      if (insideAtmosphere && !wasInsideAtmosphereRef.current) {
        if (currentAtmospherePlanet?.isGasGiant) {
          handleTrigger(TriggerId.ENTER_GAS_PLANET, pState, purchasedUpgradesRef.current, { triggerDataToast });
        } else {
          handleTrigger(TriggerId.ENTER_ATMOSPHERE, pState, purchasedUpgradesRef.current, { triggerDataToast });
        }
      } else if (!insideAtmosphere && wasInsideAtmosphereRef.current) {
        handleTrigger(TriggerId.LEAVE_ATMOSPHERE, pState, purchasedUpgradesRef.current, { triggerDataToast });
      }
      wasInsideAtmosphereRef.current = insideAtmosphere;

      // Decrement scoop active timer if active
      if (pState.scoopActiveTimer !== undefined && pState.scoopActiveTimer > 0) {
        pState.scoopActiveTimer = Math.max(0, pState.scoopActiveTimer - PHYSICS_DT);
      }

      let timeRate = 1.5
      if (purchasedUpgradesRef.current.includes(HackId.DEEP_SPACE_SENSOR)) {
        timeRate *= 2.0
      }
      if (insideAtmosphere) {
        timeRate *= 10.0
      }
      if (pState.scoopActiveTimer !== undefined && pState.scoopActiveTimer > 0) {
        timeRate *= 10.0
      }

      pState.data += timeRate * PHYSICS_DT

      const lastTrailPt = pState.trail[pState.trail.length - 1]
      if (!lastTrailPt || lastTrailPt.distanceTo(pState.pos) > 0.08) {
        pState.trail.push(pState.pos.clone())
        if (pState.trail.length > 400) {
          pState.trail.shift()
        }
      }

      // 4. Collect Beacons
      let dataUpdated = false
      const updatedBeacons = beaconsRef.current.map(dp => {
        if (dp.collected) return dp

        const dpDiff = new THREE.Vector3().subVectors(dp.pos, pState.pos)
        dpDiff.y = 0
        const dist = dpDiff.length()

        if (dist < dp.radius + 0.35) {
          dataUpdated = true
          const addedData = dp.value;
          pState.data += addedData;
          const isHighValue = dp.value >= 25;
          const color = isHighValue ? '#ffd700' : '#00ffcc';
          triggerDataToast(`+${addedData.toFixed(0)} Data`, dp.pos, color);

          // Dispatch HIT_BEACON
          handleTrigger(TriggerId.HIT_BEACON, pState, purchasedUpgradesRef.current, { triggerDataToast });

          return { ...dp, collected: true }
        } else if (dist < pState.magnetRadius) {
          // SUCK IT IN! Smoothly lerp beacon position towards probe position
          dataUpdated = true
          const lerpFactor = 0.18 // Sucking speed factor per tick
          const newPos = dp.pos.clone().lerp(pState.pos, lerpFactor)
          newPos.y = 0
          return { ...dp, pos: newPos }
        }
        return dp
      })

      if (dataUpdated) {
        beaconsRef.current = updatedBeacons
        setBeacons(updatedBeacons)
      }

      // 4.5. Collect / Crash Asteroids
      let asteroidsUpdated = false
      let hitDestroyedShip = false

      const updatedAsteroids = asteroidsRef.current.map(ast => {
        if (ast.health <= 0) return ast

        const astDiff = new THREE.Vector3().subVectors(ast.pos, pState.pos)
        astDiff.y = 0
        if (astDiff.length() < ast.radius + 0.35) {
          asteroidsUpdated = true

          const baseDamage = ast.type === 'ice' ? 3 : ast.type === 'carbon' ? 4 : 6
          const sizeMult = ast.size === 'large' ? 4 : ast.size === 'medium' ? 2 : 1
          const fraction = ast.health / 10
          const finalDamage = Math.ceil(baseDamage * sizeMult * fraction)

          pState.integrity = Math.max(0, pState.integrity - finalDamage)
          triggerDataToast(`-${finalDamage} Hull`, pState.pos, '#ff4757')

          // Dispatch HIT_ASTEROID
          handleTrigger(TriggerId.HIT_ASTEROID, pState, purchasedUpgradesRef.current, { triggerDataToast });

          if (pState.integrity <= 0) {
            hitDestroyedShip = true
            handleTrigger(TriggerId.PROBE_DEATH, pState, purchasedUpgradesRef.current, { triggerDataToast });
            handleTrigger(TriggerId.PROBE_DEATH_BY_COLLISION, pState, purchasedUpgradesRef.current, { triggerDataToast });
            pState.vel.set(0, 0, 0); // Stop probe movement on death!
          }

          let baseDataRewards = ast.type === 'metallic' ? (15 + Math.random() * 35) : (10 + Math.random() * 20)
          const dataMult = ast.size === 'large' ? 4 : ast.size === 'medium' ? 2 : 1
          const finalData = Math.round(baseDataRewards * dataMult)
          pState.data += finalData

          const toastColor = ast.type === 'metallic' ? '#ffd700' : ast.type === 'ice' ? '#00ffcc' : '#ffffff'
          triggerDataToast(`+${finalData.toFixed(0)} Data`, ast.pos, toastColor)

          const ownedUpgrades = purchasedUpgradesRef.current
          const hackChance = (ast.type === 'metallic' ? 0.10 : ast.type === 'carbon' ? 0.05 : 0.03) + (ast.size === 'large' ? 0.10 : ast.size === 'medium' ? 0.05 : 0.0)
          const modChance = (ast.type === 'metallic' ? 0.0 : ast.type === 'carbon' ? 0.15 : 0.10) + (ast.size === 'large' ? 0.10 : ast.size === 'medium' ? 0.05 : 0.0)

          const rollHack = Math.random() < hackChance
          const rollMod = Math.random() < modChance

          if (rollHack) {
            const allHacks = [HackId.LUCKY_CHARM, HackId.DEEP_SPACE_SENSOR]
            const unownedHacks = allHacks.filter(p => !ownedUpgrades.includes(p))
            if (unownedHacks.length > 0) {
              const droppedHackId = unownedHacks[Math.floor(Math.random() * unownedHacks.length)]
              const droppedHack = UPGRADE_REGISTRY[droppedHackId]
              setPurchasedUpgrades(current => [...current, droppedHackId])
              purchasedUpgradesRef.current = [...purchasedUpgradesRef.current, droppedHackId]
              triggerDataToast(`+${droppedHack.name} Hack!`, ast.pos, '#ffd700')
            } else {
              pState.data += 30
              triggerDataToast(`+30 Data Bonus!`, ast.pos, '#ffd700')
            }
          } else if (rollMod) {
            const allModules = [ModuleId.ATMOSPHERIC_SCOOP, ModuleId.RAMJET, ModuleId.GRAVITY_STABILIZER, ModuleId.BLACK_BOX, ModuleId.WIND_SHIELD]
            const unownedModules = allModules.filter(m => !ownedUpgrades.includes(m))
            if (unownedModules.length > 0) {
              const droppedModId = unownedModules[Math.floor(Math.random() * unownedModules.length)]
              const droppedMod = UPGRADE_REGISTRY[droppedModId]
              setPurchasedUpgrades(current => [...current, droppedModId])
              purchasedUpgradesRef.current = [...purchasedUpgradesRef.current, droppedModId]
              triggerDataToast(`+${droppedMod.name} Module!`, ast.pos, '#ffd700')
            } else {
              pState.data += 40
              triggerDataToast(`+40 Data Bonus!`, ast.pos, '#ffd700')
            }
          }

          return { ...ast, health: 0 }
        }
        return ast
      })

      if (asteroidsUpdated) {
        asteroidsRef.current = updatedAsteroids
        setAsteroids(updatedAsteroids)
      }

      if (hitDestroyedShip) {
        probeRef.current = pState
        setProbe(pState)
        if (pState.data >= SECTOR_QUOTA) {
          gameStateRef.current = 'WIN'
          setGameState('WIN')
          const earnedDataCores = Math.floor(pState.data / SECTOR_QUOTA)
          const bonus = purchasedUpgradesRef.current.includes(HackId.LUCKY_CHARM) ? 1 : 0
          console.log("Asteroid Crash Win! Data:", pState.data, "Data Cores:", earnedDataCores, "Bonus:", bonus)
          onSecureDataCores(earnedDataCores + bonus)
        } else {
          gameStateRef.current = 'CRASHED'
          setGameState('CRASHED')
        }
        if (selfDestructTimeoutRef.current) {
          clearTimeout(selfDestructTimeoutRef.current);
          selfDestructTimeoutRef.current = null;
        }
        setShowSelfDestruct(false);
        return
      }

      // 5. Portal Escape
      const portalDiff = new THREE.Vector3().subVectors(portal.pos, pState.pos)
      portalDiff.y = 0
      if (portalDiff.length() < portal.radius + 0.35) {
        pState.data += SECTOR_QUOTA
        probeRef.current = pState
        setProbe(pState)
        triggerDataToast(`+${SECTOR_QUOTA} Portal Escape!`, portal.pos, '#ffd700')
        gameStateRef.current = 'PORTAL_EXIT'
        setGameState('PORTAL_EXIT')
        const earnedDataCores = Math.floor(pState.data / SECTOR_QUOTA)
        const bonus = purchasedUpgradesRef.current.includes(HackId.LUCKY_CHARM) ? 1 : 0
        console.log("Portal Escape Win! Data:", pState.data, "Data Cores:", earnedDataCores, "Bonus:", bonus)
        onSecureDataCores(earnedDataCores + bonus)
        if (selfDestructTimeoutRef.current) {
          clearTimeout(selfDestructTimeoutRef.current);
          selfDestructTimeoutRef.current = null;
        }
        setShowSelfDestruct(false);
        return
      }

      // 6. Frictional Stop
      if (pState.vel.length() < MIN_SPEED_THRESHOLD) {
        pState.vel.set(0, 0, 0)
        probeRef.current = pState
        setProbe(pState)

        if (selfDestructTimeoutRef.current) {
          clearTimeout(selfDestructTimeoutRef.current);
          selfDestructTimeoutRef.current = null;
        }
        setShowSelfDestruct(false);

        if (pState.data >= SECTOR_QUOTA) {
          gameStateRef.current = 'WIN'
          setGameState('WIN')
          const earnedDataCores = Math.floor(pState.data / SECTOR_QUOTA)
          const bonus = purchasedUpgradesRef.current.includes(HackId.LUCKY_CHARM) ? 1 : 0
          console.log("Safe Orbit Win! Data:", pState.data, "Data Cores:", earnedDataCores, "Bonus:", bonus)
          onSecureDataCores(earnedDataCores + bonus)
        } else {
          gameStateRef.current = 'STOPPED'
          setGameState('STOPPED')
        }
        return
      }

      probeRef.current = pState
      setProbe(pState)
      animFrameId = requestAnimationFrame(physicsLoop)
    }

    animFrameId = requestAnimationFrame(physicsLoop)
    return () => cancelAnimationFrame(animFrameId)
  }, [gameState])

  return {
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
    triggerDataToast,
    showSelfDestruct,
    setShowSelfDestruct,
    selfDestructTimeoutRef,
    handleSelfDestruct
  }
}

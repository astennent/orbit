import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Probe, Planet, ExitPortal, Beacon, Asteroid, DataToast, GameState, ModuleId, HackId, TriggerId, LogEntry } from '../types'
import { UPGRADE_REGISTRY, MODULES_REGISTRY, HACKS_REGISTRY } from '../constants/upgrades'
import { handleTrigger, executeModuleEffect } from '../utils/moduleEffects'
import { createFreshProbe, applyDamage } from '../utils/probeUtils'
import {
  GRAVITATIONAL_CONSTANT,
  ATMOSPHERE_DRAG,
  PHYSICS_DT,
  MIN_SPEED_THRESHOLD,
  GAS_GIANT_MIN_SPEED_THRESHOLD,
  OUT_OF_BOUNDS_LIMIT
} from '../constants'

import {
  BASE_PLANET_DAMAGE,
  GRAVITY_STABILIZER_SHIELD_ABSORPTION,
  GRAVITY_STABILIZER_V2_SHIELD_ABSORPTION
} from '../constants/moduleConstants'

interface UsePhysicsLoopProps {
  gameState: GameState
  setGameState: (state: GameState) => void
  gameStateRef: React.MutableRefObject<GameState>
  planets: Planet[]
  portal: ExitPortal
  initialSector: { beacons: Beacon[]; asteroids: Asteroid[] }
  aimStartPos: THREE.Vector3
  onSecureDataCores: (cores: number) => void
  activeModulesRef: React.MutableRefObject<(ModuleId | null)[]>
  activeHacksRef: React.MutableRefObject<HackId[]>
  setModuleSlots: React.Dispatch<React.SetStateAction<(ModuleId | null)[]>>
  setHackSlots: React.Dispatch<React.SetStateAction<HackId[]>>
  sectorQuota: number
}

export function usePhysicsLoop({
  gameState,
  setGameState,
  gameStateRef,
  planets,
  portal,
  initialSector,
  aimStartPos,
  onSecureDataCores,
  activeModulesRef,
  activeHacksRef,
  setModuleSlots,
  setHackSlots,
  sectorQuota
}: UsePhysicsLoopProps) {
  const [probe, setProbe] = useState<Probe>(() => createFreshProbe(aimStartPos))

  const [beacons, setBeacons] = useState<Beacon[]>(initialSector.beacons)
  const [asteroids, setAsteroids] = useState<Asteroid[]>(initialSector.asteroids)
  const [toasts, setToasts] = useState<DataToast[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showSelfDestruct, setShowSelfDestruct] = useState<boolean>(false)

  const probeRef = useRef<Probe>(createFreshProbe(aimStartPos))
  const beaconsRef = useRef<Beacon[]>(initialSector.beacons)
  const asteroidsRef = useRef<Asteroid[]>(initialSector.asteroids)
  const selfDestructTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasInsideAtmosphereRef = useRef(false)
  const activeCollidingPlanetIdRef = useRef<string | null>(null)

  // Timers for active timed hacks
  const oscillatorTimerRef = useRef(1.0)
  const metronomeTimerRef = useRef(3.0)
  const flightTimeRef = useRef<number>(0)

  const triggerDataToast = (text: string, pos: THREE.Vector3, color?: string) => {
    const newToast: DataToast = {
      id: `toast-${Date.now()}-${Math.random()}`,
      text,
      pos: pos.clone(),
      color
    };
    setToasts(current => [...current, newToast]);

    // Append to Ship's Log
    setLogs(current => [
      ...current,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        text,
        color,
        timeStr: flightTimeRef.current
      }
    ]);

    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== newToast.id));
    }, 1200);
  }

  // Centralized helper to resolve flight end outcomes (win vs loss)
  const resolveFlightOutcome = (
    pState: Probe,
    lossState: 'STOPPED' | 'CRASHED',
    contextName: string,
    overrideSuccessState?: 'PORTAL_EXIT'
  ) => {
    if (selfDestructTimeoutRef.current) {
      clearTimeout(selfDestructTimeoutRef.current)
      selfDestructTimeoutRef.current = null
    }
    setShowSelfDestruct(false)

    const isWin = overrideSuccessState === 'PORTAL_EXIT' || pState.data >= sectorQuota
    const successState = overrideSuccessState || 'WIN'

    if (isWin) {
      gameStateRef.current = successState
      setGameState(successState)
      const earnedDataCores = Math.floor(pState.data / sectorQuota)
      console.log(`${contextName} Win! Data:`, pState.data, "Data Cores:", earnedDataCores)
      onSecureDataCores(earnedDataCores)
    } else {
      gameStateRef.current = lossState
      setGameState(lossState)
    }
  }

  // Wrapper to dispatch events to handleTrigger with the slots context
  const dispatchTrigger = (triggerId: TriggerId, pState: Probe) => {
    handleTrigger(
      triggerId,
      pState,
      activeModulesRef.current,
      activeHacksRef.current,
      { triggerDataToast }
    );
  }

  // Self-destruct action
  const handleSelfDestruct = () => {
    if (gameStateRef.current !== 'FLIGHT') return

    const pState = { ...probeRef.current }
    pState.vel.set(0, 0, 0)
    probeRef.current = pState
    setProbe(pState)

    resolveFlightOutcome(pState, 'STOPPED', 'Self-Destruct')
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

    flightTimeRef.current = 0
    wasInsideAtmosphereRef.current = false
    let animFrameId: number

    const physicsLoop = () => {
      if (gameStateRef.current !== 'FLIGHT') return

      const pState = { ...probeRef.current }
      pState.pos = pState.pos.clone()
      pState.vel = pState.vel.clone()
      pState.trail = [...pState.trail]

      // Increment flight time since launch
      flightTimeRef.current += PHYSICS_DT

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
            const gsCount = activeModulesRef.current.filter(id => id === ModuleId.GRAVITY_STABILIZER).length
            const gs2Count = activeModulesRef.current.filter(id => id === ModuleId.GRAVITY_STABILIZER_V2).length
            const absorption = gsCount * GRAVITY_STABILIZER_SHIELD_ABSORPTION + gs2Count * GRAVITY_STABILIZER_V2_SHIELD_ABSORPTION
            const damage = Math.max(1, BASE_PLANET_DAMAGE - absorption)

            const tookHpDamage = applyDamage(pState, damage, triggerDataToast);

            if (!tookHpDamage) {
              triggerDataToast(`Shield Absorbed Planet Bounce!`, pState.pos, '#00e5ff');
            }

            if (pState.integrity <= 0) {
              hitPlanet = true
              dispatchTrigger(TriggerId.PLANET_DEATH, pState);
              dispatchTrigger(TriggerId.PROBE_DEATH, pState);
              dispatchTrigger(TriggerId.PROBE_DEATH_BY_COLLISION, pState);
              pState.vel.set(0, 0, 0); // Stop probe movement on death!
            } else {
              dispatchTrigger(TriggerId.PLANET_BOUNCE, pState);
            }
          }
          break
        }

        // Gas Giant Core Halt Check
        if (planet.isGasGiant && dist < planet.radius) {
          if (pState.vel.length() < GAS_GIANT_MIN_SPEED_THRESHOLD) {
            pState.vel.set(0, 0, 0)
            probeRef.current = pState
            setProbe(pState)
            resolveFlightOutcome(pState, 'STOPPED', 'Gas Giant Halt')
            return
          }
        }


        if (dist > 0.2) {
          let forceMagnitude: number
          if (dist < planet.radius) {
            // Newton's Shell Theorem: linear gravity scaling inside the planet core to prevent infinite gravity spikes (singularity)
            forceMagnitude = (GRAVITATIONAL_CONSTANT * planet.mass * dist) / (planet.radius * planet.radius * planet.radius)
          } else {
            // Standard inverse-square law outside the planet core
            forceMagnitude = (GRAVITATIONAL_CONSTANT * planet.mass) / (dist * dist)
          }
          const direction = diff.normalize()
          acc.addScaledVector(direction, forceMagnitude)
        }

        // 2. Atmospheric Drag
        if (dist < planet.atmosphereRadius) {
          let drag = ATMOSPHERE_DRAG
          if (planet.isGasGiant && dist < planet.radius) {
            drag = ATMOSPHERE_DRAG * 30.0 // extremely high 30x core drag when passing through a gas giant!
          }
          pState.vel.multiplyScalar(1.0 - drag * PHYSICS_DT)
        }
      }

      // Update active colliding planet ID ref for consecutive frame checks
      activeCollidingPlanetIdRef.current = currentCollidingPlanetId

      if (hitPlanet) {
        probeRef.current = pState
        setProbe(pState)
        resolveFlightOutcome(pState, 'CRASHED', 'Planet Crash')
        return
      }

      // 3. Update coordinates
      pState.vel.addScaledVector(acc, PHYSICS_DT)
      pState.pos.addScaledVector(pState.vel, PHYSICS_DT)

      // 3.5. Out of bounds checking
      if (pState.pos.length() > OUT_OF_BOUNDS_LIMIT) {
        dispatchTrigger(TriggerId.OUT_OF_BOUNDS, pState);
        pState.integrity = 0;
        pState.vel.set(0, 0, 0); // Stop probe movement on death!
        dispatchTrigger(TriggerId.PROBE_DEATH, pState);
        probeRef.current = pState
        setProbe(pState)
        if (pState.data < sectorQuota) {
          triggerDataToast("OUT OF BOUNDS!", pState.pos, '#ff4757');
        }
        resolveFlightOutcome(pState, 'CRASHED', 'Out of Bounds')
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
          dispatchTrigger(TriggerId.ENTER_GAS_PLANET, pState);
        } else {
          dispatchTrigger(TriggerId.ENTER_ATMOSPHERE, pState);
        }
      } else if (!insideAtmosphere && wasInsideAtmosphereRef.current) {
        dispatchTrigger(TriggerId.LEAVE_ATMOSPHERE, pState);
      }
      wasInsideAtmosphereRef.current = insideAtmosphere;

      // Timed Hacks Integration (Oscillator & Metronome)
      const oscillatorCount = activeHacksRef.current.filter(id => id === HackId.OVERCLOCKED_OSCILLATOR).length;
      if (oscillatorCount > 0) {
        oscillatorTimerRef.current -= PHYSICS_DT;
        if (oscillatorTimerRef.current <= 0) {
          oscillatorTimerRef.current = 1.0;
          for (let j = 0; j < oscillatorCount; j++) {
            const equippedIdxs: number[] = [];
            activeModulesRef.current.forEach((m, idx) => {
              if (m !== null) equippedIdxs.push(idx);
            });
            if (equippedIdxs.length > 0) {
              const randIdx = equippedIdxs[Math.floor(Math.random() * equippedIdxs.length)];
              const randomModuleId = activeModulesRef.current[randIdx] as ModuleId;
              console.log(`[Overclocked Oscillator Hack] Triggering Slot ${randIdx + 1}: ${randomModuleId}`);
              triggerDataToast(`⚡ OSCILLATOR: ${UPGRADE_REGISTRY[randomModuleId].name.toUpperCase()}`, pState.pos, '#ffea00');
              executeModuleEffect(randIdx, randomModuleId, pState, { triggerDataToast, forceTriggered: true });
            }
          }
        }
      }

      const metronomeCount = activeHacksRef.current.filter(id => id === HackId.METRONOME_MALFUNCTION).length;
      if (metronomeCount > 0) {
        metronomeTimerRef.current -= PHYSICS_DT;
        if (metronomeTimerRef.current <= 0) {
          metronomeTimerRef.current = 3.0;
          for (let j = 0; j < metronomeCount; j++) {
            const slot3Module = activeModulesRef.current[2];
            if (slot3Module) {
              console.log(`[Metronome Malfunction Hack] Triggering Slot 3: ${slot3Module}`);
              triggerDataToast(`⏱ METRONOME: ${UPGRADE_REGISTRY[slot3Module].name.toUpperCase()}`, pState.pos, '#00ff66');
              executeModuleEffect(2, slot3Module, pState, { triggerDataToast, forceTriggered: true });
            }
          }
        }
      }

      // Decrement scoop active timer if active
      if (pState.scoopActiveTimer !== undefined && pState.scoopActiveTimer > 0) {
        pState.scoopActiveTimer = Math.max(0, pState.scoopActiveTimer - PHYSICS_DT);
      }

      // Decrement shield duration and check for expiration
      if (pState.shieldDuration > 0) {
        pState.shieldDuration = Math.max(0, pState.shieldDuration - PHYSICS_DT);
        if (pState.shieldDuration === 0) {
          pState.shieldLevel = 0;
          triggerDataToast("SHIELD EXPIRED", pState.pos, '#ff4757');
        }
      }

      let timeRate = 1.5
      const sensorCount = activeHacksRef.current.filter(id => id === HackId.DEEP_SPACE_SENSOR).length;
      if (sensorCount > 0) {
        timeRate *= Math.pow(2, sensorCount);
      }
      if (insideAtmosphere) {
        timeRate *= 10.0
      }
      if (pState.scoopActiveTimer !== undefined && pState.scoopActiveTimer > 0) {
        timeRate *= (pState.scoopMultiplier || 10.0)
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
          dispatchTrigger(TriggerId.HIT_BEACON, pState);

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

          const tookHpDamage = applyDamage(pState, finalDamage, triggerDataToast);

          if (!tookHpDamage) {
            triggerDataToast(`Shield Absorbed Asteroid Impact!`, pState.pos, '#00e5ff')
          }

          // Dispatch HIT_ASTEROID
          dispatchTrigger(TriggerId.HIT_ASTEROID, pState);

          if (pState.integrity <= 0) {
            hitDestroyedShip = true
            dispatchTrigger(TriggerId.PROBE_DEATH, pState);
            dispatchTrigger(TriggerId.PROBE_DEATH_BY_COLLISION, pState);
            pState.vel.set(0, 0, 0); // Stop probe movement on death!
          }

          let baseDataRewards = ast.type === 'metallic' ? (15 + Math.random() * 35) : (10 + Math.random() * 20)
          const dataMult = ast.size === 'large' ? 4 : ast.size === 'medium' ? 2 : 1
          const finalData = Math.round(baseDataRewards * dataMult)
          pState.data += finalData

          const toastColor = ast.type === 'metallic' ? '#ffd700' : ast.type === 'ice' ? '#00ffcc' : '#ffffff'
          triggerDataToast(`+${finalData.toFixed(0)} Data`, ast.pos, toastColor)

          const hackChance = (ast.type === 'metallic' ? 0.10 : ast.type === 'carbon' ? 0.05 : 0.03) + (ast.size === 'large' ? 0.10 : ast.size === 'medium' ? 0.05 : 0.0)
          const modChance = (ast.type === 'metallic' ? 0.0 : ast.type === 'carbon' ? 0.15 : 0.10) + (ast.size === 'large' ? 0.10 : ast.size === 'medium' ? 0.05 : 0.0)

          const rollHack = Math.random() < hackChance
          const rollMod = Math.random() < modChance

          if (rollHack) {
            const randomHack = HACKS_REGISTRY[Math.floor(Math.random() * HACKS_REGISTRY.length)]
            triggerDataToast(`LOOTED HACK: ${randomHack.name.toUpperCase()}`, ast.pos, randomHack.color)
            setHackSlots(prev => [...prev, randomHack.id as HackId])
          } else if (rollMod) {
            const randomMod = MODULES_REGISTRY[Math.floor(Math.random() * MODULES_REGISTRY.length)]
            const emptyIdx = activeModulesRef.current.indexOf(null)
            if (emptyIdx !== -1) {
              triggerDataToast(`LOOTED MODULE: ${randomMod.name.toUpperCase()}`, ast.pos, randomMod.color)
              setModuleSlots(prev => {
                const next = [...prev]
                const firstEmpty = next.indexOf(null)
                if (firstEmpty !== -1) {
                  next[firstEmpty] = randomMod.id as ModuleId
                }
                return next
              })
            } else {
              pState.data += 100
              triggerDataToast(`SLOTS FULL! +100 DATA`, ast.pos, '#ffd700')
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
        resolveFlightOutcome(pState, 'CRASHED', 'Asteroid Crash')
        return
      }

      // 5. Portal Escape
      const portalDiff = new THREE.Vector3().subVectors(portal.pos, pState.pos)
      portalDiff.y = 0
      if (portalDiff.length() < portal.radius + 0.35) {
        pState.data += sectorQuota
        probeRef.current = pState
        setProbe(pState)
        triggerDataToast(`+${sectorQuota} Portal Escape!`, portal.pos, '#ffd700')
        resolveFlightOutcome(pState, 'CRASHED', 'Portal Escape', 'PORTAL_EXIT')
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

        resolveFlightOutcome(pState, 'STOPPED', 'Safe Orbit')
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
    handleSelfDestruct,
    logs,
    setLogs
  }
}

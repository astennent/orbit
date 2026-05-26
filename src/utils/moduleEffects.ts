import { TriggerId, Probe, ModuleId, HackId } from '../types';
import { UPGRADE_REGISTRY } from '../constants/upgrades';
import * as THREE from 'three';
import {
  ATMOSPHERIC_SCOOP_DURATION,
  ATMOSPHERIC_SCOOP_MULTIPLIER,
  ATMOSPHERIC_SCOOP_V2_DURATION,
  ATMOSPHERIC_SCOOP_V2_MULTIPLIER,
  RAMJET_SHIELD_ADD,
  RAMJET_SHIELD_DURATION,
  RAMJET_V2_SHIELD_ADD,
  RAMJET_V2_SHIELD_DURATION,
  GRAVITY_STABILIZER_BONUS_DATA,
  GRAVITY_STABILIZER_V2_BONUS_DATA,
  BLACK_BOX_BONUS_DATA,
  BLACK_BOX_V2_BONUS_DATA,
  WIND_SHIELD_HULL_RESTORED,
  WIND_SHIELD_V2_HULL_RESTORED,
  MAGNETO_SCRAPPER_RANGE_ADD,
  MAGNETO_SCRAPPER_V2_RANGE_ADD
} from '../constants/moduleConstants';

export interface TriggerContext {
  triggerDataToast: (text: string, pos: THREE.Vector3, color?: string) => void;
  forceTriggered?: boolean;
}

/**
 * Single decoupled utility handler that is called when a gameplay TriggerId fires.
 * It loops over the active modules in order of purchase/slotting and runs matched triggers.
 */
export function handleTrigger(
  triggerId: TriggerId,
  pState: Probe,
  activeModules: (ModuleId | null)[],
  activeHacks: HackId[],
  context: TriggerContext
) {
  console.log(`[Event Dispatcher] Trigger fired: ${triggerId}`);

  const isDeathTrigger =
    triggerId === TriggerId.PROBE_DEATH ||
    triggerId === TriggerId.PROBE_DEATH_BY_COLLISION ||
    triggerId === TriggerId.PLANET_DEATH;

  // 1. Ejection Route #6 Hack: On probe death, trigger Slot 6 module three times per hack owned
  if (isDeathTrigger) {
    const ejectionCount = activeHacks.filter(id => id === HackId.EJECTION_ROUTE_6).length;
    if (ejectionCount > 0) {
      const slot6Module = activeModules[5];
      if (slot6Module) {
        console.log(`[Ejection Route #6 Hack] Triggering Slot 6 module three times per hack!`);
        for (let j = 0; j < ejectionCount; j++) {
          context.triggerDataToast("➏ EJECTION ROUTE #6 ACTIVE!", pState.pos, '#ff00ff');
          for (let i = 0; i < 3; i++) {
            executeModuleEffect(5, slot6Module, pState, context);
          }
        }
      }
    }
  }

  // 2. Short-Circuit Hack: On beacon collection, 5% chance per hack owned to trigger a random equipped module
  if (triggerId === TriggerId.HIT_BEACON) {
    const shortCount = activeHacks.filter(id => id === HackId.SHORT_CIRCUIT).length;
    for (let j = 0; j < shortCount; j++) {
      if (Math.random() < 0.05) {
        const equippedIdxs: number[] = [];
        activeModules.forEach((m, idx) => {
          if (m !== null) equippedIdxs.push(idx);
        });
        if (equippedIdxs.length > 0) {
          const randIdx = equippedIdxs[Math.floor(Math.random() * equippedIdxs.length)];
          const randomModuleId = activeModules[randIdx] as ModuleId;
          console.log(`[Short-Circuit Hack] Triggering random module: ${randomModuleId}`);
          context.triggerDataToast(`↯ SHORT-CIRCUIT: ${UPGRADE_REGISTRY[randomModuleId].name.toUpperCase()}`, pState.pos, '#00ffff');
          executeModuleEffect(randIdx, randomModuleId, pState, context);
        }
      }
    }
  }

  // 3. Death-Rattle Loop Hack: On probe death, triggers all active death-triggered modules an extra time per hack owned
  const deathRattleCount = activeHacks.filter(id => id === HackId.DEATH_RATTLE_LOOP).length;
  const iterations = isDeathTrigger ? (1 + deathRattleCount) : 1;

  for (let i = 0; i < iterations; i++) {
    if (i > 0) {
      console.log(`[Death-Rattle Loop Hack] Re-triggering death effects (Iteration ${i + 1})`);
      context.triggerDataToast("☠ DEATH-RATTLE: DOUBLE TRIGGER!", pState.pos, '#ff3333');
    }

    for (let slotIdx = 0; slotIdx < activeModules.length; slotIdx++) {
      const moduleId = activeModules[slotIdx];
      if (!moduleId) continue;

      const upgrade = UPGRADE_REGISTRY[moduleId];
      if (upgrade.triggerId === triggerId) {
        executeModuleEffect(slotIdx, moduleId, pState, context);
      }
    }
  }
}

/**
 * Handles the actual visual stub behaviors of each individual module.
 */
export function executeModuleEffect(moduleIndex: number, moduleId: ModuleId, pState: Probe, context: TriggerContext) {
  // Dispatch a custom DOM event to alert React components of module activation pulses
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('module-triggered', {
      detail: {
        moduleIndex,
        forceTriggered: !!context.forceTriggered
      }
    });
    window.dispatchEvent(event);
  }

  switch (moduleId) {
    case ModuleId.ATMOSPHERIC_SCOOP:
      console.log(`Triggered ATMOSPHERIC_SCOOP! ${ATMOSPHERIC_SCOOP_MULTIPLIER}x data boost active for ${ATMOSPHERIC_SCOOP_DURATION}s.`);
      pState.scoopActiveTimer = ATMOSPHERIC_SCOOP_DURATION;
      pState.scoopMultiplier = ATMOSPHERIC_SCOOP_MULTIPLIER;
      context.triggerDataToast(`ATMOSPHERIC SCOOP: ${ATMOSPHERIC_SCOOP_MULTIPLIER}x DATA BOOST ACTIVE!`, pState.pos, 'var(--glow-cyan)');
      break;

    case ModuleId.ATMOSPHERIC_SCOOP_V2:
      console.log(`Triggered ATMOSPHERIC_SCOOP_V2! ${ATMOSPHERIC_SCOOP_V2_MULTIPLIER}x data boost active for ${ATMOSPHERIC_SCOOP_V2_DURATION}s.`);
      pState.scoopActiveTimer = ATMOSPHERIC_SCOOP_V2_DURATION;
      pState.scoopMultiplier = ATMOSPHERIC_SCOOP_V2_MULTIPLIER;
      context.triggerDataToast(`ATMOSPHERIC SCOOP V2: ${ATMOSPHERIC_SCOOP_V2_MULTIPLIER}x DATA BOOST ACTIVE!`, pState.pos, 'var(--glow-cyan)');
      break;

    case ModuleId.RAMJET:
      console.log(`Triggered RAMJET! +${RAMJET_SHIELD_ADD} shield level, +${RAMJET_SHIELD_DURATION}s shield duration.`);
      pState.shieldLevel += RAMJET_SHIELD_ADD;
      pState.shieldDuration += RAMJET_SHIELD_DURATION;
      context.triggerDataToast(`RAMJET: SHIELD +${RAMJET_SHIELD_ADD} (${RAMJET_SHIELD_DURATION}s)`, pState.pos, 'var(--glow-green)');
      break;

    case ModuleId.RAMJET_V2:
      console.log(`Triggered RAMJET V2! +${RAMJET_V2_SHIELD_ADD} shield level, +${RAMJET_V2_SHIELD_DURATION}s shield duration.`);
      pState.shieldLevel += RAMJET_V2_SHIELD_ADD;
      pState.shieldDuration += RAMJET_V2_SHIELD_DURATION;
      context.triggerDataToast(`RAMJET V2: SHIELD +${RAMJET_V2_SHIELD_ADD} (${RAMJET_V2_SHIELD_DURATION}s)`, pState.pos, 'var(--glow-green)');
      break;

    case ModuleId.GRAVITY_STABILIZER:
      console.log(`Triggered GRAVITY_STABILIZER! Collecting ${GRAVITY_STABILIZER_BONUS_DATA} data.`);
      pState.data += GRAVITY_STABILIZER_BONUS_DATA;
      context.triggerDataToast(`GRAVITY STABILIZER: +${GRAVITY_STABILIZER_BONUS_DATA} DATA`, pState.pos, 'var(--glow-orange)');
      break;

    case ModuleId.GRAVITY_STABILIZER_V2:
      console.log(`Triggered GRAVITY_STABILIZER V2! Collecting ${GRAVITY_STABILIZER_V2_BONUS_DATA} data.`);
      pState.data += GRAVITY_STABILIZER_V2_BONUS_DATA;
      context.triggerDataToast(`GRAVITY STABILIZER V2: +${GRAVITY_STABILIZER_V2_BONUS_DATA} DATA`, pState.pos, 'var(--glow-orange)');
      break;

    case ModuleId.BLACK_BOX:
      console.log(`Triggered BLACK_BOX! Collecting ${BLACK_BOX_BONUS_DATA} data.`);
      pState.data += BLACK_BOX_BONUS_DATA;
      context.triggerDataToast(`BLACK BOX: +${BLACK_BOX_BONUS_DATA} DATA SECURED`, pState.pos, '#ff4757');
      break;

    case ModuleId.BLACK_BOX_V2:
      console.log(`Triggered BLACK_BOX V2! Collecting ${BLACK_BOX_V2_BONUS_DATA} data.`);
      pState.data += BLACK_BOX_V2_BONUS_DATA;
      context.triggerDataToast(`BLACK BOX V2: +${BLACK_BOX_V2_BONUS_DATA} DATA SECURED`, pState.pos, '#ff4757');
      break;

    case ModuleId.WIND_SHIELD:
      console.log(`Triggered WIND_SHIELD! Restoring ${WIND_SHIELD_HULL_RESTORED} hull integrity.`);
      pState.integrity = Math.min(pState.maxIntegrity, pState.integrity + WIND_SHIELD_HULL_RESTORED);
      context.triggerDataToast(`WIND SHIELD: +${WIND_SHIELD_HULL_RESTORED} HULL RESTORED`, pState.pos, '#2ed573');
      break;

    case ModuleId.WIND_SHIELD_V2:
      console.log(`Triggered WIND_SHIELD V2! Restoring ${WIND_SHIELD_V2_HULL_RESTORED} hull integrity.`);
      pState.integrity = Math.min(pState.maxIntegrity, pState.integrity + WIND_SHIELD_V2_HULL_RESTORED);
      context.triggerDataToast(`WIND SHIELD V2: +${WIND_SHIELD_V2_HULL_RESTORED} HULL RESTORED`, pState.pos, '#2ed573');
      break;

    case ModuleId.MAGNETO_SCRAPPER:
      console.log(`Triggered MAGNETO_SCRAPPER! Increasing magnet range.`);
      pState.magnetRadius += MAGNETO_SCRAPPER_RANGE_ADD;
      context.triggerDataToast(`MAGNET RANGE +${MAGNETO_SCRAPPER_RANGE_ADD.toFixed(1)} (Total: ${pState.magnetRadius.toFixed(1)})`, pState.pos, '#a0a0ff');
      break;

    case ModuleId.MAGNETO_SCRAPPER_V2:
      console.log(`Triggered MAGNETO_SCRAPPER V2! Increasing magnet range.`);
      pState.magnetRadius += MAGNETO_SCRAPPER_V2_RANGE_ADD;
      context.triggerDataToast(`MAGNET RANGE +${MAGNETO_SCRAPPER_V2_RANGE_ADD.toFixed(1)} (Total: ${pState.magnetRadius.toFixed(1)})`, pState.pos, '#a0a0ff');
      break;

    default:
      break;
  }
}

import { TriggerId, Probe, ModuleId, HackId } from '../types';
import { UPGRADE_REGISTRY } from '../constants/upgrades';
import * as THREE from 'three';

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
      console.log("Triggered ATMOSPHERIC_SCOOP! 10x data boost active for 3s.");
      pState.scoopActiveTimer = 3.0;
      context.triggerDataToast("ATMOSPHERIC SCOOP: 10x DATA BOOST ACTIVE!", pState.pos, 'var(--glow-cyan)');
      break;

    case ModuleId.RAMJET:
      console.log("Triggered RAMJET! +10% velocity, +1 hull integrity.");
      pState.vel.multiplyScalar(1.10);
      pState.integrity = Math.min(pState.maxIntegrity, pState.integrity + 1);
      context.triggerDataToast("RAMJET: +10% SPEED & HULL RESTORED", pState.pos, 'var(--glow-green)');
      break;

    case ModuleId.GRAVITY_STABILIZER:
      console.log("Triggered GRAVITY_STABILIZER! Collecting 100 data.");
      pState.data += 100;
      context.triggerDataToast("GRAVITY STABILIZER: +100 DATA", pState.pos, 'var(--glow-orange)');
      break;

    case ModuleId.BLACK_BOX:
      console.log("Triggered BLACK_BOX! Collecting 300 data.");
      pState.data += 300;
      context.triggerDataToast("BLACK BOX: +300 DATA SECURED", pState.pos, '#ff4757');
      break;

    case ModuleId.WIND_SHIELD:
      console.log("Triggered WIND_SHIELD stub!");
      context.triggerDataToast("WIND SHIELD: STUB ACTIVE", pState.pos, '#2ed573');
      break;

    case ModuleId.MAGNETO_SCRAPPER:
      console.log("Triggered MAGNETO_SCRAPPER! Increasing magnet range.");
      pState.magnetRadius += 0.2;
      context.triggerDataToast(`MAGNET RANGE +0.2 (Total: ${pState.magnetRadius.toFixed(1)})`, pState.pos, '#a0a0ff');
      break;

    default:
      break;
  }
}

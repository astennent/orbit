import { TriggerId, Probe, ModuleId, UpgradeId } from '../types';
import { UPGRADE_REGISTRY } from '../constants/upgrades';
import * as THREE from 'three';

interface TriggerContext {
  triggerDataToast: (text: string, pos: THREE.Vector3, color?: string) => void;
}

/**
 * Single decoupled utility handler that is called when a gameplay TriggerId fires.
 * It loops over the active modules in order of purchase/slotting and runs matched triggers.
 */
export function handleTrigger(
  triggerId: TriggerId,
  pState: Probe,
  inventory: UpgradeId[],
  context: TriggerContext
) {
  console.log(`[Event Dispatcher] Trigger fired: ${triggerId}`);

  // Iterate over items in the Probe's inventory in order
  for (const upgradeId of inventory) {
    const upgrade = UPGRADE_REGISTRY[upgradeId];
    if (!upgrade || upgrade.type !== 'module') continue;

    // Check if this module is registered to handle this specific trigger
    if (upgrade.triggerId === triggerId) {
      executeModuleEffect(upgrade.id as ModuleId, pState, context);
    }
  }
}

/**
 * Handles the actual visual stub behaviors of each individual module.
 */
function executeModuleEffect(moduleId: ModuleId, pState: Probe, context: TriggerContext) {
  switch (moduleId) {
    case ModuleId.ATMOSPHERIC_SCOOP:
      console.log("Triggered ATMOSPHERIC_SCOOP stub!");
      context.triggerDataToast("ATMOSPHERIC SCOOP: STUB ACTIVE", pState.pos, 'var(--glow-cyan)');
      break;

    case ModuleId.RAMJET:
      console.log("Triggered RAMJET stub!");
      context.triggerDataToast("RAMJET: STUB ACTIVE", pState.pos, 'var(--glow-green)');
      break;

    case ModuleId.GRAVITY_STABILIZER:
      console.log("Triggered GRAVITY_STABILIZER stub!");
      context.triggerDataToast("GRAVITY STABILIZER: STUB ACTIVE", pState.pos, 'var(--glow-orange)');
      break;

    case ModuleId.BLACK_BOX:
      console.log("Triggered BLACK_BOX stub!");
      context.triggerDataToast("BLACK BOX: STUB ACTIVE", pState.pos, '#ff4757');
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

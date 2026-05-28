import { GameState, UpgradeId } from '../types'

// Format high-level simulation state for the telemetry spec overlay
export const getStatusDisplay = (gameState: GameState) => {
  switch (gameState) {
    case 'IDLE':
      return { label: 'PRE-LAUNCH', css: 'text-cyan' }
    case 'LAUNCHING':
      return { label: 'AIMING VECTOR...', css: 'text-cyan' }
    case 'FLIGHT':
      return { label: 'SIMULATION RUNNING', css: 'text-cyan' }
    case 'CRASHED':
      return { label: 'CRITICAL CRASH (HAZARD IMPACT)', css: 'text-red' }
    case 'STOPPED':
      return { label: 'STOPPED SHORT (QUOTAS UNMET)', css: 'text-orange' }
    case 'WIN':
      return { label: 'HARVEST SUCCESSFUL (STABLE ORBIT)', css: 'text-green' }
    case 'PORTAL_EXIT':
      return { label: 'PORTAL EXIT DETECTED', css: 'text-gold' }
  }
}

// Format glowing center-top success/momentum alerts
export const getBannerMessage = (gameState: GameState, probeData: number, sectorQuota: number, _purchasedUpgrades?: UpgradeId[]) => {
  if (gameState === 'WIN' || gameState === 'PORTAL_EXIT') {
    const totalSecured = Math.floor(probeData / sectorQuota)
    return {
      text: `SECURED THIS RUN: +${totalSecured} ${totalSecured === 1 ? 'DATA CORE' : 'DATA CORES'}!`,
      css: 'text-green',
      style: {
        textShadow: '0 0 10px rgba(0, 255, 157, 0.6)',
        fontWeight: 'bold',
        fontSize: '12px',
        letterSpacing: '2px',
        textTransform: 'uppercase' as const,
        marginTop: '10px',
        textAlign: 'center' as const
      }
    }
  }
  if (gameState === 'CRASHED') {
    return {
      text: 'HAZARD IMPACT: HULL INTEGRITY CRITICAL!',
      css: 'text-red',
      style: {
        textShadow: '0 0 10px rgba(255, 71, 87, 0.6)',
        fontWeight: 'bold',
        fontSize: '12px',
        letterSpacing: '2px',
        textTransform: 'uppercase' as const,
        marginTop: '10px',
        textAlign: 'center' as const
      }
    }
  }
  if (gameState === 'STOPPED') {
    return {
      text: 'MOMENTUM DECAY: HARVEST QUOTA UNMET!',
      css: 'text-orange',
      style: {
        textShadow: '0 0 10px rgba(255, 152, 0, 0.6)',
        fontWeight: 'bold',
        fontSize: '12px',
        letterSpacing: '2px',
        textTransform: 'uppercase' as const,
        marginTop: '10px',
        textAlign: 'center' as const
      }
    }
  }
  return null
}

// Dynamically scale beacon colors from Light Blue (10) to Green (50)
export function getBeaconColor(value: number): string {
  const t = Math.max(0, Math.min(1, (value - 10) / 40)); // 40 is 50 - 10
  const h = 200 - t * 80; // Hue shifts from 200 (light blue) to 120 (green)
  return `hsl(${h.toFixed(0)}, 100%, 50%)`;
}

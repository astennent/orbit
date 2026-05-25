import { GameState, UpgradeId, HackId } from '../types'
import { SECTOR_QUOTA } from '../constants'

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
export const getBannerMessage = (gameState: GameState, probeData: number, purchasedUpgrades: UpgradeId[]) => {
  if (gameState === 'WIN' || gameState === 'PORTAL_EXIT') {
    const earned = Math.floor(probeData / SECTOR_QUOTA)
    const bonus = purchasedUpgrades.includes(HackId.LUCKY_CHARM) ? 1 : 0
    const totalSecured = earned + bonus
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

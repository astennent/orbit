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

// HSV to RGB conversion (h: 0-360, s: 0-1, v: 0-1) → {r, g, b} in 0-1 range
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r1 = 0, g1 = 0, b1 = 0
  if (h < 60) { r1 = c; g1 = x }
  else if (h < 120) { r1 = x; g1 = c }
  else if (h < 180) { g1 = c; b1 = x }
  else if (h < 240) { g1 = x; b1 = c }
  else if (h < 300) { r1 = x; b1 = c }
  else { r1 = c; b1 = x }
  return { r: r1 + m, g: g1 + m, b: b1 + m }
}

// Beacon ink blot display color: high saturation, low value (0.4) for darker droplets
export function getBeaconColor(hue: number): string {
  const { r, g, b } = hsvToRgb(hue, 0.85, 0.4)
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
}

// Trail ink color: same hue but higher value (0.6) for brighter trail visibility
export function getTrailInkRgb(hue: number): { r: number; g: number; b: number } {
  return hsvToRgb(hue, 0.85, 0.6)
}

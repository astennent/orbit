import React from 'react'
import { GameState } from '../types'

interface LaunchControlPanelProps {
  gameState: GameState
  probeData: number
  sectorQuota: number
}

export const LaunchControlPanel: React.FC<LaunchControlPanelProps> = ({
  gameState,
  probeData,
  sectorQuota
}) => {
  const isDataQuotaMet = probeData >= sectorQuota
  const harvested = Math.floor(probeData)
  const multiplier = (harvested / sectorQuota).toFixed(1)

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '700px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      zIndex: 90,
      pointerEvents: 'auto'
    }}>
      {/* Progress display */}
      <div className="panel" style={{ padding: '15px 25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
          <span>DATA HARVESTED: <strong className="text-cyan font-orbitron" style={{ fontSize: '16px' }}>{harvested}</strong> / {sectorQuota} data</span>
          <span>QUOTA MULTIPLIER: <strong className={isDataQuotaMet ? 'text-green font-orbitron' : 'text-cyan font-orbitron'} style={{ fontSize: '16px' }}>{multiplier}x</strong></span>
        </div>

        <div className="progress-bar-container">
          <div
            className={`progress-bar-fill ${isDataQuotaMet ? 'success' : ''}`}
            style={{ width: `${Math.min(100, (harvested / sectorQuota) * 100)}%` }}
          />
        </div>
      </div>

      {/* Actions panel */}
      <div className="panel" style={{ padding: '15px 25px', display: 'flex', justifyItems: 'center', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '600px' }}>
          <span style={{ fontSize: '11px', color: 'var(--chrome-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {gameState === 'IDLE' && 'LAUNCH SEQUENCER ONLINE'}
            {gameState === 'LAUNCHING' && 'TENSION VECTOR ADJUSTMENT'}
            {gameState === 'FLIGHT' && 'OBSERVATION MATRIX ENGAGED'}
            {gameState === 'CRASHED' && 'TELEMETRY TERMINATED'}
            {gameState === 'STOPPED' && 'SPEED THRESHOLD DECAY'}
            {(gameState === 'WIN' || gameState === 'PORTAL_EXIT') && 'HARVEST EXTRACTION COMPLETE'}
          </span>
          <span style={{ fontSize: '12px', color: '#fff' }}>
            {gameState === 'IDLE' && 'Click and drag backward starting from the launchpad (ring indicator) to aim. Release drag to lock trajectory, then press SPACE to launch.'}
            {gameState === 'LAUNCHING' && 'Vary dragging distance to adjust velocity power, release to lock aiming vector.'}
            {gameState === 'FLIGHT' && 'Probe is in automated motion. Gravity wells and atmosphere friction will alter its course.'}
            {gameState === 'CRASHED' && 'Your probe collided with a planet core hazard. Re-launch to try again.'}
            {gameState === 'STOPPED' && 'Your probe lost momentum before reaching the data quota threshold. Re-launch.'}
            {(gameState === 'WIN' || gameState === 'PORTAL_EXIT') && 'Data Core reserves have been minted successfully. Launch again to acquire more!'}
          </span>
        </div>
      </div>
    </div>
  )
}

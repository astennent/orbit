import React from 'react'

interface LaunchControlPanelProps {
  probeData: number
  sectorQuota: number
}

export const LaunchControlPanel: React.FC<LaunchControlPanelProps> = ({
  probeData,
  sectorQuota
}) => {
  const isDataQuotaMet = probeData >= sectorQuota
  const harvested = Math.floor(probeData)
  const multiplier = Math.floor(probeData / sectorQuota).toFixed(0)

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
    </div>
  )
}

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

  const ratio = sectorQuota > 0 ? probeData / sectorQuota : 0

  // Base bar: width caps at 100%
  const basePercent = Math.min(100, ratio * 100)
  // Base bar gradient: blue when filling first time, green when quota met
  const baseBg = isDataQuotaMet
    ? 'linear-gradient(90deg, #02a050 0%, #00ff9d 100%)' // Green
    : 'linear-gradient(90deg, #026bb4 0%, #00e5ff 100%)' // Blue/Cyan

  // Yellow bar: 1/10th speed, capped at 100, only shown if ratio >= 1.0
  const showYellow = isDataQuotaMet
  const yellowPercent = Math.min(100, ratio * 10)
  const yellowBg = 'linear-gradient(90deg, #b8860b 0%, #ffd700 100%)'

  // Red bar: 1/100th speed, capped at 100, only shown if ratio >= 1.0
  const showRed = probeData >= sectorQuota * 10;
  const redPercent = Math.min(100, ratio)
  const redBg = 'linear-gradient(90deg, #c0392b 0%, #ff4757 100%)'

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

        <div className="progress-bar-container" style={{ position: 'relative', background: 'rgba(0,0,0,0.45)' }}>
          {/* Base progress bar */}
          <div
            className="progress-bar-fill"
            style={{
              width: `${basePercent}%`,
              background: baseBg,
              transition: 'width 0.3s ease-out, background 0.3s ease'
            }}
          />

          {/* Nested Yellow bar (1/10th speed) */}
          {showYellow && (
            <div
              style={{
                position: 'absolute',
                top: '5px',
                left: '2px',
                height: '6px',
                width: `calc(${yellowPercent}% - 4px)`,
                background: yellowBg,
                borderRadius: '3px',
                boxShadow: '0 0 4px rgba(255, 215, 0, 0.5)',
                transition: 'width 0.3s ease-out',
                pointerEvents: 'none'
              }}
            />
          )}

          {/* Nested Red bar (1/100th speed) */}
          {showRed && (
            <div
              style={{
                position: 'absolute',
                top: '7px',
                left: '2px',
                height: '2px',
                width: `calc(${redPercent}% - 4px)`,
                background: redBg,
                borderRadius: '1px',
                boxShadow: '0 0 2px rgba(255, 71, 87, 0.7)',
                transition: 'width 0.3s ease-out',
                pointerEvents: 'none'
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

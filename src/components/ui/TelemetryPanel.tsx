import React from 'react'
import { Probe } from '../../types'

interface TelemetryPanelProps {
  level: number
  statusLabel: string
  statusCss: string
  currentSpeed: number
  distanceToPlanetSurface: string
  probe: Probe
  activeBeaconsCount: number
  activeThreatsCount: number
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  level,
  statusLabel,
  statusCss,
  currentSpeed,
  distanceToPlanetSurface,
  probe,
  activeBeaconsCount,
  activeThreatsCount
}) => {
  return (
    <div className="panel">
      <h2 style={{ 
        margin: '0 0 15px 0', 
        fontSize: '14px', 
        borderBottom: '1px solid rgba(0,229,255,0.2)', 
        paddingBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline'
      }}>
        <div>
          Flight Telemetry
          <div className="font-script text-cyan" style={{ fontSize: '14px', marginTop: '2px', textTransform: 'none', fontWeight: 'normal' }}>Live rocket telemetry</div>
        </div>
        <div className="font-orbitron text-gold" style={{ fontSize: '15px', fontWeight: 'bold' }}>
          SECTOR {level}
        </div>
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
        <div>
          <div style={{ color: 'var(--chrome-dim)' }}>SYSTEM STATE:</div>
          <div className={`font-orbitron ${statusCss}`} style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '3px' }}>
            {statusLabel}
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--chrome-dim)' }}>PROBE SPEED:</div>
          <div className="text-cyan font-orbitron" style={{ fontSize: '18px', fontWeight: 600 }}>
            {currentSpeed.toFixed(2)} <span style={{ fontSize: '11px' }}>m/s</span>
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--chrome-dim)' }}>ALTITUDE:</div>
          <div className="text-cyan font-orbitron" style={{ fontSize: '18px', fontWeight: 600 }}>
            {distanceToPlanetSurface} <span style={{ fontSize: '11px' }}>km</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--chrome-dim)', marginBottom: '3px' }}>
            <span>HULL INTEGRITY:</span>
            <span className="font-orbitron" style={{ color: probe.integrity <= 3 ? 'var(--glow-red)' : probe.integrity <= 6 ? 'var(--glow-orange)' : 'var(--glow-green)', fontWeight: 'bold' }}>
              {probe.integrity} / {probe.maxIntegrity} HP
            </span>
          </div>
          <div className="progress-bar-container" style={{ height: '7px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px', padding: '1.5px', boxSizing: 'border-box' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.max(0, (probe.integrity / probe.maxIntegrity) * 100)}%`,
                background: probe.integrity <= 3 
                  ? 'linear-gradient(90deg, #ff4757, #ff6b81)' 
                  : probe.integrity <= 6 
                    ? 'linear-gradient(90deg, #ffa500, #ffc048)' 
                    : 'linear-gradient(90deg, #2ed573, #7bed9f)',
                boxShadow: probe.integrity <= 3 
                  ? '0 0 8px rgba(255, 71, 87, 0.6)' 
                  : probe.integrity <= 6 
                    ? '0 0 8px rgba(255, 165, 0, 0.6)' 
                    : '0 0 8px rgba(46, 213, 115, 0.6)',
                borderRadius: '2px',
                transition: 'width 0.3s ease-out'
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--chrome-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '9px', fontWeight: 'bold', marginBottom: '5px' }}>
            SECTOR OBJECTIVES:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ACTIVE BEACONS REMAINING:</span>
              <span className="text-cyan font-orbitron">{activeBeaconsCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ACTIVE HAZARDS (ASTEROIDS):</span>
              <span className="font-orbitron" style={{ color: 'var(--glow-red)', fontWeight: 'bold' }}>
                {activeThreatsCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

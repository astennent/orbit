import React from 'react'

interface ObjectivesPanelProps {
  harvestQuota: number
  activeBeaconsCount: number
  activeThreatsCount: number
}

export const ObjectivesPanel: React.FC<ObjectivesPanelProps> = ({
  harvestQuota,
  activeBeaconsCount,
  activeThreatsCount
}) => {
  return (
    <div className="panel">
      <h2 style={{ margin: '0 0 12px 0', fontSize: '14px', borderBottom: '1px solid rgba(0,255,157,0.2)', paddingBottom: '8px' }}>
        Level Objectives
      </h2>
      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>SECTOR HARVEST QUOTA:</span>
          <span className="text-cyan font-orbitron">{harvestQuota} Data</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>ACTIVE BEACONS REMAINING:</span>
          <span className="text-cyan font-orbitron">{activeBeaconsCount} Beacons</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>ACTIVE HAZARDS (ASTEROIDS):</span>
          <span className="text-red font-orbitron" style={{ color: 'var(--glow-red)', fontWeight: 'bold' }}>
            {activeThreatsCount} Threats
          </span>
        </div>
      </div>
    </div>
  )
}

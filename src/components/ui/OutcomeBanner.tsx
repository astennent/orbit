import React from 'react'
import { GameState } from '../../types'
import { getBannerMessage } from '../../utils/statusFormatters'

interface OutcomeBannerProps {
  gameState: GameState
  probeData: number
  sectorQuota: number
  showSelfDestruct: boolean
  onSelfDestruct: () => void
  onNextSector: () => void
  onResetProbe: () => void
  hasPendingLoot?: boolean
}

export const OutcomeBanner: React.FC<OutcomeBannerProps> = ({
  gameState,
  probeData,
  sectorQuota,
  showSelfDestruct,
  onSelfDestruct,
  onNextSector,
  onResetProbe,
  hasPendingLoot = false
}) => {
  const isEligibleForSelfDestruct = gameState === 'FLIGHT' && showSelfDestruct
  const isPostRun = gameState !== 'IDLE' && gameState !== 'LAUNCHING' && gameState !== 'FLIGHT'

  if (!isEligibleForSelfDestruct && !isPostRun) {
    return null
  }

  const bannerMsg = getBannerMessage(gameState, probeData, sectorQuota)

  return (
    <div style={{
      position: 'absolute',
      bottom: '125px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      pointerEvents: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {gameState === 'FLIGHT' ? (
          <button
            className="btn-arcade danger"
            style={{ fontSize: '14px', padding: '10px 24px', letterSpacing: '1px' }}
            onClick={onSelfDestruct}
          >
            🚨 SELF-DESTRUCT
          </button>
        ) : (gameState === 'WIN' || gameState === 'PORTAL_EXIT') ? (
          hasPendingLoot ? (
            <button
              className="btn-arcade loot-btn"
              style={{ fontSize: '14px', padding: '10px 24px', letterSpacing: '1px' }}
              onClick={onNextSector}
            >
              🔍 INSPECT LOOT
            </button>
          ) : (
            <button
              className="btn-arcade success"
              style={{ fontSize: '14px', padding: '10px 24px', letterSpacing: '1px' }}
              onClick={onNextSector}
            >
              🚀 NEXT SECTOR
            </button>
          )
        ) : (
          <button
            className="btn-arcade"
            style={{ fontSize: '14px', padding: '10px 24px', letterSpacing: '1px' }}
            onClick={onResetProbe}
          >
            🔄 RESET PROBE
          </button>
        )}

        {hasPendingLoot && gameState === 'FLIGHT' && (
          <div className="pending-loot-container" style={{ position: 'relative', display: 'inline-flex' }}>
            <span 
              style={{
                fontSize: '28px',
                cursor: 'help',
                display: 'inline-block',
                animation: 'pulseGlow 1.5s infinite alternate',
                userSelect: 'none'
              }}
            >
              🎁
            </span>
            <div className="loot-tooltip font-orbitron">
              <span style={{ color: '#ff00ff', fontWeight: 'bold' }}>PENDING LOOT DETECTED</span>
              <div style={{ fontSize: '9.5px', marginTop: '4px', opacity: 0.9, lineHeight: '1.3', fontWeight: 'normal', textTransform: 'none' }}>
                You have salvaged asteroid debris! Secure data cores and successfully complete this sector to extract your free module or hack bypass registers.
              </div>
            </div>
          </div>
        )}
      </div>

      {bannerMsg && (
        <div className={bannerMsg.css} style={bannerMsg.style}>
          {bannerMsg.text}
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { GameState, UpgradeId } from '../types'
import { getBannerMessage } from '../utils/statusFormatters'

interface OutcomeBannerProps {
  gameState: GameState
  probeData: number
  purchasedUpgrades: UpgradeId[]
  showSelfDestruct: boolean
  onSelfDestruct: () => void
  onNextSector: () => void
  onResetProbe: () => void
}

export const OutcomeBanner: React.FC<OutcomeBannerProps> = ({
  gameState,
  probeData,
  purchasedUpgrades,
  showSelfDestruct,
  onSelfDestruct,
  onNextSector,
  onResetProbe
}) => {
  const isEligibleForSelfDestruct = gameState === 'FLIGHT' && showSelfDestruct
  const isPostRun = gameState !== 'IDLE' && gameState !== 'LAUNCHING' && gameState !== 'FLIGHT'

  if (!isEligibleForSelfDestruct && !isPostRun) {
    return null
  }

  const bannerMsg = getBannerMessage(gameState, probeData, purchasedUpgrades)

  return (
    <div style={{
      position: 'absolute',
      top: '25px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      pointerEvents: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {gameState === 'FLIGHT' ? (
        <button 
          className="btn-arcade danger" 
          style={{ fontSize: '14px', padding: '10px 24px', letterSpacing: '1px' }} 
          onClick={onSelfDestruct}
        >
          🚨 SELF-DESTRUCT
        </button>
      ) : (gameState === 'WIN' || gameState === 'PORTAL_EXIT') ? (
        <button 
          className="btn-arcade success" 
          style={{ fontSize: '14px', padding: '10px 24px', letterSpacing: '1px' }} 
          onClick={onNextSector}
        >
          🚀 NEXT SECTOR
        </button>
      ) : (
        <button 
          className="btn-arcade" 
          style={{ fontSize: '14px', padding: '10px 24px', letterSpacing: '1px' }} 
          onClick={onResetProbe}
        >
          🔄 RESET PROBE
        </button>
      )}

      {bannerMsg && (
        <div className={bannerMsg.css} style={bannerMsg.style}>
          {bannerMsg.text}
        </div>
      )}
    </div>
  )
}

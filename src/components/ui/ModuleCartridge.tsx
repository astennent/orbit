import React from 'react';
import { UpgradeEntry, UpgradeId } from '../../types';
import { UPGRADE_REGISTRY } from '../../constants/upgrades';

interface ModuleCartridgeProps {
  mod: UpgradeEntry | null;
  index: number;
  context: 'hud' | 'shop-shelf' | 'shop-player';
  canAfford?: (cost: number) => boolean;
  purchasedShelfSlots?: boolean[];
  setPurchasedShelfSlots?: React.Dispatch<React.SetStateAction<boolean[]>>;
  onPurchase?: (upgrade: UpgradeEntry, slotIndex?: number) => void;
  onRearrange?: (sourceIndex: number, targetIndex: number) => void;
  onSell?: (upgrade: UpgradeEntry, slotIndex: number) => void;
  setHoveredUpgrade?: (upgrade: UpgradeEntry | null) => void;
}

export const ModuleCartridge: React.FC<ModuleCartridgeProps> = ({
  mod,
  index,
  context,
  canAfford,
  purchasedShelfSlots,
  setPurchasedShelfSlots,
  onPurchase,
  onRearrange,
  onSell,
  setHoveredUpgrade
}) => {
  const isDraggable = mod ? (context === 'shop-shelf' ? (canAfford ? canAfford(mod.cost) : true) : true) : false;

  const [pulseState, setPulseState] = React.useState<'natural' | 'forced' | null>(null);

  React.useEffect(() => {
    if (context !== 'hud' || !mod) return;

    const handleModuleTriggered = (e: Event) => {
      const customEvent = e as CustomEvent<{ moduleIndex: number; forceTriggered: boolean }>;
      if (customEvent.detail.moduleIndex === index) {
        setPulseState(customEvent.detail.forceTriggered ? 'forced' : 'natural');
      }
    };

    window.addEventListener('module-triggered', handleModuleTriggered);
    return () => window.removeEventListener('module-triggered', handleModuleTriggered);
  }, [context, mod, index]);

  React.useEffect(() => {
    if (!pulseState) return;
    const timer = setTimeout(() => {
      setPulseState(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [pulseState]);

  const renderTooltip = (item: UpgradeEntry, tooltipContext: 'hud' | 'shop-shelf' | 'shop-player') => {
    const refund = Math.floor(item.cost / 2);
    return (
      <div
        className="tooltip-card font-orbitron"
        style={{
          position: 'absolute',
          bottom: '125%',
          ...(tooltipContext === 'hud'
            ? { [index < 3 ? 'left' : 'right']: '0' }
            : { left: '50%', transform: 'translateX(-50%)' }
          ),
          borderColor: item.color,
          boxShadow: `0 10px 25px rgba(0,0,0,0.85), 0 0 15px ${item.color}25`,
          zIndex: 1000
        }}
      >
        <h4 style={{ color: item.color, borderBottomColor: `${item.color}40`, marginBottom: '6px' }}>
          {item.name.toUpperCase()}
        </h4>
        {item.triggerId && (
          <div
            className="badge font-orbitron"
            style={{
              background: `${item.color}20`,
              color: item.color,
              border: `1px solid ${item.color}`,
              marginBottom: '8px',
              display: 'inline-block'
            }}
          >
            TRIGGER: {item.triggerId.replace(/_/g, ' ')}
          </div>
        )}
        <div style={{ fontSize: '10.5px', color: '#e0e0e0', fontFamily: 'var(--font-body)', lineHeight: '1.4' }}>
          {item.desc}
        </div>
        {item.blurb && (
          <div style={{ fontStyle: 'italic', fontSize: '9.5px', color: '#a0a5b5', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '6px', paddingTop: '6px', lineHeight: '1.3' }}>
            "{item.blurb}"
          </div>
        )}

        {tooltipContext === 'shop-shelf' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: '#ffd700', fontWeight: 'bold', textShadow: '0 0 5px rgba(255, 215, 0, 0.3)' }}>
            PURCHASE COST: {item.cost}☉
          </div>
        )}
        {tooltipContext === 'shop-player' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: '#ff4757', fontWeight: 'bold', textShadow: '0 0 5px rgba(255, 71, 87, 0.3)' }}>
            SELL VALUE: +{refund}☉
          </div>
        )}
      </div>
    );
  };

  // --- 1. HUD CONTEXT (GAMEPLAY SIDEBAR) ---
  if (context === 'hud') {
    if (!mod) {
      return (
        <div
          className="build-module-slot empty"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dragType = e.dataTransfer.getData("dragType");
            if (dragType === "hud-belt") {
              const sourceSlot = parseInt(e.dataTransfer.getData("sourceSlotIndex"), 10);
              if (!isNaN(sourceSlot) && sourceSlot !== index && onRearrange) {
                onRearrange(sourceSlot, index);
              }
            }
          }}
        >
          —
        </div>
      );
    }

    return (
      <div
        className="build-module-slot filled"
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData("dragType", "hud-belt");
          e.dataTransfer.setData("sourceSlotIndex", index.toString());
          e.dataTransfer.setData("text/plain", mod.id); // Triggers robust browser drag ghost visual rendering
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dragType = e.dataTransfer.getData("dragType");
          if (dragType === "hud-belt") {
            const sourceSlot = parseInt(e.dataTransfer.getData("sourceSlotIndex"), 10);
            if (!isNaN(sourceSlot) && sourceSlot !== index && onRearrange) {
              onRearrange(sourceSlot, index);
            }
          }
        }}
        style={{
          flex: '1 1 0px',
          aspectRatio: '1',
          background: pulseState ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.55)',
          border: pulseState
            ? (pulseState === 'forced' ? '2px solid #ff9800' : '2px solid #ffffff')
            : `2px solid ${mod.color}`,
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '12px',
          color: pulseState
            ? (pulseState === 'forced' ? '#ff9800' : '#ffffff')
            : mod.color,
          boxShadow: pulseState
            ? (pulseState === 'forced' ? `0 0 25px #ff9800, 0 0 15px ${mod.color}` : `0 0 25px #ffffff, 0 0 15px ${mod.color}`)
            : `0 0 8px ${mod.color}35`,
          transform: pulseState ? 'scale(1.16)' : 'scale(1)',
          transition: 'all 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          cursor: 'grab',
          position: 'relative',
          zIndex: pulseState ? 10 : 1
        }}
      >
        {mod.image ? (
          <img
            src={mod.image}
            alt={mod.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '4px'
            }}
          />
        ) : (
          mod.short
        )}

        {/* Floating Custom Tooltip Card */}
        {renderTooltip(mod, 'hud')}
      </div>
    );
  }

  // --- 2. SHOP STOREFRONT SHELF CONTEXT ---
  if (context === 'shop-shelf') {
    if (!mod) {
      return (
        <div className="storefront-slot-wrapper">
          <div className="cartridge-socket module-socket">
            <span className="socket-pin-circle" />
            <div className="socket-label font-orbitron">VACANT</div>
          </div>
        </div>
      );
    }

    return (
      <div className="storefront-slot-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', position: 'relative' }}>
          <div
            className={`shop-cartridge ${isDraggable ? 'draggable' : 'locked'}`}
            draggable={isDraggable}
            onDragStart={(e) => {
              e.dataTransfer.setData("dragType", "shelf");
              e.dataTransfer.setData("upgradeId", mod.id);
              e.dataTransfer.setData("shelfIndex", index.toString());
              e.dataTransfer.setData("text/plain", mod.id);
              e.dataTransfer.effectAllowed = "copyMove";
            }}
            onClick={() => {
              if (isDraggable && onPurchase) {
                onPurchase(mod, index);
              }
            }}
            onMouseEnter={() => setHoveredUpgrade?.(mod)}
            onMouseLeave={() => setHoveredUpgrade?.(null)}
            style={{
              border: `2.5px solid ${mod.color}`,
              boxShadow: `0 0 14px ${mod.color}45, inset 0 0 8px ${mod.color}25`
            }}
          >
            <div className="cartridge-dome" style={{ background: `radial-gradient(circle at top, ${mod.color}35 0%, rgba(0,0,0,0) 80%)` }} />
            <div className="cartridge-header" style={{ background: mod.color }}>
              {mod.name}
            </div>
            <div className="cartridge-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', width: '100%', flex: 1 }}>
              {mod.image ? (
                <img
                  src={mod.image}
                  alt={mod.name}
                  style={{
                    width: '42px',
                    height: '42px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: `1.5px solid ${mod.color}60`,
                    boxShadow: `0 0 10px ${mod.color}40`
                  }}
                />
              ) : (
                <div className="slot-badge font-orbitron" style={{ color: mod.color, fontSize: '18px', margin: 0, padding: 0 }}>
                  {mod.short}
                </div>
              )}
            </div>
            {/* Contact pins at base of cartridge */}
            <div className="cartridge-pins">
              <span style={{ background: mod.color }} />
              <span style={{ background: mod.color }} />
              <span style={{ background: mod.color }} />
            </div>

            {/* Immersive Floating Hover Tooltip Card */}
            {renderTooltip(mod, 'shop-shelf')}
          </div>

          {/* Price Tag Below */}
          <div className="font-orbitron text-gold" style={{ fontSize: '11px', fontWeight: 'bold', textShadow: '0 0 8px rgba(255, 215, 0, 0.45)', marginTop: '4px' }}>
            {mod.cost}☉
          </div>
        </div>
      </div>
    );
  }

  // --- 3. SHOP COCKPIT BELT PORT CONTEXT ---
  // context === 'shop-player'
  if (!mod) {
    return (
      <div
        className="belt-slot empty-port"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dragType = e.dataTransfer.getData("dragType");
          if (dragType === "shelf") {
            const id = e.dataTransfer.getData("upgradeId") as UpgradeId;
            const shelfIndexStr = e.dataTransfer.getData("shelfIndex");
            const upgrade = UPGRADE_REGISTRY[id];
            if (upgrade.type !== 'module') return;

            const shelfIdx = shelfIndexStr ? parseInt(shelfIndexStr, 10) : -1;
            if (shelfIdx !== -1 && purchasedShelfSlots && purchasedShelfSlots[shelfIdx]) return;
            if (canAfford && !canAfford(upgrade.cost)) return;

            if (onPurchase) onPurchase(upgrade, index);
            if (shelfIdx !== -1 && setPurchasedShelfSlots) {
              setPurchasedShelfSlots(prev => {
                const next = [...prev];
                next[shelfIdx] = true;
                return next;
              });
            }
          } else if (dragType === "belt") {
            const sourceSlot = parseInt(e.dataTransfer.getData("sourceSlotIndex"), 10);
            if (isNaN(sourceSlot) || sourceSlot === index) return;
            if (onRearrange) onRearrange(sourceSlot, index);
          }
        }}
      >
        <span className="slot-glow" />
        <div className="socket-label font-orbitron" style={{ fontSize: '9px' }}>CORE PORT {index + 1}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div
        className="belt-slot filled"
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData("dragType", "belt");
          e.dataTransfer.setData("sourceSlotIndex", index.toString());
          e.dataTransfer.setData("text/plain", mod.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dragType = e.dataTransfer.getData("dragType");
          if (dragType === "shelf") {
            const id = e.dataTransfer.getData("upgradeId") as UpgradeId;
            const shelfIndexStr = e.dataTransfer.getData("shelfIndex");
            const upgrade = UPGRADE_REGISTRY[id];
            if (upgrade.type !== 'module') return;

            const shelfIdx = shelfIndexStr ? parseInt(shelfIndexStr, 10) : -1;
            if (shelfIdx !== -1 && purchasedShelfSlots && purchasedShelfSlots[shelfIdx]) return;
            if (canAfford && !canAfford(upgrade.cost)) return;

            // FUSION UPGRADE DROP: Dragging shelf module onto an identical non-upgraded equipped module!
            if (mod && mod.id === id && !id.endsWith('_V2')) {
              if (onPurchase) onPurchase(upgrade, index);
              if (shelfIdx !== -1 && setPurchasedShelfSlots) {
                setPurchasedShelfSlots(prev => {
                  const next = [...prev];
                  next[shelfIdx] = true;
                  return next;
                });
              }
            }
            return;
          } else if (dragType === "belt") {
            const sourceSlot = parseInt(e.dataTransfer.getData("sourceSlotIndex"), 10);
            if (isNaN(sourceSlot) || sourceSlot === index) return;
            if (onRearrange) onRearrange(sourceSlot, index);
          }
        }}
        onMouseEnter={() => setHoveredUpgrade?.(mod)}
        onMouseLeave={() => setHoveredUpgrade?.(null)}
        style={{ border: `2.5px solid ${mod.color}`, boxShadow: `0 0 12px ${mod.color}35`, cursor: 'grab', position: 'relative' }}
      >
        <div className="shop-cartridge" style={{ width: '100%', height: '100%', border: 'none', boxShadow: 'none', background: 'transparent' }}>
          <div className="cartridge-dome" style={{ background: `radial-gradient(circle at top, ${mod.color}25 0%, rgba(0,0,0,0) 80%)` }} />
          <div className="cartridge-header" style={{ background: mod.color }}>
            {mod.name}
          </div>
          <div className="cartridge-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', width: '100%', flex: 1 }}>
            {mod.image ? (
              <img
                src={mod.image}
                alt={mod.name}
                style={{
                  width: '38px',
                  height: '38px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: `1px solid ${mod.color}60`,
                  boxShadow: `0 0 8px ${mod.color}30`
                }}
              />
            ) : (
              <div style={{ width: '38px' }} />
            )}
          </div>
        </div>

        {/* Immersive Floating Hover Tooltip Card */}
        {renderTooltip(mod, 'shop-player')}
      </div>

      {/* Sell Button Below Cartridge */}
      <button
        className="btn-arcade danger font-orbitron"
        onClick={(e) => {
          e.stopPropagation();
          if (onSell) onSell(mod, index);
        }}
        style={{
          fontSize: '9.5px',
          padding: '3px 12px',
          marginTop: '4px',
          borderRadius: '4px',
          boxShadow: '0 0 6px rgba(255, 71, 87, 0.25)',
          cursor: 'pointer'
        }}
      >
        SELL (+{Math.floor(mod.cost / 2)}☉)
      </button>
    </div>
  );
};

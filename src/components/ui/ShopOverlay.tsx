import React, { useState } from 'react';
import { UpgradeId, UpgradeEntry, HackId } from '../../types';
import { UPGRADE_REGISTRY, MODULES_REGISTRY } from '../../constants/upgrades';
import { ModuleCartridge } from './ModuleCartridge';
import './ShopOverlay.css';

interface ShopOverlayProps {
  dataCores: number;
  moduleSlots: (UpgradeId | null)[];
  hackSlots: UpgradeId[];
  onPurchase: (upgrade: UpgradeEntry, slotIndex?: number) => void;
  onRearrange: (sourceIndex: number, targetIndex: number) => void;
  onSell: (upgrade: UpgradeEntry, slotIndex: number) => void;
  onClose: () => void;
}

export const ShopOverlay: React.FC<ShopOverlayProps> = ({ 
  dataCores, 
  moduleSlots,
  hackSlots,
  onPurchase, 
  onRearrange,
  onSell,
  onClose 
}) => {
  const [hoveredUpgrade, setHoveredUpgrade] = useState<UpgradeEntry | null>(null);
  const [dragOverModule, setDragOverModule] = useState(false);

  // State to track the 4 randomly selected modules with replacement
  const [availableModules] = useState<UpgradeEntry[]>(() => {
    const chosen: UpgradeEntry[] = [];
    for (let i = 0; i < 4; i++) {
      const randMod = MODULES_REGISTRY[Math.floor(Math.random() * MODULES_REGISTRY.length)];
      chosen.push(randMod);
    }
    return chosen;
  });

  // State to track if module shelf slots (0-3) are vacant/purchased during this shop visit
  const [purchasedShelfSlots, setPurchasedShelfSlots] = useState<boolean[]>([false, false, false, false]);

  const canAfford = (cost: number) => dataCores >= cost;
  const isOwned = (id: UpgradeId) => moduleSlots.includes(id) || hackSlots.includes(id);

  // Grouping upgrades for the shelves
  const topShelfHacks = [
    UPGRADE_REGISTRY[HackId.LUCKY_CHARM],
    UPGRADE_REGISTRY[HackId.DEEP_SPACE_SENSOR]
  ];

  const middleShelfModules = [availableModules[0], availableModules[1]];
  const bottomShelfModules = [availableModules[2], availableModules[3]];

  // Drag and Drop buying handlers
  const handleDragStart = (e: React.DragEvent, upgradeId: UpgradeId, shelfIndex?: number) => {
    e.dataTransfer.setData("dragType", "shelf");
    e.dataTransfer.setData("upgradeId", upgradeId);
    if (shelfIndex !== undefined) {
      e.dataTransfer.setData("shelfIndex", shelfIndex.toString());
    }
  };

  // Section level drop fallbacks (first available empty slot)
  const handleModuleSectionDrop = (e: React.DragEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    setDragOverModule(false);

    const dragType = e.dataTransfer.getData("dragType");
    if (dragType !== "shelf") return;

    const id = e.dataTransfer.getData("upgradeId") as UpgradeId;
    const shelfIndexStr = e.dataTransfer.getData("shelfIndex");
    if (!id) return;

    const upgrade = UPGRADE_REGISTRY[id];
    if (upgrade.type !== 'module') return;
    
    const shelfIdx = shelfIndexStr ? parseInt(shelfIndexStr, 10) : -1;
    if (shelfIdx !== -1 && purchasedShelfSlots[shelfIdx]) return;
    if (!canAfford(upgrade.cost)) return;
    
    // Find first vacant slot
    const firstEmpty = moduleSlots.indexOf(null);
    if (firstEmpty === -1) return;

    onPurchase(upgrade, firstEmpty);
    if (shelfIdx !== -1) {
      setPurchasedShelfSlots(prev => {
        const next = [...prev];
        next[shelfIdx] = true;
        return next;
      });
    }
  };

  const handleCartridgeClick = (upgrade: UpgradeEntry, index: number, isHack: boolean) => {
    const owned = isHack ? isOwned(upgrade.id) : purchasedShelfSlots[index];
    if (owned) return;
    if (!canAfford(upgrade.cost)) return;

    if (isHack) {
      onPurchase(upgrade);
    } else {
      const firstEmpty = moduleSlots.indexOf(null);
      if (firstEmpty !== -1) {
        onPurchase(upgrade, firstEmpty);
        setPurchasedShelfSlots(prev => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }
    }
  };

  // Rendering individual upgrade cartridge sitting on storefront shelves
  const renderStorefrontCartridge = (upgrade: UpgradeEntry, index: number, isHack: boolean) => {
    if (!isHack) {
      return (
        <ModuleCartridge
          key={`mod-${index}-${upgrade.id}`}
          mod={purchasedShelfSlots[index] ? null : upgrade}
          index={index}
          context="shop-shelf"
          canAfford={canAfford}
          onPurchase={onPurchase}
          setHoveredUpgrade={setHoveredUpgrade}
        />
      );
    }

    const owned = isOwned(upgrade.id);
    const affordable = canAfford(upgrade.cost);
    const isDraggable = !owned && affordable;

    return (
      <div key={`hack-${index}-${upgrade.id}`} className="storefront-slot-wrapper">
        {owned ? (
          /* Empty blueprint socket where the vacuum-tube was plugged in */
          <div className="cartridge-socket hack-socket">
            <span className="socket-pin-circle" />
            <div className="socket-label font-orbitron">VACANT</div>
          </div>
        ) : (
          /* Draggable Retro Vacuum-Tube Cartridge and price below */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
            <div 
              className={`shop-cartridge ${isDraggable ? 'draggable' : 'locked'}`}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e, upgrade.id, undefined)}
              onClick={() => handleCartridgeClick(upgrade, index, true)}
              onMouseEnter={() => setHoveredUpgrade(upgrade)}
              onMouseLeave={() => setHoveredUpgrade(null)}
              style={{
                border: `2.5px solid ${upgrade.color}`,
                boxShadow: `0 0 14px ${upgrade.color}45, inset 0 0 8px ${upgrade.color}25`
              }}
            >
              <div className="cartridge-dome" style={{ background: `radial-gradient(circle at top, ${upgrade.color}35 0%, rgba(0,0,0,0) 80%)` }} />
              <div className="cartridge-header" style={{ background: upgrade.color }}>
                {upgrade.name}
              </div>
              <div className="cartridge-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', width: '100%', flex: 1 }}>
                <div className="slot-badge font-orbitron" style={{ color: upgrade.color, fontSize: '18px', margin: 0, padding: 0 }}>
                  {upgrade.short}
                </div>
              </div>
              {/* Contact pins at base of cartridge */}
              <div className="cartridge-pins">
                <span style={{ background: upgrade.color }} />
                <span style={{ background: upgrade.color }} />
                <span style={{ background: upgrade.color }} />
              </div>
            </div>
            
            {/* Price Tag Below the Cartridge */}
            <div className="font-orbitron text-gold" style={{ fontSize: '11px', fontWeight: 'bold', textShadow: '0 0 8px rgba(255, 215, 0, 0.45)', marginTop: '4px' }}>
              {upgrade.cost}☉
            </div>
          </div>
        )}
      </div>
    );
  };

  // Map slot UpgradeIds to their Registry Entries
  const activeModules = moduleSlots.map(id => id ? UPGRADE_REGISTRY[id] : null);

  return (
    <div className="shop-modal">
      <div className="shop-content glassmorphism">
        
        {/* Upper Dashboard Terminal */}
        <div className="shop-hud-header">
          <div className="shop-hud-panel">
            <h2>Space Bazaar</h2>
            <div className="font-script text-gold" style={{ fontSize: '15px' }}>Bazaar trading deck</div>
          </div>
          <div className="shop-hud-panel font-orbitron text-cyan wallet">
            <span style={{ fontSize: '10px', color: 'var(--chrome-dim)', display: 'block' }}>RESERVE CORES:</span>
            {dataCores} <span style={{ fontSize: '12px' }}>CORES</span>
          </div>
        </div>

        {/* Central visual panel */}
        <div style={{ display: 'flex', gap: '20px', margin: '15px 0' }}>
          
          {/* React-built Storefront Cabinet */}
          <div className="storefront-cabinet">
            
            {/* Shelf Row 1: Hacks */}
            <div className="shop-shelf">
              <div className="shelf-label font-orbitron">TOP SHELF: HACK REGISTER MODULES</div>
              <div className="shelf-metal-beam hacks-beam">
                {topShelfHacks.map((upgrade, idx) => renderStorefrontCartridge(upgrade, idx, true))}
              </div>
            </div>

            {/* Shelf Row 2: Modules */}
            <div className="shop-shelf">
              <div className="shelf-label font-orbitron">SHELF II: AUXILIARY MODULE CORES</div>
              <div className="shelf-metal-beam modules-beam">
                {middleShelfModules.map((upgrade, idx) => renderStorefrontCartridge(upgrade, idx, false))}
                {bottomShelfModules.map((upgrade, idx) => renderStorefrontCartridge(upgrade, idx + 2, false))}
              </div>
            </div>

          </div>

          {/* Immersive Scanner Readout Computer */}
          <div className="scanner-readout-panel">
            <h3 className="font-orbitron">Bazaar Scanner Readout</h3>
            {hoveredUpgrade ? (
              <div className="readout-content animated-scan">
                <div style={{ color: hoveredUpgrade.color, fontSize: '14px', fontWeight: 'bold', borderBottom: `1.5px solid ${hoveredUpgrade.color}`, paddingBottom: '4px', marginBottom: '8px' }}>
                  {hoveredUpgrade.name.toUpperCase()}
                </div>
                <div className="readout-stat">CLASS: <strong className="text-cyan">{hoveredUpgrade.type.toUpperCase()}</strong></div>
                <div className="readout-stat">COST: <strong className="text-gold font-orbitron">{hoveredUpgrade.cost} DATA CORES</strong></div>
                <div className="readout-stat">REFUND VALUE: <strong className="text-gold font-orbitron">{Math.floor(hoveredUpgrade.cost / 2)} CORES</strong></div>
                <p className="readout-desc">{hoveredUpgrade.desc}</p>
                {hoveredUpgrade.blurb && (
                  <div className="readout-blurb" style={{ fontStyle: 'italic', fontSize: '10.5px', color: 'var(--chrome-dim)', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px', lineHeight: '1.4' }}>
                    "{hoveredUpgrade.blurb}"
                  </div>
                )}
              </div>
            ) : (
              <div className="readout-idle">
                <div className="scanner-sweeper" />
                <div style={{ color: 'var(--chrome-dim)', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', marginTop: '50px' }}>
                  SCANNING FOR INPUT...<br/>
                  <span style={{ fontSize: '9px', opacity: 0.6 }}>DRAG CARTRIDGE FROM SHELF TO ACTIVE SLOTS BELOW</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Console Deck & Item Belt Drag/Drop Zone */}
        <div className="console-deck">
          
          {/* Module cores Ports Belt Zone */}
          <div 
            className={`console-belt-section modules ${dragOverModule ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverModule(true); }}
            onDragLeave={() => setDragOverModule(false)}
            onDrop={handleModuleSectionDrop}
          >
            <h4 className="font-orbitron">CONSOLE MODULE DECK (CHOOSE SLOT OR REARRANGE)</h4>
            <div className="belt-slots-container">
              {activeModules.map((mod, i) => (
                <ModuleCartridge
                  key={i}
                  mod={mod}
                  index={i}
                  context="shop-player"
                  canAfford={canAfford}
                  onPurchase={onPurchase}
                  onRearrange={onRearrange}
                  onSell={onSell}
                  setHoveredUpgrade={setHoveredUpgrade}
                  purchasedShelfSlots={purchasedShelfSlots}
                  setPurchasedShelfSlots={setPurchasedShelfSlots}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Exit Continue Button */}
        <button 
          className="btn-arcade success font-orbitron" 
          onClick={onClose} 
          style={{ width: '100%', marginTop: '12px', fontSize: '13px', padding: '10px' }}
        >
          CONFIRM AND LAUNCH NEXT SECTOR
        </button>

      </div>
    </div>
  );
};

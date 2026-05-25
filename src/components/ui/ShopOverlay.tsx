import React, { useState } from 'react';
import { ModuleId, UpgradeEntry } from '../../types';
import { UPGRADE_REGISTRY, MODULES_REGISTRY } from '../../constants/upgrades';
import { ModuleCartridge } from './ModuleCartridge';
import './ShopOverlay.css';

interface ShopOverlayProps {
  dataCores: number;
  moduleSlots: (ModuleId | null)[];
  onPurchase: (upgrade: UpgradeEntry, slotIndex?: number) => void;
  onRearrange: (sourceIndex: number, targetIndex: number) => void;
  onSell: (upgrade: UpgradeEntry, slotIndex: number) => void;
  onClose: () => void;
}

export const ShopOverlay: React.FC<ShopOverlayProps> = ({ 
  dataCores, 
  moduleSlots,
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

  const middleShelfModules = [availableModules[0], availableModules[1]];
  const bottomShelfModules = [availableModules[2], availableModules[3]];

  // Section level drop fallbacks (first available empty slot)
  const handleModuleSectionDrop = (e: React.DragEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    setDragOverModule(false);

    const dragType = e.dataTransfer.getData("dragType");
    if (dragType !== "shelf") return;

    const id = e.dataTransfer.getData("upgradeId") as ModuleId;
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

  // Rendering individual upgrade cartridge sitting on storefront shelves
  const renderStorefrontCartridge = (upgrade: UpgradeEntry, index: number) => {
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
          <div className="storefront-cabinet" style={{ height: '240px' }}>
            
            {/* Shelf Row: Modules */}
            <div className="shop-shelf">
              <div className="shelf-label font-orbitron">MODULE SHELF: FLIGHT CORES CABINET</div>
              <div className="shelf-metal-beam modules-beam" style={{ minHeight: '160px' }}>
                {middleShelfModules.map((upgrade, idx) => renderStorefrontCartridge(upgrade, idx))}
                {bottomShelfModules.map((upgrade, idx) => renderStorefrontCartridge(upgrade, idx + 2))}
              </div>
            </div>

          </div>

          {/* Immersive Scanner Readout Computer */}
          <div className="scanner-readout-panel" style={{ height: '240px' }}>
            <h3 className="font-orbitron">Bazaar Scanner Readout</h3>
            {hoveredUpgrade ? (
              <div className="readout-content animated-scan">
                <div style={{ color: hoveredUpgrade.color, fontSize: '14px', fontWeight: 'bold', borderBottom: `1.5px solid ${hoveredUpgrade.color}`, paddingBottom: '4px', marginBottom: '8px' }}>
                  {hoveredUpgrade.name.toUpperCase()}
                </div>
                <div className="readout-stat">CLASS: <strong className="text-cyan">{hoveredUpgrade.type.toUpperCase()}</strong></div>
                <div className="readout-stat">COST: <strong className="text-gold font-orbitron">{hoveredUpgrade.cost} DATA CORES</strong></div>
                <div className="readout-stat">REFUND VALUE: <strong className="text-gold font-orbitron">{Math.floor(hoveredUpgrade.cost / 2)} CORES</strong></div>
                <p className="readout-desc" style={{ fontSize: '10px', lineHeight: '1.3' }}>{hoveredUpgrade.desc}</p>
              </div>
            ) : (
              <div className="readout-idle">
                <div className="scanner-sweeper" />
                <div style={{ color: 'var(--chrome-dim)', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
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

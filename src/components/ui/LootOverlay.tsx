import React, { useState } from 'react';
import { ModuleId, HackId, UpgradeEntry } from '../../types';
import { UPGRADE_REGISTRY } from '../../constants/upgrades';
import './LootOverlay.css';

interface LootOverlayProps {
  pendingLoot: { modules: ModuleId[]; hacks: HackId[] };
  moduleSlots: (ModuleId | null)[];
  onEquipModule: (moduleId: ModuleId, slotIndex: number, lootIndex: number) => void;
  onRearrangeModules: (sourceIndex: number, targetIndex: number) => void;
  onDiscardEquippedModule: (slotIndex: number) => void;
  onCollectHack: (hackId: HackId, lootIndex: number) => void;
  onClose: () => void;
}

export const LootOverlay: React.FC<LootOverlayProps> = ({
  pendingLoot,
  moduleSlots,
  onEquipModule,
  onRearrangeModules,
  onDiscardEquippedModule,
  onCollectHack,
  onClose
}) => {
  const [hoveredUpgrade, setHoveredUpgrade] = useState<UpgradeEntry | null>(null);
  const [dragOverModule, setDragOverModule] = useState(false);

  // Section level drop fallback: drops onto the first vacant slot
  const handleModuleSectionDrop = (e: React.DragEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    setDragOverModule(false);

    const dragType = e.dataTransfer.getData("dragType");
    if (dragType !== "loot-shelf") return;

    const id = e.dataTransfer.getData("upgradeId") as ModuleId;
    const lootIndexStr = e.dataTransfer.getData("lootIndex");
    if (!id || !lootIndexStr) return;

    const lootIdx = parseInt(lootIndexStr, 10);
    if (isNaN(lootIdx)) return;

    // Find first vacant slot
    const firstEmpty = moduleSlots.indexOf(null);
    if (firstEmpty === -1) return;

    onEquipModule(id, firstEmpty, lootIdx);
  };

  // Maps slot UpgradeIds to their Registry Entries
  const activeModules = moduleSlots.map(id => id ? UPGRADE_REGISTRY[id] : null);

  return (
    <div className="loot-modal">
      <div className="loot-content glassmorphism">

        {/* Upper Dashboard Terminal */}
        <div className="loot-hud-header">
          <div className="loot-hud-panel">
            <h2>Extraction Deck</h2>
            <div className="font-script text-magenta" style={{ fontSize: '15px', color: '#ff00ff', textShadow: '0 0 8px rgba(255, 0, 255, 0.4)' }}>
              Salvaged asteroid cargo
            </div>
          </div>
          <div className="loot-hud-panel font-orbitron text-magenta salvage-counter">
            <span style={{ fontSize: '9px', color: '#ff00ff99', display: 'block' }}>SALVAGE STATUS:</span>
            {pendingLoot.modules.length} MODS / {pendingLoot.hacks.length} HACKS
          </div>
        </div>

        {/* Central visual panel */}
        <div style={{ display: 'flex', gap: '20px', margin: '15px 0' }}>

          {/* Salvaged Modules Shelf Cabinet */}
          <div className="loot-cabinet" style={{ height: '240px' }}>
            <div className="loot-shelf-container">
              <div className="loot-shelf-label font-orbitron">SALVAGED HULL DEBRIS MODULES (DRAG TO ACTIVE SLOTS)</div>
              <div className="loot-shelf-metal-beam">
                {pendingLoot.modules.length > 0 ? (
                  pendingLoot.modules.map((modId, idx) => {
                    const upgrade = UPGRADE_REGISTRY[modId];
                    return (
                      <div key={`loot-mod-${idx}`} className="storefront-slot-wrapper" style={{ width: '130px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', position: 'relative' }}>
                          <div
                            className="shop-cartridge draggable loot-cartridge"
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("dragType", "loot-shelf");
                              e.dataTransfer.setData("upgradeId", modId);
                              e.dataTransfer.setData("lootIndex", idx.toString());
                              e.dataTransfer.setData("text/plain", modId);
                              e.dataTransfer.effectAllowed = "copyMove";
                            }}
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
                              {upgrade.image ? (
                                <img
                                  src={upgrade.image}
                                  alt={upgrade.name}
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: `1.5px solid ${upgrade.color}60`,
                                    boxShadow: `0 0 10px ${upgrade.color}40`
                                  }}
                                />
                              ) : (
                                <div className="slot-badge font-orbitron" style={{ color: upgrade.color, fontSize: '18px', margin: 0, padding: 0 }}>
                                  {upgrade.short}
                                </div>
                              )}
                            </div>
                            <div className="cartridge-pins">
                              <span style={{ background: upgrade.color }} />
                              <span style={{ background: upgrade.color }} />
                              <span style={{ background: upgrade.color }} />
                            </div>
                          </div>
                          <div className="font-orbitron" style={{ fontSize: '9px', color: '#ff00ff', textShadow: '0 0 5px rgba(255, 0, 255, 0.4)', marginTop: '4px', fontWeight: 'bold' }}>
                            FREE SALVAGE
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="loot-empty-shelf font-orbitron">
                    <span className="pulsing-text">NO MODULES RECOVERED THIS RUN</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Holographic Scanner Readout */}
          <div className="scanner-readout-panel" style={{ height: '240px', borderColor: 'rgba(255, 0, 255, 0.3)', boxShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 12px rgba(255, 0, 255, 0.1), inset 0 0 15px rgba(255, 0, 255, 0.05)' }}>
            <h3 className="font-orbitron" style={{ color: '#ff00ff', borderBottomColor: 'rgba(255, 0, 255, 0.15)', textShadow: '0 0 8px rgba(255, 0, 255, 0.3)' }}>
              Salvage Scanner
            </h3>
            {hoveredUpgrade ? (
              <div className="readout-content animated-scan">
                <div style={{ color: hoveredUpgrade.color, fontSize: '14px', fontWeight: 'bold', borderBottom: `1.5px solid ${hoveredUpgrade.color}`, paddingBottom: '4px', marginBottom: '8px' }}>
                  {hoveredUpgrade.name.toUpperCase()}
                </div>
                <div className="readout-stat">CLASS: <strong className="text-cyan">{hoveredUpgrade.type.toUpperCase()}</strong></div>
                <div className="readout-stat">PRICE: <strong className="text-magenta" style={{ color: '#ff00ff', textShadow: '0 0 6px rgba(255, 0, 255, 0.3)' }}>0☉ (FREE SALVAGE)</strong></div>
                <p className="readout-desc" style={{ fontSize: '10px', lineHeight: '1.3' }}>{hoveredUpgrade.desc}</p>
              </div>
            ) : (
              <div className="readout-idle">
                <div className="scanner-sweeper" style={{ background: 'linear-gradient(90deg, rgba(255,0,255,0) 0%, rgba(255,0,255,0.6) 50%, rgba(255,0,255,0) 100%)', boxShadow: '0 0 10px rgba(255,0,255,0.8)' }} />
                <div style={{ color: 'var(--chrome-dim)', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
                  AWAITING SCAN FEED...<br />
                  <span style={{ fontSize: '9px', opacity: 0.6 }}>DRAG CARTRIDGE FROM SALVAGED SHELF TO CORE PORTS BELOW</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Console Deck for Active Modules */}
        <div className="console-deck" style={{ borderColor: 'rgba(255, 0, 255, 0.12)' }}>
          <div
            className={`console-belt-section modules ${dragOverModule ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverModule(true); }}
            onDragLeave={() => setDragOverModule(false)}
            onDrop={handleModuleSectionDrop}
          >
            <h4 className="font-orbitron" style={{ color: '#ff00ffcc', textShadow: '0 0 5px rgba(255, 0, 255, 0.2)' }}>
              SHIP COCKPIT MODULE DECK (CHOOSE PORT OR REARRANGE)
            </h4>
            <div className="belt-slots-container">
              {activeModules.map((mod, i) => {
                if (!mod) {
                  return (
                    <div
                      key={`empty-port-${i}`}
                      className="belt-slot empty-port"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const dragType = e.dataTransfer.getData("dragType");
                        if (dragType === "loot-shelf") {
                          const id = e.dataTransfer.getData("upgradeId") as ModuleId;
                          const lootIndexStr = e.dataTransfer.getData("lootIndex");
                          if (!id || !lootIndexStr) return;

                          const lootIdx = parseInt(lootIndexStr, 10);
                          if (!isNaN(lootIdx)) {
                            onEquipModule(id, i, lootIdx);
                          }
                        } else if (dragType === "loot-player") {
                          const sourceIndexStr = e.dataTransfer.getData("sourceIndex");
                          if (!sourceIndexStr) return;
                          const sourceSlot = parseInt(sourceIndexStr, 10);
                          if (!isNaN(sourceSlot) && sourceSlot !== i) {
                            onRearrangeModules(sourceSlot, i);
                          }
                        }
                      }}
                      style={{ borderStyle: 'dashed', borderColor: 'rgba(255, 0, 255, 0.2)' }}
                    >
                      <span className="slot-glow" style={{ boxShadow: 'inset 0 0 10px rgba(255,0,255,0.05)' }} />
                      <div className="socket-label font-orbitron" style={{ fontSize: '9px', color: '#ff00ff22' }}>CORE PORT {i + 1}</div>
                    </div>
                  );
                }

                return (
                  <div key={`filled-port-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div
                      className="belt-slot filled"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("dragType", "loot-player");
                        e.dataTransfer.setData("sourceIndex", i.toString());
                        e.dataTransfer.setData("text/plain", mod.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const dragType = e.dataTransfer.getData("dragType");
                        if (dragType === "loot-shelf") {
                          const id = e.dataTransfer.getData("upgradeId") as ModuleId;
                          const lootIndexStr = e.dataTransfer.getData("lootIndex");
                          if (!id || !lootIndexStr) return;

                          const lootIdx = parseInt(lootIndexStr, 10);
                          // Fusion Drop: dragging matching non-V2 module onto active one
                          if (mod.id === id && !id.endsWith('_V2') && !isNaN(lootIdx)) {
                            onEquipModule(id, i, lootIdx);
                          }
                        } else if (dragType === "loot-player") {
                          const sourceIndexStr = e.dataTransfer.getData("sourceIndex");
                          if (!sourceIndexStr) return;
                          const sourceSlot = parseInt(sourceIndexStr, 10);
                          if (!isNaN(sourceSlot) && sourceSlot !== i) {
                            onRearrangeModules(sourceSlot, i);
                          }
                        }
                      }}
                      onMouseEnter={() => setHoveredUpgrade(mod)}
                      onMouseLeave={() => setHoveredUpgrade(null)}
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
                            <div className="slot-badge font-orbitron" style={{ color: mod.color, fontSize: '14px', margin: 0, padding: 0 }}>
                              {mod.short}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-arcade danger font-orbitron discard-equipped-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiscardEquippedModule(i);
                      }}
                      style={{
                        fontSize: '9.5px',
                        padding: '3px 12px',
                        marginTop: '4px',
                        borderRadius: '4px',
                        boxShadow: '0 0 6px rgba(255, 71, 87, 0.25)',
                        cursor: 'pointer',
                        minWidth: 'auto',
                        letterSpacing: '0.5px'
                      }}
                    >
                      DISCARD
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Salvaged Hacks / Firmwares Section */}
        <div className="loot-hacks-section">
          <h4 className="font-orbitron" style={{ color: '#da70d6', textShadow: '0 0 5px rgba(218, 112, 214, 0.25)', margin: '12px 0 8px 0', fontSize: '11px', letterSpacing: '1.5px' }}>
            SALVAGED HACKS
          </h4>
          <div className="loot-hacks-container">
            {pendingLoot.hacks.length > 0 ? (
              pendingLoot.hacks.map((hackId, idx) => {
                const hack = UPGRADE_REGISTRY[hackId];
                return (
                  <div key={`loot-hack-${idx}`} className="loot-hack-card animated-scan" style={{ borderColor: hack.color }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${hack.color}30`, paddingBottom: '6px', marginBottom: '6px' }}>
                      <span className="font-orbitron font-weight-bold" style={{ color: hack.color, fontSize: '12px' }}>
                        {hack.short} {hack.name.toUpperCase()}
                      </span>
                      <span className="font-orbitron" style={{ fontSize: '9px', color: '#ff00ffcc' }}>HACK</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#e0e0e0', lineHeight: '1.3', flex: 1, minHeight: '30px' }}>
                      {hack.desc}
                    </div>
                    <button
                      className="btn-arcade success font-orbitron collect-hack-btn"
                      onClick={() => onCollectHack(hackId, idx)}
                      style={{
                        fontSize: '9px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        marginTop: '8px',
                        width: '100%',
                        cursor: 'pointer',
                        borderColor: '#ff00ff',
                        background: 'linear-gradient(to bottom, #da70d6 0%, #ba55d3 100%)',
                        boxShadow: '0 0 6px rgba(255, 0, 255, 0.3)'
                      }}
                    >
                      COLLECT (FREE)
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="loot-empty-hacks font-orbitron">
                <span>NO SALVAGED FIRMWARE CORES EXTRACTED FROM ORBIT</span>
              </div>
            )}
          </div>
        </div>

        {/* Exit Confirm Button */}
        <button
          className="btn-arcade success font-orbitron loot-confirm-btn"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '16px',
            fontSize: '13px',
            padding: '10px',
            background: 'linear-gradient(to bottom, #8a2be2 0%, #4b0082 100%)',
            borderColor: '#ff00ff',
            boxShadow: '0 0 12px rgba(255, 0, 255, 0.35)'
          }}
        >
          SECURE DECK AND PROCEED
        </button>

      </div>
    </div>
  );
};

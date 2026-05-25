import React, { useState } from 'react';
import { HackId, UpgradeEntry } from '../../types';
import { HACKS_REGISTRY } from '../../constants/upgrades';
import './ShopOverlay.css'; // Leverage standard cockpit cabinet aesthetics

interface HackSelectionOverlayProps {
  onSelect: (hackId: HackId) => void;
}

export const HackSelectionOverlay: React.FC<HackSelectionOverlayProps> = ({ onSelect }) => {
  // Choose exactly 2 distinct hacks randomly from the registry
  const [choices] = useState<UpgradeEntry[]>(() => {
    const list = [...HACKS_REGISTRY];
    const first = list.splice(Math.floor(Math.random() * list.length), 1)[0];
    const second = list.splice(Math.floor(Math.random() * list.length), 1)[0];
    return [first, second];
  });

  const [hoveredHack, setHoveredHack] = useState<UpgradeEntry | null>(null);

  return (
    <div className="shop-modal" style={{ animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div className="shop-content glassmorphism" style={{ width: '700px', borderColor: 'var(--glow-cyan)', boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 35px rgba(0, 229, 255, 0.15)' }}>
        
        {/* Upper Dashboard Terminal */}
        <div className="shop-hud-header" style={{ borderBottomColor: 'rgba(0, 229, 255, 0.15)' }}>
          <div className="shop-hud-panel">
            <h2 style={{ color: 'var(--glow-cyan)', textShadow: '0 0 12px rgba(0, 229, 255, 0.5)' }}>
              FIRMWARE ALIGNMENT DECK
            </h2>
            <div className="font-script text-gold" style={{ fontSize: '15px' }}>
              Splice one complimentary bypass into your system registers
            </div>
          </div>
          <div className="shop-hud-panel font-orbitron text-cyan wallet" style={{ borderColor: 'rgba(0, 229, 255, 0.25)', fontSize: '12px', padding: '6px 12px' }}>
            SELECT ONE BYPASS (FREE)
          </div>
        </div>

        {/* Central visual panel */}
        <div style={{ display: 'flex', gap: '20px', margin: '25px 0 15px 0' }}>
          
          {/* Cabinet displaying only the two complimentary choices */}
          <div className="storefront-cabinet" style={{ width: '380px', height: '240px', borderColor: 'rgba(0, 229, 255, 0.15)', justifyContent: 'center', gap: '5px' }}>
            <div className="shop-shelf">
              <div className="shelf-label font-orbitron" style={{ textAlign: 'center', marginBottom: '8px' }}>
                AVAILABLE COCKPIT REGISTER SPLICINGS
              </div>
              <div className="shelf-metal-beam hacks-beam" style={{ borderBottomColor: '#d27d2d', minHeight: '160px', justifyContent: 'space-around', background: 'transparent' }}>
                {choices.map((hack) => (
                  <div key={hack.id} className="storefront-slot-wrapper" style={{ width: '150px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <div 
                        className="shop-cartridge draggable"
                        onClick={() => onSelect(hack.id as HackId)}
                        onMouseEnter={() => setHoveredHack(hack)}
                        onMouseLeave={() => setHoveredHack(null)}
                        style={{
                          border: `2.5px solid ${hack.color}`,
                          boxShadow: `0 0 18px ${hack.color}50, inset 0 0 10px ${hack.color}25`,
                          width: '130px',
                          height: '95px'
                        }}
                      >
                        <div className="cartridge-dome" style={{ background: `radial-gradient(circle at top, ${hack.color}35 0%, rgba(0,0,0,0) 80%)` }} />
                        <div className="cartridge-header" style={{ background: hack.color }}>
                          {hack.name.toUpperCase()}
                        </div>
                        <div className="cartridge-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', width: '100%', flex: 1 }}>
                          <div className="slot-badge font-orbitron" style={{ color: hack.color, fontSize: '20px', margin: 0, padding: 0 }}>
                            {hack.short}
                          </div>
                        </div>
                        <div className="cartridge-pins">
                          <span style={{ background: hack.color }} />
                          <span style={{ background: hack.color }} />
                          <span style={{ background: hack.color }} />
                        </div>
                      </div>
                      
                      <button
                        className="btn-arcade success font-orbitron"
                        onClick={() => onSelect(hack.id as HackId)}
                        style={{ fontSize: '9px', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 0 6px rgba(0, 229, 255, 0.25)' }}
                      >
                        INSTALL FREE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Immersive Scanner Readout Computer */}
          <div className="scanner-readout-panel" style={{ width: '260px', height: '240px', borderColor: 'rgba(0, 229, 255, 0.25)' }}>
            <h3 className="font-orbitron" style={{ color: 'var(--glow-cyan)', borderBottomColor: 'rgba(0, 229, 255, 0.15)' }}>
              FIRMWARE ANALYZER
            </h3>
            {hoveredHack ? (
              <div className="readout-content animated-scan">
                <div style={{ color: hoveredHack.color, fontSize: '13px', fontWeight: 'bold', borderBottom: `1.5px solid ${hoveredHack.color}`, paddingBottom: '4px', marginBottom: '8px' }}>
                  {hoveredHack.name.toUpperCase()}
                </div>
                <div className="readout-stat">FIRMWARE TYPE: <strong className="text-cyan">COCKPIT BYPASS</strong></div>
                <div className="readout-stat">PRICE: <strong className="text-green font-orbitron">0☉ (COMPLIMENTARY)</strong></div>
                <p className="readout-desc" style={{ fontSize: '10.5px', lineHeight: '1.35', color: '#e8e8e8', borderTop: 'none', paddingTop: 0, marginTop: 0 }}>{hoveredHack.desc}</p>
                {hoveredHack.blurb && (
                  <div className="readout-blurb" style={{ fontStyle: 'italic', fontSize: '9.5px', color: 'var(--chrome-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', paddingTop: '4px', lineHeight: '1.25' }}>
                    "{hoveredHack.blurb}"
                  </div>
                )}
              </div>
            ) : (
              <div className="readout-idle">
                <div className="scanner-sweeper" style={{ background: 'linear-gradient(90deg, rgba(0,229,255,0) 0%, rgba(0,229,255,0.6) 50%, rgba(0,229,255,0) 100%)', boxShadow: '0 0 10px rgba(0,229,255,0.8)' }} />
                <div style={{ color: 'var(--chrome-dim)', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', marginTop: '35px' }}>
                  SCANNING CHIPS...<br/>
                  <span style={{ fontSize: '9.5px', opacity: 0.6, display: 'block', marginTop: '10px' }}>HOVER OVER CARTRIDGE TO RUN FIRMWARE ANALYSIS</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

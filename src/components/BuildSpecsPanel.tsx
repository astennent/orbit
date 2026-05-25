import React from 'react'
import { UpgradeEntry } from '../types'
import { ModuleCartridge } from './ModuleCartridge'

interface BuildSpecsPanelProps {
  dataCores: number
  activeModules: (UpgradeEntry | null)[]
  activeHacks: UpgradeEntry[]
  onRearrange?: (sourceIndex: number, targetIndex: number) => void
}

export const BuildSpecsPanel: React.FC<BuildSpecsPanelProps> = ({
  dataCores,
  activeModules,
  activeHacks,
  onRearrange
}) => {
  const renderDataCoresProgress = (currentDataCores: number) => {
    const totalBars = 25;
    const bitsPerBar = 4;
    const bars = [];
    
    for (let barIdx = 0; barIdx < totalBars; barIdx++) {
      const barStartDataCores = barIdx * bitsPerBar;
      const filledBits = Math.max(0, Math.min(bitsPerBar, Math.round(currentDataCores) - barStartDataCores));
      
      bars.push(
        <div key={barIdx} className="data-cores-meter-bar" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5px',
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          padding: '1.5px',
          width: '7px',
          height: '24px',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}>
          {Array.from({ length: bitsPerBar }).map((_, bitIdx) => {
            const isFilled = (bitsPerBar - 1 - bitIdx) < filledBits;
            return (
              <div
                key={bitIdx}
                className={`data-cores-meter-bit ${isFilled ? 'filled' : ''}`}
                style={{
                  height: '3px',
                  width: '100%',
                  borderRadius: '0.5px',
                  background: isFilled 
                    ? 'linear-gradient(135deg, #ffd700, #ffaa00)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  boxShadow: isFilled ? '0 0 3px rgba(255, 215, 0, 0.7)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
            );
          })}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap: '3.5px', overflow: 'hidden', padding: '6px 0', justifyContent: 'center' }}>
        {bars}
      </div>
    );
  };

  return (
    <div className="panel">
      <h2 style={{ margin: '0 0 12px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '8px' }}>
        Console build specs
        <div className="font-script text-gold" style={{ fontSize: '14px', marginTop: '2px', textTransform: 'none', fontWeight: 'normal' }}>Console modules & hacks</div>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Data Cores progress bar (25 bars, each 4 bits = 100 total) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--chrome-dim)', marginBottom: '4px' }}>
            <span>DATA CORE RESERVE</span>
            <span className="text-gold font-orbitron" style={{ fontWeight: 'bold' }}>{dataCores} / 100 CORES</span>
          </div>
          {renderDataCoresProgress(dataCores)}
        </div>

        {/* Dedicated "Probe type" slot */}
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          position: 'relative'
        }}>
          <div style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gold-warm)', fontWeight: 'bold' }}>
            PROBE CHASSIS TYPE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(0,0,0,0) 70%)',
              border: '2px solid var(--gold-shiny)',
              boxShadow: '0 0 6px rgba(255, 215, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'var(--gold-shiny)',
              fontSize: '11px'
            }}>
              P
            </div>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#fff' }}>STANDARD TELEMETRY PROBE</div>
              <div style={{ fontSize: '9px', color: 'var(--chrome-dim)', fontStyle: 'italic' }}>
                "The default probe, no special effects"
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Modules Slots (6 slots in a row) */}
        <div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--chrome-dim)', fontWeight: 'bold', marginBottom: '6px' }}>
            INTEGRATED MODULE SYSTEM
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ModuleCartridge
                key={i}
                mod={activeModules[i]}
                index={i}
                context="hud"
                onRearrange={onRearrange}
              />
            ))}
          </div>
        </div>

        {/* Active Hacks section */}
        <div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--chrome-dim)', fontWeight: 'bold', marginBottom: '6px' }}>
            HACKS & PASSIVE ENHANCEMENTS
          </div>
          {activeHacks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              {activeHacks.map((hack) => {
                return (
                  <div key={hack.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: hack.color, fontSize: '12px', fontWeight: 'bold' }}>
                      {hack.short}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '10.5px' }}>{hack.name}</div>
                      <div style={{ color: 'var(--chrome-dim)', fontSize: '9.5px' }}>
                        {hack.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '4px', border: '1.5px dashed rgba(255,255,255,0.04)' }}>
              No passive hacks active. Purchase hacks in Space Bazaar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useRef } from 'react'
import { LogEntry } from '../../types'

interface ShipsLogPanelProps {
  logs: LogEntry[]
}

export const ShipsLogPanel: React.FC<ShipsLogPanelProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '220px', minHeight: '220px' }}>
      <h2 style={{ 
        margin: '0 0 12px 0', 
        fontSize: '14px', 
        borderBottom: '1px solid rgba(0,229,255,0.2)', 
        paddingBottom: '8px'
      }}>
        Ship's Log
        <div className="font-script text-cyan" style={{ fontSize: '14px', marginTop: '2px', textTransform: 'none', fontWeight: 'normal' }}>Sector events & telemetries</div>
      </h2>

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          paddingRight: '4px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: 'var(--chrome-dim)', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>
            No logs recorded yet.
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--chrome-dim)', flexShrink: 0 }}>[{log.timeStr.toFixed(1)}s]</span>
              <span style={{ color: log.color || '#ffffff', fontWeight: 'bold', wordBreak: 'break-word' }}>{log.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

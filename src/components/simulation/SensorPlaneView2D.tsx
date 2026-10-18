import { useEffect, useRef } from 'react'
import { Eye, Layers } from 'lucide-react'
import type { DvsEvent } from '@/sim/eventEngine'

export type PolarityFilter = 'all' | 'on' | 'off'

interface SensorPlaneView2DProps {
  width: number
  height: number
  events: DvsEvent[]
  selectedEvent: DvsEvent | null
  onSelectEvent: (event: DvsEvent | null) => void
  polarityFilter: PolarityFilter
  setPolarityFilter: (filter: PolarityFilter) => void
  windowMs: number
  simTimeMs: number
}

export default function SensorPlaneView2D({
  width,
  height,
  events,
  selectedEvent,
  onSelectEvent,
  polarityFilter,
  setPolarityFilter,
  windowMs,
  simTimeMs,
}: SensorPlaneView2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Render 2D event sensor array with grayscale encoding
  // Base Layer 1: OFF in Grey, Top Layer 2: ON in White (White rendered on top of Grey)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear background to sensor substrate dark color
    ctx.fillStyle = '#050d1a'
    ctx.fillRect(0, 0, width, height)

    // Pass 1: Render Layer 1 (OFF Events: -1, Grey)
    if (polarityFilter === 'all' || polarityFilter === 'off') {
      ctx.fillStyle = 'rgb(130, 130, 130)'
      for (let i = 0; i < events.length; i++) {
        const ev = events[i]
        if (ev.p === -1 && ev.x >= 0 && ev.x < width && ev.y >= 0 && ev.y < height) {
          ctx.fillRect(ev.x, ev.y, 1, 1)
        }
      }
    }

    // Pass 2: Render Layer 2 (ON Events: +1, White) directly on top of Layer 1 (Overlap Rule)
    if (polarityFilter === 'all' || polarityFilter === 'on') {
      ctx.fillStyle = 'rgb(255, 255, 255)'
      for (let i = 0; i < events.length; i++) {
        const ev = events[i]
        if (ev.p === 1 && ev.x >= 0 && ev.x < width && ev.y >= 0 && ev.y < height) {
          ctx.fillRect(ev.x, ev.y, 1, 1)
        }
      }
    }

    // Highlight selected event with high-visibility cyan ring
    if (selectedEvent && selectedEvent.x >= 0 && selectedEvent.x < width && selectedEvent.y >= 0 && selectedEvent.y < height) {
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(selectedEvent.x + 0.5, selectedEvent.y + 0.5, 4, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [events, width, height, polarityFilter, selectedEvent])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || events.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const clickX = Math.round((e.clientX - rect.left) * scaleX)
    const clickY = Math.round((e.clientY - rect.top) * scaleY)

    // Find closest event within tolerance
    let closest: DvsEvent | null = null
    let minDistSq = 25 // 5 pixel search radius

    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i]
      if (polarityFilter === 'on' && ev.p !== 1) continue
      if (polarityFilter === 'off' && ev.p !== -1) continue

      const dx = ev.x - clickX
      const dy = ev.y - clickY
      const dSq = dx * dx + dy * dy
      if (dSq < minDistSq) {
        minDistSq = dSq
        closest = ev
      }
    }

    onSelectEvent(closest)
  }

  const onCount = events.filter(e => e.p === 1).length
  const offCount = events.filter(e => e.p === -1).length

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        padding: '0.85rem',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        position: 'relative',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Eye size={16} color="var(--color-cyan)" />
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            2D Sensor Plane Distribution (X, Y)
          </span>
        </div>

        {/* Polarity Filter Buttons */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--color-bg-deep)',
            padding: '0.2rem',
            borderRadius: 6,
            border: '1px solid var(--color-border-subtle)',
            gap: '0.2rem',
          }}
        >
          <button
            onClick={() => setPolarityFilter('all')}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: 4,
              fontSize: '0.68rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: polarityFilter === 'all' ? 'var(--color-cyan)' : 'transparent',
              color: polarityFilter === 'all' ? '#050d1a' : 'var(--color-text-muted)',
              transition: 'all var(--transition-fast)',
            }}
            title="Display both ON and OFF event layers (White rendered on top of Grey)"
          >
            All Layers
          </button>
          <button
            onClick={() => setPolarityFilter('on')}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: 4,
              fontSize: '0.68rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: polarityFilter === 'on' ? '#ffffff' : 'transparent',
              color: polarityFilter === 'on' ? '#050d1a' : 'var(--color-text-muted)',
              transition: 'all var(--transition-fast)',
            }}
            title="Isolate Layer 2 (+1 ON events in White)"
          >
            ON (White)
          </button>
          <button
            onClick={() => setPolarityFilter('off')}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: 4,
              fontSize: '0.68rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: polarityFilter === 'off' ? '#828282' : 'transparent',
              color: polarityFilter === 'off' ? '#ffffff' : 'var(--color-text-muted)',
              transition: 'all var(--transition-fast)',
            }}
            title="Isolate Layer 1 (-1 OFF events in Grey)"
          >
            OFF (Grey)
          </button>
        </div>
      </div>

      {/* 2D Canvas Viewport */}
      <div
        style={{
          width: '100%',
          height: '240px',
          background: '#050d1a',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--color-border-subtle)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          style={{
            height: '100%',
            aspectRatio: '1/1',
            imageRendering: 'pixelated',
            cursor: 'crosshair',
            display: 'block',
          }}
        />

        {/* Selected Event Reticle on 2D Sensor Canvas */}
        {selectedEvent && (
          <div
            style={{
              position: 'absolute',
              left: `calc(50% - 120px + ${(selectedEvent.x / width) * 240}px)`,
              top: `${(selectedEvent.y / height) * 100}%`,
              width: '16px',
              height: '16px',
              transform: 'translate(-50%, -50%)',
              border: '2px solid #38bdf8',
              borderRadius: '50%',
              pointerEvents: 'none',
              boxShadow: '0 0 10px #38bdf8',
              zIndex: 10,
            }}
          />
        )}

        {/* Polarity Legend Overlay (Top Right) */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            padding: '0.3rem 0.55rem',
            background: 'rgba(5, 13, 26, 0.92)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            fontSize: '0.66rem',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--color-border-subtle)',
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#ffffff', fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, background: '#ffffff', borderRadius: 2 }} />
              <span>+1 ON (White)</span>
            </span>
            <span style={{ color: '#ffffff', opacity: 0.9 }}>{onCount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af' }}>
              <span style={{ width: 7, height: 7, background: '#828282', borderRadius: 2 }} />
              <span>-1 OFF (Grey)</span>
            </span>
            <span style={{ color: '#9ca3af' }}>{offCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Sensor Dimensions & Time Window Overlay (Bottom Left) */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '0.25rem 0.55rem',
            background: 'rgba(5, 13, 26, 0.88)',
            backdropFilter: 'blur(4px)',
            borderRadius: 4,
            fontSize: '0.66rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-cyan)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            zIndex: 5,
          }}
        >
          <Layers size={11} />
          <span>
            t = {simTimeMs.toFixed(1)} ms · {width}×{height} px · Δt = {windowMs} ms ({events.length.toLocaleString()} ev)
          </span>
        </div>

        {/* Selected Event Tag (Bottom Right) */}
        {selectedEvent && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              padding: '0.25rem 0.55rem',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid var(--color-cyan)',
              borderRadius: 4,
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-cyan)',
              zIndex: 5,
            }}
          >
            Selected: ({selectedEvent.x}, {selectedEvent.y}) · {selectedEvent.p > 0 ? '+1 ON' : '-1 OFF'}
          </div>
        )}
      </div>
    </div>
  )
}

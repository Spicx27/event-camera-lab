import { useEffect, useRef, useState } from 'react'
import { Camera, Eye, Film, Layers, Zap } from 'lucide-react'
import type { DvsEvent, EventLayerCounts } from '@/sim/eventEngine'
import type { CapturedFrameRecord } from '@/sim/frameEngine'

interface DualSensorViewProps {
  width: number
  height: number
  frameBuffer: Float32Array
  recentCapturedFrames: CapturedFrameRecord[]
  eventImageData?: ImageData | null
  onImageData?: ImageData | null
  offImageData?: ImageData | null
  layerCounts?: EventLayerCounts
  eventCount?: number
  events?: DvsEvent[]
  fps: number
  exposureMs: number
  isExposing: boolean
  frameCount: number
  simTimeMs: number
  accumulationMs: number
  thresholdC: number
  selectedPixel: { x: number; y: number }
  onSelectPixel: (x: number, y: number) => void
  recentEventsList: DvsEvent[]
}

function FrameThumbnail({
  frame,
  width,
  height,
  isLatest,
}: {
  frame: CapturedFrameRecord
  width: number
  height: number
  isLatest: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imgData = ctx.createImageData(width, height)
    const data = imgData.data

    for (let i = 0; i < width * height; i++) {
      const val = Math.max(0, Math.min(1, frame.buffer[i]))
      const byte = Math.round(val * 255)
      const pIdx = i * 4

      data[pIdx] = byte
      data[pIdx + 1] = byte
      data[pIdx + 2] = byte
      data[pIdx + 3] = 255
    }

    ctx.putImageData(imgData, 0, 0)
  }, [frame, width, height])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.2rem',
        padding: '0.25rem',
        background: isLatest ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${isLatest ? '#818cf8' : 'var(--color-border-subtle)'}`,
        borderRadius: 6,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '54px',
          height: '54px',
          borderRadius: 4,
          imageRendering: 'pixelated',
          display: 'block',
        }}
      />
      <span
        style={{
          fontSize: '0.64rem',
          fontFamily: 'var(--font-mono)',
          color: isLatest ? '#c7d2fe' : 'var(--color-text-muted)',
          fontWeight: isLatest ? 700 : 400,
        }}
      >
        #{frame.frameIndex} · {frame.timestampMs}ms
      </span>
    </div>
  )
}

export default function DualSensorView({
  width,
  height,
  frameBuffer,
  recentCapturedFrames,
  eventImageData,
  onImageData,
  offImageData,
  layerCounts,
  eventCount,
  events,
  fps,
  exposureMs,
  isExposing,
  frameCount,
  simTimeMs,
  accumulationMs,
  thresholdC,
  selectedPixel,
  onSelectPixel,
  recentEventsList,
}: DualSensorViewProps) {
  const [layerMode, setLayerMode] = useState<'all' | 'on' | 'off'>('all')

  const frameCanvasRef = useRef<HTMLCanvasElement>(null)
  const eventOffCanvasRef = useRef<HTMLCanvasElement>(null)
  const eventOnCanvasRef = useRef<HTMLCanvasElement>(null)
  const eventCompositeCanvasRef = useRef<HTMLCanvasElement>(null)

  // 1. Render Current Frame Camera View
  useEffect(() => {
    const canvas = frameCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imgData = ctx.createImageData(width, height)
    const data = imgData.data

    for (let i = 0; i < width * height; i++) {
      const val = Math.max(0, Math.min(1, frameBuffer[i]))
      const byte = Math.round(val * 255)
      const pIdx = i * 4

      data[pIdx] = byte
      data[pIdx + 1] = byte
      data[pIdx + 2] = byte
      data[pIdx + 3] = 255
    }

    ctx.putImageData(imgData, 0, 0)
  }, [frameBuffer, width, height])

  // 2. Render Event Camera (DVS) View with Dual Layers:
  //    Layer 1: OFF Events (-1, Grey)
  //    Layer 2: ON Events (+1, White) rendered directly ON TOP of Layer 1 (White wins on overlap)
  useEffect(() => {
    if (onImageData && offImageData) {
      const offCanvas = eventOffCanvasRef.current
      const onCanvas = eventOnCanvasRef.current
      if (offCanvas) {
        const offCtx = offCanvas.getContext('2d')
        if (offCtx) offCtx.putImageData(offImageData, 0, 0)
      }
      if (onCanvas) {
        const onCtx = onCanvas.getContext('2d')
        if (onCtx) onCtx.putImageData(onImageData, 0, 0)
      }
    } else if (eventImageData) {
      // Single composite blit fallback
      const compCanvas = eventCompositeCanvasRef.current || eventOnCanvasRef.current
      if (compCanvas) {
        const ctx = compCanvas.getContext('2d')
        if (ctx) ctx.putImageData(eventImageData, 0, 0)
      }
    } else if (events && events.length > 0) {
      // Direct two-pass vector fallback
      const canvas = eventCompositeCanvasRef.current || eventOnCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#050d1a'
      ctx.fillRect(0, 0, width, height)

      // Pass 1: Layer 1 OFF (Grey)
      if (layerMode === 'all' || layerMode === 'off') {
        ctx.fillStyle = 'rgb(130, 130, 130)'
        for (const ev of events) {
          if (ev.p === -1 && ev.x >= 0 && ev.x < width && ev.y >= 0 && ev.y < height) {
            ctx.fillRect(ev.x, ev.y, 1, 1)
          }
        }
      }

      // Pass 2: Layer 2 ON (White) rendered ON TOP of Layer 1 (White wins on overlap)
      if (layerMode === 'all' || layerMode === 'on') {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        for (const ev of events) {
          if (ev.p === 1 && ev.x >= 0 && ev.x < width && ev.y >= 0 && ev.y < height) {
            ctx.fillRect(ev.x, ev.y, 1, 1)
          }
        }
      }
    }
  }, [onImageData, offImageData, eventImageData, events, width, height, layerMode])



  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvasElement: HTMLCanvasElement | null
  ) => {
    if (!canvasElement) return
    const rect = canvasElement.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    const x = Math.max(0, Math.min(width - 1, Math.floor(clientX * scaleX)))
    const y = Math.max(0, Math.min(height - 1, Math.floor(clientY * scaleY)))
    onSelectPixel(x, y)
  }

  const blindIntervalMs = Math.max(0, (1000 / fps) - exposureMs)
  const activeEventsCount = typeof eventCount === 'number' ? eventCount : (events ? events.length : 0)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '1.25rem',
      }}
    >
      {/* ── VIEW A: Conventional Frame-Based Camera ── */}
      <div
        className="card"
        style={{
          borderTop: '3px solid #818cf8',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8' }}>
              <Camera size={18} />
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Frame-Based Camera (APS)</h3>
            </div>
            <span
              className="badge"
              style={{
                background: isExposing ? 'rgba(99, 102, 241, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                color: isExposing ? '#c7d2fe' : 'var(--color-text-muted)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isExposing ? '#818cf8' : 'var(--color-text-muted)',
                }}
              />
              {isExposing ? `Shutter Open (${exposureMs.toFixed(1)} ms)` : `Blind (${blindIntervalMs.toFixed(1)} ms)`}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#c7d2fe', fontFamily: 'var(--font-mono)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#818cf8' }}>📍 Left Optical Rig</span>
            <span>·</span>
            <span>Pos [-1.9, 0, 1.4]</span>
            <span>·</span>
            <span>Azimuth -23°</span>
            <span>·</span>
            <span style={{ color: '#818cf8', fontWeight: 600 }}>Indigo Frustum</span>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1',
            background: '#020617',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
          }}
        >
          <canvas
            ref={frameCanvasRef}
            width={width}
            height={height}
            onClick={e => handleCanvasClick(e, frameCanvasRef.current)}
            style={{
              width: '100%',
              height: '100%',
              imageRendering: 'pixelated',
              cursor: 'crosshair',
              display: 'block',
            }}
          />

          {/* Selected Pixel Reticle Overlay */}
          <div
            style={{
              position: 'absolute',
              left: `${(selectedPixel.x / width) * 100}%`,
              top: `${(selectedPixel.y / height) * 100}%`,
              width: '14px',
              height: '14px',
              transform: 'translate(-50%, -50%)',
              border: '1.5px solid #818cf8',
              borderRadius: '50%',
              pointerEvents: 'none',
              boxShadow: '0 0 6px #818cf8',
            }}
          />

          {/* Frame Parameters Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              padding: '0.2rem 0.5rem',
              background: 'rgba(5, 13, 26, 0.85)',
              borderRadius: 4,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: '#c7d2fe',
            }}
          >
            Frame #{frameCount} · {fps} FPS ({((1000 / fps)).toFixed(1)} ms) · Exp: {exposureMs.toFixed(1)} ms
          </div>

          {/* Clock stamp */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '0.2rem 0.45rem',
              background: 'rgba(5, 13, 26, 0.85)',
              borderRadius: 4,
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
            }}
          >
            Clock: {simTimeMs} ms
          </div>
        </div>

        {/* ── Sequence of Captured Frames (Filmstrip History) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
            <Film size={12} />
            <span>Captured Frame Filmstrip (Discrete Time Sampling):</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.4rem',
            }}
          >
            {recentCapturedFrames.length > 0 ? (
              recentCapturedFrames.map((rf, idx) => (
                <FrameThumbnail
                  key={rf.frameIndex}
                  frame={rf}
                  width={width}
                  height={height}
                  isLatest={idx === recentCapturedFrames.length - 1}
                />
              ))
            ) : (
              <div style={{ gridColumn: 'span 4', fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                Waiting for first frame capture...
              </div>
            )}
          </div>
        </div>

        {/* Operational Note */}
        <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: '#818cf8' }}>Discrete Sampling (Slide 4):</strong> Images are captured only at fixed clock ticks.
          Fast motion during the open shutter produces <em>exposure motion blur</em>; motion during the blind interval ({blindIntervalMs.toFixed(1)} ms) is lost completely.{' '}
          <em style={{ color: 'var(--color-text-muted)' }}>Motion blur is approximated via temporal supersampling (8 sub-steps per exposure window) — not a physically exact shutter model.</em>
        </div>
      </div>

      {/* ── VIEW B: Event-Based Neuromorphic Sensor ── */}
      <div
        className="card"
        style={{
          borderTop: '3px solid var(--color-cyan)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-cyan)' }}>
              <Eye size={18} />
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Event-Based Camera (DVS)</h3>
            </div>
            <span
              className="badge badge--cyan"
              style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: activeEventsCount > 0 ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  boxShadow: activeEventsCount > 0 ? '0 0 6px var(--color-cyan)' : 'none',
                }}
              />
              {activeEventsCount > 0 ? `${activeEventsCount.toLocaleString()} Events in Δt` : 'Zero Events (Sparse)'}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a5f3fc', fontFamily: 'var(--font-mono)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--color-cyan)' }}>📍 Right Optical Rig</span>
            <span>·</span>
            <span>Pos [+1.9, 0, 1.4]</span>
            <span>·</span>
            <span>Azimuth +23°</span>
            <span>·</span>
            <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>Cyan Frustum</span>
          </div>
        </div>

        {/* Layer View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-cyan)', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
            <Layers size={14} />
            <span style={{ fontWeight: 600 }}>Active Event Layers:</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              background: 'var(--color-bg-deep)',
              padding: '0.2rem',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              gap: '0.2rem',
            }}
          >
            <button
              onClick={() => setLayerMode('all')}
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: 4,
                fontSize: '0.68rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: layerMode === 'all' ? 'var(--color-cyan)' : 'transparent',
                color: layerMode === 'all' ? '#050d1a' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
              title="Show both layers: White ON layer rendered on top of Grey OFF layer"
            >
              Both Layers (Stacked)
            </button>
            <button
              onClick={() => setLayerMode('on')}
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: 4,
                fontSize: '0.68rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: layerMode === 'on' ? '#ffffff' : 'transparent',
                color: layerMode === 'on' ? '#050d1a' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
              title="Inspect Layer 2 only (+1 ON events in White)"
            >
              ON Layer (White)
            </button>
            <button
              onClick={() => setLayerMode('off')}
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: 4,
                fontSize: '0.68rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: layerMode === 'off' ? '#828282' : 'transparent',
                color: layerMode === 'off' ? '#ffffff' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
              title="Inspect Layer 1 only (-1 OFF events in Grey)"
            >
              OFF Layer (Grey)
            </button>
          </div>
        </div>

        {/* Viewport Canvas Container (Dual Stacked Layers) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1',
            background: '#050d1a',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Base Layer 1: OFF Events (-1, Grey) */}
          <canvas
            ref={eventOffCanvasRef}
            width={width}
            height={height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              imageRendering: 'pixelated',
              display: 'block',
              pointerEvents: 'none',
              opacity: layerMode === 'all' || layerMode === 'off' ? 1 : 0,
              transition: 'opacity 0.15s ease',
              zIndex: 1,
            }}
          />

          {/* Top Layer 2: ON Events (+1, White) - Rendered directly ON TOP of Layer 1 */}
          <canvas
            ref={eventOnCanvasRef}
            width={width}
            height={height}
            onClick={e => handleCanvasClick(e, eventOnCanvasRef.current)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              imageRendering: 'pixelated',
              display: 'block',
              cursor: 'crosshair',
              opacity: layerMode === 'all' || layerMode === 'on' ? 1 : 0,
              transition: 'opacity 0.15s ease',
              zIndex: 2,
            }}
          />

          {/* Fallback Single Composite Canvas */}
          {(!onImageData || !offImageData) && (
            <canvas
              ref={eventCompositeCanvasRef}
              width={width}
              height={height}
              onClick={e => handleCanvasClick(e, eventCompositeCanvasRef.current)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                imageRendering: 'pixelated',
                cursor: 'crosshair',
                display: 'block',
                zIndex: 3,
              }}
            />
          )}

          {/* Selected Pixel Reticle Overlay */}
          <div
            style={{
              position: 'absolute',
              left: `${(selectedPixel.x / width) * 100}%`,
              top: `${(selectedPixel.y / height) * 100}%`,
              width: '14px',
              height: '14px',
              transform: 'translate(-50%, -50%)',
              border: '1.5px solid var(--color-cyan)',
              borderRadius: '50%',
              pointerEvents: 'none',
              boxShadow: '0 0 8px var(--color-cyan)',
              zIndex: 5,
            }}
          />

          {/* Event Window Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              padding: '0.2rem 0.5rem',
              background: 'rgba(5, 13, 26, 0.88)',
              borderRadius: 4,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-cyan)',
              zIndex: 6,
            }}
          >
            Δt Window: {accumulationMs} ms · C = ±{thresholdC.toFixed(2)}
          </div>

          {/* Dual Layer Stack & Overlap Rule Legend */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              padding: '0.35rem 0.6rem',
              background: 'rgba(5, 13, 26, 0.92)',
              backdropFilter: 'blur(6px)',
              borderRadius: 6,
              fontSize: '0.67rem',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--color-border-subtle)',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ffffff', fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, background: '#ffffff', borderRadius: 2, display: 'inline-block', boxShadow: '0 0 4px #ffffff' }} />
                <span>Layer 2: +1 ON (White)</span>
              </span>
              <span style={{ fontSize: '0.62rem', color: '#ffffff', opacity: 0.9 }}>
                {layerCounts ? `${layerCounts.onActive.toLocaleString()}` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#9ca3af' }}>
                <span style={{ width: 8, height: 8, background: '#828282', borderRadius: 2, display: 'inline-block' }} />
                <span>Layer 1: -1 OFF (Grey)</span>
              </span>
              <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>
                {layerCounts ? `${layerCounts.offActive.toLocaleString()}` : ''}
              </span>
            </div>

            <div style={{ fontSize: '0.6rem', color: 'var(--color-cyan)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
              <span>↳ Overlap: White on top</span>
              {layerCounts && layerCounts.overlapActive > 0 && (
                <span style={{ color: '#ffffff', fontWeight: 600 }}>({layerCounts.overlapActive.toLocaleString()} overlap)</span>
              )}
            </div>
          </div>

          {/* Clock stamp */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '0.2rem 0.45rem',
              background: 'rgba(5, 13, 26, 0.88)',
              borderRadius: 4,
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              zIndex: 6,
            }}
          >
            Clock: {(simTimeMs * 1000).toLocaleString()} µs
          </div>
        </div>

        {/* Live Recent Event Tuple Stream Strip */}
        <div
          style={{
            padding: '0.55rem 0.75rem',
            background: 'var(--color-bg-deep)',
            borderRadius: 6,
            border: '1px solid var(--color-border-subtle)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
            <Zap size={13} color="var(--color-cyan)" />
            <span>Latest AER Tuple:</span>
          </div>
          {recentEventsList.length > 0 ? (
            <div style={{ color: 'var(--color-text-primary)' }}>
              e = (x: {recentEventsList[recentEventsList.length - 1].x}, y: {recentEventsList[recentEventsList.length - 1].y}, t: {recentEventsList[recentEventsList.length - 1].t} µs, p:{' '}
              <span
                style={{
                  color: recentEventsList[recentEventsList.length - 1].p === 1 ? '#ffffff' : '#9ca3af',
                  fontWeight: 700,
                }}
              >
                {recentEventsList[recentEventsList.length - 1].p > 0 ? '+1 ON (White Layer)' : '-1 OFF (Grey Layer)'}
              </span>
              )
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)' }}>● Scene static: 0 events emitted (Sparse)</div>
          )}
        </div>

        {/* Operational Note */}
        <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-cyan)' }}>Dual Layer Contrast (Slide 9 & 17):</strong> Event generation separates into
          <strong> Layer 2 (White, +1 ON)</strong> for rising luminance and <strong>Layer 1 (Grey, -1 OFF)</strong> for falling luminance.
          When pixels experience overlapping opposite transitions in the accumulation window, the <strong>White ON layer renders on top of the Grey OFF layer</strong>.
          Static unchanged pixels emit zero events.
        </div>
      </div>
    </div>
  )
}

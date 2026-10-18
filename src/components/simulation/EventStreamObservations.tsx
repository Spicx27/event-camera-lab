import {
  Zap,
  Activity,
  Layers,
  Database,
  Info,
  Sparkles,
} from 'lucide-react'

interface EventStreamObservationsProps {
  speedDegPerSec: number
  speedRps: number
  orbitalRadiusPx: number
  dotDiameterPx: number
  thresholdC: number
  windowMs: number
  resolution: number
  simTimeMs: number
  eventCountWindow: number
  totalStreamHistoryCount: number
  eventRatePerSec: number
  totalEvents: number
  onEventsCount: number
  offEventsCount: number
  renderedPointCount?: number
  mode: 'beginner' | 'advanced'
  onApplyPreset: (preset: {
    dotDiameter: number
    orbitalRadius: number
    speed: number
    window: number
    threshold: number
  }) => void
}

export default function EventStreamObservations({
  speedDegPerSec,
  speedRps,
  orbitalRadiusPx,
  dotDiameterPx,
  thresholdC,
  windowMs,
  resolution,
  simTimeMs,
  eventCountWindow,
  totalStreamHistoryCount,
  eventRatePerSec,
  totalEvents,
  onEventsCount,
  offEventsCount,
  renderedPointCount,
  mode,
  onApplyPreset,
}: EventStreamObservationsProps) {
  // AER Bus Bandwidth calculation: 8 bytes per event record (address + timestamp)
  const bandwidthBytesPerSec = eventRatePerSec * 8
  const bandwidthKbPerSec = (bandwidthBytesPerSec / 1024).toFixed(1)
  const bandwidthMbPerSec = (bandwidthBytesPerSec / (1024 * 1024)).toFixed(2)

  // Equivalent 60 FPS conventional frame camera bandwidth
  const frameCamBytesPerSec = resolution * resolution * 60
  const frameCamKbPerSec = (frameCamBytesPerSec / 1024).toFixed(1)

  const isStationary = speedDegPerSec === 0

  let explanationTitle = ''
  let explanationBody = ''
  let presentationSlideRef = ''

  if (isStationary) {
    explanationTitle = 'Temporal Sparsity: Zero Motion = Zero Events'
    presentationSlideRef = 'Slide 9 & Slide 22'
    explanationBody = `The dot is completely stationary. Because photon irradiance is constant across all pixels, the logarithmic change Δln(I) is zero and never crosses the threshold C = ${thresholdC.toFixed(2)}. The event sensor outputs 0 events and operates at micro-power levels, while conventional frame cameras wastefully re-transmit the same static image 60 times a second.`
  } else {
    explanationTitle = 'Continuous Space-Time Double Helix'
    presentationSlideRef = 'Slide 10 (Canonical Trajectory)'
    explanationBody = `A single bright dot orbiting in a 2D plane unrolls along the temporal Z axis into a continuous 3D space-time helix. The leading edge (entering pixels) triggers White (+1 ON) events as brightness rises by ≥ C. The trailing edge (leaving pixels) triggers Grey (-1 OFF) events as brightness drops. Notice how increasing speed tightens the helical pitch!`
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* ── Real-Time Sensor & AER Bandwidth Metrics ───────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.65rem',
        }}
      >
        <div
          style={{
            padding: '0.6rem 0.75rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
            <Layers size={13} style={{ color: 'var(--color-cyan)' }} />
            <span>Window Events</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff', marginTop: '0.2rem' }}>
            {eventCountWindow.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            in Δt = {windowMs} ms
          </div>
        </div>

        <div
          style={{
            padding: '0.6rem 0.75rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
            <Activity size={13} style={{ color: '#38bdf8' }} />
            <span>Event Rate</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '0.2rem' }}>
            {(eventRatePerSec / 1000).toFixed(1)}k <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>ev/s</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            Instantaneous throughput
          </div>
        </div>

        <div
          style={{
            padding: '0.6rem 0.75rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
            <Zap size={13} style={{ color: '#f59e0b' }} />
            <span>AER Bus Traffic</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '0.2rem' }}>
            {parseFloat(bandwidthMbPerSec) >= 1 ? `${bandwidthMbPerSec} MB/s` : `${bandwidthKbPerSec} KB/s`}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            vs ~{frameCamKbPerSec} KB/s frame cam
          </div>
        </div>

        <div
          style={{
            padding: '0.6rem 0.75rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
            <Database size={13} style={{ color: 'var(--color-accent-emerald)' }} />
            <span>Retained History</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff', marginTop: '0.2rem' }}>
            {totalStreamHistoryCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            Space-time memory buffer
          </div>
        </div>

        <div
          style={{
            padding: '0.6rem 0.75rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
            <Sparkles size={13} style={{ color: '#a78bfa' }} />
            <span>3D Point Cloud</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a78bfa', marginTop: '0.2rem' }}>
            {(renderedPointCount !== undefined ? renderedPointCount : eventCountWindow).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            Points in space-time
          </div>
        </div>
      </div>

      {/* ── Dynamic "What Am I Seeing?" Observation Box ──────────────────────── */}
      <div
        style={{
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: 8,
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Info size={15} style={{ color: 'var(--color-cyan)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
              {explanationTitle}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              padding: '0.15rem 0.45rem',
              borderRadius: 4,
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--color-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            {presentationSlideRef}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.5, color: '#d1d5db' }}>
          {explanationBody}
        </p>

        {/* Polarity Details in Beginner Mode */}
        {mode === 'beginner' && (
          <div
            style={{
              marginTop: '0.35rem',
              paddingTop: '0.45rem',
              borderTop: '1px solid rgba(6, 182, 212, 0.2)',
              display: 'flex',
              gap: '1.25rem',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ffffff' }}>
              <span style={{ width: 8, height: 8, background: '#ffffff', borderRadius: '50%' }} />
              <span>Leading Edge: White (+1 ON)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a3a3a3' }}>
              <span style={{ width: 8, height: 8, background: '#a3a3a3', borderRadius: '50%' }} />
              <span>Trailing Edge: Grey (-1 OFF)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Advanced Mode Technical Diagnostics Grid ─────────────────────────── */}
      {mode === 'advanced' && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '0.75rem 0.85rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.5rem',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.62rem' }}>SIMULATION TIME</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{(simTimeMs / 1000).toFixed(3)} s</span>
          </div>
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.62rem' }}>TOTAL GENERATED</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{totalEvents.toLocaleString()} ev</span>
          </div>
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.62rem' }}>POLARITY RATIO</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>
              <span style={{ color: '#fff' }}>+{onEventsCount}</span> / <span style={{ color: '#9ca3af' }}>-{offEventsCount}</span>
            </span>
          </div>
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.62rem' }}>DOT DIAMETER</span>
            <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>{dotDiameterPx} px</span>
          </div>
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.62rem' }}>ORBITAL RADIUS</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{orbitalRadiusPx.toFixed(1)} px</span>
          </div>
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.62rem' }}>ANGULAR VELOCITY</span>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>{speedRps.toFixed(2)} rev/s</span>
          </div>
        </div>
      )}

      {/* ── Guided Experiment Presets ────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '0.75rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Sparkles size={14} style={{ color: 'var(--color-accent-amber)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f3f4f6' }}>
            Guided Presentation Experiments
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.45rem' }}>
          {/* Preset 1: Slide 10 Helix */}
          <button
            onClick={() =>
              onApplyPreset({
                dotDiameter: 7,
                orbitalRadius: 0.32,
                speed: 360,
                window: 1000,
                threshold: 0.20,
              })
            }
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.6rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              gap: '0.15rem',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fff' }}>
              1. Slide 10 Canonical Double Helix
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              1.00 rev/s orbit unrolling into 1 complete 360° space-time double helix (Δt = 1000 ms)
            </span>
          </button>

          {/* Preset 2: Fast Double Coil */}
          <button
            onClick={() =>
              onApplyPreset({
                dotDiameter: 5,
                orbitalRadius: 0.34,
                speed: 720,
                window: 1000,
                threshold: 0.22,
              })
            }
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.6rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              gap: '0.15rem',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fff' }}>
              2. High-Speed Double Coil
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              2.00 rev/s orbit unrolling into 2 tight helical coils along time (Δt = 1000 ms)
            </span>
          </button>

          {/* Preset 3: Temporal Sparsity */}
          <button
            onClick={() =>
              onApplyPreset({
                dotDiameter: 7,
                orbitalRadius: 0.32,
                speed: 0,
                window: 1000,
                threshold: 0.20,
              })
            }
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.6rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              gap: '0.15rem',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fff' }}>
              3. Temporal Sparsity (Slide 9 & 22)
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              Stationary dot verifying exactly 0 events and zero bus power
            </span>
          </button>

          {/* Preset 4: Wide Footprint & High Sensitivity */}
          <button
            onClick={() =>
              onApplyPreset({
                dotDiameter: 12,
                orbitalRadius: 0.28,
                speed: 360,
                window: 1000,
                threshold: 0.12,
              })
            }
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.6rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              gap: '0.15rem',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fff' }}>
              4. Wide Footprint & Sensitivity
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              12 px diameter dot with sensitive C = 0.12 forming a dense ribbon
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

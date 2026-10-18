import { useState } from 'react'
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
      {(() => {
        const isExp1Active =
          dotDiameterPx === 7 &&
          Math.abs(orbitalRadiusPx - 20) < 0.6 &&
          speedDegPerSec === 360 &&
          Math.abs(thresholdC - 0.20) < 0.02 &&
          windowMs === 1000

        const isExp2Active =
          dotDiameterPx === 5 &&
          Math.abs(orbitalRadiusPx - 20) < 0.6 &&
          speedDegPerSec === 720 &&
          Math.abs(thresholdC - 0.22) < 0.02 &&
          windowMs === 1000

        const isExp3Active =
          speedDegPerSec === 0 &&
          windowMs === 1000

        const isExp4Active =
          dotDiameterPx === 10 &&
          Math.abs(orbitalRadiusPx - 18) < 0.6 &&
          speedDegPerSec === 360 &&
          Math.abs(thresholdC - 0.12) < 0.02 &&
          windowMs === 1000

        return (
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.95) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 10,
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Sparkles size={16} style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.01em' }}>
                  Guided Presentation Experiments
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.66rem',
                  color: '#94a3b8',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(148, 163, 184, 0.1)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 4,
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                }}
              >
                Click to auto-load benchmark
              </span>
            </div>

            {/* Responsive Experiments Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '0.65rem',
              }}
            >
              {/* Preset 1: Slide 10 Helix */}
              <ExperimentCard
                expNum={1}
                badgeColor="56, 189, 248"
                slideRef="Slide 10 Benchmark"
                title="1. Canonical Double Helix"
                paramSummary="ω = 360°/s (1 rev/s) • r = 20 px • C = 0.20"
                description="Standard 1.00 rev/s orbit unrolling into 1 complete 360° space-time double helix over 1000 ms."
                isActive={isExp1Active}
                onClick={() =>
                  onApplyPreset({
                    dotDiameter: 7,
                    orbitalRadius: 20,
                    speed: 360,
                    window: 1000,
                    threshold: 0.20,
                  })
                }
              />

              {/* Preset 2: Fast Double Coil */}
              <ExperimentCard
                expNum={2}
                badgeColor="192, 132, 252"
                slideRef="High Velocity"
                title="2. High-Speed Double Coil"
                paramSummary="ω = 720°/s (2 rev/s) • r = 20 px • C = 0.22"
                description="2.00 rev/s orbit producing 2 tight space-time helical coils along time (Δt = 1000 ms)."
                isActive={isExp2Active}
                onClick={() =>
                  onApplyPreset({
                    dotDiameter: 5,
                    orbitalRadius: 20,
                    speed: 720,
                    window: 1000,
                    threshold: 0.22,
                  })
                }
              />

              {/* Preset 3: Temporal Sparsity */}
              <ExperimentCard
                expNum={3}
                badgeColor="251, 191, 36"
                slideRef="Slide 9 & 22 Sparsity"
                title="3. Temporal Sparsity Benchmark"
                paramSummary="ω = 0°/s (Static) • r = 20 px • C = 0.20"
                description="Stationary scene demonstrating zero event generation (0 ev/s) and near-zero bus power."
                isActive={isExp3Active}
                onClick={() =>
                  onApplyPreset({
                    dotDiameter: 7,
                    orbitalRadius: 20,
                    speed: 0,
                    window: 1000,
                    threshold: 0.20,
                  })
                }
              />

              {/* Preset 4: Wide Footprint & Sensitivity */}
              <ExperimentCard
                expNum={4}
                badgeColor="52, 211, 153"
                slideRef="Max Footprint"
                title="4. Wide Footprint & Sensitivity"
                paramSummary="dia = 10 px • r = 18 px • C = 0.12"
                description="10 px diameter dot (maximum supported footprint) with sensitive C = 0.12 forming a dense ribbon."
                isActive={isExp4Active}
                onClick={() =>
                  onApplyPreset({
                    dotDiameter: 10,
                    orbitalRadius: 18,
                    speed: 360,
                    window: 1000,
                    threshold: 0.12,
                  })
                }
              />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

interface ExperimentCardProps {
  expNum: number
  badgeColor: string
  slideRef: string
  title: string
  paramSummary: string
  description: string
  isActive: boolean
  onClick: () => void
}

function ExperimentCard({
  expNum,
  badgeColor,
  slideRef,
  title,
  paramSummary,
  description,
  isActive,
  onClick,
}: ExperimentCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        width: '100%',
        boxSizing: 'border-box',
        padding: '0.75rem 0.85rem',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.18s ease-in-out',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        border: isActive
          ? '1.5px solid #06b6d4'
          : isHovered
            ? '1.5px solid rgba(56, 189, 248, 0.55)'
            : '1px solid rgba(148, 163, 184, 0.22)',
        background: isActive
          ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%)'
          : isHovered
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(30, 41, 59, 0.55) 0%, rgba(15, 23, 42, 0.85) 100%)',
        boxShadow: isActive
          ? '0 0 14px rgba(6, 182, 212, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : isHovered
            ? '0 4px 12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
            : '0 2px 4px rgba(0, 0, 0, 0.2)',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {/* Top Header: Badge, Slide Ref, Active Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '0.4rem',
          marginBottom: '0.35rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              padding: '0.12rem 0.35rem',
              borderRadius: 4,
              background: `rgba(${badgeColor}, 0.15)`,
              color: `rgb(${badgeColor})`,
              border: `1px solid rgba(${badgeColor}, 0.35)`,
            }}
          >
            EXP {expNum}
          </span>
          <span
            style={{
              fontSize: '0.64rem',
              color: '#94a3b8',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {slideRef}
          </span>
        </div>

        {isActive ? (
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              padding: '0.1rem 0.4rem',
              borderRadius: 4,
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
            ACTIVE
          </span>
        ) : (
          <span
            style={{
              fontSize: '0.64rem',
              color: isHovered ? '#38bdf8' : '#64748b',
              fontFamily: 'var(--font-mono)',
              transition: 'color 0.15s ease',
            }}
          >
            Load ↵
          </span>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: isActive ? '#38bdf8' : '#f8fafc',
          lineHeight: 1.35,
          marginBottom: '0.3rem',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {title}
      </div>

      {/* Parameter Summary Chip */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '0.67rem',
          fontFamily: 'var(--font-mono)',
          color: '#7dd3fc',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          padding: '0.15rem 0.45rem',
          borderRadius: 4,
          marginBottom: '0.4rem',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {paramSummary}
      </div>

      {/* Description Body */}
      <div
        style={{
          fontSize: '0.72rem',
          color: '#cbd5e1',
          lineHeight: 1.45,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {description}
      </div>
    </button>
  )
}

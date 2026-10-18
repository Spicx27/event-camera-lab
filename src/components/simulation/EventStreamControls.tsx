import {
  Play,
  Pause,
  Square,
  SkipForward,
  RotateCcw,
  Sliders,
  Radio,
  Circle,
  MoveHorizontal,
} from 'lucide-react'

export interface EventStreamControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  onStop: () => void
  onStep: () => void
  onReset: () => void

  simTimeMs: number
  retainedDurationMs: number
  windowMs: number
  onWindowMsChange: (ms: number) => void
  scrubTimeMs: number | null
  onScrubChange: (ms: number | null) => void
  isLiveFollow: boolean
  onToggleLiveFollow: () => void

  mode: 'beginner' | 'advanced'
  onModeChange: (m: 'beginner' | 'advanced') => void

  dotDiameterPx: number
  onDotDiameterChange: (dia: number) => void
  orbitalRadiusPx: number
  onOrbitalRadiusChange: (radiusPx: number) => void
  orbitalRadiusNorm?: number
  speedDegPerSec: number
  onSpeedChange: (degPerSec: number) => void
  direction: 1 | -1
  onDirectionToggle: () => void

  thresholdC: number
  onThresholdChange: (c: number) => void
  resolution: 64 | 128
  onResolutionChange: (res: 64 | 128) => void
  illuminationLux: number
  onIlluminationChange: (lux: number) => void
  maxHistoryLimit: number
  onMaxHistoryLimitChange: (limit: number) => void
  pointSize: number
  onPointSizeChange: (size: number) => void
}

export default function EventStreamControls({
  isPlaying,
  onTogglePlay,
  onStop,
  onStep,
  onReset,
  simTimeMs,
  retainedDurationMs,
  windowMs,
  onWindowMsChange,
  scrubTimeMs,
  onScrubChange,
  isLiveFollow,
  onToggleLiveFollow,
  mode,
  onModeChange,
  dotDiameterPx,
  onDotDiameterChange,
  orbitalRadiusPx,
  onOrbitalRadiusChange,
  orbitalRadiusNorm: _orbitalRadiusNorm,
  speedDegPerSec,
  onSpeedChange,
  direction,
  onDirectionToggle,
  thresholdC,
  onThresholdChange,
  resolution,
  onResolutionChange,
  illuminationLux,
  onIlluminationChange,
  maxHistoryLimit,
  onMaxHistoryLimitChange,
  pointSize,
  onPointSizeChange,
}: EventStreamControlsProps) {
  // Speed presets in revolutions per second and deg/s (hard limit: 1080°/s = 3.00 rev/s)
  const speedPresets = [
    { label: 'Stationary', deg: 0, rps: '0.00 rev/s' },
    { label: 'Slow', deg: 90, rps: '0.25 rev/s' },
    { label: 'Normal', deg: 360, rps: '1.00 rev/s' },
    { label: 'Fast', deg: 720, rps: '2.00 rev/s' },
    { label: 'Extreme', deg: 1080, rps: '3.00 rev/s' },
  ]

  const clampedSpeed = Math.min(1080, Math.max(0, speedDegPerSec))
  const currentRps = (clampedSpeed / 360).toFixed(2)
  const halfRes = (resolution - 1) / 2
  const effectiveRadiusPx = Math.min(20, Math.max(1, orbitalRadiusPx))
  const effectiveDotRadiusPx = Math.min(5, Math.max(0.5, dotDiameterPx / 2))
  const maxReachPx = effectiveRadiusPx + effectiveDotRadiusPx
  const isClipping = maxReachPx > halfRes

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '0.85rem 1rem',
      }}
    >
      {/* ── Playback Bar & Mode Switcher ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Playback action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <button
            onClick={onTogglePlay}
            className={isPlaying ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 700,
            }}
            title={isPlaying ? 'Pause simulation clock and event stream' : 'Resume live simulation'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={onStop}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Stop simulation playback"
          >
            <Square size={13} />
            <span>Stop</span>
          </button>

          <button
            onClick={onStep}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Advance exactly one single physical frame (16.7 ms)"
          >
            <SkipForward size={13} />
            <span>Step</span>
          </button>

          <button
            onClick={onReset}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Reset dot position, clear event stream history, and re-arm per-pixel log luminance"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Live Simulation Clock Readout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '0.35rem 0.75rem',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Sim Time: </span>
            <span style={{ color: '#fff', fontWeight: 700 }}>
              {(simTimeMs / 1000).toFixed(3)} s ({Math.round(simTimeMs)} ms)
            </span>
          </div>
          <span style={{ color: 'var(--color-text-muted)' }}>·</span>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Orbiting: </span>
            <span style={{ color: speedDegPerSec === 0 ? 'var(--color-accent-amber)' : 'var(--color-cyan)', fontWeight: 700 }}>
              {currentRps} rev/s
            </span>
          </div>
        </div>

        {/* Mode Selector (Beginner vs Advanced) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 6,
              padding: 2,
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => onModeChange('beginner')}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.74rem',
                borderRadius: 4,
                border: 'none',
                background: mode === 'beginner' ? 'var(--color-cyan)' : 'transparent',
                color: mode === 'beginner' ? '#050d1a' : 'var(--color-text-muted)',
                fontWeight: mode === 'beginner' ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              Beginner Mode
            </button>
            <button
              onClick={() => onModeChange('advanced')}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.74rem',
                borderRadius: 4,
                border: 'none',
                background: mode === 'advanced' ? 'var(--color-cyan)' : 'transparent',
                color: mode === 'advanced' ? '#050d1a' : 'var(--color-text-muted)',
                fontWeight: mode === 'advanced' ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              Advanced Mode
            </button>
          </div>
        </div>
      </div>

      {/* ── Interactive Timeline Scrubber Bar ──────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          padding: '0.55rem 0.75rem',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 6,
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem' }}>
            <Sliders size={13} style={{ color: 'var(--color-cyan)' }} />
            <span style={{ fontWeight: 600, color: '#f3f4f6' }}>Space-Time Inspection Scrub</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              ({retainedDurationMs > 0 ? `${(retainedDurationMs / 1000).toFixed(2)}s in memory` : 'Waiting for events...'})
            </span>
          </div>

          <button
            onClick={onToggleLiveFollow}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              borderRadius: 4,
              border: '1px solid',
              borderColor: isLiveFollow ? 'var(--color-accent-emerald)' : 'var(--color-border)',
              background: isLiveFollow ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: isLiveFollow ? '#6ee7b7' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Radio size={10} />
            <span>{isLiveFollow ? 'LIVE TRACKING' : 'SCRUB DETACHED'}</span>
          </button>
        </div>

        <input
          type="range"
          min={Math.max(0, simTimeMs - retainedDurationMs)}
          max={Math.max(10, simTimeMs)}
          step={1}
          value={scrubTimeMs !== null ? scrubTimeMs : simTimeMs}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            onScrubChange(val >= simTimeMs - 5 ? null : val)
          }}
          style={{ width: '100%', accentColor: 'var(--color-cyan)' }}
        />
      </div>

      {/* ── Mode 1: Beginner Controls ────────────────────────────────────────── */}
      {mode === 'beginner' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Working Dot Controls Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            {/* Dot Size Control */}
            <div style={{ background: 'var(--color-bg-deep)', padding: '0.65rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Circle size={12} style={{ color: 'var(--color-cyan)' }} />
                  Dot Diameter
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)', fontWeight: 700 }}>
                  {Math.min(10, dotDiameterPx)} px (Max: 10 px)
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={Math.min(10, dotDiameterPx)}
                onChange={(e) => onDotDiameterChange(Math.min(10, parseInt(e.target.value, 10)))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.2rem' }}>
                Widens the brightness footprint across sensor pixels (Limit: 10 px)
              </span>
            </div>

            {/* Orbital Radius Control */}
            <div style={{ background: 'var(--color-bg-deep)', padding: '0.65rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MoveHorizontal size={12} style={{ color: '#38bdf8' }} />
                  Orbital Radius
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>
                  {effectiveRadiusPx.toFixed(1)} px (Max: 20 px)
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={effectiveRadiusPx}
                onChange={(e) => onOrbitalRadiusChange(Math.min(20, parseFloat(e.target.value)))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.62rem', color: isClipping ? '#fca5a5' : 'var(--color-text-muted)', display: 'block', marginTop: '0.2rem' }}>
                {isClipping ? 'Warning: Dot edge reaches outside sensor boundary' : 'Distance from fixed orbit centre to dot centre (Limit: 20 px)'}
              </span>
            </div>

            {/* Time Window Duration Δt */}
            <div style={{ background: 'var(--color-bg-deep)', padding: '0.65rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#fff' }}>
                  Space-Time Window (Δt)
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#a78bfa', fontWeight: 700 }}>
                  {Math.min(1000, windowMs)} ms (Max: 1000 ms)
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={1000}
                step={50}
                value={Math.min(1000, windowMs)}
                onChange={(e) => onWindowMsChange(Math.min(1000, parseInt(e.target.value, 10)))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.2rem' }}>
                Active duration of the 3D temporal stream Z-axis (Limit: 1000 ms)
              </span>
            </div>
          </div>

          {/* Speed Presets */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#f3f4f6' }}>
                Orbital Velocity Preset
              </span>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>
                {currentRps} rev/s ({speedDegPerSec}°/s)
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem' }}>
              {speedPresets.map((p) => {
                const isActive = Math.abs(speedDegPerSec - p.deg) < 10
                return (
                  <button
                    key={p.label}
                    onClick={() => onSpeedChange(p.deg)}
                    style={{
                      padding: '0.35rem 0.2rem',
                      fontSize: '0.7rem',
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: isActive ? 'var(--color-cyan)' : 'var(--color-border)',
                      background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontWeight: isActive ? 700 : 400,
                      textAlign: 'center',
                    }}
                  >
                    <div>{p.label}</div>
                    <div style={{ fontSize: '0.62rem', opacity: 0.75 }}>{p.rps}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Direction & Threshold quick controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Orbit Direction
              </label>
              <button
                onClick={onDirectionToggle}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{direction === 1 ? '↻ Clockwise Orbit' : '↺ Counter-Clockwise Orbit'}</span>
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Contrast Threshold (C)</span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#fff' }}>{thresholdC.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.08}
                max={0.50}
                step={0.02}
                value={thresholdC}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ── Mode 2: Advanced Controls ────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Row 1: Continuous Speed Slider & Direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Continuous Angular Velocity
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>
                  {clampedSpeed}°/s ({currentRps} rev/s · Max: 1080°/s)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1080}
                step={15}
                value={clampedSpeed}
                onChange={(e) => onSpeedChange(Math.min(1080, parseFloat(e.target.value)))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Orbital Direction
              </label>
              <button
                onClick={onDirectionToggle}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{direction === 1 ? '↻ Clockwise' : '↺ Counter-Clockwise'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Dot Size & Orbital Radius */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Dot Diameter (Footprint)
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>
                  {Math.min(10, dotDiameterPx)} px (Max: 10 px)
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={Math.min(10, dotDiameterPx)}
                onChange={(e) => onDotDiameterChange(Math.min(10, parseInt(e.target.value, 10)))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Orbital Radius (Radius from Centre)
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                  {effectiveRadiusPx.toFixed(1)} px (Max: 20 px)
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={effectiveRadiusPx}
                onChange={(e) => onOrbitalRadiusChange(Math.min(20, parseFloat(e.target.value)))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 3: Window Duration Δt & Contrast Threshold C */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Space-Time Window Duration (Δt)
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                  {Math.min(1000, windowMs)} ms (Max: 1000 ms)
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={1000}
                step={50}
                value={Math.min(1000, windowMs)}
                onChange={(e) => onWindowMsChange(Math.min(1000, parseInt(e.target.value, 10)))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Contrast Threshold (C) (Slide 9)
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                  {thresholdC.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.08}
                max={0.50}
                step={0.02}
                value={thresholdC}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 4: Resolution, Point Size, Illumination & Buffer Cap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
            {/* Resolution */}
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                Sensor Array
              </span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => onResolutionChange(64)}
                  style={{
                    flex: 1,
                    padding: '0.25rem 0',
                    fontSize: '0.68rem',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: resolution === 64 ? 'var(--color-cyan)' : 'var(--color-border)',
                    background: resolution === 64 ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    color: resolution === 64 ? '#fff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  64×64
                </button>
                <button
                  onClick={() => onResolutionChange(128)}
                  style={{
                    flex: 1,
                    padding: '0.25rem 0',
                    fontSize: '0.68rem',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: resolution === 128 ? 'var(--color-cyan)' : 'var(--color-border)',
                    background: resolution === 128 ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    color: resolution === 128 ? '#fff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  128×128
                </button>
              </div>
            </div>

            {/* Point Size */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>3D Point Size</span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#fff' }}>{pointSize.toFixed(1)}px</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={8.0}
                step={0.5}
                value={pointSize}
                onChange={(e) => onPointSizeChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Illumination */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Illumination</span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#fff' }}>{illuminationLux} lx</span>
              </div>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={illuminationLux}
                onChange={(e) => onIlluminationChange(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Stream Buffer Cap */}
            <div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                Buffer History Cap
              </span>
              <select
                value={maxHistoryLimit}
                onChange={(e) => onMaxHistoryLimitChange(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '0.25rem 0.4rem',
                  fontSize: '0.68rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  color: '#fff',
                }}
              >
                <option value={10000}>10,000 ev</option>
                <option value={20000}>20,000 ev</option>
                <option value={35000}>35,000 ev</option>
                <option value={50000}>50,000 ev</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

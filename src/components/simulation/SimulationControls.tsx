import {
  HelpCircle,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Square,
  Sun,
} from 'lucide-react'
import type { MotionPattern, OpticalPattern } from '@/sim/sceneModel'

export type SimulationMode = 'beginner' | 'advanced'

interface SimulationControlsProps {
  mode: SimulationMode
  setMode: (mode: SimulationMode) => void

  // Speed and Dynamics
  speedDegPerSec: number
  setSpeedDegPerSec: (val: number) => void
  direction: 1 | -1
  setDirection: (val: 1 | -1) => void
  motionPattern: MotionPattern
  setMotionPattern: (val: MotionPattern) => void
  opticalPattern: OpticalPattern
  setOpticalPattern: (val: OpticalPattern) => void
  includeMovableSphere: boolean
  setIncludeMovableSphere: (val: boolean) => void

  // Illumination
  illuminationLux: number
  setIlluminationLux: (val: number) => void

  // Frame Camera
  fps: number
  setFps: (val: number) => void
  exposureMs: number
  setExposureMs: (val: number) => void

  // Event Camera
  thresholdC: number
  setThresholdC: (val: number) => void
  accumulationMs: number
  setAccumulationMs: (val: number) => void
  resolution: 64 | 128
  setResolution: (val: 64 | 128) => void

  // Playback
  isRunning: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onStep: () => void
  onReset: () => void
}

export default function SimulationControls({
  mode,
  setMode,
  speedDegPerSec,
  setSpeedDegPerSec,
  direction,
  setDirection,
  motionPattern,
  setMotionPattern,
  opticalPattern,
  setOpticalPattern,
  includeMovableSphere,
  setIncludeMovableSphere,
  illuminationLux,
  setIlluminationLux,
  fps,
  setFps,
  exposureMs,
  setExposureMs,
  thresholdC,
  setThresholdC,
  accumulationMs,
  setAccumulationMs,
  resolution,
  setResolution,
  isRunning,
  onPlay,
  onPause,
  onStop,
  onStep,
  onReset,
}: SimulationControlsProps) {
  const maxExposureForFps = 1000 / fps

  const speedPresets = [
    { label: 'Stationary', speed: 0, desc: '0°/s (0×)' },
    { label: 'Slow', speed: 120, desc: '120°/s (0.2×)' },
    { label: 'Normal', speed: 600, desc: '600°/s (1.0×)' },
    { label: 'Fast', speed: 1200, desc: '1200°/s (2.0×)' },
    { label: 'Extreme', speed: 2160, desc: '2160°/s (3.6×)' },
  ]

  return (
    <div
      className="card"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* ── Top Bar: Mode Toggle + Primary Playback Controls ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* Beginner vs Advanced Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--color-bg-deep)',
              padding: '0.25rem',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setMode('beginner')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: mode === 'beginner' ? 'var(--color-cyan)' : 'transparent',
                color: mode === 'beginner' ? '#050d1a' : 'var(--color-text-secondary)',
              }}
            >
              Beginner Mode
            </button>
            <button
              onClick={() => setMode('advanced')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: mode === 'advanced' ? 'var(--color-teal)' : 'transparent',
                color: mode === 'advanced' ? '#050d1a' : 'var(--color-text-secondary)',
              }}
            >
              Advanced Mode
            </button>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {mode === 'beginner' ? 'Core concepts & presets' : 'Engineering parameters & physics'}
          </span>
        </div>

        {/* Playback Controls (Play, Pause, Stop, Step, Reset) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {isRunning ? (
            <button
              onClick={onPause}
              className="btn btn--outline"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Pause simulation (freeze clock)"
            >
              <Pause size={14} />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="btn btn--primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Start / Resume simulation"
            >
              <Play size={14} />
              <span>Play</span>
            </button>
          )}

          <button
            onClick={onStop}
            className="btn btn--ghost"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Halt and return to initial starting state (t=0, angle=0)"
          >
            <Square size={13} />
            <span>Stop</span>
          </button>

          <button
            onClick={onStep}
            className="btn btn--ghost"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Advance by one controlled frame increment (33 ms)"
          >
            <SkipForward size={14} />
            <span>Step</span>
          </button>

          <button
            onClick={onReset}
            className="btn btn--ghost"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Restore default parameters and reset state"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── Central Movement Speed Control (Prominent Section) ── */}
      <div
        style={{
          background: 'rgba(5, 13, 26, 0.65)',
          padding: '1rem 1.25rem',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Target Motion Speed & Dynamics
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Controls the physical angular velocity of the observed scene target.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                fontSize: '1rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: speedDegPerSec === 0 ? 'var(--color-text-muted)' : speedDegPerSec >= 1000 ? 'var(--color-cyan)' : 'var(--color-text-primary)',
              }}
            >
              {speedDegPerSec}°/s {speedDegPerSec === 0 ? '(Stationary)' : speedDegPerSec >= 1000 ? '(Slide 17 Benchmark)' : ''}
            </span>

            <button
              onClick={() => setDirection(direction === 1 ? -1 : 1)}
              className="btn btn--ghost"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Reverse direction"
            >
              {direction === 1 ? <RotateCw size={13} /> : <RotateCcw size={13} />}
              <span>{direction === 1 ? 'CW' : 'CCW'}</span>
            </button>
          </div>
        </div>

        {/* Speed Presets Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
          {speedPresets.map(p => {
            const isSelected = speedDegPerSec === p.speed
            return (
              <button
                key={p.label}
                onClick={() => setSpeedDegPerSec(p.speed)}
                style={{
                  padding: '0.45rem 0.5rem',
                  borderRadius: 6,
                  border: isSelected ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-subtle)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--color-bg-deep)',
                  color: isSelected ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.15rem',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{p.label}</span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: isSelected ? '#a5f3fc' : 'var(--color-text-muted)' }}>
                  {p.desc}
                </span>
              </button>
            )
          })}
        </div>

        {/* Continuous Speed Slider */}
        <input
          type="range"
          min={0}
          max={2400}
          step={60}
          value={speedDegPerSec}
          onChange={e => setSpeedDegPerSec(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--color-cyan)', cursor: 'pointer' }}
        />
      </div>

      {/* ── BEGINNER MODE CONTENT ── */}
      {mode === 'beginner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Try This Experiment Card */}
          <div
            style={{
              padding: '1rem',
              background: 'rgba(20, 184, 166, 0.06)',
              border: '1px solid rgba(20, 184, 166, 0.25)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-teal)', fontSize: '0.84rem', fontWeight: 700 }}>
              <Lightbulb size={16} />
              <span>Guided Experiments: Click to Test</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.6rem' }}>
              <button
                onClick={() => {
                  setSpeedDegPerSec(0)
                  setFps(30)
                }}
                className="btn btn--ghost"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  whiteSpace: 'normal',
                  borderColor: speedDegPerSec === 0 ? 'var(--color-teal)' : 'var(--color-border-subtle)',
                }}
              >
                <strong style={{ color: 'var(--color-text-primary)' }}>1. Stationary Test (0°/s)</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                  Notice: Frame camera transmits 30 static images/sec. Event camera goes silent (0 events)!
                </span>
              </button>

              <button
                onClick={() => {
                  setSpeedDegPerSec(2160)
                  setExposureMs(20)
                  setFps(30)
                }}
                className="btn btn--ghost"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  whiteSpace: 'normal',
                  borderColor: speedDegPerSec >= 2000 ? 'var(--color-teal)' : 'var(--color-border-subtle)',
                }}
              >
                <strong style={{ color: 'var(--color-text-primary)' }}>2. Extreme Speed Blur (&gt;1000°/s)</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                  Notice: Frame camera exhibits heavy shutter smear. Event camera keeps edges sharp!
                </span>
              </button>

              <button
                onClick={() => {
                  onPause()
                  onStep()
                }}
                className="btn btn--ghost"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  whiteSpace: 'normal',
                }}
              >
                <strong style={{ color: 'var(--color-text-primary)' }}>3. Step Frame-by-Frame</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                  Freezes simulation and advances one frame tick at a time to examine discrete jumps.
                </span>
              </button>
            </div>
          </div>

          {/* Quick Glossary Tooltip Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <HelpCircle size={13} /> Terminology:
            </span>
            {[
              { term: 'AER', tip: 'Address-Event Representation: packets containing (x, y, timestamp, polarity)' },
              { term: 'Temporal Sparsity', tip: 'Pixels transmit data only when brightness changes, staying silent during static scenes' },
              { term: 'Exposure Blur', tip: 'Motion during the open shutter integrates across pixels, smearing high-speed edges' },
              { term: 'Blind Interval', tip: 'Time between consecutive frames where CMOS camera cannot see scene motion' },
            ].map(g => (
              <span
                key={g.term}
                title={g.tip}
                style={{
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '0.2rem 0.5rem',
                  background: 'var(--color-bg-deep)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 4,
                  color: 'var(--color-cyan)',
                  cursor: 'help',
                }}
              >
                {g.term} ℹ
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── ADVANCED MODE CONTENT ── */}
      {mode === 'advanced' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            paddingTop: '0.5rem',
          }}
        >
          {/* Section 1: Scene & Optical Stimuli */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              1. Scene Stimuli & Dynamics
            </div>

            {/* Motion Trajectory Mode */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => setMotionPattern('rotation')}
                className="btn btn--ghost"
                style={{
                  flex: 1,
                  padding: '0.25rem 0.35rem',
                  fontSize: '0.68rem',
                  borderColor: motionPattern === 'rotation' ? 'var(--color-cyan)' : 'var(--color-border-subtle)',
                  color: motionPattern === 'rotation' ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                }}
              >
                Rotational Target
              </button>
              <button
                onClick={() => setMotionPattern('oscillation')}
                className="btn btn--ghost"
                style={{
                  flex: 1,
                  padding: '0.25rem 0.35rem',
                  fontSize: '0.68rem',
                  borderColor: motionPattern === 'oscillation' ? 'var(--color-cyan)' : 'var(--color-border-subtle)',
                  color: motionPattern === 'oscillation' ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                }}
              >
                Linear Projectile
              </button>
            </div>

            {/* Pattern Selector */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { id: 'siemens_star', label: 'Siemens Star' },
                { id: 'rotating_dot', label: 'Rotating Dot (Slide 10)' },
                { id: 'quadrant', label: 'Quadrants' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setOpticalPattern(p.id as OpticalPattern)}
                  className="btn btn--ghost"
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.35rem',
                    fontSize: '0.68rem',
                    borderColor: opticalPattern === p.id ? 'var(--color-cyan)' : 'var(--color-border-subtle)',
                    color: opticalPattern === p.id ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Movable Sphere Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeMovableSphere}
                onChange={e => setIncludeMovableSphere(e.target.checked)}
                style={{ accentColor: 'var(--color-cyan)' }}
              />
              <span>Include independently movable bright sphere</span>
            </label>

            {/* Ambient Lux Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sun size={12} color="#facc15" /> Ambient Lux
                </span>
                <span style={{ color: '#facc15', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {illuminationLux.toLocaleString()} lux
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={10000}
                step={50}
                value={illuminationLux}
                onChange={e => setIlluminationLux(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#facc15' }}
              />
            </div>
          </div>

          {/* Section 2: Frame Camera Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              2. Frame Camera (Slides 4 & 17)
            </div>

            {/* Frame Rate Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Sampling Frame Rate (FPS)</div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[5, 15, 30, 60].map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setFps(f)
                      if (exposureMs > 1000 / f) setExposureMs(1000 / f)
                    }}
                    className="btn btn--ghost"
                    style={{
                      flex: 1,
                      padding: '0.3rem 0.35rem',
                      fontSize: '0.72rem',
                      borderColor: fps === f ? '#818cf8' : 'var(--color-border-subtle)',
                      color: fps === f ? '#818cf8' : 'var(--color-text-secondary)',
                    }}
                  >
                    {f} Hz
                  </button>
                ))}
              </div>
            </div>

            {/* Shutter Exposure Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Shutter Exposure</span>
                <span style={{ color: '#818cf8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {exposureMs.toFixed(1)} ms / {(1000 / fps).toFixed(1)} ms
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={maxExposureForFps}
                step={0.5}
                value={exposureMs}
                onChange={e => setExposureMs(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#818cf8' }}
              />
            </div>
          </div>

          {/* Section 3: Event Camera Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              3. Event Camera (Slides 9 & 10)
            </div>

            {/* Threshold C */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Contrast Threshold (C)</span>
                <span style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ±{thresholdC.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.6}
                step={0.01}
                value={thresholdC}
                onChange={e => setThresholdC(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-cyan)' }}
              />
            </div>

            {/* Accumulation Window */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Accumulation Window (Δt)</span>
                <span style={{ color: 'var(--color-teal)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {accumulationMs} ms ({accumulationMs * 1000} µs)
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={60}
                step={1}
                value={accumulationMs}
                onChange={e => setAccumulationMs(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-teal)' }}
              />
            </div>

            {/* Resolution Toggle */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { res: 64, label: '64 × 64 (Standard)' },
                { res: 128, label: '128 × 128 (HD DVS)' },
              ].map(r => (
                <button
                  key={r.res}
                  onClick={() => setResolution(r.res as 64 | 128)}
                  className="btn btn--ghost"
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.35rem',
                    fontSize: '0.68rem',
                    borderColor: resolution === r.res ? 'var(--color-cyan)' : 'var(--color-border-subtle)',
                    color: resolution === r.res ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

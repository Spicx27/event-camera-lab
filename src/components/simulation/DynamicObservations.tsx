import { Info, Sparkles } from 'lucide-react'

interface DynamicObservationsProps {
  speedDegPerSec: number
  fps: number
  exposureMs: number
  thresholdC: number
  illuminationLux: number
  eventCount: number
  eventRate: number
}

export default function DynamicObservations({
  speedDegPerSec,
  fps,
  exposureMs,
  thresholdC,
  illuminationLux,
  eventCount,
  eventRate,
}: DynamicObservationsProps) {
  const framePeriodMs = 1000 / fps
  const blindIntervalMs = Math.max(0, framePeriodMs - exposureMs)
  const exposureDutyCycle = Math.round((exposureMs / framePeriodMs) * 100)

  // 1. Determine dynamic speed observation
  let speedObservation = {
    title: 'Normal Motion Dynamics',
    badge: 'Standard Speed',
    badgeColor: 'var(--color-cyan)',
    text: `At ${speedDegPerSec}°/s, moderate motion blur appears on the frame camera as high-contrast spokes traverse pixels during the ${exposureMs.toFixed(1)} ms shutter window. The event camera generates distinct white (+1 ON) and grey (-1 OFF) event layers, prioritizing the white layer whenever transitions overlap.`,
  }

  if (speedDegPerSec === 0) {
    speedObservation = {
      title: 'Zero Motion: Temporal Sparsity in Action',
      badge: 'Stationary (0°/s)',
      badgeColor: '#10b981',
      text: `The target is completely stationary. The frame camera continues transmitting redundant full-frame matrices at ${fps} FPS, sending unchanged data. In contrast, the event camera detects zero change in logarithmic luminance (ΔL = 0 < C) and emits zero events (${eventCount} events in window). This demonstrates biological temporal contrast sparsity.`,
    }
  } else if (speedDegPerSec <= 240) {
    speedObservation = {
      title: 'Slow Motion: Sub-Pixel Edge Displacement',
      badge: 'Slow (≤ 240°/s)',
      badgeColor: 'var(--color-teal)',
      text: `At low angular velocity (${speedDegPerSec}°/s), edge displacement during the ${exposureMs.toFixed(1)} ms exposure window is minimal, so the frame camera produces relatively sharp images. The event camera generates a modest, sparse stream of events (${eventRate.toLocaleString()} events/s) concentrated tightly at moving contrast boundaries.`,
    }
  } else if (speedDegPerSec >= 1000) {
    speedObservation = {
      title: 'High-Speed Motion: Shutter Smear vs. Microsecond Tracking (Slide 17)',
      badge: 'Extreme (>1000°/s)',
      badgeColor: '#f43f5e',
      text: `At extreme angular velocity (${speedDegPerSec}°/s, exceeding the >1000°/s benchmark from Slide 17), the frame camera exhibits severe shutter smear/motion blur because the rotating spokes sweep across dozens of pixels while the shutter is open. Meanwhile, the event camera's microsecond temporal resolution preserves sharp spatial edge contours without motion blur.`,
    }
  }

  return (
    <div
      className="card"
      style={{
        background: 'var(--color-bg-deep)',
        border: '1px solid var(--color-border)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-cyan)' }}>
          <Sparkles size={18} />
          <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
            What Are You Seeing? Live Educational Observations
          </h3>
        </div>
        <span
          className="badge"
          style={{
            background: 'rgba(6, 182, 212, 0.1)',
            color: 'var(--color-cyan)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            fontSize: '0.72rem',
          }}
        >
          Dynamic Physics Feedback
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Dynamic Speed Card */}
        <div
          style={{
            padding: '1rem',
            background: 'var(--color-bg-panel)',
            borderRadius: 8,
            borderLeft: `3px solid ${speedObservation.badgeColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {speedObservation.title}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: speedObservation.badgeColor,
                fontWeight: 600,
              }}
            >
              {speedObservation.badge}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
            {speedObservation.text}
          </p>
        </div>

        {/* Shutter & Sampling Observation Card */}
        <div
          style={{
            padding: '1rem',
            background: 'var(--color-bg-panel)',
            borderRadius: 8,
            borderLeft: '3px solid #818cf8',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Discrete Clocking & Exposure Blur
            </span>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#818cf8', fontWeight: 600 }}>
              {exposureDutyCycle}% Duty Cycle
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
            The frame camera integrates photons for {exposureMs.toFixed(1)} ms per {framePeriodMs.toFixed(1)} ms frame period ({fps} FPS).
            The remaining {blindIntervalMs.toFixed(1)} ms is a blind interval where scene motion cannot be observed.
            {exposureMs >= 20
              ? ' High exposure time increases photon collection but worsens motion smear.'
              : ' Shorter exposure reduces blur but leaves larger blind intervals.'}
          </p>
        </div>

        {/* Contrast Threshold Observation Card */}
        <div
          style={{
            padding: '1rem',
            background: 'var(--color-bg-panel)',
            borderRadius: 8,
            borderLeft: '3px solid var(--color-teal)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Contrast Threshold Sensitivity
            </span>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', fontWeight: 600 }}>
              C = ±{thresholdC.toFixed(2)}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Events fire only when local logarithmic intensity change satisfies <code style={{ color: 'var(--color-cyan)' }}>|Δln(I)| ≥ {thresholdC.toFixed(2)}</code>.
            {thresholdC <= 0.15
              ? ' Low threshold yields fine sensitivity and dense event tracking.'
              : ' Higher threshold suppresses subtle lighting transitions and noise, keeping output sparse.'}
          </p>
        </div>
      </div>

      {/* Core Question & Scientific Explanation Box */}
      <div
        style={{
          padding: '0.85rem 1rem',
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 8,
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <Info size={16} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-cyan)' }}>
            Why do the two camera outputs look completely different even though both observe the same scene?
          </strong>{' '}
          A <strong>frame-based camera</strong> captures snapshots of absolute intensity across all pixels at fixed clock intervals,
          recording static background and moving objects alike. Under ambient lighting of {illuminationLux.toLocaleString()} lux,
          the frame camera is bound by ~60 dB dynamic range (Slide 4). An <strong>event-based camera</strong> operates on asynchronous temporal
          contrast: each autonomous pixel reports only <em>relative changes in logarithmic luminance</em> with microsecond timestamps,
          completely eliminating static visual redundancy (Slides 2, 4, 8 & 9).
        </div>
      </div>
    </div>
  )
}

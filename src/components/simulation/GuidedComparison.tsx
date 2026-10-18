import { BookOpen, CheckCircle2, ShieldAlert } from 'lucide-react'

export default function GuidedComparison() {
  return (
    <div
      className="card"
      style={{
        background: 'var(--color-bg-deep)',
        border: '1px solid var(--color-border)',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-cyan)' }}>
        <BookOpen size={20} />
        <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
          Structured Scientific Comparison & Educational Model Assumptions
        </h3>
      </div>

      <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
        This comparative summary reconciles the modeled simulation behaviors with the foundational scientific principles
        detailed in the Canva presentation PDF (Slides 2, 4, 8, 9, 10, 17 & 26).
      </p>

      {/* Head-to-Head Comparison Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-panel)' }}>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-primary)' }}>Attribute</th>
              <th style={{ padding: '0.75rem 1rem', color: '#818cf8' }}>Frame-Based Camera (Slide 4)</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-cyan)' }}>Event-Based Camera (Slides 8, 9 & 17)</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                attr: 'What it Records',
                frame: 'Dense 2D matrix of absolute pixel intensities I(x, y)',
                event: 'Asynchronous Address-Event tuples e = (x, y, t, p)',
              },
              {
                attr: 'Temporal Sampling',
                frame: 'Fixed global clock ticks (e.g. 30–60 FPS, 16.7–33 ms intervals)',
                event: 'Continuous time with microsecond (µs) timestamp resolution',
              },
              {
                attr: 'Trigger Mechanism',
                frame: 'External clock pulse opens electronic shutter',
                event: 'Autonomous pixels fire when |Δln(I)| ≥ Contrast Threshold C',
              },
              {
                attr: 'Static Scene Response',
                frame: 'High redundancy: full images transmitted repeatedly',
                event: 'Temporal sparsity: zero events emitted when scene is motionless',
              },
              {
                attr: 'High-Speed Motion (>1000°/s)',
                frame: 'Severe shutter smear & motion blur (Slide 17 benchmark)',
                event: 'Sharp boundary contours preserved with microsecond latency',
              },
              {
                attr: 'Dynamic Range',
                frame: '~60 dB typical (photodiode full-well capacity saturation)',
                event: '>120 dB (logarithmic photoreceptor compression)',
              },
              {
                attr: 'Blind Interval',
                frame: 'Present between exposure windows: T_blind = 1/FPS - T_exp',
                event: 'None: pixels continuously monitor temporal contrast',
              },
            ].map((row, idx) => (
              <tr
                key={row.attr}
                style={{
                  borderBottom: '1px solid var(--color-border-subtle)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(10, 22, 40, 0.4)',
                }}
              >
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {row.attr}
                </td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {row.frame}
                </td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--color-cyan)', lineHeight: 1.5 }}>
                  {row.event}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Situational Analysis: Where Outputs Differ Significantly */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            padding: '1rem',
            background: 'var(--color-bg-panel)',
            borderRadius: 8,
            borderLeft: '3px solid var(--color-cyan)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-cyan)', fontWeight: 700, fontSize: '0.84rem' }}>
            <CheckCircle2 size={16} />
            <span>Where Event Cameras Excel</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <li>
              <strong>High-Speed Tracking (&gt;1000°/s):</strong> Preserves sharp edge features where conventional cameras blur (Slide 17).
            </li>
            <li>
              <strong>High Dynamic Range Scenes:</strong> Operates across direct glare and deep shadow without over/under-exposure saturation.
            </li>
            <li>
              <strong>Low-Bandwidth Quiescent Monitoring:</strong> Transmits zero motion packets when monitoring static scenes.
            </li>
            <li>
              <strong>Sub-Millisecond Latency:</strong> Immediate reaction times for high-speed robotic dodging and projectile tracking (Slide 19).
            </li>
          </ul>
        </div>

        <div
          style={{
            padding: '1rem',
            background: 'var(--color-bg-panel)',
            borderRadius: 8,
            borderLeft: '3px solid #818cf8',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8', fontWeight: 700, fontSize: '0.84rem' }}>
            <CheckCircle2 size={16} />
            <span>Where Frame Cameras Are Preferred</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <li>
              <strong>Static Color & Texture Reconstruction:</strong> Full-color, high-fidelity images of stationary scenes where event cameras are blind.
            </li>
            <li>
              <strong>Standard Computer Vision Pipelines:</strong> Traditional convolutional neural networks (CNNs) designed for uniform 2D grid tensors.
            </li>
            <li>
              <strong>Photometric Precision:</strong> Precise lux irradiance measurements without relying on cumulative edge integration.
            </li>
          </ul>
        </div>
      </div>

      {/* Model Assumptions & Educational Simplifications */}
      <div
        style={{
          padding: '1rem',
          background: 'rgba(234, 179, 8, 0.05)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#facc15', fontWeight: 700, fontSize: '0.84rem' }}>
          <ShieldAlert size={16} />
          <span>Educational Simulation Assumptions & Model Simplifications</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          To ensure real-time in-browser execution at 60 FPS without external hardware, this educational model incorporates the following defensible approximations:
        </p>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.76rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <li>
            <strong>Discrete Time Stepping:</strong> Continuous physical irradiance is sampled in discrete animation steps (Δt ≈ 16–33 ms). Sub-millisecond event timestamps are deterministically interpolated across threshold crossings within each step.
          </li>
          <li>
            <strong>Idealized Exposure Integration:</strong> Shutter motion blur is approximated by averaging scene irradiance across the open exposure duration, without modeling physical rolling shutter line delays.
          </li>
          <li>
            <strong>Noise Model:</strong> Hardware DVS silicon exhibits thermal junction noise and junction leak currents; this model implements deterministic contrast thresholding to highlight the fundamental temporal physics.
          </li>
        </ol>
      </div>
    </div>
  )
}

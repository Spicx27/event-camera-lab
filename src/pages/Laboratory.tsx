import { useEffect, useRef, useState } from 'react'
import { FlaskConical, Pause, Play, RefreshCw, Sliders } from 'lucide-react'

/* ── Types ───────────────────────────────────── */
interface LabEvent {
  x: number
  y: number
  polarity: 1 | -1
  t: number
}

interface SimParams {
  threshold:   number  // contrast threshold C
  noiseLevel:  number  // noise rate 0–1
  speed:       number  // pixel velocity multiplier
  running:     boolean
}

/* ── Canvas renderer ─────────────────────────── */
const CANVAS_W = 346
const CANVAS_H = 260
const MAX_EVENTS = 1200

function useEventSimulator(params: SimParams) {
  const [events, setEvents] = useState<LabEvent[]>([])
  const frameRef   = useRef<number | null>(null)
  const tRef       = useRef(0)
  const paramsRef  = useRef(params)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    function tick() {
      const { threshold, noiseLevel, speed, running } = paramsRef.current
      if (running) {
        tRef.current += 1
        const t = tRef.current

        const newEvents: LabEvent[] = []

        // Simulate a moving bright disk
        const cx = (CANVAS_W / 2) + Math.cos(t * speed * 0.02) * 100
        const cy = (CANVAS_H / 2) + Math.sin(t * speed * 0.015) * 70
        const r  = 28

        for (let i = 0; i < 18; i++) {
          const angle  = Math.random() * Math.PI * 2
          const radius = r + (Math.random() - 0.5) * 12
          const x = Math.round(cx + Math.cos(angle) * radius)
          const y = Math.round(cy + Math.sin(angle) * radius)
          if (x < 0 || x >= CANVAS_W || y < 0 || y >= CANVAS_H) continue

          const dL = (Math.random() - 0.5) * 2
          if (Math.abs(dL) < threshold) continue

          newEvents.push({ x, y, polarity: dL > 0 ? 1 : -1, t })
        }

        // Add noise events
        const noiseCount = Math.floor(noiseLevel * 8)
        for (let i = 0; i < noiseCount; i++) {
          newEvents.push({
            x: Math.floor(Math.random() * CANVAS_W),
            y: Math.floor(Math.random() * CANVAS_H),
            polarity: Math.random() > 0.5 ? 1 : -1,
            t,
          })
        }

        setEvents(prev => {
          const combined = [...prev, ...newEvents]
          return combined.length > MAX_EVENTS
            ? combined.slice(combined.length - MAX_EVENTS)
            : combined
        })
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const reset = () => {
    setEvents([])
    tRef.current = 0
  }

  return { events, reset }
}

/* ── Event canvas ────────────────────────────── */
function EventCanvas({ events }: { events: LabEvent[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    // Fade existing frame
    ctx.fillStyle = 'rgba(5, 13, 26, 0.18)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Draw new events only
    const recent = events.slice(-200)
    for (const ev of recent) {
      ctx.fillStyle =
        ev.polarity === 1
          ? 'rgba(6, 182, 212, 0.95)'   // cyan = positive (brighter)
          : 'rgba(239, 68, 68, 0.85)'   // red  = negative (darker)
      ctx.fillRect(ev.x, ev.y, 2, 2)
    }
  }, [events])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        width: '100%',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        background: 'var(--color-bg-deep)',
        display: 'block',
      }}
    />
  )
}

/* ── Slider control ──────────────────────────── */
interface SliderProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  unit: string
  onChange: (v: number) => void
}

function LabelledSlider({ label, min, max, step, value, unit, onChange }: SliderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span
          style={{
            fontSize: '0.78rem',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-cyan)',
          }}
        >
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--color-cyan)',
          cursor: 'pointer',
        }}
      />
    </div>
  )
}

/* ── Stats panel ─────────────────────────────── */
function StatsPanel({ events }: { events: LabEvent[] }) {
  const pos = events.filter(e => e.polarity === 1).length
  const neg = events.filter(e => e.polarity === -1).length

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
      }}
    >
      {[
        { label: 'Total Events', value: events.length, color: 'var(--color-text-primary)' },
        { label: 'ON  (+)', value: pos, color: 'var(--color-cyan)' },
        { label: 'OFF (−)', value: neg, color: '#ef4444' },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            padding: '0.75rem',
            background: 'var(--color-bg-deep)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 8,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color,
            }}
          >
            {value.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.2rem',
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Page ────────────────────────────────────── */
export default function LaboratoryPage() {
  const [params, setParams] = useState<SimParams>({
    threshold:  0.25,
    noiseLevel: 0.15,
    speed:      1.0,
    running:    true,
  })

  const { events, reset } = useEventSimulator(params)

  const set = <K extends keyof SimParams>(key: K, value: SimParams[K]) =>
    setParams(p => ({ ...p, [key]: value }))

  return (
    <>
      {/* Header */}
      <div
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(20,184,166,0.07) 0%, transparent 70%), var(--color-bg-deep)',
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '4rem 0 3rem',
        }}
      >
        <div className="container">
          <p className="section-label">Interactive</p>
          <h1 style={{ marginBottom: '1rem' }}>
            <FlaskConical
              size={28}
              style={{
                verticalAlign: 'middle',
                marginRight: '0.5rem',
                color: 'var(--color-teal)',
              }}
            />
            Event Camera Laboratory
          </h1>
          <p style={{ fontSize: '1.05rem', maxWidth: '60ch' }}>
            Watch a synthetic event stream generated in real time. Tune the contrast
            threshold, noise level, and motion speed to see how they affect the
            asynchronous event data.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 320px',
              gap: '2rem',
              alignItems: 'start',
            }}
          >
            {/* Left: canvas + stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Event Frame — {CANVAS_W}×{CANVAS_H} px
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-cyan)' }}>
                      ■ ON events
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>
                      ■ OFF events
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn--ghost"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={() => set('running', !params.running)}
                  >
                    {params.running ? <Pause size={14} /> : <Play size={14} />}
                    {params.running ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    className="btn btn--ghost"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={reset}
                  >
                    <RefreshCw size={14} />
                    Reset
                  </button>
                </div>
              </div>

              <EventCanvas events={events} />
              <StatsPanel events={events} />

              {/* Legend & Presentation Reference */}
              <p
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.6,
                  padding: '0.75rem 1rem',
                  background: 'var(--color-bg-deep)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 8,
                }}
              >
                <strong style={{ color: 'var(--color-cyan)' }}>Event Trigger Model (Slide 9):</strong> Each pixel fires an
                asynchronous event <code style={{ color: 'var(--color-cyan)' }}>e_k = (x_k, y_k, t_k, p_k)</code> whenever local logarithmic intensity changes
                satisfy <code style={{ color: 'var(--color-cyan)' }}>L(x, y, t_k) - L(x, y, t_last) = pC</code>.
                Cyan = positive polarity <code style={{ color: 'var(--color-cyan)' }}>p = +1 (ON / Brighter)</code>,
                Red = negative polarity <code style={{ color: '#ef4444' }}>p = -1 (OFF / Darker)</code>.
              </p>
            </div>

            {/* Right: controls */}
            <div
              className="card"
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={16} color="var(--color-cyan)" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Simulation Controls
                </span>
              </div>

              <LabelledSlider
                label="Contrast Threshold (C)"
                min={0.05}
                max={0.8}
                step={0.01}
                value={params.threshold}
                unit=""
                onChange={v => set('threshold', v)}
              />
              <LabelledSlider
                label="Noise Level"
                min={0}
                max={1}
                step={0.01}
                value={params.noiseLevel}
                unit=""
                onChange={v => set('noiseLevel', v)}
              />
              <LabelledSlider
                label="Motion Speed"
                min={0.2}
                max={3}
                step={0.1}
                value={params.speed}
                unit="×"
                onChange={v => set('speed', v)}
              />

              <div className="divider" />

              {/* Parameter info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  {
                    term: 'Low threshold',
                    desc: 'More events, higher bandwidth, more noise sensitivity',
                  },
                  {
                    term: 'High threshold',
                    desc: 'Fewer events, only strong edges and fast motion',
                  },
                  {
                    term: 'High speed',
                    desc: 'Denser event bursts along edges of moving objects',
                  },
                ].map(({ term, desc }) => (
                  <div
                    key={term}
                    style={{
                      padding: '0.6rem 0.75rem',
                      background: 'var(--color-bg-deep)',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--color-cyan)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      {term}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      {desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="divider" style={{ margin: '4rem 0 3rem' }} />

          {/* Planned 3D Simulations Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <span className="badge badge--cyan">Phase 2 Architecture</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Three.js + React Three Fiber
              </span>
            </div>
            <h2 className="section-title">Upcoming 3D Interactive Experiments</h2>
            <p className="section-subtitle">
              The laboratory architecture is prepared for two dedicated 3D interactive simulations designed to demonstrate biological vision analogies and asynchronous stream physics.
            </p>

            <div className="grid-2" style={{ gap: '1.5rem' }}>
              {/* Experiment 1 */}
              <div
                className="card"
                style={{
                  borderTop: '3px solid var(--color-cyan)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--color-cyan-glow)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-cyan)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    01
                  </div>
                  <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-cyan)', border: '1px solid rgba(6, 182, 212, 0.25)', fontSize: '0.7rem' }}>
                    Dual-Viewport 3D
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
                    Frame Shutter Smear vs. Continuous Event Tracking (Slides 4 & 17)
                  </h3>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 'none' }}>
                    A split-viewport 3D scene comparing how a 60 fps CMOS camera (limited by a 30 Hz Nyquist cutoff and exposure shutter blur) and a neuromorphic DVS sensor perceive high-speed motion (sharp spatial edges at velocities &gt;1000°/s) in real time.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>Planned Controls:</strong> Shutter speed (16.7 ms vs. 0.1 ms), target angular velocity (&gt;1000°/s), and ambient lux.
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>Key Demonstration:</strong> Exposure motion blur vs. continuous microsecond temporal tracking.
                  </div>
                </div>
              </div>

              {/* Experiment 2 */}
              <div
                className="card"
                style={{
                  borderTop: '3px solid var(--color-teal)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'rgba(20, 184, 166, 0.12)',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-teal)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    02
                  </div>
                  <span className="badge" style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--color-teal)', border: '1px solid rgba(20, 184, 166, 0.25)', fontSize: '0.7rem' }}>
                    Space-Time Manifold 3D
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
                    Space-Time Manifold: Rotating Dot Stimulus (Slide 10)
                  </h3>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 'none' }}>
                    A 3D space-time coordinate volume (x, y, t) showing a rotating dot on a disc (200 rev/sec over 5 ms) forming a continuous space-time helix, color-coded by polarity (+1 ON cyan / -1 OFF red) with timing precision equivalent to &gt;10,000 fps.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>Planned Controls:</strong> Time slice window Δt, disc rotational speed (rev/sec), and 3D orbit camera.
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>Key Demonstration:</strong> Discrete asynchronous event packets forming continuous spatiotemporal scene dynamics.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

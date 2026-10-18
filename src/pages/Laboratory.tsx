import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowRight, Box, FlaskConical, Layers, Pause, Play, RefreshCw, Sliders } from 'lucide-react'
import BiologicalVsEventSim from '@/components/simulation/BiologicalVsEventSim'
import EventStreamLab from '@/components/simulation/EventStreamLab'

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
  const [activeTab, setActiveTab] = useState<'3d-sim1' | '3d-sim2' | '2d-stream'>('3d-sim1')

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
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 70%), var(--color-bg-deep)',
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '3.5rem 0 2rem',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge--cyan">Interactive Photonics Testbench</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Deterministic DVS Physical Simulation
            </span>
          </div>
          <h1 style={{ marginBottom: '0.75rem' }}>
            <FlaskConical
              size={28}
              style={{
                verticalAlign: 'middle',
                marginRight: '0.5rem',
                color: 'var(--color-cyan)',
              }}
            />
            Event Camera Laboratory
          </h1>
          <p style={{ fontSize: '1rem', maxWidth: '65ch', marginBottom: '1.75rem' }}>
            Explore physical simulations comparing conventional frame-based exposure sampling
            with biologically inspired asynchronous temporal contrast sensing.
          </p>

          {/* Tab selector */}
          <div
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              background: 'rgba(10, 22, 40, 0.8)',
              padding: '0.35rem',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              gap: '0.4rem',
            }}
          >
            <button
              onClick={() => setActiveTab('3d-sim1')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: 7,
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: activeTab === '3d-sim1' ? 'var(--color-cyan)' : 'transparent',
                color: activeTab === '3d-sim1' ? '#050d1a' : 'var(--color-text-secondary)',
              }}
            >
              <Box size={16} />
              <span>Sim 1: Frame vs Event Camera</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: 4,
                  fontWeight: 700,
                  background: activeTab === '3d-sim1' ? '#050d1a' : 'rgba(6,182,212,0.18)',
                  color: activeTab === '3d-sim1' ? 'var(--color-cyan)' : 'var(--color-cyan)',
                }}
              >
                LIVE 3D
              </span>
            </button>

            <button
              onClick={() => setActiveTab('3d-sim2')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: 7,
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: activeTab === '3d-sim2' ? 'var(--color-cyan)' : 'transparent',
                color: activeTab === '3d-sim2' ? '#050d1a' : 'var(--color-text-secondary)',
              }}
            >
              <Activity size={16} />
              <span>Sim 2: 3D Event Stream & Data Lab</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: 4,
                  fontWeight: 700,
                  background: activeTab === '3d-sim2' ? '#050d1a' : 'rgba(6,182,212,0.18)',
                  color: activeTab === '3d-sim2' ? 'var(--color-cyan)' : 'var(--color-cyan)',
                }}
              >
                LIVE 3D
              </span>
            </button>

            <button
              onClick={() => setActiveTab('2d-stream')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: 7,
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: activeTab === '2d-stream' ? 'var(--color-bg-elevated)' : 'transparent',
                color: activeTab === '2d-stream' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              <Layers size={16} />
              <span>2D Stream Simulator</span>
            </button>
          </div>
        </div>
      </div>

      <section className="section" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          {activeTab === '3d-sim1' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
              <BiologicalVsEventSim />

              <div className="divider" />

              {/* Quick Switch Callout to Simulation 2 */}
              <div
                className="card"
                style={{
                  borderTop: '3px solid var(--color-cyan)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: 'rgba(6, 182, 212, 0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span className="badge badge--cyan">EXPERIMENT 2 READY</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Slide 10 Space-Time Manifold & AER Data Lab
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>
                      Inspect the Continuous 3D Space-Time Manifold (x, y, t)
                    </h3>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '70ch' }}>
                      Switch to Simulation 2 to see the rotating target unroll into a continuous 3D space-time double helix (Slide 10),
                      inspect individual microsecond AER packets, and export genuine research CSV &amp; JSON event datasets.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('3d-sim2')
                      window.scrollTo({ top: 380, behavior: 'smooth' })
                    }}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>Launch Simulation 2</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === '3d-sim2' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
              <EventStreamLab />
            </div>
          )}

          {activeTab === '2d-stream' && (
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
          )}
        </div>
      </section>
    </>
  )
}

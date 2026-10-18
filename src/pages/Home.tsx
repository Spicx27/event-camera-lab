import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Cpu,
  Eye,
  FlaskConical,
  LayoutPanelLeft,
  Zap,
} from 'lucide-react'

/* ── Hero section ───────────────────────────── */
function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '92vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 70%), var(--color-bg-deep)',
      }}
    >
      {/* Background grid */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--color-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.4,
        }}
      />

      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '2.5rem',
        }}
      >
        <div style={{ flex: '1 1 520px', maxWidth: '680px' }}>
          {/* Label */}
          <div
            className="badge badge--cyan animate-fade-in"
            style={{ marginBottom: '1.75rem' }}
          >
            <Activity size={11} />
            Bio-Inspired Optics, Imaging & Photonics
          </div>

          <h1
            className="animate-fade-in-up delay-100"
            style={{ marginBottom: '1.25rem' }}
          >
            Event-Based Cameras{' '}
            <span
              style={{
                background:
                  'linear-gradient(135deg, var(--color-cyan), var(--color-teal))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Inspired by the Human Eye
            </span>
          </h1>

          <p
            className="animate-fade-in-up delay-200"
            style={{
              fontSize: '1.15rem',
              lineHeight: 1.75,
              color: 'var(--color-text-secondary)',
              marginBottom: '2.5rem',
              maxWidth: '60ch',
            }}
          >
            An event-based camera (Dynamic Vision Sensor / silicon retina) is a neuromorphic
            sensor whose pixels independently and asynchronously respond to relative changes in brightness —
            achieving 0.2 µs–150 µs latency, ultra-high dynamic range (&gt;120–140 dB), and activity-driven sensing.
          </p>

          <div
            className="animate-fade-in-up delay-300"
            style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}
          >
            <Link to="/laboratory" className="btn btn--primary">
              <FlaskConical size={16} />
              Open Laboratory
              <ArrowRight size={14} />
            </Link>
            <Link to="/theory" className="btn btn--outline">
              <BookOpen size={16} />
              Learn the Science
            </Link>
          </div>
        </div>

        {/* Floating metric cards */}
        <div
          className="animate-fade-in delay-400"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            flex: '0 0 auto',
            minWidth: '240px',
          }}
        >
          {[
            { label: 'Clock / Latency',      value: '0.2–150 µs',   icon: <Zap size={16} /> },
            { label: 'Dynamic Range',        value: '>120–140 dB',  icon: <Eye size={16} /> },
            { label: 'Sensor Power Profile', value: '36 µW–80 mW',  icon: <Activity size={16} /> },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="card animate-pulse-glow"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--color-cyan-glow)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-cyan)',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--color-cyan)',
                    lineHeight: 1,
                    marginBottom: '0.2rem',
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background:
            'linear-gradient(to bottom, transparent, var(--color-bg-deep))',
        }}
      />
    </section>
  )
}

/* ── Quick-nav cards ─────────────────────────── */
interface QuickNavCard {
  to: string
  title: string
  description: string
  icon: React.ReactNode
  accent: string
}

const QUICK_NAV: QuickNavCard[] = [
  {
    to:          '/theory',
    title:       'Scientific Theory',
    description: 'Understand the neuromorphic principles behind event cameras — from retinal biology to silicon implementation.',
    icon:        <BookOpen size={22} />,
    accent:      'var(--color-cyan)',
  },
  {
    to:          '/laboratory',
    title:       'Interactive Laboratory',
    description: 'Generate synthetic events, tune thresholds, and visualise asynchronous data streams in real time.',
    icon:        <FlaskConical size={22} />,
    accent:      'var(--color-teal)',
  },
  {
    to:          '/comparison',
    title:       'Frame vs. Event',
    description: 'Side-by-side comparison of conventional frame-based cameras against event-based sensors.',
    icon:        <LayoutPanelLeft size={22} />,
    accent:      'var(--color-cyan)',
  },
  {
    to:          '/applications',
    title:       'Applications',
    description: 'Robotics, autonomous driving, AR/VR, high-speed tracking, and space — where event cameras excel.',
    icon:        <Cpu size={22} />,
    accent:      'var(--color-teal)',
  },
]

function QuickNav() {
  return (
    <section className="section" style={{ background: 'var(--color-bg-navy)' }}>
      <div className="container">
        <p className="section-label">Explore</p>
        <h2 className="section-title">What's Inside</h2>
        <p className="section-subtitle">
          Navigate the lab to discover the physics, the data, and the applications
          of bio-inspired vision sensors.
        </p>

        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {QUICK_NAV.map(({ to, title, description, icon, accent }) => (
            <Link
              key={to}
              to={to}
              className="card"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: `${accent}1a`,
                  border: `1px solid ${accent}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accent,
                  marginBottom: '1rem',
                }}
              >
                {icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 'none' }}>
                {description}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  marginTop: '1rem',
                  fontSize: '0.8rem',
                  color: accent,
                  fontWeight: 500,
                }}
              >
                Explore <ArrowRight size={13} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Key-facts strip ─────────────────────────── */
function KeyFacts() {
  const facts = [
    {
      stat: '0.2–150 µs',
      label: 'Clock & Latency',
      note: 'Microsecond timestamping (Slide 17, 31)',
    },
    {
      stat: '>120–140 dB',
      label: 'Dynamic Range',
      note: 'Logarithmic compression vs ~60 dB CMOS (Slide 17, 26)',
    },
    {
      stat: '36 µW–80 mW',
      label: 'Sensor Power Efficiency',
      note: '36 µW sleep to 3–80 mW active (Slide 17, 26)',
    },
    {
      stat: '10x–1,000x',
      label: 'Data Volume Reduction',
      note: 'Up to 99.9% data compression at source (Slide 17)',
    },
  ]

  return (
    <section
      className="section--sm"
      style={{
        background: 'var(--color-bg-deep)',
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
          }}
        >
          {facts.map(({ stat, label, note }) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 800,
                  background:
                    'linear-gradient(135deg, var(--color-cyan), var(--color-teal))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1,
                  marginBottom: '0.375rem',
                }}
              >
                {stat}
              </div>
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Project Objectives ──────────────────────── */
function ProjectObjectives() {
  const objectives = [
    {
      title: 'Biological Vision Foundations',
      desc: 'Analyze the human eye as an asynchronous continuous stream of electrochemical signals processed by rod and cone photoreceptors, bipolar cells, macula/fovea, and transient ganglion cells with logarithmic perception exceeding 5,000:1 (Slides 5 & 6).',
    },
    {
      title: 'Biomimicry & Silicon DVS Architecture',
      desc: 'Abstract the mammalian retina into 3D-stacked CMOS silicon using front-end logarithmic conversion (>120–140 dB DR), dual comparators (DIFF_ON, DIFF_OFF), and independent analog pixel circuits emitting sparse spike events (Slides 8, 9, 16).',
    },
    {
      title: 'Quantitative Performance Benchmarking',
      desc: 'Benchmark event sensors against 30–60 Hz conventional frame CMOS across shutter smear, 30 Hz Nyquist limits, activity-driven data compression (up to 99.9%), and milliwatt power scaling (Slides 4, 17, 26, 28).',
    },
    {
      title: 'Real-World Applications & Edge AI',
      desc: 'Explore proven deployments across high-speed drone dodging (Falanga 2020), automotive ADAS under tunnel glare (DSEC), non-contact vibration mapping, biomedical microfluidics, XR eye tracking (GenX320), and space tracking (Slides 19–24, 29).',
    },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-deep)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Academic Scope</p>
        <h2 className="section-title">Project Objectives</h2>
        <p className="section-subtitle">
          Bridging biological vision and neuromorphic engineering through quantitative analysis, scientific theory, and interactive real-time simulations.
        </p>

        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {objectives.map((obj, i) => (
            <div key={obj.title} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--color-cyan-glow)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-cyan)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                }}
              >
                0{i + 1}
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>{obj.title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 'none' }}>{obj.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Page ────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <Hero />
      <KeyFacts />
      <ProjectObjectives />
      <QuickNav />
    </>
  )
}

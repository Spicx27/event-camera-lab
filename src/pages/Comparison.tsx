import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Layers,
  Zap,
} from 'lucide-react'

/* ── Page Header ─────────────────────────────── */
function PageHeader() {
  return (
    <div
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 70%), var(--color-bg-deep)',
        borderBottom: '1px solid var(--color-border-subtle)',
        padding: '4rem 0 3rem',
      }}
    >
      <div className="container">
        <p className="section-label">Quantitative Analysis (Slides 17, 26, 28)</p>
        <h1 style={{ marginBottom: '1rem' }}>Event-Based Cameras vs. Frame Cameras</h1>
        <p style={{ fontSize: '1.1rem', maxWidth: '65ch', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Direct technical comparison, verified sensor generation specifications, and critical pros and cons
          benchmarked between conventional CMOS cameras and neuromorphic event sensors.
        </p>
      </div>
    </div>
  )
}

/* ── 1. Key Features Comparison Table (Slide 17) ── */
interface FeatureRow {
  feature:   string
  event:     string
  frame:     string
  advantage: string
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    feature:   'Timing and Latency',
    event:     'Event cameras achieve 0.2 µs – 1 µs to 150 µs internal clock resolution',
    frame:     'A 60 fps camera gets 16.6 ms frame resolution while high speed cameras go till 0.1 ms',
    advantage: 'Sub-millisecond tracking of transient ballistic events without stroboscopic effects or frame gaps.',
  },
  {
    feature:   'Dynamic Range & Motion Blur',
    event:     'Event sensors reach >120 dB to >140 dB without exposure motion blur.',
    frame:     '~60 dB to 72 dB and severe shutter smear in standard frame cameras',
    advantage: 'Immune to direct solar washouts, tunnel exits, and headlamp glare.',
  },
  {
    feature:   'Data Volume & Bandwidth',
    event:     'Scene-dependent sparse output achieves a 10x to 1,000x reduction in raw data volume.',
    frame:     'Dense frame streaming.',
    advantage: 'Up to 99.9% data compression at source and scales bandwidth dynamically with scene activity.',
  },
  {
    feature:   'Sensor Power Efficiency',
    event:     'Bare event sensor dies consume 36 µW (sleep) to 3–80 mW (active), peaking around 150 mW.',
    frame:     '~1.5–4.5 W for conventional camera modules. Going up to 40 W in peak conditions.',
    advantage: '10x to 100x longer battery life for micro-UAVs, smart glasses, and IoT edge nodes.',
  },
  {
    feature:   'Visual Comparison',
    event:     'Continuous DVS event stream.',
    frame:     'High-speed Photron 7.5 kHz frames',
    advantage: 'Feature corners and spatial edges stay sharp at velocities >1000°/s.',
  },
]

function KeyFeaturesTable() {
  return (
    <section className="section" style={{ background: 'var(--color-bg-navy)' }}>
      <div className="container">
        <p className="section-label">Slide 17 Matrix</p>
        <h2 className="section-title">Event-Based Cameras v/s Frame Cameras</h2>
        <p className="section-subtitle">
          Direct comparison of key operational features and their practical system advantages.
        </p>

        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-bg-panel)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
            <thead>
              <tr style={{ background: 'rgba(6,182,212,0.1)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--color-cyan)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Features</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--color-cyan)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Based Camera</th>
                <th style={{ padding: '1rem 1.25rem', color: '#818cf8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frame Based Camera</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--color-teal)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Practical Advantage</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, idx) => (
                <tr
                  key={row.feature}
                  style={{
                    borderBottom: idx < FEATURE_ROWS.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <td style={{ padding: '1.15rem 1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                    {row.feature}
                  </td>
                  <td style={{ padding: '1.15rem 1.25rem', color: 'var(--color-text-primary)', fontSize: '0.84rem', lineHeight: 1.6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <CheckCircle2 size={15} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                      <span>{row.event}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.15rem 1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.84rem', lineHeight: 1.6 }}>
                    {row.frame}
                  </td>
                  <td style={{ padding: '1.15rem 1.25rem', color: 'var(--color-teal)', fontSize: '0.84rem', lineHeight: 1.6, fontWeight: 500 }}>
                    {row.advantage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ── 2. Sensor Generations Baseline (Slide 26) ── */
interface SensorGen {
  title:        string
  subtitle:     string
  specs:        string[]
  tag:          string
  color:        string
}

const SENSOR_GENERATIONS: SensorGen[] = [
  {
    title:    'INI DVS128 (2008) & DAVIS240 (2014)',
    subtitle: 'Early Neuromorphic Silicon Retinas',
    tag:      'Foundational Hardware',
    color:    'var(--color-cyan)',
    specs: [
      'DVS128 (128 × 128) achieves 15 µs latency',
      '3 kHz bright bandwidth & 120 dB dynamic range',
      '~24 mW sensor power consumption',
      'Hybrid DAVIS240 (240 × 180) reaches 3 µs latency and 130 dB DR',
    ],
  },
  {
    title:    'Sony-Prophesee IMX636 (2020–2026 HD)',
    subtitle: 'Industrial High-Definition Stacked Sensor',
    tag:      'HD Commercial Sensor',
    color:    'var(--color-teal)',
    specs: [
      '1280 × 720 resolution with 4.86 µm stacked pixels',
      '<100 µs latency at 1,000 lux illumination',
      '>120 dB dynamic range (80 mlux – 100 klux)',
      '80 mW active sensor power (2.2 mW standby)',
    ],
  },
  {
    title:    'Prophesee GenX320 (2025 Embedded)',
    subtitle: 'Ultra-Low-Power Edge & XR Sensor',
    tag:      'Ultra-Low-Power Edge',
    color:    '#38bdf8',
    specs: [
      '320 × 320 resolution with 6.3 µm pixels',
      '1 µs timestamping precision (<150 µs latency at 1,000 lux)',
      '>140 dB dynamic range (10 mlux – 100 klux)',
      '36 µW sleep power and 3 mW active power',
    ],
  },
  {
    title:    'Standard 60 fps Frame Camera Baseline',
    subtitle: 'Conventional Synchronous CMOS Module',
    tag:      'Conventional Baseline',
    color:    '#818cf8',
    specs: [
      'VGA to multi-megapixel (3.45 µm typical pixel pitch)',
      '16.7 ms frame interval (30 Hz Nyquist motion limit)',
      '~60 dB dynamic range (up to 72 dB)',
      '~1 W typical camera module power (~1.5–4.5 W typical, up to 40 W peak)',
    ],
  },
]

function SensorGenerationsSection() {
  return (
    <section className="section" style={{ background: 'var(--color-bg-deep)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Hardware Specifications (Slide 26)</p>
        <h2 className="section-title">Quantitative Technical & Performance Comparison</h2>
        <p className="section-subtitle">
          Verified specifications across sensor generations vs. conventional frame CMOS cameras.
        </p>

        <div className="grid-2" style={{ gap: '1.5rem' }}>
          {SENSOR_GENERATIONS.map(gen => (
            <div
              key={gen.title}
              className="card"
              style={{
                borderTop: `3px solid ${gen.color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge" style={{ background: `${gen.color}15`, color: gen.color, border: `1px solid ${gen.color}40`, fontSize: '0.7rem' }}>
                  {gen.tag}
                </span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem', color: 'var(--color-text-primary)' }}>{gen.title}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{gen.subtitle}</div>
              </div>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.835rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {gen.specs.map((spec, i) => (
                  <li key={i}>{spec}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 3. Pros & Cons Evaluation (Slide 28) ────── */
interface ProsConsRow {
  feature: string
  pro:     string
  con:     string
}

const PROS_CONS: ProsConsRow[] = [
  {
    feature: 'Temporal Resolution',
    pro:     'Microsecond timestamp precision which captures dynamics >10,000 FPS equivalent.',
    con:     'System processing bottlenecks can negate sensor-level speed.',
  },
  {
    feature: 'Motion Blur',
    pro:     'Edges of fast-moving objects remain sharp instead of blurring out.',
    con:     'Extreme low light can cause photodiode lag, reintroducing temporal smearing.',
  },
  {
    feature: 'Data Efficiency',
    pro:     '>90% data reduction in sparse, static scenes.',
    con:     '"Event storms" in highly textured, moving scenes can exceed standard video bandwidth.',
  },
  {
    feature: 'Dynamic Range',
    pro:     '>120–140 dB; sees into shadows and bright sun simultaneously.',
    con:     'Contrast sensitivity drops near absolute darkness.',
  },
  {
    feature: 'Power Consumption',
    pro:     'Extremely low power (~3–80 mW) in static/sparse environments.',
    con:     'Power draw scales linearly with scene activity (event rate).',
  },
  {
    feature: 'Spatial / Static Vision',
    pro:     'N/A (Specialized for dynamic temporal change)',
    con:     'Blind to static scenes or low spatial resolution (~1 MP).',
  },
  {
    feature: 'Software Ecosystem',
    pro:     'Enables ultra-fast Spiking Neural Networks (SNNs).',
    con:     'Incompatible with standard Convolutional Neural Networks (CNNs) without formatting overhead.',
  },
]

function ProsAndConsSection() {
  return (
    <section className="section" style={{ background: 'var(--color-bg-navy)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Critical Evaluation (Slide 28)</p>
        <h2 className="section-title">Pros & Cons of Event-Based Vision</h2>
        <p className="section-subtitle">
          Objective assessment of strengths and constraints across seven key operational dimensions.
        </p>

        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-bg-panel)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--color-text-primary)', fontSize: '0.85rem', width: '22%' }}>Key Features</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--color-cyan)', fontSize: '0.85rem', width: '39%' }}>Pros</th>
                <th style={{ padding: '1rem 1.25rem', color: '#f59e0b', fontSize: '0.85rem', width: '39%' }}>Cons</th>
              </tr>
            </thead>
            <tbody>
              {PROS_CONS.map((row, idx) => (
                <tr
                  key={row.feature}
                  style={{
                    borderBottom: idx < PROS_CONS.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <td style={{ padding: '1.1rem 1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
                    {row.feature}
                  </td>
                  <td style={{ padding: '1.1rem 1.25rem', color: 'var(--color-text-primary)', fontSize: '0.835rem', lineHeight: 1.6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <CheckCircle2 size={15} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                      <span>{row.pro}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.1rem 1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.835rem', lineHeight: 1.6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <AlertCircle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                      <span>{row.con}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ── 4. Illumination Scaling & Power States (Slide 27) ── */
function IlluminationAndEcosystem() {
  return (
    <section className="section" style={{ background: 'var(--color-bg-deep)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Slide 27 Assessment</p>
        <h2 className="section-title">Illumination Scaling, Power States, & Competing Tech</h2>
        <p className="section-subtitle">
          How illumination scaling and system packaging govern real-world neuromorphic deployments.
        </p>

        <div className="grid-3" style={{ gap: '1.25rem' }}>
          <div className="card" style={{ borderLeft: '3px solid var(--color-cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-cyan)' }}>
              <Zap size={18} />
              <h3 style={{ fontSize: '0.98rem', margin: 0 }}>Low-Power Footprint</h3>
            </div>
            <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 'none' }}>
              Consumes minimal power (&lt;10 mW) due to event-driven activation, preventing wasteful dissipation on static scenes.
            </p>
          </div>

          <div className="card" style={{ borderLeft: '3px solid var(--color-teal)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-teal)' }}>
              <Eye size={18} />
              <h3 style={{ fontSize: '0.98rem', margin: 0 }}>Adaptability Across Lighting</h3>
            </div>
            <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 'none' }}>
              Adapts dynamically to extreme light-to-dark transitions without requiring manual exposure or gain adjustments.
            </p>
          </div>

          <div className="card" style={{ borderLeft: '3px solid #818cf8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#818cf8' }}>
              <Layers size={18} />
              <h3 style={{ fontSize: '0.98rem', margin: 0 }}>Prophesee Product Ecosystem</h3>
            </div>
            <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 'none' }}>
              Built around core commercial products: Embra HD exploration kit, Mantra (defense/drone tracking), and Nexara (industrial automation).
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Page Component ──────────────────────────── */
export default function ComparisonPage() {
  return (
    <>
      <PageHeader />
      <KeyFeaturesTable />
      <SensorGenerationsSection />
      <ProsAndConsSection />
      <IlluminationAndEcosystem />
    </>
  )
}

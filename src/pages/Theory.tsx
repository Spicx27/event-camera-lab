import {
  Activity,
  AlertTriangle,
  Atom,
  BookOpen,
  Brain,
  Cpu,
  Eye,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react'

/* ── Page Header ─────────────────────────────── */
function PageHeader({
  label,
  title,
  subtitle,
}: {
  label: string
  title: string
  subtitle: string
}) {
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
        <p className="section-label">{label}</p>
        <h1 style={{ marginBottom: '1rem' }}>{title}</h1>
        <p style={{ fontSize: '1.1rem', maxWidth: '65ch', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

/* ── 1. Biological Foundations (Slides 5 & 6) ─ */
function BiologicalFoundations() {
  const retinalParts = [
    {
      title: 'Photoreceptor Cells (Rods & Cones)',
      desc: 'Rods are responsible for vision in low-light and peripheral fields; cones are responsible for colour and fine detail in high light. Vision is a constant flow of data where rods and cones reset asynchronously, avoiding global shutter delays.',
      badge: 'Sensory Input',
    },
    {
      title: 'Bipolar Cells',
      desc: 'Responsible for transmitting electrochemical signals from photoreceptor rods and cones across the retinal layers to the ganglion cells.',
      badge: 'Signal Transmission',
    },
    {
      title: 'Ganglion Cells & Optic Nerve',
      desc: 'The final layer of cells in the retina. Ganglion cells convert retinal processing into discrete action potentials and send the visual information to the brain via the optic nerve.',
      badge: 'Action Potentials',
    },
    {
      title: 'Macula & Fovea',
      desc: 'The macula is the central retina responsible for sharpest detailed vision (reading, facial recognition) with a high quantity of cones. The fovea is the central macula with the highest cone density for resolving fine details.',
      badge: 'High Acuity Center',
    },
  ]

  const biologicalPrinciples = [
    {
      title: 'Continuous Signal Processing',
      desc: 'The human eye functions as an asynchronous, continuous stream of electrochemical signals rather than grouped frames.',
    },
    {
      title: 'Logarithmic Perception (>5,000:1)',
      desc: 'The brain perceives brightness logarithmically, enabling mapping of illumination ranges exceeding 5,000:1 by responding to relative changes rather than absolute linear values.',
    },
    {
      title: 'Peripheral Sensitivity & Motion',
      desc: 'The periphery, dominated by rods, features a higher flicker fusion threshold and faster response time than the foveal cone center, optimizing rapid motion detection.',
    },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-navy)' }}>
      <div className="container">
        <p className="section-label">Biological Foundation (Slides 5 & 6)</p>
        <h2 className="section-title">The Human Eye & Retinal Processing</h2>
        <p className="section-subtitle">
          How the biological retina converts light into continuous electrochemical nerve signals across specialized cell layers.
        </p>

        {/* 3 Principles */}
        <div className="grid-3" style={{ gap: '1.25rem', marginBottom: '2.5rem' }}>
          {biologicalPrinciples.map(p => (
            <div key={p.title} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--color-cyan)' }}>
                <Eye size={18} />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>{p.title}</h3>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--color-text-secondary)', maxWidth: 'none' }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 4 Retinal parts */}
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: 'var(--color-text-primary)' }}>
          Four Main Parts of the Biological Retina
        </h3>
        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {retinalParts.map(part => (
            <div key={part.title} className="card" style={{ borderLeft: '3px solid var(--color-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>{part.title}</h4>
                <span className="badge badge--cyan" style={{ fontSize: '0.68rem' }}>{part.badge}</span>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--color-text-secondary)', maxWidth: 'none' }}>
                {part.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 2. Biomimicry: Retina vs Silicon DVS (Slide 8) ── */
function BiomimicrySection() {
  const biomimicryPillars = [
    {
      title: 'Logarithmic Compression',
      biology: 'Biological photoreceptors compress incoming light logarithmically.',
      silicon: 'DVS pixels apply front-end logarithmic conversion, enabling >120 dB to 140 dB dynamic range without saturation.',
      icon: <Atom size={20} />,
    },
    {
      title: 'ON / OFF Polarity Channels',
      biology: 'Transient ON and OFF retinal ganglion cells fire sparse spike trains.',
      silicon: 'Dual pixel comparators (DIFF_ON, DIFF_OFF) directly emulate transient ON/OFF ganglion pathways.',
      icon: <Zap size={20} />,
    },
    {
      title: 'Pixel Independence',
      biology: 'Biological retina includes lateral centre-surround coupling via horizontal and amacrine cells.',
      silicon: 'Every DVS pixel is strictly independent in the analog array, lacking lateral coupling to maximize speed.',
      icon: <Layers size={20} />,
    },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-deep)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Biomimicry (Slide 8)</p>
        <h2 className="section-title">Biological Retina vs. Silicon DVS</h2>
        <p className="section-subtitle">
          Biomimicry is the practice of making technological and industrial design copy naturally refined processes.
          Here, we abstract the human retina’s core computational strengths into silicon circuitry.
        </p>

        <div className="grid-3" style={{ gap: '1.5rem' }}>
          {biomimicryPillars.map(col => (
            <div key={col.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'var(--color-cyan-glow)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-cyan)',
                }}
              >
                {col.icon}
              </div>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{col.title}</h3>

              <div style={{ padding: '0.75rem', background: 'var(--color-bg-navy)', borderRadius: 8, border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                  Biological Retina
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {col.biology}
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(6,182,212,0.06)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-cyan)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                  Silicon DVS Circuitry
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                  {col.silicon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 3. Conventional Frame Cameras & Limits (Slide 4) ── */
function FrameCameraLimits() {
  const limitations = [
    {
      title: 'Fixed Snapshot Intervals (16.7 ms at 60 fps)',
      desc: 'Consumer cameras (30–60 Hz) and specialized high-speed industrial cameras (up to 5,000 Hz) capture discrete static snapshots at uniform time intervals, leaving blind intervals between consecutive frames.',
    },
    {
      title: 'Single Exposure Limitation',
      desc: 'Because every pixel shares the exact same exposure window, scenes with deep shadows and bright highlights suffer from photodiode saturation in bright areas and severe underexposure in dark regions.',
    },
    {
      title: 'Limited Dynamic Range (~60 dB)',
      desc: 'Standard frame-based sensors are restricted to roughly 60 dB of dynamic range (a 1,000:1 linear light ratio), up to 72 dB in select sensors.',
    },
    {
      title: '30 Hz Nyquist Limit & Rapid Motion Aliasing',
      desc: 'A 60 fps camera has a 30 Hz Nyquist limit, causing severe temporal aliasing, stroboscopic effects, and motion blur when observing high-frequency vibrations or fast projectiles.',
    },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-navy)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">The Conventional Paradigm (Slide 4)</p>
        <h2 className="section-title">How Conventional Frame-Based Cameras Work</h2>
        <p className="section-subtitle">
          The physical and temporal bottlenecks of clock-driven, global-exposure image sensors.
        </p>

        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {limitations.map(lim => (
            <div key={lim.title} className="card" style={{ borderLeft: '3px solid #6366f1' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>{lim.title}</h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--color-text-secondary)', maxWidth: 'none' }}>
                {lim.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 4. Mathematics & Event Generation (Slide 9 & 10) ── */
function EventModelSection() {
  const mathItems = [
    {
      label: 'Logarithmic Brightness',
      formula: 'L(x, y, t) = ln I(x, y, t)',
      desc: 'Local light intensity I is converted to logarithmic intensity L, providing illumination invariance and wide dynamic range.',
    },
    {
      label: 'Contrast Threshold Condition',
      formula: 'L(x, y, t_k) - L(x, y, t_last) = pC',
      desc: 'An event is generated immediately when the change in log-intensity reaches the contrast threshold C.',
    },
    {
      label: 'Digital Event Tuple',
      formula: 'e_k = (x_k, y_k, t_k, p_k)',
      desc: 'Contains four critical data points: coordinates (x, y), microsecond timestamp t_k, and polarity p_k.',
    },
    {
      label: 'Parameter Definitions',
      formula: 'p = +1 (ON / Brighter)  |  p = -1 (OFF / Darker)',
      desc: 'Where I = light intensity, L = log intensity, C = contrast threshold, and t_last = time of previous event at that pixel.',
    },
  ]

  const streamPrinciples = [
    {
      title: 'Asynchronous Time-Domain Output',
      desc: 'Streams consist of discrete, asynchronous event packets rather than continuous, synchronous frames (Slide 10).',
    },
    {
      title: 'Pixel-Level Independence',
      desc: 'Every pixel operates independently, firing data packets only when a local brightness change occurs (Slide 10).',
    },
    {
      title: 'Microsecond Temporal Resolution',
      desc: 'Captures precise timing data equivalent to >10,000 fps performance without blind intervals (Slide 10).',
    },
    {
      title: 'Rotating Dot Stimulus (Slide 10)',
      desc: 'A rotating dot on a disc (200 rev/sec disc over 5 ms) demonstrates spatiotemporal representation of scene dynamics as a continuous space-time helix in (X, Y, Time).',
    },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-deep)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Mathematical Principles (Slides 9 & 10)</p>
        <h2 className="section-title">How An Event-Based Camera Works</h2>
        <p className="section-subtitle">
          The process and mathematics governing asynchronous event generation, Address-Event Representation, and space-time dynamics.
        </p>

        {/* 2-column: Math on left, Stream on right */}
        <div className="grid-2" style={{ gap: '2rem', alignItems: 'start', marginBottom: '3rem' }}>
          {/* Math Panel */}
          <div
            style={{
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '1.75rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)' }}>
              2. Mathematics Behind Event Generation (Slide 9)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mathItems.map(item => (
                <div
                  key={item.label}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'var(--color-bg-deep)',
                    borderRadius: 8,
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                    {item.label}
                  </div>
                  <div style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    {item.formula}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stream & Process Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ borderLeft: '3px solid var(--color-teal)' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-teal)', marginBottom: '0.75rem' }}>
                1. The Process Behind Event Generation (Slide 9)
              </h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--color-text-secondary)', maxWidth: 'none', marginBottom: '0.75rem' }}>
                Whenever a change occurs, the pixel outputs an <strong>"event"</strong>, either ON or OFF, containing four critical data points:
              </p>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--color-text-primary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li><strong>-X, Y:</strong> Horizontal and vertical pixel coordinates.</li>
                <li><strong>-T:</strong> Precise timestamp in microseconds.</li>
                <li><strong>-P (Polarity):</strong> Whether light intensity increased (ON) or decreased (OFF).</li>
              </ul>
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(20,184,166,0.08)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--color-teal)', fontFamily: 'var(--font-mono)' }}>
                Unchanged areas generate no events, reducing redundant visual data.
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                Understanding the Event Stream (Slide 10)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {streamPrinciples.map(sp => (
                  <div key={sp.title}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{sp.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.1rem', lineHeight: 1.5 }}>{sp.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slide 11: Processing & Interpreting */}
        <div className="card" style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
            Slide 11: From Sparse Tuples to Deep Learning & Neuromorphic AI
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Processing and Interpreting Event Streams</h3>
          <div className="grid-3" style={{ gap: '1.25rem' }}>
            {[
              {
                title: 'Application Intelligence (Hearth)',
                desc: 'Built-in algorithms and AI components turn raw asynchronous event streams into actionable semantic data.',
                icon: <Brain size={18} />,
              },
              {
                title: 'Reduced Computational Load',
                desc: 'Because redundant background data is naturally filtered out at the sensor level, downstream processors handle significantly smaller data loads.',
                icon: <Activity size={18} />,
              },
              {
                title: 'Advanced Tracking & Measurement',
                desc: 'Facilitates real-time detection, tracking, and monitoring of high-speed transient anomalies without heavy computational framing loops.',
                icon: <Sparkles size={18} />,
              },
            ].map(col => (
              <div key={col.title} style={{ padding: '1rem', background: 'var(--color-bg-deep)', borderRadius: 8, border: '1px solid var(--color-border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--color-cyan)' }}>
                  {col.icon}
                  <h4 style={{ fontSize: '0.9rem', margin: 0 }}>{col.title}</h4>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, maxWidth: 'none' }}>
                  {col.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 5. Hardware Architecture & Ecosystem (Slide 16 & 27) ── */
function HardwareSection() {
  const hardwarePoints = [
    {
      title: 'Independent Pixel Design',
      desc: 'Each pixel operates autonomously, containing its own local illumination monitoring and level-crossing detector circuits.',
      icon: <Cpu size={20} />,
    },
    {
      title: 'Patented Pixel Architecture',
      desc: 'Advanced silicon-level sensing design that optimizes high-speed photon collection alongside micro-watt power scaling.',
      icon: <Layers size={20} />,
    },
    {
      title: 'Embedded AI & Processing Integration',
      desc: 'Integrates seamlessly with edge processing modules and software development kits for real-time interpretation.',
      icon: <Brain size={20} />,
    },
    {
      title: 'Prophesee Product Ecosystem (Slide 27)',
      desc: 'Built around core commercial hardware: Embra HD exploration kit, Mantra (defense/drone tracking), and Nexara (industrial automation).',
      icon: <Activity size={20} />,
    },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-navy)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Silicon Architecture (Slides 16 & 27)</p>
        <h2 className="section-title">Event-Camera Hardware and Architecture</h2>
        <p className="section-subtitle">
          Modern event sensors combine 3D-stacked analog pixel arrays with asynchronous digital arbitration and hardware noise filtering.
        </p>

        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {hardwarePoints.map(p => (
            <div key={p.title} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
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
                {p.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{p.title}</h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', maxWidth: 'none', margin: 0 }}>
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 6. Origins and Discovery Timeline (Slides 13, 14, 15) ── */
const TIMELINE = [
  {
    year: '1988',
    title: 'Caltech Silicon Retina (Misha Mahowald & Carver Mead)',
    desc: 'Built the first three-layer Kuffler retina on a CMOS chip using logarithmic photoreceptors and the Address-Event Representation (AER) protocol (Slide 13).',
  },
  {
    year: '2002',
    title: 'First Asynchronous Time-Based Image Sensor',
    desc: 'Tobi Delbrück and Patrick Lichtsteiner at the Institute of Neuroinformatics (INI, University of Zurich and ETH Zurich) began developing the architecture that led to the modern Dynamic Vision Sensor (DVS) (Slide 13).',
  },
  {
    year: '2008',
    title: 'The DVS128 Breakthrough',
    desc: 'Patrick Lichtsteiner, Christoph Posch, and Tobi Delbruck at ETH Zurich / UZH introduced self-timed switched-capacitor differencing, achieving 120 dB dynamic range and 15 µs latency (Slide 13).',
  },
  {
    year: '2011',
    title: 'Event-Based Algorithm Paradigm',
    desc: 'Researchers developed new mathematical tools tailored for event streams, including Time Surfaces, Event-Based Hough Transforms, and asynchronous clustering for tracking high-speed objects (Slide 14).',
  },
  {
    year: '2015',
    title: 'Integration with Spiking Neural Networks (SNNs)',
    desc: 'As neuromorphic hardware (like IBM’s TrueNorth and Intel’s Loihi) emerged, researchers bridged event-based cameras with SNNs, achieving ultra-low-power, bio-realistic pattern recognition and gesture classification (Slide 14).',
  },
  {
    year: '2017',
    title: 'DAVIS and ATIS Commercialization',
    desc: 'Sensors combining standard active-pixel frames (APS) with asynchronous event-based streams (DAVIS - Dynamic and Active-pixel Vision Sensor) became widely available to researchers, bridging traditional and event-based vision (Slide 14).',
  },
  {
    year: '2021–23',
    title: 'Hybrid Transformers & Deep Learning for Events',
    desc: 'The field moved toward deep learning architectures adapted for event data, including event-based transformers and conversion of CNNs to SNNs (Slide 15).',
  },
  {
    year: '2024',
    title: 'Commercialization in Consumer & Automotive Sectors',
    desc: 'Event sensors started seeing integration into consumer technologies like smartphones, AR/VR headsets, and automotive ADAS for high-speed emergency braking scenarios (Slide 15).',
  },
  {
    year: 'Present Day',
    title: 'Critical Pillar of Edge AI & Neuromorphic Engineering',
    desc: 'Current research focuses on unifying asynchronous event streams with standard RGB frames, scaling up Spiking Neural Network accelerators, and achieving sub-millisecond perception in extreme lighting conditions (Slide 15).',
  },
]

function HistoryTimeline() {
  return (
    <section className="section" style={{ background: 'var(--color-bg-deep)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <p className="section-label">Origins and Discovery (Slides 13, 14, 15)</p>
        <h2 className="section-title">Timeline: Pioneers of Event-Based Vision</h2>
        <p className="section-subtitle">
          From the foundational Caltech silicon retina to modern deep learning transformers and edge SNN accelerators.
        </p>

        <div style={{ position: 'relative', paddingLeft: '2rem', maxWidth: '850px' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: 2,
              background: 'linear-gradient(to bottom, var(--color-cyan), var(--color-teal), rgba(6,182,212,0.2))',
              borderRadius: 1,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {TIMELINE.map(({ year, title, desc }) => (
              <div key={year} style={{ position: 'relative' }}>
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: '-2rem',
                    top: '0.25rem',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--color-bg-deep)',
                    border: '3px solid var(--color-cyan)',
                    boxShadow: '0 0 10px rgba(6,182,212,0.6)',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-cyan)',
                      fontWeight: 700,
                      background: 'rgba(6,182,212,0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 4,
                      border: '1px solid rgba(6,182,212,0.3)',
                    }}
                  >
                    {year}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {title}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 7. Barriers & Future (Slides 29, 30, 31) ── */
function FutureAndBarriers() {
  const barriers = [
    {
      title: '3D-Stacked Wafer Manufacturing Cost',
      desc: 'Bonding back-illuminated photodiodes to per-pixel CMOS analog comparators increases fabrication complexity compared to commodity smartphone sensors.',
    },
    {
      title: 'Software & Deep Learning Ecosystem Gap',
      desc: 'Mainstream computer vision libraries and GPU pipelines are optimized for dense synchronous grids rather than sparse (x, y, t, p) tuples.',
    },
    {
      title: 'High-Event-Rate Bus Saturation',
      desc: 'Under extreme full-frame texture motion or unmitigated lighting flicker, event rates can saturate readout buses (requiring MIPI CSI-2 compression and hardware AFK/STC tuning).',
    },
    {
      title: 'Benchmark Standardization',
      desc: 'Because performance varies with lux, bias tuning, and motion speed, standardized datasets (DSEC, ECCV 2026 SEE Challenge) are essential for fair evaluation.',
    },
  ]

  const futureTrends = [
    {
      title: 'Hybrid In-Pixel & Multi-Sensor Fusion (2025–2026)',
      desc: 'Combining global-shutter frames and events (from DAVIS240 to 2026 DAPEVO and EventHub frameworks) merges static RGB texture with microsecond motion (Slide 29).',
    },
    {
      title: 'Sub-30 µs Neuromorphic Processors',
      desc: 'The 2026 ETHEREAL Event-Driven Graph Neural Network chip achieves 25.6 µs inference latency at 1.6–1.7 µJ/event on VGA workloads—a 10x to 1,000x leap (Slide 29).',
    },
    {
      title: 'Embodied Humanoid & Space Perception',
      desc: 'Fusing event sensors with SPAD single-photon sensors and foundation models unlocks low-power vision for humanoid teleoperation and deep-space landers (Slide 29).',
    },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-navy)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        {/* Future */}
        <p className="section-label">Future Outlook (Slide 29)</p>
        <h2 className="section-title">Future of Event-Based Vision</h2>
        <p className="section-subtitle">
          Hybrid Multimodal Sensors & Neuromorphic Edge Processors (2025–2026).
        </p>

        <div className="grid-3" style={{ gap: '1.25rem', marginBottom: '3.5rem' }}>
          {futureTrends.map(f => (
            <div key={f.title} className="card" style={{ borderTop: '3px solid var(--color-teal)' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.825rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', maxWidth: 'none', margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Barriers */}
        <p className="section-label">Engineering Challenges (Slide 30)</p>
        <h2 className="section-title">Barriers to Mainstream Adoption</h2>
        <p className="section-subtitle">
          Engineering & ecosystem challenges to overcome with 3D-stacked wafer technology.
        </p>

        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {barriers.map(b => (
            <div key={b.title} className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: '#f59e0b' }}>
                <AlertTriangle size={16} />
                <h3 style={{ fontSize: '0.98rem', margin: 0, color: 'var(--color-text-primary)' }}>{b.title}</h3>
              </div>
              <p style={{ fontSize: '0.825rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', maxWidth: 'none', margin: 0 }}>
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Conclusion summary box (Slide 31) */}
        <div
          className="card"
          style={{
            marginTop: '3rem',
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(20,184,166,0.04))',
            border: '1px solid var(--color-cyan)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Presentation Conclusion (Slide 31)
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Complementary Sensing Partners</h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text-primary)', maxWidth: 'none', marginBottom: '0.5rem' }}>
            By abstracting the mammalian retina's logarithmic photoreceptor adaptation and transient ON/OFF ganglion pathways into CMOS silicon,
            event cameras replace synchronous frames with continuous-time change detection.
          </p>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text-secondary)', maxWidth: 'none', margin: 0 }}>
            Event cameras are complementary partners to conventional RGB cameras—transformative whenever applications demand microsecond reaction times
            (3–150 µs), extreme dynamic range (&gt;120–140 dB), motion-blur immunity, and milliwatt edge efficiency (36 µW–80 mW).
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── 8. References (Slide 32) ─────────────────── */
function ReferencesSection() {
  const references = [
    { authors: 'G. Gallego et al.', title: 'Event-Based Vision: A Survey', venue: 'IEEE TPAMI, Vol. 44, No. 1, pp. 154–180, 2022' },
    { authors: 'P. Lichtsteiner, C. Posch, & T. Delbruck', title: 'A 128×128 120 dB 15 µs Latency Asynchronous Temporal Contrast Vision Sensor', venue: 'IEEE JSSC, Vol. 43, No. 2, 2008 (DVS128)' },
    { authors: 'C. Brandli et al.', title: 'A 240×180 130 dB 3 µs Latency Global Shutter Spatiotemporal Vision Sensor', venue: 'IEEE JSSC, 2014 (DAVIS240)' },
    { authors: 'T. Finateu et al.', title: 'A 1280×720 Back-Illuminated Stacked Temporal Contrast Event-Based Vision Sensor with 4.86µm Pixels', venue: 'IEEE ISSCC, 2020 (IMX636)' },
    { authors: 'Prophesee S.A.', title: 'GENX320 Product Brief & Event-Based Vision Sensors', venue: 'Technical Specification, 2025' },
    { authors: 'CenturyArks', title: 'SilkyEvCam Specification Sheet', venue: 'Product Documentation, 2026' },
    { authors: 'D. Falanga, K. Kleber, & D. Scaramuzza', title: 'Dynamic obstacle avoidance for quadrotors with event cameras', venue: 'Science Robotics, Vol. 5, eaaz9712, 2020' },
    { authors: 'B. Forrai et al.', title: 'Event-based Agile Object Catching with a Quadrupedal Robot', venue: 'IEEE ICRA, 2023 (ANYmal)' },
    { authors: 'M. Gehrig et al.', title: 'DSEC: A Stereo Event Camera Dataset for Driving Scenarios', venue: 'IEEE RA-L, 2021' },
    { authors: 'A. Kneip et al.', title: 'ETHEREAL 25.6 µs Event-Driven Graph Neural Network Processor', venue: 'ESSERC, 2026' },
    { authors: 'L. Gandolfi et al. & L. Bartolomei et al.', title: 'DAPEVO (2026) & EventHub: Multi-Sensor Visual Odometry', venue: 'CVPR 2026' },
    { authors: 'ESA & Western Sydney University ICNS', title: 'ESA Eventful Landings Project & Astrosite Neuromorphic Telescope', venue: 'Space Situational Awareness Reports' },
  ]

  return (
    <section className="section" style={{ background: 'var(--color-bg-deep)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <BookOpen size={18} color="var(--color-cyan)" />
          <p className="section-label" style={{ margin: 0 }}>Authoritative Bibliography (Slide 32)</p>
        </div>
        <h2 className="section-title">References & Research Sources</h2>
        <p className="section-subtitle">
          Published papers, technical specifications, and laboratory benchmarks cited in the presentation.
        </p>

        <div className="grid-2" style={{ gap: '1rem' }}>
          {references.map((ref, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.85rem 1rem',
                background: 'var(--color-bg-panel)',
                borderRadius: 8,
                border: '1px solid var(--color-border-subtle)',
                fontSize: '0.825rem',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--color-cyan)', marginBottom: '0.2rem' }}>
                {ref.authors}
              </div>
              <div style={{ color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                "{ref.title}"
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                {ref.venue}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Page Component ──────────────────────────── */
export default function TheoryPage() {
  return (
    <>
      <PageHeader
        label="Scientific Theory"
        title="Event-Based Cameras Inspired by the Human Eye"
        subtitle="How neuromorphic silicon sensors abstract the human retina's asynchronous electrochemical pathways into high-speed, wide dynamic range CMOS architectures (Slides 2–16, 27–32)."
      />
      <BiologicalFoundations />
      <BiomimicrySection />
      <FrameCameraLimits />
      <EventModelSection />
      <HardwareSection />
      <HistoryTimeline />
      <FutureAndBarriers />
      <ReferencesSection />
    </>
  )
}

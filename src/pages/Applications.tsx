import { useState } from 'react'
import {
  Bot,
  Camera,
  Car,
  Factory,
  Globe,
  HeartPulse,
} from 'lucide-react'

/* ── Types & Data ────────────────────────────── */
interface Callout {
  heading: string
  body:    string
}

interface ApplicationDomain {
  id:          string
  title:       string
  slideNum:    string
  subtitle:    string
  category:    string
  icon:        React.ReactNode
  accent:      string
  callouts:    Callout[]
}

const DOMAINS: ApplicationDomain[] = [
  {
    id:       'robotics',
    title:    'Robotics and Autonomous Navigation',
    slideNum: 'Slide 19',
    subtitle: 'High-Speed Obstacle Avoidance & Projectile Catching',
    category: 'Robotics',
    icon:     <Bot size={22} />,
    accent:   'var(--color-cyan)',
    callouts: [
      {
        heading: 'Callout 1 — Quadrotor Dodgeball (Science Robotics 2020)',
        body:    'Using onboard stereo event cameras and spatiotemporal clustering, Falanga et al. achieved 3.5 ms perception latency, dodging balls thrown at 10 m/s where 30–60 fps cameras (>30 ms latency) fail.',
      },
      {
        heading: 'Callout 2 — Bio-Inspired UAV Flight (2025–2026)',
        body:    'Ganglionic center-surround models cut UAV avoidance latency to 2.3 ms at 10 m/s (NeurIPS 2025), while the OmniRisk framework (2026) dodges obstacles at 15 m/s.',
      },
      {
        heading: 'Callout 3 — Legged Robot Ball Catching (ICRA 2023)',
        body:    'Forrai et al. deployed an event camera on an ANYmal quadrupedal robot to track and catch fast airborne projectiles despite walking vibration.',
      },
    ],
  },
  {
    id:       'automotive',
    title:    'Automotive Technology and Driver Assistance',
    slideNum: 'Slide 20',
    subtitle: 'High-Speed Hazard Detection in Extreme Lighting',
    category: 'Automotive',
    icon:     <Car size={22} />,
    accent:   'var(--color-teal)',
    callouts: [
      {
        heading: 'Tunnel Exits & Night Glare',
        body:    'Vehicles encountering blinding sunlight at tunnel exits or oncoming headlights at night face >100 dB illumination ratios that saturate or underexpose standard RGB cameras.',
      },
      {
        heading: 'DSEC Stereo Driving Benchmark',
        body:    'Gehrig et al. (IEEE RA-L 2021) demonstrated on the DSEC dataset that event streams preserve pedestrian and road boundaries lost in standard frames.',
      },
      {
        heading: '5,000 Hz Latency at 45 Hz Bandwidth',
        body:    'Fusing a 20 Hz RGB camera with an event camera matches the obstacle-detection latency of a 5,000 Hz high-speed camera at the data bandwidth of a 45 Hz camera.',
      },
    ],
  },
  {
    id:       'industrial',
    title:    'Industrial Automation & Quality Inspection',
    slideNum: 'Slide 21',
    subtitle: 'Non-Contact Vibration Monitoring & High-Speed Inspection',
    category: 'Industrial',
    icon:     <Factory size={22} />,
    accent:   '#38bdf8',
    callouts: [
      {
        heading: 'Full-Field Vibration Mapping',
        body:    'DVS systems measure machinery vibration frequencies from 1 Hz into the kHz range across every pixel simultaneously with 1-pixel spatial accuracy.',
      },
      {
        heading: 'High-Speed Counting & Spatter Tracking',
        body:    'Microsecond timestamping enables blur-free monitoring of fast bottling lines, laser welding spatter, and sorting chutes without high-wattage strobe lights.',
      },
      {
        heading: 'Event-Guided Motion Deblurring',
        body:    'Subtracting the double integral of the event stream from a blurred RGB frame (Pan et al., CVPR 2019) improves dynamic visual reconstruction by >50%.',
      },
    ],
  },
  {
    id:       'healthcare',
    title:    'Healthcare, Biomedical Imaging, and Edge Research',
    slideNum: 'Slide 22',
    subtitle: 'Experimental Instrumentation vs. Clinical Deployment',
    category: 'Healthcare & Edge',
    icon:     <HeartPulse size={22} />,
    accent:   '#f472b6',
    callouts: [
      {
        heading: 'High-Speed Microfluidic Velocimetry',
        body:    'Tracks rapid particle flow in laboratory microfluidic channels at microsecond resolution without terabytes of high-speed video storage or intense lighting that damages biological samples.',
      },
      {
        heading: 'GPU-Free Posture & Fall Monitoring (2026)',
        body:    'Timestamp-recency encoding (Ts = 100 ms) achieves 90.8% accuracy and an 11x speed-up for smart-home human posture recognition on edge CPUs.',
      },
      {
        heading: 'Privacy-Preserving Edge Sensing',
        body:    'Because raw event streams capture moving edge contours rather than recognizable static facial textures, they support privacy-conscious patient monitoring in experimental care settings.',
      },
    ],
  },
  {
    id:       'xr',
    title:    'Virtual Reality, Augmented Reality, & HCI',
    slideNum: 'Slide 23',
    subtitle: 'Extended Reality (XR) headsets demand kilohertz eye and hand tracking within strict milliwatt battery envelopes',
    category: 'AR / VR & HCI',
    icon:     <Camera size={22} />,
    accent:   '#818cf8',
    callouts: [
      {
        heading: '1,000 Hz Wearable Eye Tracking at 20 mW',
        body:    'Powered by the Prophesee GenX320, the 7invensun XR module tracks rapid saccadic eye movements at 1,000 Hz (1 ms updates) within a 20 mW total system power budget.',
      },
      {
        heading: '30x Lower Bandwidth 3D Motion Capture',
        body:    'Event-based 3D human motion capture at 1,000 Hz operates with 30x less data bandwidth than high-speed frame-based cameras.',
      },
      {
        heading: 'Sub-Millisecond Gesture Control',
        body:    'Pixel latency below 150 µs enables near-zero-lag finger and hand gesture interfaces for interactive AR glasses.',
      },
    ],
  },
  {
    id:       'aerospace',
    title:    'Aerospace, Security, and Space Situational Awareness',
    slideNum: 'Slide 24',
    subtitle: 'Space Situational Awareness & Planetary Landing',
    category: 'Aerospace & Space',
    icon:     <Globe size={22} />,
    accent:   '#facc15',
    callouts: [
      {
        heading: 'The Astrosite Neuromorphic Telescope',
        body:    "Western Sydney University's ICNS built Astrosite, a mobile neuromorphic observatory that tracks satellites and orbital debris across both daytime and nighttime skies.",
      },
      {
        heading: 'International Space Station (ISS) Deployment',
        body:    'Event sensors aboard the ISS monitor orbital debris and high-speed atmospheric phenomena under extreme solar glare without saturating.',
      },
      {
        heading: 'ESA Eventful Landings Project',
        body:    'The European Space Agency (ESA) utilizes event-based optical flow for autonomous spacecraft hazard avoidance during lunar and Martian descent.',
      },
    ],
  },
]

const CATEGORIES = ['All', ...DOMAINS.map(d => d.category)]

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
        <p className="section-label">Real-World Applications (Slides 18–24)</p>
        <h1 style={{ marginBottom: '1rem' }}>Real-World Applications of Event Vision</h1>
        <p style={{ fontSize: '1.1rem', maxWidth: '65ch', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Six authoritative application domains directly from the presentation deck, featuring verified laboratory
          benchmarks, aerospace deployments, and commercial edge implementations.
        </p>
      </div>
    </div>
  )
}

/* ── Page Component ──────────────────────────── */
export default function ApplicationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredDomains =
    selectedCategory === 'All'
      ? DOMAINS
      : DOMAINS.filter(d => d.category === selectedCategory)

  return (
    <>
      <PageHeader />

      <section className="section" style={{ background: 'var(--color-bg-deep)' }}>
        <div className="container">
          {/* Category Filter */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem',
            }}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn ${selectedCategory === cat ? 'btn--primary' : 'btn--outline'}`}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: 6,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Application Domain Cards Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {filteredDomains.map(domain => (
              <div
                key={domain.id}
                className="card"
                style={{
                  borderTop: `3px solid ${domain.accent}`,
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: `${domain.accent}15`,
                        border: `1px solid ${domain.accent}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: domain.accent,
                        flexShrink: 0,
                      }}
                    >
                      {domain.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: domain.accent, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {domain.slideNum} · {domain.category}
                      </div>
                      <h2 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: 'var(--color-text-primary)' }}>
                        {domain.title}
                      </h2>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500, fontStyle: 'italic' }}>
                  "{domain.subtitle}"
                </div>

                {/* 3 Callouts */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.25rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {domain.callouts.map((callout, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '1.15rem',
                        background: 'var(--color-bg-navy)',
                        borderRadius: 8,
                        border: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-cyan)', lineHeight: 1.4 }}>
                        {callout.heading}
                      </div>
                      <p style={{ fontSize: '0.825rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 'none' }}>
                        {callout.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

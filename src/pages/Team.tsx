import { ExternalLink, GitFork, Globe, Mail } from 'lucide-react'

/* ── Team data ───────────────────────────────── */
interface TeamMember {
  name:          string
  role:          string
  focus:         string
  contributions: string
  initials:      string
  color:         string
  photoUrl?:     string
  links?: {
    github?:   string
    linkedin?: string
    email?:    string
    website?:  string
  }
}

const TEAM: TeamMember[] = [
  {
    name:          'Anuran Kar',
    role:          'Author (C237)',
    focus:         'Neuromorphic Architecture & Signal Processing',
    contributions: 'Co-authored the research on biological retinal foundations, biomimicry vs. silicon DVS, and quantitative event-sensing benchmarks.',
    initials:      'AK',
    color:         'var(--color-cyan)',
  },
  {
    name:          'Diti Prajapati',
    role:          'Author (C268)',
    focus:         'Biological Foundations & Real-World Applications',
    contributions: 'Co-authored the analysis of human retinal pathways (macula, fovea, rods/cones), automotive ADAS, and healthcare edge sensing.',
    initials:      'DP',
    color:         'var(--color-teal)',
  },
  {
    name:          'Krishiv Sonpal',
    role:          'Author (C270) & Lead Engineer',
    focus:         'System Engineering & Interactive Laboratory',
    contributions: 'Co-authored the research slides and engineered the EventVision Lab platform, real-time 2D event simulator, and comparison matrices.',
    initials:      'KS',
    color:         '#818cf8',
  },
]

/* ── Advisor ─────────────────────────────────── */
const ADVISOR = {
  name:  '[Pravin Patil]',
  role:  ' ',
  dept:  ' ',
  note:  ' ',
}

/* ── Member card ─────────────────────────────── */
function MemberCard({ member }: { member: TeamMember }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Avatar / Photo Slot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `${member.color}20`,
            border: `2px solid ${member.color}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: member.color,
            flexShrink: 0,
            letterSpacing: '-0.02em',
            overflow: 'hidden',
          }}
          title="Photo slot (editable)"
        >
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            member.initials
          )}
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--color-text-primary)',
              marginBottom: '0.15rem',
            }}
          >
            {member.name}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: member.color,
              fontWeight: 600,
            }}
          >
            {member.role}
          </div>
        </div>
      </div>

      {/* Focus tag */}
      <div
        style={{
          display: 'inline-flex',
          padding: '0.3rem 0.75rem',
          background: `${member.color}12`,
          border: `1px solid ${member.color}30`,
          borderRadius: 6,
          fontSize: '0.72rem',
          color: member.color,
          fontFamily: 'var(--font-mono)',
          alignSelf: 'flex-start',
        }}
      >
        {member.focus}
      </div>

      {/* Contributions */}
      <div>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>
          Contributions
        </div>
        <p
          style={{
            fontSize: '0.845rem',
            lineHeight: 1.65,
            maxWidth: 'none',
          }}
        >
          {member.contributions}
        </p>
      </div>

      {/* Links */}
      {member.links && (
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {member.links.github && (
            <a
              href={member.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <GitFork size={13} />
              GitHub
            </a>
          )}
          {member.links.linkedin && (
            <a
              href={member.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <ExternalLink size={13} />
              LinkedIn
            </a>
          )}
          {member.links.website && (
            <a
              href={member.links.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <Globe size={13} />
              Website
            </a>
          )}
          {member.links.email && (
            <a
              href={member.links.email}
              className="btn btn--ghost"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <Mail size={13} />
              Email
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────── */
export default function TeamPage() {
  return (
    <>
      <div
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%), var(--color-bg-deep)',
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '4rem 0 3rem',
        }}
      >
        <div className="container">
          <p className="section-label">The People</p>
          <h1 style={{ marginBottom: '1rem' }}>Our Team & Supervision</h1>
          <p style={{ fontSize: '1.05rem', maxWidth: '60ch' }}>
            A multidisciplinary university engineering team bringing together bio-inspired vision theory,
            neuromorphic hardware models, and interactive simulation engineering.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {/* Editable registry notice */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '2.5rem',
              borderLeft: '3px solid var(--color-cyan)',
              background: 'rgba(6, 182, 212, 0.04)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--color-cyan)' }}>Institutional Registry Notice:</strong> Team member placeholders, formal photographs, and faculty advisor details can be updated directly in <code>src/pages/Team.tsx</code> before academic evaluation and final presentation submission.
            </div>
          </div>

          {/* Team grid */}
          <div className="grid-2" style={{ marginBottom: '4rem' }}>
            {TEAM.map(member => (
              <MemberCard key={member.name} member={member} />
            ))}
          </div>

          {/* Advisor */}
          <div className="divider" />
          <div style={{ marginTop: '2.5rem' }}>
            <p className="section-label">Supervision</p>
            <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>
              Faculty
            </h2>
            <div
              style={{
                background: 'var(--color-bg-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '1.75rem',
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: 'rgba(250, 204, 21, 0.15)',
                  border: '2px solid rgba(250, 204, 21, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#facc15',
                  flexShrink: 0,
                }}
              >
                Dr.
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.2rem',
                  }}
                >
                  {ADVISOR.name}
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#facc15',
                    fontWeight: 600,
                    marginBottom: '0.15rem',
                  }}
                >
                  {ADVISOR.role}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: '0.75rem',
                  }}
                >
                  {ADVISOR.dept}
                </div>
                <p
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.7,
                    maxWidth: '60ch',
                  }}
                >
                  {ADVISOR.note}
                </p>
              </div>
            </div>
          </div>

          {/* Project info */}
          <div
            style={{
              marginTop: '3rem',
              padding: '1.5rem 1.75rem',
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[
              { label: 'Project',       value: 'EventVision Lab' },
              { label: 'Subject/Dept',  value: 'Elements of Biology' },
              { label: 'Institution',   value: 'NMIMS MPSTME' },
              { label: 'Academic Year', value: '2026 – 2027' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '0.25rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

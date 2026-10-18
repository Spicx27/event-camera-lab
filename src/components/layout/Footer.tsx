import { NavLink } from 'react-router-dom'
import { Activity, GitFork } from 'lucide-react'

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-navy)',
        padding: '2.5rem 1.5rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, var(--color-cyan-dim), var(--color-teal))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={14} color="#fff" />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              EventVision Lab
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Bio-Inspired Optics, Imaging & Photonics · 2025–2026
            </div>
          </div>
        </div>

        {/* Links */}
        <nav
          style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
          aria-label="Footer navigation"
        >
          {[
            { to: '/theory',       label: 'Theory' },
            { to: '/laboratory',   label: 'Laboratory' },
            { to: '/comparison',   label: 'Comparison' },
            { to: '/applications', label: 'Applications' },
            { to: '/team',         label: 'Team' },
            { to: '/presentation', label: 'Presentation' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={e =>
                ((e.target as HTMLAnchorElement).style.color =
                  'var(--color-text-secondary)')
              }
              onMouseLeave={e =>
                ((e.target as HTMLAnchorElement).style.color =
                  'var(--color-text-muted)')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* GitHub */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={e =>
            ((e.currentTarget as HTMLAnchorElement).style.color =
              'var(--color-cyan)')
          }
          onMouseLeave={e =>
            ((e.currentTarget as HTMLAnchorElement).style.color =
              'var(--color-text-muted)')
          }
        >
          <GitFork size={14} />
          Source Code
        </a>
      </div>
    </footer>
  )
}

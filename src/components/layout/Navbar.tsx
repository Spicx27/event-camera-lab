import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Cpu,
  Eye,
  FlaskConical,
  LayoutPanelLeft,
  Menu,
  Presentation,
  Users,
  X,
} from 'lucide-react'
import '@/styles/nav.css'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',             label: 'Home',         icon: <Eye size={14} /> },
  { to: '/theory',       label: 'Theory',       icon: <BookOpen size={14} /> },
  { to: '/laboratory',   label: 'Laboratory',   icon: <FlaskConical size={14} /> },
  { to: '/comparison',   label: 'Comparison',   icon: <LayoutPanelLeft size={14} /> },
  { to: '/applications', label: 'Applications', icon: <Cpu size={14} /> },
  { to: '/team',         label: 'Team',         icon: <Users size={14} /> },
  { to: '/presentation', label: 'Slides',       icon: <Presentation size={14} /> },
]

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close drawer on route change / resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 900) setDrawerOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`} aria-label="Main navigation">
        <div className="nav__inner">
          {/* Logo */}
          <NavLink to="/" className="nav__logo" onClick={() => setDrawerOpen(false)}>
            <div className="nav__logo-icon">
              <Activity size={16} color="#ffffff" />
            </div>
            <div className="nav__logo-text">
              <span className="nav__logo-title">EventVision Lab</span>
              <span className="nav__logo-sub">Event-Based Cameras</span>
            </div>
          </NavLink>

          {/* Desktop links */}
          <ul className="nav__links" role="list">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `nav__link${isActive ? ' active' : ''}`
                  }
                >
                  {icon}
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Mobile toggle */}
          <button
            className="nav__toggle"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(v => !v)}
          >
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`nav__drawer${drawerOpen ? ' nav__drawer--open' : ''}`}
        aria-hidden={!drawerOpen}
      >
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav__drawer-link${isActive ? ' active' : ''}`
            }
            onClick={() => setDrawerOpen(false)}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </div>
    </>
  )
}

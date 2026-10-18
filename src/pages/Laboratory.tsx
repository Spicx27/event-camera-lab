import { useState } from 'react'
import { Activity, ArrowRight, Box, FlaskConical } from 'lucide-react'
import BiologicalVsEventSim from '@/components/simulation/BiologicalVsEventSim'
import EventStreamLab from '@/components/simulation/EventStreamLab'

/* ── Page ────────────────────────────────────── */
export default function LaboratoryPage() {
  const [activeTab, setActiveTab] = useState<'3d-sim1' | '3d-sim2'>('3d-sim1')

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
              <span>Sim 2: 3D Event Stream &amp; Data Lab</span>
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
                        Slide 10 Space-Time Manifold &amp; AER Data Lab
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>
                      Inspect the Continuous 3D Space-Time Manifold (x, y, t)
                    </h3>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '70ch' }}>
                      Switch to Simulation 2 to see the orbiting target unroll into a continuous 3D space-time double helix (Slide 10),
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
        </div>
      </section>
    </>
  )
}

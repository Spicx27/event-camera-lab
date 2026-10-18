import { ExternalLink, Info, Presentation } from 'lucide-react'

/* ── Primary Reference: Canva Presentation Links ── */
const CANVA_LINK = 'https://canva.link/zjykk8rg7l9fboy'
// Canva's embed endpoint resolved from the design token (avoids X-Frame-Options: deny on raw shortlink):
const CANVA_EMBED_URL = 'https://www.canva.com/design/DAHYPd2ElS4/XaswVM8lHpJs_67_AfJwag/view?embed'

export default function PresentationPage() {
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
          <p className="section-label">Presentation</p>
          <h1 style={{ marginBottom: '1rem' }}>
            <Presentation
              size={28}
              style={{
                verticalAlign: 'middle',
                marginRight: '0.5rem',
                color: 'var(--color-cyan)',
              }}
            />
            Project Presentation Slides
          </h1>
          <p style={{ fontSize: '1.05rem', maxWidth: '62ch' }}>
            Authoritative presentation slides for{' '}
            <em>EventVision Lab — Event-Based Cameras Inspired by the Human Eye</em>.
            View the slide deck below or launch the presentation directly in Canva.
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href={CANVA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              <ExternalLink size={15} />
              Open Presentation in Canva
            </a>
            <a
              href="/canva-presentation.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--outline"
            >
              <ExternalLink size={15} />
              View Exported Slides PDF
            </a>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {/* Canva Viewport */}
          <div
            style={{
              position: 'relative',
              paddingTop: '56.25%',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--color-bg-panel)',
              boxShadow: 'var(--shadow-card)',
              marginBottom: '2rem',
            }}
          >
            <iframe
              src={CANVA_EMBED_URL}
              title="EventVision Lab Canva Presentation"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allowFullScreen
              loading="lazy"
            />
          </div>

          {/* Embed Notice & Direct Access Fallback */}
          <div
            className="card"
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
              borderLeft: '3px solid var(--color-cyan)',
              background: 'var(--color-bg-card)',
            }}
          >
            <Info size={20} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
                Viewing Notice & Embed Permissions
              </h4>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 'none', color: 'var(--color-text-secondary)' }}>
                If your browser blocks the embedded frame above (due to Canva cross-origin security headers, cookie consent, or login restrictions),
                you can launch the presentation directly via{' '}
                <a
                  href={CANVA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-cyan)', textDecoration: 'underline' }}
                >
                  {CANVA_LINK}
                </a>{' '}
                or view the high-resolution exported slides directly at{' '}
                <a
                  href="/canva-presentation.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-cyan)', textDecoration: 'underline' }}
                >
                  /canva-presentation.pdf
                </a>.
              </p>
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--color-border-subtle)',
                  fontSize: '0.78rem',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Tip: To embed without login prompts in Canva: click Share → More → Embed, copy the HTML embed link, and update CANVA_URL.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

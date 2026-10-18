import { Link } from 'react-router-dom'
import { AlertTriangle, Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        <AlertTriangle
          size={52}
          color="var(--color-text-muted)"
          style={{ marginBottom: '1.5rem' }}
        />
        <div
          style={{
            fontSize: '5rem',
            fontWeight: 800,
            lineHeight: 1,
            background: 'linear-gradient(135deg, var(--color-cyan), var(--color-teal))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.75rem',
          }}
        >
          404
        </div>
        <h2 style={{ marginBottom: '0.75rem' }}>Page Not Found</h2>
        <p style={{ marginBottom: '2rem' }}>
          This route doesn't exist in the EventVision Lab. The page may have moved
          or you followed a broken link.
        </p>
        <Link to="/" className="btn btn--primary">
          <Home size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  )
}

import { Activity, Clock, Cpu, Gauge, Sun, Zap } from 'lucide-react'
import type { EventEngineStats } from '@/sim/eventEngine'
import type { FrameEngineStats } from '@/sim/frameEngine'

interface SimulationMetricsProps {
  eventStats: EventEngineStats
  frameStats: FrameEngineStats
  resolution: number
  illuminationLux: number
  thresholdC: number
}

export default function SimulationMetrics({
  eventStats,
  frameStats,
  resolution,
  illuminationLux,
  thresholdC,
}: SimulationMetricsProps) {
  const elapsedMs = Math.round(eventStats.simulatedTimeUs / 1000)
  const totalPixels = resolution * resolution

  // Raw data estimation:
  // Frame camera sends W*H bytes per frame (at 8-bit mono):
  const frameBytesPerSec = totalPixels * frameStats.currentFps
  // Event camera sends 4-5 bytes per event tuple (x, y, t, p):
  const eventBytesPerSec = eventStats.eventRatePerSec * 4
  const compressionRatio = frameBytesPerSec > 0 && eventBytesPerSec > 0
    ? (frameBytesPerSec / eventBytesPerSec).toFixed(1)
    : 'N/A'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.875rem',
      }}
    >
      {/* 1. Total Events */}
      <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid var(--color-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-cyan)', marginBottom: '0.2rem' }}>
          <Zap size={14} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Events Generated</span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {eventStats.totalEvents.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          ON (+1): <span style={{ color: 'rgb(220, 220, 220)', fontWeight: 600 }}>{eventStats.onEvents.toLocaleString()}</span> &nbsp;|&nbsp;
          OFF (-1): <span style={{ color: 'rgb(150, 150, 150)', fontWeight: 600 }}>{eventStats.offEvents.toLocaleString()}</span>
        </div>
      </div>

      {/* 2. Event Rate */}
      <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid var(--color-teal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-teal)', marginBottom: '0.2rem' }}>
          <Activity size={14} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Event Rate</span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {eventStats.eventRatePerSec.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>ev/s</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          Activity-driven bandwidth (Slide 2)
        </div>
      </div>

      {/* 3. Frame Count */}
      <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid #818cf8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#818cf8', marginBottom: '0.2rem' }}>
          <Gauge size={14} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Captured Frames</span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {frameStats.frameCount.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          {frameStats.currentFps} Hz ({((1000 / frameStats.currentFps)).toFixed(1)} ms intervals)
        </div>
      </div>

      {/* 4. Elapsed Simulation Time */}
      <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid #facc15' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#facc15', marginBottom: '0.2rem' }}>
          <Clock size={14} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Simulated Time</span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {(elapsedMs / 1000).toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>sec</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          {eventStats.simulatedTimeUs.toLocaleString()} µs total
        </div>
      </div>

      {/* 5. Relative Bandwidth / Data Stream */}
      <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid #38bdf8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', marginBottom: '0.2rem' }}>
          <Cpu size={14} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Bandwidth Ratio</span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {compressionRatio !== 'N/A' ? `${compressionRatio}×` : 'Sparse'}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          Frame: {(frameBytesPerSec / 1024).toFixed(0)} KB/s vs Event: {(eventBytesPerSec / 1024).toFixed(0)} KB/s
        </div>
      </div>

      {/* 6. Operating Conditions */}
      <div className="card" style={{ padding: '0.875rem', borderLeft: '3px solid #a855f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a855f7', marginBottom: '0.2rem' }}>
          <Sun size={14} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Conditions</span>
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {illuminationLux} lux
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          Threshold: <code style={{ color: 'var(--color-cyan)' }}>C = ±{thresholdC.toFixed(2)}</code>
        </div>
      </div>
    </div>
  )
}

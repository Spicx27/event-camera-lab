import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Crosshair } from 'lucide-react'
import type { PixelSample } from '@/sim/eventEngine'

interface PixelInspectorProps {
  selectedPixel: { x: number; y: number }
  width: number
  height: number
  onSelectPixel: (x: number, y: number) => void
  history: PixelSample[]
  thresholdC: number
}

export default function PixelInspector({
  selectedPixel,
  width,
  height,
  onSelectPixel,
  history,
  thresholdC,
}: PixelInspectorProps) {
  const currentSample = history.length > 0 ? history[history.length - 1] : null
  const deltaL = currentSample ? currentSample.logIntensity - currentSample.refLogIntensity : 0

  const presets = [
    { label: 'Rotor Edge', x: Math.floor(width * 0.72), y: Math.floor(height * 0.5) },
    { label: 'Inner Spoke', x: Math.floor(width * 0.58), y: Math.floor(height * 0.42) },
    { label: 'Center Hub', x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },
    { label: 'Background', x: Math.floor(width * 0.1), y: Math.floor(height * 0.1) },
  ]

  return (
    <div
      className="card"
      style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-cyan)' }}>
            <Crosshair size={18} />
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Pixel-Level Neuromorphic Inspector</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
            Observing single-pixel Address-Event Generation: <code style={{ color: 'var(--color-cyan)' }}>L(t) - L_ref = pC</code> (Slide 9)
          </p>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Quick Select:</span>
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => onSelectPixel(p.x, p.y)}
              className="btn btn--ghost"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.72rem',
                borderColor: selectedPixel.x === p.x && selectedPixel.y === p.y ? 'var(--color-cyan)' : 'var(--color-border-subtle)',
                color: selectedPixel.x === p.x && selectedPixel.y === p.y ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
              }}
            >
              {p.label} ({p.x}, {p.y})
            </button>
          ))}
        </div>
      </div>

      {/* Live Readout Values */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div style={{ padding: '0.65rem', background: 'var(--color-bg-deep)', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>COORDINATES</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            ({selectedPixel.x}, {selectedPixel.y})
          </div>
        </div>

        <div style={{ padding: '0.65rem', background: 'var(--color-bg-deep)', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>INTENSITY I(t)</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
            {currentSample ? currentSample.intensity.toFixed(3) : '0.000'}
          </div>
        </div>

        <div style={{ padding: '0.65rem', background: 'var(--color-bg-deep)', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>LOG INTENSITY L</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
            {currentSample ? currentSample.logIntensity.toFixed(3) : '0.000'}
          </div>
        </div>

        <div style={{ padding: '0.65rem', background: 'var(--color-bg-deep)', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>REFERENCE L_ref</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#facc15' }}>
            {currentSample ? currentSample.refLogIntensity.toFixed(3) : '0.000'}
          </div>
        </div>

        <div style={{ padding: '0.65rem', background: 'var(--color-bg-deep)', borderRadius: 6, border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>DIFF ΔL (THRESHOLD ±{thresholdC.toFixed(2)})</div>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: Math.abs(deltaL) >= thresholdC ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
            }}
          >
            {deltaL >= 0 ? `+${deltaL.toFixed(3)}` : deltaL.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Chart 1: Log-Intensity vs Stepped Reference Baseline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--color-cyan)' }}>― Log Luminance L(t)</span> &nbsp;|&nbsp;
            <span style={{ color: '#facc15' }}>··· Reference Baseline L_ref(t)</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Time Window: ~2 seconds
          </span>
        </div>

        <div style={{ width: '100%', height: '140px', background: 'var(--color-bg-deep)', borderRadius: 8, padding: '0.5rem 0.25rem 0 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="timeMs" tick={false} />
              <YAxis domain={['auto', 'auto']} stroke="var(--color-text-muted)" fontSize={10} />
              <Tooltip
                contentStyle={{ background: '#090f1d', border: '1px solid var(--color-border)', fontSize: '0.72rem' }}
                labelFormatter={val => `Time: ${val} ms`}
              />
              <Area
                type="monotone"
                dataKey="logIntensity"
                name="Log L(t)"
                stroke="var(--color-cyan)"
                fill="rgba(6, 182, 212, 0.15)"
                strokeWidth={1.5}
                isAnimationActive={false}
              />
              <Area
                type="stepAfter"
                dataKey="refLogIntensity"
                name="Baseline L_ref"
                stroke="#facc15"
                fill="transparent"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Output Event Spikes (ON +1 / OFF -1) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Asynchronous Event Spikes: <span style={{ color: '#ffffff', fontWeight: 700 }}>+1 ON (White Layer)</span> / <span style={{ color: '#9ca3af', fontWeight: 600 }}>-1 OFF (Grey Layer)</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Fires when |ΔL| ≥ C
          </span>
        </div>

        <div style={{ width: '100%', height: '70px', background: 'var(--color-bg-deep)', borderRadius: 8, padding: '0.25rem 0.25rem 0 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="timeMs" tick={false} />
              <YAxis domain={[-1.2, 1.2]} ticks={[-1, 0, 1]} stroke="var(--color-text-muted)" fontSize={9} />
              <Bar
                dataKey="spike"
                name="Spike Polarity"
                fill="var(--color-cyan)"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

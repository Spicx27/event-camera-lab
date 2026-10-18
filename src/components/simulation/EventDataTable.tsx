import { useState, useMemo } from 'react'
import { Download, FileJson, Search, Filter, CheckCircle2, Trash2, ArrowUpDown } from 'lucide-react'
import type { DvsEvent, PolarityFilter } from '@/sim/eventEngine'

interface EventDataTableProps {
  events: DvsEvent[]
  selectedEvent: DvsEvent | null
  onSelectEvent: (event: DvsEvent | null) => void
  width: number
  height: number
  windowMs: number
  simTimeMs: number
  thresholdC: number
}

export default function EventDataTable({
  events,
  selectedEvent,
  onSelectEvent,
  width,
  height,
  windowMs,
  simTimeMs,
  thresholdC,
}: EventDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [polarityFilter, setPolarityFilter] = useState<PolarityFilter>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [maxDisplay, setMaxDisplay] = useState(100)

  // Filter and sort events for display
  const filteredEvents = useMemo(() => {
    let result = events

    // Polarity filter
    if (polarityFilter === 'on') {
      result = result.filter((e) => e.p > 0)
    } else if (polarityFilter === 'off') {
      result = result.filter((e) => e.p < 0)
    }

    // Search query (matches x:XX, y:YY, or numeric values)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      result = result.filter((e) => {
        if (q.startsWith('x:')) {
          const val = parseInt(q.slice(2), 10)
          return !isNaN(val) && e.x === val
        }
        if (q.startsWith('y:')) {
          const val = parseInt(q.slice(2), 10)
          return !isNaN(val) && e.y === val
        }
        if (q === 'on' || q === '+1') return e.p > 0
        if (q === 'off' || q === '-1') return e.p < 0
        return (
          e.x.toString() === q ||
          e.y.toString() === q ||
          Math.round(e.t / 1000).toString().includes(q)
        )
      })
    }

    // Sort by timestamp
    result = [...result].sort((a, b) => {
      return sortOrder === 'desc' ? b.t - a.t : a.t - b.t
    })

    return result
  }, [events, polarityFilter, searchTerm, sortOrder])

  // Slice to avoid UI lag when rendering thousands of rows
  const displaySlice = useMemo(() => {
    return filteredEvents.slice(0, maxDisplay)
  }, [filteredEvents, maxDisplay])

  // Export full window events to genuine CSV
  const handleExportCSV = () => {
    if (events.length === 0) return

    const nowIso = new Date().toISOString()
    const headerLines = [
      `# EventVision Lab - 3D Event Stream Data Export`,
      `# Date: ${nowIso}`,
      `# Sensor Resolution: ${width}x${height}`,
      `# Contrast Threshold C: ${thresholdC.toFixed(2)}`,
      `# Time Window Delta_t: ${windowMs} ms`,
      `# Total Events in Window: ${events.length}`,
      `# Mathematical Model: L(x, y, t_k) - L(x, y, t_last) >= p * C (Slide 9)`,
      `timestamp_us,timestamp_ms,x,y,polarity,polarity_label`,
    ]

    const dataRows = events.map((e) => {
      const ms = (e.t / 1000).toFixed(3)
      const pLabel = e.p > 0 ? 'ON' : 'OFF'
      return `${e.t},${ms},${e.x},${e.y},${e.p},${pLabel}`
    })

    const csvContent = [...headerLines, ...dataRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `event_stream_${Math.round(simTimeMs)}ms_${events.length}events.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export full window events to genuine JSON
  const handleExportJSON = () => {
    if (events.length === 0) return

    const exportData = {
      meta: {
        generator: 'EventVision Lab - Space-Time Visualizer',
        exportedAt: new Date().toISOString(),
        simTimeMs,
        windowMs,
        sensorResolution: { width, height },
        contrastThreshold: thresholdC,
        eventCount: events.length,
        tupleFormat: 'e_k = (x_k, y_k, t_k, p_k)',
      },
      events: events.map((e) => ({
        t_us: e.t,
        t_ms: +(e.t / 1000).toFixed(3),
        x: e.x,
        y: e.y,
        p: e.p,
        label: e.p > 0 ? 'ON' : 'OFF',
      })),
    }

    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `event_stream_${Math.round(simTimeMs)}ms_${events.length}events.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Simulate 32-bit AER word for selected event
  const aerWordPreview = useMemo(() => {
    if (!selectedEvent) return null
    // Standard AER encoding example:
    // Bit 31: Polarity (1 for ON, 0 for OFF)
    // Bits 30-22: Y coordinate (9 bits, 0-511)
    // Bits 21-12: X coordinate (10 bits, 0-1023)
    // Bits 11-0: Low 12 bits of timestamp
    const polBit = selectedEvent.p > 0 ? 1 : 0
    const yBits = (selectedEvent.y & 0x1ff) << 22
    const xBits = (selectedEvent.x & 0x3ff) << 12
    const tBits = selectedEvent.t & 0xfff
    const word = ((polBit << 31) | yBits | xBits | tBits) >>> 0
    const hex = '0x' + word.toString(16).toUpperCase().padStart(8, '0')
    const bin = word.toString(2).padStart(32, '0')
    return { hex, bin }
  }, [selectedEvent])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Top Header & Export Action Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255, 255, 255, 0.02)',
          gap: '0.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f3f4f6' }}>
              AER Event Stream Table
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                padding: '0.1rem 0.4rem',
                borderRadius: 4,
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--color-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              {events.length.toLocaleString()} in Window
            </span>
          </div>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Tuple format: <code>e_k = (x_k, y_k, t_k, p_k)</code> · Microsecond asynchronous packets
          </p>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="btn btn-secondary"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: events.length === 0 ? 0.5 : 1,
            }}
            title="Download CSV containing all events in current window"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            disabled={events.length === 0}
            className="btn btn-secondary"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: events.length === 0 ? 0.5 : 1,
            }}
            title="Download JSON dataset"
          >
            <FileJson size={13} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.85rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(0, 0, 0, 0.15)',
          gap: '0.5rem',
          fontSize: '0.75rem',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: '1 1 180px' }}>
          <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search x:32, y:28, or coordinate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: '#fff',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Polarity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Filter size={12} style={{ color: 'var(--color-text-muted)' }} />
          {(['all', 'on', 'off'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPolarityFilter(filter)}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.7rem',
                borderRadius: 4,
                border: '1px solid',
                borderColor:
                  polarityFilter === filter
                    ? filter === 'on'
                      ? '#ffffff'
                      : filter === 'off'
                      ? '#9ca3af'
                      : 'var(--color-cyan)'
                    : 'transparent',
                background:
                  polarityFilter === filter ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color:
                  polarityFilter === filter
                    ? '#ffffff'
                    : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontWeight: polarityFilter === filter ? 600 : 400,
              }}
            >
              {filter === 'all' ? 'All' : filter === 'on' ? '+1 ON' : '-1 OFF'}
            </button>
          ))}
        </div>

        {/* Sort & Display Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.45rem',
              fontSize: '0.7rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
            title="Toggle time sort order"
          >
            <ArrowUpDown size={11} />
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Selected Event Inspector Ribbon (if an event is selected) */}
      {selectedEvent && (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            background: 'rgba(6, 182, 212, 0.08)',
            borderBottom: '1px solid rgba(6, 182, 212, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <CheckCircle2 size={13} />
              Inspecting Event: Pixel ({selectedEvent.x}, {selectedEvent.y})
            </span>
            <button
              onClick={() => onSelectEvent(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.15rem 0.4rem',
                fontSize: '0.68rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} />
              Clear selection
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.5rem',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Timestamp: </span>
              <strong style={{ color: '#fff' }}>{selectedEvent.t.toLocaleString()} µs</strong>
              <span style={{ color: 'var(--color-cyan)', marginLeft: '0.3rem' }}>
                ({(selectedEvent.t / 1000).toFixed(2)} ms)
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Polarity: </span>
              <strong style={{ color: selectedEvent.p > 0 ? '#ffffff' : '#9ca3af' }}>
                {selectedEvent.p > 0 ? '+1 ON (Brighter)' : '-1 OFF (Darker)'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>AER Bus Word: </span>
              <code style={{ color: 'var(--color-accent-amber)', fontSize: '0.7rem' }}>
                {aerWordPreview?.hex || '0x00000000'}
              </code>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Condition: </span>
              <span style={{ color: '#e5e7eb' }}>
                Δln(I) ≥ {selectedEvent.p > 0 ? '+' : '-'}{thresholdC.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Event Records Table Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 180,
          maxHeight: 280,
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.73rem',
            fontFamily: 'var(--font-mono)',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(4px)',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                zIndex: 2,
              }}
            >
              <th style={{ padding: '0.4rem 0.65rem' }}>Index</th>
              <th style={{ padding: '0.4rem 0.65rem' }}>Time (µs)</th>
              <th style={{ padding: '0.4rem 0.65rem' }}>Time (ms)</th>
              <th style={{ padding: '0.4rem 0.65rem' }}>X</th>
              <th style={{ padding: '0.4rem 0.65rem' }}>Y</th>
              <th style={{ padding: '0.4rem 0.65rem' }}>Polarity (p)</th>
              <th style={{ padding: '0.4rem 0.65rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displaySlice.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {events.length === 0 ? (
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>No events in current time window.</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem' }}>
                        Start the simulation or rotate the target to generate contrast events.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: 0 }}>No events matched your search or polarity filter.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('')
                          setPolarityFilter('all')
                        }}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.7rem',
                          background: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: 4,
                          color: 'var(--color-cyan)',
                          cursor: 'pointer',
                        }}
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              displaySlice.map((ev, idx) => {
                const isSelected =
                  selectedEvent &&
                  selectedEvent.t === ev.t &&
                  selectedEvent.x === ev.x &&
                  selectedEvent.y === ev.y &&
                  selectedEvent.p === ev.p

                return (
                  <tr
                    key={`${ev.t}-${ev.x}-${ev.y}-${ev.p}-${idx}`}
                    onClick={() => onSelectEvent(isSelected ? null : ev)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isSelected
                        ? 'rgba(6, 182, 212, 0.2)'
                        : idx % 2 === 0
                        ? 'transparent'
                        : 'rgba(255, 255, 255, 0.015)',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background =
                          idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                      }
                    }}
                  >
                    <td style={{ padding: '0.35rem 0.65rem', color: 'var(--color-text-muted)' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '0.35rem 0.65rem', color: '#e5e7eb' }}>
                      {ev.t.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.35rem 0.65rem', color: 'var(--color-text-muted)' }}>
                      {(ev.t / 1000).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.35rem 0.65rem', color: '#38bdf8' }}>{ev.x}</td>
                    <td style={{ padding: '0.35rem 0.65rem', color: '#38bdf8' }}>{ev.y}</td>
                    <td style={{ padding: '0.35rem 0.65rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.12rem 0.4rem',
                          borderRadius: 3,
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          background:
                            ev.p > 0 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(130, 130, 130, 0.25)',
                          color: ev.p > 0 ? '#000000' : '#d1d5db',
                          border:
                            ev.p > 0
                              ? '1px solid #ffffff'
                              : '1px solid rgba(156, 163, 175, 0.5)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 1,
                            background: ev.p > 0 ? '#000000' : '#9ca3af',
                          }}
                        />
                        {ev.p > 0 ? '+1 ON' : '-1 OFF'}
                      </span>
                    </td>
                    <td style={{ padding: '0.35rem 0.65rem' }}>
                      {isSelected ? (
                        <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>
                          ● Active Target
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Stream</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 0.85rem',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(0, 0, 0, 0.25)',
          fontSize: '0.68rem',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>
          Showing {Math.min(maxDisplay, filteredEvents.length)} of {filteredEvents.length} events
          {filteredEvents.length > maxDisplay && (
            <button
              onClick={() => setMaxDisplay((prev) => prev + 100)}
              style={{
                marginLeft: '0.5rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-cyan)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Load more
            </button>
          )}
        </span>
        <span>
          Click row to inspect & highlight in 3D & 2D views
        </span>
      </div>
    </div>
  )
}

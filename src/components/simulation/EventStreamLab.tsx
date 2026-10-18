import { useState, useEffect, useRef, useCallback } from 'react'
import { OrbitingDotModel, type OrbitingDotState } from '@/sim/orbitingDotModel'
import { EventEngine, type DvsEvent, type EventEngineStats, type PolarityFilter } from '@/sim/eventEngine'
import EventStream3DViewer from './EventStream3DViewer'
import SourceScenePreview from './SourceScenePreview'
import EventStreamControls from './EventStreamControls'
import EventDataTable from './EventDataTable'
import EventStreamObservations from './EventStreamObservations'

export default function EventStreamLab() {
  // ── Simulation Playback State ──────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [simClockMs, setSimClockMs] = useState<number>(0)
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner')

  // ── Physical Orbiting Dot Parameters ──────────────────────────────────────
  const [dotDiameterPx, setDotDiameterPx] = useState<number>(7)
  const [orbitalRadiusNorm, setOrbitalRadiusNorm] = useState<number>(0.32)
  const [speedDegPerSec, setSpeedDegPerSec] = useState<number>(360) // 1.00 rev/s default for canonical Slide 10 helix
  const [direction, setDirection] = useState<1 | -1>(1)
  const [illuminationLux, setIlluminationLux] = useState<number>(500)

  // ── Event Sensor Parameters ───────────────────────────────────────────────
  const [resolution, setResolution] = useState<64 | 128>(64)
  const [thresholdC, setThresholdC] = useState<number>(0.20) // Contrast threshold (Slide 9)
  const [windowMs, setWindowMs] = useState<number>(1000) // Default 1000 ms (1 full revolution at 1 rev/s)
  const [pointSize, setPointSize] = useState<number>(3.5)
  const [maxHistoryLimit, setMaxHistoryLimit] = useState<number>(35000)
  const [renderedCount, setRenderedCount] = useState<number>(0)

  // ── Scrubbing & Interactive Inspection ────────────────────────────────────
  const [scrubTimeMs, setScrubTimeMs] = useState<number | null>(null)
  const [isLiveFollow, setIsLiveFollow] = useState<boolean>(true)
  const [polarityFilter, setPolarityFilter] = useState<PolarityFilter>('all')
  const [selectedEvent, setSelectedEvent] = useState<DvsEvent | null>(null)

  // ── Stream Data for Views ─────────────────────────────────────────────────
  const [windowEvents, setWindowEvents] = useState<DvsEvent[]>([])
  const [totalHistoryCount, setTotalHistoryCount] = useState<number>(0)
  const [retainedDurationMs, setRetainedDurationMs] = useState<number>(0)
  const [engineStats, setEngineStats] = useState<EventEngineStats>({
    totalEvents: 0,
    onEvents: 0,
    offEvents: 0,
    eventRatePerSec: 0,
    simulatedTimeUs: 0,
  })

  // ── Authoritative Models & Pre-allocated Typed Buffers ─────────────────────
  const dotModelRef = useRef<OrbitingDotModel>(
    new OrbitingDotModel({
      dotDiameterPx: 7,
      orbitalRadiusNorm: 0.32,
      speedDegPerSec: 360,
      direction: 1,
      illuminationLux: 500,
    })
  )

  const [dotState, setDotState] = useState<OrbitingDotState>(() => {
    const initModel = new OrbitingDotModel({
      dotDiameterPx: 7,
      orbitalRadiusNorm: 0.32,
      speedDegPerSec: 360,
      direction: 1,
      illuminationLux: 500,
    })
    return initModel.getState(64, 64)
  })

  const eventEngineRef = useRef<EventEngine>(new EventEngine(64, 64, 0.20))
  const intensityBufferRef = useRef<Float32Array>(new Float32Array(64 * 64))
  const simClockRef = useRef<number>(0)
  const animFrameIdRef = useRef<number | null>(null)

  // ── Synchronize Engine Parameters ─────────────────────────────────────────
  useEffect(() => {
    dotModelRef.current.params.speedDegPerSec = speedDegPerSec
    dotModelRef.current.params.direction = direction
    dotModelRef.current.params.illuminationLux = illuminationLux
  }, [speedDegPerSec, direction, illuminationLux])

  useEffect(() => {
    eventEngineRef.current.setThreshold(thresholdC)
  }, [thresholdC])

  useEffect(() => {
    eventEngineRef.current.setMaxStreamHistory(maxHistoryLimit)
  }, [maxHistoryLimit])

  // Handle sensor resolution change
  const handleResolutionChange = useCallback((newRes: 64 | 128) => {
    setResolution(newRes)
    eventEngineRef.current.setResolution(newRes, newRes)
    intensityBufferRef.current = new Float32Array(newRes * newRes)
    setSelectedEvent(null)

    // Resynchronize sensor reference to new resolution
    dotModelRef.current.sampleIntensityGrid(newRes, newRes, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)
    setDotState(dotModelRef.current.getState(newRes, newRes))
  }, [])

  // Smooth parameter changes without teleportation
  const handleDotDiameterChange = useCallback((dia: number) => {
    setDotDiameterPx(dia)
    dotModelRef.current.params.dotDiameterPx = dia
    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)
    setDotState(dotModelRef.current.getState(resolution, resolution))
  }, [resolution])

  const handleOrbitalRadiusChange = useCallback((norm: number) => {
    setOrbitalRadiusNorm(norm)
    dotModelRef.current.params.orbitalRadiusNorm = norm
    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)
    setDotState(dotModelRef.current.getState(resolution, resolution))
  }, [resolution])

  const handleThresholdChange = useCallback((c: number) => {
    setThresholdC(c)
    eventEngineRef.current.setThreshold(c)
  }, [])

  // ── Single Step Simulation Advance ────────────────────────────────────────
  const performStep = useCallback((stepDtMs: number) => {
    // Sub-step physics integration for smooth, microsecond-accurate event timestamps
    const SUB_STEPS = 4
    const subDtMs = stepDtMs / SUB_STEPS
    const subDtSeconds = subDtMs / 1000
    const subDtMicroseconds = Math.round(subDtMs * 1000)

    for (let s = 0; s < SUB_STEPS; s++) {
      simClockRef.current += subDtMs
      dotModelRef.current.update(subDtSeconds)
      dotModelRef.current.sampleIntensityGrid(
        resolution,
        resolution,
        intensityBufferRef.current
      )
      eventEngineRef.current.step(intensityBufferRef.current, subDtMicroseconds)
    }

    const currentSimMs = simClockRef.current
    setSimClockMs(currentSimMs)

    // Current authoritative physical dot state
    const currentDotState = dotModelRef.current.getState(resolution, resolution)
    setDotState(currentDotState)

    // Engine statistics
    const stats = eventEngineRef.current.getStats()
    setEngineStats(stats)

    const allHistory = eventEngineRef.current.getStreamHistory()
    setTotalHistoryCount(allHistory.length)

    if (allHistory.length > 0) {
      const earliestUs = allHistory[0].t
      const latestUs = allHistory[allHistory.length - 1].t
      setRetainedDurationMs((latestUs - earliestUs) / 1000)
    } else {
      setRetainedDurationMs(0)
    }

    // Determine active time window:
    // When simTime < windowMs: window is [0, windowMs]
    // When simTime >= windowMs: rolling window is [simTime - windowMs, simTime]
    const effectiveTimeMs = scrubTimeMs !== null ? scrubTimeMs : currentSimMs
    const isRampingUp = effectiveTimeMs <= windowMs
    const activeStartUs = isRampingUp ? 0 : (effectiveTimeMs - windowMs) * 1000
    const activeEndUs = isRampingUp ? windowMs * 1000 : effectiveTimeMs * 1000

    const inWindow = eventEngineRef.current.getStreamEventsInWindow(
      activeStartUs,
      activeEndUs,
      30000
    )
    setWindowEvents(inWindow)
  }, [resolution, windowMs, scrubTimeMs])

  // ── Scrubbing Update Effect ───────────────────────────────────────────────
  useEffect(() => {
    if (scrubTimeMs !== null) {
      const isRampingUp = scrubTimeMs <= windowMs
      const activeStartUs = isRampingUp ? 0 : (scrubTimeMs - windowMs) * 1000
      const activeEndUs = isRampingUp ? windowMs * 1000 : scrubTimeMs * 1000
      const inWindow = eventEngineRef.current.getStreamEventsInWindow(
        activeStartUs,
        activeEndUs,
        30000
      )
      setWindowEvents(inWindow)
    }
  }, [scrubTimeMs, windowMs])

  // ── Animation Loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
      return
    }

    let lastTick = performance.now()

    const loop = (now: number) => {
      const elapsed = now - lastTick

      // Throttle simulation step to ~30-40 Hz for optimal frame budget and physics fidelity
      if (elapsed >= 25) {
        lastTick = now
        const stepMs = Math.min(elapsed, 40) // cap maximum step to avoid large jumps
        performStep(stepMs)
      }

      animFrameIdRef.current = requestAnimationFrame(loop)
    }

    animFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
    }
  }, [isPlaying, performStep])

  // ── Playback Controls Handlers ─────────────────────────────────────────────
  const handleTogglePlay = () => {
    if (!isPlaying && scrubTimeMs !== null) {
      setScrubTimeMs(null)
      setIsLiveFollow(true)
    }
    setIsPlaying((prev) => !prev)
  }

  const handleStop = () => {
    setIsPlaying(false)
  }

  const handleStep = () => {
    if (isPlaying) setIsPlaying(false)
    performStep(16.7)
  }

  const handleReset = () => {
    setIsPlaying(false)
    simClockRef.current = 0
    setSimClockMs(0)
    setScrubTimeMs(null)
    setIsLiveFollow(true)
    setSelectedEvent(null)

    dotModelRef.current.reset()
    dotModelRef.current.params = {
      dotDiameterPx: 7,
      orbitalRadiusNorm: 0.32,
      speedDegPerSec: 360,
      direction: 1,
      illuminationLux: 500,
    }

    setDotDiameterPx(7)
    setOrbitalRadiusNorm(0.32)
    setSpeedDegPerSec(360)
    setDirection(1)
    setThresholdC(0.20)
    setWindowMs(1000)

    eventEngineRef.current.setThreshold(0.20)
    eventEngineRef.current.clearStreamHistory()
    eventEngineRef.current.reset()

    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)

    setDotState(dotModelRef.current.getState(resolution, resolution))
    setWindowEvents([])
    setTotalHistoryCount(0)
    setRetainedDurationMs(0)
    setEngineStats({
      totalEvents: 0,
      onEvents: 0,
      offEvents: 0,
      eventRatePerSec: 0,
      simulatedTimeUs: 0,
    })
  }

  // Preset Applier
  const handleApplyPreset = (preset: {
    dotDiameter: number
    orbitalRadius: number
    speed: number
    window: number
    threshold: number
  }) => {
    setDotDiameterPx(preset.dotDiameter)
    setOrbitalRadiusNorm(preset.orbitalRadius)
    setSpeedDegPerSec(preset.speed)
    setWindowMs(preset.window)
    setThresholdC(preset.threshold)

    dotModelRef.current.params.dotDiameterPx = preset.dotDiameter
    dotModelRef.current.params.orbitalRadiusNorm = preset.orbitalRadius
    dotModelRef.current.params.speedDegPerSec = preset.speed
    eventEngineRef.current.setThreshold(preset.threshold)

    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)

    setDotState(dotModelRef.current.getState(resolution, resolution))
    setScrubTimeMs(null)
    setIsLiveFollow(true)
    if (!isPlaying && preset.speed > 0) setIsPlaying(true)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--color-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                fontWeight: 700,
              }}
            >
              EXPERIMENT 2
            </span>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              3D Event Stream &amp; Space-Time Data Lab
            </h2>
          </div>
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.4,
            }}
          >
            Observe a single high-contrast dot orbiting a fixed centre unrolling into a continuous 3D space-time
            double helix <code>(x, y, t)</code> (Slide 10). Inspect microsecond AER packets and export research datasets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isPlaying ? 'var(--color-accent-emerald)' : 'var(--color-accent-amber)',
                boxShadow: isPlaying ? '0 0 8px var(--color-accent-emerald)' : 'none',
              }}
            />
            <span style={{ color: '#fff' }}>
              {isPlaying ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span style={{ color: 'var(--color-cyan)' }}>
              {windowEvents.length.toLocaleString()} events in window
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Viewports Grid ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.3fr) minmax(300px, 1fr)',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* Left Column: Primary 3D Space-Time Viewer (X, Y, Time) */}
        <div
          style={{
            minHeight: 560,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <EventStream3DViewer
            events={windowEvents}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            width={resolution}
            height={resolution}
            windowMs={windowMs}
            simTimeMs={scrubTimeMs !== null ? scrubTimeMs : simClockMs}
            polarityFilter={polarityFilter}
            onPolarityFilterChange={setPolarityFilter}
            pointSize={pointSize}
            onRenderedCountChange={setRenderedCount}
          />
        </div>

        {/* Right Column: Physical Source Scene: Single Orbiting Dot */}
        <div
          style={{
            minHeight: 560,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SourceScenePreview
            dotPixelX={dotState.dotPixelX}
            dotPixelY={dotState.dotPixelY}
            orbitalRadiusPx={dotState.orbitalRadiusPx}
            dotRadiusPx={dotState.dotRadiusPx}
            dotDiameterPx={dotDiameterPx}
            angleRad={dotState.angleRad}
            angleDeg={dotState.angleDeg}
            resolution={resolution}
            speedRps={dotState.speedRps}
            speedDegPerSec={speedDegPerSec}
            direction={direction}
            illuminationLux={illuminationLux}
          />
        </div>
      </div>

      {/* ── Playback Controls & Timeline Scrubber ──────────────────────────── */}
      <EventStreamControls
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onStop={handleStop}
        onStep={handleStep}
        onReset={handleReset}
        simTimeMs={simClockMs}
        retainedDurationMs={retainedDurationMs}
        windowMs={windowMs}
        onWindowMsChange={setWindowMs}
        scrubTimeMs={scrubTimeMs}
        onScrubChange={setScrubTimeMs}
        isLiveFollow={isLiveFollow}
        onToggleLiveFollow={() => {
          setIsLiveFollow((prev) => {
            if (!prev) setScrubTimeMs(null)
            return !prev
          })
        }}
        mode={mode}
        onModeChange={setMode}
        dotDiameterPx={dotDiameterPx}
        onDotDiameterChange={handleDotDiameterChange}
        orbitalRadiusNorm={orbitalRadiusNorm}
        onOrbitalRadiusChange={handleOrbitalRadiusChange}
        speedDegPerSec={speedDegPerSec}
        onSpeedChange={setSpeedDegPerSec}
        direction={direction}
        onDirectionToggle={() => setDirection((d) => (d === 1 ? -1 : 1))}
        thresholdC={thresholdC}
        onThresholdChange={handleThresholdChange}
        resolution={resolution}
        onResolutionChange={handleResolutionChange}
        illuminationLux={illuminationLux}
        onIlluminationChange={setIlluminationLux}
        maxHistoryLimit={maxHistoryLimit}
        onMaxHistoryLimitChange={setMaxHistoryLimit}
        pointSize={pointSize}
        onPointSizeChange={setPointSize}
      />

      {/* ── Bottom Section: Observations & Data Table ──────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Educational Observations & Presentation Experiments */}
        <div>
          <EventStreamObservations
            speedDegPerSec={speedDegPerSec}
            speedRps={dotState.speedRps}
            orbitalRadiusPx={dotState.orbitalRadiusPx}
            dotDiameterPx={dotDiameterPx}
            thresholdC={thresholdC}
            windowMs={windowMs}
            resolution={resolution}
            simTimeMs={simClockMs}
            eventCountWindow={windowEvents.length}
            totalStreamHistoryCount={totalHistoryCount}
            eventRatePerSec={engineStats.eventRatePerSec}
            totalEvents={engineStats.totalEvents}
            onEventsCount={engineStats.onEvents}
            offEventsCount={engineStats.offEvents}
            renderedPointCount={renderedCount}
            mode={mode}
            onApplyPreset={handleApplyPreset}
          />
        </div>

        {/* Live AER Event Data Table & Export */}
        <div style={{ height: 420 }}>
          <EventDataTable
            events={windowEvents}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            width={resolution}
            height={resolution}
            windowMs={windowMs}
            simTimeMs={scrubTimeMs !== null ? scrubTimeMs : simClockMs}
            thresholdC={thresholdC}
          />
        </div>
      </div>
    </div>
  )
}

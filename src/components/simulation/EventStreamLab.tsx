import { useState, useEffect, useRef, useCallback } from 'react'
import { OrbitingDotModel, type OrbitingDotState, type CanonicalSimulationState } from '@/sim/orbitingDotModel'
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
  const [orbitalRadiusPx, setOrbitalRadiusPx] = useState<number>(20)
  const [speedDegPerSec, setSpeedDegPerSec] = useState<number>(360) // 1.00 rev/s default for canonical Slide 10 helix
  const [direction, setDirection] = useState<1 | -1>(1)
  const [illuminationLux, setIlluminationLux] = useState<number>(500)

  // ── Event Sensor Parameters ───────────────────────────────────────────────
  const [resolution, setResolution] = useState<64 | 128>(64)
  const [thresholdC, setThresholdC] = useState<number>(0.20) // Contrast threshold (Slide 9)
  const [windowMs, setWindowMs] = useState<number>(1000) // Default 1000 ms (Hard limit: 1000 ms)
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

  // Single authoritative canonical simulation state ref shared synchronously
  // between the 60 FPS physics loop, 2D source preview, and 3D space-time viewer
  const canonicalStateRef = useRef<CanonicalSimulationState>({
    simTimeMs: 0,
    angleRad: 0,
    angleDeg: 0,
    dotPixelX: 32,
    dotPixelY: 32,
    orbitalRadiusPx: 0.32 * 63,
    dotRadiusPx: 3.5,
    dotDiameterPx: 7,
    speedRps: 1.0,
    speedDegPerSec: 360,
    direction: 1,
    resolution: 64,
    windowMs: 1000,
    isPlaying: true,
    scrubTimeMs: null,
  })

  const eventEngineRef = useRef<EventEngine>(new EventEngine(64, 64, 0.20))
  const intensityBufferRef = useRef<Float32Array>(new Float32Array(64 * 64))
  const simClockRef = useRef<number>(0)
  const animFrameIdRef = useRef<number | null>(null)
  const lastUiUpdateRef = useRef<number>(0)

  // ── Synchronize Engine Parameters ─────────────────────────────────────────
  useEffect(() => {
    dotModelRef.current.params.illuminationLux = illuminationLux
  }, [illuminationLux])

  useEffect(() => {
    eventEngineRef.current.setThreshold(thresholdC)
  }, [thresholdC])

  useEffect(() => {
    eventEngineRef.current.setMaxStreamHistory(maxHistoryLimit)
  }, [maxHistoryLimit])

  // Synchronously mirrors the latest model and simulation clocks into canonicalStateRef
  const syncCanonicalState = useCallback(() => {
    const curSimMs = scrubTimeMs !== null ? scrubTimeMs : simClockRef.current
    const st = dotModelRef.current.getStateAtTime(curSimMs / 1000, resolution, resolution)
    canonicalStateRef.current = {
      simTimeMs: curSimMs,
      angleRad: st.angleRad,
      angleDeg: st.angleDeg,
      dotPixelX: st.dotPixelX,
      dotPixelY: st.dotPixelY,
      orbitalRadiusPx: Math.min(20, st.orbitalRadiusPx),
      dotRadiusPx: Math.min(5, st.dotRadiusPx),
      dotDiameterPx: Math.min(10, dotDiameterPx),
      speedRps: st.speedRps,
      speedDegPerSec: Math.min(1080, speedDegPerSec),
      direction,
      resolution,
      windowMs: Math.min(1000, windowMs),
      isPlaying,
      scrubTimeMs,
    }
  }, [resolution, dotDiameterPx, speedDegPerSec, direction, windowMs, isPlaying, scrubTimeMs])

  // ── Decoupled UI State Flush (Throttled to ~15 Hz during playback for zero UI stutter) ───
  const flushUi = useCallback(() => {
    const currentSimMs = scrubTimeMs !== null ? scrubTimeMs : simClockRef.current
    setSimClockMs(currentSimMs)

    const currentDotState = dotModelRef.current.getStateAtTime(currentSimMs / 1000, resolution, resolution)
    setDotState(currentDotState)

    const stats = eventEngineRef.current.getStats()
    setEngineStats(stats)

    setTotalHistoryCount(eventEngineRef.current.getStreamHistoryCount())

    const timeRange = eventEngineRef.current.getStreamHistoryTimeRange()
    if (timeRange) {
      setRetainedDurationMs((timeRange.latestUs - timeRange.earliestUs) / 1000)
    } else {
      setRetainedDurationMs(0)
    }

    const clampedWindowMs = Math.min(1000, windowMs)
    const effectiveTimeMs = currentSimMs
    const isRampingUp = effectiveTimeMs <= clampedWindowMs
    const activeStartUs = isRampingUp ? 0 : (effectiveTimeMs - clampedWindowMs) * 1000
    const activeEndUs = isRampingUp ? clampedWindowMs * 1000 : effectiveTimeMs * 1000

    const inWindow = eventEngineRef.current.getStreamEventsInWindow(
      activeStartUs,
      activeEndUs,
      25000
    )
    setWindowEvents(inWindow)
  }, [resolution, windowMs, scrubTimeMs])

  // ── High-Frequency Physics & Event Generation Step (60 FPS, microsecond-accurate) ──
  const stepPhysics = useCallback((stepDtMs: number) => {
    const SUB_STEPS = 4
    const subDtMs = stepDtMs / SUB_STEPS
    const startMs = simClockRef.current

    for (let s = 0; s < SUB_STEPS; s++) {
      const subEndMs = startMs + (s + 1) * subDtMs
      const subStartMs = startMs + s * subDtMs
      const subDtUs = Math.round((subEndMs - subStartMs) * 1000)
      const exactSubEndUs = Math.round(subEndMs * 1000)

      dotModelRef.current.setTime(subEndMs / 1000)
      const dirtyBBox = dotModelRef.current.sampleIntensityGrid(
        resolution,
        resolution,
        intensityBufferRef.current
      )
      eventEngineRef.current.step(
        intensityBufferRef.current,
        subDtUs,
        dirtyBBox,
        exactSubEndUs
      )
    }

    simClockRef.current = startMs + stepDtMs

    const st = dotModelRef.current.getState(resolution, resolution)
    canonicalStateRef.current.simTimeMs = simClockRef.current
    canonicalStateRef.current.angleRad = st.angleRad
    canonicalStateRef.current.angleDeg = st.angleDeg
    canonicalStateRef.current.dotPixelX = st.dotPixelX
    canonicalStateRef.current.dotPixelY = st.dotPixelY
    canonicalStateRef.current.orbitalRadiusPx = Math.min(20, st.orbitalRadiusPx)
    canonicalStateRef.current.dotRadiusPx = Math.min(5, st.dotRadiusPx)
    canonicalStateRef.current.dotDiameterPx = Math.min(10, dotDiameterPx)
    canonicalStateRef.current.speedRps = st.speedRps
    canonicalStateRef.current.speedDegPerSec = Math.min(1080, speedDegPerSec)
    canonicalStateRef.current.direction = direction
    canonicalStateRef.current.resolution = resolution
    canonicalStateRef.current.windowMs = Math.min(1000, windowMs)
    canonicalStateRef.current.isPlaying = true
    canonicalStateRef.current.scrubTimeMs = scrubTimeMs
  }, [resolution, dotDiameterPx, speedDegPerSec, direction, windowMs, scrubTimeMs])

  const performStep = useCallback((stepDtMs: number) => {
    stepPhysics(stepDtMs)
    syncCanonicalState()
    flushUi()
  }, [stepPhysics, syncCanonicalState, flushUi])

  // Handle sensor resolution change
  const handleResolutionChange = useCallback((newRes: 64 | 128) => {
    setResolution(newRes)
    eventEngineRef.current.setResolution(newRes, newRes)
    intensityBufferRef.current = new Float32Array(newRes * newRes)
    setSelectedEvent(null)

    // Resynchronize sensor reference to new resolution
    dotModelRef.current.invalidateDirtyBBox()
    dotModelRef.current.sampleIntensityGrid(newRes, newRes, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)
    const st = dotModelRef.current.getState(newRes, newRes)
    setDotState(st)
    syncCanonicalState()
    flushUi()
  }, [syncCanonicalState, flushUi])

  // Smooth parameter changes without teleportation
  const handleDotDiameterChange = useCallback((dia: number) => {
    const clamped = Math.min(10, Math.max(1, dia))
    setDotDiameterPx(clamped)
    dotModelRef.current.params.dotDiameterPx = clamped
    dotModelRef.current.invalidateDirtyBBox()
    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)
    const st = dotModelRef.current.getState(resolution, resolution)
    setDotState(st)
    syncCanonicalState()
    flushUi()
  }, [resolution, syncCanonicalState, flushUi])

  const handleOrbitalRadiusChange = useCallback((radius: number) => {
    const rawPx = radius <= 1.0 ? radius * 63 : radius
    const clampedPx = Math.min(20, Math.max(1, Math.round(rawPx * 10) / 10))
    setOrbitalRadiusPx(clampedPx)
    dotModelRef.current.params.orbitalRadiusPx = clampedPx
    dotModelRef.current.params.orbitalRadiusNorm = clampedPx / 63
    dotModelRef.current.invalidateDirtyBBox()
    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)
    const st = dotModelRef.current.getState(resolution, resolution)
    setDotState(st)
    syncCanonicalState()
    flushUi()
  }, [resolution, syncCanonicalState, flushUi])

  const handleSpeedChange = useCallback((spd: number) => {
    const clamped = Math.min(1080, Math.max(0, spd))
    setSpeedDegPerSec(clamped)
    dotModelRef.current.setAngularVelocity(clamped, direction, simClockRef.current / 1000)
    canonicalStateRef.current.speedDegPerSec = clamped
    canonicalStateRef.current.speedRps = Number((clamped / 360).toFixed(2))
    syncCanonicalState()
    flushUi()
  }, [direction, syncCanonicalState, flushUi])

  const handleDirectionToggle = useCallback(() => {
    setDirection((prev) => {
      const next: 1 | -1 = prev === 1 ? -1 : 1
      dotModelRef.current.setAngularVelocity(speedDegPerSec, next, simClockRef.current / 1000)
      canonicalStateRef.current.direction = next
      return next
    })
    syncCanonicalState()
    flushUi()
  }, [speedDegPerSec, syncCanonicalState, flushUi])

  const handleWindowMsChange = useCallback((win: number) => {
    const clamped = Math.min(1000, Math.max(50, win))
    setWindowMs(clamped)
    canonicalStateRef.current.windowMs = clamped
    syncCanonicalState()
    flushUi()
  }, [syncCanonicalState, flushUi])

  const handleThresholdChange = useCallback((c: number) => {
    setThresholdC(c)
    eventEngineRef.current.setThreshold(c)
  }, [])

  const handleScrubChange = useCallback((time: number | null) => {
    setScrubTimeMs(time)
    canonicalStateRef.current.scrubTimeMs = time
    if (time !== null) {
      setIsLiveFollow(false)
      if (isPlaying) {
        setIsPlaying(false)
        canonicalStateRef.current.isPlaying = false
      }
    }
    syncCanonicalState()
    flushUi()
  }, [isPlaying, syncCanonicalState, flushUi])

  // ── Scrubbing Update Effect ───────────────────────────────────────────────
  useEffect(() => {
    if (scrubTimeMs !== null) {
      const isRampingUp = scrubTimeMs <= windowMs
      const activeStartUs = isRampingUp ? 0 : (scrubTimeMs - windowMs) * 1000
      const activeEndUs = isRampingUp ? windowMs * 1000 : scrubTimeMs * 1000
      const inWindow = eventEngineRef.current.getStreamEventsInWindow(
        activeStartUs,
        activeEndUs,
        25000
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
      lastTick = now

      // Cap stepDtMs to avoid physics jumps when tab is backgrounded
      const stepDtMs = Math.min(elapsed, 40)
      if (stepDtMs > 0) {
        stepPhysics(stepDtMs)
      }

      // Throttle React UI state updates to ~15 Hz (every ~66ms)
      // This leaves full main thread capacity for silky 60 FPS WebGL rendering
      if (now - lastUiUpdateRef.current >= 66) {
        lastUiUpdateRef.current = now
        flushUi()
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
  }, [isPlaying, stepPhysics, flushUi])

  // ── Playback Controls Handlers ─────────────────────────────────────────────
  const handleTogglePlay = () => {
    if (isPlaying) {
      // Pausing: stop immediately, freeze authoritative state synchronously
      setIsPlaying(false)
      canonicalStateRef.current.isPlaying = false
      syncCanonicalState()
      flushUi()
    } else {
      // Resuming: clear scrub override if any
      if (scrubTimeMs !== null) {
        setScrubTimeMs(null)
        setIsLiveFollow(true)
        canonicalStateRef.current.scrubTimeMs = null
      }
      setIsPlaying(true)
      canonicalStateRef.current.isPlaying = true
      syncCanonicalState()
      flushUi()
    }
  }

  const handleStop = () => {
    setIsPlaying(false)
    canonicalStateRef.current.isPlaying = false
    syncCanonicalState()
    flushUi()
  }

  const handleStep = () => {
    if (isPlaying) {
      setIsPlaying(false)
      canonicalStateRef.current.isPlaying = false
    }
    performStep(16.67)
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
      orbitalRadiusPx: 20,
      orbitalRadiusNorm: 20 / 63,
      speedDegPerSec: 360,
      direction: 1,
      illuminationLux: 500,
    }

    setDotDiameterPx(7)
    setOrbitalRadiusPx(20)
    setSpeedDegPerSec(360)
    setDirection(1)
    setThresholdC(0.20)
    setWindowMs(1000)

    eventEngineRef.current.setThreshold(0.20)
    eventEngineRef.current.clearStreamHistory()
    eventEngineRef.current.reset()

    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)

    syncCanonicalState()
    flushUi()
  }

  // Preset Applier
  const handleApplyPreset = (preset: {
    dotDiameter: number
    orbitalRadius: number
    speed: number
    window: number
    threshold: number
  }) => {
    const clampedDiameter = Math.min(10, Math.max(1, preset.dotDiameter))
    const rawRadius = preset.orbitalRadius <= 1 ? preset.orbitalRadius * 63 : preset.orbitalRadius
    const clampedRadius = Math.min(20, Math.max(1, Math.round(rawRadius * 10) / 10))
    const clampedSpeed = Math.min(1080, Math.max(0, preset.speed))
    const clampedWindow = Math.min(1000, Math.max(50, preset.window))

    setDotDiameterPx(clampedDiameter)
    setOrbitalRadiusPx(clampedRadius)
    setSpeedDegPerSec(clampedSpeed)
    setWindowMs(clampedWindow)
    setThresholdC(preset.threshold)

    dotModelRef.current.params.dotDiameterPx = clampedDiameter
    dotModelRef.current.params.orbitalRadiusPx = clampedRadius
    dotModelRef.current.params.orbitalRadiusNorm = clampedRadius / 63
    dotModelRef.current.setAngularVelocity(clampedSpeed, direction, simClockRef.current / 1000)
    eventEngineRef.current.setThreshold(preset.threshold)

    dotModelRef.current.invalidateDirtyBBox()
    dotModelRef.current.sampleIntensityGrid(resolution, resolution, intensityBufferRef.current)
    eventEngineRef.current.syncReferenceToIntensities(intensityBufferRef.current)

    setScrubTimeMs(null)
    setIsLiveFollow(true)
    if (!isPlaying && clampedSpeed > 0) {
      setIsPlaying(true)
      canonicalStateRef.current.isPlaying = true
    }
    syncCanonicalState()
    flushUi()
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
            canonicalStateRef={canonicalStateRef}
            eventEngineRef={eventEngineRef}
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
            canonicalStateRef={canonicalStateRef}
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
        onWindowMsChange={handleWindowMsChange}
        scrubTimeMs={scrubTimeMs}
        onScrubChange={handleScrubChange}
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
        orbitalRadiusPx={orbitalRadiusPx}
        onOrbitalRadiusChange={handleOrbitalRadiusChange}
        speedDegPerSec={speedDegPerSec}
        onSpeedChange={handleSpeedChange}
        direction={direction}
        onDirectionToggle={handleDirectionToggle}
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

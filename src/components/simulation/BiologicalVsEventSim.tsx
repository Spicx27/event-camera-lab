import { useCallback, useEffect, useRef, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { SceneModel, type MotionPattern, type OpticalPattern } from '@/sim/sceneModel'
import { EventEngine, type DvsEvent, type EventEngineStats, type EventLayerCounts } from '@/sim/eventEngine'
import { FrameEngine, type CapturedFrameRecord, type FrameEngineStats } from '@/sim/frameEngine'
import Scene3D from './Scene3D'
import DualSensorView from './DualSensorView'
import SimulationControls, { type SimulationMode } from './SimulationControls'
import SimulationMetrics from './SimulationMetrics'
import DynamicObservations from './DynamicObservations'
import GuidedComparison from './GuidedComparison'

export default function BiologicalVsEventSim() {
  // ── Mode: Beginner vs Advanced ──
  const [mode, setMode] = useState<SimulationMode>('beginner')

  // ── Sensor Resolution ──
  const [resolution, setResolution] = useState<64 | 128>(128)

  // ── Scene Parameters ──
  const [motionPattern, setMotionPattern] = useState<MotionPattern>('rotation')
  const [opticalPattern, setOpticalPattern] = useState<OpticalPattern>('siemens_star')
  const [speedDegPerSec, setSpeedDegPerSec] = useState<number>(600)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [illuminationLux, setIlluminationLux] = useState<number>(500)
  const [includeMovableSphere, setIncludeMovableSphere] = useState<boolean>(true)

  // ── Frame Camera Parameters ──
  const [fps, setFps] = useState<number>(30)
  const [exposureMs, setExposureMs] = useState<number>(20.0)

  // ── Event Camera Parameters ──
  const [thresholdC, setThresholdC] = useState<number>(0.25)
  const [accumulationMs, setAccumulationMs] = useState<number>(25)

  // ── Selected Pixel for Inspection ──
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number }>({
    x: 92, // ≈ 128 × 0.72
    y: 64, // ≈ 128 × 0.50
  })

  // ── Playback State ──
  const [isRunning, setIsRunning] = useState<boolean>(true)
  const [simClockMs, setSimClockMs] = useState<number>(0)

  // ── Live Display Buffers & Stats ──
  const [displayFrame, setDisplayFrame] = useState<Float32Array>(() => new Float32Array(128 * 128))
  const [recentCapturedFrames, setRecentCapturedFrames] = useState<CapturedFrameRecord[]>([])
  const [eventImageData, setEventImageData] = useState<ImageData | null>(null)
  const [onImageData, setOnImageData] = useState<ImageData | null>(null)
  const [offImageData, setOffImageData] = useState<ImageData | null>(null)
  const [layerCounts, setLayerCounts] = useState<EventLayerCounts>({
    totalActive: 0,
    onActive: 0,
    offActive: 0,
    overlapActive: 0,
  })
  const [eventCountInWindow, setEventCountInWindow] = useState<number>(0)
  const [accumulatedEvents, setAccumulatedEvents] = useState<DvsEvent[]>([])
  const [recentEventsList, setRecentEventsList] = useState<DvsEvent[]>([])
  const [sceneAngle, setSceneAngle] = useState<number>(0)
  const [scenePos, setScenePos] = useState<number>(0)
  const [sphereNorm, setSphereNorm] = useState<{ x: number; y: number }>({ x: 0.68, y: 0 })
  const [eventActivity, setEventActivity] = useState<boolean>(false)

  const [eventStats, setEventStats] = useState<EventEngineStats>({
    totalEvents: 0,
    onEvents: 0,
    offEvents: 0,
    eventRatePerSec: 0,
    simulatedTimeUs: 0,
  })

  const [frameStats, setFrameStats] = useState<FrameEngineStats>({
    frameCount: 0,
    currentFps: 30,
    exposureMs: 20.0,
    isExposing: true,
    totalSimTimeMs: 0,
  })

  // ── Engine Instances & Pre-allocated Typed Buffers ──
  const sceneRef = useRef<SceneModel>(new SceneModel())
  const eventEngineRef = useRef<EventEngine>(new EventEngine(128, 128, 0.25))
  const frameEngineRef = useRef<FrameEngine>(new FrameEngine(128, 128, 30, 20.0))
  // Viewpoint-specific intensity sampling buffers:
  const frameIntensityBufferRef = useRef<Float32Array>(new Float32Array(128 * 128))
  const eventIntensityBufferRef = useRef<Float32Array>(new Float32Array(128 * 128))
  // Direct reusable ImageData buffers for event canvas layers (zero GC pressure):
  const eventImageDataRef = useRef<ImageData>(new ImageData(128, 128))
  const onImageDataRef = useRef<ImageData>(new ImageData(128, 128))
  const offImageDataRef = useRef<ImageData>(new ImageData(128, 128))
  const simClockRef = useRef<number>(0)

  // ── Synchronize Engine Parameters ──
  useEffect(() => {
    sceneRef.current.params = {
      motionPattern,
      opticalPattern,
      speedDegPerSec,
      direction,
      illuminationLux,
      contrastRatio: 0.9,
      includeMovableSphere,
    }
  }, [motionPattern, opticalPattern, speedDegPerSec, direction, illuminationLux, includeMovableSphere])

  useEffect(() => {
    frameEngineRef.current.setSettings(fps, exposureMs)
  }, [fps, exposureMs])

  useEffect(() => {
    eventEngineRef.current.setThreshold(thresholdC)
  }, [thresholdC])

  useEffect(() => {
    eventEngineRef.current.setSelectedPixel(selectedPixel.x, selectedPixel.y)
  }, [selectedPixel])

  const handleResolutionChange = useCallback((newRes: 64 | 128) => {
    setResolution(newRes)
    eventEngineRef.current.setResolution(newRes, newRes)
    frameEngineRef.current.setResolution(newRes, newRes)
    frameIntensityBufferRef.current = new Float32Array(newRes * newRes)
    eventIntensityBufferRef.current = new Float32Array(newRes * newRes)
    eventImageDataRef.current = new ImageData(newRes, newRes)
    onImageDataRef.current = new ImageData(newRes, newRes)
    offImageDataRef.current = new ImageData(newRes, newRes)
    setDisplayFrame(new Float32Array(newRes * newRes))
    setEventImageData(null)
    setOnImageData(null)
    setOffImageData(null)
    setSelectedPixel({
      x: Math.floor(newRes * 0.72),
      y: Math.floor(newRes * 0.5),
    })
  }, [])

  // ── Deterministic Single Physics Step Function (for Step button) ──
  const performSimulationStep = useCallback(
    (stepDtMs: number) => {
      const dtSeconds = stepDtMs / 1000
      const dtMicroseconds = Math.round(stepDtMs * 1000)

      simClockRef.current += stepDtMs
      setSimClockMs(Math.round(simClockRef.current))

      const tickStartState = sceneRef.current.getInternalState()

      // 1. Advance optical scene
      sceneRef.current.update(dtSeconds)
      const postTickState = sceneRef.current.getInternalState()

      // 2. Step frame clock
      const frameCaptured = frameEngineRef.current.step(dtMicroseconds)

      if (frameCaptured) {
        const N_BLUR_SAMPLES = 8
        const expMs = frameEngineRef.current.exposureMs
        const subDtSec = (expMs / 1000) / N_BLUR_SAMPLES

        sceneRef.current.setInternalState(tickStartState)

        frameEngineRef.current.captureWithSubsampling(
          (subBuffer: Float32Array) => {
            sceneRef.current.update(subDtSec)
            sceneRef.current.sampleIntensityGrid(resolution, resolution, subBuffer, 'frame')
          },
          N_BLUR_SAMPLES
        )

        sceneRef.current.setInternalState(postTickState)
      }

      // 3. Step event camera from its right-rig viewpoint
      sceneRef.current.sampleIntensityGrid(
        resolution,
        resolution,
        eventIntensityBufferRef.current,
        'event'
      )
      const newEventsCount = eventEngineRef.current.step(
        eventIntensityBufferRef.current,
        dtMicroseconds
      )

      // 4. Update display buffers & state
      const layerMetrics = eventEngineRef.current.renderLayerImages(
        onImageDataRef.current,
        offImageDataRef.current,
        accumulationMs * 1000
      )
      eventEngineRef.current.renderAccumulatedImage(
        eventImageDataRef.current,
        accumulationMs * 1000
      )
      setLayerCounts(layerMetrics)
      setEventCountInWindow(layerMetrics.totalActive)
      setEventImageData(new ImageData(new Uint8ClampedArray(eventImageDataRef.current.data), resolution, resolution))
      setOnImageData(new ImageData(new Uint8ClampedArray(onImageDataRef.current.data), resolution, resolution))
      setOffImageData(new ImageData(new Uint8ClampedArray(offImageDataRef.current.data), resolution, resolution))
      setRecentEventsList(eventEngineRef.current.getRecentEvents(12))
      setDisplayFrame(new Float32Array(frameEngineRef.current.currentDisplayFrame))
      setRecentCapturedFrames([...frameEngineRef.current.getRecentFrames()])
      setSceneAngle(sceneRef.current.getAngle())
      setScenePos(sceneRef.current.getPosition())

      const sphereState = sceneRef.current.getSphereState()
      setSphereNorm({ x: sphereState.normX, y: sphereState.normY })

      setEventStats(eventEngineRef.current.getStats())
      setFrameStats(frameEngineRef.current.getStats())
      setEventActivity(newEventsCount > 0)
    },
    [resolution, accumulationMs]
  )

  // ── Playback Controls: Play, Pause, Stop, Step, Reset ──
  const handlePlay = useCallback(() => {
    setIsRunning(true)
  }, [])

  const handlePause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const handleStop = useCallback(() => {
    setIsRunning(false)
    simClockRef.current = 0
    setSimClockMs(0)
    sceneRef.current.reset()
    sceneRef.current.sampleIntensityGrid(resolution, resolution, frameIntensityBufferRef.current, 'frame')
    sceneRef.current.sampleIntensityGrid(resolution, resolution, eventIntensityBufferRef.current, 'event')
    eventEngineRef.current.reset(eventIntensityBufferRef.current)
    frameEngineRef.current.reset(frameIntensityBufferRef.current)
    eventEngineRef.current.renderAccumulatedImage(eventImageDataRef.current, accumulationMs * 1000)
    setDisplayFrame(new Float32Array(frameEngineRef.current.currentDisplayFrame))
    setEventImageData(new ImageData(new Uint8ClampedArray(eventImageDataRef.current.data), resolution, resolution))
    setRecentCapturedFrames([...frameEngineRef.current.getRecentFrames()])
    setEventCountInWindow(0)
    setAccumulatedEvents([])
    setRecentEventsList([])
    setSceneAngle(0)
    setScenePos(0)
    const sphereState = sceneRef.current.getSphereState()
    setSphereNorm({ x: sphereState.normX, y: sphereState.normY })
    setEventActivity(false)
    setEventStats(eventEngineRef.current.getStats())
    setFrameStats(frameEngineRef.current.getStats())
  }, [resolution, accumulationMs])

  const handleStep = useCallback(() => {
    setIsRunning(false)
    const stepInterval = Math.max(16, Math.round(1000 / fps))
    performSimulationStep(stepInterval)
  }, [fps, performSimulationStep])

  const handleReset = useCallback(() => {
    setIsRunning(true)
    simClockRef.current = 0
    setSimClockMs(0)
    setMode('beginner')
    setSpeedDegPerSec(600)
    setDirection(1)
    setMotionPattern('rotation')
    setOpticalPattern('siemens_star')
    setIncludeMovableSphere(true)
    setIlluminationLux(500)
    setFps(30)
    setExposureMs(20.0)
    setThresholdC(0.25)
    setAccumulationMs(25)
    handleResolutionChange(128)

    sceneRef.current.reset()
    sceneRef.current.params = {
      motionPattern: 'rotation',
      opticalPattern: 'siemens_star',
      speedDegPerSec: 600,
      direction: 1,
      illuminationLux: 500,
      contrastRatio: 0.9,
      includeMovableSphere: true,
    }
    sceneRef.current.sampleIntensityGrid(128, 128, frameIntensityBufferRef.current, 'frame')
    sceneRef.current.sampleIntensityGrid(128, 128, eventIntensityBufferRef.current, 'event')
    eventEngineRef.current.reset(eventIntensityBufferRef.current)
    frameEngineRef.current.reset(frameIntensityBufferRef.current)
    eventEngineRef.current.renderAccumulatedImage(eventImageDataRef.current, 25000)
    setDisplayFrame(new Float32Array(frameEngineRef.current.currentDisplayFrame))
    setEventImageData(new ImageData(new Uint8ClampedArray(eventImageDataRef.current.data), 128, 128))
    setRecentCapturedFrames([...frameEngineRef.current.getRecentFrames()])
    setEventCountInWindow(0)
    setAccumulatedEvents([])
    setRecentEventsList([])
    setSceneAngle(0)
    setScenePos(0)
    const sphereState = sceneRef.current.getSphereState()
    setSphereNorm({ x: sphereState.normX, y: sphereState.normY })
    setEventActivity(false)
  }, [handleResolutionChange])

  // ── Master Simulation Loop (requestAnimationFrame) ──
  useEffect(() => {
    let animId: number
    let lastRealTime = performance.now()
    let lastUiUpdate = performance.now()

    // Tracks the scene state at the START of each frame period for temporal supersampling
    let exposureStartState: { angle: number; sphereAngle: number; posNorm: number } | null = null

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop)
      const realDtMs = Math.min(33, now - lastRealTime)
      lastRealTime = now

      if (!isRunning) return

      const dtSeconds = realDtMs / 1000
      const dtMicroseconds = Math.round(realDtMs * 1000)

      simClockRef.current += realDtMs

      // 1. Save scene state at tick start
      const tickStartState = sceneRef.current.getInternalState()
      if (exposureStartState === null) {
        exposureStartState = tickStartState
      }

      // 2. Advance optical physical scene
      sceneRef.current.update(dtSeconds)
      const tickEndState = sceneRef.current.getInternalState()

      // 3. Step frame camera clock
      const frameCaptured = frameEngineRef.current.step(dtMicroseconds)

      if (frameCaptured) {
        // Temporal supersampling for CMOS exposure blur (8 sub-steps)
        const N_BLUR_SAMPLES = 8
        const exposureMs = frameEngineRef.current.exposureMs
        const subDtSeconds = (exposureMs / 1000) / N_BLUR_SAMPLES

        const postTickState = tickEndState

        // Rewind to exposure start
        sceneRef.current.setInternalState(exposureStartState ?? tickStartState)

        frameEngineRef.current.captureWithSubsampling(
          (subBuffer: Float32Array) => {
            sceneRef.current.update(subDtSeconds)
            // Sample strictly from the left-rig Frame Camera viewpoint
            sceneRef.current.sampleIntensityGrid(resolution, resolution, subBuffer, 'frame')
          },
          N_BLUR_SAMPLES
        )

        // Restore scene to true post-tick position
        sceneRef.current.setInternalState(postTickState)
        exposureStartState = postTickState
      }

      // 4. Step event camera: sampled strictly from the right-rig Event Camera viewpoint
      // Step ONCE per simulation tick, fully synchronized with simulation time
      sceneRef.current.sampleIntensityGrid(
        resolution,
        resolution,
        eventIntensityBufferRef.current,
        'event'
      )
      const newEventsCount = eventEngineRef.current.step(
        eventIntensityBufferRef.current,
        dtMicroseconds
      )

      // ── UI throttle to ~30–40 Hz or on frame capture to keep animations fluid ──
      if (now - lastUiUpdate >= 25 || frameCaptured) {
        lastUiUpdate = now
        setSimClockMs(Math.round(simClockRef.current))

        // Direct hardware render of the dual accumulated event layers
        const layerMetrics = eventEngineRef.current.renderLayerImages(
          onImageDataRef.current,
          offImageDataRef.current,
          accumulationMs * 1000
        )
        eventEngineRef.current.renderAccumulatedImage(
          eventImageDataRef.current,
          accumulationMs * 1000
        )
        setLayerCounts(layerMetrics)
        setEventCountInWindow(layerMetrics.totalActive)
        setEventImageData(new ImageData(new Uint8ClampedArray(eventImageDataRef.current.data), resolution, resolution))
        setOnImageData(new ImageData(new Uint8ClampedArray(onImageDataRef.current.data), resolution, resolution))
        setOffImageData(new ImageData(new Uint8ClampedArray(offImageDataRef.current.data), resolution, resolution))

        setRecentEventsList(eventEngineRef.current.getRecentEvents(12))
        setDisplayFrame(new Float32Array(frameEngineRef.current.currentDisplayFrame))
        setRecentCapturedFrames([...frameEngineRef.current.getRecentFrames()])
        setSceneAngle(sceneRef.current.getAngle())
        setScenePos(sceneRef.current.getPosition())

        const sphereState = sceneRef.current.getSphereState()
        setSphereNorm({ x: sphereState.normX, y: sphereState.normY })

        setEventStats(eventEngineRef.current.getStats())
        setFrameStats(frameEngineRef.current.getStats())
        setEventActivity(newEventsCount > 0)
      }
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [isRunning, resolution, accumulationMs])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Subtitle & Educational Overview Banner ── */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid var(--color-cyan)',
          background: 'rgba(6, 182, 212, 0.04)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-cyan)', marginBottom: '0.35rem' }}>
          <FlaskConical size={20} />
          <h2 style={{ fontSize: '1.15rem', margin: 0 }}>
            Frame-Based Camera vs Event-Based Camera: Seeing the Same World Differently
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 'none' }}>
          This university photonics experiment compares how a <strong>conventional frame-based CMOS camera</strong> (Slide 4) and an
          <strong> event-based neuromorphic vision sensor</strong> (Slides 2, 8, 9, 17) observe the exact same moving scene in real time.
          Manipulate the target speed from <em>Stationary (0°/s)</em> to <em>Extreme (&gt;1000°/s)</em> to examine how discrete frame
          exposure smear compares against asynchronous microsecond temporal edge tracking.
        </p>
      </div>

      {/* ── 3D Testbench + Parameter Controls (Side-by-Side) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Shared 3D Photonics Testbench */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>
              Shared 3D Optical Testbench
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {speedDegPerSec}°/s {direction === 1 ? 'CW' : 'CCW'}
            </span>
          </div>

          <Scene3D
            angleRad={sceneAngle}
            motionPattern={motionPattern}
            posNorm={scenePos}
            sphereNormX={sphereNorm.x}
            sphereNormY={sphereNorm.y}
            opticalPattern={opticalPattern}
            illuminationLux={illuminationLux}
            eventActivity={eventActivity}
            isExposing={frameStats.isExposing}
          />
        </div>

        {/* Right Column: Central Simulation & Optical Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>
              Simulation & Optical Controls
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {mode === 'beginner' ? 'Preset Guidance' : 'Full Parametric Control'}
            </span>
          </div>

          <SimulationControls
            mode={mode}
            setMode={setMode}
            speedDegPerSec={speedDegPerSec}
            setSpeedDegPerSec={setSpeedDegPerSec}
            direction={direction}
            setDirection={setDirection}
            motionPattern={motionPattern}
            setMotionPattern={setMotionPattern}
            opticalPattern={opticalPattern}
            setOpticalPattern={setOpticalPattern}
            includeMovableSphere={includeMovableSphere}
            setIncludeMovableSphere={setIncludeMovableSphere}
            illuminationLux={illuminationLux}
            setIlluminationLux={setIlluminationLux}
            fps={fps}
            setFps={setFps}
            exposureMs={exposureMs}
            setExposureMs={setExposureMs}
            thresholdC={thresholdC}
            setThresholdC={setThresholdC}
            accumulationMs={accumulationMs}
            setAccumulationMs={setAccumulationMs}
            resolution={resolution}
            setResolution={handleResolutionChange}
            isRunning={isRunning}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onStep={handleStep}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* ── Dual Synchronized Camera Viewports (Side by Side with Filmstrip) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>
            Synchronized Camera Sensor Outputs
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Left: Conventional Discrete Frames vs Right: Asynchronous Address-Events
          </span>
        </div>

        <DualSensorView
          width={resolution}
          height={resolution}
          frameBuffer={displayFrame}
          recentCapturedFrames={recentCapturedFrames}
          eventImageData={eventImageData}
          onImageData={onImageData}
          offImageData={offImageData}
          layerCounts={layerCounts}
          eventCount={eventCountInWindow}
          events={accumulatedEvents}
          fps={fps}
          exposureMs={exposureMs}
          isExposing={frameStats.isExposing}
          frameCount={frameStats.frameCount}
          simTimeMs={simClockMs}
          accumulationMs={accumulationMs}
          thresholdC={thresholdC}
          selectedPixel={selectedPixel}
          onSelectPixel={(x, y) => setSelectedPixel({ x, y })}
          recentEventsList={recentEventsList}
        />
      </div>

      {/* ── Dynamic "What Are You Seeing?" Observational Feedback ── */}
      <DynamicObservations
        speedDegPerSec={speedDegPerSec}
        fps={fps}
        exposureMs={exposureMs}
        thresholdC={thresholdC}
        illuminationLux={illuminationLux}
        eventCount={eventCountInWindow}
        eventRate={eventStats.eventRatePerSec}
      />

      {/* ── Advanced Mode Diagnostics: Quantitative Metrics ── */}
      {mode === 'advanced' && (
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Live Quantitative Engineering Metrics
          </div>
          <SimulationMetrics
            eventStats={eventStats}
            frameStats={frameStats}
            resolution={resolution}
            illuminationLux={illuminationLux}
            thresholdC={thresholdC}
          />
        </div>
      )}

      {/* ── Structured Comparison & Model Limitations Panel ── */}
      <GuidedComparison />
    </div>
  )
}

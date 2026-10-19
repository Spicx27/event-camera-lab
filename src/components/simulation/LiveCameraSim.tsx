import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Video,
  Activity,
  Zap,
  Layers,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { LiveCameraEventEngine, type LiveEngineMetrics } from '@/sim/liveCameraEventEngine'

type SourceMode = 'webcam' | 'file' | 'synthetic'

interface VideoDevice {
  deviceId: string
  label: string
}

export default function LiveCameraSim() {
  // ── Source Selection & Device State ──
  const [sourceMode, setSourceMode] = useState<SourceMode>('webcam')
  const [availableDevices, setAvailableDevices] = useState<VideoDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  // ── Playback & Execution Lifecycle ──
  const [isActive, setIsActive] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [hasStartedOnce, setHasStartedOnce] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start. Click "Start Camera" to begin.')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false)

  // ── Physical Parameters ──
  const [thresholdC, setThresholdC] = useState<number>(0.20)
  const [exposureEV, setExposureEV] = useState<number>(0.0)
  const [accumulationMs, setAccumulationMs] = useState<number>(40)
  const [resolutionPreset, setResolutionPreset] = useState<'160x120' | '240x180' | '320x240'>('160x120')
  const [hardwareExposureSupport, setHardwareExposureSupport] = useState<string>('Checking...')

  // ── UI Visibility & Accordions ──
  const [showExplanation, setShowExplanation] = useState<boolean>(true)
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false)

  // ── Live Quantitative Metrics (Updated at 5 Hz to protect React performance) ──
  const [metrics, setMetrics] = useState<LiveEngineMetrics>({
    processedFrames: 0,
    droppedFrames: 0,
    onEventsInWindow: 0,
    offEventsInWindow: 0,
    totalEventsInWindow: 0,
    instantaneousEventRate: 0,
    processingTimeMs: 0,
    sourceFps: 0,
    processingFps: 0,
  })

  // ── DOM References & Processing Pipeline ──
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const samplingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const syntheticCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Engine & Stream instances
  const engineRef = useRef<LiveCameraEventEngine>(new LiveCameraEventEngine({
    width: 160,
    height: 120,
    thresholdC: 0.20,
    exposureEV: 0.0,
    accumulationMs: 40,
  }))
  const streamRef = useRef<MediaStream | null>(null)
  const isProcessingRef = useRef<boolean>(false)
  const isPausedRef = useRef<boolean>(false)
  const isActiveRef = useRef<boolean>(false)
  const resolutionPresetRef = useRef<'160x120' | '240x180' | '320x240'>('160x120')
  const videoFrameCallbackIdRef = useRef<number | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const syntheticAnimIdRef = useRef<number | null>(null)
  const fileObjectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Synchronize state refs for the hot loop
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  useEffect(() => {
    resolutionPresetRef.current = resolutionPreset
  }, [resolutionPreset])

  // ── Resolution parser ──
  const getResolutionDimensions = useCallback((preset: '160x120' | '240x180' | '320x240') => {
    switch (preset) {
      case '160x120':
        return { w: 160, h: 120 }
      case '240x180':
        return { w: 240, h: 180 }
      case '320x240':
        return { w: 320, h: 240 }
    }
  }, [])

  // ── Enumerate available video input devices (Asynchronous on mount) ──
  useEffect(() => {
    let active = true
    const detectDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        if (active) setHardwareExposureSupport('Browser mediaDevices API not supported.')
        return
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!active) return
        const videoInputs = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d, index) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${index + 1}`,
          }))
        setAvailableDevices(videoInputs)
        if (videoInputs.length > 0) {
          setSelectedDeviceId((prev) => prev || videoInputs[0].deviceId)
        }
      } catch (err) {
        console.warn('Failed to enumerate media devices:', err)
      }
    }
    detectDevices()
    return () => {
      active = false
    }
  }, [])

  // ── Stop Camera Stream cleanly ──
  const stopMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      const video = videoRef.current
      video.pause()
      video.srcObject = null
      const videoWithCancel = video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }
      if (typeof videoWithCancel.cancelVideoFrameCallback === 'function' && videoFrameCallbackIdRef.current !== null) {
        videoWithCancel.cancelVideoFrameCallback(videoFrameCallbackIdRef.current)
        videoFrameCallbackIdRef.current = null
      }
    }
    if (videoFrameCallbackIdRef.current !== null) {
      videoFrameCallbackIdRef.current = null
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current)
      animFrameIdRef.current = null
    }
    if (syntheticAnimIdRef.current) {
      cancelAnimationFrame(syntheticAnimIdRef.current)
      syntheticAnimIdRef.current = null
    }
  }, [])

  // ── Core Frame Processing Loop ──
  const processCanvasFrame = useCallback(
    (sourceElement: CanvasImageSource, presentationTimeMs: number) => {
      if (isProcessingRef.current || isPausedRef.current || !isActiveRef.current) {
        return
      }

      if (sourceElement instanceof HTMLVideoElement) {
        if (
          sourceElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
          sourceElement.videoWidth === 0 ||
          sourceElement.videoHeight === 0
        ) {
          return
        }
      }

      const engine = engineRef.current
      const samplingCanvas = samplingCanvasRef.current
      const outputCanvas = outputCanvasRef.current
      if (!samplingCanvas || !outputCanvas) return

      const { w, h } = getResolutionDimensions(resolutionPresetRef.current)
      if (samplingCanvas.width !== w || samplingCanvas.height !== h) {
        samplingCanvas.width = w
        samplingCanvas.height = h
      }
      if (outputCanvas.width !== w || outputCanvas.height !== h) {
        outputCanvas.width = w
        outputCanvas.height = h
      }

      const sampleCtx = samplingCanvas.getContext('2d', { willReadFrequently: true })
      const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true })
      if (!sampleCtx || !outCtx) return

      isProcessingRef.current = true
      try {
        engine.recordSourceFrame()

        // 1. Downsample source frame into sampling canvas
        sampleCtx.drawImage(sourceElement, 0, 0, w, h)
        const frameData = sampleCtx.getImageData(0, 0, w, h)

        // 2. Compute event temporal contrast model
        engine.processFrame(frameData.data, presentationTimeMs)

        // 3. Blit event output buffer directly to the output canvas
        outCtx.putImageData(engine.outputImageData, 0, 0)
      } catch (err) {
        console.error('Frame processing exception:', err)
        engine.recordDroppedFrame()
      } finally {
        isProcessingRef.current = false
      }
    },
    [getResolutionDimensions]
  )

  // ── Video Frame Callback Scheduler ──
  const scheduleNextVideoFrame = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const videoWithCancel = video as HTMLVideoElement & {
      cancelVideoFrameCallback?: (id: number) => void
      requestVideoFrameCallback?: (callback: (now: number, metadata: { presentationTime: number }) => void) => number
    }

    // Cancel existing pending callback to prevent multiple overlapping loops
    if (typeof videoWithCancel.cancelVideoFrameCallback === 'function' && videoFrameCallbackIdRef.current !== null) {
      videoWithCancel.cancelVideoFrameCallback(videoFrameCallbackIdRef.current)
      videoFrameCallbackIdRef.current = null
    }
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current)
      animFrameIdRef.current = null
    }

    if (!isActiveRef.current) return

    if (typeof videoWithCancel.requestVideoFrameCallback === 'function') {
      const onVideoFrame = () => {
        if (!isActiveRef.current) return
        if (!isPausedRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          processCanvasFrame(video, performance.now())
        }
        if (isActiveRef.current) {
          videoFrameCallbackIdRef.current = videoWithCancel.requestVideoFrameCallback!(onVideoFrame)
        }
      }
      videoFrameCallbackIdRef.current = videoWithCancel.requestVideoFrameCallback(onVideoFrame)
    } else {
      const checkFrame = () => {
        if (!isActiveRef.current) return
        if (!isPausedRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          processCanvasFrame(video, performance.now())
        }
        if (isActiveRef.current) {
          animFrameIdRef.current = requestAnimationFrame(checkFrame)
        }
      }
      animFrameIdRef.current = requestAnimationFrame(checkFrame)
    }
  }, [processCanvasFrame])

  // ── Synthetic Motion Benchmark Generator ──
  const startSyntheticBenchmark = useCallback(() => {
    stopMediaStream()
    setErrorMessage(null)
    isActiveRef.current = true
    isPausedRef.current = false
    setIsActive(true)
    setIsPaused(false)
    setHasStartedOnce(true)
    setStatusMessage('Running Synthetic High-Speed Benchmark (Deterministic orbital motion).')

    // Create a 320x240 synthetic canvas
    const synCanvas = document.createElement('canvas')
    synCanvas.width = 320
    synCanvas.height = 240
    syntheticCanvasRef.current = synCanvas
    const ctx = synCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let angle = 0
    let lastT = performance.now()

    const renderSynthetic = (t: number) => {
      if (!isActiveRef.current) return
      const dt = (t - lastT) / 1000
      lastT = t

      if (!isPausedRef.current) {
        angle += dt * 4.0 // 4 rad/sec rotation
      }

      // Draw high-contrast synthetic test scene
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, 320, 240)

      // Fixed centre hub
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(160, 120, 65, 0, Math.PI * 2)
      ctx.stroke()

      // High-contrast orbiting dot
      const dotX = 160 + Math.cos(angle) * 65
      const dotY = 120 + Math.sin(angle) * 65

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(dotX, dotY, 18, 0, Math.PI * 2)
      ctx.fill()

      // Counter-moving small high-contrast bar
      const barX = 160 + Math.cos(-angle * 1.5) * 35
      const barY = 120 + Math.sin(-angle * 1.5) * 35
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.arc(barX, barY, 10, 0, Math.PI * 2)
      ctx.fill()

      // Process frame into event engine if not paused
      if (!isPausedRef.current) {
        processCanvasFrame(synCanvas, t)
      }

      syntheticAnimIdRef.current = requestAnimationFrame(renderSynthetic)
    }

    syntheticAnimIdRef.current = requestAnimationFrame(renderSynthetic)
  }, [processCanvasFrame, stopMediaStream])

  // ── Start Camera Stream (Triggered ONLY on explicit user click) ──
  const startCamera = useCallback(async () => {
    stopMediaStream()
    setErrorMessage(null)
    setPermissionDenied(false)
    setStatusMessage('Requesting camera permissions...')

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Browser does not support getUserMedia camera access. Please use Chrome, Edge, Firefox, or Safari over localhost/HTTPS, or switch to Upload Video mode.')
      setStatusMessage('Camera unsupported.')
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 60, max: 60 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Inspect hardware capabilities
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const capabilities = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : null
        // @ts-expect-error - exposureMode in extended media track capabilities
        if (capabilities && capabilities.exposureMode) {
          // @ts-expect-error - exposureMode in capabilities
          setHardwareExposureSupport(`Hardware exposure modes supported: ${capabilities.exposureMode.join(', ')}`)
        } else {
          setHardwareExposureSupport('Hardware exposure API unsupported by current webcam; using digital luminance compensation.')
        }
      }

      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = stream
        video.playsInline = true
        video.muted = true

        const onReady = () => {
          video
            .play()
            .then(() => {
              isActiveRef.current = true
              isPausedRef.current = false
              setIsActive(true)
              setIsPaused(false)
              setHasStartedOnce(true)
              setStatusMessage('Live Camera feed active. Processing asynchronous temporal events.')
              scheduleNextVideoFrame()
            })
            .catch((playErr) => {
              setErrorMessage(`Video autoplay blocked: ${playErr.message}. Click Play to resume.`)
            })
        }

        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          onReady()
        } else {
          video.onloadedmetadata = onReady
        }
      }
    } catch (err: unknown) {
      const error = err as Error
      console.error('Camera access error:', error)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true)
        setErrorMessage('Camera access was denied by the user. Please allow camera permissions in your browser address bar icon, or switch to "Upload Video" / "Synthetic Benchmark".')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera hardware found on this computer. You can use "Upload Video" or "Synthetic Benchmark" to run the simulation.')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another application (e.g. Zoom, Teams, or another tab). Close the other application and try again.')
      } else {
        setErrorMessage(`Camera initialisation failed: ${error.message || 'Unknown error'}. Try Upload Video mode.`)
      }
      setStatusMessage('Camera acquisition halted.')
      isActiveRef.current = false
      setIsActive(false)
    }
  }, [scheduleNextVideoFrame, selectedDeviceId, stopMediaStream])

  // ── File Upload Handler ──
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      stopMediaStream()
      setErrorMessage(null)
      setUploadedFileName(file.name)
      setStatusMessage(`Loading local video file: ${file.name}`)

      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current)
      }
      const objectUrl = URL.createObjectURL(file)
      fileObjectUrlRef.current = objectUrl

      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = null
        video.src = objectUrl
        video.loop = true
        video.muted = true
        video.playsInline = true

        const onReady = () => {
          video
            .play()
            .then(() => {
              isActiveRef.current = true
              isPausedRef.current = false
              setIsActive(true)
              setIsPaused(false)
              setHasStartedOnce(true)
              setStatusMessage(`Playing: ${file.name} (Looped). Processing events in real time.`)
              scheduleNextVideoFrame()
            })
            .catch((playErr) => {
              setErrorMessage(`Video playback error: ${playErr.message}`)
            })
        }

        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          onReady()
        } else {
          video.onloadedmetadata = onReady
        }
      }
    },
    [scheduleNextVideoFrame, stopMediaStream]
  )

  // ── Start / Resume Existing Video File ──
  const startVideoFile = useCallback(() => {
    if (fileObjectUrlRef.current && videoRef.current) {
      setErrorMessage(null)
      const video = videoRef.current
      video
        .play()
        .then(() => {
          isActiveRef.current = true
          isPausedRef.current = false
          setIsActive(true)
          setIsPaused(false)
          setHasStartedOnce(true)
          setStatusMessage(`Playing: ${uploadedFileName || 'video'} (Looped). Processing events in real time.`)
          scheduleNextVideoFrame()
        })
        .catch((playErr) => {
          setErrorMessage(`Video playback error: ${playErr.message}`)
        })
    } else {
      fileInputRef.current?.click()
    }
  }, [scheduleNextVideoFrame, uploadedFileName])

  // ── Pause / Resume Workflow ──
  const togglePause = useCallback(() => {
    if (!isActiveRef.current) return
    const newPaused = !isPausedRef.current
    isPausedRef.current = newPaused
    setIsPaused(newPaused)

    if (videoRef.current && sourceMode !== 'synthetic') {
      if (newPaused) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(console.warn)
      }
    }

    if (!newPaused) {
      // Synchronize reference on resume to avoid spurious event burst
      engineRef.current.reset()
      setStatusMessage('Simulation resumed.')
      if (sourceMode !== 'synthetic') {
        scheduleNextVideoFrame()
      }
    } else {
      setStatusMessage('Simulation paused. Event frame frozen.')
    }
  }, [scheduleNextVideoFrame, sourceMode])

  // ── Stop Simulation ──
  const stopSimulation = useCallback(() => {
    stopMediaStream()
    isActiveRef.current = false
    isPausedRef.current = false
    setIsActive(false)
    setIsPaused(false)
    engineRef.current.reset()
    if (outputCanvasRef.current) {
      const ctx = outputCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#050505'
        ctx.fillRect(0, 0, outputCanvasRef.current.width, outputCanvasRef.current.height)
      }
    }
    setStatusMessage('Simulation stopped. Resources released.')
  }, [stopMediaStream])

  // ── Reset Reference Baseline ──
  const resetReference = useCallback(() => {
    engineRef.current.reset()
    if (outputCanvasRef.current) {
      const ctx = outputCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#050505'
        ctx.fillRect(0, 0, outputCanvasRef.current.width, outputCanvasRef.current.height)
      }
    }
    setStatusMessage('Reference baseline reset. Events cleared.')
  }, [])

  // ── Parameter Change Handlers ──
  const handleThresholdChange = (newC: number) => {
    setThresholdC(newC)
    engineRef.current.setThreshold(newC)
  }

  const handleExposureChange = (newEV: number) => {
    setExposureEV(newEV)
    engineRef.current.setExposureEV(newEV, true)
  }

  const handleAccumulationChange = (newMs: number) => {
    setAccumulationMs(newMs)
    engineRef.current.setAccumulationMs(newMs)
  }

  const handleResolutionPresetChange = (preset: '160x120' | '240x180' | '320x240') => {
    setResolutionPreset(preset)
    const { w, h } = getResolutionDimensions(preset)
    engineRef.current.setResolution(w, h)
    resetReference()
  }

  // ── Metrics Throttling Timer (5 Hz) ──
  useEffect(() => {
    const timer = setInterval(() => {
      if (isActiveRef.current) {
        setMetrics(engineRef.current.getMetrics(performance.now()))
      }
    }, 200)

    return () => clearInterval(timer)
  }, [])

  // ── Auto-sync frame scheduler when active in video/webcam mode ──
  useEffect(() => {
    if (isActive && sourceMode !== 'synthetic') {
      scheduleNextVideoFrame()
    }
  }, [isActive, sourceMode, scheduleNextVideoFrame])

  // ── Cleanup on Unmount ──
  useEffect(() => {
    const video = videoRef.current
    return () => {
      stopMediaStream()
      if (video) {
        const videoWithCancel = video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }
        if (typeof videoWithCancel.cancelVideoFrameCallback === 'function' && videoFrameCallbackIdRef.current !== null) {
          videoWithCancel.cancelVideoFrameCallback(videoFrameCallbackIdRef.current)
        }
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
      if (syntheticAnimIdRef.current) {
        cancelAnimationFrame(syntheticAnimIdRef.current)
      }
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current)
        fileObjectUrlRef.current = null
      }
    }
  }, [stopMediaStream])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Header & Context Banner ─────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 30, 0.95) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge--cyan">SIMULATION 3</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Slide 9 Log-Contrast Formula: ΔL = ln(I_k) - L_ref = p·C
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', margin: 0, color: '#f8fafc', fontWeight: 700 }}>
              Live Event-Based Camera Simulator
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.86rem', color: 'var(--color-text-secondary)', maxWidth: '75ch' }}>
              Convert real-world camera video into neuromorphic asynchronous Address-Event Representation (AER) in real time.
              Pixels generate events strictly when logarithmic intensity changes exceed the contrast threshold.
            </p>
          </div>

          {/* Source Mode Selector Pills */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.9)',
              padding: '0.25rem',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              gap: '0.25rem',
            }}
          >
            <button
              onClick={() => {
                if (isActive) stopSimulation()
                setSourceMode('webcam')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: sourceMode === 'webcam' ? 'var(--color-cyan)' : 'transparent',
                color: sourceMode === 'webcam' ? '#050d1a' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <Camera size={14} />
              <span>Live Webcam</span>
            </button>

            <button
              onClick={() => {
                if (isActive) stopSimulation()
                setSourceMode('file')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: sourceMode === 'file' ? 'var(--color-cyan)' : 'transparent',
                color: sourceMode === 'file' ? '#050d1a' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <Upload size={14} />
              <span>Upload Video</span>
            </button>

            <button
              onClick={() => {
                if (isActive) stopSimulation()
                setSourceMode('synthetic')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: sourceMode === 'synthetic' ? 'var(--color-cyan)' : 'transparent',
                color: sourceMode === 'synthetic' ? '#050d1a' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={14} />
              <span>Synthetic Benchmark</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Device Selection Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.65rem',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          {/* Main Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!isActive ? (
              <button
                onClick={
                  sourceMode === 'synthetic'
                    ? startSyntheticBenchmark
                    : sourceMode === 'file'
                      ? startVideoFile
                      : startCamera
                }
                className="btn btn--primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                }}
              >
                <Play size={16} />
                <span>
                  {sourceMode === 'webcam'
                    ? 'Start Camera'
                    : sourceMode === 'file'
                      ? (uploadedFileName ? 'Play Video Feed' : 'Select & Play Video')
                      : 'Run Synthetic Benchmark'}
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  {isPaused ? <Play size={15} /> : <Pause size={15} />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={stopSimulation}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                  }}
                >
                  <span>Stop</span>
                </button>

                <button
                  onClick={resetReference}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.82rem',
                  }}
                  title="Reinitialises baseline reference intensities to clear residual event trails"
                >
                  <RotateCcw size={14} />
                  <span>Reset Baseline</span>
                </button>
              </>
            )}

            {/* Camera Device Dropdown (Webcam mode) */}
            {sourceMode === 'webcam' && availableDevices.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Camera size={14} style={{ color: 'var(--color-text-muted)' }} />
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value)
                    if (isActive) {
                      startCamera()
                    }
                  }}
                  disabled={isActive && isPaused}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: '#f3f4f6',
                    fontSize: '0.78rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: 6,
                    maxWidth: 220,
                  }}
                >
                  {availableDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* File Upload Selector (File mode) */}
            {sourceMode === 'file' && (
              <label
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <Video size={14} />
                <span>{uploadedFileName ? `Change: ${uploadedFileName.slice(0, 15)}...` : 'Select Local Video...'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {/* Status Message Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isActive ? (isPaused ? '#f59e0b' : '#10b981') : '#64748b',
                boxShadow: isActive && !isPaused ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
              {statusMessage}
            </span>
          </div>
        </div>

        {/* Error / Permission Alert */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.82rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Camera Acquisition Notice</div>
              <div>{errorMessage}</div>
              {permissionDenied && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setSourceMode('synthetic')
                      startSyntheticBenchmark()
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                  >
                    Run Synthetic Benchmark Instead
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Side-by-Side Visual Panels: Input vs Event Camera Output ─────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* LEFT PANEL: Input Video */}
        <div
          className="card"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* Panel Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Video size={16} style={{ color: 'var(--color-cyan)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                INPUT VIDEO (Conventional Optical Stream)
              </span>
            </div>
            <span
              style={{
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                padding: '0.12rem 0.4rem',
                borderRadius: 4,
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              {sourceMode === 'webcam' ? 'LIVE WEBCAM' : sourceMode === 'file' ? 'LOCAL FILE' : 'SYNTHETIC BENCH'}
            </span>
          </div>

          {/* Video Container (Preserves 4:3 Aspect Ratio) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              background: '#090d16',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: isActive && sourceMode !== 'synthetic' ? 1 : 0,
                pointerEvents: isActive && sourceMode !== 'synthetic' ? 'auto' : 'none',
                filter: `brightness(${Math.pow(2, exposureEV).toFixed(2)})`,
              }}
            />

            {/* Display message when idle or in synthetic mode */}
            {(!isActive || sourceMode === 'synthetic') && (
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                }}
              >
                {sourceMode === 'synthetic' && isActive ? (
                  <>
                    <Sparkles size={32} style={{ color: 'var(--color-cyan)', opacity: 0.9 }} />
                    <div style={{ fontSize: '0.84rem', color: '#f3f4f6', fontWeight: 600 }}>
                      Rendering High-Speed Synthetic Benchmark
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', maxWidth: '30ch' }}>
                      Deterministic orbital target moving at 4 rad/s to evaluate temporal event response.
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.86rem', color: '#e2e8f0', fontWeight: 600 }}>
                      {hasStartedOnce ? 'Camera feed stopped' : 'Camera stream waiting to start'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', maxWidth: '35ch' }}>
                      Click <strong>Start Camera</strong> above to enable your camera and begin real-time temporal event conversion.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Top-Left HUD Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '0.5rem',
                left: '0.5rem',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Eye size={11} style={{ color: 'var(--color-cyan)' }} />
              <span>FRAME CAM: {isActive ? `${metrics.sourceFps} FPS [Measured]` : 'STANDBY'}</span>
            </div>

            {/* Bottom-Right Exposure Compensation Tag */}
            <div
              style={{
                position: 'absolute',
                bottom: '0.5rem',
                right: '0.5rem',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                color: exposureEV !== 0 ? '#38bdf8' : '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              EV: {exposureEV > 0 ? `+${exposureEV.toFixed(1)}` : exposureEV.toFixed(1)} ({Math.pow(2, exposureEV).toFixed(2)}x)
            </div>
          </div>

          {/* Quick Info & Help Text */}
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Optical frames captured from the video stream are converted to logarithmic luminance and downsampled to the sensor resolution grid for asynchronous address-event evaluation.
          </div>
        </div>

        {/* RIGHT PANEL: Simulated Event Camera Output */}
        <div
          className="card"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: isActive ? '0 0 20px -5px rgba(6, 182, 212, 0.12)' : 'none',
          }}
        >
          {/* Panel Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Zap size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                SIMULATED EVENT CAMERA (Dual-Layer Polarity)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '0.12rem 0.4rem',
                  borderRadius: 4,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                {resolutionPreset} GRID
              </span>
            </div>
          </div>

          {/* Output Canvas (Preserves 4:3 Aspect Ratio) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              background: '#050505',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(6, 182, 212, 0.25)',
            }}
          >
            {/* The primary event rendering canvas */}
            <canvas
              ref={outputCanvasRef}
              width={160}
              height={120}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
              }}
            />

            {/* Hidden sampling canvas used for offscreen pixel downsampling */}
            <canvas ref={samplingCanvasRef} width={160} height={120} style={{ display: 'none' }} />

            {/* Inactive overlay */}
            {!isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(15, 23, 42, 0.88)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 8,
                  fontSize: '0.76rem',
                  color: 'var(--color-text-muted)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(4px)',
                  textAlign: 'center',
                  maxWidth: '80%',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                {hasStartedOnce
                  ? 'Simulation stopped. Press Play or select an input mode to resume.'
                  : 'Awaiting optical stream. Click "Start Camera", choose a video file, or run the synthetic benchmark.'}
              </div>
            )}

            {/* Sensor active motion hint */}
            {isActive && metrics.processedFrames > 0 && metrics.totalEventsInWindow === 0 && !isPaused && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(15, 23, 42, 0.92)',
                  padding: '0.55rem 0.95rem',
                  borderRadius: 8,
                  fontSize: '0.74rem',
                  color: '#93c5fd',
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                  backdropFilter: 'blur(6px)',
                  textAlign: 'center',
                  maxWidth: '85%',
                  pointerEvents: 'none',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Activity size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
                <span>
                  Sensor active ({metrics.processedFrames} frames evaluated). No motion detected — wave hand in front of camera or lower threshold C.
                </span>
              </div>
            )}

            {/* Top-Left HUD Overlay: Resolution & Processing FPS */}
            <div
              style={{
                position: 'absolute',
                top: '0.5rem',
                left: '0.5rem',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Activity size={11} style={{ color: '#34d399' }} />
              <span>EVENT BUS: {isActive ? `${metrics.processingFps} FPS [Measured]` : 'IDLE'}</span>
            </div>

            {/* Top-Right Latency Badge */}
            <div
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              Latency: {metrics.processingTimeMs} ms [Measured]
            </div>

            {/* Bottom Polarity Legend HUD */}
            <div
              style={{
                position: 'absolute',
                bottom: '0.5rem',
                left: '0.5rem',
                background: 'rgba(15, 23, 42, 0.9)',
                padding: '0.25rem 0.55rem',
                borderRadius: 4,
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#ffffff' }}>
                <span style={{ width: 7, height: 7, background: '#ffffff', borderRadius: '50%' }} />
                <span>+1 ON ({metrics.onEventsInWindow})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af' }}>
                <span style={{ width: 7, height: 7, background: '#878787', borderRadius: '50%' }} />
                <span>-1 OFF ({metrics.offEventsInWindow})</span>
              </div>
            </div>

            {/* Bottom-Right Window Duration */}
            <div
              style={{
                position: 'absolute',
                bottom: '0.5rem',
                right: '0.5rem',
                background: 'rgba(15, 23, 42, 0.9)',
                padding: '0.25rem 0.5rem',
                borderRadius: 4,
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              Δt: {accumulationMs} ms window
            </div>
          </div>

          {/* Quick Legend & Description */}
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Pure grayscale neuromorphic display: <strong>White (+1 ON)</strong> marks pixels with rising brightness; <strong>Grey (-1 OFF)</strong> marks dropping brightness. Overlapping events render White on top.
          </div>
        </div>
      </div>

      {/* ── Live Quantitative Performance & Scientific Metrics ───────────── */}
      <div
        className="card"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Cpu size={16} style={{ color: 'var(--color-cyan)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
              Live Quantitative Engineering Metrics
            </span>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Hardware Constraints &amp; Telemetry (Updated at 5 Hz)
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.6rem',
          }}
        >
          {/* Metric 1: Processing Latency */}
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.55rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>FRAME LATENCY</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {metrics.processingTimeMs} <span style={{ fontSize: '0.7rem' }}>ms</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>[Measured: CPU time]</div>
          </div>

          {/* Metric 2: Window Events */}
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.55rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>ACTIVE EVENTS</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {metrics.totalEventsInWindow.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>in Δt = {accumulationMs} ms</div>
          </div>

          {/* Metric 3: Event Throughput */}
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.55rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>EVENT RATE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {(metrics.instantaneousEventRate / 1000).toFixed(1)}k <span style={{ fontSize: '0.7rem' }}>ev/s</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>[Measured throughput]</div>
          </div>

          {/* Metric 4: Total Processed Frames */}
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.55rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>TOTAL FRAMES</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {metrics.processedFrames.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{metrics.droppedFrames} dropped [Measured]</div>
          </div>

          {/* Metric 5: Sensor Grid Resolution */}
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.55rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>SENSOR PIXELS</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {getResolutionDimensions(resolutionPreset).w * getResolutionDimensions(resolutionPreset).h / 1000}k
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{resolutionPreset} active grid</div>
          </div>

          {/* Metric 6: Contrast Sensitivity */}
          <div style={{ background: 'var(--color-bg-deep)', padding: '0.55rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>THRESHOLD C</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c084fc', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {thresholdC.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>ln(I) sensitivity [Dimensionless]</div>
          </div>
        </div>
      </div>

      {/* ── Interactive Parameter Controls ──────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sliders size={16} style={{ color: 'var(--color-cyan)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
              Event Generation &amp; Photonics Controls
            </span>
          </div>

          <button
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
            className="btn btn-secondary"
            style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <span>{showAdvancedParams ? 'Hide Sensor Grid Settings' : 'Show Sensor Grid Settings'}</span>
            {showAdvancedParams ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Primary Controls Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Control 1: Contrast Threshold (C) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>
                Contrast Threshold (C)
              </label>
              <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)', fontWeight: 700 }}>
                C = {thresholdC.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.06}
              max={0.60}
              step={0.01}
              value={thresholdC}
              onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-cyan)' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
              Lower threshold produces high event sensitivity to subtle edge motion; higher threshold suppresses optical noise and small lighting fluctuations.
            </div>
          </div>

          {/* Control 2: Digital Exposure Compensation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>
                Digital Exposure Compensation
              </label>
              <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>
                {exposureEV > 0 ? `+${exposureEV.toFixed(1)}` : exposureEV.toFixed(1)} EV ({Math.pow(2, exposureEV).toFixed(2)}x)
              </span>
            </div>
            <input
              type="range"
              min={-2.0}
              max={2.0}
              step={0.1}
              value={exposureEV}
              onChange={(e) => handleExposureChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
              Scales input video luminance mathematically before logarithmic contrast evaluation without introducing sudden false event bursts.
            </div>
          </div>

          {/* Control 3: Event Accumulation Window (Delta t) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>
                Event Accumulation Window (Δt)
              </label>
              <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#f59e0b', fontWeight: 700 }}>
                {accumulationMs} ms
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={accumulationMs}
              onChange={(e) => handleAccumulationChange(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
              Controls the persistence window for active events on the display canvas before they expire to background black.
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Hardware & Resolution Presets */}
        {showAdvancedParams && (
          <div
            style={{
              paddingTop: '0.85rem',
              borderTop: '1px solid rgba(148, 163, 184, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f3f4f6' }}>
                  Processing Resolution Grid
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>
                  Governs simulated silicon pixel density independently of input video quality.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['160x120', '240x180', '320x240'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => handleResolutionPresetChange(res)}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.3rem 0.65rem',
                      borderColor: resolutionPreset === res ? 'var(--color-cyan)' : 'var(--color-border)',
                      background: resolutionPreset === res ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      color: resolutionPreset === res ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
                      fontWeight: resolutionPreset === res ? 700 : 500,
                    }}
                  >
                    {res} {res === '160x120' ? '(High Speed)' : res === '240x180' ? '(Balanced)' : '(High Detail)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Hardware Status Note */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.7rem',
                color: '#94a3b8',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '0.35rem 0.65rem',
                borderRadius: 4,
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <ShieldCheck size={13} style={{ color: 'var(--color-cyan)' }} />
              <span>Camera Constraints Status: {hardwareExposureSupport}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Educational Grounding & Scientific Principles Accordion ──────── */}
      <div
        className="card"
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} style={{ color: 'var(--color-cyan)' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
              How Real-Time Live Event Simulation Works (Slide 9 &amp; Retinal Biology)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.72rem' }}>{showExplanation ? 'Collapse' : 'Expand Guide'}</span>
            {showExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showExplanation && (
          <div
            style={{
              padding: '0 1.25rem 1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              lineHeight: 1.5,
              borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              paddingTop: '1rem',
            }}
          >
            {/* Concept 1: Video Sampling & Luminance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>1. Frame Sampling &amp; Logarithmic Luminance</span>
              </div>
              <div>
                Incoming optical frames are downsampled to the configured sensor grid and converted into relative luminance via Rec.709 photometric coefficients (<code style={{ color: '#7dd3fc' }}>Y = 0.2126R + 0.7152G + 0.0722B</code>). An instantaneous 256-entry lookup table maps <code style={{ color: '#7dd3fc' }}>ln(I + ε)</code> in $O(1)$ CPU time.
              </div>
            </div>

            {/* Concept 2: Per-Pixel Reference Baseline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>2. Per-Pixel Reference Baseline (Slide 9)</span>
              </div>
              <div>
                Each pixel stores its own independent reference log-intensity <code style={{ color: '#7dd3fc' }}>L_ref(x,y)</code>. When a new frame arrives, the temporal change is evaluated: <code style={{ color: '#7dd3fc' }}>ΔL = ln(I_k) - L_ref</code>. If the scene is completely static, <code style={{ color: '#7dd3fc' }}>ΔL = 0</code> and exactly zero events are transmitted.
              </div>
            </div>

            {/* Concept 3: Asynchronous Address-Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>3. Asynchronous AER Polarity Generation</span>
              </div>
              <div>
                When brightness rises by <code style={{ color: '#7dd3fc' }}>ΔL ≥ +C</code>, a positive event (<code style={{ color: '#fff' }}>+1 ON, White</code>) is fired. When brightness drops by <code style={{ color: '#7dd3fc' }}>ΔL ≤ -C</code>, a negative event (<code style={{ color: '#9ca3af' }}>-1 OFF, Grey</code>) is fired. The reference baseline then advances by <code style={{ color: '#7dd3fc' }}>k · C</code>.
              </div>
            </div>

            {/* Concept 4: Software Model vs Silicon Reality */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>4. Software Approximation vs. Silicon DVS</span>
              </div>
              <div>
                This simulation is a <strong>software approximation</strong> running inside your browser. Physical silicon DVS sensors (e.g. Sony IMX636 or Prophesee GenX320) use analog continuous-time photodiode feedback loops and microsecond-level asynchronous arbiters rather than discrete video frames.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

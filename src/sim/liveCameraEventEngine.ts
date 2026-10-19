/**
 * Live Camera Event-Based Vision Engine
 * Real-time asynchronous temporal contrast sensing simulator for camera/video streams.
 *
 * Grounded in Slide 9 of EventVision Lab presentation:
 * - Logarithmic luminance: L(x, y, t) = ln(I(x, y, t) + ε)
 * - Contrast condition: ΔL = L(x, y, t_k) - L_ref(x, y)
 * - Threshold trigger: ΔL >= +C (ON event, +1), ΔL <= -C (OFF event, -1)
 * - Reference update: L_ref(x, y) += p * k * C
 * - Event representation: e_k = (x_k, y_k, t_k, p_k)
 *
 * Optimized for real-time 60 FPS browser execution with:
 * - Zero GC allocation in hot processing loop
 * - Pre-allocated TypedArray buffers (Float32Array, Float64Array, ImageData)
 * - 256-entry Log-Luminance Lookup Table (LUT) with digital exposure compensation
 * - Dual-layer accumulation rendering: Black background, Grey OFF, White ON (White on top)
 */

export interface LiveEngineMetrics {
  processedFrames: number
  droppedFrames: number
  onEventsInWindow: number
  offEventsInWindow: number
  totalEventsInWindow: number
  instantaneousEventRate: number
  processingTimeMs: number
  sourceFps: number
  processingFps: number
}

export interface LiveEngineSettings {
  width: number
  height: number
  thresholdC: number
  exposureEV: number
  accumulationMs: number
}

export class LiveCameraEventEngine {
  public width: number
  public height: number
  public thresholdC: number
  public exposureEV: number
  public accumulationMs: number

  // Core state buffers
  private refLogBuffer: Float32Array
  private onTimestampMap: Float64Array
  private offTimestampMap: Float64Array
  private isInitialized: boolean = false

  // Log-luminance Lookup Table (256-entry for 8-bit luma)
  private logLut: Float32Array = new Float32Array(256)

  // Reusable rendering buffers
  public outputImageData: ImageData

  // Metrics tracking
  private processedFrames: number = 0
  private droppedFrames: number = 0
  private onEventsAccumulated: number = 0
  private offEventsAccumulated: number = 0
  private lastProcTimeMs: number = 0

  // Frame rate counters
  private procFrameCount: number = 0
  private lastProcFpsTimestamp: number = 0
  private currentProcFps: number = 0

  private srcFrameCount: number = 0
  private lastSrcFpsTimestamp: number = 0
  private currentSrcFps: number = 0

  constructor(settings: Partial<LiveEngineSettings> = {}) {
    this.width = settings.width ?? 160
    this.height = settings.height ?? 120
    this.thresholdC = settings.thresholdC ?? 0.20
    this.exposureEV = settings.exposureEV ?? 0.0
    this.accumulationMs = settings.accumulationMs ?? 40

    const totalPixels = this.width * this.height
    this.refLogBuffer = new Float32Array(totalPixels)
    this.onTimestampMap = new Float64Array(totalPixels)
    this.offTimestampMap = new Float64Array(totalPixels)
    this.outputImageData = new ImageData(this.width, this.height)

    this.rebuildLut()
  }

  /**
   * Rebuilds the 256-entry logarithmic luminance lookup table
   * with digital exposure compensation scaling:
   * I_exp = clamp( (Y / 255) * 2^EV, 0.0001, 1.0 )
   * LUT[Y] = ln(I_exp)
   */
  public rebuildLut(): void {
    const scale = Math.pow(2, this.exposureEV)
    for (let y = 0; y < 256; y++) {
      // Offset by 1.0 to prevent ln(0) singularity and stabilize dark sensor noise
      const norm = ((y + 1.0) / 256.0) * scale
      const clamped = Math.max(0.001, Math.min(2.0, norm))
      this.logLut[y] = Math.log(clamped)
    }
  }

  /**
   * Updates resolution and reallocates typed arrays cleanly.
   */
  public setResolution(width: number, height: number): void {
    if (this.width === width && this.height === height) return
    this.width = width
    this.height = height
    const totalPixels = width * height
    this.refLogBuffer = new Float32Array(totalPixels)
    this.onTimestampMap = new Float64Array(totalPixels)
    this.offTimestampMap = new Float64Array(totalPixels)
    this.outputImageData = new ImageData(width, height)
    this.isInitialized = false
  }

  /**
   * Updates contrast threshold C without resetting state or causing event bursts.
   */
  public setThreshold(thresholdC: number): void {
    this.thresholdC = Math.max(0.04, Math.min(1.0, thresholdC))
  }

  /**
   * Updates digital exposure compensation factor and rebuilds LUT.
   * If resyncRef is true, synchronizes the reference buffer to prevent spurious false events.
   */
  public setExposureEV(exposureEV: number, resyncRef: boolean = true): void {
    this.exposureEV = Math.max(-3.0, Math.min(3.0, exposureEV))
    this.rebuildLut()
    if (resyncRef) {
      this.isInitialized = false
    }
  }

  /**
   * Updates event accumulation decay window (in ms).
   */
  public setAccumulationMs(ms: number): void {
    this.accumulationMs = Math.max(5, Math.min(250, ms))
  }

  /**
   * Resets the reference buffer and clears event history.
   */
  public reset(): void {
    this.refLogBuffer.fill(0)
    this.onTimestampMap.fill(0)
    this.offTimestampMap.fill(0)
    this.isInitialized = false
    this.processedFrames = 0
    this.droppedFrames = 0
    this.onEventsAccumulated = 0
    this.offEventsAccumulated = 0
    this.clearOutputImage()
  }

  /**
   * Clears the output image buffer to solid black.
   */
  public clearOutputImage(): void {
    const data = this.outputImageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 5       // R
      data[i + 1] = 5   // G
      data[i + 2] = 5   // B
      data[i + 3] = 255 // A
    }
  }

  public recordDroppedFrame(): void {
    this.droppedFrames++
  }

  public recordSourceFrame(): void {
    this.srcFrameCount++
    const now = performance.now()
    if (this.lastSrcFpsTimestamp === 0) {
      this.lastSrcFpsTimestamp = now
    } else if (now - this.lastSrcFpsTimestamp >= 1000) {
      this.currentSrcFps = Math.round((this.srcFrameCount * 1000) / (now - this.lastSrcFpsTimestamp))
      this.srcFrameCount = 0
      this.lastSrcFpsTimestamp = now
    }
  }

  /**
   * Main high-performance frame processing method.
   *
   * @param framePixels RGBA pixel data extracted from video downsample canvas (length = width * height * 4)
   * @param timestampMs Monotonic presentation timestamp of the video frame in milliseconds
   */
  public processFrame(framePixels: Uint8ClampedArray, timestampMs: number): void {
    const t0 = performance.now()
    const totalPixels = this.width * this.height
    const C = this.thresholdC
    const nowUs = timestampMs * 1000
    const cutoffUs = nowUs - (this.accumulationMs * 1000)

    let newOnEvents = 0
    let newOffEvents = 0

    // First frame initialization: capture initial logarithmic luminance as baseline
    if (!this.isInitialized) {
      for (let i = 0; i < totalPixels; i++) {
        const pIdx = i * 4
        // Rec.709 integer luma approximation: (2126*R + 7152*G + 722*B) / 10000
        const r = framePixels[pIdx]
        const g = framePixels[pIdx + 1]
        const b = framePixels[pIdx + 2]
        const y = (r * 54 + g * 183 + b * 19) >> 8
        this.refLogBuffer[i] = this.logLut[y]
        this.onTimestampMap[i] = 0
        this.offTimestampMap[i] = 0
      }
      this.isInitialized = true
      this.clearOutputImage()
      this.lastProcTimeMs = performance.now() - t0
      this.processedFrames++
      return
    }

    // Process brightness changes across all pixels
    const outputData = this.outputImageData.data

    // Visual Palette:
    // Background: Deep Black (5, 5, 5)
    // Layer 1 (OFF): Neutral Grey (135, 135, 135)
    // Layer 2 (ON): Pure White (255, 255, 255) — rendered ON TOP of Layer 1 (White wins on overlap)
    for (let i = 0; i < totalPixels; i++) {
      const pIdx = i * 4
      const r = framePixels[pIdx]
      const g = framePixels[pIdx + 1]
      const b = framePixels[pIdx + 2]
      const y = (r * 54 + g * 183 + b * 19) >> 8
      const currentLog = this.logLut[y]
      const refLog = this.refLogBuffer[i]

      const deltaL = currentLog - refLog

      // Temporal Contrast Condition: |ΔL| >= C
      if (deltaL >= C) {
        // Multi-crossing step quantization (capped at 5 to avoid runaways)
        const k = Math.min(5, Math.floor(deltaL / C))
        this.refLogBuffer[i] = refLog + (k * C)
        this.onTimestampMap[i] = nowUs
        newOnEvents += k
      } else if (deltaL <= -C) {
        const k = Math.min(5, Math.floor(-deltaL / C))
        this.refLogBuffer[i] = refLog - (k * C)
        this.offTimestampMap[i] = nowUs
        newOffEvents += k
      }

      // Render pixel into dual-layer accumulation map
      const tOn = this.onTimestampMap[i]
      const tOff = this.offTimestampMap[i]
      const hasOn = tOn >= cutoffUs && tOn > 0
      const hasOff = tOff >= cutoffUs && tOff > 0

      if (hasOn && (!hasOff || tOn >= tOff)) {
        // Layer 2: ON Event (White) - most recent or winning on overlap
        outputData[pIdx] = 255
        outputData[pIdx + 1] = 255
        outputData[pIdx + 2] = 255
        outputData[pIdx + 3] = 255
      } else if (hasOff) {
        // Layer 1: OFF Event (Grey)
        outputData[pIdx] = 135
        outputData[pIdx + 1] = 135
        outputData[pIdx + 2] = 135
        outputData[pIdx + 3] = 255
      } else {
        // Layer 0: Background (Dark Black)
        outputData[pIdx] = 5
        outputData[pIdx + 1] = 5
        outputData[pIdx + 2] = 5
        outputData[pIdx + 3] = 255
      }
    }

    this.onEventsAccumulated = newOnEvents
    this.offEventsAccumulated = newOffEvents
    this.processedFrames++
    this.lastProcTimeMs = performance.now() - t0

    // Track processing FPS
    this.procFrameCount++
    const now = performance.now()
    if (this.lastProcFpsTimestamp === 0) {
      this.lastProcFpsTimestamp = now
    } else if (now - this.lastProcFpsTimestamp >= 1000) {
      this.currentProcFps = Math.round((this.procFrameCount * 1000) / (now - this.lastProcFpsTimestamp))
      this.procFrameCount = 0
      this.lastProcFpsTimestamp = now
    }
  }

  /**
   * Counts active events in the current accumulation window.
   */
  public getActiveWindowCounts(nowMs: number): { onCount: number; offCount: number; totalCount: number } {
    const nowUs = nowMs * 1000
    const cutoffUs = nowUs - (this.accumulationMs * 1000)
    let onCount = 0
    let offCount = 0
    const totalPixels = this.width * this.height

    for (let i = 0; i < totalPixels; i++) {
      if (this.onTimestampMap[i] >= cutoffUs && this.onTimestampMap[i] > 0) onCount++
      if (this.offTimestampMap[i] >= cutoffUs && this.offTimestampMap[i] > 0) offCount++
    }
    return {
      onCount,
      offCount,
      totalCount: onCount + offCount,
    }
  }

  public getMetrics(nowMs: number): LiveEngineMetrics {
    const counts = this.getActiveWindowCounts(nowMs)
    const instantRate = Math.round(
      ((this.onEventsAccumulated + this.offEventsAccumulated) / Math.max(0.001, this.lastProcTimeMs / 1000))
    )

    return {
      processedFrames: this.processedFrames,
      droppedFrames: this.droppedFrames,
      onEventsInWindow: counts.onCount,
      offEventsInWindow: counts.offCount,
      totalEventsInWindow: counts.totalCount,
      instantaneousEventRate: Math.max(0, instantRate),
      processingTimeMs: Number(this.lastProcTimeMs.toFixed(2)),
      sourceFps: this.currentSrcFps > 0 ? this.currentSrcFps : 30,
      processingFps: this.currentProcFps > 0 ? this.currentProcFps : (this.processedFrames > 0 ? 30 : 0),
    }
  }
}

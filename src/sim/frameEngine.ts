/**
 * Conventional Frame-Based Camera Simulator
 * Grounded in Slides 4 & 17 of the Canva presentation:
 * - Fixed frame interval T_frame = 1 / FPS (e.g. 16.7 ms at 60 fps, 66.7 ms at 15 fps)
 * - Exposure time T_exposure <= T_frame
 * - Temporal aliasing (Nyquist limit = FPS / 2)
 * - Shutter smear / motion blur modeled by integrating scene luminance during exposure window
 * - Blind intervals between consecutive exposure periods
 * - Dynamic range saturation (~60 dB typical CMOS ceiling, Slide 4 & 26)
 * - Recent-frame history (filmstrip sequence) demonstrating discrete captured images
 */

export interface CapturedFrameRecord {
  frameIndex: number
  timestampMs: number
  buffer: Float32Array
}

export interface FrameEngineStats {
  frameCount: number
  currentFps: number
  exposureMs: number
  isExposing: boolean
  totalSimTimeMs: number
}

export class FrameEngine {
  public width: number
  public height: number
  public fps: number            // Frame rate in Hz (e.g. 5, 15, 30, 60)
  public exposureMs: number     // Exposure duration in milliseconds
  public dynamicRangeDb: number // ~60 dB standard CMOS baseline (Slide 4)

  // Frame buffers
  public currentDisplayFrame: Float32Array
  private exposureAccumulator: Float32Array

  // Recent captured frames filmstrip history (last 4 frames)
  public recentCapturedFrames: CapturedFrameRecord[] = []
  private maxRecentFrames: number = 4

  // Timing state (in microseconds)
  private timeSinceLastFrameUs: number = 0
  private totalSimTimeUs: number = 0
  private frameCount: number = 0
  private isExposing: boolean = true

  constructor(
    width: number = 64,
    height: number = 64,
    fps: number = 30,
    exposureMs: number = 20.0
  ) {
    this.width = width
    this.height = height
    this.fps = fps
    this.exposureMs = Math.min(exposureMs, 1000 / fps)
    this.dynamicRangeDb = 60

    this.currentDisplayFrame = new Float32Array(width * height)
    this.exposureAccumulator = new Float32Array(width * height)
  }

  public setResolution(width: number, height: number): void {
    if (this.width === width && this.height === height) return
    this.width = width
    this.height = height
    this.currentDisplayFrame = new Float32Array(width * height)
    this.exposureAccumulator = new Float32Array(width * height)
    this.recentCapturedFrames = []
    this.reset()
  }

  public setSettings(fps: number, exposureMs: number): void {
    this.fps = Math.max(5, Math.min(60, fps))
    const maxExposure = 1000 / this.fps
    this.exposureMs = Math.max(1, Math.min(maxExposure, exposureMs))
  }

  public reset(initialIntensities?: Float32Array | Uint8Array): void {
    this.frameCount = 0
    this.timeSinceLastFrameUs = 0
    this.totalSimTimeUs = 0
    this.isExposing = true
    this.exposureAccumulator.fill(0)
    this.recentCapturedFrames = []

    if (initialIntensities && initialIntensities.length === this.width * this.height) {
      for (let i = 0; i < this.currentDisplayFrame.length; i++) {
        const val = initialIntensities[i]
        this.currentDisplayFrame[i] = val > 1 ? val / 255 : val
      }
      // Seed first initial frame
      this.recentCapturedFrames.push({
        frameIndex: 0,
        timestampMs: 0,
        buffer: new Float32Array(this.currentDisplayFrame),
      })
    } else {
      this.currentDisplayFrame.fill(0)
    }
  }

  /**
   * Advances the frame camera timing clock by dtUs.
   * Tracks shutter-open / blind-interval state and returns true when a frame period ends.
   *
   * IMPORTANT: This method no longer accumulates exposure internally.
   * Exposure integration with temporal supersampling is handled by the calling
   * orchestrator (BiologicalVsEventSim) via captureWithSubsampling().
   *
   * @param dtUs Microseconds elapsed in this animation step
   * @returns boolean true if a frame clock boundary was crossed (frame is due)
   */
  public step(dtUs: number): boolean {
    const framePeriodUs = 1_000_000 / this.fps
    const exposureWindowUs = this.exposureMs * 1000

    this.totalSimTimeUs += dtUs
    this.timeSinceLastFrameUs += dtUs

    this.isExposing = this.timeSinceLastFrameUs <= exposureWindowUs

    if (this.timeSinceLastFrameUs >= framePeriodUs) {
      this.timeSinceLastFrameUs -= framePeriodUs
      return true
    }

    return false
  }

  /**
   * Called by the orchestrator each time step() returns true (frame boundary crossed).
   *
   * Temporal supersampling (motion blur approximation):
   * - `samplerFn` is called exactly `numSamples` times, each time filling `subBuffer`
   *   with the scene intensities at one sub-position within the exposure window.
   * - The results are averaged to produce a believable motion-smear image.
   * - This is an APPROXIMATION of real shutter integration, not a physically exact model.
   *   It is clearly labelled as such in the UI.
   *
   * @param samplerFn   Callback that fills the provided Float32Array with scene intensities
   *                    for one temporal sub-step. Called numSamples times.
   * @param numSamples  Number of sub-samples. 1 = no blur; 8–16 = convincing blur.
   */
  public captureWithSubsampling(
    samplerFn: (subBuffer: Float32Array) => void,
    numSamples: number
  ): void {
    const totalPixels = this.width * this.height
    this.exposureAccumulator.fill(0)

    // Accumulate sub-samples
    const subBuffer = new Float32Array(totalPixels)
    const n = Math.max(1, numSamples)
    for (let s = 0; s < n; s++) {
      samplerFn(subBuffer)
      for (let i = 0; i < totalPixels; i++) {
        this.exposureAccumulator[i] += subBuffer[i]
      }
    }

    // Average and finalise the display frame
    this.frameCount++
    for (let i = 0; i < totalPixels; i++) {
      let integrated = this.exposureAccumulator[i] / n

      // Apply ~60 dB dynamic range saturation (Slide 4 full-well capacity)
      if (integrated > 0.95) integrated = 1.0
      if (integrated < 0.02) integrated = 0.0

      this.currentDisplayFrame[i] = integrated
      this.exposureAccumulator[i] = 0
    }

    // Append to filmstrip history
    this.recentCapturedFrames.push({
      frameIndex: this.frameCount,
      timestampMs: Math.round(this.totalSimTimeUs / 1000),
      buffer: new Float32Array(this.currentDisplayFrame),
    })

    if (this.recentCapturedFrames.length > this.maxRecentFrames) {
      this.recentCapturedFrames.shift()
    }
  }

  public getRecentFrames(): CapturedFrameRecord[] {
    return this.recentCapturedFrames
  }

  public getStats(): FrameEngineStats {
    return {
      frameCount: this.frameCount,
      currentFps: this.fps,
      exposureMs: this.exposureMs,
      isExposing: this.isExposing,
      totalSimTimeMs: Math.round(this.totalSimTimeUs / 1000),
    }
  }
}

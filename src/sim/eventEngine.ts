/**
 * Deterministic Event-Based Vision Generation Engine
 * Grounded in Slide 9 of the Canva presentation:
 * - Logarithmic luminance: L(x, y, t) = ln(I(x, y, t))
 * - Contrast condition: L(x, y, t_k) - L(x, y, t_last) = p * C
 * - Event tuple: e_k = (x_k, y_k, t_k, p_k) where p ∈ {+1, -1}
 * - Timestamp t in microseconds (µs)
 */

export type PolarityFilter = 'all' | 'on' | 'off'

export interface DvsEvent {
  x: number        // pixel x coordinate [0, width - 1]
  y: number        // pixel y coordinate [0, height - 1]
  t: number        // timestamp in microseconds (µs)
  p: 1 | -1        // polarity: +1 (ON / Brighter), -1 (OFF / Darker)
}

export interface PixelSample {
  timeMs: number
  intensity: number
  logIntensity: number
  refLogIntensity: number
  spike: 1 | -1 | 0
}

export interface EventEngineStats {
  totalEvents: number
  onEvents: number
  offEvents: number
  eventRatePerSec: number
  simulatedTimeUs: number
}

export interface EventLayerCounts {
  totalActive: number
  onActive: number
  offActive: number
  overlapActive: number
}

export class EventEngine {
  public width: number
  public height: number
  public threshold: number // Contrast threshold C (e.g. 0.15 - 0.40)
  public minIntensity: number // To avoid ln(0)

  // Sensor state buffers
  private refLogBuffer: Float32Array
  private lastTimestampBuffer: Float64Array
  private eventPolarityMap: Int8Array
  private eventTimestampMap: Float64Array

  // Dual event layers: Layer 2 ON (+1, White) and Layer 1 OFF (-1, Grey)
  private onTimestampMap: Float64Array
  private offTimestampMap: Float64Array

  private isInitialized: boolean = false

  // High-performance bounded AER tuple ring buffer (only for inspector/ticker, no unbounded allocations)
  private recentEventsRing: DvsEvent[] = []
  private maxRecentEvents: number = 50
  private recentEventsHead: number = 0

  // Bounded event stream history for Simulation 2 (3D Event Stream & Data Lab)
  private streamHistoryBuffer: DvsEvent[] = []
  private maxStreamHistory: number = 35000
  private streamHistoryHead: number = 0

  // Metrics
  private totalEvents: number = 0
  private onEvents: number = 0
  private offEvents: number = 0
  private currentSimTimeUs: number = 0
  private eventsInLastSecond: number = 0
  private rateTrackingWindowUs: number = 0

  // Selected pixel inspection
  private selectedX: number
  private selectedY: number
  private pixelHistory: PixelSample[] = []
  private maxPixelHistory: number = 120

  constructor(width: number = 64, height: number = 64, threshold: number = 0.25) {
    this.width = width
    this.height = height
    this.threshold = threshold
    this.minIntensity = 0.001 // minimum illumination floor

    this.refLogBuffer = new Float32Array(width * height)
    this.lastTimestampBuffer = new Float64Array(width * height)
    this.eventPolarityMap = new Int8Array(width * height)
    this.eventTimestampMap = new Float64Array(width * height)
    this.onTimestampMap = new Float64Array(width * height)
    this.offTimestampMap = new Float64Array(width * height)

    this.selectedX = Math.floor(width / 2)
    this.selectedY = Math.floor(height / 2)
  }

  public setResolution(width: number, height: number): void {
    if (this.width === width && this.height === height) return
    this.width = width
    this.height = height
    this.refLogBuffer = new Float32Array(width * height)
    this.lastTimestampBuffer = new Float64Array(width * height)
    this.eventPolarityMap = new Int8Array(width * height)
    this.eventTimestampMap = new Float64Array(width * height)
    this.onTimestampMap = new Float64Array(width * height)
    this.offTimestampMap = new Float64Array(width * height)
    this.isInitialized = false
    this.selectedX = Math.floor(width / 2)
    this.selectedY = Math.floor(height / 2)
    this.reset()
  }

  public setThreshold(c: number): void {
    this.threshold = Math.max(0.02, Math.min(1.0, c))
  }

  public setSelectedPixel(x: number, y: number): void {
    this.selectedX = Math.max(0, Math.min(this.width - 1, Math.round(x)))
    this.selectedY = Math.max(0, Math.min(this.height - 1, Math.round(y)))
    this.pixelHistory = []
  }

  public getSelectedPixel(): { x: number; y: number } {
    return { x: this.selectedX, y: this.selectedY }
  }

  public reset(initialIntensities?: Float32Array | Uint8Array): void {
    this.recentEventsRing = []
    this.recentEventsHead = 0
    this.totalEvents = 0
    this.onEvents = 0
    this.offEvents = 0
    this.currentSimTimeUs = 0
    this.eventsInLastSecond = 0
    this.rateTrackingWindowUs = 0
    this.pixelHistory = []
    this.eventPolarityMap.fill(0)
    this.eventTimestampMap.fill(0)
    this.onTimestampMap.fill(0)
    this.offTimestampMap.fill(0)
    this.streamHistoryBuffer = []
    this.streamHistoryHead = 0

    if (initialIntensities && initialIntensities.length === this.width * this.height) {
      for (let i = 0; i < this.refLogBuffer.length; i++) {
        const raw = initialIntensities[i]
        const I = Math.max(this.minIntensity, typeof raw === 'number' ? raw : raw / 255)
        this.refLogBuffer[i] = Math.log(I)
        this.lastTimestampBuffer[i] = 0
      }
      this.isInitialized = true
    } else {
      this.refLogBuffer.fill(0)
      this.lastTimestampBuffer.fill(0)
      this.isInitialized = false
    }
  }

  /**
   * Resynchronizes the per-pixel reference log-luminance buffer to current scene intensities
   * without emitting events. Used when physical parameters (like dot size, orbit radius, or threshold)
   * change, preventing spurious non-physical teleportation events.
   */
  public syncReferenceToIntensities(intensities: Float32Array | Uint8Array): void {
    const totalPixels = this.width * this.height
    for (let i = 0; i < totalPixels; i++) {
      const raw = intensities[i]
      const I = Math.max(this.minIntensity, typeof raw === 'number' ? (raw > 1 ? raw / 255 : raw) : raw / 255)
      this.refLogBuffer[i] = Math.log(I)
    }
  }

  /**
   * Processes a new frame of continuous light intensities from the scene.
   * High-performance, zero-allocation implementation: updates typed arrays directly
   * and populates a small, bounded ring buffer for AER tuple streaming.
   *
   * @param intensities Array of size width * height (normalized 0..1 or 0..255)
   * @param dtUs Elapsed simulation step in microseconds (e.g. 16666 µs for ~60 Hz simulation loop)
   * @returns number of new events generated in this step
   */
  public step(
    intensities: Float32Array | Uint8Array,
    dtUs: number,
    dirtyBBox?: { minX: number; minY: number; maxX: number; maxY: number },
    exactSimTimeUs?: number
  ): number {
    if (exactSimTimeUs !== undefined) {
      this.currentSimTimeUs = exactSimTimeUs
    } else {
      this.currentSimTimeUs += dtUs
    }
    const totalPixels = this.width * this.height
    const C = this.threshold
    let newEventsCount = 0

    // Initial pass initialization
    if (!this.isInitialized) {
      for (let i = 0; i < totalPixels; i++) {
        const raw = intensities[i]
        const I = Math.max(this.minIntensity, raw > 1 ? raw / 255 : raw)
        this.refLogBuffer[i] = Math.log(I)
        this.lastTimestampBuffer[i] = this.currentSimTimeUs
        this.eventTimestampMap[i] = 0
        this.eventPolarityMap[i] = 0
        this.onTimestampMap[i] = 0
        this.offTimestampMap[i] = 0
      }
      this.isInitialized = true
      return 0
    }

    let selectedPixelSpike: 1 | -1 | 0 = 0
    const selectedIdx = this.selectedY * this.width + this.selectedX

    const minX = dirtyBBox ? Math.max(0, dirtyBBox.minX) : 0
    const maxX = dirtyBBox ? Math.min(this.width - 1, dirtyBBox.maxX) : this.width - 1
    const minY = dirtyBBox ? Math.max(0, dirtyBBox.minY) : 0
    const maxY = dirtyBBox ? Math.min(this.height - 1, dirtyBBox.maxY) : this.height - 1

    for (let y = minY; y <= maxY; y++) {
      const rowOffset = y * this.width
      for (let x = minX; x <= maxX; x++) {
        const idx = rowOffset + x
        const raw = intensities[idx]
        const I = Math.max(this.minIntensity, raw > 1 ? raw / 255 : raw)
        const L = Math.log(I)
        const Lref = this.refLogBuffer[idx]
        const deltaL = L - Lref

        // Check contrast threshold crossing: |ΔL| >= C (Slide 9)
        if (deltaL >= C) {
          // Positive events (ON): intensity increased (Layer 2, White)
          const numEvents = Math.min(8, Math.floor(deltaL / C))
          const eventTime = Math.round(this.currentSimTimeUs)

          this.onEvents += numEvents
          this.totalEvents += numEvents
          newEventsCount += numEvents
          this.refLogBuffer[idx] += C * numEvents
          this.lastTimestampBuffer[idx] = eventTime
          this.eventPolarityMap[idx] = 1
          this.eventTimestampMap[idx] = eventTime
          this.onTimestampMap[idx] = eventTime

          // Add a sample to recent events ring for AER tuple inspection (bounded)
          if (this.recentEventsRing.length < this.maxRecentEvents) {
            this.recentEventsRing.push({ x, y, t: eventTime, p: 1 })
          } else {
            this.recentEventsRing[this.recentEventsHead % this.maxRecentEvents] = { x, y, t: eventTime, p: 1 }
            this.recentEventsHead++
          }

          // Retain for 3D Event Stream & Data Lab (Simulation 2)
          // Distribute timestamps across step duration dtUs for continuous spatiotemporal trajectory
          const stepStartUs = this.currentSimTimeUs - dtUs
          for (let k = 0; k < numEvents; k++) {
            const interpolatedTime = Math.round(stepStartUs + ((k + 0.5) / numEvents) * dtUs)
            if (this.streamHistoryBuffer.length < this.maxStreamHistory) {
              this.streamHistoryBuffer.push({ x, y, t: interpolatedTime, p: 1 })
            } else {
              this.streamHistoryBuffer[this.streamHistoryHead % this.maxStreamHistory] = { x, y, t: interpolatedTime, p: 1 }
              this.streamHistoryHead++
            }
          }

          if (idx === selectedIdx && selectedPixelSpike === 0) {
            selectedPixelSpike = 1
          }
        } else if (deltaL <= -C) {
          // Negative events (OFF): intensity decreased (Layer 1, Grey)
          const numEvents = Math.min(8, Math.floor(Math.abs(deltaL) / C))
          const eventTime = Math.round(this.currentSimTimeUs)

          this.offEvents += numEvents
          this.totalEvents += numEvents
          newEventsCount += numEvents
          this.refLogBuffer[idx] -= C * numEvents
          this.lastTimestampBuffer[idx] = eventTime
          this.eventPolarityMap[idx] = -1
          this.eventTimestampMap[idx] = eventTime
          this.offTimestampMap[idx] = eventTime

          // Add a sample to recent events ring for AER tuple inspection (bounded)
          if (this.recentEventsRing.length < this.maxRecentEvents) {
            this.recentEventsRing.push({ x, y, t: eventTime, p: -1 })
          } else {
            this.recentEventsRing[this.recentEventsHead % this.maxRecentEvents] = { x, y, t: eventTime, p: -1 }
            this.recentEventsHead++
          }

          // Retain for 3D Event Stream & Data Lab (Simulation 2)
          // Distribute timestamps across step duration dtUs for continuous spatiotemporal trajectory
          const stepStartUs = this.currentSimTimeUs - dtUs
          for (let k = 0; k < numEvents; k++) {
            const interpolatedTime = Math.round(stepStartUs + ((k + 0.5) / numEvents) * dtUs)
            if (this.streamHistoryBuffer.length < this.maxStreamHistory) {
              this.streamHistoryBuffer.push({ x, y, t: interpolatedTime, p: -1 })
            } else {
              this.streamHistoryBuffer[this.streamHistoryHead % this.maxStreamHistory] = { x, y, t: interpolatedTime, p: -1 }
              this.streamHistoryHead++
            }
          }

          if (idx === selectedIdx && selectedPixelSpike === 0) {
            selectedPixelSpike = -1
          }
        }
      }
    }

    // Update rate metrics
    this.eventsInLastSecond += newEventsCount
    this.rateTrackingWindowUs += dtUs
    if (this.rateTrackingWindowUs >= 1000000) {
      // 1 second elapsed
      this.rateTrackingWindowUs = 0
      this.eventsInLastSecond = newEventsCount
    }

    // Record selected pixel history (bounded, for PixelInspector)
    if (selectedIdx < totalPixels) {
      const raw = intensities[selectedIdx]
      const I = Math.max(this.minIntensity, raw > 1 ? raw / 255 : raw)
      const L = Math.log(I)
      const Lref = this.refLogBuffer[selectedIdx]

      this.pixelHistory.push({
        timeMs: Math.round(this.currentSimTimeUs / 1000),
        intensity: Number(I.toFixed(3)),
        logIntensity: Number(L.toFixed(3)),
        refLogIntensity: Number(Lref.toFixed(3)),
        spike: selectedPixelSpike,
      })

      if (this.pixelHistory.length > this.maxPixelHistory) {
        this.pixelHistory.shift()
      }
    }

    return newEventsCount
  }

  /**
   * Dual-Layer Event Camera ImageData Renderer:
   * Renders the event camera output with two distinct layers:
   * - Layer 1 (Base): Event OFF (-1, darker) rendered as GREY (RGB 130, 130, 130).
   * - Layer 2 (Top):  Event ON (+1, brighter) rendered as WHITE (RGB 255, 255, 255).
   *
   * OVERLAP RULE: If both an ON and OFF event occurred within the accumulation window
   * at the same pixel (overlap), the White ON layer is rendered on top of the Grey OFF layer.
   *
   * Unchanged/silent pixels are rendered with the dark testbench background (#050d1a).
   */
  public renderAccumulatedImage(
    imgData: ImageData,
    windowUs: number,
    layerMode: 'all' | 'on' | 'off' = 'all'
  ): EventLayerCounts {
    const cutoff = this.currentSimTimeUs - windowUs
    const data = imgData.data
    const totalPixels = this.width * this.height

    let onActive = 0
    let offActive = 0
    let overlapActive = 0
    let totalActive = 0

    // Background color: #050d1a (Deep silent photonics sensor substrate)
    const bgR = 5
    const bgG = 13
    const bgB = 26
    const bgA = 255

    // Layer 1 (OFF) color: Grey
    const offR = 130
    const offG = 130
    const offB = 130

    // Layer 2 (ON) color: White
    const onR = 255
    const onG = 255
    const onB = 255

    for (let i = 0; i < totalPixels; i++) {
      const pIdx = i * 4
      const tOn = this.onTimestampMap[i]
      const tOff = this.offTimestampMap[i]

      const hasOn = tOn >= cutoff && tOn > 0
      const hasOff = tOff >= cutoff && tOff > 0

      if (hasOn) onActive++
      if (hasOff) offActive++
      if (hasOn && hasOff) overlapActive++
      if (hasOn || hasOff) totalActive++

      if (layerMode === 'on') {
        if (hasOn) {
          data[pIdx] = onR
          data[pIdx + 1] = onG
          data[pIdx + 2] = onB
          data[pIdx + 3] = 255
        } else {
          data[pIdx] = bgR
          data[pIdx + 1] = bgG
          data[pIdx + 2] = bgB
          data[pIdx + 3] = bgA
        }
      } else if (layerMode === 'off') {
        if (hasOff) {
          data[pIdx] = offR
          data[pIdx + 1] = offG
          data[pIdx + 2] = offB
          data[pIdx + 3] = 255
        } else {
          data[pIdx] = bgR
          data[pIdx + 1] = bgG
          data[pIdx + 2] = bgB
          data[pIdx + 3] = bgA
        }
      } else {
        // 'all' Mode: Dual Layer Stack
        // Layer 0: Background
        // Layer 1: OFF (Grey)
        // Layer 2: ON (White) rendered ON TOP of Layer 1 (White wins on overlap)
        if (hasOn) {
          data[pIdx] = onR
          data[pIdx + 1] = onG
          data[pIdx + 2] = onB
          data[pIdx + 3] = 255
        } else if (hasOff) {
          data[pIdx] = offR
          data[pIdx + 1] = offG
          data[pIdx + 2] = offB
          data[pIdx + 3] = 255
        } else {
          data[pIdx] = bgR
          data[pIdx + 1] = bgG
          data[pIdx + 2] = bgB
          data[pIdx + 3] = bgA
        }
      }
    }

    return { totalActive, onActive, offActive, overlapActive }
  }

  /**
   * Renders the two layers into separate transparent ImageData buffers:
   * - onImgData: Layer 2 ON (+1, White, transparent elsewhere)
   * - offImgData: Layer 1 OFF (-1, Grey, transparent elsewhere)
   */
  public renderLayerImages(
    onImgData: ImageData,
    offImgData: ImageData,
    windowUs: number
  ): EventLayerCounts {
    const cutoff = this.currentSimTimeUs - windowUs
    const onData = onImgData.data
    const offData = offImgData.data
    const totalPixels = this.width * this.height

    let onActive = 0
    let offActive = 0
    let overlapActive = 0
    let totalActive = 0

    const offR = 130
    const offG = 130
    const offB = 130

    const onR = 255
    const onG = 255
    const onB = 255

    for (let i = 0; i < totalPixels; i++) {
      const pIdx = i * 4
      const tOn = this.onTimestampMap[i]
      const tOff = this.offTimestampMap[i]

      const hasOn = tOn >= cutoff && tOn > 0
      const hasOff = tOff >= cutoff && tOff > 0

      if (hasOn) onActive++
      if (hasOff) offActive++
      if (hasOn && hasOff) overlapActive++
      if (hasOn || hasOff) totalActive++

      // Layer 1: OFF (Grey)
      if (hasOff) {
        offData[pIdx] = offR
        offData[pIdx + 1] = offG
        offData[pIdx + 2] = offB
        offData[pIdx + 3] = 255
      } else {
        offData[pIdx] = 0
        offData[pIdx + 1] = 0
        offData[pIdx + 2] = 0
        offData[pIdx + 3] = 0 // Transparent
      }

      // Layer 2: ON (White)
      if (hasOn) {
        onData[pIdx] = onR
        onData[pIdx + 1] = onG
        onData[pIdx + 2] = onB
        onData[pIdx + 3] = 255
      } else {
        onData[pIdx] = 0
        onData[pIdx + 1] = 0
        onData[pIdx + 2] = 0
        onData[pIdx + 3] = 0 // Transparent
      }
    }

    return { totalActive, onActive, offActive, overlapActive }
  }

  /**
   * Returns active event counts breakdown across layers within the accumulation window.
   */
  public getLayerCounts(windowUs: number): EventLayerCounts {
    const cutoff = this.currentSimTimeUs - windowUs
    const totalPixels = this.width * this.height
    let onActive = 0
    let offActive = 0
    let overlapActive = 0
    let totalActive = 0

    for (let i = 0; i < totalPixels; i++) {
      const hasOn = this.onTimestampMap[i] >= cutoff && this.onTimestampMap[i] > 0
      const hasOff = this.offTimestampMap[i] >= cutoff && this.offTimestampMap[i] > 0

      if (hasOn) onActive++
      if (hasOff) offActive++
      if (hasOn && hasOff) overlapActive++
      if (hasOn || hasOff) totalActive++
    }

    return { totalActive, onActive, offActive, overlapActive }
  }

  /**
   * Returns count of active events within the recent accumulation window.
   */
  public getActiveEventCount(windowUs: number): number {
    return this.getLayerCounts(windowUs).totalActive
  }

  /**
   * Retrieves events generated within the recent time window.
   * Bounded to at most maxCount items to prevent memory bloat.
   */
  public getEventsInWindow(windowUs: number, maxCount: number = 2000): DvsEvent[] {
    const cutoff = this.currentSimTimeUs - windowUs
    const events: DvsEvent[] = []
    const totalPixels = this.width * this.height

    for (let i = 0; i < totalPixels; i++) {
      const x = i % this.width
      const y = Math.floor(i / this.width)

      const tOff = this.offTimestampMap[i]
      const tOn = this.onTimestampMap[i]

      // Layer 1 OFF (-1, Grey)
      if (tOff >= cutoff && tOff > 0) {
        events.push({ x, y, t: Math.round(tOff), p: -1 })
        if (events.length >= maxCount) break
      }

      // Layer 2 ON (+1, White)
      if (tOn >= cutoff && tOn > 0) {
        events.push({ x, y, t: Math.round(tOn), p: 1 })
        if (events.length >= maxCount) break
      }
    }
    return events
  }

  public getRecentEvents(count: number = 30): DvsEvent[] {
    return this.recentEventsRing.slice(-count)
  }

  public getPixelHistory(): PixelSample[] {
    return this.pixelHistory
  }

  public getStats(): EventEngineStats {
    const rate = this.rateTrackingWindowUs > 0
      ? Math.round((this.eventsInLastSecond / this.rateTrackingWindowUs) * 1000000)
      : 0

    return {
      totalEvents: this.totalEvents,
      onEvents: this.onEvents,
      offEvents: this.offEvents,
      eventRatePerSec: rate,
      simulatedTimeUs: this.currentSimTimeUs,
    }
  }

  // ── Simulation 2 Stream History Accessors ───────────────────────────────────

  public setMaxStreamHistory(max: number): void {
    this.maxStreamHistory = Math.max(500, Math.min(50000, Math.round(max)))
    if (this.streamHistoryBuffer.length > this.maxStreamHistory) {
      this.streamHistoryBuffer = this.streamHistoryBuffer.slice(-this.maxStreamHistory)
      this.streamHistoryHead = 0
    }
  }

  public getMaxStreamHistory(): number {
    return this.maxStreamHistory
  }

  public getStreamHistoryCount(): number {
    return this.streamHistoryBuffer.length
  }

  public getStreamHistoryTimeRange(): { earliestUs: number; latestUs: number } | null {
    const len = this.streamHistoryBuffer.length
    if (len === 0) return null
    if (len < this.maxStreamHistory) {
      return {
        earliestUs: this.streamHistoryBuffer[0].t,
        latestUs: this.streamHistoryBuffer[len - 1].t,
      }
    }
    const offset = this.streamHistoryHead % this.maxStreamHistory
    const oldest = this.streamHistoryBuffer[offset]
    const newestIdx = (offset + len - 1) % this.maxStreamHistory
    const newest = this.streamHistoryBuffer[newestIdx]
    return {
      earliestUs: oldest ? oldest.t : 0,
      latestUs: newest ? newest.t : 0,
    }
  }

  public getStreamHistory(): DvsEvent[] {
    if (this.streamHistoryBuffer.length < this.maxStreamHistory) {
      return [...this.streamHistoryBuffer]
    }
    const offset = this.streamHistoryHead % this.maxStreamHistory
    return [
      ...this.streamHistoryBuffer.slice(offset),
      ...this.streamHistoryBuffer.slice(0, offset),
    ]
  }

  public clearStreamHistory(): void {
    this.streamHistoryBuffer = []
    this.streamHistoryHead = 0
  }

  /**
   * High-performance window extraction directly from the internal ring buffer.
   * Zero intermediate array allocations; breaks early when timestamps exceed endUs.
   */
  public getStreamEventsInWindow(startUs: number, endUs: number, maxCount: number = 25000): DvsEvent[] {
    const len = this.streamHistoryBuffer.length
    if (len === 0) return []

    const result: DvsEvent[] = []
    const isWrapped = len === this.maxStreamHistory
    const offset = isWrapped ? (this.streamHistoryHead % this.maxStreamHistory) : 0

    // Iterate through ring buffer in strict chronological order
    for (let i = 0; i < len; i++) {
      const idx = isWrapped ? (offset + i) % this.maxStreamHistory : i
      const ev = this.streamHistoryBuffer[idx]
      if (!ev) continue
      if (ev.t >= startUs && ev.t <= endUs) {
        result.push(ev)
        if (result.length >= maxCount) break
      } else if (ev.t > endUs) {
        // Timestamps are non-decreasing; stop scanning once past window end
        break
      }
    }
    return result
  }

  public getSimulatedTimeUs(): number {
    return this.currentSimTimeUs
  }

  public getSimulatedTimeMs(): number {
    return this.currentSimTimeUs / 1000
  }
}

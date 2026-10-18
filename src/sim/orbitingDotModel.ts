/**
 * Authoritative Orbiting Dot Scene Model for Simulation 2:
 * "3D Event Stream & Space-Time Data Lab"
 *
 * Implements a single adjustable circular dot orbiting a fixed rotation centre
 * on the simulated event sensor plane.
 *
 * Mathematically grounded in:
 * x(t) = cx + R_orbit * cos(theta(t))
 * y(t) = cy + R_orbit * sin(theta(t))
 * theta(t) = (theta_0 + direction * omega * t) mod 2pi
 * where omega = speedRps * 2pi rad/s = speedDegPerSec * (pi / 180) rad/s
 */

export const MAX_DOT_DIAMETER_PX = 10
export const MAX_ORBITAL_RADIUS_PX = 20
export const MAX_SPEED_DEG_PER_SEC = 1080
export const MAX_WINDOW_MS = 1000

export interface OrbitingDotParams {
  dotDiameterPx: number        // Dot diameter in sensor pixels (2 to 10 px)
  orbitalRadiusPx?: number     // Orbital radius in sensor pixels (1 to 20 px)
  orbitalRadiusNorm?: number   // Legacy normalized radius [deprecated, converted to orbitalRadiusPx]
  speedDegPerSec: number       // Angular velocity in deg/s (0°/s to 1080°/s)
  direction: 1 | -1            // 1 = Clockwise, -1 = Counter-Clockwise
  illuminationLux: number      // Ambient photonics irradiance (10 to 5000 lux)
}

export interface OrbitingDotState {
  angleRad: number             // Current orbital angle theta in radians [0, 2pi)
  angleDeg: number             // Current orbital angle theta in degrees [0, 360)
  dotPixelX: number            // Exact dot centre X coordinate on sensor grid [0, width - 1]
  dotPixelY: number            // Exact dot centre Y coordinate on sensor grid [0, height - 1]
  orbitalRadiusPx: number      // Orbital radius in sensor pixels
  dotRadiusPx: number          // Dot radius in sensor pixels
  simTimeSec: number           // Elapsed simulated time in seconds
  speedRps: number             // Revolutions per second (speedDegPerSec / 360)
}

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface CanonicalSimulationState {
  simTimeMs: number
  angleRad: number
  angleDeg: number
  dotPixelX: number
  dotPixelY: number
  orbitalRadiusPx: number
  dotRadiusPx: number
  dotDiameterPx: number
  speedRps: number
  speedDegPerSec: number
  direction: 1 | -1
  resolution: number
  windowMs: number
  isPlaying: boolean
  scrubTimeMs: number | null
}

export class OrbitingDotModel {
  public params: OrbitingDotParams
  private baseAngleRad: number = 0       // \theta_0 at time t_0
  private baseTimeSec: number = 0        // t_0 (time of last velocity change or reset)
  private currentSimTimeSec: number = 0  // Canonical continuous simulation time t in seconds

  // Bounded dirty tracking to prevent full-grid redundant calculations
  private prevMinX: number = -1
  private prevMaxX: number = -1
  private prevMinY: number = -1
  private prevMaxY: number = -1
  private hasPrevBBox: boolean = false

  constructor(params?: Partial<OrbitingDotParams>) {
    const rawDia = params?.dotDiameterPx ?? 7
    const rawRad = params?.orbitalRadiusPx ?? (params?.orbitalRadiusNorm !== undefined ? params.orbitalRadiusNorm * 63 : 20)
    const rawSpeed = params?.speedDegPerSec ?? 360

    const clampedDia = Math.min(MAX_DOT_DIAMETER_PX, Math.max(1, rawDia))
    const clampedRad = Math.min(MAX_ORBITAL_RADIUS_PX, Math.max(1, rawRad))
    const clampedSpeed = Math.min(MAX_SPEED_DEG_PER_SEC, Math.max(0, rawSpeed))

    this.params = {
      dotDiameterPx: clampedDia,
      orbitalRadiusPx: clampedRad,
      orbitalRadiusNorm: clampedRad / 63,
      speedDegPerSec: clampedSpeed,
      direction: params?.direction ?? 1,
      illuminationLux: params?.illuminationLux ?? 500,
      ...params,
    }
    // Re-enforce strict limits after spread
    this.params.dotDiameterPx = Math.min(MAX_DOT_DIAMETER_PX, Math.max(1, this.params.dotDiameterPx))
    this.params.orbitalRadiusPx = Math.min(MAX_ORBITAL_RADIUS_PX, Math.max(1, this.params.orbitalRadiusPx ?? clampedRad))
    this.params.speedDegPerSec = Math.min(MAX_SPEED_DEG_PER_SEC, Math.max(0, this.params.speedDegPerSec))
  }

  /**
   * Invalidates previously tracked bounding box, forcing a full clean refresh
   * on the next sampling step (e.g. after parameter or resolution change).
   */
  public invalidateDirtyBBox(): void {
    this.hasPrevBBox = false
    this.prevMinX = -1
    this.prevMaxX = -1
    this.prevMinY = -1
    this.prevMaxY = -1
  }

  /**
   * Updates angular velocity (speed or direction) while guaranteeing phase continuity:
   * captures the exact angle at atTimeSec as the new \theta_0, and atTimeSec as t_0.
   * This ensures the dot never jumps position when speed or direction is adjusted.
   * Clamped strictly to MAX_SPEED_DEG_PER_SEC (1080 deg/s = 3.00 rev/s).
   */
  public setAngularVelocity(
    speedDegPerSec: number,
    direction: 1 | -1,
    atTimeSec: number = this.currentSimTimeSec
  ): void {
    const clampedSpeed = Math.min(MAX_SPEED_DEG_PER_SEC, Math.max(0, speedDegPerSec))
    // 1. Lock in the exact current angle at the transition moment
    this.baseAngleRad = this.getAngleAtTime(atTimeSec)
    // 2. Set the reference time to the transition moment
    this.baseTimeSec = atTimeSec
    // 3. Update parameters
    this.params.speedDegPerSec = clampedSpeed
    this.params.direction = direction
    this.currentSimTimeSec = atTimeSec
  }

  /**
   * Deterministically computes the orbital angle \theta(t) at simulation time t (in seconds):
   * \theta(t) = \theta_0 + \omega * (t - t_0) mod 2\pi
   * where \omega = direction * speedRadPerSec
   */
  public getAngleAtTime(simTimeSec: number): number {
    const speedDegPerSec = Math.min(MAX_SPEED_DEG_PER_SEC, Math.max(0, this.params.speedDegPerSec))
    const { direction } = this.params
    if (speedDegPerSec === 0) {
      return this.baseAngleRad
    }
    const speedRadPerSec = (speedDegPerSec * Math.PI) / 180
    const deltaT = simTimeSec - this.baseTimeSec
    let angle = (this.baseAngleRad + direction * speedRadPerSec * deltaT) % (Math.PI * 2)
    if (angle < 0) {
      angle += Math.PI * 2
    }
    return angle
  }

  /**
   * Sets the authoritative simulation time (in seconds).
   */
  public setTime(simTimeSec: number): void {
    this.currentSimTimeSec = Math.max(0, simTimeSec)
  }

  /**
   * Advances the simulation clock by dtSeconds.
   */
  public update(dtSeconds: number): void {
    if (dtSeconds <= 0) return
    this.currentSimTimeSec += dtSeconds
  }

  public get currentSimTime(): number {
    return this.currentSimTimeSec
  }

  public get currentAngleRad(): number {
    return this.getAngleAtTime(this.currentSimTimeSec)
  }

  /**
   * Calculates the full physical dot state at the current simulation moment.
   */
  public getState(width: number, height: number): OrbitingDotState {
    return this.getStateAtTime(this.currentSimTimeSec, width, height)
  }

  /**
   * Deterministically calculates the full physical dot state directly
   * from an explicit continuous simulation time in seconds.
   */
  public getStateAtTime(simTimeSec: number, width: number, height: number): OrbitingDotState {
    const angleRad = this.getAngleAtTime(simTimeSec)
    return this.getStateAtAngle(angleRad, simTimeSec, width, height)
  }

  /**
   * Computes the dot state at an explicit angle and time.
   */
  public getStateAtAngle(
    angleRad: number,
    simTimeSec: number,
    width: number,
    height: number
  ): OrbitingDotState {
    const cx = (width - 1) / 2
    const cy = (height - 1) / 2
    const maxRadius = Math.min(cx, cy)

    // Orbital radius clamped strictly to MAX_ORBITAL_RADIUS_PX (20 px)
    let orbitalRadiusPx = this.params.orbitalRadiusPx
    if (orbitalRadiusPx === undefined) {
      if (this.params.orbitalRadiusNorm !== undefined) {
        orbitalRadiusPx = this.params.orbitalRadiusNorm <= 1
          ? this.params.orbitalRadiusNorm * (maxRadius * 2)
          : this.params.orbitalRadiusNorm
      } else {
        orbitalRadiusPx = 20
      }
    }
    orbitalRadiusPx = Math.min(MAX_ORBITAL_RADIUS_PX, Math.max(1, orbitalRadiusPx))

    const dotDiameterPx = Math.min(MAX_DOT_DIAMETER_PX, Math.max(1, this.params.dotDiameterPx))
    const dotRadiusPx = Math.max(0.5, dotDiameterPx / 2)

    const dotPixelX = cx + Math.cos(angleRad) * orbitalRadiusPx
    const dotPixelY = cy + Math.sin(angleRad) * orbitalRadiusPx

    const angleDeg = (angleRad * 180) / Math.PI
    const speedDeg = Math.min(MAX_SPEED_DEG_PER_SEC, Math.max(0, this.params.speedDegPerSec))

    return {
      angleRad,
      angleDeg,
      dotPixelX,
      dotPixelY,
      orbitalRadiusPx,
      dotRadiusPx,
      simTimeSec,
      speedRps: Number((speedDeg / 360).toFixed(2)),
    }
  }

  /**
   * Resets the simulation clock and dot angle back to zero.
   */
  public reset(): void {
    this.baseAngleRad = 0
    this.baseTimeSec = 0
    this.currentSimTimeSec = 0
    this.params.dotDiameterPx = Math.min(MAX_DOT_DIAMETER_PX, Math.max(1, this.params.dotDiameterPx))
    this.params.orbitalRadiusPx = Math.min(MAX_ORBITAL_RADIUS_PX, Math.max(1, this.params.orbitalRadiusPx ?? 20))
    this.params.speedDegPerSec = Math.min(MAX_SPEED_DEG_PER_SEC, Math.max(0, this.params.speedDegPerSec))
    this.invalidateDirtyBBox()
  }

  /**
   * Renders the continuous light irradiance grid (sensor optical image)
   * at the current simulation state into targetBuffer.
   *
   * Highly optimized: only recalculates pixels in the union bounding box
   * of the dot's previous and current positions, reducing CPU operations
   * by >95% while maintaining exact mathematical fidelity.
   *
   * Returns the bounding box of affected pixels.
   */
  public sampleIntensityGrid(
    width: number,
    height: number,
    targetBuffer: Float32Array
  ): BoundingBox {
    return this.sampleIntensityGridAtAngle(this.currentAngleRad, width, height, targetBuffer)
  }

  /**
   * Stateless intensity sampler at an explicit orbital angle.
   */
  public sampleIntensityGridAtAngle(
    angleRad: number,
    width: number,
    height: number,
    targetBuffer: Float32Array
  ): BoundingBox {
    const cx = (width - 1) / 2
    const cy = (height - 1) / 2
    const maxRadius = Math.min(cx, cy)

    // Orbital radius clamped strictly to MAX_ORBITAL_RADIUS_PX (20 px)
    let orbitalRadiusPx = this.params.orbitalRadiusPx
    if (orbitalRadiusPx === undefined) {
      if (this.params.orbitalRadiusNorm !== undefined) {
        orbitalRadiusPx = this.params.orbitalRadiusNorm <= 1
          ? this.params.orbitalRadiusNorm * (maxRadius * 2)
          : this.params.orbitalRadiusNorm
      } else {
        orbitalRadiusPx = 20
      }
    }
    orbitalRadiusPx = Math.min(MAX_ORBITAL_RADIUS_PX, Math.max(1, orbitalRadiusPx))

    const dotDiameterPx = Math.min(MAX_DOT_DIAMETER_PX, Math.max(1, this.params.dotDiameterPx))
    const dotRadiusPx = Math.max(0.5, dotDiameterPx / 2)

    const dotX = cx + Math.cos(angleRad) * orbitalRadiusPx
    const dotY = cy + Math.sin(angleRad) * orbitalRadiusPx

    // Ambient illumination scaling (500 lux nominal ~ 1.0)
    const luxScale = Math.max(0.2, Math.min(2.0, Math.log10(Math.max(1, this.params.illuminationLux)) / 2.7))

    const bgIntensity = 0.10 * luxScale      // Uniform stationary dark background
    const dotIntensity = 0.96 * luxScale     // High-contrast bright circular dot
    const deltaIntensity = dotIntensity - bgIntensity

    const curMinX = Math.max(0, Math.floor(dotX - dotRadiusPx - 1))
    const curMaxX = Math.min(width - 1, Math.ceil(dotX + dotRadiusPx + 1))
    const curMinY = Math.max(0, Math.floor(dotY - dotRadiusPx - 1))
    const curMaxY = Math.min(height - 1, Math.ceil(dotY + dotRadiusPx + 1))

    let dirtyBBox: BoundingBox

    if (this.hasPrevBBox) {
      // Fast clear of previous dot region back to background
      for (let y = this.prevMinY; y <= this.prevMaxY; y++) {
        const rowOffset = y * width
        for (let x = this.prevMinX; x <= this.prevMaxX; x++) {
          targetBuffer[rowOffset + x] = bgIntensity
        }
      }
      dirtyBBox = {
        minX: Math.min(curMinX, this.prevMinX),
        maxX: Math.max(curMaxX, this.prevMaxX),
        minY: Math.min(curMinY, this.prevMinY),
        maxY: Math.max(curMaxY, this.prevMaxY),
      }
    } else {
      // First frame or after invalidation: full buffer memset reset
      targetBuffer.fill(bgIntensity)
      dirtyBBox = {
        minX: 0,
        maxX: width - 1,
        minY: 0,
        maxY: height - 1,
      }
    }

    // Antialiased circle drawing restricted strictly to the current dot bounding box
    const innerRadius = Math.max(0, dotRadiusPx - 0.5)
    const innerRadiusSq = innerRadius * innerRadius
    const outerRadius = dotRadiusPx + 0.5
    const outerRadiusSq = outerRadius * outerRadius

    for (let y = curMinY; y <= curMaxY; y++) {
      const dy = y - dotY
      const dySq = dy * dy
      const rowOffset = y * width
      for (let x = curMinX; x <= curMaxX; x++) {
        const dx = x - dotX
        const distSq = dx * dx + dySq
        const idx = rowOffset + x

        if (distSq <= innerRadiusSq) {
          // Fully inside circular dot
          targetBuffer[idx] = dotIntensity
        } else if (distSq < outerRadiusSq) {
          // Smooth 1-pixel antialiased boundary edge to prevent digital aliasing
          const distToDot = Math.sqrt(distSq)
          const coverage = outerRadius - distToDot
          targetBuffer[idx] = bgIntensity + coverage * deltaIntensity
        }
      }
    }

    this.prevMinX = curMinX
    this.prevMaxX = curMaxX
    this.prevMinY = curMinY
    this.prevMaxY = curMaxY
    this.hasPrevBBox = true

    return dirtyBBox
  }
}

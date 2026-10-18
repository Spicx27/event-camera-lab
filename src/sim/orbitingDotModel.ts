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

export interface OrbitingDotParams {
  dotDiameterPx: number        // Dot diameter in sensor pixels (e.g. 2 to 16 px)
  orbitalRadiusNorm: number    // Orbital radius normalized to sensor half-width [0.05 to 0.45]
  speedDegPerSec: number       // Angular velocity in deg/s (0°/s to 1440°/s)
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

export class OrbitingDotModel {
  public params: OrbitingDotParams
  private currentAngleRad: number = 0
  private currentSimTimeSec: number = 0

  constructor(params?: Partial<OrbitingDotParams>) {
    this.params = {
      dotDiameterPx: 7,          // Default 7px diameter on a 64x64 sensor (~11% sensor width)
      orbitalRadiusNorm: 0.32,   // Default 32% of sensor dimension (radius ~20px on 64x64)
      speedDegPerSec: 360,       // 1.00 rev/s default for canonical Slide 10 helix
      direction: 1,              // Clockwise
      illuminationLux: 500,
      ...params,
    }
  }

  /**
   * Advances the simulation clock and dot orbital angle by dtSeconds.
   */
  public update(dtSeconds: number): void {
    if (dtSeconds <= 0) return

    this.currentSimTimeSec += dtSeconds
    const { speedDegPerSec, direction } = this.params

    if (speedDegPerSec === 0) return

    const speedRadPerSec = (speedDegPerSec * Math.PI) / 180
    this.currentAngleRad = (this.currentAngleRad + direction * speedRadPerSec * dtSeconds) % (Math.PI * 2)
    if (this.currentAngleRad < 0) {
      this.currentAngleRad += Math.PI * 2
    }
  }

  /**
   * Calculates the full physical dot state at the current simulation moment.
   */
  public getState(width: number, height: number): OrbitingDotState {
    return this.getStateAtAngle(this.currentAngleRad, this.currentSimTimeSec, width, height)
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

    const orbitalRadiusPx = this.params.orbitalRadiusNorm * (maxRadius * 2)
    const dotRadiusPx = Math.max(1, this.params.dotDiameterPx / 2)

    const dotPixelX = cx + Math.cos(angleRad) * orbitalRadiusPx
    const dotPixelY = cy + Math.sin(angleRad) * orbitalRadiusPx

    const angleDeg = (angleRad * 180) / Math.PI

    return {
      angleRad,
      angleDeg,
      dotPixelX,
      dotPixelY,
      orbitalRadiusPx,
      dotRadiusPx,
      simTimeSec,
      speedRps: Number((this.params.speedDegPerSec / 360).toFixed(2)),
    }
  }

  /**
   * Resets the simulation clock and dot angle back to zero.
   */
  public reset(): void {
    this.currentAngleRad = 0
    this.currentSimTimeSec = 0
  }

  /**
   * Renders the continuous light irradiance grid (sensor optical image)
   * at the current simulation state into targetBuffer.
   *
   * Physical irradiance model:
   * - Stationary, uniformly lit background: I_bg
   * - High-contrast circular orbiting dot: I_dot
   * - Smooth 1-pixel antialiased boundary edge to prevent digital aliasing
   */
  public sampleIntensityGrid(
    width: number,
    height: number,
    targetBuffer: Float32Array
  ): void {
    this.sampleIntensityGridAtAngle(this.currentAngleRad, width, height, targetBuffer)
  }

  /**
   * Stateless intensity sampler at an explicit orbital angle.
   */
  public sampleIntensityGridAtAngle(
    angleRad: number,
    width: number,
    height: number,
    targetBuffer: Float32Array
  ): void {
    const cx = (width - 1) / 2
    const cy = (height - 1) / 2
    const maxRadius = Math.min(cx, cy)

    const orbitalRadiusPx = this.params.orbitalRadiusNorm * (maxRadius * 2)
    const dotRadiusPx = Math.max(1, this.params.dotDiameterPx / 2)

    const dotX = cx + Math.cos(angleRad) * orbitalRadiusPx
    const dotY = cy + Math.sin(angleRad) * orbitalRadiusPx

    // Ambient illumination scaling (500 lux nominal ~ 1.0)
    const luxScale = Math.max(0.2, Math.min(2.0, Math.log10(Math.max(1, this.params.illuminationLux)) / 2.7))

    const bgIntensity = 0.10 * luxScale      // Uniform stationary dark background
    const dotIntensity = 0.96 * luxScale     // High-contrast bright circular dot
    const deltaIntensity = dotIntensity - bgIntensity

    for (let y = 0; y < height; y++) {
      const dy = y - dotY
      for (let x = 0; x < width; x++) {
        const dx = x - dotX
        const distToDot = Math.sqrt(dx * dx + dy * dy)
        const idx = y * width + x

        if (distToDot <= dotRadiusPx - 0.5) {
          // Fully inside circular dot
          targetBuffer[idx] = dotIntensity
        } else if (distToDot >= dotRadiusPx + 0.5) {
          // Completely in stationary background
          targetBuffer[idx] = bgIntensity
        } else {
          // Antialiased 1-pixel boundary
          const coverage = (dotRadiusPx + 0.5) - distToDot
          targetBuffer[idx] = bgIntensity + coverage * deltaIntensity
        }
      }
    }
  }
}

/**
 * Physical Scene Model for Simulation 1:
 * "Frame-Based Camera vs Event-Based Camera: Seeing the Same World Differently"
 *
 * Models a shared optical target consisting of:
 * 1. A high-contrast rotating wheel/disc (Siemens Star, Quadrants, or Rotating Dot - Slide 10)
 * 2. An independently movable bright sphere orbiting along a visible trajectory
 * 3. Controllable illumination conditions (10 lux to 10,000 lux, Slides 4 & 26)
 *
 * Both cameras in the shared 3D environment observe this exact same physical scene.
 */

export type MotionPattern = 'rotation' | 'oscillation'
export type OpticalPattern = 'siemens_star' | 'quadrant' | 'rotating_dot'
export type CameraViewpoint = 'frame' | 'event' | 'center'

export interface SceneParams {
  motionPattern: MotionPattern
  opticalPattern: OpticalPattern
  speedDegPerSec: number        // 0°/s (Stationary) to 2400°/s (Extreme motion, Slide 17: >1000°/s)
  direction: 1 | -1             // 1 = Clockwise, -1 = Counter-Clockwise
  illuminationLux: number       // 10 lux (dim shadow) to 10,000 lux (intense glare)
  contrastRatio: number         // Pattern contrast (0.2 to 1.0)
  includeMovableSphere: boolean // Independently movable bright sphere
}

export interface SphereState {
  normX: number // -1 to 1 normalized coordinate
  normY: number // -1 to 1 normalized coordinate
  angleRad: number
}

export class SceneModel {
  public params: SceneParams
  private currentAngleRad: number = 0
  private sphereAngleRad: number = 0
  private currentPosNorm: number = 0 // for linear oscillation mode: -1 to 1

  constructor(params?: Partial<SceneParams>) {
    this.params = {
      motionPattern: 'rotation',
      opticalPattern: 'siemens_star',
      speedDegPerSec: 600, // Normal motion by default
      direction: 1,
      illuminationLux: 500, // Standard indoor photonics lab illumination
      contrastRatio: 0.9,
      includeMovableSphere: false,
      ...params,
    }
  }

  public update(dtSeconds: number): void {
    const { speedDegPerSec, direction, motionPattern } = this.params

    // If speed is zero (Stationary), do not advance positions
    if (speedDegPerSec === 0 || dtSeconds <= 0) {
      return
    }

    const speedRadPerSec = (speedDegPerSec * Math.PI) / 180

    if (motionPattern === 'rotation') {
      this.currentAngleRad = (this.currentAngleRad + direction * speedRadPerSec * dtSeconds) % (Math.PI * 2)
      // Independently movable sphere advances at a distinct speed (0.65x the rotor)
      this.sphereAngleRad = (this.sphereAngleRad + direction * (speedRadPerSec * 0.65) * dtSeconds) % (Math.PI * 2)
    } else {
      // Linear harmonic oscillation
      const freqHz = speedDegPerSec / 360
      this.currentAngleRad += freqHz * Math.PI * 2 * dtSeconds
      this.currentPosNorm = Math.sin(this.currentAngleRad)
      this.sphereAngleRad += freqHz * 0.75 * Math.PI * 2 * dtSeconds
    }
  }

  public getAngle(): number {
    return this.currentAngleRad
  }

  public getPosition(): number {
    return this.currentPosNorm
  }

  public getSphereState(): SphereState {
    const orbitRadiusNorm = 0.68
    const normX = Math.cos(this.sphereAngleRad) * orbitRadiusNorm
    const normY = Math.sin(this.sphereAngleRad) * orbitRadiusNorm
    return { normX, normY, angleRad: this.sphereAngleRad }
  }

  public reset(): void {
    this.currentAngleRad = 0
    this.sphereAngleRad = 0
    this.currentPosNorm = 0
  }

  // ── State Save / Restore (enables temporal supersampling) ──────────────────

  public getInternalState(): { angle: number; sphereAngle: number; posNorm: number } {
    return {
      angle: this.currentAngleRad,
      sphereAngle: this.sphereAngleRad,
      posNorm: this.currentPosNorm,
    }
  }

  public setInternalState(state: { angle: number; sphereAngle: number; posNorm: number }): void {
    this.currentAngleRad = state.angle
    this.sphereAngleRad = state.sphereAngle
    this.currentPosNorm = state.posNorm
  }

  /**
   * Stateless intensity sampler: renders the scene at the EXPLICITLY provided
   * state instead of the current internal state. Does NOT modify any internal
   * fields — safe to call multiple times in a sub-step loop.
   *
   * Used by the frame engine's temporal supersampling (motion blur) code path.
   */
  public sampleIntensityGridAt(
    angleRad: number,
    sphereAngleRad: number,
    posNorm: number,
    width: number,
    height: number,
    targetBuffer: Float32Array,
    viewpoint: CameraViewpoint = 'center'
  ): void {
    // Temporarily swap in the provided state, sample, then restore.
    const saved = this.getInternalState()
    this.currentAngleRad = angleRad
    this.sphereAngleRad = sphereAngleRad
    this.currentPosNorm = posNorm
    this.sampleIntensityGrid(width, height, targetBuffer, viewpoint)
    this.setInternalState(saved)
  }

  /**
   * Generates a 2D intensity grid representing instantaneous photon irradiance
   * projected onto the camera sensor at this exact simulation moment.
   *
   * Genuinely corresponds to the 3D optical bench camera viewpoints:
   * - 'frame': observed from the left camera rig (-23° azimuth)
   * - 'event': observed from the right camera rig (+23° azimuth)
   * - 'center': orthogonal front-on view (0° azimuth)
   *
   * @param width Sensor width in pixels (e.g. 64 or 128)
   * @param height Sensor height in pixels
   * @param targetBuffer Float32Array of size width * height to fill with intensities
   * @param viewpoint Camera perspective matching the 3D physical testbench
   */
  public sampleIntensityGrid(
    width: number,
    height: number,
    targetBuffer: Float32Array,
    viewpoint: CameraViewpoint = 'center'
  ): void {
    const angle = this.currentAngleRad
    const { motionPattern, opticalPattern, illuminationLux, contrastRatio, includeMovableSphere } = this.params

    // Log-lux scaling factor: 10 lux -> ~0.15, 500 lux -> ~0.7, 10000 lux -> ~2.5 (Slide 4 saturation)
    const luxScale = Math.max(0.1, Math.min(3.0, Math.log10(Math.max(1, illuminationLux)) / 2.5))
    const cx = (width - 1) / 2
    const cy = (height - 1) / 2
    const maxRadius = Math.min(cx, cy) * 0.88

    // Viewpoint azimuth offset matching 3D optical bench rigs:
    // Left rig (Frame camera): -23° (-0.40 rad)
    // Right rig (Event camera): +23° (+0.40 rad)
    const azimuthRad = viewpoint === 'frame' ? -0.40 : viewpoint === 'event' ? 0.40 : 0
    const cosA = Math.cos(azimuthRad)
    const sinA = Math.sin(azimuthRad)
    const isOffAxis = azimuthRad !== 0

    // Oscillation offset
    const offsetX = motionPattern === 'oscillation' ? this.currentPosNorm * (width * 0.28) : 0

    // Movable sphere coordinates in 3D world space (radius in pixels)
    const sphereOrbitRadiusPx = maxRadius * 0.72
    const sphereWorldX = motionPattern === 'oscillation' ? offsetX : Math.cos(this.sphereAngleRad) * sphereOrbitRadiusPx
    const sphereWorldY = motionPattern === 'oscillation' ? Math.sin(this.sphereAngleRad) * (maxRadius * 0.4) : Math.sin(this.sphereAngleRad) * sphereOrbitRadiusPx
    const sphereWorldZ = 0.15 * maxRadius // slightly in front of disk

    // Project sphere into camera viewpoint:
    let spherePxX = cx + sphereWorldX
    let spherePxY = cy + sphereWorldY
    let sphereRadiusPx = maxRadius * 0.16

    if (isOffAxis) {
      // Rotate 3D point about Y axis by azimuthRad
      const sphereCamX = sphereWorldX * cosA - sphereWorldZ * sinA
      const sphereCamZ = sphereWorldX * sinA + sphereWorldZ * cosA
      const depthRef = maxRadius * 3.4
      const distFactor = depthRef / (depthRef - sphereCamZ)
      spherePxX = cx + sphereCamX * distFactor + (motionPattern === 'oscillation' ? offsetX : 0)
      spherePxY = cy + sphereWorldY * distFactor
      sphereRadiusPx = maxRadius * 0.16 * distFactor
    }

    // Baseline background illumination
    const bgVal = 0.08 * luxScale

    for (let y = 0; y < height; y++) {
      const dy = y - cy
      for (let x = 0; x < width; x++) {
        const dx = x - (cx + offsetX)
        const idx = y * width + x

        // Check if pixel falls inside the movable bright sphere
        if (includeMovableSphere) {
          const sDx = x - spherePxX
          const sDy = y - spherePxY
          const distToSphere = Math.sqrt(sDx * sDx + sDy * sDy)
          if (distToSphere <= sphereRadiusPx) {
            // Bright sphere with edge shading
            const sphereGrad = 1.0 - (distToSphere / sphereRadiusPx) * 0.35
            targetBuffer[idx] = Math.max(0.001, 0.98 * sphereGrad * luxScale)
            continue
          }
        }

        // Ray unprojection from sensor (dx, dy) to disk plane (diskX, diskY)
        let diskX = dx
        let diskY = dy
        if (isOffAxis) {
          // Perspective foreshortening from off-axis camera rig
          const depthRef = maxRadius * 3.4
          const denom = cosA - (dx / depthRef) * sinA
          diskX = dx / denom
          diskY = dy / (1.0 - (dx / depthRef) * sinA * 0.4)
        }

        const r = Math.sqrt(diskX * diskX + diskY * diskY)

        if (r > maxRadius) {
          // Outside the rotor disk
          targetBuffer[idx] = bgVal
          continue
        }

        // Inside rotor disk
        const phi = Math.atan2(diskY, diskX) - angle
        let patternVal = 0.5

        if (opticalPattern === 'siemens_star') {
          // 8-spoke Siemens star pattern with high spatial frequency (Slide 17)
          const spokes = 8
          const wave = Math.sin(spokes * phi)
          patternVal = wave >= 0 ? 0.95 : 0.05
        } else if (opticalPattern === 'quadrant') {
          // 4 contrasting quadrants
          const wave = Math.sin(2 * phi)
          patternVal = wave >= 0 ? 0.9 : 0.1
        } else if (opticalPattern === 'rotating_dot') {
          // Slide 10: Rotating dot stimulus on a disk (forming space-time helix)
          const dotRadius = maxRadius * 0.65
          const dotSize = maxRadius * 0.18
          const dotX = Math.cos(angle) * dotRadius
          const dotY = Math.sin(angle) * dotRadius
          const distToDot = Math.sqrt((dx - dotX) * (dx - dotX) + (dy - dotY) * (dy - dotY))

          if (distToDot <= dotSize) {
            patternVal = 0.98 // Bright white spot
          } else {
            // Textured disk background
            patternVal = 0.15 + 0.1 * Math.sin(phi * 4)
          }
        }

        // Add an outer rim and center hub to create sharp circular spatial edges
        if (Math.abs(r - maxRadius) < 2) {
          patternVal = 0.9 // Bright circular boundary
        } else if (r < maxRadius * 0.12) {
          patternVal = 0.85 // Center axle hub
        }

        // Modulate with contrast ratio and ambient illumination
        const finalIntensity = (0.5 + (patternVal - 0.5) * contrastRatio) * luxScale
        targetBuffer[idx] = Math.max(0.001, finalIntensity)
      }
    }
  }
}

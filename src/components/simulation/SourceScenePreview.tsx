import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Eye, Target, AlertTriangle, ShieldCheck } from 'lucide-react'

import type { CanonicalSimulationState } from '@/sim/orbitingDotModel'

export interface SourceScenePreviewProps {
  dotPixelX: number
  dotPixelY: number
  orbitalRadiusPx: number
  dotRadiusPx: number
  dotDiameterPx: number
  angleRad: number
  angleDeg: number
  resolution: number
  speedRps: number
  speedDegPerSec: number
  direction: 1 | -1
  illuminationLux: number
  canonicalStateRef?: React.MutableRefObject<CanonicalSimulationState>
}

const PLANE_SIZE_3D = 3.2

/**
 * 3D Scene representing the Single Orbiting Dot on the Sensor Plane
 */
function OrbitingDotScene({
  dotPixelX,
  dotPixelY,
  orbitalRadiusPx,
  dotRadiusPx,
  resolution,
  direction,
  canonicalStateRef,
}: SourceScenePreviewProps) {
  const dotMeshRef = useRef<THREE.Mesh>(null)
  const arrowGroupRef = useRef<THREE.Group>(null)
  const halfRes = (resolution - 1) / 2
  const scaleFactor = (PLANE_SIZE_3D * 0.92) / (resolution - 1)

  // Map sensor pixel coordinates (0..res-1) to 3D plane units [-halfSize, +halfSize]
  const dot3dX = (dotPixelX - halfRes) * scaleFactor
  const dot3dY = (halfRes - dotPixelY) * scaleFactor // invert Y for optical Cartesian plane
  const orbit3dRadius = orbitalRadiusPx * scaleFactor

  // Circular orbit guide geometry
  const orbitGuideGeom = useMemo(() => {
    const segments = 96
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(theta) * orbit3dRadius, Math.sin(theta) * orbit3dRadius, 0.005))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [orbit3dRadius])

  // Center crosshair lines
  const centerCrosshairGeom = useMemo(() => {
    const arm = 0.22
    const pts = [
      new THREE.Vector3(-arm, 0, 0.005),
      new THREE.Vector3(arm, 0, 0.005),
      new THREE.Vector3(0, -arm, 0.005),
      new THREE.Vector3(0, arm, 0.005),
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  // Sensor boundary frame
  const sensorFrameGeom = useMemo(() => {
    const half = (PLANE_SIZE_3D * 0.92) / 2
    const pts = [
      new THREE.Vector3(-half, -half, 0.002),
      new THREE.Vector3(half, -half, 0.002),
      new THREE.Vector3(half, -half, 0.002),
      new THREE.Vector3(half, half, 0.002),
      new THREE.Vector3(half, half, 0.002),
      new THREE.Vector3(-half, half, 0.002),
      new THREE.Vector3(-half, half, 0.002),
      new THREE.Vector3(-half, -half, 0.002),
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  // Smoothly position the dot and directional indicator at full 60 FPS in useFrame
  useFrame(() => {
    let px = dotPixelX
    let py = dotPixelY
    let radPx = dotRadiusPx
    let dir = direction
    let curRes = resolution

    if (canonicalStateRef?.current) {
      px = canonicalStateRef.current.dotPixelX
      py = canonicalStateRef.current.dotPixelY
      radPx = canonicalStateRef.current.dotRadiusPx
      dir = canonicalStateRef.current.direction
      curRes = canonicalStateRef.current.resolution
    }

    const curHalfRes = (curRes - 1) / 2
    const curScale = (PLANE_SIZE_3D * 0.92) / (curRes - 1)

    const cur3dX = (px - curHalfRes) * curScale
    const cur3dY = (curHalfRes - py) * curScale
    const cur3dRadius = radPx * curScale

    if (dotMeshRef.current) {
      dotMeshRef.current.position.set(cur3dX, cur3dY, 0.03)
      dotMeshRef.current.scale.set(cur3dRadius, cur3dRadius, cur3dRadius)
    }

    if (arrowGroupRef.current) {
      arrowGroupRef.current.position.set(cur3dX, cur3dY, 0.04)
      const tangent = Math.atan2(cur3dY, cur3dX) + (dir === 1 ? -Math.PI / 2 : Math.PI / 2)
      arrowGroupRef.current.rotation.z = tangent
    }
  })

  return (
    <group>
      {/* Sensor Plane Backing */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[PLANE_SIZE_3D, PLANE_SIZE_3D]} />
        <meshStandardMaterial color="#070e1b" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Sensor Pixel Grid Helper */}
      <group position={[0, 0, 0.001]} rotation={[Math.PI / 2, 0, 0]}>
        <gridHelper args={[PLANE_SIZE_3D * 0.92, 16, '#0ea5e9', '#1e293b']} />
      </group>

      {/* Sensor Observable Boundary Box */}
      <lineSegments geometry={sensorFrameGeom}>
        <lineBasicMaterial color="#38bdf8" linewidth={2} />
      </lineSegments>

      {/* Fixed Rotation Centre Marker */}
      <group position={[0, 0, 0.004]}>
        {/* Crosshair */}
        <lineSegments geometry={centerCrosshairGeom}>
          <lineBasicMaterial color="#06b6d4" />
        </lineSegments>
        {/* Hub ring */}
        <mesh>
          <ringGeometry args={[0.04, 0.065, 32]} />
          <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.025, 16]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Circular Orbit Guide Line */}
      <lineLoop geometry={orbitGuideGeom}>
        <lineBasicMaterial color="#0284c7" transparent opacity={0.65} />
      </lineLoop>

      {/* The Single Orbiting Circular Dot */}
      <mesh ref={dotMeshRef} position={[dot3dX, dot3dY, 0.03]}>
        {/* Spherical disc appearance */}
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Direction of Motion Indicator Arrow */}
      {orbit3dRadius > 0.2 && (
        <group ref={arrowGroupRef} position={[dot3dX, dot3dY, 0.04]}>
          <mesh
            rotation={[
              0,
              0,
              Math.atan2(dot3dY, dot3dX) + (direction === 1 ? -Math.PI / 2 : Math.PI / 2),
            ]}
          >
            <coneGeometry args={[0.05, 0.12, 16]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      )}
    </group>
  )
}

export default function SourceScenePreview(props: SourceScenePreviewProps) {
  const {
    dotPixelX,
    dotPixelY,
    orbitalRadiusPx,
    dotDiameterPx,
    angleDeg,
    resolution,
    speedRps,
    speedDegPerSec,
  } = props

  // Sensor boundary safety check
  const halfRes = (resolution - 1) / 2
  const dotRadiusPx = dotDiameterPx / 2
  const maxReachPx = orbitalRadiusPx + dotRadiusPx
  const isNearBoundary = maxReachPx > halfRes * 0.95
  const isClipping = maxReachPx > halfRes

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.65rem 0.9rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(5, 13, 26, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Eye size={15} style={{ color: 'var(--color-cyan)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
            Optical Source Scene: Single Orbiting Dot
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              padding: '0.15rem 0.4rem',
              borderRadius: 4,
              background: 'rgba(6, 182, 212, 0.12)',
              color: 'var(--color-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            {resolution}×{resolution} SENSOR
          </span>
        </div>
      </div>

      {/* 3D Scene Viewport */}
      <div style={{ flex: '1 1 320px', minHeight: 280, position: 'relative', background: '#070e1b' }}>
        <Canvas camera={{ position: [0, 0, 3.8], fov: 48 }} gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={['#070e1b']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1.0} />
          <OrbitControls enablePan={true} enableZoom={true} maxDistance={7} minDistance={1.8} />

          <OrbitingDotScene {...props} />
        </Canvas>

        {/* Legend Overlay at Top-Left */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            padding: '0.35rem 0.55rem',
            background: 'rgba(5, 13, 26, 0.88)',
            backdropFilter: 'blur(4px)',
            borderRadius: 5,
            fontSize: '0.64rem',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--color-border-subtle)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fff' }}>
            <span style={{ width: 7, height: 7, background: '#ffffff', borderRadius: '50%' }} />
            <span>High-Contrast Dot (White)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#06b6d4' }}>
            <Target size={9} />
            <span>Fixed Centre: ({halfRes.toFixed(0)}, {halfRes.toFixed(0)})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0284c7' }}>
            <span style={{ width: 10, height: 1, background: '#0284c7' }} />
            <span>Orbit Guide Line</span>
          </div>
        </div>

        {/* Boundary Notice at Top-Right */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            pointerEvents: 'none',
          }}
        >
          {isClipping ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.45rem',
                borderRadius: 4,
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <AlertTriangle size={11} />
              <span>Dot Clipping Sensor Boundary</span>
            </div>
          ) : isNearBoundary ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.45rem',
                borderRadius: 4,
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid #f59e0b',
                color: '#fde68a',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <AlertTriangle size={11} />
              <span>Near Sensor Edge</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.45rem',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#6ee7b7',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <ShieldCheck size={11} />
              <span>Inside Sensor FOV</span>
            </div>
          )}
        </div>
      </div>

      {/* Telemetry & State Panel */}
      <div
        style={{
          padding: '0.75rem 0.9rem',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ background: 'var(--color-bg-deep)', padding: '0.4rem 0.5rem', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.64rem' }}>DOT POSITION (x, y) &amp; θ</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>
            ({dotPixelX.toFixed(1)}, {dotPixelY.toFixed(1)}) <span style={{ color: 'var(--color-cyan)', fontSize: '0.62rem' }}>θ = {angleDeg.toFixed(0)}°</span>
          </span>
        </div>

        <div style={{ background: 'var(--color-bg-deep)', padding: '0.4rem 0.5rem', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.64rem' }}>ORBIT RADIUS</span>
          <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>
            {orbitalRadiusPx.toFixed(1)} px <span style={{ color: 'var(--color-text-muted)', fontSize: '0.62rem' }}>({((orbitalRadiusPx / halfRes) * 100).toFixed(0)}%)</span>
          </span>
        </div>

        <div style={{ background: 'var(--color-bg-deep)', padding: '0.4rem 0.5rem', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.64rem' }}>DOT DIAMETER</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>
            {dotDiameterPx.toFixed(1)} px <span style={{ color: 'var(--color-text-muted)', fontSize: '0.62rem' }}>({((dotDiameterPx / resolution) * 100).toFixed(0)}% W)</span>
          </span>
        </div>

        <div style={{ background: 'var(--color-bg-deep)', padding: '0.4rem 0.5rem', borderRadius: 4, border: '1px solid var(--color-border-subtle)' }}>
          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.64rem' }}>ANGULAR VELOCITY</span>
          <span style={{ color: speedDegPerSec === 0 ? 'var(--color-accent-amber)' : 'var(--color-accent-emerald)', fontWeight: 700 }}>
            {speedRps.toFixed(2)} rev/s <span style={{ color: 'var(--color-text-muted)', fontSize: '0.62rem' }}>({speedDegPerSec}°/s)</span>
          </span>
        </div>
      </div>
    </div>
  )
}

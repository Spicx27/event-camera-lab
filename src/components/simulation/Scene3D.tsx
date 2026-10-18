import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Camera, ChevronDown, ChevronUp, Compass, Eye, Info, Target } from 'lucide-react'
import type { OpticalPattern } from '@/sim/sceneModel'

export type CameraPOV = 'overview' | 'frame_camera' | 'event_camera' | 'target'

interface Scene3DProps {
  angleRad: number
  motionPattern: 'rotation' | 'oscillation'
  posNorm: number
  sphereNormX: number
  sphereNormY: number
  opticalPattern: OpticalPattern
  illuminationLux: number
  eventActivity: boolean
  isExposing: boolean
}

/**
 * Creates a procedural canvas texture matching the selected optical pattern.
 */
function createPatternTexture(pattern: OpticalPattern): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.46

  // Dark backing disk
  ctx.fillStyle = '#0a1526'
  ctx.fillRect(0, 0, size, size)

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#0f172a'
  ctx.fill()

  if (pattern === 'siemens_star') {
    // 8 black/white spoke pairs with sharp high-contrast transitions (Slide 17)
    const numSpokes = 8
    const step = (Math.PI * 2) / (numSpokes * 2)
    for (let i = 0; i < numSpokes * 2; i += 2) {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, i * step, (i + 1) * step)
      ctx.closePath()
      ctx.fillStyle = '#f8fafc'
      ctx.fill()
    }
  } else if (pattern === 'quadrant') {
    // 4 quadrants
    const step = Math.PI / 2
    for (let i = 0; i < 4; i += 2) {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, i * step, (i + 1) * step)
      ctx.closePath()
      ctx.fillStyle = '#38bdf8'
      ctx.fill()
    }
  } else if (pattern === 'rotating_dot') {
    // Disc with single bright white dot (Slide 10 space-time stimulus)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = '#1e293b'
    ctx.fill()

    const dotRadius = r * 0.65
    const dotX = cx + Math.cos(0) * dotRadius
    const dotY = cy + Math.sin(0) * dotRadius
    ctx.beginPath()
    ctx.arc(dotX, dotY, r * 0.18, 0, Math.PI * 2)
    ctx.fillStyle = '#06b6d4'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }

  // Outer border & center pin
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = 10
  ctx.strokeStyle = '#06b6d4'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2)
  ctx.fillStyle = '#0284c7'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Renders a true rectangular optical viewing frustum from the camera lens
 * extending onto the observed target disc plane.
 */
function CameraFrustum({
  origin,
  target,
  color,
  fovWidth = 2.8,
  fovHeight = 2.8,
}: {
  origin: [number, number, number]
  target: [number, number, number]
  color: string
  fovWidth?: number
  fovHeight?: number
}) {
  const lineGeometry = useMemo(() => {
    const [ox, oy, oz] = origin
    const [tx, ty, tz] = target
    const hw = fovWidth / 2
    const hh = fovHeight / 2

    const c0: [number, number, number] = [tx - hw, ty + hh, tz]
    const c1: [number, number, number] = [tx + hw, ty + hh, tz]
    const c2: [number, number, number] = [tx + hw, ty - hh, tz]
    const c3: [number, number, number] = [tx - hw, ty - hh, tz]

    const points: number[] = [
      // 4 rays from camera lens pupil
      ox, oy, oz, c0[0], c0[1], c0[2],
      ox, oy, oz, c1[0], c1[1], c1[2],
      ox, oy, oz, c2[0], c2[1], c2[2],
      ox, oy, oz, c3[0], c3[1], c3[2],
      // 4 edges of the target plane viewing window
      c0[0], c0[1], c0[2], c1[0], c1[1], c1[2],
      c1[0], c1[1], c1[2], c2[0], c2[1], c2[2],
      c2[0], c2[1], c2[2], c3[0], c3[1], c3[2],
      c3[0], c3[1], c3[2], c0[0], c0[1], c0[2],
    ]

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geom
  }, [origin, target, fovWidth, fovHeight])

  const meshGeometry = useMemo(() => {
    const [ox, oy, oz] = origin
    const [tx, ty, tz] = target
    const hw = fovWidth / 2
    const hh = fovHeight / 2

    const c0: [number, number, number] = [tx - hw, ty + hh, tz]
    const c1: [number, number, number] = [tx + hw, ty + hh, tz]
    const c2: [number, number, number] = [tx + hw, ty - hh, tz]
    const c3: [number, number, number] = [tx - hw, ty - hh, tz]

    // 4 triangular sides of the optical pyramid
    const vertices = new Float32Array([
      // Top face
      ox, oy, oz, c0[0], c0[1], c0[2], c1[0], c1[1], c1[2],
      // Right face
      ox, oy, oz, c1[0], c1[1], c1[2], c2[0], c2[1], c2[2],
      // Bottom face
      ox, oy, oz, c2[0], c2[1], c2[2], c3[0], c3[1], c3[2],
      // Left face
      ox, oy, oz, c3[0], c3[1], c3[2], c0[0], c0[1], c0[2],
    ])

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geom.computeVertexNormals()
    return geom
  }, [origin, target, fovWidth, fovHeight])

  return (
    <group>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.65} />
      </lineSegments>
      <mesh geometry={meshGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Controls the observer camera position when changing viewing perspective.
 */
function CameraPerspectiveController({ view }: { view: CameraPOV }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (view === 'overview') {
      camera.position.set(0, 2.7, 5.0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, -0.4)
        controlsRef.current.update()
      }
    } else if (view === 'frame_camera') {
      // Perspective right behind Frame Camera lens looking at target
      camera.position.set(-2.0, 0.45, 2.3)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, -0.1, -1.0)
        controlsRef.current.update()
      }
    } else if (view === 'event_camera') {
      // Perspective right behind Event Camera lens looking at target
      camera.position.set(2.0, 0.45, 2.3)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, -0.1, -1.0)
        controlsRef.current.update()
      }
    } else if (view === 'target') {
      // Direct close-up on target assembly
      camera.position.set(0, 0.7, 1.6)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, -1.0)
        controlsRef.current.update()
      }
    }
  }, [view, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      minDistance={1.4}
      maxDistance={9.5}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  )
}

/**
 * Optical bench with:
 * 1. Common viewing area: High-contrast wheel/disc + independently moving bright sphere
 * 2. Two visibly distinct camera rigs (Frame Camera on left, Event Camera on right)
 * 3. Directional view frustums linking each physical camera model to the target
 */
function OpticalBenchRig({
  angleRad,
  motionPattern,
  posNorm,
  sphereNormX,
  sphereNormY,
  opticalPattern,
  illuminationLux,
  eventActivity,
  isExposing,
}: Scene3DProps) {
  const rotorRef = useRef<THREE.Group>(null)
  const sphereRef = useRef<THREE.Mesh>(null)
  const eventLedRef = useRef<THREE.MeshStandardMaterial>(null)
  const frameShutterRef = useRef<THREE.MeshStandardMaterial>(null)

  const texture = useMemo(() => createPatternTexture(opticalPattern), [opticalPattern])

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame(() => {
    if (rotorRef.current) {
      if (motionPattern === 'rotation') {
        rotorRef.current.rotation.z = -angleRad
        rotorRef.current.position.x = 0
      } else {
        rotorRef.current.rotation.z = 0
        rotorRef.current.position.x = posNorm * 1.4
      }
    }

    if (sphereRef.current) {
      if (motionPattern === 'rotation') {
        sphereRef.current.position.x = sphereNormX * 1.3
        sphereRef.current.position.y = sphereNormY * 1.3
      } else {
        sphereRef.current.position.x = posNorm * 1.4
        sphereRef.current.position.y = sphereNormY * 0.6
      }
    }

    if (eventLedRef.current) {
      eventLedRef.current.emissiveIntensity = eventActivity ? 2.5 : 0.3
    }

    if (frameShutterRef.current) {
      frameShutterRef.current.emissiveIntensity = isExposing ? 2.0 : 0.2
    }
  })

  // Dynamic Lux scale factor (10 lux -> dim, 10,000 lux -> intense)
  const lightIntensity = Math.max(0.4, Math.min(3.0, Math.log10(Math.max(1, illuminationLux)) / 2.2))

  // World coordinates of camera lens pupils for realistic frustum projection:
  // Left Rig (Frame Camera): Pos [-1.9, -0.05, 1.4], rot [0, 0.40, 0]
  const frameLensPupil: [number, number, number] = [-1.52, -0.30, 0.52]
  // Right Rig (Event Camera): Pos [1.9, -0.05, 1.4], rot [0, -0.40, 0]
  const eventLensPupil: [number, number, number] = [1.52, -0.30, 0.52]
  // Target center in world space
  const targetCenter: [number, number, number] = [0, -0.05, -1.0]

  return (
    <group position={[0, 0, 0]}>
      {/* ── High-Visibility Studio Lighting ── */}
      {/* Hemisphere light: soft ice-blue sky, slate-900 ground for natural laboratory ambiance */}
      <hemisphereLight args={['#bfdbfe', '#1e293b', 0.95 * lightIntensity]} />
      {/* Key directional light with soft shadows */}
      <directionalLight position={[4, 6, 5]} intensity={1.35 * lightIntensity} castShadow />
      {/* Fill directional light from opposite angle to prevent dark camera chassis shadows */}
      <directionalLight position={[-4, 3, 2]} intensity={0.75 * lightIntensity} color="#cbd5e1" />
      {/* Focused spotlight on optical disc */}
      <spotLight
        position={[0, 4.0, 1.2]}
        target-position={[0, 0, -1.0]}
        angle={0.7}
        penumbra={0.6}
        intensity={2.2 * lightIntensity}
        color="#e0f2fe"
      />

      {/* ── High-Contrast Optical Breadboard Bench ── */}
      <mesh position={[0, -1.6, 0.6]} receiveShadow>
        <boxGeometry args={[7.4, 0.22, 4.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Laser-etched metric grid lines */}
      <gridHelper
        args={[7.2, 18, '#38bdf8', '#475569']}
        position={[0, -1.48, 0.6]}
      />

      {/* Center Bench Optical Dovetail Rail Guide */}
      <mesh position={[0, -1.47, 0.6]}>
        <boxGeometry args={[7.0, 0.03, 0.45]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* ── COMMON VIEWING AREA: Target Assembly ── */}
      <group position={[0, 0, -1.0]}>
        {/* Support Pillar */}
        <mesh position={[0, -0.75, 0]}>
          <cylinderGeometry args={[0.18, 0.25, 1.5, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.05, -0.15]}>
          <boxGeometry args={[0.55, 0.55, 0.35]} />
          <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* 1. Dynamic Rotating/Oscillating Wheel/Disc (Flipped 90° to face cameras directly) */}
        <group ref={rotorRef}>
          {/* 3D Wheel Body (thickness 0.08) rotated 90° so flat circular face faces +Z (the cameras) */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.25, 1.25, 0.08, 64]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.25} />
          </mesh>

          {/* Front Face: High-Contrast Optical Pattern (Siemens Star / Quadrants / Dot) */}
          <mesh position={[0, 0, 0.042]}>
            <circleGeometry args={[1.24, 64]} />
            <meshStandardMaterial
              map={texture}
              metalness={0.2}
              roughness={0.35}
            />
          </mesh>

          {/* Center Axle Pin / Hub */}
          <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.09, 32]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.1} />
          </mesh>
        </group>

        {/* 2. Visible Orbital Trajectory Ring for the Independently Moving Object */}
        <mesh position={[0, 0, 0.08]}>
          <ringGeometry args={[1.27, 1.33, 64]} />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 3. Independently Movable Bright Sphere */}
        <mesh ref={sphereRef} position={[1.3, 0, 0.12]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={0.75}
            roughness={0.15}
            metalness={0.85}
          />
        </mesh>

        {/* Common Target 3D Label */}
        <Html position={[0, 1.6, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              padding: '0.22rem 0.65rem',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1.5px solid #38bdf8',
              borderRadius: 6,
              color: '#f8fafc',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8' }} />
            🎯 SHARED OPTICAL TARGET (Rotating Disc & Sphere)
          </div>
        </Html>
      </group>

      {/* ── CAMERA RIG 1 (LEFT): Conventional Frame-Based Camera (APS) ── */}
      <group position={[-1.9, -0.05, 1.4]} rotation={[0, 0.40, 0]}>
        {/* Support Base & Post clamped to breadboard */}
        <mesh position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 1.0, 20]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Camera Main Chassis (Industrial Silver-Aluminum Machine Vision Style) */}
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.95, 0.95, 1.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Lens Mount Flange */}
        <mesh position={[0, -0.25, -0.56]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.44, 0.05, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Precision C-Mount Lens Barrel */}
        <mesh position={[0, -0.25, -0.82]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.38, 0.55, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Front Lens Glass with Indigo AR Coating */}
        <mesh position={[0, -0.25, -1.1]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial
            color="#818cf8"
            roughness={0.05}
            metalness={0.95}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Shutter Status Indicator LED (Lavender/Indigo) */}
        <mesh position={[0.36, 0.16, -0.45]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            ref={frameShutterRef}
            color="#818cf8"
            emissive="#818cf8"
            emissiveIntensity={isExposing ? 2.0 : 0.2}
          />
        </mesh>

        {/* 3D Label over Frame Camera */}
        <Html position={[0, 0.75, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              padding: '0.28rem 0.65rem',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid #818cf8',
              borderRadius: 6,
              color: '#e0e7ff',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(129, 140, 248, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
            }}
          >
            <span>📸 FRAME CAMERA (APS)</span>
            <span style={{ fontSize: '9px', color: '#c7d2fe', fontWeight: 500 }}>
              Left Rig · Azimuth -23°
            </span>
          </div>
        </Html>
      </group>

      {/* ── CAMERA RIG 2 (RIGHT): Event-Based Neuromorphic Camera (DVS) ── */}
      <group position={[1.9, -0.05, 1.4]} rotation={[0, -0.40, 0]}>
        {/* Support Base & Post clamped to breadboard */}
        <mesh position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 1.0, 20]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Camera Main Chassis (Slate Anodized Neuromorphic Housing) */}
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.95, 0.95, 1.1]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Vibrant Anodized Cyan Trim Ring */}
        <mesh position={[0, -0.25, -0.56]}>
          <ringGeometry args={[0.39, 0.44, 32]} />
          <meshStandardMaterial color="#06b6d4" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* DVS Optical Lens Barrel */}
        <mesh position={[0, -0.25, -0.82]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.38, 0.55, 32]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Front Silicon Retina Glass */}
        <mesh position={[0, -0.25, -1.1]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial
            color="#06b6d4"
            roughness={0.05}
            metalness={0.95}
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* AER Event Activity Indicator LED (Cyan) */}
        <mesh position={[-0.36, 0.16, -0.45]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            ref={eventLedRef}
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={eventActivity ? 2.5 : 0.3}
          />
        </mesh>

        {/* 3D Label over Event Camera */}
        <Html position={[0, 0.75, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              padding: '0.28rem 0.65rem',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid #06b6d4',
              borderRadius: 6,
              color: '#cffafe',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
            }}
          >
            <span>⚡ EVENT CAMERA (DVS)</span>
            <span style={{ fontSize: '9px', color: '#a5f3fc', fontWeight: 500 }}>
              Right Rig · Azimuth +23°
            </span>
          </div>
        </Html>
      </group>

      {/* ── DIRECTIONAL VIEW FRUSTUMS CONNECTING REAL CAMERAS TO TARGET ── */}
      {/* Frame Camera Frustum (Indigo #818cf8) */}
      <CameraFrustum
        origin={frameLensPupil}
        target={targetCenter}
        color="#818cf8"
        fovWidth={2.8}
        fovHeight={2.8}
      />

      {/* Event Camera Frustum (Cyan #06b6d4) */}
      <CameraFrustum
        origin={eventLensPupil}
        target={targetCenter}
        color="#06b6d4"
        fovWidth={2.8}
        fovHeight={2.8}
      />
    </group>
  )
}

export default function Scene3D(props: Scene3DProps) {
  const [cameraPOV, setCameraPOV] = useState<CameraPOV>('overview')
  const [showGuide, setShowGuide] = useState<boolean>(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          width: '100%',
          height: '480px',
          background: 'linear-gradient(180deg, #162033 0%, #0f172a 100%)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          position: 'relative',
        }}
      >
        <Canvas
          camera={{ position: [0, 2.7, 5.0], fov: 46 }}
          gl={{ antialias: true, alpha: false }}
        >
          {/* Lighter, clear laboratory studio background */}
          <color attach="background" args={['#0f172a']} />
          <CameraPerspectiveController view={cameraPOV} />
          <OpticalBenchRig {...props} />
        </Canvas>

        {/* Viewport Overlay Header (Top-Left) */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '0.35rem 0.65rem',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            zIndex: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: props.eventActivity ? 'var(--color-cyan)' : 'var(--color-text-muted)',
              boxShadow: props.eventActivity ? '0 0 8px var(--color-cyan)' : 'none',
            }}
          />
          3D Optical Testbench
        </div>

        {/* Camera Perspective Selector (Top-Right) */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '0.25rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setCameraPOV('overview')}
            title="Scene Overview (Standard Orbit)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.45rem',
              background: cameraPOV === 'overview' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              border: cameraPOV === 'overview' ? '1px solid var(--color-cyan)' : '1px solid transparent',
              borderRadius: 6,
              color: cameraPOV === 'overview' ? '#a5f3fc' : 'var(--color-text-muted)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              fontWeight: cameraPOV === 'overview' ? 700 : 400,
            }}
          >
            <Compass size={12} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setCameraPOV('frame_camera')}
            title="Inspect from Frame Camera viewpoint"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.45rem',
              background: cameraPOV === 'frame_camera' ? 'rgba(129, 140, 248, 0.25)' : 'transparent',
              border: cameraPOV === 'frame_camera' ? '1px solid #818cf8' : '1px solid transparent',
              borderRadius: 6,
              color: cameraPOV === 'frame_camera' ? '#e0e7ff' : 'var(--color-text-muted)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              fontWeight: cameraPOV === 'frame_camera' ? 700 : 400,
            }}
          >
            <Camera size={12} color="#818cf8" />
            <span>Frame POV</span>
          </button>

          <button
            onClick={() => setCameraPOV('event_camera')}
            title="Inspect from Event Camera viewpoint"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.45rem',
              background: cameraPOV === 'event_camera' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
              border: cameraPOV === 'event_camera' ? '1px solid #06b6d4' : '1px solid transparent',
              borderRadius: 6,
              color: cameraPOV === 'event_camera' ? '#cffafe' : 'var(--color-text-muted)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              fontWeight: cameraPOV === 'event_camera' ? 700 : 400,
            }}
          >
            <Eye size={12} color="#06b6d4" />
            <span>Event POV</span>
          </button>

          <button
            onClick={() => setCameraPOV('target')}
            title="Zoom into rotating target"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.45rem',
              background: cameraPOV === 'target' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: cameraPOV === 'target' ? '1px solid #38bdf8' : '1px solid transparent',
              borderRadius: 6,
              color: cameraPOV === 'target' ? '#bae6fd' : 'var(--color-text-muted)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              fontWeight: cameraPOV === 'target' ? 700 : 400,
            }}
          >
            <Target size={12} color="#38bdf8" />
            <span>Target</span>
          </button>
        </div>

        {/* Orbit Tip (Bottom-Right) */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: 12,
            padding: '0.25rem 0.5rem',
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: 4,
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border-subtle)',
            zIndex: 10,
          }}
        >
          🖱 Drag: Orbit · Scroll: Zoom
        </div>

        {/* Toggle Explanation Button (Bottom-Left) */}
        <button
          onClick={() => setShowGuide(prev => !prev)}
          style={{
            position: 'absolute',
            bottom: 10,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: 'rgba(15, 23, 42, 0.90)',
            border: '1px solid var(--color-cyan)',
            borderRadius: 6,
            color: 'var(--color-cyan)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
            zIndex: 10,
          }}
        >
          <Info size={13} />
          <span>{showGuide ? 'Hide Alignment Guide' : 'ℹ️ Alignment Guide'}</span>
          {showGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* ── Collapsible Educational Alignment Guide (Step 5) ── */}
      {showGuide && (
        <div
          className="card"
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--color-border)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-cyan)' }}>
            <Info size={18} />
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>
              Physical Camera Positions & Viewport Correspondence Guide
            </h4>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}
          >
            {/* Left Camera Box */}
            <div
              style={{
                padding: '0.85rem',
                background: 'rgba(99, 102, 241, 0.08)',
                borderLeft: '3px solid #818cf8',
                borderRadius: 6,
              }}
            >
              <strong style={{ color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Camera size={14} color="#818cf8" />
                Left Rig: Frame-Based Camera (APS)
              </strong>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.78rem' }}>
                Positioned on the <strong>left optical rail</strong> (azimuth -23°) pointing toward the center target.
                Its output corresponds directly to the <strong>Left Sensor Panel</strong> below.
                Images are captured at fixed intervals (<em>T_frame = 1/FPS</em>). Moving edges sweep across pixels
                during the open shutter, creating <em>exposure motion smear</em>. Any movement occurring during
                the shutter-closed interval is lost.
              </p>
            </div>

            {/* Right Camera Box */}
            <div
              style={{
                padding: '0.85rem',
                background: 'rgba(6, 182, 212, 0.08)',
                borderLeft: '3px solid var(--color-cyan)',
                borderRadius: 6,
              }}
            >
              <strong style={{ color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Eye size={14} color="var(--color-cyan)" />
                Right Rig: Event-Based Camera (DVS)
              </strong>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.78rem' }}>
                Positioned on the <strong>right optical rail</strong> (azimuth +23°) observing the same target.
                Its output corresponds directly to the <strong>Right Sensor Panel</strong> below.
                Instead of full frames, autonomous pixels emit microsecond asynchronous spikes whenever local
                logarithmic contrast changes (<em>|Δln(I)| ≥ C</em>). Unchanged areas emit zero events,
                completely avoiding motion blur.
              </p>
            </div>

            {/* Viewpoint Geometry Box */}
            <div
              style={{
                padding: '0.85rem',
                background: 'rgba(56, 189, 248, 0.08)',
                borderLeft: '3px solid #38bdf8',
                borderRadius: 6,
              }}
            >
              <strong style={{ color: '#bae6fd', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Target size={14} color="#38bdf8" />
                Physical Viewpoint Correspondence
              </strong>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.78rem' }}>
                Both cameras observe the <strong>exact same moving object</strong> (high-contrast rotating disc
                and orbiting bright sphere). Because the cameras are mounted at symmetric ±23° azimuth angles,
                the target appears slightly foreshortened from their respective physical perspectives,
                demonstrating that the viewports represent genuine optical sensors in the 3D testbench.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

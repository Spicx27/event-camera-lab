import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Clock, Compass, Layers, RotateCcw, Target, ZoomIn } from 'lucide-react'
import type { DvsEvent, EventEngine, PolarityFilter } from '@/sim/eventEngine'
import type { CanonicalSimulationState } from '@/sim/orbitingDotModel'

export type StreamPOV = 'perspective' | 'front_sensor' | 'side_time_y' | 'top_time_x'

export interface EventStream3DViewerProps {
  events: DvsEvent[]
  selectedEvent: DvsEvent | null
  onSelectEvent: (event: DvsEvent | null) => void
  width: number
  height: number
  windowMs: number
  simTimeMs: number
  polarityFilter: PolarityFilter
  onPolarityFilterChange?: (filter: PolarityFilter) => void
  pointSize: number
  onRenderedCountChange?: (count: number) => void
  canonicalStateRef?: React.MutableRefObject<CanonicalSimulationState>
  eventEngineRef?: React.MutableRefObject<EventEngine>
}

const MAX_RENDER_POINTS = 25000
const SPATIAL_SIZE = 2.8 // Width and Height in 3D scene units
const TIME_LENGTH = 6.2  // Depth along Z axis in 3D scene units


/**
 * High-performance batched point cloud rendering for 3D event stream (x, y, t).
 * Driven directly in useFrame from canonicalStateRef and eventEngineRef,
 * guaranteeing instantaneous synchronization and 0 lag behind the 2D dot.
 */
function EventPointCloud({
  events,
  selectedEvent,
  onSelectEvent,
  width,
  height,
  windowMs,
  simTimeMs,
  polarityFilter,
  pointSize,
  onRenderedCountChange,
  canonicalStateRef,
  eventEngineRef,
}: EventStream3DViewerProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera, mouse } = useThree()
  const localRaycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())

  // Pre-allocated BufferGeometry instance (zero GC pressure)
  const [pointGeom] = useState(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_RENDER_POINTS * 3)
    const colors = new Float32Array(MAX_RENDER_POINTS * 3)
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geom.setDrawRange(0, 0)
    return geom
  })

  const renderedEventsRef = useRef<DvsEvent[]>([])
  const lastRenderedCountRef = useRef<number>(-1)
  const lastProcessedSimTimeRef = useRef<number>(-999999)

  // High-performance direct buffer update loop at 60 FPS
  useFrame(() => {
    const pointsMesh = pointsRef.current
    if (!pointsMesh) return

    const state = canonicalStateRef?.current
    const engine = eventEngineRef?.current

    // Authoritative time: scrubTimeMs takes precedence if active, else continuous simTimeMs
    const curSimMs = state
      ? (state.scrubTimeMs !== null ? state.scrubTimeMs : state.simTimeMs)
      : simTimeMs
    const curWindowMs = state ? state.windowMs : windowMs
    const curWidth = state ? state.resolution : width
    const curHeight = state ? state.resolution : height
    const isPlaying = state ? state.isPlaying : true

    // Performance optimization: When paused and time has not changed, skip redundant work
    if (!isPlaying && Math.abs(curSimMs - lastProcessedSimTimeRef.current) < 0.0001) {
      return
    }
    lastProcessedSimTimeRef.current = curSimMs

    // Two-phase monotonic time window mapping:
    // 1. Initial ramp-up (simTimeMs <= windowMs): window is [0, windowMs]
    // 2. Rolling window (simTimeMs > windowMs): window is [simTimeMs - windowMs, simTimeMs]
    const isRampingUp = curSimMs <= curWindowMs
    const tEndMs = isRampingUp ? curWindowMs : curSimMs
    const tStartMs = isRampingUp ? 0 : curSimMs - curWindowMs
    const tEndUs = tEndMs * 1000
    const tStartUs = tStartMs * 1000
    const windowSpanUs = Math.max(1, tEndUs - tStartUs)

    const invWidth = 1 / (curWidth - 1)
    const invHeight = 1 / (curHeight - 1)
    const invWindowSpan = 1 / windowSpanUs

    // Direct extraction from ring buffer
    const eventList = engine
      ? engine.getStreamEventsInWindow(tStartUs, tEndUs, MAX_RENDER_POINTS)
      : events

    const geom = pointsMesh.geometry
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute
    const colAttr = geom.getAttribute('color') as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array
    const colors = colAttr.array as Float32Array

    const renderedList: DvsEvent[] = []
    let count = 0
    const totalEvents = eventList.length

    for (let i = 0; i < totalEvents && count < MAX_RENDER_POINTS; i++) {
      const ev = eventList[i]
      if (polarityFilter === 'on' && ev.p !== 1) continue
      if (polarityFilter === 'off' && ev.p !== -1) continue

      renderedList.push(ev)
      const pIdx = count * 3

      // Coordinate mapping:
      // X-axis: Horizontal sensor coordinate [0..width-1] -> [-SPATIAL_SIZE/2, +SPATIAL_SIZE/2]
      const x3d = ((ev.x * invWidth) - 0.5) * SPATIAL_SIZE

      // Y-axis: Vertical sensor coordinate [0..height-1] -> [+SPATIAL_SIZE/2, -SPATIAL_SIZE/2] (inverted for optical coordinate frame)
      const y3d = (0.5 - (ev.y * invHeight)) * SPATIAL_SIZE

      // Z-axis: Simulation time t -> [-TIME_LENGTH/2, +TIME_LENGTH/2]
      // Older events near -TIME_LENGTH/2, newest events near +TIME_LENGTH/2
      const relTime = Math.max(0, Math.min(1, (ev.t - tStartUs) * invWindowSpan))
      const z3d = (relTime - 0.5) * TIME_LENGTH

      positions[pIdx] = x3d
      positions[pIdx + 1] = y3d
      positions[pIdx + 2] = z3d

      // Grayscale encoding:
      // ON (+1): Pure White [1.0, 1.0, 1.0]
      // OFF (-1): Silver-Grey [0.65, 0.65, 0.65]
      // Selected: Electric Cyan [0.22, 0.85, 1.0]
      const isSelected = selectedEvent && selectedEvent.x === ev.x && selectedEvent.y === ev.y && selectedEvent.t === ev.t
      if (isSelected) {
        colors[pIdx] = 0.22
        colors[pIdx + 1] = 0.85
        colors[pIdx + 2] = 1.0
      } else if (ev.p === 1) {
        colors[pIdx] = 1.0
        colors[pIdx + 1] = 1.0
        colors[pIdx + 2] = 1.0
      } else {
        colors[pIdx] = 0.65
        colors[pIdx + 1] = 0.65
        colors[pIdx + 2] = 0.65
      }

      count++
    }

    renderedEventsRef.current = renderedList

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    geom.setDrawRange(0, count)

    if (onRenderedCountChange && count !== lastRenderedCountRef.current) {
      lastRenderedCountRef.current = count
      onRenderedCountChange(count)
    }
  })

  // Click raycasting on event points
  const handlePointerDown = () => {
    const pointsMesh = pointsRef.current
    const drawnEvents = renderedEventsRef.current
    if (!pointsMesh || drawnEvents.length === 0) return

    const rc = localRaycasterRef.current
    rc.params.Points = { threshold: 0.12 }
    rc.setFromCamera(mouse, camera)
    const intersects = rc.intersectObject(pointsMesh)

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const idx = intersects[0].index
      if (idx < drawnEvents.length) {
        onSelectEvent(drawnEvents[idx])
      }
    }
  }

  // Calculate 3D position of selected event for highlight reticle
  const selected3dPos = useMemo<THREE.Vector3 | null>(() => {
    if (!selectedEvent) return null

    const isRampingUp = simTimeMs <= windowMs
    const tEndMs = isRampingUp ? windowMs : simTimeMs
    const tStartMs = isRampingUp ? 0 : simTimeMs - windowMs
    const tEndUs = tEndMs * 1000
    const tStartUs = tStartMs * 1000
    const windowSpanUs = Math.max(1, tEndUs - tStartUs)

    const x3d = ((selectedEvent.x / (width - 1)) - 0.5) * SPATIAL_SIZE
    const y3d = (0.5 - (selectedEvent.y / (height - 1))) * SPATIAL_SIZE
    const relTime = Math.max(0, Math.min(1, (selectedEvent.t - tStartUs) / windowSpanUs))
    const z3d = (relTime - 0.5) * TIME_LENGTH
    return new THREE.Vector3(x3d, y3d, z3d)
  }, [selectedEvent, width, height, windowMs, simTimeMs])

  return (
    <group onPointerDown={handlePointerDown}>
      <points ref={pointsRef}>
        <primitive object={pointGeom} attach="geometry" />
        <pointsMaterial
          size={Math.max(2.5, pointSize)}
          sizeAttenuation={false}
          vertexColors
          transparent
          opacity={0.96}
          depthWrite={false}
        />
      </points>

      {/* Selected Event 3D Marker & Reticle */}
      {selected3dPos && (
        <group position={selected3dPos}>
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#38bdf8" wireframe />
          </mesh>
          <mesh>
            <ringGeometry args={[0.09, 0.11, 24]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
          <Html position={[0.15, 0.15, 0]} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                background: 'rgba(5, 13, 26, 0.92)',
                border: '1px solid var(--color-cyan)',
                borderRadius: 4,
                padding: '0.2rem 0.45rem',
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
            >
              ({selectedEvent?.x}, {selectedEvent?.y}, {selectedEvent?.t} µs) · {selectedEvent?.p === 1 ? 'White (+1)' : 'Grey (-1)'}
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

/**
 * Renders the 3D Space-Time Coordinate Frame, Rails, Planes, and GPU Tick Notches.
 * Completely eliminates DOM-thrashing Html nodes from the render loop.
 */
function SpaceTimeVolumeFrame() {
  const halfS = SPATIAL_SIZE / 2
  const halfT = TIME_LENGTH / 2

  // 4 corner rails along the Time (Z) axis
  const railLines = useMemo(() => {
    const points: THREE.Vector3[] = [
      // Top-Left rail
      new THREE.Vector3(-halfS, halfS, -halfT), new THREE.Vector3(-halfS, halfS, halfT),
      // Top-Right rail
      new THREE.Vector3(halfS, halfS, -halfT), new THREE.Vector3(halfS, halfS, halfT),
      // Bottom-Right rail
      new THREE.Vector3(halfS, -halfS, -halfT), new THREE.Vector3(halfS, -halfS, halfT),
      // Bottom-Left rail
      new THREE.Vector3(-halfS, -halfS, -halfT), new THREE.Vector3(-halfS, -halfS, halfT),
    ]
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [halfS, halfT])

  // Sensor face wireframe rectangles at front (t_now) and back (t_now - Δt)
  const planeFrames = useMemo(() => {
    const pts: THREE.Vector3[] = [
      // Front plane (+Z)
      new THREE.Vector3(-halfS, -halfS, halfT), new THREE.Vector3(halfS, -halfS, halfT),
      new THREE.Vector3(halfS, -halfS, halfT), new THREE.Vector3(halfS, halfS, halfT),
      new THREE.Vector3(halfS, halfS, halfT), new THREE.Vector3(-halfS, halfS, halfT),
      new THREE.Vector3(-halfS, halfS, halfT), new THREE.Vector3(-halfS, -halfS, halfT),
      // Back plane (-Z)
      new THREE.Vector3(-halfS, -halfS, -halfT), new THREE.Vector3(halfS, -halfS, -halfT),
      new THREE.Vector3(halfS, -halfS, -halfT), new THREE.Vector3(halfS, halfS, -halfT),
      new THREE.Vector3(halfS, halfS, -halfT), new THREE.Vector3(-halfS, halfS, -halfT),
      new THREE.Vector3(-halfS, halfS, -halfT), new THREE.Vector3(-halfS, -halfS, -halfT),
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [halfS, halfT])

  // 3D Time Tick Notches along the lower rails (GPU line segments, 0 DOM overhead)
  const tickNotches = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const fractions = [0, 0.25, 0.5, 0.75, 1.0]
    for (const frac of fractions) {
      const tickZ = (frac - 0.5) * TIME_LENGTH
      // Bottom-left rail tick notch
      pts.push(new THREE.Vector3(-halfS - 0.12, -halfS, tickZ))
      pts.push(new THREE.Vector3(-halfS, -halfS, tickZ))
      // Bottom-right rail tick notch
      pts.push(new THREE.Vector3(halfS + 0.12, -halfS, tickZ))
      pts.push(new THREE.Vector3(halfS, -halfS, tickZ))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [halfS])

  return (
    <group>
      {/* 4 Corner Rails along Time (Z) */}
      <lineSegments geometry={railLines}>
        <lineBasicMaterial color="#334155" transparent opacity={0.65} />
      </lineSegments>

      {/* Sensor plane boundary rectangles */}
      <lineSegments geometry={planeFrames}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.85} />
      </lineSegments>

      {/* Time Tick Notches on Rails */}
      <lineSegments geometry={tickNotches}>
        <lineBasicMaterial color="#06b6d4" transparent opacity={0.75} />
      </lineSegments>

      {/* Front Sensor Plane Grid (t = t_end) */}
      <group position={[0, 0, halfT]} rotation={[Math.PI / 2, 0, 0]}>
        <gridHelper args={[SPATIAL_SIZE, 8, '#06b6d4', '#1e293b']} />
      </group>

      {/* Back Sensor Plane Grid (t = t_start) */}
      <group position={[0, 0, -halfT]} rotation={[Math.PI / 2, 0, 0]}>
        <gridHelper args={[SPATIAL_SIZE, 8, '#64748b', '#1e293b']} />
      </group>
    </group>
  )
}

function CameraPerspectiveController({ pov }: { pov: StreamPOV }) {
  useFrame(({ camera }) => {
    let targetPos = new THREE.Vector3(4.2, 3.2, 5.2)
    let lookTarget = new THREE.Vector3(0, 0, 0)

    if (pov === 'front_sensor') {
      // Look straight down the time axis into the front sensor plane
      targetPos = new THREE.Vector3(0, 0, 6.8)
      lookTarget = new THREE.Vector3(0, 0, 0)
    } else if (pov === 'side_time_y') {
      // Orthogonal side view: Time (Z) vs Y
      targetPos = new THREE.Vector3(6.8, 0, 0)
      lookTarget = new THREE.Vector3(0, 0, 0)
    } else if (pov === 'top_time_x') {
      // Orthogonal top view: Time (Z) vs X
      targetPos = new THREE.Vector3(0, 6.8, 0)
      lookTarget = new THREE.Vector3(0, 0, 0)
    }

    camera.position.lerp(targetPos, 0.08)
    camera.lookAt(lookTarget)
  })

  return null
}

export default function EventStream3DViewer(props: EventStream3DViewerProps) {
  const [pov, setPov] = useState<StreamPOV>('perspective')
  const [cameraKey, setCameraKey] = useState<number>(0)

  const handleResetView = () => {
    setPov('perspective')
    setCameraKey(prev => prev + 1)
  }

  const isRampingUp = props.simTimeMs <= props.windowMs
  const tEndMs = isRampingUp ? Math.round(props.windowMs) : Math.round(props.simTimeMs)
  const tStartMs = isRampingUp ? 0 : Math.round(props.simTimeMs - props.windowMs)

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        position: 'relative',
        minWidth: 0,
      }}
    >
      {/* Viewer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-cyan)' }}>
            <Layers size={18} />
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
              3D Space-Time Event Stream Manifold (X, Y, Time)
            </h3>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', margin: '0.15rem 0 0' }}>
            Plots discrete event records <code style={{ color: 'var(--color-cyan)' }}>e_k = (x_k, y_k, t_k, p_k)</code>.
            The third dimension represents <strong>simulation time</strong>, revealing continuous spatiotemporal dynamics (Slide 10).
          </p>
        </div>

        {/* View Perspective & Polarity Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {/* Polarity Filter */}
          {props.onPolarityFilterChange && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-bg-deep)',
                borderRadius: 6,
                border: '1px solid var(--color-border-subtle)',
                padding: 2,
              }}
            >
              <button
                onClick={() => props.onPolarityFilterChange?.('all')}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  border: 'none',
                  background: props.polarityFilter === 'all' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: props.polarityFilter === 'all' ? '#a5f3fc' : 'var(--color-text-secondary)',
                  fontWeight: props.polarityFilter === 'all' ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                onClick={() => props.onPolarityFilterChange?.('on')}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  border: 'none',
                  background: props.polarityFilter === 'on' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: props.polarityFilter === 'on' ? '#ffffff' : 'var(--color-text-secondary)',
                  fontWeight: props.polarityFilter === 'on' ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                +1 ON
              </button>
              <button
                onClick={() => props.onPolarityFilterChange?.('off')}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  border: 'none',
                  background: props.polarityFilter === 'off' ? 'rgba(163, 163, 163, 0.2)' : 'transparent',
                  color: props.polarityFilter === 'off' ? '#d4d4d4' : 'var(--color-text-secondary)',
                  fontWeight: props.polarityFilter === 'off' ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                -1 OFF
              </button>
            </div>
          )}
          <button
            onClick={() => setPov('perspective')}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: pov === 'perspective' ? 700 : 400,
              border: pov === 'perspective' ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-subtle)',
              background: pov === 'perspective' ? 'rgba(6, 182, 212, 0.2)' : 'var(--color-bg-deep)',
              color: pov === 'perspective' ? '#a5f3fc' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="3D isometric perspective showing X, Y, and Time simultaneously"
          >
            <Compass size={12} />
            <span>3D Isometric</span>
          </button>

          <button
            onClick={() => setPov('front_sensor')}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: pov === 'front_sensor' ? 700 : 400,
              border: pov === 'front_sensor' ? '1px solid #818cf8' : '1px solid var(--color-border-subtle)',
              background: pov === 'front_sensor' ? 'rgba(129, 140, 248, 0.2)' : 'var(--color-bg-deep)',
              color: pov === 'front_sensor' ? '#e0e7ff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Look directly down the time axis at the 2D sensor array (X vs Y)"
          >
            <Target size={12} color="#818cf8" />
            <span>Front (X-Y)</span>
          </button>

          <button
            onClick={() => setPov('side_time_y')}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: pov === 'side_time_y' ? 700 : 400,
              border: pov === 'side_time_y' ? '1px solid #38bdf8' : '1px solid var(--color-border-subtle)',
              background: pov === 'side_time_y' ? 'rgba(56, 189, 248, 0.2)' : 'var(--color-bg-deep)',
              color: pov === 'side_time_y' ? '#bae6fd' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Side profile: Vertical sensor position Y vs Time Z"
          >
            <ZoomIn size={12} color="#38bdf8" />
            <span>Side (Time-Y)</span>
          </button>

          <button
            onClick={() => setPov('top_time_x')}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: pov === 'top_time_x' ? 700 : 400,
              border: pov === 'top_time_x' ? '1px solid #2dd4bf' : '1px solid var(--color-border-subtle)',
              background: pov === 'top_time_x' ? 'rgba(45, 212, 191, 0.2)' : 'var(--color-bg-deep)',
              color: pov === 'top_time_x' ? '#99f6e4' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Top profile: Horizontal sensor position X vs Time Z"
          >
            <Layers size={12} color="#2dd4bf" />
            <span>Top (Time-X)</span>
          </button>

          <button
            onClick={handleResetView}
            className="btn btn--ghost"
            style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            title="Reset 3D camera to default framing"
          >
            <RotateCcw size={12} />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div
        style={{
          width: '100%',
          height: '560px',
          background: 'linear-gradient(180deg, #131d2e 0%, #0a1120 100%)',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          position: 'relative',
        }}
      >
        <Canvas
          key={cameraKey}
          camera={{ position: [4.2, 3.2, 5.2], fov: 44 }}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#0a1120']} />
          <ambientLight intensity={0.65} />
          <directionalLight position={[5, 8, 5]} intensity={1.0} />

          <CameraPerspectiveController pov={pov} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            maxDistance={15}
            minDistance={2.5}
          />

          <SpaceTimeVolumeFrame />

          <EventPointCloud {...props} />
        </Canvas>

        {/* Polarity Grayscale Legend (Top-Right) */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '0.45rem 0.75rem',
            background: 'rgba(5, 13, 26, 0.92)',
            backdropFilter: 'blur(6px)',
            borderRadius: 6,
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--color-border-subtle)',
            zIndex: 10,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffffff', fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, background: '#ffffff', borderRadius: '50%', boxShadow: '0 0 6px #ffffff' }} />
            <span>+1 ON Event (White)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a3a3a3' }}>
            <span style={{ width: 8, height: 8, background: '#a3a3a3', borderRadius: '50%' }} />
            <span>-1 OFF Event (Grey)</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.2rem', fontSize: '0.62rem' }}>
            {props.events.length > 0 ? (
              <span style={{ color: 'var(--color-cyan)' }}>
                {props.events.length.toLocaleString()} events in active window (Δt = {props.windowMs} ms)
              </span>
            ) : (
              <span style={{ color: '#f59e0b' }}>
                0 events in window (Target stationary or threshold unreached)
              </span>
            )}
          </div>
        </div>

        {/* Space-Time Coordinate Axis HUD (Bottom-Left) */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '0.45rem 0.75rem',
            background: 'rgba(5, 13, 26, 0.92)',
            backdropFilter: 'blur(6px)',
            borderRadius: 6,
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--color-border-subtle)',
            zIndex: 10,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontWeight: 700 }}>
            <Clock size={12} />
            <span>TIME AXIS (Z): [{tStartMs} ms ... {tEndMs} ms] (Δt = {props.windowMs} ms)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8', fontSize: '0.64rem' }}>
            <span><strong style={{ color: '#06b6d4' }}>Front Plane (Z=+):</strong> Head (t = {tEndMs} ms)</span>
            <span>·</span>
            <span><strong style={{ color: '#64748b' }}>Back Plane (Z=-):</strong> Tail (t = {tStartMs} ms)</span>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.62rem' }}>
            Sensor X: [0..{props.width - 1} px] · Sensor Y: [0..{props.height - 1} px]
          </div>
        </div>

        {/* Selected Event Card (Top-Left) */}
        {props.selectedEvent ? (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '0.45rem 0.75rem',
              background: 'rgba(6, 182, 212, 0.12)',
              backdropFilter: 'blur(6px)',
              border: '1px solid var(--color-cyan)',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              zIndex: 10,
            }}
          >
            <span>
              Inspected Event: <strong>({props.selectedEvent.x}, {props.selectedEvent.y})</strong> · t ={' '}
              {props.selectedEvent.t} µs ({((props.selectedEvent.t) / 1000).toFixed(2)} ms) ·{' '}
              <span style={{ color: props.selectedEvent.p === 1 ? '#ffffff' : '#9ca3af', fontWeight: 700 }}>
                {props.selectedEvent.p === 1 ? '+1 ON (White)' : '-1 OFF (Grey)'}
              </span>
            </span>
            <button
              onClick={() => props.onSelectEvent(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '0.35rem 0.65rem',
              background: 'rgba(5, 13, 26, 0.88)',
              backdropFilter: 'blur(4px)',
              borderRadius: 6,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border-subtle)',
              zIndex: 10,
            }}
          >
            💡 Click any plotted point in 3D to inspect its Address-Event tuple
          </div>
        )}

        {/* Orbit instruction (Bottom-Right) */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            padding: '0.25rem 0.55rem',
            background: 'rgba(5, 13, 26, 0.85)',
            borderRadius: 4,
            fontSize: '0.64rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
            zIndex: 10,
          }}
        >
          🖱 Left Click + Drag: Orbit · Right Click: Pan · Scroll: Zoom
        </div>
      </div>
    </div>
  )
}

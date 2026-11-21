import { useEffect, useRef, useState } from 'react'
import { Glyph, IconButton, type IconName } from '../ui/Icons'
import { cameraCommands } from '../../game/camera/cameraCommands'
import { cameraState, virtualInput } from '../../game/camera/cameraState'
import { undo } from '../../game/core/history'
import { coastFactor, forestFactor, getTerrainHeight } from '../../game/environment/terrain'
import { finishDrawing } from '../../game/building/drawActions'
import type { DrawKind } from '../../game/building/drawing'
import { getHousePlan, planMetrics } from '../../game/building/housePlans'
import { confirmPlacement } from '../../game/building/PlacementSystem'
import { getShapePreset } from '../../data/shapePresets'
import { formatLength } from '../../services/units'
import { MATERIALS } from '../../data/materials'
import { cancelPendingMove, confirmPendingMove } from '../../game/building/pending'
import { useEditorStore } from '../../stores/editorStore'
import { dismissToast, useToastStore } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'

/** Small floating pieces of the interface: paint bar, minimap, touch controls, toasts. */

const PALETTE = [
  '#f3dfa6', '#f6efe2', '#e8873a', '#c94f32', '#a5432f', '#7a4a2b',
  '#6aa7e8', '#3f6fb5', '#8fcf6a', '#3f8a52', '#b9bcc0', '#55555c',
]

/** Color and coverage for the paint tool; then click objects to coat them. */
export function PaintBar() {
  const active = useEditorStore((s) => s.activeTool === 'paint')
  const color = useEditorStore((s) => s.paintColor)
  const strength = useEditorStore((s) => s.paintStrength)
  const erase = useEditorStore((s) => s.paintErase)
  const region = useEditorStore((s) => s.paintRegion)
  const mode = useEditorStore((s) => s.paintMode)
  const size = useEditorStore((s) => s.paintSize)
  const setPaint = useEditorStore((s) => s.setPaint)
  if (!active) return null

  return (
    <section className="shelf panel paintbar" aria-label="Sơn">
      <div className="swatches">
        {PALETTE.map((value) => (
          <button
            key={value}
            className={!erase && value === color ? 'color active' : 'color'}
            style={{ background: value }}
            title={value}
            aria-label={`Màu ${value}`}
            onClick={() => setPaint({ color: value })}
          />
        ))}
        <input type="color" aria-label="Màu tuỳ chọn" value={color} onChange={(e) => setPaint({ color: e.target.value })} />
      </div>
      <label>
        <span>
          {mode === 'brush' ? 'Độ đậm' : 'Độ phủ'} {Math.round(strength * 100)}%
        </span>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={Math.round(strength * 100)}
          onChange={(e) => setPaint({ strength: Number(e.target.value) / 100 })}
        />
      </label>
      {mode === 'brush' && (
        <label>
          <span>Cỡ cọ {Math.round(size * 100)} cm</span>
          <input type="range" min={5} max={100} step={5} value={Math.round(size * 100)} onChange={(e) => setPaint({ size: Number(e.target.value) / 100 })} />
        </label>
      )}
      <div className="bar-actions">
        <IconButton icon="pen" text="Cọ" label="Cọ: bôi tới đâu sơn tới đó, theo độ đậm và cỡ cọ" pressed={mode === 'brush'} onClick={() => setPaint({ mode: 'brush' })} />
        <IconButton icon="fill" text="Cả vật" label="Phủ cả vật: một lần chạm sơn cả vật được chạm" pressed={mode === 'coat'} onClick={() => setPaint({ mode: 'coat' })} />
        {mode === 'coat' && (
          <IconButton icon="fill" text="Cả vùng" label="Sơn cả vùng: một lần chạm phủ mọi phần cùng loại dính liền (cả dãy tường, cả mái)" pressed={region} onClick={() => setPaint({ region: !region })} />
        )}
        <IconButton icon="eraser" text="Gỡ sơn" label="Gỡ sơn" pressed={erase} onClick={() => setPaint({ erase: !erase })} />
      </div>
    </section>
  )
}

/** Atlas-style relief of part of the valley: height tints, contour lines, water. */
function drawRelief(size: number, centerX: number, centerZ: number, extent: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  // Muted tints that sit well inside the dark interface.
  const stops: [number, number[]][] = [
    [0, [205, 190, 140]],
    [1.2, [140, 176, 104]],
    [5, [164, 186, 112]],
    [14, [190, 178, 120]],
    [28, [170, 140, 98]],
    [50, [130, 100, 78]],
  ]
  const scale = (extent * 2) / size
  const worldX = (px: number) => centerX - extent + (px + 0.5) * scale
  const worldZ = (py: number) => centerZ - extent + (py + 0.5) * scale
  const heightAt = (px: number, py: number) => getTerrainHeight(worldX(px), worldZ(py))
  const interval = extent > 150 ? 5 : extent > 70 ? 2 : 1
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const h = heightAt(px, py)
      let rgb: number[]
      if (h < 0) {
        const depth = Math.min(1, -h / 6)
        const sea = coastFactor(worldX(px), worldZ(py)) > 0.2
        rgb = sea ? [96 - depth * 30, 150 - depth * 30, 186 - depth * 20] : [104, 160, 196]
      } else {
        let i = 0
        while (i < stops.length - 2 && h > stops[i + 1][0]) i++
        const [h0, c0] = stops[i]
        const [h1, c1] = stops[i + 1]
        const t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)))
        // Light from the north-west, as on printed relief maps.
        const shade = ((heightAt(px + 1, py + 1) - heightAt(px - 1, py - 1)) * 10) / scale
        rgb = c0.map((c, k) => c + (c1[k] - c) * t - shade)
        const woods = forestFactor(worldX(px), worldZ(py))
        if (woods > 0.5) rgb = [rgb[0] * 0.62, rgb[1] * 0.8, rgb[2] * 0.6]
        const level = Math.floor(h / interval)
        if (level !== Math.floor(heightAt(px + 1, py) / interval) || level !== Math.floor(heightAt(px, py + 1) / interval)) {
          rgb = rgb.map((c) => c * 0.78)
        }
      }
      const o = (py * size + px) * 4
      image.data[o] = rgb[0]
      image.data[o + 1] = rgb[1]
      image.data[o + 2] = rgb[2]
      image.data[o + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

const MAP_EXTENTS = [40, 80, 160, 280]

/**
 * Map of the valley in the corner. + / − zoom, ⤢ enlarges it. Click the map to
 * drop a marker: a line on the map and a beam of light in the world point the
 * way, and "Tới đó" jumps to it.
 */
export function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [large, setLarge] = useState(false)
  const [zoom, setZoom] = useState(2)
  const waypoint = useEditorStore((s) => s.waypoint)
  const setWaypoint = useEditorStore((s) => s.setWaypoint)
  const view = useRef({ x: 0, z: 0, extent: MAP_EXTENTS[2] })
  const [distance, setDistance] = useState<number | null>(null)
  const size = large ? 340 : 168
  const extent = MAP_EXTENTS[zoom]

  useEffect(() => {
    let relief: HTMLCanvasElement | null = null
    let reliefKey = ''
    const draw = () => {
      const ctx = canvas.current?.getContext('2d')
      if (!ctx) return
      // The widest view shows the whole valley; closer views follow you in steps.
      const step = extent / 4
      const cx = extent >= 280 ? 0 : Math.round(cameraState.x / step) * step
      const cz = extent >= 280 ? 0 : Math.round(cameraState.z / step) * step
      const key = `${size}|${extent}|${cx}|${cz}`
      if (key !== reliefKey) {
        relief = drawRelief(size, cx, cz, extent)
        reliefKey = key
      }
      view.current = { x: cx, z: cz, extent }
      const toMap = (world: number, center: number) => ((world - center + extent) / (extent * 2)) * size
      ctx.drawImage(relief!, 0, 0)

      ctx.fillStyle = '#7d2f22'
      const dot = extent <= 80 ? 3 : 2
      for (const obj of Object.values(useWorldStore.getState().objects)) {
        if (obj.type === 'road' || obj.type === 'mark_line') continue
        ctx.fillRect(toMap(obj.transform.position[0], cx) - dot / 2, toMap(obj.transform.position[2], cz) - dot / 2, dot, dot)
      }

      const px = toMap(cameraState.x, cx)
      const pz = toMap(cameraState.z, cz)
      const marker = useEditorStore.getState().waypoint
      if (marker) {
        const mx = Math.min(size - 6, Math.max(6, toMap(marker.x, cx)))
        const mz = Math.min(size - 6, Math.max(6, toMap(marker.z, cz)))
        ctx.strokeStyle = '#ffd36b'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(px, pz)
        ctx.lineTo(mx, mz)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(mx, mz, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffd36b'
        ctx.fill()
        ctx.strokeStyle = '#23201b'
        ctx.stroke()
        setDistance(Math.round(Math.hypot(marker.x - cameraState.x, marker.z - cameraState.z)))
      } else setDistance(null)

      // You: an arrow pointing where you look.
      ctx.save()
      ctx.translate(px, pz)
      ctx.rotate(-cameraState.yaw)
      ctx.beginPath()
      ctx.moveTo(0, -8)
      ctx.lineTo(5.5, 6)
      ctx.lineTo(0, 3)
      ctx.lineTo(-5.5, 6)
      ctx.closePath()
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#23201b'
      ctx.lineWidth = 1.5
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    draw()
    const timer = window.setInterval(draw, 200)
    return () => window.clearInterval(timer)
  }, [size, extent])

  const mark = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const { x, z, extent: shown } = view.current
    const point = {
      x: x - shown + ((e.clientX - rect.left) / rect.width) * shown * 2,
      z: z - shown + ((e.clientY - rect.top) / rect.height) * shown * 2,
    }
    // Clicking the marker again removes it.
    const near = waypoint && Math.hypot(waypoint.x - point.x, waypoint.z - point.z) < shown * 0.06
    setWaypoint(near ? null : point)
  }

  return (
    <figure className={large ? 'minimap panel large' : 'minimap panel'}>
      <canvas ref={canvas} width={size} height={size} style={{ width: size, height: size }} onClick={mark} title="Bấm để đánh dấu điểm muốn tới" />
      <figcaption>
        <div className="map-info">
          <span className="north">B ↑</span>
          <span>{distance === null ? `Rộng ${extent * 2} m` : `Điểm dấu: ${distance} m`}</span>
        </div>
        <div className="map-buttons">
          {waypoint && (
            <button title="Tới điểm đã đánh dấu" onClick={() => cameraCommands.emit({ type: 'goto', x: waypoint.x, z: waypoint.z })}>
              Tới đó
            </button>
          )}
          <button title="Phóng to" disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>
            +
          </button>
          <button title="Thu nhỏ" disabled={zoom === MAP_EXTENTS.length - 1} onClick={() => setZoom(zoom + 1)}>
            −
          </button>
          <button title={large ? 'Thu gọn bản đồ' : 'Mở rộng bản đồ'} onClick={() => setLarge(!large)}>
            ⤢
          </button>
        </div>
      </figcaption>
    </figure>
  )
}

/** Translucent on-screen stick and up/down buttons, shown on touch devices. */
export function TouchControls() {
  const knob = useRef<HTMLDivElement>(null)

  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return
    const rect = e.currentTarget.getBoundingClientRect()
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    // The knob travels to just inside the rim, whatever size the stick is drawn at.
    const radius = rect.width * 0.36
    const length = Math.hypot(dx, dy)
    if (length > radius) {
      dx *= radius / length
      dy *= radius / length
    }
    virtualInput.moveX = dx / radius
    virtualInput.moveForward = -dy / radius
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
  }
  const releaseStick = () => {
    virtualInput.stickDown = false
    virtualInput.moveX = 0
    virtualInput.moveForward = 0
    if (knob.current) knob.current.style.transform = ''
  }
  const hold = (vertical: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      virtualInput.vertical = vertical
    },
    onPointerUp: () => {
      virtualInput.vertical = 0
    },
    onPointerCancel: () => {
      virtualInput.vertical = 0
    },
  })

  useEffect(() => releaseStick, [])

  const cameraMode = useEditorStore((s) => s.cameraMode)
  const setCameraMode = useEditorStore((s) => s.setCameraMode)
  const holdRun = {
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      virtualInput.fast = true
    },
    onPointerUp: () => {
      virtualInput.fast = false
    },
    onPointerCancel: () => {
      virtualInput.fast = false
    },
  }

  return (
    <div className="touch-controls" onContextMenu={(e) => e.preventDefault()}>
      <div
        className="stick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          virtualInput.stickDown = true
          moveStick(e)
        }}
        onPointerMove={moveStick}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
      >
        <svg className="stick-deco" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" />
          <circle cx="50" cy="50" r="34" className="inner" />
          <path d="M50 2l3 5-3 5-3-5zM98 50l-5 3-5-3 5-3zM50 98l-3-5 3-5 3 5zM2 50l5-3 5 3-5 3z" className="tick" />
        </svg>
        <div className="knob" ref={knob}>
          <Glyph name="star" size={22} />
        </div>
      </div>
      <div className="vcluster">
        <button className="vbtn big" aria-label="Chạm: tương tác với thứ ở giữa màn hình" onClick={() => cameraCommands.emit({ type: 'tap' })}>
          <Glyph name="hand" size={32} />
          <span>Chạm</span>
        </button>
        <button className="vbtn mid up" aria-label="Lên" {...hold(1)}>
          <Glyph name="arrowUp" size={24} />
          <span>Lên</span>
        </button>
        <button className="vbtn mid down" aria-label="Xuống" {...hold(-1)}>
          <Glyph name="arrowDown" size={24} />
          <span>Xuống</span>
        </button>
        <button className="vbtn mid fast" aria-label="Chạy nhanh" {...holdRun}>
          <Glyph name="run" size={24} />
          <span>Chạy</span>
        </button>
        <button className="vbtn mid view" aria-label="Đổi cách nhìn" onClick={() => setCameraMode(cameraMode === 'walk' ? 'orbit' : 'walk')}>
          <Glyph name="eye" size={24} />
          <span>{cameraMode === 'walk' ? 'Bay' : 'Đi bộ'}</span>
        </button>
      </div>
    </div>
  )
}

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                undo()
                dismissToast(toast.id)
              }}
            >
              Hoàn tác
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

const COARSE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/**
 * Confirmation bar for touch screens: while placing (turn the preview, then "Đặt")
 * and after dragging or turning an object ("Đặt vào đây" or cancel).
 */
export function ConfirmBar() {
  const tool = useEditorStore((s) => s.activeTool)
  const pending = useEditorStore((s) => s.placePending)
  const pendingMove = useEditorStore((s) => s.pendingMove)
  const rotatePlacement = useEditorStore((s) => s.rotatePlacement)
  const unit = useEditorStore((s) => s.unit)
  const house = getShapePreset(useEditorStore((s) => s.placingPresetId))?.house

  if (pendingMove) {
    return (
      <div className="confirm-bar panel" role="group" aria-label="Xác nhận vị trí">
        <span>Đặt vật vào vị trí này?</span>
        <button className="primary" onClick={confirmPendingMove}>
          Đặt ✓
        </button>
        <button onClick={cancelPendingMove}>Huỷ</button>
      </div>
    )
  }
  if (tool === 'place' && (pending || COARSE || house)) {
    const plan = house ? getHousePlan(house) : undefined
    const m = plan ? planMetrics(plan) : null
    const spin = house ? Math.PI / 2 : Math.PI / 4
    const message = m
      ? pending
        ? `${plan!.name}: ${formatLength(m.width, unit)} × ${formatLength(m.depth, unit)}, cao ${formatLength(m.height, unit)}, ${m.storeys} tầng. Xoay rồi bấm Bắt đầu xây`
        : 'Bấm lên mặt đất để chọn chỗ xây, sẽ thấy bản thiết kế'
      : pending
        ? 'Xoay rồi bấm Đặt, hoặc chạm lại vào chỗ đó'
        : 'Chạm lên mặt đất để chọn chỗ đặt'
    return (
      <div className="confirm-bar panel" role="group" aria-label="Đặt vật">
        <span>{message}</span>
        <IconButton icon="rotateLeft" text="Trái" label={`Xoay trái ${house ? 90 : 45}°`} onClick={() => rotatePlacement(-spin)} />
        <IconButton icon="rotateRight" text="Phải" label={`Xoay phải ${house ? 90 : 45}°`} onClick={() => rotatePlacement(spin)} />
        {pending && <IconButton icon={house ? 'build' : 'check'} label={house ? 'Bắt đầu xây' : 'Đặt'} primary text={house ? 'Bắt đầu xây' : 'Đặt'} onClick={confirmPlacement} />}
        <IconButton icon="close" text="Huỷ" label="Huỷ" danger onClick={() => useEditorStore.getState().cancel()} />
      </div>
    )
  }
  return null
}

const DRAW_KINDS: { id: DrawKind; label: string; icon: IconName }[] = [
  { id: 'wall', label: 'Tường', icon: 'wall' },
  { id: 'fence', label: 'Hàng rào', icon: 'fence' },
  { id: 'path', label: 'Lối đi', icon: 'path' },
]

const DRAW_MATERIALS: Record<DrawKind, string[]> = {
  wall: ['brick_red_painted', 'stone_masonry_painted', 'concrete_painted', 'plaster_white', 'plain_white', 'pine_painted'],
  fence: ['oak_painted', 'pine_painted', 'walnut_painted', 'birch_painted', 'cedar_painted'],
  path: ['concrete_painted', 'stone_masonry_painted', 'pine_painted', 'brick_red_painted'],
}

/** Settings and buttons for the Draw tool. */
export function DrawBar() {
  const active = useEditorStore((s) => s.activeTool === 'draw')
  const kind = useEditorStore((s) => s.drawKind)
  const style = useEditorStore((s) => s.drawStyles[s.drawKind])
  const points = useEditorStore((s) => s.drawPoints)
  const straight = useEditorStore((s) => s.straightLock)
  const setKind = useEditorStore((s) => s.setDrawKind)
  const setStyle = useEditorStore((s) => s.setDrawStyle)
  const setPoints = useEditorStore((s) => s.setDrawPoints)
  const setStraight = useEditorStore((s) => s.setStraightLock)
  if (!active) return null

  return (
    <section className="shelf panel drawbar" aria-label="Vẽ">
      <div className="drawbar-row">
      <div className="drawbar-group">
        <div className="bar-actions">
          {DRAW_KINDS.map((item) => (
            <IconButton key={item.id} icon={item.icon} text={item.label} label={item.label} pressed={item.id === kind} onClick={() => setKind(item.id)} />
          ))}
        </div>
      </div>
      <div className="drawbar-group bar-actions">
        <IconButton icon="straight" text="Thẳng" label="Kẻ thẳng: giữ đường ngang, dọc hoặc chéo 45° (giữ Shift)" pressed={straight} onClick={() => setStraight(!straight)} />
        <IconButton icon="undo" text="Lùi" label="Lùi một điểm (Backspace)" disabled={points.length === 0} onClick={() => setPoints(points.slice(0, -1))} />
        <IconButton icon="loop" text="Khép vòng" label="Khép vòng: nối điểm cuối với điểm đầu (Shift+Enter)" disabled={points.length < 3} onClick={() => finishDrawing(true)} />
        <IconButton icon="check" text="Xong" label="Xong (Enter)" primary disabled={points.length < 2} onClick={() => finishDrawing(false)} />
      </div>
      </div>
      <div className="drawbar-row">
      <div className="drawbar-group">
        {kind !== 'path' && (
          <label>
            <span>Cao <strong>{style.height.toFixed(1)} m</strong></span>
            <input
              type="range"
              min={kind === 'wall' ? 0.5 : 0.4}
              max={kind === 'wall' ? 6 : 2}
              step={0.1}
              value={style.height}
              onChange={(e) => setStyle(kind, { height: Number(e.target.value) })}
            />
          </label>
        )}
        {kind !== 'fence' && (
          <label>
            <span>{kind === 'wall' ? 'Dày' : 'Rộng'} <strong>{style.thickness.toFixed(2)} m</strong></span>
            <input
              type="range"
              min={kind === 'wall' ? 0.1 : 0.4}
              max={kind === 'wall' ? 0.6 : 3}
              step={kind === 'wall' ? 0.05 : 0.1}
              value={style.thickness}
              onChange={(e) => setStyle(kind, { thickness: Number(e.target.value) })}
            />
          </label>
        )}
      </div>
      <div className="drawbar-group">
        <label>
          <span>Vật liệu</span>
          <select aria-label="Vật liệu" value={style.materialId} onChange={(e) => setStyle(kind, { materialId: e.target.value })}>
            {DRAW_MATERIALS[kind].map((id) => (
              <option key={id} value={id}>
                {MATERIALS[id]?.name ?? id}
              </option>
            ))}
          </select>
        </label>
      </div>
      </div>
    </section>
  )
}

/** Small bar for the marking tool: keep chalk lines straight. */
export function MarkBar() {
  const active = useEditorStore((s) => s.activeTool === 'mark')
  const mode = useEditorStore((s) => s.markMode)
  const setMode = useEditorStore((s) => s.setMarkMode)
  const straight = useEditorStore((s) => s.straightLock)
  const setStraight = useEditorStore((s) => s.setStraightLock)
  if (!active) return null
  return (
    <section className="shelf panel drawbar markbar" aria-label="Vạch dấu">
      <div className="drawbar-group bar-actions">
        <IconButton icon="line" text="Đường thẳng" label="Đường thẳng: bấm từng điểm để kẻ đường giữa các điểm" pressed={mode === 'line'} onClick={() => setMode('line')} />
        <IconButton icon="pen" text="Bút vẽ" label="Bút vẽ: giữ chuột kéo để vẽ tự do, thả ra thì hiện số đo" pressed={mode === 'pen'} onClick={() => setMode('pen')} />
        {mode === 'line' && <IconButton icon="straight" text="Thẳng" label="Kẻ thẳng: giữ đường ngang, dọc hoặc chéo 45° (giữ Shift)" pressed={straight} onClick={() => setStraight(!straight)} />}
      </div>
    </section>
  )
}

/** Comfort overlays: an optional centre dot and edges that darken while moving fast. */
export function ComfortOverlay() {
  const crosshair = useEditorStore((s) => s.crosshair)
  const vignette = useEditorStore((s) => s.speedVignette)
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!vignette) return
    let frame = 0
    let shown = 0
    const tick = () => {
      const target = Math.min(0.75, Math.max(0, (cameraState.speed - 7) / 22))
      shown += (target - shown) * 0.12
      if (element.current) element.current.style.opacity = shown.toFixed(3)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [vignette])
  return (
    <>
      {vignette && <div className="speed-vignette" ref={element} />}
      {crosshair && <div className="crosshair" />}
    </>
  )
}

import { useEffect, type ReactNode } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { CutBar, PropertiesPanel } from '../components/panels/PropertiesPanel'
import { ShapeShelf } from '../components/panels/ShapeShelf'
import { ComfortOverlay, ConfirmBar, DrawBar, MarkBar, Minimap, PaintBar, Toasts, TouchControls } from '../components/panels/ToolPanels'
import { LeftToolbar } from '../components/toolbar/LeftToolbar'
import { getShapePreset } from '../data/shapePresets'
import { stopBuilding } from '../game/building/houseBuilder'
import { useConstructionStore } from '../stores/constructionStore'
import { GameCanvas } from '../game/core/GameCanvas'
import { screenFromUrl, useEditorStore } from '../stores/editorStore'
import { hydrateFromIndexedDb } from './worldActions'
import { HomeScreen } from '../components/home/HomeScreen'
import { IconButton } from '../components/ui/Icons'
import { useReveal } from './useReveal'
import { useShortcuts } from './useShortcuts'
import { useWorldStore } from '../stores/worldStore'

// Dev only: lets browser tests reach the stores without loading a second copy of the modules.
if (import.meta.env.DEV) (window as unknown as { __woodscape?: unknown }).__woodscape = { useEditorStore, useWorldStore }

const ACTION_TOOLS = new Set(['place', 'draw', 'fill', 'mark', 'paint', 'cut', 'measure'])

/** Short help for what the player is doing, in separate pieces (no run-on sentence), with a way out while a tool is active. */
function Hint() {
  const tool = useEditorStore((s) => s.activeTool)
  const preset = getShapePreset(useEditorStore((s) => s.placingPresetId))
  const hasSelection = useEditorStore((s) => s.selectedIds.length > 0)
  const walking = useEditorStore((s) => s.cameraMode === 'walk')
  const keepPlacing = useEditorStore((s) => s.placeKeep)
  const editing = useEditorStore((s) => s.appMode === 'edit')
  const cancel = useEditorStore((s) => s.cancel)
  const hasPending = useEditorStore((s) => s.placePending !== null)
  const building = useConstructionStore((s) => s.active)

  let parts: ReactNode[]
  if (building) {
    parts = [
      <>
        Đang xây <strong>{building.name}</strong>
      </>,
      `Bước ${Math.max(1, building.step)}/${building.total}: ${building.label}`,
    ]
  } else if (!editing) {
    parts = [
      <strong>Chế độ xem</strong>,
      walking ? 'Kéo chuột để quay đầu' : 'Kéo chuột để xoay quanh',
      <><kbd>WASD</kbd> đi</>,
      <><kbd>E</kbd> <kbd>Q</kbd> lên xuống</>,
      'Bấm cửa để mở',
    ]
  } else if (tool === 'place' && preset) {
    parts = [
      <>
        Đang đặt <strong>{preset.name}</strong>
        {keepPlacing && ' (liên tục)'}
      </>,
      'Bấm lên mặt đất để đặt',
      <><kbd>R</kbd> xoay</>,
      keepPlacing ? 'Bấm Hủy hoặc Esc để dừng' : 'Nhấp đúp hình ở kệ để đặt liên tục',
    ]
  } else if (tool === 'draw') {
    parts = [
      <strong>Vẽ</strong>,
      'Bấm các điểm trên đất',
      <><kbd>Enter</kbd> xong</>,
      <><kbd>Backspace</kbd> lùi một điểm</>,
      <>Giữ <kbd>Shift</kbd> để kẻ thẳng</>,
    ]
  } else if (tool === 'measure') {
    parts = [<strong>Đo</strong>, 'Bấm hai điểm bất kỳ để đo khoảng cách', 'Điểm thứ ba để đo góc', 'Bấm lần nữa để đo lại']
  } else if (tool === 'fill') {
    parts = [<strong>Lát đầy</strong>, 'Bấm hai góc đối nhau của vùng']
  } else if (tool === 'mark') {
    parts = [<strong>Vạch dấu</strong>, 'Bấm các điểm trên nền để kẻ đường có số đo', <>Giữ <kbd>Shift</kbd> để kẻ thẳng</>]
  } else if (tool === 'paint') {
    parts = [<strong>Sơn</strong>, 'Chọn màu ở thanh dưới', 'Bấm hoặc quét lên vật']
  } else if (tool === 'cut') {
    parts = [<strong>Cắt</strong>, 'Chọn một khối', 'Chọn kiểu cắt ở thanh dưới', 'Bấm lên khối']
  } else if ((tool === 'move' || tool === 'rotate') && hasSelection) {
    parts = [
      'Kéo mũi tên hoặc vòng màu',
      <><kbd>← ↑ ↓ →</kbd> dịch từng bước</>,
      <><kbd>Ctrl</kbd>+<kbd>Z</kbd> hoàn tác</>,
      <><kbd>Ctrl</kbd>+<kbd>D</kbd> nhân bản</>,
      <><kbd>Delete</kbd> xoá</>,
    ]
  } else if (walking) {
    parts = [
      <strong>Chế độ sửa</strong>,
      'Bấm vào vật để chỉnh',
      <><kbd>WASD</kbd> đi</>,
      <><kbd>E</kbd> <kbd>Q</kbd> lên xuống</>,
      <><kbd>Shift</kbd> kéo: chọn khung</>,
      <><kbd>C</kbd> bay quanh</>,
    ]
  } else {
    parts = [
      'Chuột trái xoay quanh',
      'Chuột phải kéo ngang',
      'Lăn chuột thu phóng',
      <><kbd>WASD</kbd> bay</>,
      <><kbd>C</kbd> đi lại</>,
    ]
  }
  // Shown when the mode or tool changes, and while the pointer is near the bottom edge.
  const shown = useReveal(`${editing}|${tool}|${preset?.id ?? ''}|${hasSelection}|${walking}`, (x, y, w, h) => y > h - 120 && x > w * 0.2 && x < w * 0.8)
  const busy = building !== null || (editing && ACTION_TOOLS.has(tool))
  // While a spot is being chosen the bar above already says what to do; two bars would pile up.
  if (!building && editing && tool === 'place' && (hasPending || preset?.house)) return null
  return (
    <footer className={shown || busy ? 'helpbar panel reveal' : 'helpbar panel reveal hidden'}>
      {parts.map((part, i) => (
        <span key={i} className="seg">
          {part}
        </span>
      ))}
      {busy && (
        <IconButton icon="close" text="Hủy" label={building ? 'Dừng xây, giữ phần đã xây' : 'Hủy, quay về chọn (Esc hoặc chuột phải)'} danger onClick={building ? stopBuilding : cancel} />
      )}
    </footer>
  )
}

/** A short right click (no dragging) steps out of whatever tool is active and back to selecting. */
function useRightClickCancel() {
  useEffect(() => {
    let down: { x: number; y: number; at: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = e.button === 2 && e.target instanceof HTMLCanvasElement ? { x: e.clientX, y: e.clientY, at: performance.now() } : null
    }
    const onUp = (e: PointerEvent) => {
      const start = down
      down = null
      if (!start || e.button !== 2) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5 || performance.now() - start.at > 400) return
      const editor = useEditorStore.getState()
      if (editor.appMode === 'edit' && ACTION_TOOLS.has(editor.activeTool)) editor.cancel()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])
}

export function App() {
  const screen = useEditorStore((s) => s.screen)
  // The browser's Back and Forward buttons move between the home page and the game.
  useEffect(() => {
    const sync = () => useEditorStore.setState({ screen: screenFromUrl() })
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  if (screen === 'home') return <HomeScreen />
  return <Game />
}

function Game() {
  useShortcuts()
  useEffect(() => {
    void hydrateFromIndexedDb()
  }, [])
  useRightClickCancel()
  return (
    <div className="app">
      <div className="viewport">
        <GameCanvas />
      </div>
      <TopBar />
      <LeftToolbar />
      <PropertiesPanel />
      <ShapeShelf />
      <PaintBar />
      <CutBar />
      <DrawBar />
      <MarkBar />
      <ComfortOverlay />
      <Minimap />
      <TouchControls />
      <Hint />
      <ConfirmBar />
      <Toasts />
      <div className="rotate-notice">Hãy xoay ngang điện thoại để chơi WOODSCAPE</div>
    </div>
  )
}

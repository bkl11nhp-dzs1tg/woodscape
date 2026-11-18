import { TopBar } from '../components/layout/TopBar'
import { PropertiesPanel } from '../components/panels/PropertiesPanel'
import { ShapeShelf } from '../components/panels/ShapeShelf'
import { ComfortOverlay, ConfirmBar, DrawBar, MarkBar, Minimap, PaintBar, Toasts, TouchControls } from '../components/panels/ToolPanels'
import { LeftToolbar } from '../components/toolbar/LeftToolbar'
import { getShapePreset } from '../data/shapePresets'
import { GameCanvas } from '../game/core/GameCanvas'
import { useEditorStore } from '../stores/editorStore'
import { useShortcuts } from './useShortcuts'

/** One line of help for whatever the player is doing right now. */
function Hint() {
  const tool = useEditorStore((s) => s.activeTool)
  const preset = getShapePreset(useEditorStore((s) => s.placingPresetId))
  const hasSelection = useEditorStore((s) => s.selectedIds.length > 0)
  const walking = useEditorStore((s) => s.cameraMode === 'walk')
  const editing = useEditorStore((s) => s.appMode === 'edit')

  let content
  if (!editing) {
    content = (
      <span>
        <strong>Chế độ xem</strong>: {walking ? 'kéo chuột để quay đầu' : 'kéo chuột để xoay quanh'} · <kbd>W A S D</kbd> đi ·{' '}
        <kbd>E</kbd>/<kbd>Space</kbd> lên · <kbd>Q</kbd>/<kbd>X</kbd> xuống · bấm vào cửa để mở · bấm <strong>Sửa</strong> để chỉnh
        đồ vật
      </span>
    )
  } else if (tool === 'place' && preset) {
    content = (
      <span>
        Đang đặt <strong>{preset.name}</strong>: bấm lên mặt đất để đặt (cửa, ô trống thì bấm lên tường) · <kbd>R</kbd> xoay · <kbd>Esc</kbd> huỷ
      </span>
    )
  } else if (tool === 'draw') {
    content = (
      <span>
        <strong>Vẽ</strong>: bấm các điểm trên đất · bấm lại điểm cuối hoặc <kbd>Enter</kbd> để xong · bấm điểm đầu để khép phòng ·{' '}
        <kbd>Backspace</kbd> lùi một điểm · giữ <kbd>Shift</kbd> để kẻ thẳng · <kbd>Esc</kbd> huỷ
      </span>
    )
  } else if (tool === 'mark') {
    content = (
      <span>
        <strong>Vạch dấu</strong>: bấm các điểm trên nền để kẻ đường có số đo · <kbd>Shift</kbd> giữ đường thẳng · <kbd>Esc</kbd> kết thúc
      </span>
    )
  } else if (tool === 'paint') {
    content = (
      <span>
        <strong>Sơn</strong>: chọn màu và độ phủ bên dưới, rồi bấm vào vật thể · <kbd>Esc</kbd> thoát
      </span>
    )
  } else if (tool === 'cut') {
    content = (
      <span>
        <strong>Cắt</strong>: chọn một khối, chọn kiểu cắt ở bảng bên phải (chia đôi, đường kẻ, khoét hình), bấm lên khối để đặt · <kbd>Esc</kbd> thoát
      </span>
    )
  } else if ((tool === 'move' || tool === 'rotate') && hasSelection) {
    content = (
      <span>
        Kéo mũi tên / vòng tròn màu · <kbd>← ↑ ↓ →</kbd> dịch từng bước · <kbd>Shift</kbd>+<kbd>↑ ↓</kbd> lên xuống ·{' '}
        <kbd>Ctrl+Z</kbd> hoàn tác · <kbd>Ctrl+D</kbd> nhân bản · <kbd>Delete</kbd> xoá
      </span>
    )
  } else if (walking) {
    content = (
      <span>
        <strong>Chế độ sửa</strong>: bấm vào một đồ vật để chỉnh · kéo chuột để quay đầu · <kbd>W A S D</kbd> đi · <kbd>E</kbd>/<kbd>Space</kbd> lên · <kbd>Q</kbd>/<kbd>X</kbd> xuống ·{' '}
        <kbd>Shift</kbd> nhanh · bấm đúp vào cửa để mở · <kbd>C</kbd> bay quanh
      </span>
    )
  } else {
    content = (
      <span>
        <kbd>Chuột trái</kbd> xoay quanh · <kbd>Chuột phải</kbd> kéo ngang · <kbd>Lăn chuột</kbd> thu phóng ·{' '}
        <kbd>W A S D</kbd> bay · <kbd>E</kbd>/<kbd>Q</kbd> lên xuống · <kbd>C</kbd> đi lại
      </span>
    )
  }
  return <footer className="helpbar panel">{content}</footer>
}

export function App() {
  useShortcuts()
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

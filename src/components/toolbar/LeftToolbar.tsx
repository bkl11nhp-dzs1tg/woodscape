import angleIcon from '../../assets/icons/angle.svg'
import cutIcon from '../../assets/icons/cut.svg'
import drawIcon from '../../assets/icons/draw.svg'
import paintIcon from '../../assets/icons/decorate.svg'
import markIcon from '../../assets/icons/measure.svg'
import multiIcon from '../../assets/icons/multi.svg'
import moveIcon from '../../assets/icons/move.svg'
import rotateIcon from '../../assets/icons/rotate.svg'
import selectIcon from '../../assets/icons/select.svg'
import shapeIcon from '../../assets/icons/shape.svg'
import walkIcon from '../../assets/icons/walk.svg'
import { useEditorStore, type ToolId } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'

const TOOLS: { id: Exclude<ToolId, 'place'>; label: string; key: string; icon: string; hint: string }[] = [
  { id: 'select', label: 'Chọn', key: 'V', icon: selectIcon, hint: 'Chọn vật thể; bấm đúp vào cửa để mở' },
  { id: 'move', label: 'Di chuyển', key: 'M', icon: moveIcon, hint: 'Kéo mũi tên, hoặc dùng phím mũi tên' },
  { id: 'rotate', label: 'Xoay', key: 'R', icon: rotateIcon, hint: 'Kéo vòng tròn màu để xoay' },
  { id: 'draw', label: 'Vẽ', key: 'T', icon: drawIcon, hint: 'Bấm các điểm trên đất để dựng tường, hàng rào hoặc lối đi' },
  { id: 'cut', label: 'Cắt', key: 'K', icon: cutIcon, hint: 'Cắt một khối hoặc tấm làm hai' },
  { id: 'paint', label: 'Sơn', key: 'B', icon: paintIcon, hint: 'Phủ lớp màu lên vật thể' },
  { id: 'mark', label: 'Vạch dấu', key: 'L', icon: markIcon, hint: 'Kẻ đường định vị trên nền, có số đo' },
  { id: 'measure', label: 'Đo', key: 'N', icon: angleIcon, hint: 'Bấm hai điểm bất kỳ để đo khoảng cách, thêm điểm thứ ba để đo góc' },
]

/** Only tools that work are shown. */
export function LeftToolbar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setTool = useEditorStore((s) => s.setTool)
  const shelfOpen = useEditorStore((s) => s.shelfOpen)
  const toggleShelf = useEditorStore((s) => s.toggleShelf)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const setCameraMode = useEditorStore((s) => s.setCameraMode)
  const editing = useEditorStore((s) => s.appMode === 'edit')
  const multiSelect = useEditorStore((s) => s.multiSelect)
  const setMultiSelect = useEditorStore((s) => s.setMultiSelect)

  const pick = (tool: Exclude<ToolId, 'place'>) => {
    // Leaving the place tool drops the preview shape; say so instead of letting it just vanish.
    if (activeTool === 'place') showToast('Đã huỷ đặt vật thể đang xem trước')
    setTool(tool)
  }

  return (
    <nav className={editing ? 'toolbar panel' : 'toolbar panel single'} aria-label="Công cụ">
      {editing && (
        <>
      <button
        className={shelfOpen || activeTool === 'place' ? 'tool active' : 'tool'}
        title="Mở thư viện hình khối, cửa, ô trống"
        aria-expanded={shelfOpen}
        onClick={toggleShelf}
      >
        <img src={shapeIcon} alt="" />
        <span>Tạo hình</span>
      </button>
      <hr />
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={tool.id === activeTool ? 'tool active' : 'tool'}
          title={`${tool.label} (${tool.key}) — ${tool.hint}`}
          onClick={() => pick(tool.id)}
        >
          <img src={tool.icon} alt="" />
          <span>{tool.label}</span>
        </button>
      ))}
      <button
        className={multiSelect ? 'tool touch-tool active' : 'tool touch-tool'}
        title="Bật để chạm vào nhiều đồ vật liên tiếp mà chọn thêm (thay cho phím Ctrl)"
        aria-pressed={multiSelect}
        onClick={() => setMultiSelect(!multiSelect)}
      >
        <img src={multiIcon} alt="" />
        <span>Chọn nhiều</span>
      </button>
      <hr />
        </>
      )}
      <button
        className={cameraMode === 'walk' ? 'tool active' : 'tool'}
        title="Đổi cách di chuyển (C): Đi lại = bạn là nhân vật, kéo chuột để quay đầu. Tắt = bay quanh một điểm."
        aria-pressed={cameraMode === 'walk'}
        onClick={() => setCameraMode(cameraMode === 'walk' ? 'orbit' : 'walk')}
      >
        <img src={walkIcon} alt="" />
        <span>{cameraMode === 'walk' ? 'Đi lại' : 'Bay quanh'}</span>
      </button>
    </nav>
  )
}

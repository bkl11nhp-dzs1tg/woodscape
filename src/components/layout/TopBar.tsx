import { useEffect, useRef, useState, type ReactNode } from 'react'
import { captureSnapshot, resetToDemo, restoreSnapshot } from '../../app/worldActions'
import redoIcon from '../../assets/icons/redo.svg'
import saveIcon from '../../assets/icons/save.svg'
import settingsIcon from '../../assets/icons/settings.svg'
import undoIcon from '../../assets/icons/undo.svg'
import { cameraCommands, type ViewPreset } from '../../game/camera/cameraCommands'
import { redo, undo, useHistoryStore } from '../../game/core/history'
import { WEATHER, WEATHER_ORDER } from '../../game/environment/SkyAndLight'
import { TIME_ORDER, TIME_PRESETS, type TimeOfDay } from '../../game/environment/timeOfDay'
import { listSnapshots, removeSnapshot, type Snapshot } from '../../services/saveService'
import { formatLength } from '../../services/units'
import { GRID_STEPS, useEditorStore, type Weather } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'
import type { LengthUnit } from '../../types/world'

const VIEWS: { id: ViewPreset; label: string }[] = [
  { id: 'perspective', label: 'Phối cảnh' },
  { id: 'top', label: 'Nhìn từ trên' },
  { id: 'front', label: 'Nhìn từ trước' },
  { id: 'side', label: 'Nhìn từ bên' },
]

/** Icon button that opens a popover and closes it on an outside click. */
function Popover(props: {
  icon: string
  title: string
  open: boolean
  onToggle: (open: boolean) => void
  /** Which edge of the button the popover lines up with. */
  align?: 'left' | 'right'
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const { open, onToggle } = props
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onToggle(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onToggle])

  return (
    <div className="settings" ref={root}>
      <button className="icon-button" title={props.title} aria-expanded={open} onClick={() => onToggle(!open)}>
        <img src={props.icon} alt={props.title} />
      </button>
      {open && <div className={props.align === 'left' ? 'popover left' : 'popover'}>{props.children}</div>}
    </div>
  )
}

export function TopBar() {
  const worldName = useWorldStore((s) => s.worldName)
  const timeOfDay = useEditorStore((s) => s.timeOfDay)
  const setTimeOfDay = useEditorStore((s) => s.setTimeOfDay)
  const weather = useEditorStore((s) => s.weather)
  const setWeather = useEditorStore((s) => s.setWeather)
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0)
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0)
  const editing = useEditorStore((s) => s.appMode === 'edit')

  return (
    <header className="topbar panel">
      <div className="logo">WOODSCAPE</div>
      <div className="world-name" title="Tên thế giới">
        {worldName}
      </div>

      <div className="button-group">
        {editing && (
          <>
        <button className="icon-button" disabled={!canUndo} title="Hoàn tác (Ctrl+Z)" onClick={undo}>
          <img src={undoIcon} alt="Hoàn tác" />
        </button>
        <button className="icon-button" disabled={!canRedo} title="Làm lại (Ctrl+Y)" onClick={redo}>
          <img src={redoIcon} alt="Làm lại" />
        </button>
          </>
        )}
        <Snapshots />
      </div>

      <div className="spacer" />

      <select aria-label="Thời gian trong ngày" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
        {TIME_ORDER.map((time) => (
          <option key={time} value={time}>
            {TIME_PRESETS[time].label}
          </option>
        ))}
      </select>

      <select aria-label="Thời tiết" value={weather} onChange={(e) => setWeather(e.target.value as Weather)}>
        {WEATHER_ORDER.map((id) => (
          <option key={id} value={id}>
            {WEATHER[id].label}
          </option>
        ))}
      </select>

      <select
        className="hide-small"
        aria-label="Góc nhìn"
        value=""
        onChange={(e) => {
          cameraCommands.emit({ type: 'view', preset: e.target.value as ViewPreset })
          e.target.blur()
        }}
      >
        <option value="" disabled>
          Góc nhìn
        </option>
        {VIEWS.map((view) => (
          <option key={view.id} value={view.id}>
            {view.label}
          </option>
        ))}
      </select>

      <button className="icon-button touch-only" title="Toàn màn hình" onClick={toggleFullscreen}>
        ⛶
      </button>
      <ModeTabs />
      <Settings />
    </header>
  )
}

/** Two tabs: walk around and look (Xem), or click things to change them (Sửa). */
function ModeTabs() {
  const mode = useEditorStore((s) => s.appMode)
  const setAppMode = useEditorStore((s) => s.setAppMode)
  const tabs = [
    { id: 'view', label: 'Xem', hint: 'Đi lại như một người, bấm vào cửa để mở, không sửa gì' },
    { id: 'edit', label: 'Sửa', hint: 'Bấm vào đồ vật để chọn và chỉnh' },
  ] as const
  return (
    <div className="mode-tabs" role="tablist" aria-label="Chế độ">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={mode === tab.id} className={mode === tab.id ? 'active' : ''} title={tab.hint} onClick={() => setAppMode(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Fills the whole screen and turns the game sideways where the browser allows.
 * iPhone Safari has no such control for web pages; there the game must be added
 * to the home screen, which opens it without the browser bars.
 */
function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
    return
  }
  const root = document.documentElement
  if (!root.requestFullscreen) {
    showToast('iPhone: bấm Chia sẻ → "Thêm vào MH chính", rồi mở game từ biểu tượng đó để chơi toàn màn hình.')
    return
  }
  root
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => showToast('Trình duyệt này không cho bật toàn màn hình.'))
}

/** Saved states of the world to return to. The world itself is auto-saved on every change. */
function Snapshots() {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Snapshot[]>([])
  useEffect(() => {
    if (open) setList(listSnapshots())
  }, [open])

  return (
    <Popover icon={saveIcon} title="Mốc lưu" open={open} onToggle={setOpen} align="left">
      <p className="muted">Thế giới được tự lưu sau mỗi thay đổi. Lưu mốc để có điểm quay về khi lỡ làm hỏng.</p>
      <button className="primary" onClick={() => setList(captureSnapshot())}>
        Lưu mốc hiện tại
      </button>
      <ul className="snapshots">
        {list.length === 0 && <li className="muted">Chưa có mốc nào.</li>}
        {list.map((snapshot) => (
          <li key={snapshot.id}>
            <span title={new Date(snapshot.createdAt).toLocaleString('vi-VN')}>
              {snapshot.name} <em>· {snapshot.objectCount} vật thể</em>
            </span>
            <button
              onClick={() => {
                setList(restoreSnapshot(snapshot))
                setOpen(false)
              }}
            >
              Quay về
            </button>
            <button className="danger" title="Xoá mốc này" onClick={() => setList(removeSnapshot(snapshot.id))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        className="text-button"
        onClick={() => {
          setList(resetToDemo())
          setOpen(false)
        }}
      >
        Dựng lại khu phố mẫu
      </button>
    </Popover>
  )
}

function Settings() {
  const open = useEditorStore((s) => s.settingsOpen)
  const setOpen = useEditorStore((s) => s.setSettingsOpen)
  const unit = useEditorStore((s) => s.unit)
  const setUnit = useEditorStore((s) => s.setUnit)
  const cameraSpeed = useEditorStore((s) => s.cameraSpeed)
  const setCameraSpeed = useEditorStore((s) => s.setCameraSpeed)
  const lookSpeed = useEditorStore((s) => s.lookSpeed)
  const setLookSpeed = useEditorStore((s) => s.setLookSpeed)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)
  const gridStep = useEditorStore((s) => s.gridStep)
  const setGridStep = useEditorStore((s) => s.setGridStep)
  const fov = useEditorStore((s) => s.fov)
  const smoothMotion = useEditorStore((s) => s.smoothMotion)
  const crosshair = useEditorStore((s) => s.crosshair)
  const speedVignette = useEditorStore((s) => s.speedVignette)
  const setComfort = useEditorStore((s) => s.setComfort)
  const collisionEnabled = useEditorStore((s) => s.collisionEnabled)
  const setCollisionEnabled = useEditorStore((s) => s.setCollisionEnabled)

  return (
    <Popover icon={settingsIcon} title="Cài đặt" open={open} onToggle={setOpen}>
      <div className="settings">
        <section>
          <h3>Xây dựng</h3>
          <label className="switch">
            <span>Bắt dính lưới, cạnh và góc</span>
            <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
          </label>
          <label className="row">
            <span>Bước lưới</span>
            <select value={gridStep} disabled={!snapEnabled} onChange={(e) => setGridStep(Number(e.target.value))}>
              {GRID_STEPS.map((step) => (
                <option key={step} value={step}>
                  {formatLength(step, unit)}
                </option>
              ))}
            </select>
          </label>
          <label className="row">
            <span>Đơn vị</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value as LengthUnit)}>
              <option value="m">Mét (m)</option>
              <option value="cm">Centimet (cm)</option>
              <option value="mm">Milimet (mm)</option>
            </select>
          </label>
        </section>

        <section>
          <h3>Di chuyển</h3>
          <label className="switch">
            <span>Chặn đi xuyên vật thể khi Đi lại</span>
            <input type="checkbox" checked={collisionEnabled} onChange={(e) => setCollisionEnabled(e.target.checked)} />
          </label>
          <label className="slider">
            <span>Tốc độ di chuyển</span>
            <output>{cameraSpeed} m/s</output>
            <input type="range" min={2} max={60} step={1} value={cameraSpeed} onChange={(e) => setCameraSpeed(Number(e.target.value))} />
          </label>
          <label className="slider">
            <span>Tốc độ xoay góc nhìn</span>
            <output>{Math.round(lookSpeed * 100)}%</output>
            <input type="range" min={30} max={250} step={10} value={Math.round(lookSpeed * 100)} onChange={(e) => setLookSpeed(Number(e.target.value) / 100)} />
          </label>
        </section>

        <section>
          <h3>Dễ chịu cho mắt</h3>
          <label className="slider">
            <span>Góc nhìn rộng</span>
            <output>{fov}°</output>
            <input type="range" min={50} max={100} step={1} value={fov} onChange={(e) => setComfort({ fov: Number(e.target.value) })} />
          </label>
          <label className="switch">
            <span>Quay đầu và đi mượt</span>
            <input type="checkbox" checked={smoothMotion} onChange={(e) => setComfort({ smoothMotion: e.target.checked })} />
          </label>
          <label className="switch">
            <span>Tối viền khi đi nhanh</span>
            <input type="checkbox" checked={speedVignette} onChange={(e) => setComfort({ speedVignette: e.target.checked })} />
          </label>
          <label className="switch">
            <span>Chấm nhỏ giữa màn hình</span>
            <input type="checkbox" checked={crosshair} onChange={(e) => setComfort({ crosshair: e.target.checked })} />
          </label>
        </section>
      </div>
    </Popover>
  )
}

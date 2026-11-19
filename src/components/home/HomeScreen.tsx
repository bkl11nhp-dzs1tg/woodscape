import { useEffect, useRef, useState } from 'react'
import { importWorldFromFile, restoreSnapshot, startWorld } from '../../app/worldActions'
import { QUALITY } from '../../game/core/quality'
import { listSnapshots, removeSnapshot, type Snapshot } from '../../services/saveService'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { Glyph, type IconName } from '../ui/Icons'
import { QualityPicker } from '../ui/QualityPicker'
import { HomeBackdrop } from './HomeBackdrop'

const PLAYER_KEY = 'woodscape.player.v1'
const DEFAULT_NAME = 'Người chơi'

function loadName(): string {
  try {
    return localStorage.getItem(PLAYER_KEY) || DEFAULT_NAME
  } catch {
    return DEFAULT_NAME
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(PLAYER_KEY, name)
  } catch {
    /* kept for this visit only */
  }
}

type Panel = 'new' | 'marks' | 'graphics' | null

function Row({ icon, title, badge, onClick, open, disabled }: { icon: IconName; title: string; badge?: string; onClick?: () => void; open?: boolean; disabled?: boolean }) {
  return (
    <button className={`home-row${open ? ' open' : ''}`} disabled={disabled} onClick={onClick}>
      <Glyph name={icon} size={22} />
      <span className="home-row-title">{title}</span>
      {badge && <span className={disabled ? 'home-badge soon' : 'home-badge'}>{badge}</span>}
    </button>
  )
}

/** The player's name: two lines, with a pencil to change it. */
function Profile() {
  const [name, setName] = useState(loadName)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])
  const commit = () => {
    const next = draft.trim() || DEFAULT_NAME
    setName(next)
    saveName(next)
    setEditing(false)
  }
  return (
    <div className="home-profile">
      <span className="home-avatar">{(name.trim()[0] ?? 'N').toUpperCase()}</span>
      <div className="home-profile-text">
        {editing ? (
          <input
            ref={input}
            type="text"
            value={draft}
            maxLength={24}
            aria-label="Tên người chơi"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <strong>{name}</strong>
        )}
        <small>Khách, lưu trong máy này</small>
      </div>
      <button
        className="home-pencil"
        title="Sửa tên"
        aria-label="Sửa tên"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (editing) commit()
          else {
            setDraft(name)
            setEditing(true)
          }
        }}
      >
        <Glyph name={editing ? 'check' : 'pen'} size={16} />
      </button>
    </div>
  )
}

/**
 * The page the game opens on, over the valley through the day: pick the world to play, set the graphics for this
 * machine before the 3D world loads, and see where playing with friends will go.
 */
export function HomeScreen() {
  const setScreen = useEditorStore((s) => s.setScreen)
  const worldName = useWorldStore((s) => s.worldName)
  const count = useWorldStore((s) => s.order.length)
  const choice = useEditorStore((s) => s.qualityChoice)
  const level = useEditorStore((s) => s.qualityLevel)
  const [panel, setPanel] = useState<Panel>(null)
  const [marks, setMarks] = useState<Snapshot[]>(() => listSnapshots())
  useEffect(() => {
    if (panel === 'marks') setMarks(listSnapshots())
  }, [panel])

  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next))
  const enter = () => setScreen('game')

  return (
    <main className="home">
      <HomeBackdrop />
      <div className="home-shade" aria-hidden="true" />
      <Profile />

      <section className="home-left">
        <header className="home-title">
          <h1>WOODSCAPE</h1>
          <p>Sáng tạo không gian mơ ước chân thực, sống động</p>
        </header>

        <button className="home-play" onClick={enter}>
          <Glyph name="build" size={26} />
          <span>
            <strong>Tiếp tục</strong>
            <small>
              {worldName} · {count} vật thể
            </small>
          </span>
        </button>

        <nav className="home-menu">
          <Row icon="duplicate" title="Thế giới mới" open={panel === 'new'} onClick={() => toggle('new')} />
          {panel === 'new' && (
            <div className="home-sub">
              <button
                onClick={() => {
                  startWorld('demo')
                  enter()
                }}
              >
                Khu phố mẫu
              </button>
              <button
                onClick={() => {
                  startWorld('empty')
                  enter()
                }}
              >
                Đất trống
              </button>
              <p>Thế giới đang có vẫn được giữ trong Mốc lưu.</p>
            </div>
          )}
          <Row
            icon="folder"
            title="Mở từ tệp"
            onClick={async () => {
              if (await importWorldFromFile()) enter()
            }}
          />
          <Row icon="undo" title="Mốc lưu" badge={marks.length > 0 ? String(marks.length) : 'Trống'} open={panel === 'marks'} onClick={() => toggle('marks')} />
          {panel === 'marks' && (
            <div className="home-sub">
              {marks.length === 0 && <p>Chưa có mốc nào.</p>}
              {marks.map((mark) => (
                <div key={mark.id} className="home-mark">
                  <span title={new Date(mark.createdAt).toLocaleString('vi-VN')}>
                    {mark.name} <em>· {mark.objectCount} vật thể</em>
                  </span>
                  <button
                    onClick={() => {
                      restoreSnapshot(mark)
                      enter()
                    }}
                  >
                    Quay về
                  </button>
                  <button className="danger" title="Xoá mốc này" onClick={() => setMarks(removeSnapshot(mark.id))}>
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
          <Row icon="eye" title="Đồ họa" badge={choice === 'auto' ? `Tự động · ${QUALITY[level].label}` : QUALITY[choice].label} open={panel === 'graphics'} onClick={() => toggle('graphics')} />
          {panel === 'graphics' && (
            <div className="home-sub">
              <QualityPicker />
            </div>
          )}
          <Row icon="group" title="Chơi cùng bạn bè" badge="Sắp có" disabled />
        </nav>
      </section>
    </main>
  )
}

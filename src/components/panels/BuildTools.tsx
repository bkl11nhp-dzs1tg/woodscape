import { useState } from 'react'
import { captureCluster } from '../../game/building/clusters'
import { defaultStep, repeatAroundRing, repeatInLine, type RepeatAxis } from '../../game/building/repeatActions'
import type { TilePattern } from '../../game/building/tiling'
import {
  CLAD_TILES,
  COVER_FACE_LABELS,
  coverFaceWithTiles,
  coverRoundWithTiles,
  fillAreaWithTiles,
  floorInsideWalls,
  tileAxes,
  type CoverFace,
} from '../../game/building/tilingActions'
import { useEditorStore } from '../../stores/editorStore'
import { paintObjects } from '../../game/building/commands'
import { showToast } from '../../stores/toastStore'
import { useTemplateStore } from '../../stores/templateStore'
import { useWorldStore } from '../../stores/worldStore'
import type { LengthUnit, WorldObject } from '../../types/world'
import { CheckField, NumField, NumRow, Section, SelectField, UNIT_DIGITS, UNIT_SCALE } from './PanelParts'

const PATTERNS = [
  { value: 'grid', label: 'Thẳng hàng (gạch)' },
  { value: 'bond', label: 'So le (ván sàn, gạch xây)' },
]

/** Lát đầy một vùng: one piece becomes a field of pieces, by numbers or by dragging a rectangle on the ground. */
export function FillSection({ obj, unit }: { obj: WorldObject; unit: LengthUnit }) {
  const axes = tileAxes(obj)
  const scale = UNIT_SCALE[unit]
  const digits = UNIT_DIGITS[unit]
  const [area, setArea] = useState<[number, number]>(() => (axes ? [axes.sizes[axes.a] * 6, axes.sizes[axes.b] * 6] : [1, 1]))
  const [gapMm, setGapMm] = useState(2)
  const [pattern, setPattern] = useState<TilePattern>('grid')
  const [cutToFit, setCutToFit] = useState(true)
  const [name, setName] = useState('')
  if (!axes) return null
  const axisName = (i: number) => ['X', 'Y', 'Z'][i]
  const settings = { gap: gapMm / 1000, pattern, cutToFit, groupName: name }
  return (
    <Section title="Lát đầy vùng">
      <button
        className="primary wide"
        onClick={() => {
          useEditorStore.getState().setTool('fill')
          useEditorStore.setState({ groundFill: { sourceId: obj.id, ...settings } })
        }}
        title="Bấm hai góc đối nhau trên mặt đất; viên được lát theo mặt đất, nghiêng theo dốc"
      >
        Kéo khung trên mặt đất
      </button>
            <NumRow>
        <NumField label={`Dọc ${axisName(axes.a)}`} suffix={unit} digits={digits} min={0.005} value={area[0] * scale} onCommit={(v) => setArea([v / scale, area[1]])} />
        <NumField label={`Dọc ${axisName(axes.b)}`} suffix={unit} digits={digits} min={0.005} value={area[1] * scale} onCommit={(v) => setArea([area[0], v / scale])} />
        <NumField label="Khe" suffix="mm" digits={0} min={0} value={gapMm} onCommit={setGapMm} />
      </NumRow>
      <SelectField label="Kiểu xếp" value={pattern} onChange={(v) => setPattern(v as TilePattern)} options={PATTERNS} />
      <CheckField label="Cắt viên ngoài cùng cho vừa mép" checked={cutToFit} onChange={setCutToFit} />
      <input type="text" className="text-in" placeholder="Tên nhóm (vd: Sàn phòng khách)" aria-label="Tên nhóm" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="wide" onClick={() => fillAreaWithTiles(obj.id, { areaU: area[0], areaV: area[1], ...settings })}>
        Lát theo số
      </button>
    </Section>
  )
}

/** Ốp mặt: cover one side of a wall, roof panel or slab with bricks, shingles or boards. */
export function CoverSection({ obj }: { obj: WorldObject }) {
  const [face, setFace] = useState<CoverFace>('up')
  const [tile, setTile] = useState(CLAD_TILES[0].id)
  const [gapMm, setGapMm] = useState(3)
  const [name, setName] = useState('')
  const round = obj.geometry.shape === 'cylinder' || obj.geometry.shape === 'cone'
  if (obj.geometry.shape !== 'box' && obj.geometry.shape !== 'panel' && !round) return null
  return (
    <Section title={round ? 'Ốp quanh thân' : 'Ốp mặt'}>
      {!round && <SelectField label="Mặt cần ốp" value={face} onChange={(v) => setFace(v as CoverFace)} options={Object.entries(COVER_FACE_LABELS).map(([value, label]) => ({ value, label }))} />}
      <SelectField label="Viên ốp" value={tile} onChange={setTile} options={CLAD_TILES.map((t) => ({ value: t.id, label: t.label }))} />
      <NumRow>
        <NumField label="Khe" suffix="mm" digits={0} min={0} value={gapMm} onCommit={setGapMm} />
      </NumRow>
      <input type="text" className="text-in" placeholder="Tên nhóm (không bắt buộc)" aria-label="Tên nhóm" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="primary wide" onClick={() => (round ? coverRoundWithTiles(obj.id, tile, { gap: gapMm / 1000, groupName: name }) : coverFaceWithTiles(obj.id, face, tile, { gap: gapMm / 1000, cutToFit: true, groupName: name }))}>
        Ốp mặt này
      </button>
    </Section>
  )
}

/** Lặp theo hàng hoặc theo vòng: copy the whole selection many times. */
export function RepeatSection({ ids, unit }: { ids: string[]; unit: LengthUnit }) {
  const scale = UNIT_SCALE[unit]
  const digits = UNIT_DIGITS[unit]
  const [mode, setMode] = useState<'line' | 'ring'>('line')
  const [count, setCount] = useState(4)
  const [axis, setAxis] = useState<RepeatAxis>('x')
  const [step, setStep] = useState<number | null>(null)
  const [radius, setRadius] = useState(3)
  const [name, setName] = useState('')
  const shownStep = step ?? defaultStep(ids, axis)
  return (
    <Section title="Lặp lại">
      <SelectField
        label="Kiểu lặp"
        value={mode}
        onChange={(v) => setMode(v as 'line' | 'ring')}
        options={[
          { value: 'line', label: 'Theo hàng thẳng' },
          { value: 'ring', label: 'Theo vòng tròn' },
        ]}
      />
      <NumRow>
        <NumField label="Số bản thêm" digits={0} min={1} value={count} onCommit={(v) => setCount(Math.min(200, Math.round(v)))} />
        {mode === 'line' ? (
          <NumField label="Cách nhau" suffix={unit} digits={digits} value={shownStep * scale} onCommit={(v) => setStep(v / scale)} />
        ) : (
          <NumField label="Bán kính" suffix={unit} digits={digits} min={0.1} value={radius * scale} onCommit={(v) => setRadius(v / scale)} />
        )}
      </NumRow>
      {mode === 'line' && (
        <SelectField
          label="Hướng"
          value={axis}
          onChange={(v) => {
            setAxis(v as RepeatAxis)
            setStep(null)
          }}
          options={[
            { value: 'x', label: 'Ngang (X)' },
            { value: 'z', label: 'Sâu (Z)' },
            { value: 'y', label: 'Lên cao (Y)' },
          ]}
        />
      )}
      <input type="text" className="text-in" placeholder="Tên nhóm (không bắt buộc)" aria-label="Tên nhóm" value={name} onChange={(e) => setName(e.target.value)} />
      <button
        className="primary wide"
        onClick={() => (mode === 'line' ? repeatInLine(ids, count, axis, shownStep, name) : repeatAroundRing(ids, count, radius, name))}
      >
        Lặp lại
      </button>
    </Section>
  )
}

/** Lưu mẫu: remember the selection so it can be placed again from the shelf. */
export function TemplateSection({ ids }: { ids: string[] }) {
  const objects = useWorldStore((s) => s.objects)
  const add = useTemplateStore((s) => s.add)
  const groupName = ids.map((id) => objects[id]?.groupName).find(Boolean) ?? ''
  const [name, setName] = useState('')
  const save = () => {
    const template = captureCluster(ids.map((id) => objects[id]).filter(Boolean), name || groupName)
    if (!template) return
    const stored = add(template)
    showToast(
      stored
        ? `Đã lưu mẫu "${template.name}". Mở kệ Tạo hình → "Mẫu của tôi" để đặt lại.`
        : `Đã lưu mẫu "${template.name}" nhưng trình duyệt không cho nhớ lâu; mẫu mất khi đóng trang.`,
    )
    setName('')
  }
  return (
    <Section title="Lưu mẫu">
      <input type="text" className="text-in" placeholder={groupName || 'Tên mẫu'} aria-label="Tên mẫu" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="primary wide" onClick={save}>
        Lưu mẫu
      </button>
    </Section>
  )
}

/** Lát sàn theo tường: floor inside a room of selected walls. */
export function FloorSection({ ids }: { ids: string[] }) {
  const [tile, setTile] = useState('preset_plank')
  const [gapMm, setGapMm] = useState(2)
  const [name, setName] = useState('')
  const floorTiles = CLAD_TILES.filter((t) => t.id === 'preset_plank' || t.id === 'preset_floor_tile')
  return (
    <Section title="Lát sàn">
      <SelectField label="Loại sàn" value={tile} onChange={setTile} options={floorTiles.map((t) => ({ value: t.id, label: t.id === 'preset_plank' ? 'Ván gỗ' : 'Gạch lát nền' }))} />
      <NumRow>
        <NumField label="Khe" suffix="mm" digits={0} min={0} value={gapMm} onCommit={setGapMm} />
      </NumRow>
      <input type="text" className="text-in" placeholder="Tên nhóm (vd: Sàn gỗ)" aria-label="Tên nhóm" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="primary wide" onClick={() => floorInsideWalls(ids, tile, { gap: gapMm / 1000, groupName: name })}>
        Lát sàn
      </button>
    </Section>
  )
}

const WALL_COLOURS = ['#f4efe6', '#f3dfa6', '#e8c9a0', '#d9b778', '#c8d8e8', '#b7d3b0', '#e7b7b0', '#9aa7b5']
const ROOF_COLOURS = ['#c94f32', '#e8873a', '#4c515b', '#7a4a2b', '#3f6fb5', '#3f8a52', '#a5432f', '#b9bcc0']

function Swatches({ colours, onPick }: { colours: string[]; onPick: (colour: string | null) => void }) {
  return (
    <div className="swatch-row">
      {colours.map((colour) => (
        <button key={colour} className="swatch-btn" style={{ background: colour }} aria-label={`Màu ${colour}`} onClick={() => onPick(colour)} />
      ))}
      <button className="swatch-btn clear" title="Gỡ sơn" aria-label="Gỡ sơn" onClick={() => onPick(null)}>
        x
      </button>
    </div>
  )
}

/** Đổi màu nhà: repaint the walls or the roof of a finished house in one click. */
export function HouseColourSection({ ids }: { ids: string[] }) {
  const objects = useWorldStore((s) => s.objects)
  const walls = ids.filter((id) => objects[id]?.type === 'wall')
  const roofs = ids.filter((id) => objects[id]?.type === 'roof')
  if (walls.length === 0 && roofs.length === 0) return null
  const coat = (list: string[]) => (colour: string | null) => paintObjects(list, colour ? { color: colour, strength: 0.85 } : undefined)
  return (
    <Section title="Màu nhà">
      {walls.length > 0 && (
        <>
          <span className="sw-label">Tường</span>
          <Swatches colours={WALL_COLOURS} onPick={coat(walls)} />
        </>
      )}
      {roofs.length > 0 && (
        <>
          <span className="sw-label">Mái</span>
          <Swatches colours={ROOF_COLOURS} onPick={coat(roofs)} />
        </>
      )}
    </Section>
  )
}

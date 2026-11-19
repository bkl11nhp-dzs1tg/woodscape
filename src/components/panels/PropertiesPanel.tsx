import axisXIcon from '../../assets/icons/axis-x.svg'
import axisYIcon from '../../assets/icons/axis-y.svg'
import axisZIcon from '../../assets/icons/axis-z.svg'
import cutHalfIcon from '../../assets/icons/cut-half.svg'
import cutLineIcon from '../../assets/icons/cut-line.svg'
import cutShapeIcon from '../../assets/icons/cut-shape.svg'
import dimHeightIcon from '../../assets/icons/dim-height.svg'
import dimWidthIcon from '../../assets/icons/dim-width.svg'
import doCutIcon from '../../assets/icons/do-cut.svg'
import doHoleIcon from '../../assets/icons/do-hole.svg'
import keepPieceIcon from '../../assets/icons/keep-piece.svg'
import shapeCircleIcon from '../../assets/icons/shape-circle.svg'
import shapeRectIcon from '../../assets/icons/shape-rect.svg'
import shapeTriangleIcon from '../../assets/icons/shape-triangle.svg'
import { useEffect, useState, type ReactNode } from 'react'
import { useReveal } from '../../app/useReveal'
import { IconButton } from '../ui/Icons'
import { useConstructionStore } from '../../stores/constructionStore'
import { duplicateSelection } from '../../app/useShortcuts'
import { getMaterialDef, MATERIALS, TEXTURES } from '../../data/materials'
import {
  deleteObjects,
  moveObject,
  renameObject,
  resizeObject,
  rotateObject,
  setFaceMaterial,
  cutObject,
  groupObjects,
  ungroupObjects,
  renameGroup,
  setObjectMaterial,
  setOpacity,
  setPaint,
  toggleOpen,
} from '../../game/building/commands'
import { addOpeningsToSelection, addRoofToSelection } from '../../game/building/drawActions'
import type { RoofKind } from '../../game/building/roof'
import { CoverSection, FillSection, FloorSection, HouseColourSection, RepeatSection, TemplateSection } from './BuildTools'
import { NumField, NumRow, NumTriple, Section, SelectField, UNIT_DIGITS, UNIT_SCALE } from './PanelParts'
import { cutAlongLine, cutOutShape, shapePoints } from '../../game/building/cutting'
import { FACE_LABELS, resolveFaceMaterialIds } from '../../game/building/faceMaterials'
import { cameraCommands } from '../../game/camera/cameraCommands'
import { getDimensions, isBoxLike, isOpening } from '../../game/geometry/GeometryFactory'
import { useEditorStore, type Axis } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'
import { BOX_FACES, type GeometryParams, type ShapeKind, type Vec3, type WorldObject } from '../../types/world'

const SHAPE_LABELS: Record<ShapeKind, string> = {
  box: 'Hộp chữ nhật',
  panel: 'Tấm mỏng',
  prism: 'Lăng trụ tam giác',
  door: 'Cửa chính',
  window: 'Cửa sổ',
  opening: 'Ô trống trên tường',
  extrude: 'Miếng cắt theo hình',
  card: 'Hình tham chiếu tỉ lệ',
  figure: 'Mô hình người / con vật',
  tree: 'Cây',
  model: 'Mô hình 3D nhập vào',
  sphere: 'Hình cầu',
  cylinder: 'Hình trụ',
  cone: 'Hình nón',
}

const MIN_SIZE = 0.005
const MATERIAL_LIST = Object.values(MATERIALS)

/** Numeric input that commits on Enter or blur, so one edit is one undo step. */
function NumberField(props: {
  label: ReactNode
  value: number
  suffix: string
  digits: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = String(Number(props.value.toFixed(props.digits)))

  const commit = () => {
    if (draft === null) return
    const parsed = Number(draft.replace(',', '.'))
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(parsed) && parsed !== Number(shown)) props.onCommit(parsed)
  }

  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? shown}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setDraft(null)
            e.currentTarget.blur()
          }
        }}
      />
      <em>{props.suffix}</em>
    </label>
  )
}

function Swatch({ materialId }: { materialId: string }) {
  const def = getMaterialDef(materialId)
  const url = TEXTURES[def.textureId]?.url
  return <span className="swatch" style={{ backgroundColor: def.color, backgroundImage: url ? `url(${url})` : undefined }} />
}

function MaterialSelect({ value, onChange, label }: { value: string; label: string; onChange: (id: string) => void }) {
  return (
    <div className="material-row">
      <Swatch materialId={value} />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {MATERIAL_LIST.map((material) => (
          <option key={material.id} value={material.id}>
            {material.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Slider that previews while dragging and records one undo step on release. */
function OpacitySlider({ obj }: { obj: WorldObject }) {
  const stored = Math.round((obj.opacity ?? getMaterialDef(obj.materialId).opacity ?? 1) * 100)
  const [value, setValue] = useState(stored)
  useEffect(() => setValue(stored), [stored])
  const commit = () => setOpacity(obj.id, value >= 100 && obj.geometry.shape !== 'window' ? undefined : value / 100)
  return (
    <label className="slider">
      <span>
        {obj.geometry.shape === 'window' ? 'Độ đục của kính' : 'Độ đục'} {value}%
      </span>
      <input
        type="range"
        min={10}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
      />
    </label>
  )
}

const CUT_AXES: { id: Axis; label: string }[] = [
  { id: 'x', label: 'Ngang chiều rộng (X)' },
  { id: 'y', label: 'Ngang chiều cao (Y)' },
  { id: 'z', label: 'Ngang chiều sâu (Z)' },
]

const CUT_MODES = [
  { id: 'half', label: 'Chia đôi', icon: cutHalfIcon },
  { id: 'line', label: 'Đường kẻ', icon: cutLineIcon },
  { id: 'shape', label: 'Khoét hình', icon: cutShapeIcon },
] as const

const CUT_SHAPES = [
  { id: 'rect', label: 'Chữ nhật', icon: shapeRectIcon },
  { id: 'circle', label: 'Tròn', icon: shapeCircleIcon },
  { id: 'triangle', label: 'Tam giác', icon: shapeTriangleIcon },
] as const

const AXIS_ICONS = { x: axisXIcon, y: axisYIcon, z: axisZIcon }

/** Cut tool bar (like the paint bar): icons only, names show on hover. */
export function CutBar() {
  const active = useEditorStore((s) => s.activeTool === 'cut' && s.appMode === 'edit')
  const id = useEditorStore((s) => s.selectedIds[0])
  const obj = useWorldStore((s) => (id ? s.objects[id] : undefined))
  if (!active) return null
  return (
    <section className="shelf panel cutbar" aria-label="Cắt">
      {obj ? (
        <CutControls obj={obj} />
      ) : (
        <div className="cut-controls cut-idle">
          <CutModeButtons />
          <span className="cut-empty">Bấm vào khối hoặc tấm muốn cắt</span>
        </div>
      )}
    </section>
  )
}

/** The three ways to cut: in two, along a line, a shape cut out. Choosable even before anything is picked. */
function CutModeButtons() {
  const mode = useEditorStore((s) => s.cutMode)
  return (
    <div className="cut-group cut-modes">
      {CUT_MODES.map((item) => (
        <button
          key={item.id}
          className={item.id === mode ? 'icon-btn active' : 'icon-btn'}
          title={item.label}
          aria-label={item.label}
          onClick={() => useEditorStore.setState({ cutMode: item.id, cutPicks: null })}
        >
          <img src={item.icon} alt="" />
          <span className="lbl">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

function CutControls({ obj }: { obj: WorldObject }) {
  const axis = useEditorStore((s) => s.cutAxis)
  const ratio = useEditorStore((s) => s.cutRatio)
  const setCut = useEditorStore((s) => s.setCut)
  const mode = useEditorStore((s) => s.cutMode)
  const allPicks = useEditorStore((s) => s.cutPicks)
  const shape = useEditorStore((s) => s.cutShape)
  const shapeSize = useEditorStore((s) => s.cutShapeSize)
  const keepPlug = useEditorStore((s) => s.cutKeepPlug)
  const unit = useEditorStore((s) => s.unit)
  const scale = UNIT_SCALE[unit]
  const picks = allPicks?.id === obj.id ? allPicks : null
  const cuttable = isBoxLike(obj.geometry.shape) || obj.geometry.shape === 'extrude'
  const boxLike = isBoxLike(obj.geometry.shape)
  const picked = picks?.points.length ?? 0

  const finish = (pieces: string[] | null) => {
    if (!pieces) {
      showToast('Không cắt được, hãy kẻ đường đi ngang qua vật thể')
      return
    }
    useEditorStore.setState({ selectedIds: [pieces[0]], cutPicks: null })
  }

  const modes = <CutModeButtons />

  if (!cuttable) {
    return (
      <div className="cut-controls">
        {modes}
        <span className="cut-empty">Chọn khối hộp hoặc tấm</span>
      </div>
    )
  }

  return (
    <div className="cut-controls">
      {modes}
      <div className="cut-options">

      {mode === 'half' && boxLike && (
        <>
          <div className="cut-group">
            {CUT_AXES.map((item) => (
              <button
                key={item.id}
                className={item.id === axis ? 'icon-btn active' : 'icon-btn'}
                title={item.label}
                aria-label={item.label}
                onClick={() => setCut({ axis: item.id as Axis })}
              >
                <img src={AXIS_ICONS[item.id as Axis]} alt="" />
                <span className="lbl">{item.id.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <NumberField
            label={<><img className="mini" src={dimWidthIcon} alt="" title="Cách đầu" /><span className="lbl">Cách đầu</span></>}
            suffix={unit}
            digits={UNIT_DIGITS[unit]}
            value={ratio * { x: getDimensions(obj.geometry).width, y: getDimensions(obj.geometry).height, z: getDimensions(obj.geometry).depth }[axis] * scale}
            onCommit={(value) => {
              const size = getDimensions(obj.geometry)
              const length = { x: size.width, y: size.height, z: size.depth }[axis]
              setCut({ ratio: Math.min(0.98, Math.max(0.02, value / scale / length)) })
            }}
          />
          <button className="icon-btn go" title="Cắt tại vạch đỏ" aria-label="Cắt tại vạch đỏ" onClick={() => finish(cutObject(obj.id, axis, ratio))}>
            <img src={doCutIcon} alt="" />
            <span className="lbl">Cắt</span>
          </button>
        </>
      )}
      {mode === 'half' && !boxLike && <span className="cut-empty">Dùng đường kẻ hoặc khoét hình</span>}

      {mode === 'line' && (
        <>
          <ol className="cut-steps">
            <li className={picked >= 1 ? 'done' : 'now'}>Điểm đầu</li>
            <li className={picked >= 2 ? 'done' : picked === 1 ? 'now' : ''}>Điểm cuối</li>
          </ol>
          <button
            className="icon-btn go"
            title="Cắt theo đường kẻ"
            aria-label="Cắt theo đường kẻ"
            disabled={picked < 2}
            onClick={() => picks && finish(cutAlongLine(obj.id, picks.axis, picks.points[0], picks.points[1]))}
          >
            <img src={doCutIcon} alt="" />
            <span className="lbl">Cắt</span>
          </button>
        </>
      )}

      {mode === 'shape' && (
        <>
          <div className="cut-group">
            {CUT_SHAPES.map((item) => (
              <button
                key={item.id}
                className={item.id === shape ? 'icon-btn active' : 'icon-btn'}
                title={item.label}
                aria-label={item.label}
                onClick={() => useEditorStore.setState({ cutShape: item.id })}
              >
                <img src={item.icon} alt="" />
                <span className="lbl">{item.label}</span>
              </button>
            ))}
          </div>
          {([dimWidthIcon, dimHeightIcon] as const).map((icon, i) => (
            <NumberField
              key={icon}
              label={<><img className="mini" src={icon} alt="" title={i === 0 ? 'Rộng' : 'Cao'} /><span className="lbl">{i === 0 ? 'Rộng' : 'Cao'}</span></>}
              suffix={unit}
              digits={UNIT_DIGITS[unit]}
              value={shapeSize[i] * scale}
              onCommit={(value) => {
                const next: [number, number] = [...shapeSize]
                next[i] = Math.max(0.02, value / scale)
                useEditorStore.setState({ cutShapeSize: next })
              }}
            />
          ))}
          <button
            className={keepPlug ? 'icon-btn active' : 'icon-btn'}
            title="Giữ lại miếng cắt ra"
            aria-label="Giữ lại miếng cắt ra"
            aria-pressed={keepPlug}
            onClick={() => useEditorStore.setState({ cutKeepPlug: !keepPlug })}
          >
            <img src={keepPieceIcon} alt="" />
            <span className="lbl">Giữ miếng</span>
          </button>
          <button
            className="icon-btn go"
            title="Khoét hình"
            aria-label="Khoét hình"
            disabled={!picks}
            onClick={() => picks && finish(cutOutShape(obj.id, picks.axis, shapePoints(shape, picks.points[0], shapeSize[0], shapeSize[1]), keepPlug))}
          >
            <img src={doHoleIcon} alt="" />
            <span className="lbl">Khoét</span>
          </button>
        </>
      )}
      </div>
    </div>
  )
}

/** Editable dimension fields for each shape: [label, key]. */
const DIMENSION_FIELDS: Record<ShapeKind, [string, string][]> = {
  box: [['Rộng (X)', 'width'], ['Cao (Y)', 'height'], ['Sâu (Z)', 'depth']],
  panel: [['Rộng (X)', 'width'], ['Cao (Y)', 'height'], ['Dày (Z)', 'thickness']],
  prism: [['Rộng đáy (X)', 'width'], ['Cao (Y)', 'height'], ['Sâu (Z)', 'depth']],
  door: [['Rộng', 'width'], ['Cao', 'height'], ['Dày khung', 'thickness']],
  window: [['Rộng', 'width'], ['Cao', 'height'], ['Dày khung', 'thickness']],
  opening: [['Rộng', 'width'], ['Cao', 'height'], ['Sâu', 'thickness']],
  extrude: [['Dày', 'depth']],
  card: [['Rộng', 'width'], ['Cao', 'height']],
  figure: [['Chiều cao', 'height']],
  tree: [['Chiều cao', 'height']],
  model: [['Chiều cao', 'height']],
  sphere: [['Bán kính', 'radius']],
  cylinder: [['Bán kính', 'radius'], ['Cao (Y)', 'height']],
  cone: [['Bán kính đáy', 'radius'], ['Cao (Y)', 'height']],
}

/** Nothing selected: a short reminder that shows when edit mode starts and when the pointer comes near, then steps aside. */
function IdleHint() {
  const shown = useReveal('idle', (x, y, w) => x > w - 360 && y < 240, 5)
  return (
    <aside className={shown ? 'properties panel pp idle reveal' : 'properties panel pp idle reveal hidden'}>
      <p className="idle-text">
        Bấm vào một vật để chỉnh, hoặc <strong>Tạo hình</strong> để thêm vật mới.
      </p>
    </aside>
  )
}

/** Shown when several objects are selected: act on them together. */
function MultiPanel({ ids }: { ids: string[] }) {
  const objects = useWorldStore((s) => s.objects)
  const unit = useEditorStore((s) => s.unit)
  const groups = new Set(ids.map((id) => objects[id]?.groupId))
  const groupName = ids.map((id) => objects[id]?.groupName).find(Boolean) ?? ''
  const [draftName, setDraftName] = useState('')
  const roofPitch = useEditorStore((s) => s.roofPitch)
  const setRoofPitch = useEditorStore((s) => s.setRoofPitch)
  const roofKind = useEditorStore((s) => s.roofKind)
  const setRoofKind = useEditorStore((s) => s.setRoofKind)
  const oneGroup = groups.size === 1 && !groups.has(undefined)
  return (
    <aside className="properties panel pp">
      <header className="pp-head">
        {oneGroup ? (
          <input
            key={groupName}
            type="text"
            className="name-input"
            placeholder="Đặt tên nhóm"
            aria-label="Tên nhóm"
            defaultValue={groupName}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => e.target.value.trim() !== groupName && renameGroup(ids, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        ) : (
          <input
            type="text"
            className="name-input"
            placeholder="Tên nhóm (không bắt buộc)"
            aria-label="Tên nhóm"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
        )}
        <p className="pp-sub">
          <span className="badge">{oneGroup ? 'Một nhóm' : 'Chọn rời'}</span>
          {ids.length} vật thể
        </p>
      </header>

      <div className="pp-actions">
        {oneGroup ? (
          <IconButton icon="ungroup" text="Tách nhóm" label="Tách nhóm (Ctrl+Shift+G)" onClick={() => ungroupObjects(ids)} />
        ) : (
          <IconButton icon="group" text="Gom nhóm" label="Gom nhóm (Ctrl+G)" primary onClick={() => groupObjects(ids, draftName)} />
        )}
        <IconButton icon="duplicate" text="Nhân bản" label="Nhân bản (Ctrl+D)" onClick={duplicateSelection} />
        <IconButton icon="trash" text="Xoá" label="Xoá (Delete)" danger onClick={() => deleteObjects(ids)} />
      </div>

      <Section title="Mái và cửa" open>
        <NumRow>
          <SelectField
            label="Kiểu mái"
            value={roofKind}
            onChange={(v) => setRoofKind(v as RoofKind)}
            options={[
              { value: 'gable', label: 'Hai dốc' },
              { value: 'hip', label: 'Mái hông' },
              { value: 'flat', label: 'Mái bằng' },
            ]}
          />
          <SelectField
            label="Độ dốc"
            value={String(roofPitch)}
            onChange={(v) => setRoofPitch(Number(v))}
            options={[15, 25, 30, 40, 50].map((degrees) => ({ value: String(degrees), label: `${degrees}°` }))}
          />
        </NumRow>
        <div className="pp-actions">
          <IconButton icon="roof" text="Thêm mái" label="Dựng mái phủ lên các bức tường đang chọn" primary onClick={() => addRoofToSelection(roofPitch, roofKind)} />
          <IconButton icon="door" text="Thêm cửa" label="Thêm cửa chính và cửa sổ cách đều lên các bức tường đang chọn" onClick={() => addOpeningsToSelection()} />
        </div>
      </Section>
      <HouseColourSection ids={ids} />
      <FloorSection ids={ids} />
      <RepeatSection ids={ids} unit={unit} />
      <TemplateSection ids={ids} />

    </aside>
  )
}

export function PropertiesPanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const selectedId = useEditorStore((s) => s.selectedIds[0])
  const unit = useEditorStore((s) => s.unit)
  const obj = useWorldStore((s) => (selectedId ? s.objects[selectedId] : undefined))
  const settingsOpen = useEditorStore((s) => s.settingsOpen)
  const tool = useEditorStore((s) => s.activeTool)
  const appMode = useEditorStore((s) => s.appMode)
  const building = useConstructionStore((s) => s.active !== null)

  // The settings popover opens in this corner; step aside instead of sitting under it.
  // In view mode there is nothing to edit.
  if (settingsOpen || appMode === 'view' || tool === 'cut' || building) return null

  if (selectedIds.length > 1) return <MultiPanel ids={selectedIds} />

  if (!obj) {
    return (
      <IdleHint />
    )
  }

  const scale = UNIT_SCALE[unit]
  const digits = UNIT_DIGITS[unit]
  const geometry = obj.geometry as GeometryParams & Record<string, number | string>
  const { position, rotation } = obj.transform
  const faceIds = resolveFaceMaterialIds(obj)
  const hasFaceOverrides = Boolean(obj.faceMaterials && Object.keys(obj.faceMaterials).length > 0)

  const setAxis = (source: Vec3, axis: number, value: number): Vec3 => {
    const next: Vec3 = [...source]
    next[axis] = value
    return next
  }

  return (
    <aside className="properties panel pp">
      <header className="pp-head">
        <input
          key={obj.id + obj.name}
          type="text"
          className="name-input"
          onFocus={(e) => e.target.select()}
          aria-label="Tên vật thể"
          defaultValue={obj.name}
          onBlur={(e) => renameObject(obj.id, e.target.value.trim() || obj.name)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <p className="pp-sub">
          {SHAPE_LABELS[obj.geometry.shape]}
          {obj.groupId && <span className="badge">{obj.groupName ?? 'Nhóm'}</span>}
        </p>
      </header>

      <div className="pp-actions">
        <IconButton icon="focus" text="Lấy nét" label="Lấy nét: đưa camera tới vật (F)" onClick={() => cameraCommands.emit({ type: 'focus' })} />
        <IconButton icon="duplicate" text="Nhân bản" label="Nhân bản (Ctrl+D)" onClick={duplicateSelection} />
        <IconButton icon="trash" text="Xoá" label="Xoá (Delete)" danger onClick={() => deleteObjects([obj.id])} />
      </div>

      {isOpening(obj.geometry.shape) && (
        <div className="opening-controls">
          {obj.geometry.shape !== 'opening' && (
            <button className="primary" onClick={() => toggleOpen(obj.id)}>
              {obj.open ? 'Đóng lại' : 'Mở ra'}
            </button>
          )}
          {obj.geometry.shape === 'door' && (
            <select
              aria-label="Bản lề"
              value={obj.geometry.hinge}
              onChange={(e) => resizeObject(obj.id, { ...obj.geometry, hinge: e.target.value } as GeometryParams)}
            >
              <option value="left">Bản lề trái</option>
              <option value="right">Bản lề phải</option>
            </select>
          )}
        </div>
      )}

      <Section title="Kích thước" open>
        <NumRow>
          {DIMENSION_FIELDS[obj.geometry.shape].map(([label, key]) => (
            <NumField
              key={key}
              label={label}
              digits={digits}
              min={MIN_SIZE * scale}
              value={(geometry[key] as number) * scale}
              onCommit={(value) => resizeObject(obj.id, { ...obj.geometry, [key]: Math.max(MIN_SIZE, value / scale) } as GeometryParams)}
            />
          ))}
        </NumRow>
        {obj.geometry.shape === 'prism' && (
          <SelectField
            label="Dạng tam giác"
            value={obj.geometry.lean ?? 'none'}
            onChange={(value) => {
              const { lean: _old, ...rest } = obj.geometry as Extract<GeometryParams, { shape: 'prism' }>
              resizeObject(obj.id, (value === 'none' ? rest : { ...rest, lean: value }) as GeometryParams)
            }}
            options={[
              { value: 'none', label: 'Cân (hai dốc)' },
              { value: 'right', label: 'Nêm vuông (cạnh đứng bên phải)' },
              { value: 'left', label: 'Nêm vuông (cạnh đứng bên trái)' },
            ]}
          />
        )}
      </Section>

      <Section title="Vị trí và xoay" open>
        <NumTriple label="Vị trí" values={position.map((v) => v * scale)} digits={digits} onCommit={(i, value) => moveObject(obj.id, setAxis(position, i, value / scale))} />
        <NumTriple
          label="Xoay (độ)"
          values={rotation.map((v) => (v * 180) / Math.PI)}
          digits={1}
          onCommit={(i, value) => rotateObject(obj.id, setAxis(rotation, i, (value * Math.PI) / 180))}
        />
      </Section>

      <Section title="Vật liệu" open>
        <MaterialSelect label="Vật liệu" value={obj.materialId} onChange={(id) => setObjectMaterial(obj.id, id)} />
        {isBoxLike(obj.geometry.shape) && (
          <details className="faces" open={hasFaceOverrides}>
            <summary>Vật liệu từng mặt</summary>
            {BOX_FACES.map((face, i) => (
              <div key={face} className="face-row">
                <span className="face-name">{FACE_LABELS[face]}</span>
                <MaterialSelect label={`Mặt ${FACE_LABELS[face]}`} value={faceIds[i]} onChange={(id) => setFaceMaterial(obj.id, face, id)} />
              </div>
            ))}
            <button className="text-button" disabled={!hasFaceOverrides} onClick={() => setObjectMaterial(obj.id, obj.materialId)}>
              Đặt lại 6 mặt về vật liệu chung
            </button>
          </details>
        )}
      </Section>

      <Section title="Sơn và độ đục">
        <div className="material-row">
          <span className="swatch" style={{ background: obj.paint?.color ?? 'transparent' }} />
          <span className="grow muted">{obj.paint ? `Sơn phủ ${Math.round(obj.paint.strength * 100)}%` : 'Chưa sơn (dùng công cụ Sơn)'}</span>
          {obj.paint && (
            <button className="text-button" onClick={() => setPaint(obj.id, undefined)}>
              Gỡ
            </button>
          )}
        </div>
        <OpacitySlider key={obj.id} obj={obj} />
      </Section>

      {!obj.groupId && <FillSection key={obj.id} obj={obj} unit={unit} />}
      <CoverSection key={`cover_${obj.id}`} obj={obj} />
      <RepeatSection key={`repeat_${obj.id}`} ids={[obj.id]} unit={unit} />
    </aside>
  )
}

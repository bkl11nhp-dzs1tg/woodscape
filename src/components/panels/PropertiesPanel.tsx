import { useEffect, useState } from 'react'
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
  setObjectMaterial,
  setOpacity,
  setPaint,
  toggleOpen,
} from '../../game/building/commands'
import { addOpeningsToSelection, addRoofToSelection } from '../../game/building/drawActions'
import type { RoofKind } from '../../game/building/roof'
import { cutAlongLine, cutOutShape, shapePoints } from '../../game/building/cutting'
import { FACE_LABELS, resolveFaceMaterialIds } from '../../game/building/faceMaterials'
import { cameraCommands } from '../../game/camera/cameraCommands'
import { getDimensions, isBoxLike, isOpening } from '../../game/geometry/GeometryFactory'
import { useEditorStore, type Axis } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'
import { BOX_FACES, type GeometryParams, type LengthUnit, type ShapeKind, type Vec3, type WorldObject } from '../../types/world'

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

const UNIT_SCALE: Record<LengthUnit, number> = { m: 1, cm: 100, mm: 1000 }
const UNIT_DIGITS: Record<LengthUnit, number> = { m: 3, cm: 1, mm: 0 }
const MIN_SIZE = 0.005
const MATERIAL_LIST = Object.values(MATERIALS)

/** Numeric input that commits on Enter or blur, so one edit is one undo step. */
function NumberField(props: {
  label: string
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
  { id: 'half', label: 'Chia đôi' },
  { id: 'line', label: 'Đường kẻ' },
  { id: 'shape', label: 'Khoét hình' },
] as const

/** Cut tool: split in two at a measured place, cut along a drawn line, or cut a shape out. */
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

  const finish = (pieces: string[] | null) => {
    if (!pieces) {
      showToast('Không cắt được ở vị trí này. Hãy kẻ đường đi ngang qua vật thể.')
      return
    }
    useEditorStore.setState({ selectedIds: [pieces[0]], cutPicks: null })
  }

  return (
    <div className="cut-controls">
      <div className="segmented">
        {CUT_MODES.map((item) => (
          <button key={item.id} className={item.id === mode ? 'active' : ''} onClick={() => useEditorStore.setState({ cutMode: item.id, cutPicks: null })}>
            {item.label}
          </button>
        ))}
      </div>

      {!cuttable && <p className="muted note">Công cụ Cắt dùng được cho khối hộp, tấm và các miếng đã cắt.</p>}

      {cuttable && mode === 'half' && isBoxLike(obj.geometry.shape) && (
        <>
          <select aria-label="Hướng cắt" value={axis} onChange={(e) => setCut({ axis: e.target.value as Axis })}>
            {CUT_AXES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <NumberField
            label="Cách đầu"
            suffix={unit}
            digits={UNIT_DIGITS[unit]}
            value={ratio * { x: getDimensions(obj.geometry).width, y: getDimensions(obj.geometry).height, z: getDimensions(obj.geometry).depth }[axis] * scale}
            onCommit={(value) => {
              const size = getDimensions(obj.geometry)
              const length = { x: size.width, y: size.height, z: size.depth }[axis]
              setCut({ ratio: Math.min(0.98, Math.max(0.02, value / scale / length)) })
            }}
          />
          <button className="primary" onClick={() => finish(cutObject(obj.id, axis, ratio))}>
            Cắt tại vạch đỏ
          </button>
          <p className="muted note">Bấm lên vật thể để dời vạch cắt.</p>
        </>
      )}
      {cuttable && mode === 'half' && !isBoxLike(obj.geometry.shape) && (
        <p className="muted note">Miếng đã cắt xiên thì dùng "Đường kẻ" hoặc "Khoét hình".</p>
      )}

      {cuttable && mode === 'line' && (
        <>
          <p className="muted note">Bấm hai điểm trên một mặt của vật thể để kẻ đường cắt. Đường cắt đi thẳng qua bề dày, xiên góc nào cũng được.</p>
          <button
            className="primary"
            disabled={!picks || picks.points.length < 2}
            onClick={() => picks && finish(cutAlongLine(obj.id, picks.axis, picks.points[0], picks.points[1]))}
          >
            Cắt theo đường kẻ
          </button>
        </>
      )}

      {cuttable && mode === 'shape' && (
        <>
          <select aria-label="Hình khoét" value={shape} onChange={(e) => useEditorStore.setState({ cutShape: e.target.value as typeof shape })}>
            <option value="rect">Hình chữ nhật</option>
            <option value="circle">Hình tròn / bầu dục</option>
            <option value="triangle">Hình tam giác</option>
          </select>
          {(['Rộng', 'Cao'] as const).map((label, i) => (
            <NumberField
              key={label}
              label={label}
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
          <label className="check">
            <input type="checkbox" checked={keepPlug} onChange={(e) => useEditorStore.setState({ cutKeepPlug: e.target.checked })} />
            <span>Giữ lại miếng cắt ra</span>
          </label>
          <p className="muted note">Bấm lên một mặt của vật thể để đặt tâm hình.</p>
          <button
            className="primary"
            disabled={!picks}
            onClick={() =>
              picks && finish(cutOutShape(obj.id, picks.axis, shapePoints(shape, picks.points[0], shapeSize[0], shapeSize[1]), keepPlug))
            }
          >
            Khoét hình này
          </button>
        </>
      )}
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

/** Shown when several objects are selected: act on them together. */
function MultiPanel({ ids }: { ids: string[] }) {
  const objects = useWorldStore((s) => s.objects)
  const groups = new Set(ids.map((id) => objects[id]?.groupId))
  const roofPitch = useEditorStore((s) => s.roofPitch)
  const setRoofPitch = useEditorStore((s) => s.setRoofPitch)
  const roofKind = useEditorStore((s) => s.roofKind)
  const setRoofKind = useEditorStore((s) => s.setRoofKind)
  const oneGroup = groups.size === 1 && !groups.has(undefined)
  return (
    <aside className="properties panel multi">
      <header className="multi-head">
        <h2>{ids.length} vật thể</h2>
        <span className="badge">{oneGroup ? 'Một nhóm' : 'Chọn rời'}</span>
      </header>
      <p className="muted lead">
        {oneGroup ? 'Chọn, dời và xoay cùng nhau. Kéo mũi tên để dời cả cụm.' : 'Gom nhóm để lần sau chạm một cái là chọn cả cụm.'}
      </p>

      <h3>Mái và cửa</h3>
      <div className="form-grid">
        <label>
          <span>Kiểu mái</span>
          <select value={roofKind} onChange={(e) => setRoofKind(e.target.value as RoofKind)}>
            <option value="gable">Hai dốc</option>
            <option value="hip">Mái hông</option>
            <option value="flat">Mái bằng</option>
          </select>
        </label>
        <label>
          <span>Độ dốc</span>
          <select value={roofPitch} disabled={roofKind === 'flat'} onChange={(e) => setRoofPitch(Number(e.target.value))}>
            {[15, 25, 30, 40, 50].map((degrees) => (
              <option key={degrees} value={degrees}>
                {degrees}°
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-row">
        <button className="primary" onClick={() => addRoofToSelection(roofPitch, roofKind)} title="Dựng mái phủ lên các bức tường đang chọn">
          Thêm mái
        </button>
        <button onClick={addOpeningsToSelection} title="Thêm một cửa chính và cửa sổ cách đều lên các bức tường đang chọn">
          Thêm cửa
        </button>
      </div>

      <h3>Nhóm</h3>
      <div className="button-row three">
        {oneGroup ? (
          <button onClick={() => ungroupObjects(ids)} title="Tách nhóm (Ctrl+Shift+G)">
            Tách nhóm
          </button>
        ) : (
          <button className="primary" onClick={() => groupObjects(ids)} title="Gom nhóm (Ctrl+G)">
            Gom nhóm
          </button>
        )}
        <button onClick={duplicateSelection} title="Nhân bản (Ctrl+D)">
          Nhân bản
        </button>
        <button className="danger" onClick={() => deleteObjects(ids)} title="Xoá (Delete)">
          Xoá
        </button>
      </div>

      <p className="keys-hint">
        <kbd>Ctrl</kbd> / <kbd>Shift</kbd> + bấm: thêm bớt
        <br />
        <kbd>Alt</kbd> + bấm: chọn riêng một phần
      </p>
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

  // The settings popover opens in this corner; step aside instead of sitting under it.
  // In view mode there is nothing to edit.
  if (settingsOpen || appMode === 'view') return null

  if (selectedIds.length > 1) return <MultiPanel ids={selectedIds} />

  if (!obj) {
    return (
      <aside className="properties panel idle">
        <h2>Coastal Valley</h2>
        <p className="muted">
          Bấm <strong>Tạo hình</strong> để thêm vật thể, hoặc bấm vào một vật thể có sẵn để chỉnh sửa. Bấm đúp vào cửa
          để mở.
        </p>
      </aside>
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
    <aside className="properties panel">
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
      <p className="muted">
        {SHAPE_LABELS[obj.geometry.shape]}
        {obj.groupId && ' · thuộc một nhóm (bấm thường để chọn cả nhóm)'}
      </p>

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
          <p className="muted note">Đặt lên tường để tường tự mở ô. Bấm đúp vào cửa để mở / đóng.</p>
        </div>
      )}

      {tool === 'cut' && <CutControls obj={obj} />}

      <h3>Kích thước</h3>
      {DIMENSION_FIELDS[obj.geometry.shape].map(([label, key]) => (
        <NumberField
          key={key}
          label={label}
          suffix={unit}
          digits={digits}
          value={(geometry[key] as number) * scale}
          onCommit={(value) =>
            resizeObject(obj.id, { ...obj.geometry, [key]: Math.max(MIN_SIZE, value / scale) } as GeometryParams)
          }
        />
      ))}

      <h3>Vị trí</h3>
      {['X', 'Y', 'Z'].map((axis, i) => (
        <NumberField
          key={axis}
          label={axis}
          suffix={unit}
          digits={digits}
          value={position[i] * scale}
          onCommit={(value) => moveObject(obj.id, setAxis(position, i, value / scale))}
        />
      ))}

      <h3>Góc xoay</h3>
      {['X', 'Y', 'Z'].map((axis, i) => (
        <NumberField
          key={axis}
          label={axis}
          suffix="°"
          digits={1}
          value={(rotation[i] * 180) / Math.PI}
          onCommit={(value) => rotateObject(obj.id, setAxis(rotation, i, (value * Math.PI) / 180))}
        />
      ))}

      <h3>Vật liệu</h3>
      <MaterialSelect label="Vật liệu" value={obj.materialId} onChange={(id) => setObjectMaterial(obj.id, id)} />
      {isBoxLike(obj.geometry.shape) && (
        <details open={hasFaceOverrides}>
          <summary>Vật liệu từng mặt</summary>
          {BOX_FACES.map((face, i) => (
            <div key={face} className="face-row">
              <span className="face-name">{FACE_LABELS[face]}</span>
              <MaterialSelect
                label={`Mặt ${FACE_LABELS[face]}`}
                value={faceIds[i]}
                onChange={(id) => setFaceMaterial(obj.id, face, id)}
              />
            </div>
          ))}
          <button className="text-button" disabled={!hasFaceOverrides} onClick={() => setObjectMaterial(obj.id, obj.materialId)}>
            Đặt lại 6 mặt về vật liệu chung
          </button>
        </details>
      )}

      <h3>Sơn và độ trong suốt</h3>
      <div className="material-row">
        <span className="swatch" style={{ background: obj.paint?.color ?? 'transparent' }} />
        <span className="grow muted">
          {obj.paint ? `Sơn phủ ${Math.round(obj.paint.strength * 100)}%` : 'Chưa sơn — dùng công cụ Sơn'}
        </span>
        {obj.paint && (
          <button className="text-button" onClick={() => setPaint(obj.id, undefined)}>
            Gỡ
          </button>
        )}
      </div>
      <OpacitySlider key={obj.id} obj={obj} />

      <div className="actions">
        <button onClick={() => cameraCommands.emit({ type: 'focus' })} title="Đưa camera tới vật thể (F)">
          Lấy nét
        </button>
        <button onClick={duplicateSelection} title="Nhân bản (Ctrl+D)">
          Nhân bản
        </button>
        <button className="danger" onClick={() => deleteObjects([obj.id])} title="Xoá (Delete)">
          Xoá
        </button>
      </div>
    </aside>
  )
}

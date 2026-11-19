import { useEffect, useState } from 'react'
import { buildStairs, clusterPreset, MAX_STEPS, STAIR_DEFAULTS, type StairParams } from '../../game/building/clusters'
import { useTemplateStore } from '../../stores/templateStore'
import { getHousePlan, planMetrics } from '../../game/building/housePlans'
import { HouseIcon } from './HouseIcons'
import { NumField } from './PanelParts'
import doorIcon from '../../assets/icons/door.svg'
import openingIcon from '../../assets/icons/opening.svg'
import windowIcon from '../../assets/icons/window.svg'
import broadleafIcon from '../../assets/icons/tree-broadleaf.svg'
import palmIcon from '../../assets/icons/tree-palm.svg'
import pineIcon from '../../assets/icons/tree-pine.svg'

const TREE_ICONS = { broadleaf: broadleafIcon, pine: pineIcon, palm: palmIcon }
import { getMaterialDef, TEXTURES } from '../../data/materials'
import { MODELS } from '../../data/models'
import { modelThumbnail } from '../../game/building/modelThumbnails'
import { FIGURES } from '../../data/figures'
import { REFERENCES, referenceImage } from '../../data/references'
import { registerPreset, SHAPE_PRESETS, type ShapePreset } from '../../data/shapePresets'
import { getDimensions } from '../../game/geometry/GeometryFactory'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'

const GROUPS: ShapePreset['group'][] = ['Nhà mẫu', 'Hình cơ bản', 'Gỗ', 'Gạch', 'Cửa', 'Cây', 'Tham chiếu', 'Mô hình 3D', 'Mẫu của tôi']

/** A picture of an imported model, drawn from the model itself; a plain badge while it loads. */
function ModelThumbnail({ asset }: { asset: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const model = MODELS[asset]
    let alive = true
    if (model) modelThumbnail(model).then((picture) => alive && setUrl(picture), () => undefined)
    return () => {
      alive = false
    }
  }, [asset])
  return url ? <img className="thumb thumb-icon" src={url} alt="" /> : <span className="thumb thumb-model" />
}

function Thumbnail({ preset }: { preset: ShapePreset }) {
  const material = getMaterialDef(preset.materialId)
  const url = TEXTURES[material.textureId]?.url
  const shape = preset.geometry.shape
  if (preset.house) return <HouseIcon plan={preset.house} />
  if (preset.geometry.shape === 'model') return <ModelThumbnail asset={preset.geometry.asset} />
  if (preset.geometry.shape === 'door') return <img className="thumb thumb-icon" src={doorIcon} alt="" />
  if (preset.geometry.shape === 'window') return <img className="thumb thumb-icon" src={windowIcon} alt="" />
  if (preset.geometry.shape === 'opening') return <img className="thumb thumb-icon" src={openingIcon} alt="" />
  if (preset.geometry.shape === 'tree') {
    return <img className="thumb thumb-icon" src={TREE_ICONS[preset.geometry.kind]} alt="" />
  }
  if (preset.geometry.shape === 'figure') {
    return <span className="thumb thumb-card" style={{ backgroundImage: `url(${FIGURES[preset.geometry.kind].thumbnail})` }} />
  }
  if (preset.geometry.shape === 'card') {
    return <span className="thumb thumb-card" style={{ backgroundImage: `url(${referenceImage(REFERENCES[preset.geometry.asset])})` }} />
  }
  return (
    <span
      className={`thumb thumb-${shape}${preset.geometry.shape === 'prism' && preset.geometry.lean ? ` lean-${preset.geometry.lean}` : ''}`}
      style={{ backgroundColor: material.color, backgroundImage: url ? `url(${url})` : undefined }}
    />
  )
}

/** Parametric staircase: pick the steps, then place it like any other piece. */
function StairsForm() {
  const startPlacing = useEditorStore((s) => s.startPlacing)
  const [params, setParams] = useState<StairParams>(STAIR_DEFAULTS)
  const set = (change: Partial<StairParams>) => setParams((p) => ({ ...p, ...change }))
  const total = params.steps * params.rise
  return (
    <div className="stairs-form">
      <NumField label="Số bậc" digits={0} min={1} value={params.steps} onCommit={(v) => set({ steps: Math.min(MAX_STEPS, Math.round(v)) })} />
      <NumField label="Rộng" suffix="m" digits={2} min={0.2} value={params.width} onCommit={(v) => set({ width: v })} />
      <NumField label="Cao bậc" suffix="cm" digits={1} min={1} value={params.rise * 100} onCommit={(v) => set({ rise: v / 100 })} />
      <NumField label="Sâu bậc" suffix="cm" digits={1} min={5} value={params.run * 100} onCommit={(v) => set({ run: v / 100 })} />
      <button
        className="primary"
        onClick={() => {
          const stairs = buildStairs(params)
          registerPreset(clusterPreset({ ...stairs, name: `Cầu thang ${params.steps} bậc` }, 'Hình cơ bản'))
          startPlacing(`preset_cluster_${stairs.id}`)
        }}
      >
        Đặt (cao {total.toFixed(2)} m)
      </button>
    </div>
  )
}

/** Bottom shelf listing shapes to place. Picking one starts the place tool. */
export function ShapeShelf() {
  const open = useEditorStore((s) => s.shelfOpen)
  const placingPresetId = useEditorStore((s) => s.placingPresetId)
  const placeKeep = useEditorStore((s) => s.placeKeep)
  const startPlacing = useEditorStore((s) => s.startPlacing)
  const unit = useEditorStore((s) => s.unit)
  const editing = useEditorStore((s) => s.appMode === 'edit')
  const templates = useTemplateStore((s) => s.templates)
  const removeTemplate = useTemplateStore((s) => s.remove)
  const [tab, setTab] = useState<string>(GROUPS[0])

  if (!open || !editing) return null
  const groups = GROUPS.filter((group) => SHAPE_PRESETS.some((preset) => preset.group === group))
  const tabs = [...groups, 'Cầu thang', ...(templates.length > 0 ? ['Mẫu của tôi'] : [])]
  const current = tabs.includes(tab) ? tab : tabs[0]

  const itemProps = (id: string) => ({
    className: id === placingPresetId ? (placeKeep ? 'shelf-item active pinned' : 'shelf-item active') : 'shelf-item',
    onClick: () => startPlacing(id),
    onDoubleClick: () => startPlacing(id, true),
  })

  return (
    <section className="shelf panel" aria-label="Thư viện hình khối">
      <div className="shelf-tabs" role="tablist">
        {tabs.map((name) => (
          <button key={name} role="tab" aria-selected={name === current} className={name === current ? 'active' : ''} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>
      {current === 'Cầu thang' ? (
        <StairsForm />
      ) : current === 'Mẫu của tôi' ? (
        <div className="shelf-items">
          {templates.map((template) => (
            <button key={template.id} title={`${template.parts.length} vật thể`} {...itemProps(`preset_cluster_${template.id}`)}>
              <span className="thumb thumb-box" />
              <span>{template.name}</span>
              <span
                className="del"
                role="button"
                aria-label="Xoá mẫu"
                title="Xoá mẫu này"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTemplate(template.id)
                }}
              >
                x
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="shelf-items">
          {SHAPE_PRESETS.filter((preset) => preset.group === current).map((preset) => {
            const size = getDimensions(preset.geometry)
            const plan = preset.house ? getHousePlan(preset.house) : undefined
            const m = plan ? planMetrics(plan) : null
            const props = itemProps(preset.id)
            return (
              <button
                key={preset.id}
                title={
                  m
                    ? `Nhà ${formatLength(m.width, unit)} × ${formatLength(m.depth, unit)}, cao ${formatLength(m.height, unit)}, ${m.storeys} tầng. Cả khu đất ${formatLength(m.plot[0], unit)} × ${formatLength(m.plot[1], unit)}`
                    : `${formatLength(size.width, unit)} × ${formatLength(size.height, unit)} × ${formatLength(size.depth, unit)}`
                }
                {...props}
                className={m ? `${props.className} house-item` : props.className}
              >
                <Thumbnail preset={preset} />
                <span>{preset.name}</span>
                {m && (
                  <small>
                    {formatLength(m.width, unit)} × {formatLength(m.depth, unit)}
                    <br />
                    {m.storeys} tầng, cao {formatLength(m.height, unit)}
                  </small>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

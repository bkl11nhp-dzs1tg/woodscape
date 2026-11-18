import { useEffect, useState } from 'react'
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
import { SHAPE_PRESETS, type ShapePreset } from '../../data/shapePresets'
import { getDimensions } from '../../game/geometry/GeometryFactory'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'

const GROUPS: ShapePreset['group'][] = ['Hình cơ bản', 'Gỗ', 'Gạch', 'Cửa', 'Cây', 'Tham chiếu', 'Mô hình 3D']

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
      className={`thumb thumb-${shape}`}
      style={{ backgroundColor: material.color, backgroundImage: url ? `url(${url})` : undefined }}
    />
  )
}

/** Bottom shelf listing shapes to place. Picking one starts the place tool. */
export function ShapeShelf() {
  const open = useEditorStore((s) => s.shelfOpen)
  const placingPresetId = useEditorStore((s) => s.placingPresetId)
  const startPlacing = useEditorStore((s) => s.startPlacing)
  const unit = useEditorStore((s) => s.unit)

  const editing = useEditorStore((s) => s.appMode === 'edit')

  if (!open || !editing) return null
  return (
    <section className="shelf panel" aria-label="Thư viện hình khối">
      {GROUPS.filter((group) => SHAPE_PRESETS.some((preset) => preset.group === group)).map((group) => (
        <div key={group} className="shelf-group">
          <h3>{group}</h3>
          <div className="shelf-items">
            {SHAPE_PRESETS.filter((preset) => preset.group === group).map((preset) => {
              const size = getDimensions(preset.geometry)
              return (
                <button
                  key={preset.id}
                  className={preset.id === placingPresetId ? 'shelf-item active' : 'shelf-item'}
                  title={`${formatLength(size.width, unit)} × ${formatLength(size.height, unit)} × ${formatLength(size.depth, unit)}`}
                  onClick={() => startPlacing(preset.id)}
                >
                  <Thumbnail preset={preset} />
                  <span>{preset.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}

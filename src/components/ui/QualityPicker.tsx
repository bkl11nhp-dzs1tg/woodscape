import { QUALITY, QUALITY_ORDER, type QualityChoice } from '../../game/core/quality'
import { useEditorStore } from '../../stores/editorStore'

/** Graphics quality choice, shared by the home page and Settings. */
export function QualityPicker({ compact = false }: { compact?: boolean }) {
  const choice = useEditorStore((s) => s.qualityChoice)
  const level = useEditorStore((s) => s.qualityLevel)
  const setQuality = useEditorStore((s) => s.setQuality)
  return (
    <>
      <label className={compact ? 'row' : 'quality-row'}>
        <span>Chất lượng đồ họa</span>
        <select aria-label="Chất lượng đồ họa" value={choice} onChange={(e) => setQuality(e.target.value as QualityChoice)}>
          <option value="auto">Tự động</option>
          {QUALITY_ORDER.map((id) => (
            <option key={id} value={id}>
              {QUALITY[id].label}
            </option>
          ))}
        </select>
      </label>
      <p className="muted quality-note">
        {choice === 'auto'
          ? `Máy tự chọn, hiện dùng mức "${QUALITY[level].label}" và tự giảm nếu thấy chậm.`
          : level === 'minimum' || level === 'low'
            ? 'Bỏ bóng đổ, nét viền, bớt cỏ và cây để máy yếu chạy mượt. Áp dụng khi vào lại thế giới.'
            : 'Áp dụng khi vào lại thế giới.'}
      </p>
    </>
  )
}

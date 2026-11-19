import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { FrameJudge, lowerLevel, QUALITY } from './quality'

/**
 * In "auto" the game times its own frames. If they stay slow it steps the graphics down one level and tells
 * the player; it never steps back up by itself, so it cannot flicker between levels.
 */
export function QualityMonitor() {
  const judge = useRef(new FrameJudge())
  const level = useEditorStore((s) => s.qualityLevel)
  useEffect(() => judge.current.reset(), [level])

  useFrame((_, delta) => {
    const editor = useEditorStore.getState()
    if (editor.qualityChoice !== 'auto' || editor.qualityLevel === 'minimum') return
    if (!judge.current.tick(delta)) return
    const next = lowerLevel(editor.qualityLevel)
    editor.dropQuality(next)
    showToast(`Máy hơi chậm nên đã giảm đồ họa xuống "${QUALITY[next].label}". Đổi lại trong Cài đặt.`)
  })
  return null
}

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { nextWeather } from './weather'

/** How long a spell of weather lasts before the sky starts drifting to the next one, in seconds. */
const SPELL_MIN = 180
const SPELL_MAX = 300

/**
 * The weather belongs to the world, not to the player: it changes by itself at random and there is no
 * control for it. The look of each change is eased by the atmosphere, so skies drift instead of cutting.
 */
export function WeatherDirector() {
  const left = useRef(SPELL_MIN + Math.random() * (SPELL_MAX - SPELL_MIN))
  useFrame((_, delta) => {
    left.current -= Math.min(delta, 0.1)
    if (left.current > 0) return
    left.current = SPELL_MIN + Math.random() * (SPELL_MAX - SPELL_MIN)
    const editor = useEditorStore.getState()
    editor.setWeather(nextWeather(editor.weather))
  })
  return null
}

import { useEffect, useState, type ReactNode } from 'react'
import { atmosphere } from '../../game/environment/atmosphere'
import { TIME_ORDER, TIME_PRESETS, type TimeOfDay } from '../../game/environment/timeOfDay'
import { WEATHER } from '../../game/environment/weather'
import { useEditorStore, type Weather } from '../../stores/editorStore'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke}>
      {children}
    </svg>
  )
}

const rays = (cx: number, cy: number, from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const a = ((Math.PI * 2) / count) * i
    return <path key={i} d={`M${cx + Math.cos(a) * from} ${cy + Math.sin(a) * from}L${cx + Math.cos(a) * to} ${cy + Math.sin(a) * to}`} />
  })

const CLOUD = 'M7 14h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 5.3 4.4 4.4 0 0 0 7 14Z'

const WEATHER_ICONS: Record<Weather, ReactNode> = {
  clear: (
    <Icon>
      <circle cx="12" cy="12" r="3.8" />
      {rays(12, 12, 6.6, 8.8, 8)}
    </Icon>
  ),
  cloudy: (
    <Icon>
      <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.3 4.4 4.4 0 0 0 7 18Z" />
    </Icon>
  ),
  rain: (
    <Icon>
      <path d={`${CLOUD}M8.5 17l-1 2.5M12.5 17l-1 2.5M16.5 17l-1 2.5`} />
    </Icon>
  ),
  fog: (
    <Icon>
      <path d={`M7 12h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 3.3 4.4 4.4 0 0 0 7 12ZM4 16h16M6 20h12`} />
    </Icon>
  ),
  snow: (
    <Icon>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />
    </Icon>
  ),
}

/** Temperature of the air now; it glides with the weather, so it is read a few times a second. */
function useTemperature(): number {
  const [degrees, setDegrees] = useState(Math.round(atmosphere.temperature))
  useEffect(() => {
    const timer = window.setInterval(() => setDegrees(Math.round(atmosphere.temperature)), 400)
    return () => window.clearInterval(timer)
  }, [])
  return degrees
}

/** Time of day to choose, and the weather as an icon with the temperature (the world sets it, nobody edits it). */
export function SkyHud() {
  const timeOfDay = useEditorStore((s) => s.timeOfDay)
  const setTimeOfDay = useEditorStore((s) => s.setTimeOfDay)
  const weather = useEditorStore((s) => s.weather)
  const degrees = useTemperature()
  return (
    <div className="sky-hud">
      <select aria-label="Thời gian trong ngày" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
        {TIME_ORDER.map((time) => (
          <option key={time} value={time}>
            {TIME_PRESETS[time].label}
          </option>
        ))}
      </select>
      <div className="weather-chip" key={weather} title={WEATHER[weather].label} aria-label={`${WEATHER[weather].label}, ${degrees} độ C`}>
        {WEATHER_ICONS[weather]}
        <span>{degrees}°C</span>
      </div>
    </div>
  )
}

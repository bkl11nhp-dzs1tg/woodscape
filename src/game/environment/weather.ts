import type { Weather } from '../../stores/editorStore'

export interface WeatherLook {
  label: string
  /** Multipliers on the time-of-day light. */
  sun: number
  ambient: number
  /** How far the sky and clouds shift toward `tint`. */
  overcast: number
  tint: string
  cloudCount: number
  fogNear: number
  fogFar: number
  rain: boolean
  snow: boolean
  /** Degrees Celsius added to the temperature of the hour. */
  chill: number
}

export const WEATHER_ORDER: readonly Weather[] = ['clear', 'cloudy', 'rain', 'fog', 'snow']

export const WEATHER: Record<Weather, WeatherLook> = {
  clear: { label: 'Trời quang', sun: 1, ambient: 1, overcast: 0, tint: '#ffffff', cloudCount: 16, fogNear: 90, fogFar: 1500, rain: false, snow: false, chill: 0 },
  cloudy: { label: 'Nhiều mây', sun: 0.55, ambient: 1.08, overcast: 0.55, tint: '#aeb8c2', cloudCount: 44, fogNear: 180, fogFar: 1400, rain: false, snow: false, chill: -3 },
  rain: { label: 'Mưa', sun: 0.28, ambient: 0.95, overcast: 0.8, tint: '#8793a0', cloudCount: 52, fogNear: 50, fogFar: 650, rain: true, snow: false, chill: -6 },
  fog: { label: 'Sương mù', sun: 0.55, ambient: 1.05, overcast: 0.7, tint: '#d3dadd', cloudCount: 10, fogNear: 6, fogFar: 150, rain: false, snow: false, chill: -4 },
  snow: { label: 'Tuyết rơi', sun: 0.5, ambient: 1.12, overcast: 0.65, tint: '#dfe6ee', cloudCount: 50, fogNear: 25, fogFar: 420, rain: false, snow: true, chill: -28 },
}

/** Air temperature at each hour of a clear day, degrees Celsius. */
export const BASE_TEMPERATURE: Record<string, number> = { dawn: 17, morning: 23, noon: 29, sunset: 24, night: 15 }

/** What the sky tends to do next, as weights. Weather drifts instead of jumping anywhere. */
const NEXT: Record<Weather, Partial<Record<Weather, number>>> = {
  clear: { clear: 2, cloudy: 5, fog: 1 },
  cloudy: { clear: 4, cloudy: 1, rain: 3, fog: 1, snow: 1 },
  rain: { cloudy: 5, rain: 1, clear: 1 },
  fog: { clear: 4, cloudy: 3, snow: 1 },
  snow: { cloudy: 5, snow: 1, clear: 2 },
}

/** The weather that follows `current`, picked at random by the weights above. */
export function nextWeather(current: Weather, random: () => number = Math.random): Weather {
  const choices = Object.entries(NEXT[current]) as [Weather, number][]
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [weather, weight] of choices) {
    roll -= weight
    if (roll < 0) return weather
  }
  return choices[0][0]
}

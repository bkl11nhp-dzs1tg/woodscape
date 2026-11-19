import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../stores/editorStore'
import { atmosphere, lookFor, resetAtmosphere, TIME_FADE, updateAtmosphere } from './atmosphere'
import { nextWeather } from './weather'

beforeEach(() => {
  useEditorStore.setState({ timeOfDay: 'noon', weather: 'clear' })
  resetAtmosphere()
  updateAtmosphere(0)
})

describe('atmosphere', () => {
  it('starts exactly on the look of the current time and weather', () => {
    const noon = lookFor('noon', 'clear')
    expect(atmosphere.sunIntensity).toBeCloseTo(noon.sunIntensity)
    expect(atmosphere.skyTop.getHex()).toBe(noon.skyTop.getHex())
    expect(atmosphere.moving).toBe(false)
  })

  it('glides to a new hour instead of jumping, and lands on it', () => {
    const noon = lookFor('noon', 'clear')
    const night = lookFor('night', 'clear')
    useEditorStore.setState({ timeOfDay: 'night' })
    updateAtmosphere(TIME_FADE / 2)
    expect(atmosphere.moving).toBe(true)
    expect(atmosphere.sunIntensity).toBeLessThan(noon.sunIntensity)
    expect(atmosphere.sunIntensity).toBeGreaterThan(night.sunIntensity)
    for (let i = 0; i < 80; i++) updateAtmosphere(0.1)
    expect(atmosphere.moving).toBe(false)
    expect(atmosphere.sunIntensity).toBeCloseTo(night.sunIntensity, 3)
    expect(atmosphere.sunDirection.length()).toBeCloseTo(1, 3)
  })

  it('fades rain in slowly when the weather turns', () => {
    useEditorStore.setState({ weather: 'rain' })
    updateAtmosphere(1)
    expect(atmosphere.rain).toBeGreaterThan(0)
    expect(atmosphere.rain).toBeLessThan(0.5)
    for (let i = 0; i < 200; i++) updateAtmosphere(0.1)
    expect(atmosphere.rain).toBeCloseTo(1, 3)
  })
})

describe('nextWeather', () => {
  it('only picks weather that can follow the current one', () => {
    for (let i = 0; i < 200; i++) expect(['clear', 'cloudy', 'fog']).toContain(nextWeather('clear'))
    expect(nextWeather('rain', () => 0.99)).toBe('clear')
  })
})

describe('snow and temperature', () => {
  it('turns cold and white when it snows, gliding there', () => {
    const warm = atmosphere.temperature
    useEditorStore.setState({ weather: 'snow' })
    updateAtmosphere(2)
    expect(atmosphere.snow).toBeGreaterThan(0)
    expect(atmosphere.temperature).toBeLessThan(warm)
    for (let i = 0; i < 200; i++) updateAtmosphere(0.1)
    expect(atmosphere.snow).toBeCloseTo(1, 3)
    expect(atmosphere.temperature).toBeLessThan(5)
  })
})

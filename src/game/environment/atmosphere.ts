import * as THREE from 'three'
import { useEditorStore, type Weather } from '../../stores/editorStore'
import { sunDirection, TIME_PRESETS, type TimeOfDay } from './timeOfDay'
import { BASE_TEMPERATURE, WEATHER } from './weather'

/**
 * The look of the sky right now: the time of day and the weather blended into one set of numbers.
 * When either changes the blend glides from the old look to the new one (a slow swing of the sun and
 * light for a new hour, a gentler drift for weather) instead of cutting. Lights, sky, fog, clouds and
 * rain all read from `atmosphere` every frame.
 */
export interface Atmosphere {
  sunColor: THREE.Color
  sunIntensity: number
  sunDirection: THREE.Vector3
  hemiSky: THREE.Color
  hemiGround: THREE.Color
  hemiIntensity: number
  skyTop: THREE.Color
  skyHorizon: THREE.Color
  fog: THREE.Color
  cloud: THREE.Color
  fogNear: number
  fogFar: number
  /** How many clouds are in the sky (fractional: the last one is part faded). */
  clouds: number
  /** 0..1 */
  rain: number
  /** 0..1 */
  snow: number
  /** Degrees Celsius. */
  temperature: number
}

function blank(): Atmosphere {
  return {
    sunColor: new THREE.Color(),
    sunIntensity: 0,
    sunDirection: new THREE.Vector3(0, 1, 0),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiIntensity: 0,
    skyTop: new THREE.Color(),
    skyHorizon: new THREE.Color(),
    fog: new THREE.Color(),
    cloud: new THREE.Color(),
    fogNear: 0,
    fogFar: 0,
    clouds: 0,
    rain: 0,
    snow: 0,
    temperature: 20,
  }
}

function mix(from: string, to: string, amount: number): THREE.Color {
  return new THREE.Color(from).lerp(new THREE.Color(to), amount)
}

export function lookFor(time: TimeOfDay, weatherId: Weather, out: Atmosphere = blank()): Atmosphere {
  const preset = TIME_PRESETS[time]
  const weather = WEATHER[weatherId]
  out.sunColor.set(preset.sunColor)
  out.sunIntensity = preset.sunIntensity * weather.sun
  out.sunDirection.set(...sunDirection(preset))
  out.hemiSky.set(preset.hemiSky)
  out.hemiGround.set(preset.hemiGround)
  out.hemiIntensity = preset.hemiIntensity * weather.ambient
  out.skyTop.copy(mix(preset.skyTop, weather.tint, weather.overcast * 0.85))
  out.skyHorizon.copy(mix(preset.skyHorizon, weather.tint, weather.overcast))
  out.fog.copy(mix(preset.fog, weather.tint, weather.overcast))
  out.cloud.copy(mix(preset.cloud, weather.tint, weather.overcast * 0.8)).multiplyScalar(1 - weather.overcast * 0.25)
  out.fogNear = weather.fogNear
  out.fogFar = weather.fogFar
  out.clouds = weather.cloudCount
  out.rain = weather.rain ? 1 : 0
  out.snow = weather.snow ? 1 : 0
  out.temperature = (BASE_TEMPERATURE[time] ?? 20) + weather.chill
  return out
}

function blend(a: Atmosphere, b: Atmosphere, k: number, out: Atmosphere): void {
  out.sunColor.copy(a.sunColor).lerp(b.sunColor, k)
  out.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, k)
  out.sunDirection.copy(a.sunDirection).lerp(b.sunDirection, k).normalize()
  out.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, k)
  out.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, k)
  out.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, k)
  out.skyTop.copy(a.skyTop).lerp(b.skyTop, k)
  out.skyHorizon.copy(a.skyHorizon).lerp(b.skyHorizon, k)
  out.fog.copy(a.fog).lerp(b.fog, k)
  out.cloud.copy(a.cloud).lerp(b.cloud, k)
  out.fogNear = THREE.MathUtils.lerp(a.fogNear, b.fogNear, k)
  out.fogFar = THREE.MathUtils.lerp(a.fogFar, b.fogFar, k)
  out.clouds = THREE.MathUtils.lerp(a.clouds, b.clouds, k)
  out.rain = THREE.MathUtils.lerp(a.rain, b.rain, k)
  out.snow = THREE.MathUtils.lerp(a.snow, b.snow, k)
  out.temperature = THREE.MathUtils.lerp(a.temperature, b.temperature, k)
}

function copy(from: Atmosphere, to: Atmosphere): void {
  blend(from, from, 0, to)
}

/** Seconds a new hour takes to settle, and a new kind of weather. */
export const TIME_FADE = 3.4
export const WEATHER_FADE = 9

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** The blended look that the scene reads. Mutated in place every frame. */
export const atmosphere: Atmosphere & { version: number; moving: boolean } = Object.assign(blank(), { version: 0, moving: false })

const from = blank()
const to = blank()
let progress = 1
let duration = 1
let key = ''

/** Advances the glide by `delta` seconds, starting a new one when the time of day or weather changed. */
export function updateAtmosphere(delta: number): void {
  const { timeOfDay, weather } = useEditorStore.getState()
  const next = `${timeOfDay}|${weather}`
  if (next !== key) {
    const [oldTime] = key.split('|')
    if (key === '') {
      lookFor(timeOfDay, weather, to)
      copy(to, atmosphere)
      progress = 1
    } else {
      copy(atmosphere, from)
      lookFor(timeOfDay, weather, to)
      progress = 0
      duration = oldTime !== timeOfDay ? TIME_FADE : WEATHER_FADE
    }
    key = next
    atmosphere.version++
  }
  atmosphere.moving = progress < 1
  if (progress >= 1) return
  // Real elapsed time (capped only so a hidden tab does not jump): the glide must last as long on a slow machine as on a fast one.
  progress = Math.min(1, progress + Math.min(delta, 0.5) / duration)
  blend(from, to, smoother(progress), atmosphere)
  atmosphere.version++
}

/** Test hook: forget the current look so the next update starts from the stores. */
export function resetAtmosphere(): void {
  key = ''
  progress = 1
}

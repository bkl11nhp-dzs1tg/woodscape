export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'sunset' | 'night'

export interface TimePreset {
  label: string
  /** Sun (or moon) direction: azimuth from +X toward +Z, elevation above horizon; degrees. */
  azimuth: number
  elevation: number
  sunColor: string
  sunIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  skyTop: string
  skyHorizon: string
  fog: string
  cloud: string
}

export const TIME_ORDER: readonly TimeOfDay[] = ['dawn', 'morning', 'noon', 'sunset', 'night']

export const TIME_PRESETS: Record<TimeOfDay, TimePreset> = {
  dawn: {
    label: 'Bình minh', azimuth: 15, elevation: 9,
    sunColor: '#ffc9a0', sunIntensity: 1.8,
    hemiSky: '#cfd8f0', hemiGround: '#6a6f58', hemiIntensity: 0.68,
    skyTop: '#6f9ed8', skyHorizon: '#ffd9b8', fog: '#f3d6c0', cloud: '#ffe6d6',
  },
  morning: {
    label: 'Buổi sáng', azimuth: 50, elevation: 38,
    sunColor: '#fff1d6', sunIntensity: 2.6,
    hemiSky: '#d2e4ff', hemiGround: '#64805a', hemiIntensity: 0.8,
    skyTop: '#3f8fe0', skyHorizon: '#cfe9fa', fog: '#cfe6f5', cloud: '#ffffff',
  },
  noon: {
    label: 'Buổi trưa', azimuth: 80, elevation: 68,
    sunColor: '#fffaf0', sunIntensity: 2.8,
    hemiSky: '#d2e4ff', hemiGround: '#6a8660', hemiIntensity: 0.84,
    skyTop: '#2f7fdc', skyHorizon: '#c4e4fb', fog: '#c9e3f6', cloud: '#ffffff',
  },
  sunset: {
    label: 'Hoàng hôn', azimuth: 170, elevation: 8,
    sunColor: '#ffb070', sunIntensity: 2.0,
    hemiSky: '#e0c0d4', hemiGround: '#6a5c52', hemiIntensity: 0.64,
    skyTop: '#5a78c0', skyHorizon: '#ffb98a', fog: '#f0bfa0', cloud: '#ffd0b0',
  },
  night: {
    label: 'Ban đêm', azimuth: 220, elevation: 45,
    sunColor: '#9fb8ff', sunIntensity: 0.55,
    hemiSky: '#5a6ea8', hemiGround: '#28304a', hemiIntensity: 0.5,
    skyTop: '#0d1a3a', skyHorizon: '#2a3f6e', fog: '#22335a', cloud: '#5a6c98',
  },
}

/** Unit vector pointing from the scene toward the sun. */
export function sunDirection(preset: TimePreset): [number, number, number] {
  const az = (preset.azimuth * Math.PI) / 180
  const el = (preset.elevation * Math.PI) / 180
  return [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)]
}

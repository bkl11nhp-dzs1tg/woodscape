import type { ReactNode } from 'react'

/** Small painted pictures of the ready-made houses for the shelf, one per plan, in the game's cream / orange / blue palette. */

const INK = '#3d2f22'
const ROOF = '#e3702f'
const ROOF_LIGHT = '#f59a55'
const GLASS = '#9fd0ea'
const DOOR = '#a0522d'

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="house-icon" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="hi-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ROOF_LIGHT} />
          <stop offset="1" stopColor={ROOF} />
        </linearGradient>
        <linearGradient id="hi-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f0c27a" />
          <stop offset="1" stopColor="#d99a55" />
        </linearGradient>
        <linearGradient id="hi-brick" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cf6a4c" />
          <stop offset="1" stopColor="#b2503a" />
        </linearGradient>
        <linearGradient id="hi-white" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f4efe4" />
          <stop offset="1" stopColor="#d9d2c2" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="57" rx="25" ry="4" fill="rgba(0,0,0,0.28)" />
      {children}
    </svg>
  )
}

const line = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

function Window({ x, y, w = 7, h = 7 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={GLASS} stroke="#fff" strokeWidth="1.4" />
      <path d={`M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}`} stroke="#fff" strokeWidth="0.9" />
    </g>
  )
}

function Door({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="8" height="12" rx="1" fill={DOOR} stroke={INK} strokeWidth="1.2" />
      <circle cx={x + 6.2} cy={y + 6.5} r="0.8" fill="#f1d9a0" />
    </g>
  )
}

const ICONS: Record<string, () => ReactNode> = {
  house_cabin: () => (
    <>
      <rect x="9" y="29" width="46" height="26" fill="url(#hi-wood)" {...line} />
      <path d="M9 36h46M9 43h46M9 50h46" stroke="rgba(120,70,30,0.35)" strokeWidth="1" />
      <path d="M4 30 32 9l28 21Z" fill="url(#hi-roof)" {...line} />
      <path d="M14 27 32 13.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="44" y="11" width="6" height="11" fill="#9b7b63" {...line} />
      <Window x={14} y={36} />
      <Door x={28} y={43} />
      <Window x={42} y={36} />
    </>
  ),
  house_brick_l: () => (
    <>
      <rect x="6" y="30" width="30" height="25" fill="url(#hi-brick)" {...line} />
      <rect x="36" y="38" width="22" height="17" fill="url(#hi-brick)" {...line} />
      <path d="M6 38h52M6 46h52M6 31h30" stroke="rgba(255,225,200,0.25)" strokeWidth="1" />
      <path d="M2 31 10 14h22l8 17Z" fill="url(#hi-roof)" {...line} />
      <path d="M33 39 38 29h22l-2 10Z" fill="url(#hi-roof)" {...line} />
      <Window x={11} y={36} />
      <Window x={25} y={36} />
      <Door x={42} y={43} />
      <Window x={51} y={43} w={5} h={6} />
    </>
  ),
  house_garden: () => (
    <>
      <rect x="10" y="24" width="44" height="31" fill="url(#hi-white)" {...line} />
      <rect x="7" y="20" width="50" height="6" fill="#bdb6a6" {...line} />
      <Window x={15} y={31} w={9} h={9} />
      <Window x={40} y={31} w={9} h={9} />
      <Door x={28} y={43} />
      <path d="M3 55V47M9 55V47M15 55V47M49 55V47M55 55V47M61 55V47M3 49h13M48 49h13" stroke="#b8864c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="16" r="6.5" fill="#6faf4f" {...line} />
      <path d="M56 22v9" stroke="#7a5a3a" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  house_pavilion: () => (
    <>
      <path d="M13 31v23M51 31v23" stroke="#a8743c" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M13 31v23M51 31v23" stroke="#d9a263" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="10" y="53" width="44" height="3.5" rx="1" fill="#cfc5b3" {...line} />
      <path d="M3 32 32 8l29 24Z" fill="url(#hi-roof)" {...line} />
      <path d="M32 8V32M17 32 32 8M47 32 32 8" stroke="rgba(120,50,10,0.35)" strokeWidth="1" />
      <path d="M17 26 30 13" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 52v-9h20v9" fill="#8a5f38" stroke={INK} strokeWidth="1.2" />
    </>
  ),
  house_townhouse: () => (
    <>
      <rect x="14" y="22" width="36" height="34" fill="url(#hi-brick)" {...line} />
      <path d="M14 38.5h36" stroke="#e9d9bd" strokeWidth="2" />
      <path d="M10 23 32 6l22 17Z" fill="url(#hi-roof)" {...line} />
      <path d="M18 21 31 11" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
      <Window x={18} y={27} w={7} h={8} />
      <Window x={39} y={27} w={7} h={8} />
      <Window x={18} y={43} w={7} h={8} />
      <Door x={36} y={44} />
      <rect x="15" y="50" width="20" height="1.4" fill="#e9d9bd" />
    </>
  ),
  house_villa: () => (
    <>
      <rect x="6" y="30" width="22" height="25" fill="url(#hi-white)" {...line} />
      <rect x="28" y="12" width="26" height="43" fill="url(#hi-white)" {...line} />
      <rect x="4" y="28" width="26" height="3" fill="#bdb6a6" {...line} />
      <path d="M26 13 41 2l15 11Z" fill="#59606b" {...line} />
      <path d="M31 11 41 4.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 27h18M10 27v-4M24 27v-4" stroke="#8a5f38" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 23h18" stroke="#8a5f38" strokeWidth="1.6" />
      <Window x={10} y={36} w={6} h={8} />
      <Window x={19} y={36} w={6} h={8} />
      <rect x="31" y="26" width="20" height="2.4" fill="#bdb6a6" {...line} />
      <path d="M32 26v-3h18v3M36 23v3M41 23v3M46 23v3" stroke="#6d6a66" strokeWidth="1" />
      <Window x={36} y={15} w={10} h={7} />
      <Window x={35} y={31} w={12} h={9} />
      <path d="M31 41h20" stroke="#bdb6a6" strokeWidth="2.4" />
      <path d="M33 41v-2M38 41v-2M43 41v-2M48 41v-2" stroke="#6d6a66" strokeWidth="1" />
      <path d="M34 55V45a7 7 0 0 1 14 0v10Z" fill="#34353b" stroke="#fff" strokeWidth="1.6" />
      <path d="M41 40v15" stroke="#fff" strokeWidth="0.9" />
      <path d="M2 55V47M62 55V47" stroke="#cfc5b3" strokeWidth="3" strokeLinecap="round" />
      <path d="M2 49h15M47 49h15" stroke="#4e8f46" strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  house_tube: () => (
    <>
      <rect x="20" y="8" width="24" height="48" fill="url(#hi-white)" {...line} />
      <rect x="17" y="6" width="30" height="4" fill="#bdb6a6" {...line} />
      <path d="M17 24h30M17 40h30" stroke="#bdb6a6" strokeWidth="2.2" />
      <Window x={25} y={12} w={14} h={9} />
      <path d="M22 27h20M22 24v6M42 24v6M27 24v6M32 24v6M37 24v6" stroke="#6d6a66" strokeWidth="1" />
      <Window x={25} y={29} w={14} h={9} />
      <Window x={25} y={43} w={6} h={8} />
      <Door x={34} y={44} />
    </>
  ),
  house_thai: () => (
    <>
      <rect x="9" y="30" width="46" height="25" fill="url(#hi-wood)" {...line} />
      <path d="M9 38h46M9 46h46" stroke="rgba(120,70,30,0.35)" strokeWidth="1" />
      <path d="M2 31 16 12h32l14 19Z" fill="url(#hi-roof)" {...line} />
      <path d="M16 12 24 31M48 12 40 31M32 12v19" stroke="rgba(120,50,10,0.3)" strokeWidth="1" />
      <path d="M12 28 22 15" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
      <Window x={14} y={37} w={8} h={8} />
      <Door x={28} y={43} />
      <Window x={42} y={37} w={8} h={8} />
    </>
  ),
}

export function HouseIcon({ plan }: { plan: string }) {
  const draw = ICONS[plan]
  return <Frame>{draw ? draw() : null}</Frame>
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Glyph } from '../ui/Icons'
import { withBase } from '../../services/assetUrl'

/** The same view of the valley at four times of day, one after another. */
const SHOTS = [
  { id: 'dawn', icon: 'sunrise', label: 'Bình minh' },
  { id: 'noon', icon: 'sun', label: 'Buổi trưa' },
  { id: 'sunset', icon: 'sunset', label: 'Hoàng hôn' },
  { id: 'night', icon: 'moon', label: 'Ban đêm' },
] as const

const CYCLE_MS = 20000
/** Width of a picture compared to its height. */
const ASPECT = 2400 / 975
const INTERACTIVE = 'button, input, label, select, a, textarea, .home-sub'

interface Ripple {
  id: number
  x: number
  y: number
}

/**
 * The picture behind the home page: it changes with the time of day every 20 seconds (fading from one to the
 * next), glides a little as the pointer moves, can be dragged sideways to look around (it keeps gliding after
 * you let go), and a tap or click lights up a ring where you touched.
 */
export function HomeBackdrop() {
  const [index, setIndex] = useState(2)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const pan = useRef<HTMLDivElement>(null)
  const state = useRef({ current: 0, target: 0, velocity: 0, dragging: false, lastX: 0, startX: 0, startY: 0, moved: false, bump: 0 })
  const nextId = useRef(1)

  // Next time of day every 20 seconds; choosing one by hand restarts the count.
  useEffect(() => {
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % SHOTS.length), CYCLE_MS)
    return () => window.clearTimeout(timer)
  }, [index])

  const limit = () => Math.max(0, (Math.max(window.innerWidth, window.innerHeight * ASPECT) - window.innerWidth) / 2)

  // One animation loop moves the picture; nothing re-renders for it.
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = state.current
      const max = limit()
      if (!s.dragging) {
        s.target += s.velocity * dt
        s.velocity *= Math.exp(-dt * 3.2)
        if (Math.abs(s.velocity) < 4) s.velocity = 0
      }
      s.target = Math.max(-max, Math.min(max, s.target))
      s.current += (s.target - s.current) * (1 - Math.exp(-dt * 8))
      s.bump *= Math.exp(-dt * 6)
      if (pan.current) pan.current.style.transform = `translate3d(${s.current.toFixed(1)}px, 0, 0) scale(${(1 + s.bump * 0.03).toFixed(4)})`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const addRipple = useCallback((x: number, y: number) => {
    const id = nextId.current++
    setRipples((list) => [...list.slice(-4), { id, x, y }])
    window.setTimeout(() => setRipples((list) => list.filter((r) => r.id !== id)), 1000)
  }, [])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target instanceof Element && e.target.closest(INTERACTIVE))) return
      const s = state.current
      s.dragging = true
      s.moved = false
      s.lastX = s.startX = e.clientX
      s.startY = e.clientY
      s.velocity = 0
    }
    const onMove = (e: PointerEvent) => {
      const s = state.current
      if (s.dragging) {
        const dx = e.clientX - s.lastX
        s.lastX = e.clientX
        if (Math.hypot(e.clientX - s.startX, e.clientY - s.startY) > 6) s.moved = true
        s.target += dx
        s.velocity = dx * 60
        return
      }
      // With a mouse the picture follows the pointer a little, like looking round the room.
      if (e.pointerType === 'mouse') s.target = -((e.clientX / window.innerWidth) * 2 - 1) * limit() * 0.55
    }
    const onUp = (e: PointerEvent) => {
      const s = state.current
      if (!s.dragging) return
      s.dragging = false
      if (!s.moved) {
        addRipple(e.clientX, e.clientY)
        s.bump = 1
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [addRipple])

  return (
    <>
      <div className="home-backdrop" aria-hidden="true">
        <div className="home-pan" ref={pan}>
          {SHOTS.map((shot, i) => (
            <img key={shot.id} className={i === index ? 'on' : ''} src={withBase(`/assets/home/hero-${shot.id}.jpg`)} alt="" draggable={false} />
          ))}
        </div>
      </div>
      {ripples.map((r) => (
        <span key={r.id} className="home-ripple" style={{ left: r.x, top: r.y }}>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      ))}
      <div className="home-times" role="group" aria-label="Thời điểm trong ngày">
        {SHOTS.map((shot, i) => (
          <button key={shot.id} className={i === index ? 'on' : ''} onClick={() => setIndex(i)} title={shot.label}>
            <Glyph name={shot.icon} size={16} />
            <span>{shot.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

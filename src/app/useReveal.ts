import { useEffect, useRef, useState } from 'react'

/**
 * Help text that stays out of the way: it shows for a few seconds whenever `trigger` changes (a new mode or
 * tool), and again while the pointer is near it. `near` says where, in screen pixels.
 */
export function useReveal(trigger: unknown, near: (x: number, y: number, width: number, height: number) => boolean, seconds = 6): boolean {
  const [visible, setVisible] = useState(true)
  const timer = useRef<number | undefined>(undefined)
  const nearRef = useRef(near)
  nearRef.current = near

  const hideLater = (delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setVisible(false), delay)
  }

  useEffect(() => {
    setVisible(true)
    hideLater(seconds * 1000)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, seconds])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (nearRef.current(e.clientX, e.clientY, window.innerWidth, window.innerHeight)) {
        setVisible(true)
        hideLater(1800)
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return visible
}

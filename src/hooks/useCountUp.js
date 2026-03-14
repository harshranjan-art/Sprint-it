import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    const start = prevTarget.current
    const diff = target - start
    if (diff === 0) return

    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(start + diff * eased))

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        prevTarget.current = target
      }
    }

    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}

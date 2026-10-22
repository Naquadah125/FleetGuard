import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ, REVEAL_START, revealTrigger } from '@/lib/motion/presets'

/**
 * Scroll reveal wrapper: direct children carrying `data-reveal` fade + rise in (staggered)
 * once the wrapper reaches REVEAL_START. Children without `data-reveal` are left alone.
 * Static (fully visible) under prefers-reduced-motion.
 *
 * @param {{ as?: import('react').ElementType, y?: number, stagger?: number, start?: string,
 *   className?: string, children?: import('react').ReactNode }} props
 */
export default function Reveal({
  as: Tag = 'div',
  y = 24,
  stagger = 0.08,
  start = REVEAL_START,
  className,
  children,
  ...rest
}) {
  const ref = useRef(null)

  useGSAP(
    () => {
      const root = ref.current
      const items = Array.from(root.querySelectorAll(':scope > [data-reveal]'))
      if (!items.length) return undefined

      const mm = gsap.matchMedia()
      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
        gsap.from(items, {
          opacity: 0,
          y,
          duration: DUR.base,
          ease: EASE.out,
          stagger,
          scrollTrigger: revealTrigger(root, start),
        })
      })
      return () => mm.revert()
    },
    { scope: ref, dependencies: [y, stagger, start], revertOnUpdate: true },
  )

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}

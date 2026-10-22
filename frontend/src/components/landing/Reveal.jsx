import { useRef } from 'react'
import { ScrollTrigger, gsap, useGSAP } from '@/lib/motion/gsap'
import { deferSetup } from '@/lib/motion/defer'
import { DUR, EASE, MQ, REVEAL_START, revealTrigger } from '@/lib/motion/presets'

/**
 * Scroll reveal wrapper: direct children carrying `data-reveal` fade + rise in (staggered)
 * once the wrapper reaches REVEAL_START. Children without `data-reveal` are left alone.
 * Static (fully visible) under prefers-reduced-motion.
 * Setup is deferred past the first paint (deferSetup); a wrapper already on screen by then is
 * left as is (no visible → hidden → revealed flash).
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
    (_ctx, contextSafe) => {
      const root = ref.current
      const items = Array.from(root.querySelectorAll(':scope > [data-reveal]'))
      if (!items.length) return undefined

      const setup = () => {
        if (ScrollTrigger.isInViewport(root)) return
        gsap.from(items, {
          opacity: 0,
          y,
          duration: DUR.base,
          ease: EASE.out,
          stagger,
          scrollTrigger: revealTrigger(root, start),
        })
      }

      const mm = gsap.matchMedia()
      const cancel = deferSetup(contextSafe(() => mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, setup)))
      return () => {
        cancel()
        mm.revert()
      }
    },
    { scope: ref, dependencies: [y, stagger, start], revertOnUpdate: true },
  )

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}

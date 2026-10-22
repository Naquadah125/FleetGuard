import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { deferSetup } from '@/lib/motion/defer'
import { bindIdle } from '@/lib/motion/idle'
import { BADGES_3D } from '@/components/illustrations/3d'
import { cn } from '@/lib/utils'

/** One full float cycle (up + down), seconds. */
const CYCLE = 6.4
const FLOAT_Y = 8
const TILT = 4

/**
 * Float3D — a floating "clay 3D" badge accent (Phase 6).
 *
 * ```jsx
 * <div className="relative">
 *   <Float3D badge="shield" size={88} depth={1.15} className="absolute -left-6 top-10" />
 * </div>
 * ```
 *
 * - `badge`: key of BADGES_3D (shield, bell, pin, camera, chart, steering, lock, headset, truck).
 * - `className` positions it (it is `absolute` by default) and may override the visibility:
 *   hidden below `md` by default (`hidden md:block`); pass e.g. `block` to show it on phones
 *   (it is static there only when reduced motion is on — see below).
 * - `depth` → `data-speed` on the wrapper: ScrollSmoother parallax (desktop ≥1024px only; inert
 *   on touch sizes and under reduced motion). 1 = scrolls with the page; >1 nearer, <1 farther.
 *   A string is passed through as is, e.g. `'clamp(1.12)'` for above-the-fold accents (the hero),
 *   so the parallax starts at scroll 0 and the load layout equals the design layout.
 * - `phase` (0–1): where in the float cycle it starts, so neighbouring badges never bob in step.
 * - Idle loop (body y ±8, tilt ±4°, contact shadow shrinks/fades in sync) is built after first
 *   paint (deferSetup) and bound with bindIdle: plays only while the badge is on screen and the
 *   shared MotionPause is off; nothing moves under prefers-reduced-motion; skipped while the
 *   badge is `display: none`.
 * - Decorative (`aria-hidden`, no pointer events) unless `title` is given (then role="img").
 *
 * @param {{ badge: keyof typeof BADGES_3D, size?: number, depth?: number|string, phase?: number,
 *   className?: string, title?: string }} props
 */
export default function Float3D({ badge, size = 96, depth = 1, phase = 0, className, title }) {
  const rootRef = useRef(null)
  const Badge = BADGES_3D[badge]

  useGSAP(
    (ctx, contextSafe) => {
      let unbind = () => {}
      const cancel = deferSetup(
        contextSafe(() => {
          const el = rootRef.current
          if (!el) return
          const mm = gsap.matchMedia()
          // `md` is listed only so crossing the breakpoint re-runs this (visibility may change).
          mm.add({ md: '(min-width: 768px)', motion: '(prefers-reduced-motion: no-preference)' }, (mmCtx) => {
            if (!mmCtx.conditions.motion) return
            // Only animate a badge that is actually rendered (hidden below md by default).
            if (getComputedStyle(el).display === 'none') return
            const body = el.querySelector('[data-part="body"]')
            const shadow = el.querySelector('[data-part="shadow"]')
            if (!body) return

            const half = CYCLE / 2
            const tl = gsap.timeline({
              repeat: -1,
              yoyo: true,
              defaults: { duration: half, ease: 'sine.inOut' },
            })
            tl.fromTo(body, { y: FLOAT_Y, rotation: -TILT, svgOrigin: '60 60' }, { y: -FLOAT_Y, rotation: TILT, svgOrigin: '60 60' }, 0)
            if (shadow) {
              tl.fromTo(
                shadow,
                { scale: 1, opacity: 1, svgOrigin: '60 110' },
                { scale: 0.8, opacity: 0.55, svgOrigin: '60 110' },
                0,
              )
            }
            tl.totalTime((((phase % 1) + 1) % 1) * CYCLE)
            unbind()
            unbind = bindIdle(tl, el)
            return () => {
              unbind()
              unbind = () => {}
            }
          })
        }),
      )
      return () => {
        cancel()
        unbind()
      }
    },
    { scope: rootRef },
  )

  if (!Badge) return null

  return (
    <div
      ref={rootRef}
      data-speed={depth}
      data-float3d={badge}
      className={cn('pointer-events-none absolute hidden select-none md:block', className)}
      style={{ width: size, height: size }}
    >
      <Badge className="block size-full overflow-visible" title={title} />
    </div>
  )
}

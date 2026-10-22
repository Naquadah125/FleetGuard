import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { deferSetup } from '@/lib/motion/defer'
import { MQ } from '@/lib/motion/presets'
import { isMotionPaused, onMotionPauseChange } from '@/components/landing/motionPause'
import BellBadge3D from '@/components/illustrations/3d/BellBadge3D'
import CameraBadge3D from '@/components/illustrations/3d/CameraBadge3D'
import ChartBadge3D from '@/components/illustrations/3d/ChartBadge3D'
import HeadsetBadge3D from '@/components/illustrations/3d/HeadsetBadge3D'
import LockBadge3D from '@/components/illustrations/3d/LockBadge3D'
import PinBadge3D from '@/components/illustrations/3d/PinBadge3D'
import ShieldBadge3D from '@/components/illustrations/3d/ShieldBadge3D'
import SteeringBadge3D from '@/components/illustrations/3d/SteeringBadge3D'
import { cn } from '@/lib/utils'

// Imported one by one (not the BADGES_3D map) so a badge that is placed nowhere (the truck since
// Phase 6 fix) is tree-shaken out of the bundle. Add it here again to place it.
const BADGES = {
  shield: ShieldBadge3D,
  bell: BellBadge3D,
  pin: PinBadge3D,
  camera: CameraBadge3D,
  chart: ChartBadge3D,
  steering: SteeringBadge3D,
  lock: LockBadge3D,
  headset: HeadsetBadge3D,
}

const BP = { md: 768, lg: 1024, xl: 1280 }
const SINE = 'cubic-bezier(0.37, 0, 0.63, 1)' // ≈ sine.inOut

// ---- media queries (mount gating) -------------------------------------------------------------
function queryFor(from, until) {
  const parts = []
  if (from) parts.push(`(min-width: ${BP[from]}px)`)
  if (until) parts.push(`(max-width: ${BP[until] - 0.02}px)`)
  return parts.join(' and ') || 'all'
}

function useMedia(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

// ---- shared IntersectionObservers ------------------------------------------------------------
// One observer mounts badge artwork shortly before it scrolls in ("near"), one plays / pauses the
// idle float while it is actually on screen ("view"). Shared by every Float3D: no ScrollTrigger
// and no GSAP tween per badge.
const watchers = { near: null, view: null }
const callbacks = { near: new Map(), view: new Map() }
const MARGIN = { near: '240px 0px', view: '0px' }

function observe(kind, el, fn) {
  if (typeof IntersectionObserver === 'undefined') {
    fn(true)
    return () => {}
  }
  if (!watchers[kind]) {
    watchers[kind] = new IntersectionObserver(
      (entries) => entries.forEach((e) => callbacks[kind].get(e.target)?.(e.isIntersecting)),
      { rootMargin: MARGIN[kind] },
    )
  }
  callbacks[kind].set(el, fn)
  watchers[kind].observe(el)
  return () => {
    callbacks[kind].delete(el)
    watchers[kind]?.unobserve(el)
  }
}

/** Deterministic 0–1 hash so every placement gets its own float period (no lockstep). */
function spread(badge, phase) {
  let h = Math.round(phase * 997)
  for (const ch of badge) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return (h % 1000) / 1000
}

/**
 * Float3D — a floating "clay 3D" badge accent (Phase 6, reworked in the Phase 6 fix).
 *
 * ```jsx
 * <div className="relative">
 *   <Float3D badge="shield" size={88} depth={1.15} className="-left-6 top-10" />          // md+
 *   <Float3D badge="lock" from="xl" className="top-2 left-full ml-6" />                  // xl+
 *   <Float3D badge="chart" mobile className="left-0 top-1" />                             // < md
 * </div>
 * ```
 *
 * Mounting (perf): a placement renders NOTHING outside its breakpoint range — no hidden badges
 * in the DOM. `from` / `until` ('md' | 'lg' | 'xl') set the range (default from 'md'); `mobile`
 * is shorthand for `until="md"` (phones). Inside the range the positioned wrapper renders at once
 * (so ScrollSmoother sees its `data-speed`), but the badge artwork mounts only when the wrapper
 * comes within ~240px of the viewport — or immediately with `eager` (above-the-fold accents, e.g.
 * the hero, whose intro pops them in).
 *
 * - `className` positions it (the wrapper is `absolute`); `size` in px (mobile default 60).
 * - `depth` → `data-speed` (ScrollSmoother parallax, desktop ≥1024px only). 1 = scrolls with the
 *   page; >1 nearer, <1 farther. A string passes through, e.g. `'clamp(0.96)'` for above-the-fold
 *   accents. Mobile placements get no parallax.
 * - `phase` (0–1): start point in the float cycle; the period itself also varies per placement
 *   (5.6–8s), so neighbouring badges never bob in step.
 * - Idle float: Web Animations on HTML wrappers (compositor transforms, no per-frame JS): the
 *   badge wrapper floats (y ±8, tilt ±4°) and an HTML contact shadow shrinks/fades in sync
 *   (mobile: float only, smaller, static shadow). It plays only while the badge is on screen and
 *   the shared MotionPause is off; nothing moves under prefers-reduced-motion.
 * - Decorative (`aria-hidden`, no pointer events) unless `title` is given (then role="img").
 *
 * DOM: `[data-float3d]` wrapper > `[data-float3d-shadow]` + `[data-float3d-float]` > `<svg>`
 * (the SVG's own `data-part="shadow"` ellipse is hidden; the HTML shadow replaces it).
 *
 * @param {{ badge: keyof typeof BADGES, size?: number, depth?: number|string, phase?: number,
 *   from?: 'md'|'lg'|'xl', until?: 'md'|'lg'|'xl', mobile?: boolean, eager?: boolean,
 *   className?: string, title?: string }} props
 */
export default function Float3D({ mobile = false, from, until, ...props }) {
  const query = mobile ? queryFor(null, 'md') : queryFor(from ?? 'md', until)
  const active = useMedia(query)
  if (!active || !BADGES[props.badge]) return null
  return <FloatBadge mobile={mobile} {...props} />
}

function FloatBadge({ badge, size, depth = 1, phase = 0, mobile, eager = false, className, title }) {
  const rootRef = useRef(null)
  const floatRef = useRef(null)
  const shadowRef = useRef(null)
  const [near, setNear] = useState(eager)
  const Badge = BADGES[badge]
  const px = size ?? (mobile ? 60 : 96)

  // Mount the artwork shortly before it scrolls into view.
  useEffect(() => {
    if (near) return undefined
    const el = rootRef.current
    if (!el) return undefined
    const stop = observe('near', el, (hit) => {
      if (!hit) return
      stop()
      setNear(true)
    })
    return stop
  }, [near])

  // Idle float (Web Animations), gated by on-screen + MotionPause + reduced motion.
  useEffect(() => {
    if (!near) return undefined
    const root = rootRef.current
    const floatEl = floatRef.current
    if (!root || !floatEl || typeof floatEl.animate !== 'function') return undefined

    const reduce = window.matchMedia(MQ.reduce)
    let anims = []
    let inView = false
    let stopView = () => {}
    let stopPause = () => {}

    const half = (mobile ? 3.2 : 2.8) + spread(badge, phase) * 1.2 // seconds per half cycle
    const timing = {
      duration: half * 1000,
      iterations: Infinity,
      direction: 'alternate',
      easing: SINE,
    }
    const lift = mobile ? 6 : 8
    const tilt = mobile ? 3 : 4

    const build = () => {
      anims = [
        floatEl.animate(
          [
            { transform: `translateY(${lift}px) rotate(${-tilt}deg)` },
            { transform: `translateY(${-lift}px) rotate(${tilt}deg)` },
          ],
          timing,
        ),
      ]
      if (!mobile && shadowRef.current) {
        anims.push(
          shadowRef.current.animate(
            [
              { transform: 'scale(1)', opacity: 1 },
              { transform: 'scale(0.8)', opacity: 0.55 },
            ],
            timing,
          ),
        )
      }
      const start = ((((phase % 1) + 1) % 1) * 2 * half * 1000) | 0
      anims.forEach((a) => {
        a.pause()
        a.currentTime = start
      })
    }

    const sync = () => {
      if (reduce.matches) {
        anims.forEach((a) => a.cancel())
        anims = []
        return
      }
      if (!anims.length) build()
      const run = inView && !isMotionPaused()
      anims.forEach((a) => (run ? a.play() : a.pause()))
    }

    const setup = () => {
      stopView = observe('view', root, (hit) => {
        inView = hit
        sync()
      })
      stopPause = onMotionPauseChange(sync)
      reduce.addEventListener('change', sync)
      if (!reduce.matches) build()
    }
    // Above-the-fold (eager) badges: keep the setup off the first-paint path.
    const cancel = eager ? deferSetup(setup) : (setup(), () => {})

    return () => {
      cancel()
      stopView()
      stopPause()
      reduce.removeEventListener('change', sync)
      anims.forEach((a) => a.cancel())
      anims = []
    }
  }, [near, mobile, badge, phase, eager])

  // Contact shadow geometry = Badge3D's ellipse (cx 60, cy 110, rx 30, ry 5.5 in a 120 viewBox).
  const shadowStyle = {
    left: '25%',
    width: '50%',
    top: `${(104.5 / 120) * 100}%`,
    height: `${(11 / 120) * 100}%`,
    background:
      'radial-gradient(closest-side, rgb(13 34 50 / 0.3), rgb(13 34 50 / 0.13) 55%, rgb(13 34 50 / 0))',
  }

  return (
    <div
      ref={rootRef}
      data-speed={mobile ? undefined : depth}
      data-float3d={badge}
      className={cn(
        'pointer-events-none absolute select-none [&_[data-part=shadow]]:hidden',
        className,
      )}
      style={{ width: px, height: px }}
    >
      {near ? (
        <>
          <div ref={shadowRef} aria-hidden="true" data-float3d-shadow className="absolute rounded-[50%]" style={shadowStyle} />
          <div ref={floatRef} data-float3d-float className="relative size-full">
            <Badge className="block size-full overflow-visible" title={title} />
          </div>
        </>
      ) : null}
    </div>
  )
}

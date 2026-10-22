/**
 * Continuous "idle" motion (Phase 6): ambient loops (badge float, leaf sway, pin pulse, route
 * flow…) that run ONLY while their section is on screen, never while the shared MotionPause
 * switch is on (WCAG 2.2.2), and never under prefers-reduced-motion.
 *
 * bindIdle(timeline, triggerEl, { start, end }) pauses `timeline` immediately, then creates one
 * ScrollTrigger on `triggerEl` that plays it while in view and pauses it when out. Returns the
 * unsubscribe for the MotionPause listener; the ScrollTrigger itself belongs to the surrounding
 * gsap context (useGSAP / matchMedia) and is reverted with it.
 *
 * Call it inside a `contextSafe` callback (usually the one given to `deferSetup`) so the
 * ScrollTrigger is recorded by the component's context:
 *
 * ```js
 * useGSAP((ctx, contextSafe) => {
 *   let unbind = () => {}
 *   const cancel = deferSetup(contextSafe(() => {
 *     const tl = gsap.timeline({ repeat: -1, yoyo: true }).to(...)
 *     unbind = bindIdle(tl, rootRef.current)
 *   }))
 *   return () => { cancel(); unbind() }
 * }, { scope: rootRef })
 * ```
 *
 * Pausing keeps the playhead where it was (no jump on resume). Loops should be built with
 * transforms / opacity only (see gsap-performance) and kept to a handful of tweens each.
 */
import { ScrollTrigger } from './gsap'
import { MQ } from './presets'
import { isMotionPaused, onMotionPauseChange } from '../../components/landing/motionPause'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia(MQ.reduce).matches

/**
 * @param {import('gsap').core.Animation} timeline looping tween / timeline (repeat: -1)
 * @param {Element} triggerEl element whose visibility gates the loop
 * @param {{ start?: string, end?: string }} [options]
 * @returns {() => void} unsubscribe from MotionPause changes
 */
export function bindIdle(timeline, triggerEl, { start = 'top bottom', end = 'bottom top' } = {}) {
  timeline.pause()
  if (!triggerEl || reducedMotion()) return () => {}

  let inView = false
  const sync = () => {
    if (inView && !isMotionPaused() && !reducedMotion()) timeline.play()
    else timeline.pause()
  }

  const st = ScrollTrigger.create({
    trigger: triggerEl,
    start,
    end,
    onToggle: (self) => {
      inView = self.isActive
      sync()
    },
  })
  inView = st.isActive
  sync()

  return onMotionPauseChange(sync)
}

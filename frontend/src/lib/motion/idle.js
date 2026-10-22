/**
 * Continuous "idle" motion (Phase 6): ambient loops (badge float, leaf sway, pin pulse, route
 * flow…) that run ONLY while their section is on screen, never while the shared MotionPause
 * switch is on (WCAG 2.2.2), and never under prefers-reduced-motion.
 *
 * bindIdle(timeline, triggerEl, { start, end }) pauses `timeline` immediately, then creates one
 * ScrollTrigger on `triggerEl` that runs it (at IDLE_FPS, see below) while in view and stops it
 * when out. Returns the unbind (MotionPause listener + stop); the ScrollTrigger itself belongs to
 * the surrounding gsap context (useGSAP / matchMedia) and is reverted with it.
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
 * The timeline itself always stays paused: while it should run, a shared ticker advances it at
 * IDLE_FPS (see below), so never call `play()` on it yourself.
 */
import { gsap, ScrollTrigger } from './gsap'
import { MQ } from './presets'
import { isMotionPaused, onMotionPauseChange } from '../../components/landing/motionPause'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia(MQ.reduce).matches

/**
 * Idle loops are ambient (slow sways, pulses, dash flows), so they are rendered at IDLE_FPS
 * instead of every display frame: each bound timeline stays PAUSED in GSAP's own sense and one
 * shared ticker listener advances every in-view loop by the elapsed time every ~33ms. That halves
 * their DOM writes — and with them the per-frame style / paint / layerize work that dominated the
 * desktop idle cost — while the motion keeps its real-time speed. (Note for probes: a running
 * idle loop therefore reports `isActive() === false`; see `idleLoopsRunning()`.)
 */
const IDLE_FPS = 30
const IDLE_STEP_MS = 1000 / IDLE_FPS - 4 // tolerance so a 60Hz ticker hits every 2nd frame
/** @type {Set<import('gsap').core.Animation>} */
const running = new Set()
let acc = 0

function idleTick(_time, deltaTime) {
  acc += deltaTime
  if (acc < IDLE_STEP_MS) return
  const dt = Math.min(acc, 100) / 1000 // cap: a backgrounded tab must not jump far ahead
  acc = 0
  running.forEach((tl) => {
    if (!tl.parent) running.delete(tl) // killed / reverted without its unbind
    else tl.totalTime(tl.totalTime() + dt)
  })
  if (!running.size) gsap.ticker.remove(idleTick)
}

function setRunning(tl, run) {
  if (run === running.has(tl)) return
  if (run) {
    running.add(tl)
    if (running.size === 1) {
      acc = 0
      gsap.ticker.add(idleTick)
    }
  } else {
    running.delete(tl)
    if (!running.size) gsap.ticker.remove(idleTick)
  }
}

/** Number of idle loops currently advancing (dev / probes). */
export const idleLoopsRunning = () => running.size

// Dev-only hook for probes (tween counts no longer see running idle loops as active).
if (import.meta.env.DEV && typeof window !== 'undefined' && window.__fg) {
  window.__fg.idleLoopsRunning = idleLoopsRunning
  // Tweens inside the advancing loops (what `isActive()` counts would have shown before).
  window.__fg.idleTweensRunning = () =>
    [...running].reduce((n, tl) => n + (tl.getChildren ? tl.getChildren(true, true, false).length : 1), 0)
}

/**
 * @param {import('gsap').core.Animation} timeline looping tween / timeline (repeat: -1)
 * @param {Element} triggerEl element whose visibility gates the loop
 * @param {{ start?: string, end?: string }} [options]
 * @returns {() => void} unbind (MotionPause listener + stops advancing the loop)
 */
export function bindIdle(timeline, triggerEl, { start = 'top bottom', end = 'bottom top' } = {}) {
  timeline.pause()
  if (!triggerEl || reducedMotion()) return () => {}

  let inView = false
  const sync = () => setRunning(timeline, inView && !isMotionPaused() && !reducedMotion())

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

  const unsubscribe = onMotionPauseChange(sync)
  return () => {
    unsubscribe()
    setRunning(timeline, false)
  }
}

/**
 * CSS-keyframe variant of bindIdle for compositor-only ambient loops (e.g. backdrop blob drift):
 * no GSAP tween and no ScrollTrigger — one IntersectionObserver per element, so nothing is written
 * from the main thread per frame and the ScrollTrigger count is unchanged.
 *
 * Writes `data-idle` on `el`:
 *  - `"run"`  on screen, MotionPause off, motion allowed → CSS sets `animation-play-state: running`
 *  - `"hold"` on screen, MotionPause on                   → paused in place (no jump on resume)
 *  - absent   off screen or reduced motion                → the CSS drops the animation (no layer)
 * The keyframes themselves live in index.css (see `[data-blob]`); reduced motion is also enforced
 * there. IntersectionObserver sees the ScrollSmoother-transformed position, so it is exact while
 * the smoother runs as well as with native scrolling.
 *
 * @param {Element} el
 * @param {{ rootMargin?: string }} [options]
 * @returns {() => void} cleanup (disconnects the observer, unsubscribes from MotionPause)
 */
export function bindCssIdle(el, { rootMargin = '0px' } = {}) {
  if (!el || typeof IntersectionObserver === 'undefined') return () => {}
  let inView = false
  const sync = () => {
    const state = !inView || reducedMotion() ? null : isMotionPaused() ? 'hold' : 'run'
    if (el.getAttribute('data-idle') === state) return
    if (state) el.setAttribute('data-idle', state)
    else el.removeAttribute('data-idle')
  }
  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting
      sync()
    },
    { rootMargin },
  )
  io.observe(el)
  const unsubscribe = onMotionPauseChange(sync)
  return () => {
    io.disconnect()
    unsubscribe()
    el.removeAttribute('data-idle')
  }
}

/**
 * Calls `onNear` once, the first time `el` comes within `rootMargin` of the viewport (used to
 * mount below-the-fold decoration out of the first render). Returns a cleanup.
 *
 * @param {Element} el
 * @param {() => void} onNear
 * @param {{ rootMargin?: string }} [options]
 * @returns {() => void}
 */
export function whenNearViewport(el, onNear, { rootMargin = '100% 0px' } = {}) {
  if (!el || typeof IntersectionObserver === 'undefined') {
    onNear()
    return () => {}
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      onNear()
    },
    { rootMargin },
  )
  io.observe(el)
  return () => io.disconnect()
}

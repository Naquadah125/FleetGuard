import { useSyncExternalStore } from 'react'

/**
 * Page-wide "pause motion" switch for the landing's auto-playing content (WCAG 2.2.2): the hero
 * ticker / live map, the AI-demo auto-cycle and idle loops, and the decorative loops (road,
 * shimmer, plant, chip glow). The hero and demo pause buttons both drive it; every section's
 * looping animation checks `isMotionPaused()` and re-syncs through `onMotionPauseChange()`.
 * Session-only (not persisted). Reduced motion needs none of this: nothing loops there.
 */
let paused = false
const listeners = new Set()

export function isMotionPaused() {
  return paused
}

export function setMotionPaused(value) {
  if (paused === value) return
  paused = value
  listeners.forEach((fn) => fn(paused))
}

/** Subscribe; returns the unsubscribe function (call it from the GSAP cleanup). */
export function onMotionPauseChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** React binding for the pause buttons. */
export function useMotionPaused() {
  return useSyncExternalStore(onMotionPauseChange, isMotionPaused, () => false)
}

/**
 * Plays `animations` only while `trigger` is on screen AND motion is not paused.
 * Creates one ScrollTrigger (inside the caller's GSAP context) and returns its cleanup,
 * which the caller must return / run from its matchMedia branch.
 *
 * @param {Element} trigger
 * @param {import('gsap').core.Animation[]} animations
 * @param {typeof import('gsap').ScrollTrigger} ScrollTrigger
 */
export function loopWhileVisible(trigger, animations, ScrollTrigger) {
  let inView = false
  const sync = () => {
    const run = inView && !paused
    animations.forEach((a) => (run ? a.play() : a.pause()))
  }
  const st = ScrollTrigger.create({
    trigger,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      inView = self.isActive
      sync()
    },
  })
  inView = st.isActive
  sync()
  return onMotionPauseChange(sync)
}

import { ScrollTrigger } from './gsap'

/**
 * Shared motion presets. Every GSAP animation runs inside gsap.matchMedia() with these queries:
 * `desktop` (full motion), `mobile` (no heavy parallax, keep reveals), `reduce` (nothing animates,
 * final state visible).
 */
export const MQ = {
  desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
}

export const EASE = { out: 'power3.out', inOut: 'power2.inOut', spring: 'back.out(1.6)' }

export const DUR = { fast: 0.25, base: 0.6, slow: 1.0 }

export const REVEAL_START = 'top 80%'

/**
 * Wrap a ScrollTrigger start in clamp() so elements near the page bottom (which can never
 * reach "top 80%") still fire at max scroll instead of staying hidden.
 *
 * Note: clamp() also turns the start of anything already above the line on load into 0, and a
 * trigger whose start is 0 does not fire while the page sits at scroll 0. Use revealTrigger()
 * (which handles that) for one-shot reveals rather than passing clampStart() on its own.
 */
export const clampStart = (start = REVEAL_START) => (start.startsWith('clamp(') ? start : `clamp(${start})`)

/**
 * ScrollTrigger vars for a one-shot scroll reveal: fires when `trigger` reaches `start`
 * (clamped, see clampStart), and also whenever ScrollTrigger measures (creation, load, fonts,
 * resize) while the trigger is already inside the viewport and its animation has not run yet,
 * so content visible on load (above the fold, or under the 80% line of a tall viewport) is
 * never left hidden at scroll 0.
 *
 * @param {Element} trigger
 * @param {string} [start=REVEAL_START]
 * @param {object} [vars] extra ScrollTrigger vars (merged last)
 */
export function revealTrigger(trigger, start = REVEAL_START, vars = {}) {
  return {
    trigger,
    start: clampStart(start),
    once: true,
    onRefresh: (self) => {
      const anim = self.animation
      if (anim && anim.paused() && anim.progress() === 0 && ScrollTrigger.isInViewport(self.trigger)) anim.play()
    },
    ...vars,
  }
}

import { ScrollSmoother } from './gsap'
import { MQ } from './presets'

/** Height of the fixed navbar; anchor targets land just below it. */
export const HEADER_OFFSET = 72

/**
 * Scroll so the section with `id` sits just below the fixed header.
 * Uses ScrollSmoother when it is active, otherwise native window scrolling.
 * Honors prefers-reduced-motion (jumps instead of animating).
 */
export function scrollToSection(id) {
  const reduce = typeof window !== 'undefined' && window.matchMedia(MQ.reduce).matches
  const smoother = ScrollSmoother.get()
  if (smoother) {
    smoother.scrollTo(`#${id}`, !reduce, `top ${HEADER_OFFSET}px`)
    return
  }
  const el = document.getElementById(id)
  // getBoundingClientRect + scrollY is robust to positioned ancestors (offsetTop is not).
  const top = el ? el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET : 0
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
}

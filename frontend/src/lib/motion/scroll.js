import { ScrollSmoother } from './gsap'
import { MQ } from './presets'

/** Height of the fixed navbar; anchor targets land just below it. */
export const HEADER_OFFSET = 72

/**
 * Move keyboard / screen-reader focus to the section that was just scrolled to (WCAG 2.4.3), so
 * the next Tab continues from there instead of from the link that was activated. Sections are
 * not focusable by default: they get `tabindex="-1"` (programmatic focus only, no Tab stop; its
 * focus outline is suppressed in index.css). `preventScroll` keeps the browser from jumping
 * ahead of the (smooth) scroll that is already running; ScrollSmoother's own focus-into-view
 * handler is skipped for these `tabindex="-1"` targets (SmoothScroll.jsx `onFocusIn`), otherwise it
 * would re-centre the still-lagging section and override HEADER_OFFSET.
 */
function focusSection(el) {
  if (!el) return
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

/**
 * Scroll so the section with `id` sits just below the fixed header, then move focus to it.
 * Uses ScrollSmoother when it is active, otherwise native window scrolling.
 * Honors prefers-reduced-motion (jumps instead of animating). Uses 'instant', not 'auto',
 * so the jump never inherits a CSS `scroll-behavior: smooth`.
 *
 * @param {string} id section element id
 * @param {{ immediate?: boolean, focus?: boolean }} [options] `immediate` jumps without
 *   animating (e.g. hash on load); `focus: false` leaves focus where it is (default true)
 */
export function scrollToSection(id, { immediate = false, focus = true } = {}) {
  const reduce = typeof window !== 'undefined' && window.matchMedia(MQ.reduce).matches
  const animate = !reduce && !immediate
  const el = document.getElementById(id)
  const smoother = ScrollSmoother.get()
  if (smoother) {
    smoother.scrollTo(`#${id}`, animate, `top ${HEADER_OFFSET}px`)
  } else {
    // getBoundingClientRect + scrollY is robust to positioned ancestors (offsetTop is not).
    const top = el ? el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET : 0
    window.scrollTo({ top: Math.max(0, top), behavior: animate ? 'smooth' : 'instant' })
  }
  if (focus) focusSection(el)
}

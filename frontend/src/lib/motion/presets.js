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
 */
export const clampStart = (start = REVEAL_START) => (start.startsWith('clamp(') ? start : `clamp(${start})`)

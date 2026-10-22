/**
 * Per-glyph micro-motions for the Features section's filled glyphs
 * (src/components/illustrations/feature-glyphs, `data-part` hooks documented in each file).
 *
 * GLYPH_MOTIONS[key](svg, gsap) builds a short PAUSED timeline (~0.8–1.1 s) that only moves the
 * glyph's parts with transforms and always ends exactly at rest, so it can be
 * restarted at any time (hover, focus, idle cycle) without drifting the static look.
 * Pivots use bbox-relative `transformOrigin` (or the glyph's documented svgOrigin) so small
 * geometry tweaks in the glyph files don't break them. Missing parts are skipped.
 */

/** @typedef {(svg: SVGSVGElement, gsap: typeof import('gsap').gsap) => import('gsap').core.Timeline} GlyphMotion */

const part = (svg, name) => svg.querySelector(`[data-part="${name}"]`)

/** Set a pivot once (keyframe tweens don't apply transformOrigin / svgOrigin themselves). */
const pivot = (gsap, el, origin) => {
  if (el) gsap.set(el, origin.includes('%') ? { transformOrigin: origin } : { svgOrigin: origin })
  return el
}

/** @type {Record<string, GlyphMotion>} */
export const GLYPH_MOTIONS = {
  /** Bell rings from its knob; the clapper counter-swings. */
  bell(svg, gsap) {
    const tl = gsap.timeline({ paused: true })
    const body = pivot(gsap, part(svg, 'body'), '50% 0%')
    const clapper = part(svg, 'clapper')
    if (body) tl.to(body, { keyframes: { rotation: [0, 14, -12, 9, -6, 3, 0], easeEach: 'sine.inOut' }, duration: 0.95, ease: 'none' }, 0)
    if (clapper) tl.to(clapper, { keyframes: { x: [0, -1.4, 1.3, -0.9, 0.5, 0] }, duration: 0.95, ease: 'none' }, 0.04)
    return tl
  },

  /** Pin hops and lands with a little squash; the dot pulses. */
  pin(svg, gsap) {
    const tl = gsap.timeline({ paused: true })
    const pin = pivot(gsap, part(svg, 'pin'), '50% 100%')
    const dot = pivot(gsap, part(svg, 'dot'), '50% 50%')
    if (pin) {
      tl.to(pin, { y: -3.4, scaleY: 1.05, duration: 0.26, ease: 'power2.out' })
        .to(pin, { y: 0, scaleY: 1, duration: 0.3, ease: 'power2.in' })
        .to(pin, { scaleX: 1.1, scaleY: 0.88, duration: 0.09, ease: 'power1.out', yoyo: true, repeat: 1 })
    }
    if (dot) tl.to(dot, { scale: 0.7, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.62)
    return tl
  },

  /** Bars dip and regrow left → right from the baseline; the trend line lifts, its end dot pops. */
  chart(svg, gsap) {
    const tl = gsap.timeline({ paused: true })
    const bars = ['bar-1', 'bar-2', 'bar-3'].map((n) => pivot(gsap, part(svg, n), '50% 100%')).filter(Boolean)
    const trend = part(svg, 'trend')
    const dot = pivot(gsap, trend?.querySelector('circle'), '50% 50%')
    if (bars.length) tl.to(bars, { keyframes: { scaleY: [1, 0.45, 1.08, 1] }, duration: 0.7, ease: 'none', stagger: 0.1 }, 0)
    if (trend) tl.to(trend, { keyframes: { y: [0, 1.2, -1.6, 0] }, duration: 0.8, ease: 'none' }, 0.05)
    if (dot) tl.to(dot, { keyframes: { scale: [1, 1.6, 1] }, duration: 0.4, ease: 'none' }, 0.5)
    return tl
  },

  /** Plug pulls out a touch and pushes back in with a wobble; the prongs jiggle. */
  plug(svg, gsap) {
    const tl = gsap.timeline({ paused: true })
    const plug = pivot(gsap, part(svg, 'plug'), '50% 100%')
    const prongs = pivot(gsap, part(svg, 'prongs'), '50% 100%')
    if (plug) {
      tl.to(plug, { y: -2.6, duration: 0.24, ease: 'power2.out' }, 0)
        .to(plug, { y: 0, duration: 0.32, ease: 'back.out(3)' }, 0.24)
        .to(plug, { keyframes: { rotation: [0, -7, 5, -2.5, 0] }, duration: 0.6, ease: 'none' }, 0.2)
    }
    if (prongs) tl.to(prongs, { scaleY: 1.18, duration: 0.1, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0.5)
    return tl
  },

  /** Shackle lifts (unlock) and snaps shut; the case gives a tiny shake. */
  lock(svg, gsap) {
    const tl = gsap.timeline({ paused: true })
    const shackle = part(svg, 'shackle')
    const body = pivot(gsap, part(svg, 'body'), '50% 50%')
    if (shackle) {
      tl.to(shackle, { y: -2.6, duration: 0.28, ease: 'power2.out' }, 0)
        .to(shackle, { y: 0, duration: 0.22, ease: 'power3.in' }, 0.42)
    }
    if (body) tl.to(body, { keyframes: { rotation: [0, -6, 5, -3, 0] }, duration: 0.45, ease: 'none' }, 0.62)
    return tl
  },

  /** Ear cups pulse, the band breathes, the mic boom wiggles (like a voice coming through). */
  headset(svg, gsap) {
    const tl = gsap.timeline({ paused: true })
    const band = pivot(gsap, part(svg, 'band'), '50% 100%')
    const cups = pivot(gsap, part(svg, 'cups'), '50% 50%')
    const mic = pivot(gsap, part(svg, 'mic'), '25.6 24')
    if (cups) tl.to(cups, { scale: 1.08, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
    if (band) tl.to(band, { scaleY: 1.06, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
    if (mic) tl.to(mic, { keyframes: { rotation: [0, -10, 8, -5, 0] }, duration: 0.8, ease: 'none' }, 0.05)
    return tl
  },
}

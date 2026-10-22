/**
 * Micro-animations for lucide-react icons (stroke-based <svg>).
 *
 * ICON_MOTIONS[name](svgEl, gsap) → a *paused* gsap.Timeline that starts and ends at the
 * icon's rest pose, so callers can `tl.restart()` on hover/focus. Timelines only use `.to()`
 * (or `.fromTo()` with immediateRender:false) so building them never changes what is on screen.
 *
 * Elements marked `data-icon-fx` (e.g. the ScanFace scan line injected by <AnimatedIcon>)
 * are effect layers: skipped by drawIconIn, driven by their motion.
 *
 * Call these inside a gsap.context()/useGSAP()/matchMedia() so they are reverted on cleanup.
 */
import { CustomWiggle } from './gsap'
import { EASE } from './presets'

// Named wiggle eases (registered once; CustomEase is registered in ./gsap before CustomWiggle).
CustomWiggle.create('fgBell', { wiggles: 6, type: 'easeOut' })
CustomWiggle.create('fgTilt', { wiggles: 3, type: 'easeOut' })

const STROKE_PARTS = 'path, line, circle, rect, polyline, polygon, ellipse'

const qsa = (el, sel) => Array.from(el.querySelectorAll(sel))
const strokeParts = (svg) => qsa(svg, STROKE_PARTS).filter((n) => !n.closest('[data-icon-fx]'))
// A lucide "bar" is a single vertical stroke: "M12 16v5", "M16 14.639V21".
const isVerticalBar = (p) => /^M\s*[\d.]+[\s,]+[\d.]+\s*[vV]\s*-?[\d.]+\s*$/.test(p.getAttribute('d') ?? '')

const paused = (gsap) => gsap.timeline({ paused: true })

/*
 * Stroke draw-in without DrawSVGPlugin: with `pathLength="1"` every stroke is 1 unit long, so a
 * dash pattern of "1 2" (one full-length dash, then a longer gap) slid from offset 1.05 (dash
 * fully before the start: nothing drawn, not even a round-cap dot) to 0 draws the whole stroke.
 * Setting the attribute is a write only — no getTotalLength()/getBBox() reads at setup.
 * The dash styles are cleared when the draw finishes, so the icon ends exactly at rest.
 */
const DASH = '1 2'
const DASH_HIDDEN = 1.05
const DRAW_PROPS = 'strokeDasharray,strokeDashoffset'
const prepStrokeDraw = (els) => els.forEach((el) => el.setAttribute('pathLength', '1'))

export const ICON_MOTIONS = {
  /** Bell rings: decaying ±14° wiggle hinged at the top. */
  bell(el, gsap) {
    return paused(gsap).to(el, {
      rotation: 14,
      transformOrigin: '50% 8%',
      duration: 0.9,
      ease: 'fgBell',
    })
  },

  /** Map pin hops up and bounces back down. */
  pin(el, gsap) {
    return paused(gsap)
      .to(el, { y: -6, duration: 0.22, ease: 'power2.out' })
      .to(el, { y: 0, duration: 0.6, ease: 'bounce.out' })
  },

  /** Chart bars collapse and grow back from the baseline in sequence; trend line redraws. */
  chart(el, gsap) {
    const paths = qsa(el, 'path')
    const bars = paths.filter(isVerticalBar)
    const lines = paths.filter((p) => !bars.includes(p))
    const tl = paused(gsap)
    if (!bars.length) return tl.to(el, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1 })
    tl.to(bars, { scaleY: 0.1, transformOrigin: '50% 100%', duration: 0.15, ease: 'power2.in' })
      .to(bars, { scaleY: 1, duration: 0.5, ease: EASE.spring, stagger: 0.07 })
    if (lines.length) {
      prepStrokeDraw(lines)
      tl.fromTo(
        lines,
        { strokeDasharray: DASH, strokeDashoffset: DASH_HIDDEN },
        { strokeDashoffset: 0, autoRound: false, duration: 0.6, ease: 'power2.out', immediateRender: false, clearProps: DRAW_PROPS },
        0.2,
      )
    }
    return tl
  },

  /**
   * Plug pushes in and out twice. lucide's Plug points up (prongs at the top), so the
   * "insert" nudge runs along its own axis (y) rather than x.
   */
  plug(el, gsap) {
    return paused(gsap)
      .to(el, { y: -3, duration: 0.16, ease: 'power2.out' })
      .to(el, { y: 0, duration: 0.2, ease: 'power2.in' })
      .to(el, { y: -3, duration: 0.16, ease: 'power2.out' })
      .to(el, { y: 0, duration: 0.45, ease: 'back.out(3)' })
  },

  /** Lock: shackle lifts open, then snaps shut with a little body bump. */
  lock(el, gsap) {
    const shackle = el.querySelector('path')
    const body = el.querySelector('rect')
    const tl = paused(gsap)
    if (!shackle) return tl.to(el, { y: -2, duration: 0.15, yoyo: true, repeat: 1 })
    tl.to(shackle, { y: -3, duration: 0.22, ease: 'power2.out' })
      .to(shackle, { y: 0, duration: 0.4, ease: 'bounce.out' }, '+=0.08')
    if (body) {
      tl.to(body, { scale: 1.08, transformOrigin: '50% 50%', duration: 0.1, ease: 'power1.out' }, '-=0.28')
        .to(body, { scale: 1, duration: 0.3, ease: EASE.spring })
    }
    return tl
  },

  /** Headset tilts ±8° like a nod. */
  headset(el, gsap) {
    return paused(gsap).to(el, {
      rotation: 8,
      transformOrigin: '50% 50%',
      duration: 0.9,
      ease: 'fgTilt',
    })
  },

  /** ScanFace: a scan line (`[data-icon-fx="scanline"]` rect) sweeps down and back, then fades. */
  scan(el, gsap) {
    const line = el.querySelector('[data-icon-fx="scanline"]')
    const tl = paused(gsap)
    if (!line) return tl.to(el, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1 })
    return tl
      .set(line, { opacity: 1 })
      .fromTo(line, { y: -7 }, { y: 7, duration: 0.55, ease: 'sine.inOut', immediateRender: false })
      .to(line, { y: -7, duration: 0.55, ease: 'sine.inOut' })
      .to(line, { y: 0, opacity: 0, duration: 0.25, ease: 'power1.out' })
  },

  /** BrainCircuit: circuit strokes flicker in random order, ending fully lit. */
  brain(el, gsap) {
    return paused(gsap).to(qsa(el, 'path, circle'), {
      opacity: 0.2,
      duration: 0.09,
      ease: 'none',
      stagger: { each: 0.035, from: 'random', repeat: 3, yoyo: true },
    })
  },

  /** Cpu: chip pulses (scale) while its pins blink outward from the centre. */
  chip(el, gsap) {
    const pins = qsa(el, 'path')
    const tl = paused(gsap)
      .to(el, { scale: 1.18, transformOrigin: '50% 50%', duration: 0.18, ease: 'power2.out' })
      .to(el, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
    if (pins.length) {
      tl.to(
        pins,
        { opacity: 0.25, duration: 0.12, stagger: { each: 0.02, from: 'center', repeat: 1, yoyo: true } },
        0,
      )
    }
    return tl
  },

  /** AlarmClock: hands sweep a full turn around the dial centre while the clock rattles. */
  clock(el, gsap) {
    const dial = el.querySelector('circle')
    const cx = dial?.getAttribute('cx') ?? '12'
    const cy = dial?.getAttribute('cy') ?? '12'
    const svgOrigin = `${cx} ${cy}`
    // Hands start at the dial centre column ("M12 9v4l2 2").
    const hands = qsa(el, 'path').filter((p) => (p.getAttribute('d') ?? '').startsWith(`M${cx} `))
    const tl = paused(gsap).to(
      el,
      { rotation: 6, transformOrigin: '50% 50%', duration: 0.8, ease: 'fgBell' },
      0,
    )
    if (hands.length) {
      tl.fromTo(
        hands,
        { rotation: 0, svgOrigin },
        { rotation: 360, svgOrigin, duration: 1, ease: EASE.inOut, immediateRender: false },
        0,
      )
    }
    return tl
  },
}

/**
 * Draw the icon's strokes in (dash offset on `pathLength="1"`, see DASH above), staggered.
 * Extra tween vars (e.g. a scrollTrigger) are merged into the "to" vars. Returns the tween.
 */
export function drawIconIn(svgEl, gsap, vars = {}) {
  const parts = strokeParts(svgEl)
  prepStrokeDraw(parts)
  return gsap.fromTo(
    parts,
    { strokeDasharray: DASH, strokeDashoffset: DASH_HIDDEN },
    { strokeDashoffset: 0, autoRound: false, duration: 0.8, stagger: 0.05, ease: 'power2.out', clearProps: DRAW_PROPS, ...vars },
  )
}

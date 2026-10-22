/**
 * Count-up numbers: one shared helper for every animated figure on the landing (stats bar, hero
 * KPIs / distance).
 *
 * Contract — `countUp(el, opts)` returns a GSAP tween that counts `el`'s text from `from` to `to`:
 *  - The element's markup already holds the FINAL value (what React renders). Nothing is written
 *    until the tween actually starts: 0 appears only at tween start, so a trigger that never fires
 *    (or fires late) never leaves a 0 on screen.
 *  - Every frame is formatted with `format(value, decimals)` (default `formatStat`, vi-VN:
 *    `98,5`, `10.000`), wrapped in `prefix` / `suffix`. The text node React created is updated in
 *    place, and only when the formatted string changes.
 *  - No layout shift: `font-variant-numeric: tabular-nums`, and while counting the element keeps a
 *    `min-width` equal to the final string's used width (read from computed style, so transforms
 *    such as an entrance scale do not skew it). An inline element is made `inline-block` for that.
 *    The min-width is released when the count ends, so later breakpoints re-flow naturally.
 *  - Reverting the owning gsap context (unmount, matchMedia branch change, reduced motion) restores
 *    the final text and releases the min-width.
 *  - An element counts at most once per page view (WeakSet): a re-run after a breakpoint change or
 *    a StrictMode double effect shows the final value instead of replaying. (A route change renders
 *    new elements, which count again.) Under prefers-reduced-motion it never counts.
 *  - Accessibility is the caller's markup: put the animated node inside `aria-hidden="true"` next
 *    to a single `.sr-only` final value (or inside a `role="img"` with an `aria-label`), so
 *    assistive tech reads the final value exactly once and never an intermediate one.
 *
 * Triggering (`opts.scrollTrigger`):
 *  - default / object → standalone. A one-shot ScrollTrigger (`once: true`) on
 *    `scrollTrigger.trigger` (default `el`) with `start: clampStart(scrollTrigger.start ?? 'top 85%')`
 *    plays the count when it is crossed. If the trigger is already at or above the viewport bottom
 *    when countUp runs (page loaded mid-page, deferred setup after the user scrolled), or the
 *    scroll jumps clean past the whole range (anchor / End), the final value simply stays.
 *    Pair the start with the element's entrance so the number is hidden when it resets to 0.
 *  - `false` → timeline mode: returns an un-triggered tween to place in an intro timeline
 *    (`tl.add(countUp(el, { to, scrollTrigger: false }), at)`); start it when the number fades in.
 *
 * Call it inside a gsap context (useGSAP / matchMedia branch) so it is cleaned up. For
 * below-the-fold markup use `useCountUp(scopeRef, opts)`, which defers setup (deferSetup) and runs
 * only when motion is allowed.
 *
 * @param {HTMLElement} el element whose only content is the number text
 * @param {object} [opts]
 * @param {number} [opts.to] final value (default `el.dataset.countup`)
 * @param {number} [opts.decimals=0] fixed decimals (default `el.dataset.countupDecimals` or 0)
 * @param {number} [opts.from=0]
 * @param {string} [opts.prefix='']
 * @param {string} [opts.suffix='']
 * @param {number} [opts.duration=1.6] seconds
 * @param {string} [opts.ease='power2.out']
 * @param {number} [opts.delay=0] seconds after the trigger fires (standalone mode)
 * @param {(value: number, decimals: number) => string} [opts.format=formatStat]
 * @param {boolean | { trigger?: Element, start?: string }} [opts.scrollTrigger=true]
 * @returns {gsap.core.Tween}
 */
import { formatStat } from '@/content/landing'
import { deferSetup } from './defer'
import { gsap, ScrollTrigger, useGSAP } from './gsap'
import { MQ, clampStart } from './presets'

const COUNT_START = 'top 85%'

/** Elements that have started counting during this page view. */
const counted = new WeakSet()

/** Replace the element's text, reusing React's text node when it is the only child. */
function writeText(el, text) {
  const node = el.firstChild
  if (node && node.nodeType === 3 && !node.nextSibling) {
    if (node.nodeValue !== text) node.nodeValue = text
  } else {
    el.textContent = text
  }
}

export function countUp(el, opts = {}) {
  const {
    to = Number(el?.dataset.countup),
    decimals = Number(el?.dataset.countupDecimals ?? 0),
    from = 0,
    prefix = '',
    suffix = '',
    duration = 1.6,
    ease = 'power2.out',
    delay = 0,
    format = formatStat,
    scrollTrigger = true,
  } = opts

  const proxy = { v: from }
  const reduce = typeof window !== 'undefined' && window.matchMedia(MQ.reduce).matches
  // Nothing to animate: keep the markup's final value, hand back an inert tween.
  if (!el || !Number.isFinite(to) || reduce || counted.has(el)) {
    return gsap.to(proxy, { v: to, duration: 0, paused: true })
  }

  const scale = 10 ** decimals
  const finalText = prefix + format(to, decimals) + suffix
  let lastStep = null
  let reserved = false

  const write = (v) => {
    // GSAP fires onUpdate for a render at time 0 without onStart, so the first write (whichever
    // callback makes it) reserves the width while the final string is still in place.
    if (!reserved) begin()
    const step = Math.round(v * scale) // only re-format / touch the DOM when the shown value changes
    if (step === lastStep) return
    lastStep = step
    writeText(el, prefix + format(step / scale, decimals) + suffix)
  }
  const begin = () => {
    counted.add(el)
    // The final string is in the element right now: its used width is the widest frame (tabular
    // digits; intermediate values have the same or fewer glyphs).
    el.style.fontVariantNumeric = 'tabular-nums'
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block'
    el.style.minWidth = getComputedStyle(el).width
    reserved = true
  }
  const restore = () => {
    if (reserved) el.style.minWidth = ''
    reserved = false
    lastStep = null
    writeText(el, finalText)
  }

  const tween = gsap.to(proxy, {
    v: to,
    duration,
    ease,
    delay: scrollTrigger ? delay : 0,
    paused: !!scrollTrigger,
    onStart: () => write(from),
    onUpdate: () => write(proxy.v),
    onComplete: restore,
  })

  // Revert of the owning context (unmount / breakpoint / reduced motion) → final text back.
  // ctx.add(fn) runs fn now and keeps its returned function as a revert cleanup.
  gsap.context()?.add(() => restore)

  if (scrollTrigger) {
    const vars = scrollTrigger === true ? {} : scrollTrigger
    const trigger = vars.trigger ?? el
    let armed = true
    const skip = () => {
      armed = false
      counted.add(el)
      tween.kill()
    }
    // Already at / above the viewport bottom at setup: its final value has been painted — keep it.
    if (trigger.getBoundingClientRect().top < window.innerHeight) skip()
    else {
      ScrollTrigger.create({
        trigger,
        start: clampStart(vars.start ?? COUNT_START),
        once: true,
        onEnter: (self) => {
          if (!armed) return
          armed = false
          // Jumped clean past the whole range (anchor / End): nothing to watch, keep the final value.
          if (self.progress >= 1 && !ScrollTrigger.isInViewport(trigger)) skip()
          else tween.play()
        },
      })
    }
  }

  return tween
}

/**
 * React helper for below-the-fold numbers: counts every `[data-countup]` element inside
 * `scopeRef.current` (or the scope itself), reading `to` / `decimals` from `data-countup` /
 * `data-countup-decimals` unless given in `opts`. All of them share the scope as trigger (so a row
 * starts together with the scope's entrance). Set up after first paint (deferSetup), inside
 * gsap.matchMedia (desktop / mobile; nothing under reduced motion), cleaned up on unmount.
 *
 * @param {{ current: HTMLElement | null }} scopeRef
 * @param {Parameters<typeof countUp>[1]} [opts] shared countUp options
 */
export function useCountUp(scopeRef, opts = {}) {
  useGSAP(
    (context, contextSafe) => {
      const scope = scopeRef.current
      if (!scope) return undefined
      const mm = gsap.matchMedia()
      const cancel = deferSetup(
        contextSafe(() => {
          mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
            const els = scope.matches('[data-countup]') ? [scope] : Array.from(scope.querySelectorAll('[data-countup]'))
            const st = opts.scrollTrigger
            els.forEach((el) =>
              countUp(el, {
                ...opts,
                scrollTrigger: st === false ? false : { trigger: scope, ...(typeof st === 'object' ? st : {}) },
              }),
            )
          })
        }),
      )
      return () => {
        cancel()
        mm.revert()
      }
    },
    { scope: scopeRef },
  )
}

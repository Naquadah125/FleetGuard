/**
 * Deferred animation setup: keeps below-the-fold GSAP work (SplitText, matchMedia, timelines,
 * ScrollTriggers) off the critical path so the first paint and LCP are not blocked by it.
 *
 * deferSetup(callback) queues `callback` to run after the first paint. Queued callbacks run in
 * FIFO order across every caller, ONE callback per task (each in its own requestIdleCallback
 * with a ~600ms timeout, or a setTimeout fallback where rIC is missing), so no single long task
 * builds every section at once. Returns `cancel()`, which drops the callback if it has not run
 * yet (a no-op afterwards).
 *
 * Pattern — wrap the callback in useGSAP's `contextSafe` so everything it creates belongs to the
 * component's context and is reverted on unmount, and return `cancel` as the cleanup so an
 * unmount before the callback runs never builds anything:
 *
 * ```jsx
 * import { useGSAP } from '@/lib/motion/gsap'
 * import { deferSetup } from '@/lib/motion/defer'
 *
 * useGSAP((ctx, contextSafe) => {
 *   const cancel = deferSetup(contextSafe(() => {
 *     const mm = gsap.matchMedia()
 *     mm.add(MQ.desktop, () => { gsap.from('.card', { y: 24, scrollTrigger: revealTrigger(...) }) })
 *   }))
 *   return cancel
 * }, { scope: rootRef })
 * ```
 *
 * Notes:
 * - Only use it for content that starts below the fold: the element is painted in its final
 *   state first, and any "from" state is applied when the callback runs (before it scrolls in).
 * - ScrollTriggers created late are measured on creation; each callback that creates triggers
 *   gets a batched ScrollTrigger.refresh() once the queue drains, so earlier triggers (e.g. pins)
 *   account for anything added after them.
 */
import { ScrollTrigger } from './gsap'

const IDLE_TIMEOUT = 600

/** @type {{ fn: () => void }[]} */
const queue = []
let painted = false
let waitingForPaint = false
let scheduled = false
let needsRefresh = false

const hasWindow = typeof window !== 'undefined'
const ric = hasWindow && typeof window.requestIdleCallback === 'function'
  ? (cb) => window.requestIdleCallback(cb, { timeout: IDLE_TIMEOUT })
  : (cb) => setTimeout(cb, 1)

function schedule() {
  if (scheduled || !queue.length) return
  scheduled = true
  ric(runOne)
}

function runOne() {
  scheduled = false
  const entry = queue.shift()
  if (entry) {
    const before = ScrollTrigger.getAll().length
    try {
      entry.fn()
    } catch (err) {
      // One broken section must not stall the rest of the queue.
      console.error('[deferSetup]', err)
    }
    if (ScrollTrigger.getAll().length !== before) needsRefresh = true
  }
  if (queue.length) {
    schedule()
  } else if (needsRefresh) {
    needsRefresh = false
    ScrollTrigger.refresh()
  }
}

function afterFirstPaint() {
  if (painted || waitingForPaint) return
  waitingForPaint = true
  // rAF fires before the next paint; the task queued from inside it runs after that paint.
  requestAnimationFrame(() => {
    setTimeout(() => {
      painted = true
      waitingForPaint = false
      schedule()
    }, 0)
  })
}

/** Outstanding holdDefer() handles (e.g. HomePage still mounting its below-the-fold sections). */
let holds = 0

// Dev-only: verification scripts wait for the queue to drain before counting triggers.
if (import.meta.env.DEV && hasWindow && window.__fg) {
  window.__fg.deferPending = () => queue.length + (scheduled || waitingForPaint ? 1 : 0) + holds
}

/**
 * Mark deferred work that is not in the queue yet (e.g. sections whose mount — and therefore
 * whose deferSetup calls — is still scheduled), so `window.__fg.deferPending()` (dev) does not
 * report 0 before it lands. Returns `release()` (idempotent).
 * @returns {() => void}
 */
export function holdDefer() {
  holds++
  let held = true
  return () => {
    if (!held) return
    held = false
    holds--
  }
}

/**
 * Run `callback` in a new task after the next paint (rAF, then a 0ms timeout — the task queued
 * from inside the rAF runs after that frame is painted). Returns `cancel()`.
 * @param {() => void} callback
 * @returns {() => void}
 */
export function afterNextPaint(callback) {
  if (!hasWindow) return () => {}
  let timer = 0
  const raf = requestAnimationFrame(() => {
    timer = setTimeout(callback, 0)
  })
  return () => {
    cancelAnimationFrame(raf)
    clearTimeout(timer)
  }
}

/**
 * Run `callback` after first paint, one queued callback per task, FIFO across all callers.
 * @param {() => void} callback
 * @returns {() => void} cancel — removes the callback if it has not run yet
 */
export function deferSetup(callback) {
  if (!hasWindow) return () => {}
  const entry = { fn: callback }
  queue.push(entry)
  if (painted) schedule()
  else afterFirstPaint()
  return () => {
    const i = queue.indexOf(entry)
    if (i !== -1) queue.splice(i, 1)
  }
}

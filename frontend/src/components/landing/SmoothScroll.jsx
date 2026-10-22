import { useRef } from 'react'
import { gsap, ScrollSmoother, useGSAP } from '@/lib/motion/gsap'
import { MQ } from '@/lib/motion/presets'
import { HEADER_OFFSET, scrollToSection } from '@/lib/motion/scroll'

/** Keep focused controls this far below the fixed header (matches `scroll-padding-top`). */
const FOCUS_MARGIN = 16

/**
 * Page-level smooth scroll + parallax. Renders `#smooth-wrapper > #smooth-content`; on desktop
 * (MQ.desktop: ≥1024px, no reduced motion) it creates a ScrollSmoother with `effects: true`, so
 * every `data-speed` / `data-lag` inside the content becomes a parallax layer. On touch-sized
 * screens and under prefers-reduced-motion the wrappers are plain divs and scrolling is native
 * (`scroll-padding-top` in index.css keeps focused elements clear of the fixed header there).
 *
 * Fixed UI (the navbar, Sheet portals) must live outside this component: #smooth-content is
 * transformed while the smoother runs, which would break `position: fixed` inside it.
 *
 * The smoother is created inside `ctx.ignore()`: ScrollSmoother.create() runs a global
 * ScrollTrigger.refresh() synchronously, and any trigger callback fired during it would otherwise
 * attach its owner's gsap.context (e.g. the Navbar's) to this media query's context — which
 * then gets reverted (killing those triggers for good) when MQ.desktop stops matching.
 *
 * While the smoother runs, keyboard focus that lands under the fixed header or below the
 * viewport (e.g. reverse Tab) scrolls the focused element to the centre (WCAG 2.4.11).
 *
 * Also honours a section hash on first load (`/#pricing`) once fonts are ready, landing it just
 * below the header. (Font-driven ScrollTrigger refreshes live in lib/motion/gsap.js.)
 *
 * `ready` (default true): the smoother (and the first-load hash jump) is set up only once it is
 * true. HomePage mounts its below-the-fold sections in stages after the first paint and passes
 * `ready` when the last one is in, so the smoother sees every `data-speed` layer at creation —
 * and ScrollSmoother.create() (a synchronous global refresh) stays out of the first-paint path.
 */
export default function SmoothScroll({ children, ready = true }) {
  const wrapperRef = useRef(null)
  const contentRef = useRef(null)

  useGSAP(
    () => {
      if (!ready) return undefined
      const mm = gsap.matchMedia()
      mm.add(MQ.desktop, (ctx) => {
        let smoother
        ctx.ignore(() => {
          smoother = ScrollSmoother.create({
            wrapper: wrapperRef.current,
            content: contentRef.current,
            smooth: 1.1,
            effects: true,
            smoothTouch: false,
            normalizeScroll: false,
          })
        })

        const content = contentRef.current
        const onFocusIn = (event) => {
          const el = event.target
          // Programmatic focus targets (sections focused by scrollToSection) are already being
          // scrolled into place; only correct real keyboard focus.
          if (!(el instanceof Element) || el.getAttribute('tabindex') === '-1') return
          // Logical (not mid-smoothing) viewport position: the content lags behind scrollTop.
          const top = smoother.offset(el, 'top top') - smoother.scrollTop()
          const bottom = top + el.getBoundingClientRect().height
          if (top < HEADER_OFFSET + FOCUS_MARGIN || bottom > window.innerHeight) {
            smoother.scrollTo(el, false, 'center center')
          }
        }
        content.addEventListener('focusin', onFocusIn)

        // Parallax layers that mount / unmount while the smoother runs (e.g. a Float3D placement
        // whose breakpoint range is entered on resize) are added to / dropped from its effects;
        // `effects: true` only reads `data-speed` once, at creation. Only added / removed ELEMENT
        // nodes are inspected (text updates such as count-ups cost a type check).
        const PARALLAX = '[data-speed], [data-lag]'
        const hasParallax = (n) => n.nodeType === 1 && (n.matches(PARALLAX) || n.querySelector(PARALLAX))
        const observer = new MutationObserver((records) => {
          let added = false
          let removed = false
          for (const r of records) {
            for (const n of r.addedNodes) if (!added && hasParallax(n)) added = true
            for (const n of r.removedNodes) if (!removed && hasParallax(n)) removed = true
          }
          if (removed) smoother.effects().forEach((st) => st.trigger?.isConnected || st.kill())
          if (!added) return
          const known = new Set(smoother.effects().map((st) => st.trigger))
          const fresh = [...content.querySelectorAll(PARALLAX)].filter((el) => !known.has(el))
          // Outside any gsap context on purpose (see ctx.ignore above): effects() runs a global
          // refresh; smoother.kill() removes these effects with the rest.
          if (fresh.length) smoother.effects(fresh)
        })
        observer.observe(content, { childList: true, subtree: true })

        return () => {
          observer.disconnect()
          content.removeEventListener('focusin', onFocusIn)
          smoother.kill()
        }
      })

      // Hash on first load: the browser's own anchor jump happens before the smoother and the
      // fonts settle, so redo it once layout is final (instant, header-aware, focus untouched).
      const hashId = decodeURIComponent(window.location.hash.slice(1))
      let cancelled = false
      if (hashId) {
        const fontsReady = document.fonts?.ready ?? Promise.resolve()
        fontsReady.then(() => {
          if (cancelled || !document.getElementById(hashId)) return
          scrollToSection(hashId, { immediate: true, focus: false })
        })
      }

      return () => {
        cancelled = true
        mm.revert()
      }
    },
    { scope: wrapperRef, dependencies: [ready], revertOnUpdate: true },
  )

  return (
    <div id="smooth-wrapper" ref={wrapperRef}>
      <div id="smooth-content" ref={contentRef}>
        {children}
      </div>
    </div>
  )
}

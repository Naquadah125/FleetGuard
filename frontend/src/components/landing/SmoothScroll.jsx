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
 * Child components create their ScrollTriggers / data-speed attributes in their own useGSAP,
 * which React runs before this (parent) effect, so the smoother sees them all at creation.
 */
export default function SmoothScroll({ children }) {
  const wrapperRef = useRef(null)
  const contentRef = useRef(null)

  useGSAP(
    () => {
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

        return () => {
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
    { scope: wrapperRef },
  )

  return (
    <div id="smooth-wrapper" ref={wrapperRef}>
      <div id="smooth-content" ref={contentRef}>
        {children}
      </div>
    </div>
  )
}

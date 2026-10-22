import { useRef } from 'react'
import { gsap, ScrollSmoother, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { MQ } from '@/lib/motion/presets'
import { scrollToSection } from '@/lib/motion/scroll'

/**
 * Page-level smooth scroll + parallax. Renders `#smooth-wrapper > #smooth-content`; on desktop
 * (MQ.desktop: ≥1024px, no reduced motion) it creates a ScrollSmoother with `effects: true`, so
 * every `data-speed` / `data-lag` inside the content becomes a parallax layer. On touch-sized
 * screens and under prefers-reduced-motion the wrappers are plain divs and scrolling is native.
 *
 * Fixed UI (the navbar, Sheet portals) must live outside this component: #smooth-content is
 * transformed while the smoother runs, which would break `position: fixed` inside it.
 *
 * Also: re-measures every ScrollTrigger once web fonts are ready, and honours a section hash
 * on first load (`/#pricing`) after the smoother exists, landing it just below the header.
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
      mm.add(MQ.desktop, () => {
        const smoother = ScrollSmoother.create({
          wrapper: wrapperRef.current,
          content: contentRef.current,
          smooth: 1.1,
          effects: true,
          smoothTouch: false,
          normalizeScroll: false,
        })
        return () => smoother.kill()
      })

      // Hash on first load: the browser's own anchor jump happens before the smoother and the
      // fonts settle, so redo it once layout is final (instant, header-aware).
      const hashId = decodeURIComponent(window.location.hash.slice(1))
      let cancelled = false
      const fontsReady = document.fonts?.ready ?? Promise.resolve()
      fontsReady.then(() => {
        if (cancelled) return
        ScrollTrigger.refresh()
        if (hashId && document.getElementById(hashId)) scrollToSection(hashId, { immediate: true })
      })

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

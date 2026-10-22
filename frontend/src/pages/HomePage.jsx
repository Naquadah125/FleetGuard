import { startTransition, useEffect, useState } from 'react'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import AiDemo from '@/components/landing/AiDemo'
import Pricing from '@/components/landing/Pricing'
import Comparison from '@/components/landing/Comparison'
import Technology from '@/components/landing/Technology'
import Footer from '@/components/landing/Footer'
import SmoothScroll from '@/components/landing/SmoothScroll'
import FloatingContact from '@/components/landing/FloatingContact'
import { afterNextPaint, holdDefer } from '@/lib/motion/defer'

/**
 * Sections after the Hero, in page order. They are part of the main bundle (no lazy chunk: a
 * chunk request on the LCP chain measured worse), but most are NOT in the first React commit:
 * they mount one per task after the first paint. That keeps ~80% of the page's DOM (the AI-demo
 * driver alone is ~1.7k nodes) out of the LCP path and splits the rest into short tasks instead
 * of one long one. Features is in the first commit from 1024px up (it can be on screen at load
 * there: the desktop hero is ~700px tall); on phones / tablets it is below the fold, so it is
 * deferred too. The Footer is the last stage.
 */
const SECTIONS = [Features, AiDemo, Pricing, Comparison, Technology]
const STAGES = SECTIONS.length + 1 // + Footer
const EAGER_FEATURES = '(min-width: 1024px)'

/** First stage: a deep link (`/#pricing`) needs its target in the DOM at once → everything. */
function initialStage() {
  if (typeof window === 'undefined') return 0
  if (window.location.hash.length > 1) return STAGES
  return window.matchMedia(EAGER_FEATURES).matches ? 1 : 0
}

/**
 * Landing page: composition only. Every section owns its layout, background and motion.
 * The fixed Navbar and the floating contact CTA stay outside the ScrollSmoother wrapper (the
 * smoothed content is transformed, which would break `position: fixed`).
 *
 * Mount order: Hero (+ Features ≥1024px) in the first commit; then the remaining sections and the
 * Footer, each after the previous one has painted (`afterNextPaint`, in a transition so input
 * stays responsive). SmoothScroll creates the ScrollSmoother once everything is mounted (`ready`)
 * so it sees every `data-speed` layer; the floating CTA starts its own entrance timer then too.
 * While stages are pending, `holdDefer()` keeps the dev `deferPending()` hook above 0.
 */
export default function HomePage() {
  const [stage, setStage] = useState(initialStage)
  const ready = stage >= STAGES

  useEffect(() => {
    if (ready) return undefined
    const release = holdDefer()
    const cancel = afterNextPaint(() => startTransition(() => setStage((s) => s + 1)))
    return () => {
      cancel()
      release()
    }
  }, [ready, stage])

  return (
    <>
      <Navbar />
      <SmoothScroll ready={ready}>
        {/* id + tabIndex: target of the navbar's skip link (focusable, not a Tab stop). */}
        <main id="main" tabIndex={-1}>
          <Hero />
          {SECTIONS.slice(0, stage).map((Section, i) => (
            // Append-only list in a fixed order: the index is a stable key.
            <Section key={i} />
          ))}
        </main>
        {ready ? <Footer /> : null}
      </SmoothScroll>
      {ready ? <FloatingContact /> : null}
    </>
  )
}

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

/**
 * Landing page: composition only. Every section owns its layout, background and motion.
 * The fixed Navbar and the floating contact CTA stay outside the ScrollSmoother wrapper (the
 * smoothed content is transformed, which would break `position: fixed`).
 */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <SmoothScroll>
        {/* id + tabIndex: target of the navbar's skip link (focusable, not a Tab stop). */}
        <main id="main" tabIndex={-1}>
          <Hero />
          <Features />
          <AiDemo />
          <Pricing />
          <Comparison />
          <Technology />
        </main>
        <Footer />
      </SmoothScroll>
      <FloatingContact />
    </>
  )
}

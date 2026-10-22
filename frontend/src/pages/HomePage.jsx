import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import AiDemo from '@/components/landing/AiDemo'
import Pricing from '@/components/landing/Pricing'
import Comparison from '@/components/landing/Comparison'
import Technology from '@/components/landing/Technology'
import Footer from '@/components/landing/Footer'
import SmoothScroll from '@/components/landing/SmoothScroll'

/**
 * Landing page: composition only. Every section owns its layout, background and motion.
 * The fixed Navbar stays outside the ScrollSmoother wrapper (the smoothed content is
 * transformed, which would break `position: fixed`).
 */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <SmoothScroll>
        <main>
          <Hero />
          <Features />
          <AiDemo />
          <Pricing />
          <Comparison />
          <Technology />
        </main>
        <Footer />
      </SmoothScroll>
    </>
  )
}

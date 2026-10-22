// Dev-only preview for SedanCar3Q + BoxTruck3Q: /preview-vehicles.html on the Vite dev server.
// Not part of the production build (vite build only bundles index.html).
// `#stage` is a 1440×517 replica of the mockup's pricing crop (mock-pricing-1440.png) with the
// vehicles at the mockup's positions, for side-by-side screenshots. `?still` disables the demo motion.
import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { gsap } from 'gsap'
import SedanCar3Q from '@/components/illustrations/SedanCar3Q.jsx'
import BoxTruck3Q from '@/components/illustrations/BoxTruck3Q.jsx'

const STILL = new URLSearchParams(window.location.search).has('still')

/** Demo of the intended idle: body bob, shadow breathing, glint pulse (pivots from the JSDoc). */
function useDemoMotion(ref, shadowOrigin) {
  useEffect(() => {
    if (STILL) return undefined
    const ctx = gsap.context(() => {
      const svgs = ref.current.querySelectorAll('svg')
      svgs.forEach((svg, i) => {
        const p = (n) => svg.querySelector(`[data-part="${n}"]`)
        gsap.to(p('body'), { y: -1.5, duration: 0.45 + i * 0.05, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        gsap.to(p('shadow'), { scale: 0.97, svgOrigin: shadowOrigin, duration: 0.45 + i * 0.05, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        gsap.fromTo(p('glint'), { opacity: 0.4 }, { opacity: 1, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 1.4 })
      })
    }, ref)
    return () => ctx.revert()
  }, [ref, shadowOrigin])
}

function Row({ Comp, name, origin }) {
  const ref = useRef(null)
  useDemoMotion(ref, origin)
  return (
    <section ref={ref} style={{ display: 'flex', gap: 32, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 32 }}>
      {[480, 240, 120].map((w) => (
        <figure key={w} style={{ margin: 0, textAlign: 'center' }}>
          <div style={{ background: '#C8D8E4', borderRadius: 16, padding: 16 }}>
            <Comp style={{ width: w, display: 'block' }} title={w === 480 ? name : undefined} />
          </div>
          <figcaption style={{ fontSize: 12, marginTop: 6 }}>{name} · {w}px</figcaption>
        </figure>
      ))}
    </section>
  )
}

const cardStyle = { position: 'absolute', background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(13,34,50,.08)' }

/* Placement derived from the mockup crop: sedan viewBox → left 155 top 368 w 127; truck → left 1074.5 top 364 w 188.7. */
function Stage() {
  return (
    <div id="stage" style={{ position: 'relative', width: 1440, height: 517, overflow: 'hidden', background: '#F9FBFC' }}>
      <svg viewBox="0 0 1440 517" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        <path d="M0 360 C120 340 260 330 420 330 L1020 330 C1180 330 1320 320 1440 300 L1440 517 L0 517 Z" fill="#C9D9E4" />
        <path d="M0 470 C200 460 300 450 420 448" stroke="#fff" strokeWidth="3" strokeDasharray="26 22" />
      </svg>
      <SedanCar3Q style={{ position: 'absolute', left: 155, top: 368, width: 127 }} />
      <BoxTruck3Q style={{ position: 'absolute', left: 1074.5, top: 364, width: 188.7 }} />
      <div style={{ ...cardStyle, left: 300, top: 137, width: 391, height: 357 }} />
      <div style={{ ...cardStyle, left: 724, top: 136, width: 398, height: 361, border: '1.5px solid #22A55A' }} />
    </div>
  )
}

function App() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>SedanCar3Q + BoxTruck3Q</h1>
      <Row Comp={SedanCar3Q} name="SedanCar3Q" origin="150 190" />
      <Row Comp={BoxTruck3Q} name="BoxTruck3Q" origin="200 214" />
      <Stage />
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

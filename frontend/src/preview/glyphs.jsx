// Dev-only preview of the Features glyph set: /preview-glyphs.html on the Vite dev server.
// Not part of the production build (vite build only bundles index.html).
//   ?still   no motion (style screenshots)
// The 1440-wide "mock" board places the tiles exactly where they sit in .tmp/cmp/mock-features-1440.png
// (tiles 80 px at x 107 / 516 / 933, y 117 / 274), so a screenshot of it can be compared crop-for-crop.
// `window.__setRef(dataUrl)` shows the design crop (design-features.png / mock) in the reference slot
// (the shot script injects it — .tmp/ is outside Vite's served root).
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { gsap } from 'gsap'
import { FEATURE_GLYPHS, FEATURE_GLYPH_TILES } from '@/components/illustrations/feature-glyphs/index.js'
import '@fontsource-variable/plus-jakarta-sans'

const STILL = new URLSearchParams(window.location.search).has('still')
const KEYS = ['bell', 'pin', 'chart', 'plug', 'lock', 'headset']
const POS = { bell: [107, 117], pin: [516, 117], chart: [933, 117], plug: [107, 274], lock: [516, 274], headset: [933, 274] }

function Tile({ k, size = 80, glyph = Math.round(size * 0.55), bg = FEATURE_GLYPH_TILES[k], style }) {
  const G = FEATURE_GLYPHS[k]
  return (
    <div
      data-tile={k}
      style={{ width: size, height: size, borderRadius: size * 0.225, background: bg, display: 'grid', placeItems: 'center', ...style }}
    >
      <G style={{ width: glyph, height: glyph, overflow: 'visible' }} />
    </div>
  )
}

/* Demo motion using the documented pivots (the section agent wires the real thing via bindIdle). */
const IDLE = {
  bell: (p) => [
    gsap.to(p('body'), { keyframes: [{ rotation: 12 }, { rotation: -9 }, { rotation: 6 }, { rotation: -3 }, { rotation: 0 }], svgOrigin: '16 2.6', duration: 1, ease: 'sine.inOut', repeat: -1, repeatDelay: 2.4 }),
    gsap.to(p('clapper'), { keyframes: [{ x: -1.2 }, { x: 1 }, { x: -0.6 }, { x: 0 }], duration: 1, ease: 'sine.inOut', repeat: -1, repeatDelay: 2.4 }),
  ],
  pin: (p) => [
    gsap.to(p('pin'), { keyframes: [{ y: -2.4, scaleY: 1.04 }, { y: 0, scaleY: 0.94 }, { scaleY: 1 }], svgOrigin: '16 30', duration: 0.9, ease: 'sine.inOut', repeat: -1, repeatDelay: 1.8 }),
    gsap.to(p('dot'), { scale: 0.78, svgOrigin: '16 12.4', duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  ],
  chart: (p) => [
    ...[8.7, 16, 23.3].map((cx, i) =>
      gsap.fromTo(p(`bar-${i + 1}`), { scaleY: 1, svgOrigin: `${cx} 28.3` }, { scaleY: 0.78, svgOrigin: `${cx} 28.3`, duration: 1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.22 }),
    ),
    gsap.fromTo(p('trend').querySelectorAll('path'), { strokeDasharray: '1 2', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', repeat: -1, repeatDelay: 2.4 }),
  ],
  plug: (p) => [
    gsap.fromTo(p('plug'), { y: -2.2 }, { y: 0, duration: 0.5, ease: 'back.out(3)', repeat: -1, repeatDelay: 2.2 }),
    gsap.to(p('prongs'), { scaleY: 1.08, svgOrigin: '16 9.7', duration: 0.18, yoyo: true, repeat: 1, repeatDelay: 0, delay: 0.45, ease: 'sine.out' }),
  ],
  lock: (p) => [
    gsap.to(p('shackle'), { keyframes: [{ y: -2.4, duration: 0.35 }, { y: -2.4, duration: 0.4 }, { y: 0, duration: 0.25, ease: 'power3.in' }], repeat: -1, repeatDelay: 2.2 }),
    gsap.to(p('body'), { keyframes: [{ rotation: 0, duration: 1 }, { rotation: -6 }, { rotation: 5 }, { rotation: 0 }], svgOrigin: '16 21', duration: 1.4, repeat: -1, repeatDelay: 1.6 }),
  ],
  headset: (p) => [
    gsap.to(p('cups'), { scale: 1.06, svgOrigin: '16 19.4', duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    gsap.to(p('mic'), { rotation: 8, svgOrigin: '25.6 24', duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  ],
}

function MotionRow() {
  const ref = useRef(null)
  const [run, setRun] = useState(0)
  useEffect(() => {
    if (STILL) return
    const tweens = []
    ref.current.querySelectorAll('[data-tile]').forEach((tile, i) => {
      const k = tile.dataset.tile
      const svg = tile.querySelector('svg')
      const p = (name) => svg.querySelector(`[data-part="${name}"]`)
      tweens.push(gsap.fromTo(svg, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2.4)', delay: i * 0.08 }))
      tweens.push(...IDLE[k](p))
    })
    return () => tweens.forEach((t) => t.revert())
  }, [run])
  return (
    <section>
      <h2 style={{ fontSize: 16 }}>
        Motion demo (pop-in + idle via documented pivots){' '}
        <button type="button" onClick={() => setRun((n) => n + 1)}>replay</button>
      </h2>
      <div ref={ref} style={{ display: 'flex', gap: 24 }}>
        {KEYS.map((k) => <Tile key={k} k={k} />)}
      </div>
    </section>
  )
}

function App() {
  const [ref, setRef] = useState(null)
  useEffect(() => {
    window.__setRef = setRef
  }, [])
  return (
    <div style={{ padding: 0 }}>
      <div id="mock" style={{ position: 'relative', width: 1440, height: 417, background: '#F9FBFE' }}>
        {KEYS.map((k) => (
          <Tile key={k} k={k} style={{ position: 'absolute', left: POS[k][0], top: POS[k][1] }} />
        ))}
      </div>
      <div style={{ padding: 24, display: 'grid', gap: 32 }}>
        <section>
          <h2 style={{ fontSize: 16 }}>Ours (80 px tile, 44 px glyph) vs design crop</h2>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div id="ours" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gap: 24, padding: 12, background: '#F9FBFE' }}>
              {KEYS.map((k) => <Tile key={k} k={k} />)}
            </div>
            {ref ? <img alt="design reference" src={ref} style={{ width: 959 }} /> : <p style={{ color: '#64748B' }}>(reference injected by the shot script)</p>}
          </div>
        </section>
        <section>
          <h2 style={{ fontSize: 16 }}>Sizes — 52 / 64 / 80 px tiles (glyph = 0.55 × tile) and on white</h2>
          {[52, 64, 80].map((s) => (
            <div key={s} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {KEYS.map((k) => <Tile key={k} k={k} size={s} />)}
              {KEYS.map((k) => <Tile key={`w${k}`} k={k} size={s} bg="#FFFFFF" style={{ boxShadow: '0 0 0 1px #E2E8F0' }} />)}
            </div>
          ))}
        </section>
        <MotionRow />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

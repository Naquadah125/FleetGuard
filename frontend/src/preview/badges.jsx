// Dev-only preview of the clay 3D badge set + DriverIllustration: /preview-badges.html on the Vite dev server.
// Not part of the production build (vite build only bundles index.html).
// `?still` renders the rest pose (no idle loops) — use it for style screenshots.
import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { gsap } from 'gsap'
import { BADGES_3D } from '@/components/illustrations/3d/index.js'
import AiChip from '@/components/illustrations/AiChip.jsx'
import DeliveryTruck from '@/components/illustrations/DeliveryTruck.jsx'
import PottedPlant from '@/components/illustrations/PottedPlant.jsx'
import DriverIllustration, { DRIVER_STATES } from '@/components/illustrations/DriverIllustration.jsx'

const STILL = new URLSearchParams(window.location.search).has('still')
const SIZES = [64, 96, 120]
const BGS = [
  ['White', '#FFFFFF', '#334155'],
  ['Mint (brand-50)', '#ECFDF5', '#334155'],
  ['Footer teal', '#0B3B33', '#D1FAE5'],
]

/* Object-specific demo motion, on top of the shared float. `p(name)` = part inside this badge. */
const EXTRA = {
  shield: (p) => [
    gsap.fromTo(p('check'), { strokeDasharray: '1 2', strokeDashoffset: 1.001 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', repeat: -1, repeatDelay: 3.2 }),
  ],
  bell: (p) => [
    gsap.to(p('bell'), { keyframes: [{ rotation: 12 }, { rotation: -9 }, { rotation: 6 }, { rotation: -3 }, { rotation: 0 }], svgOrigin: '60 20', duration: 1, ease: 'sine.inOut', repeat: -1, repeatDelay: 2.6 }),
    gsap.to(p('dot'), { scale: 1.18, svgOrigin: '85 31', duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  ],
  pin: (p) => [
    gsap.fromTo(p('ring'), { scale: 0.5, opacity: 0.9, svgOrigin: '60 110' }, { scale: 1.5, opacity: 0, svgOrigin: '60 110', duration: 1.8, ease: 'power1.out', repeat: -1 }),
    gsap.to(p('core'), { scale: 0.85, svgOrigin: '60 46', duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  ],
  camera: (p) => [
    gsap.to(p('rec'), { opacity: 0.25, duration: 0.5, ease: 'steps(1)', yoyo: true, repeat: -1, repeatDelay: 0.5 }),
    gsap.to(p('iris'), { scale: 0.8, svgOrigin: '52 60', duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  ],
  chart: (p) =>
    [1, 2, 3].map((n) =>
      gsap.fromTo(p(`bar-${n}`), { scaleY: 1, svgOrigin: `${16 + n * 22} 84` }, { scaleY: 0.82, svgOrigin: `${16 + n * 22} 84`, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: n * 0.25 }),
    ),
  steering: (p) => [gsap.fromTo(p('wheel'), { rotation: -18, svgOrigin: '60 56' }, { rotation: 18, svgOrigin: '60 56', duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 })],
  lock: (p) => [gsap.to(p('shackle'), { y: -7, duration: 0.5, ease: 'power2.out', yoyo: true, repeat: -1, repeatDelay: 1.6 })],
  headset: (p) => [gsap.fromTo(p('mic'), { rotation: -5, svgOrigin: '30 84' }, { rotation: 5, svgOrigin: '30 84', duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })],
  truck: (p) => [
    gsap.to([p('wheel-back'), p('wheel-front')], { rotation: 360, svgOrigin: (i) => (i ? '87 88' : '36 88'), duration: 1.2, ease: 'none', repeat: -1 }),
    gsap.to(p('chassis'), { y: -1.5, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  ],
}

/** Shared idle: float y ±8 + tilt ±4° + contact shadow scaled in sync; phase offset per badge. */
function idle(svg, name, i) {
  const p = (part) => svg.querySelector(`[data-part="${part}"]`)
  const phase = (i * 0.37) % 1
  const FLOAT = 2.6
  const tweens = [
    gsap.fromTo(p('body'), { y: 8 }, { y: -8, duration: FLOAT, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    gsap.fromTo(p('shadow'), { scale: 1.06, opacity: 1, svgOrigin: '60 110' }, { scale: 0.78, opacity: 0.55, svgOrigin: '60 110', duration: FLOAT, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    gsap.fromTo(p('body'), { rotation: -4, svgOrigin: '60 60' }, { rotation: 4, svgOrigin: '60 60', duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  ]
  tweens.forEach((t) => t.totalTime(phase * 2 * t.duration()))
  return tweens.concat(EXTRA[name]?.(p) ?? [])
}

function Badges() {
  const ref = useRef(null)
  useEffect(() => {
    if (STILL) return undefined
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ref.current.querySelectorAll('[data-badge]').forEach((svg, i) => idle(svg, svg.dataset.badge, i))
    })
    return () => mm.revert()
  }, [])

  return (
    <div ref={ref}>
      {BGS.map(([label, bg, ink]) => (
        <section key={label} style={{ background: bg, borderRadius: 20, border: '1px solid #E2E8F0', padding: '20px 24px 8px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, margin: '0 0 8px', color: ink }}>{label} — 64 / 96 / 120 px</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '4px 24px' }}>
            {Object.entries(BADGES_3D).map(([name, Badge]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '6px 0 14px' }}>
                <span style={{ width: 64, fontSize: 12, fontWeight: 600, color: ink, alignSelf: 'center' }}>{name}</span>
                {SIZES.map((s) => (
                  <Badge key={s} data-badge={name} style={{ width: s, height: s, display: 'block', overflow: 'visible' }} />
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16 }

function Preview() {
  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 16px 64px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 18px' }}>Clay 3D badges {STILL ? '(rest pose)' : '(idle demo)'}</h1>
      <Badges />

      <h2 style={{ fontSize: 15, margin: '28px 0 10px' }}>Existing set, for style comparison</h2>
      <div style={{ ...card, background: '#ECFDF5', display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' }}>
        <AiChip style={{ width: 120 }} />
        {['shield', 'chart', 'truck'].map((n) => {
          const B = BADGES_3D[n]
          return <B key={n} title={n} style={{ width: 120 }} />
        })}
        <PottedPlant style={{ height: 160 }} />
        <DeliveryTruck style={{ width: 240 }} />
      </div>

      <h2 style={{ fontSize: 15, margin: '28px 0 10px' }}>DriverIllustration — 4 states</h2>
      <div id="drivers" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {DRIVER_STATES.map((s) => (
          <div key={s} style={card}>
            <div style={{ fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>{s}</div>
            <DriverIllustration state={s} />
          </div>
        ))}
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)

// Dev-only preview of the motion library + shared landing pieces: /preview-motion.html
// Shows SectionHeading (center + left), Reveal, and all 10 AnimatedIcon motions in every tone.
// Not part of the production build (vite build only bundles index.html).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlarmClock,
  Bell,
  BrainCircuit,
  ChartNoAxesCombined,
  Cpu,
  Headset,
  Lock,
  MapPin,
  Plug,
  ScanFace,
} from 'lucide-react'
import '@/index.css'
import AnimatedIcon from '@/components/landing/AnimatedIcon'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import { DEMO, FEATURES, FEATURES_HEADING, TECHNOLOGY } from '@/content/landing'

const MOTIONS = [
  ['bell', Bell],
  ['pin', MapPin],
  ['chart', ChartNoAxesCombined],
  ['plug', Plug],
  ['lock', Lock],
  ['headset', Headset],
  ['scan', ScanFace],
  ['brain', BrainCircuit],
  ['chip', Cpu],
  ['clock', AlarmClock],
]
const TONES = ['brand', 'success', 'info', 'violet', 'warning', 'danger']

function Preview() {
  return (
    <main className="container-page flex flex-col gap-16 py-12">
      <SectionHeading title={FEATURES_HEADING} underline />
      <SectionHeading title={DEMO.title} subtitle={DEMO.subtitle} align="left" underline />

      <div data-testid="spacer" className="grid h-[70vh] place-items-center rounded-md border border-dashed border-line text-body text-ink">
        Scroll ↓ — the Reveal block and icon draw-ins trigger at {'"top 80%"'}
      </div>

      <Reveal data-testid="reveal" className="grid gap-6 md:grid-cols-3">
        {FEATURES.slice(0, 3).map((f, i) => (
          <article
            key={f.title}
            data-reveal
            data-icon-trigger
            tabIndex={0}
            className="flex gap-4 rounded-md border border-line bg-white p-5 shadow-card outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <AnimatedIcon icon={MOTIONS[i][1]} motion={f.motion} tone={f.tone} />
            <div>
              <h3 className="text-h4 text-navy">{f.title}</h3>
              <p className="text-body text-ink">{f.desc}</p>
            </div>
          </article>
        ))}
      </Reveal>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 text-navy">AnimatedIcon — 10 motions × 6 tones (hover a tile)</h2>
        {MOTIONS.map(([motion, Icon]) => (
          <div key={motion} data-testid={`row-${motion}`} className="flex flex-wrap items-center gap-3">
            <code className="w-20 text-body text-ink">{motion}</code>
            {TONES.map((tone, i) => (
              <div
                key={tone}
                data-icon-trigger
                data-testid={`icon-${motion}-${tone}`}
                className="flex items-center gap-2 rounded-md border border-line bg-white p-2"
              >
                <AnimatedIcon icon={Icon} motion={motion} tone={tone} container={i % 2 ? 'md' : 'lg'} />
                <span className="w-14 text-body-sm text-ink">{tone}</span>
              </div>
            ))}
          </div>
        ))}
      </section>

      <div data-testid="heading-below">
        <SectionHeading title={TECHNOLOGY.title} subtitle={TECHNOLOGY.description} align="left" underline />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 text-navy">Technology items</h2>
        <div className="flex flex-wrap gap-3">
          {TECHNOLOGY.items.map((t, i) => (
            <div key={t.title} data-icon-trigger className="flex items-center gap-3 rounded-md bg-surface p-3">
              <AnimatedIcon icon={MOTIONS[6 + i][1]} motion={t.motion} tone="brand" container="md" />
              <span className="text-body text-navy">{t.title}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)

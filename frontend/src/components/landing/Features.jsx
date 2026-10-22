import { Bell, ChartNoAxesCombined, Headset, Lock, MapPin, Plug } from 'lucide-react'
import { FEATURES, FEATURES_HEADING } from '@/content/landing'
import AnimatedIcon from '@/components/landing/AnimatedIcon'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'

// Explicit name → component map (keeps lucide tree-shakable; no `import * as Icons`).
const ICONS = { Bell, MapPin, ChartNoAxesCombined, Plug, Lock, Headset }

/**
 * "FleetGuard có thể giúp gì cho bạn?" — 6 feature rows (icon tile + title + description)
 * in a 3 / 2 / 1 column grid. Each row is a `data-icon-trigger`, so hovering anywhere on it
 * plays its icon motion; the row lifts onto a white card on hover.
 * Parallax: two soft mint blobs with `data-speed` (picked up by ScrollSmoother on desktop). Both
 * sit inside the section and use speeds > 1, so they drift away from the clipped top / bottom
 * edges while those edges are on screen (no hard cut against the hero above).
 */
export default function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="relative overflow-hidden bg-white py-20 lg:py-28">
      <div
        aria-hidden="true"
        data-speed="1.1"
        className="pointer-events-none absolute top-8 -left-40 size-[420px] rounded-full bg-brand-100/70 blur-3xl lg:-left-24"
      />
      <div
        aria-hidden="true"
        data-speed="1.15"
        className="pointer-events-none absolute -right-40 bottom-0 size-[360px] rounded-full bg-brand-50 blur-3xl lg:-right-16"
      />

      <div className="relative container-page">
        <SectionHeading id="features-title" title={FEATURES_HEADING} underline />

        <Reveal
          as="ul"
          y={24}
          stagger={0.08}
          className="mt-12 grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4 lg:mt-14 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-8"
        >
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon]
            return (
              // GSAP's reveal writes inline `translate: none` on the <li>, so the CSS hover lift
              // (Tailwind's `translate` property) lives on an inner card element instead.
              <li key={f.title} data-reveal data-icon-trigger className="flex">
                <div className="flex w-full items-start gap-5 rounded-lg bg-transparent p-5 transition-[translate,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:p-6">
                  {Icon ? <AnimatedIcon icon={Icon} motion={f.motion} tone={f.tone} container="lg" /> : null}
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="text-h4 text-navy">{f.title}</h3>
                    <p className="text-body text-ink">{f.desc}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}

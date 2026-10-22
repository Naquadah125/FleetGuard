import { useRef } from 'react'
import { Bell, ChartNoAxesCombined, Headset, Lock, MapPin, Plug } from 'lucide-react'
import { FEATURES, FEATURES_HEADING } from '@/content/landing'
import AnimatedIcon from '@/components/landing/AnimatedIcon'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import SectionBackdrop from '@/components/landing/decor/SectionBackdrop'
import Float3D from '@/components/landing/decor/Float3D'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { deferSetup } from '@/lib/motion/defer'
import { bindIdle } from '@/lib/motion/idle'
import { MQ } from '@/lib/motion/presets'

// Explicit name → component map (keeps lucide tree-shakable; no `import * as Icons`).
const ICONS = { Bell, MapPin, ChartNoAxesCombined, Plug, Lock, Headset }

/** Seconds between two icon "glints" (one tile at a time, so at most one tween runs). */
const GLINT_STEP = 1.4

/**
 * "FleetGuard có thể giúp gì cho bạn?" — 6 feature rows (icon tile + title + description)
 * in a 3 / 2 / 1 column grid. Each row is a `data-icon-trigger`, so hovering anywhere on it
 * plays its icon motion; the row lifts onto a white card on hover.
 * The list bleeds out by the card padding (-mx), so icons align with the page's left edge.
 *
 * Atmosphere: SectionBackdrop variant "mint" (tinted gradient, dot pattern, drifting blobs with
 * parallax); three Float3D clay badges (chart, lock, headset) in the side gutters at different
 * depths (chart + lock beside the heading from md, headset in the left gutter beside the grid from xl —
 * the right gutter is where the fixed contact CTA sits).
 *
 * Idle accent (subtle): the icon tiles "glint" one after another — a small lift + scale on the
 * tile, never on the icon strokes (AnimatedIcon's hover motion owns those). Built after first
 * paint (deferSetup), one timeline `gsap.getById('features-idle')` bound with bindIdle to the
 * list: plays only while the list is on screen and the shared motion pause is off; nothing moves
 * under reduced motion.
 */
export default function Features() {
  const rootRef = useRef(null)

  useGSAP(
    (_ctx, contextSafe) => {
      let unbind = () => {}
      const cancel = deferSetup(
        contextSafe(() => {
          const root = rootRef.current
          const list = root?.querySelector('[data-features-list]')
          if (!list) return
          const mm = gsap.matchMedia()
          mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
            const tiles = gsap.utils.toArray('[data-feature-tile]', list)
            const idle = gsap.timeline({ id: 'features-idle', repeat: -1, repeatDelay: 1.6 })
            tiles.forEach((tile, i) => {
              idle.to(tile, { y: -5, scale: 1.06, duration: 0.45, ease: 'sine.out', yoyo: true, repeat: 1 }, i * GLINT_STEP)
            })
            unbind = bindIdle(idle, list)
            return () => {
              unbind()
              unbind = () => {}
            }
          })
        }),
      )
      return () => {
        cancel()
        unbind()
      }
    },
    { scope: rootRef },
  )

  return (
    <section
      id="features"
      ref={rootRef}
      aria-labelledby="features-title"
      className="relative isolate overflow-hidden pt-10 pb-16 md:pt-12 md:pb-20 lg:pt-14 lg:pb-20"
    >
      <SectionBackdrop variant="mint" />

      <div className="relative container-page">
        <SectionHeading id="features-title" title={FEATURES_HEADING} underline />

        {/* Side-gutter accents: beside the (centred) heading, and next to the grid on wide screens. */}
        <Float3D badge="chart" size={84} depth={1.15} phase={0.15} className="top-[-14px] left-0 lg:left-[4%] xl:left-[6%]" />
        <Float3D badge="lock" size={72} depth={0.9} phase={0.55} className="top-[2px] right-0 lg:right-[5%] xl:right-[8%]" />
        <Float3D badge="headset" size={80} depth={1.2} phase={0.85} className="top-[56%] -left-24 md:hidden xl:block 2xl:-left-28" />

        <Reveal
          as="ul"
          y={24}
          stagger={0.08}
          data-features-list
          className="-mx-4 mt-10 grid grid-cols-1 gap-2 md:-mx-5 md:grid-cols-2 md:gap-4 lg:-mx-6 lg:mt-12 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-6"
        >
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon]
            return (
              // GSAP's reveal writes inline `translate: none` on the <li>, so the CSS hover lift
              // (Tailwind's `translate` property) lives on an inner card element instead.
              <li key={f.title} data-reveal data-icon-trigger className="flex">
                <div className="flex w-full items-start gap-5 rounded-lg bg-transparent p-4 transition-[translate,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-5 lg:p-6">
                  {Icon ? (
                    // The idle glint transforms this wrapper, never AnimatedIcon's own tile.
                    <span data-feature-tile className="inline-flex shrink-0">
                      <AnimatedIcon icon={Icon} motion={f.motion} tone={f.tone} container="2xl" size={32} strokeWidth={1.75} className="max-md:size-16 max-md:rounded-lg" />
                    </span>
                  ) : null}
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

import { useRef } from 'react'
import { FEATURES, FEATURES_HEADING } from '@/content/landing'
import { FEATURE_GLYPHS, FEATURE_GLYPH_TILES } from '@/components/illustrations/feature-glyphs'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import { GLYPH_MOTIONS } from '@/components/landing/featureGlyphMotion'
import { ScrollTrigger, gsap, useGSAP } from '@/lib/motion/gsap'
import { deferSetup } from '@/lib/motion/defer'
import { bindIdle } from '@/lib/motion/idle'
import { MQ, revealTrigger } from '@/lib/motion/presets'

/** Seconds between two idle glyph motions (one glyph at a time). */
const IDLE_STEP = 1.6
/** Rest after the last glyph before the cycle starts again. */
const IDLE_REST = 2.4

// Mockup-scale heading: 25px at 1440 (the shared heading-section stays 32px elsewhere) and a
// 62px underline, ~42px below the cap line.
const HEADING_CLASS =
  'gap-3.5 [&_[data-heading-title]]:text-[22px] md:[&_[data-heading-title]]:text-[24px] lg:[&_[data-heading-title]]:text-[25px] [&_[data-heading-underline]]:w-[62px]'

// Static near-white wash with a faint mint glow (design: no pattern, no floating badges). Mint at the
// very top / bottom edge so it blends into the hero's and the AI demo's backdrops.
const WASH = [
  'radial-gradient(ellipse 42% 60% at 8% 22%, color-mix(in oklab, var(--color-brand-100) 18%, transparent), transparent 70%)',
  'radial-gradient(ellipse 38% 55% at 92% 34%, color-mix(in oklab, var(--color-brand-100) 12%, transparent), transparent 70%)',
  'linear-gradient(to bottom, var(--color-tint-mint) 0, #F5FAFD 32px, #FAFCFE 45%, #FFFFFF calc(100% - 56px), var(--color-tint-mint) 100%)',
].join(', ')

/**
 * "FleetGuard có thể giúp gì cho bạn?" — 6 feature rows (glyph tile + title + description) in a
 * 3 / 2 / 1 column grid, sized to the design mockup at 1440: 80px pastel tiles with filled colored
 * glyphs (FEATURE_GLYPHS, 0.55 × tile = 44px), 16px bold titles, 14px descriptions. The row lifts onto a white
 * card on hover. The list bleeds out by the card padding (-mx), so the tiles align with the page's
 * left edge.
 *
 * Motion (none under reduced motion; set up after first paint with deferSetup):
 * - reveal: the rows rise in (Reveal) and each glyph pops in with a little overshoot;
 * - hover / focus on a row: its glyph plays its micro-motion (GLYPH_MOTIONS: the bell rings, the
 *   pin hops, the bars regrow, the plug wiggles in, the lock clicks, the headset pulses);
 * - idle: one glyph at a time plays the same micro-motion — a metronome timeline
 *   `gsap.getById('features-idle')` bound with bindIdle to the list (in view only, MotionPause).
 */
export default function Features() {
  const rootRef = useRef(null)

  useGSAP(
    (_ctx, contextSafe) => {
      let unbind = () => {}
      const cancel = deferSetup(
        contextSafe(() => {
          const list = rootRef.current?.querySelector('[data-features-list]')
          if (!list) return
          const mm = gsap.matchMedia()
          mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
            const items = gsap.utils.toArray('[data-feature]', list)
            const wraps = items.map((li) => li.querySelector('[data-feature-glyph]'))
            const micro = items.map((li, i) => {
              const svg = wraps[i]?.querySelector('svg')
              const make = GLYPH_MOTIONS[li.dataset.feature]
              return svg && make ? make(svg, gsap) : null
            })
            const play = (i) => {
              const tl = micro[i]
              if (tl && !tl.isActive()) tl.restart()
            }

            // Glyph pop-in, a beat after the row's own rise (skipped when already on screen).
            if (!ScrollTrigger.isInViewport(list)) {
              gsap.from(wraps.filter(Boolean), {
                scale: 0.3,
                rotation: -16,
                opacity: 0,
                duration: 0.7,
                ease: 'back.out(2.2)',
                stagger: 0.08,
                delay: 0.18,
                scrollTrigger: revealTrigger(list),
              })
            }

            const offs = items.map((li, i) => {
              const onEnter = () => play(i)
              li.addEventListener('pointerenter', onEnter)
              li.addEventListener('focusin', onEnter)
              return () => {
                li.removeEventListener('pointerenter', onEnter)
                li.removeEventListener('focusin', onEnter)
              }
            })

            const idle = gsap.timeline({ id: 'features-idle', repeat: -1 })
            items.forEach((_li, i) => idle.call(play, [i], 0.4 + i * IDLE_STEP))
            idle.to({}, { duration: IDLE_REST }, 0.4 + items.length * IDLE_STEP)
            unbind = bindIdle(idle, list)

            return () => {
              offs.forEach((off) => off())
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
      className="relative isolate overflow-hidden pt-10 pb-12 md:pt-12 md:pb-12 lg:pt-9 lg:pb-9"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: WASH }} />

      <div className="relative container-page">
        <SectionHeading id="features-title" title={FEATURES_HEADING} underline className={HEADING_CLASS} />

        <Reveal
          as="ul"
          y={24}
          stagger={0.08}
          data-features-list
          className="-mx-4 mt-6 grid grid-cols-1 gap-1 md:-mx-5 md:mt-5 md:grid-cols-2 md:gap-x-4 md:gap-y-2 lg:-mx-6 lg:mt-4 lg:grid-cols-3 lg:gap-x-0 lg:gap-y-4"
        >
          {FEATURES.map((f) => {
            const Glyph = FEATURE_GLYPHS[f.icon]
            return (
              // GSAP's reveal writes inline `translate: none` on the <li>, so the CSS hover lift
              // (Tailwind's `translate` property) lives on an inner card element instead.
              <li key={f.title} data-reveal data-feature={f.icon} className="flex">
                <div className="flex w-full items-start gap-5 rounded-lg bg-transparent p-4 transition-[translate,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-5 lg:p-6">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-16 shrink-0 items-center justify-center rounded-[14px] md:size-20 md:rounded-[18px]"
                    style={{ backgroundColor: FEATURE_GLYPH_TILES[f.icon] }}
                  >
                    {Glyph ? (
                      <span data-feature-glyph className="inline-flex">
                        <Glyph className="size-[35px] md:size-11" />
                      </span>
                    ) : null}
                  </span>
                  <div className="-mt-1 flex min-w-0 max-w-[224px] flex-col gap-2">
                    <h3 className="text-[16px] leading-6 font-bold text-navy">{f.title}</h3>
                    <p className="text-[14px] leading-[22.5px] text-ink/85">{f.desc}</p>
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

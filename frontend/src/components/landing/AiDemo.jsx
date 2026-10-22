import { useRef, useState } from 'react'
import { DEMO } from '@/content/landing'
import { cn } from '@/lib/utils'
import { deferSetup } from '@/lib/motion/defer'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ, revealTrigger } from '@/lib/motion/presets'
import SectionHeading from '@/components/landing/SectionHeading'
import ScenarioCard from '@/components/landing/demo/ScenarioCard'
import { createIdle } from '@/components/landing/demo/driverMotion'
import MotionPauseButton from './MotionPauseButton'
import { isMotionPaused, onMotionPauseChange } from './motionPause'

/** Section wash: near-white mint like the mockup; ends match the Features / Pricing seams. */
const WASH = [
  'radial-gradient(ellipse 60% 55% at 50% 0%, color-mix(in oklab, var(--color-brand-100) 35%, transparent), transparent 70%)',
  'linear-gradient(to bottom, var(--color-tint-mint), var(--color-tint-50) 38%, var(--color-tint-50) 72%, var(--color-tint-sky))',
].join(',')

/**
 * "AI giám sát như thế nào?" — 4 driver scenario cards shown side by side (horizontal
 * scroll-snap carousel on phones). Matches the design mockup (Phase 7): plain white cards, no
 * floating badges, no pattern, compact heading (26 px at md+).
 *
 * Motion (desktop + mobile matchMedia branches, nothing under reduced motion):
 *  - cards reveal with a stagger on enter;
 *  - every card runs its own idle loop (driverMotion.createIdle), only while the section is in view;
 *  - an "active" highlight — only a subtle lift + deeper shadow, no border / bar / marker —
 *    auto-cycles through the cards every DEMO.cycleSeconds. The timer is a paused dummy tween
 *    (onComplete → next card) in the GSAP context, so it dies with it (StrictMode double mount /
 *    unmount safe — no setInterval);
 *  - hover / focus-within a card makes it active and pauses the cycle; leaving resumes it;
 *  - the shared motion pause (small round icon button right-aligned under the cards, WCAG 2.2.2)
 *    stops the cycle and the idle loops until resumed; keyboard focus on a phone-carousel card
 *    scrolls it to the centre.
 * Setup is deferred (deferSetup) — the section starts below the fold.
 * React state only mirrors the active index (aria-current + CSS lift / shadow); the timelines are
 * built once and never recreated on index changes.
 * Reduced motion: no cycle, no idle, first card statically active.
 */
export default function AiDemo() {
  const sectionRef = useRef(null)
  const [active, setActive] = useState(0)
  const scenarios = DEMO.scenarios

  useGSAP(
    (context, contextSafe) => {
      const section = sectionRef.current
      const list = section.querySelector('[data-demo-list]')
      const cards = Array.from(section.querySelectorAll('[data-demo-card]'))
      const items = Array.from(list.querySelectorAll(':scope > [data-reveal]'))

      const mm = gsap.matchMedia()
      const build = contextSafe(() => {
        mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
          const n = cards.length
          let current = 0
          let hovered = null
          let focused = null
          let inView = false

          // Card reveal.
          gsap.from(items, {
            opacity: 0,
            y: 32,
            duration: DUR.base,
            ease: EASE.out,
            stagger: 0.1,
            scrollTrigger: revealTrigger(list),
          })

          // Idle loops, one per card (paused until the section is in view).
          const idles = cards.map((card, i) =>
            createIdle(card.querySelector('[data-part="root"]'), scenarios[i].state, gsap),
          )

          // Cycle timer: a dummy tween whose onComplete moves the highlight on.
          const timer = gsap.to({}, {
            duration: DEMO.cycleSeconds,
            paused: true,
            onComplete: () => activate((current + 1) % n),
          })

          const sync = () => {
            const live = inView && !isMotionPaused()
            timer.paused(!(live && hovered === null && focused === null))
            idles.forEach((tl) => tl.paused(!live))
          }
          const offPause = onMotionPauseChange(sync)

          function activate(i) {
            if (i !== current) {
              current = i
              setActive(i)
              timer.pause(0)
            }
            sync()
          }

          setActive(0)

          // Only animate while the section is on screen.
          ScrollTrigger.create({
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            onToggle: (self) => {
              inView = self.isActive
              sync()
            },
          })

          // Hover / focus takeover.
          const off = []
          const on = (el, type, fn) => {
            el.addEventListener(type, fn)
            off.push(() => el.removeEventListener(type, fn))
          }
          cards.forEach((card, i) => {
            on(card, 'pointerenter', () => {
              hovered = i
              activate(i)
            })
            on(card, 'pointerleave', () => {
              hovered = null
              if (focused !== null) activate(focused)
              else sync()
            })
            on(card, 'focusin', (e) => {
              // Keyboard focus only: a mouse click also focuses the card (tabIndex=0) and must not
              // leave the cycle paused after the pointer has left.
              if (!e.target.matches(':focus-visible')) return
              focused = i
              activate(i)
              // Phone carousel: bring the focused card to the centre (the browser's own focus scroll
              // leaves it mostly off-screen under snap-mandatory).
              if (list.scrollWidth > list.clientWidth + 1) {
                // Absolute target (content offset is invariant mid-scroll), so it overrides the
                // browser's own focus scroll instead of adding to it.
                const c = card.getBoundingClientRect()
                const l = list.getBoundingClientRect()
                const left = c.left - l.left + list.scrollLeft + c.width / 2 - list.clientWidth / 2
                list.scrollTo({ left, behavior: 'smooth' })
              }
            })
            on(card, 'focusout', (e) => {
              if (card.contains(e.relatedTarget)) return
              focused = null
              if (hovered !== null) activate(hovered)
              else sync()
            })
          })

          return () => {
            offPause()
            off.forEach((fn) => fn())
            setActive(0)
          }
        })
      })
      const cancel = deferSetup(build)
      return () => {
        cancel()
        mm.revert()
      }
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="demo"
      aria-labelledby="demo-title"
      // isolate: keeps the wash's -z-10 layer inside the section. Bottom padding is tight on
      // purpose — Pricing follows on a matching tint (seam tint-sky), no pale empty band between them.
      className="relative isolate overflow-hidden pt-16 pb-8 md:pt-20 md:pb-10"
    >
      <div aria-hidden="true" data-backdrop="demo" className="pointer-events-none absolute inset-0 -z-10" style={{ background: WASH }} />

      <div className="relative container-page">
        <SectionHeading
          id="demo-title"
          title={DEMO.title}
          subtitle={DEMO.subtitle}
          // Mockup scale (1440): 26 px heading, 16 px subtitle with a hair of tracking, 8 px apart.
          // Local override — the shared heading-section utility stays as is.
          className="gap-2 md:[&_[data-heading-title]]:text-[26px] [&_[data-heading-subtitle]]:tracking-[0.015em]"
        />

        <ul
          role="list"
          data-demo-list
          className={cn(
            // phones: horizontal scroll-snap carousel, edge to edge, scrollbar hidden
            '-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pt-3 pb-5',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // tablet 2 cols, desktop 4 cols; xl: the mockup's 1200 px row (267 px cards, 44 px gaps)
            'md:mx-0 md:mt-8 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pt-2 md:pb-0',
            'lg:grid-cols-4 lg:gap-6 xl:-mx-8 xl:mt-6 xl:gap-11',
          )}
        >
          {scenarios.map((s, i) => (
            <ScenarioCard key={s.state} scenario={s} index={i} active={active === i} />
          ))}
        </ul>

        {/* WCAG 2.2.2 pause for the auto-cycle + idle loops: a small, discreet icon button tucked
            under the row's right edge so it doesn't read as part of the design (44 px hit area). */}
        <div className="mt-1 flex justify-end md:mt-3 xl:-mr-8">
          <MotionPauseButton variant="icon" className="border-[#DCEFEA] bg-white/80" />
        </div>
      </div>
    </section>
  )
}

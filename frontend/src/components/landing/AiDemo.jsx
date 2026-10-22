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

// Soft blob = radial gradient (no blur filter: nothing to re-raster while scrolling).
const blob = (alpha) => ({
  background: `radial-gradient(closest-side, color-mix(in oklab, var(--color-brand-100) ${alpha}%, transparent) 35%, transparent)`,
})

/**
 * "AI giám sát như thế nào?" — 4 driver scenario cards shown side by side (horizontal
 * scroll-snap carousel on phones).
 *
 * Motion (desktop + mobile matchMedia branches, nothing under reduced motion):
 *  - cards reveal with a stagger on enter;
 *  - every card runs its own idle loop (driverMotion.createIdle), only while the section is in view;
 *  - an "active" highlight auto-cycles through the cards every DEMO.cycleSeconds. The timer IS the
 *    active card's progress-bar tween (onComplete → next card), so it lives in the GSAP context and
 *    dies with it (StrictMode double mount / unmount safe — no setInterval);
 *  - hover / focus-within a card makes it active and pauses the cycle; leaving resumes it;
 *  - the shared motion pause (button under the heading, WCAG 2.2.2) stops the cycle and the idle
 *    loops until resumed; keyboard focus on a phone-carousel card scrolls it to the centre.
 * Setup is deferred (deferSetup) — the section starts below the fold.
 * React state only mirrors the active index (aria-current + CSS lift / border / shadow); the
 * timelines are built once and never recreated on index changes.
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

          // Badge pop-in per card (played forward on activate, reversed fast on deactivate).
          const pops = cards.map((card) =>
            gsap.fromTo(
              card.querySelector('[data-demo-badge]'),
              { autoAlpha: 0, scale: 0.4 },
              { autoAlpha: 1, scale: 1, duration: 0.5, ease: EASE.spring, paused: true },
            ),
          )

          // Progress bar per card = the cycle timer.
          const bars = cards.map((card, i) =>
            gsap.fromTo(
              card.querySelector('[data-demo-progress]'),
              { scaleX: 0 },
              {
                scaleX: 1,
                duration: DEMO.cycleSeconds,
                ease: 'none',
                paused: true,
                onComplete: () => activate((i + 1) % n),
              },
            ),
          )

          const sync = () => {
            const live = inView && !isMotionPaused()
            bars[current].paused(!(live && hovered === null && focused === null))
            idles.forEach((tl) => tl.paused(!live))
          }
          const offPause = onMotionPauseChange(sync)

          function activate(i) {
            if (i !== current) {
              pops[current].timeScale(2.5).reverse()
              bars[current].pause(0)
              current = i
              setActive(i)
              pops[i].timeScale(1).play()
              bars[i].pause(0)
            }
            sync()
          }

          pops[0].progress(1)
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
      className="relative overflow-hidden bg-linear-to-b from-brand-50/50 via-brand-50 to-brand-50/40 py-16 md:py-20"
    >
      {/* soft mint glows */}
      <div
        aria-hidden="true"
        data-speed="0.85"
        className="pointer-events-none absolute -top-40 -left-40 size-[30rem] rounded-full"
        style={blob(60)}
      />
      <div
        aria-hidden="true"
        data-speed="1.1"
        className="pointer-events-none absolute -right-36 -bottom-16 size-[26rem] rounded-full"
        style={blob(50)}
      />

      <div className="relative container-page">
        <SectionHeading id="demo-title" title={DEMO.title} subtitle={DEMO.subtitle} />
        <div className="mt-6 flex justify-center">
          <MotionPauseButton />
        </div>

        <ul
          role="list"
          data-demo-list
          className={cn(
            // phones: horizontal scroll-snap carousel, edge to edge, scrollbar hidden
            '-mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pt-4 pb-6',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // tablet 2 cols, desktop 4 cols
            'md:mx-0 md:mt-8 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-2',
            'lg:grid-cols-4 lg:gap-5 xl:gap-6',
          )}
        >
          {scenarios.map((s, i) => (
            <ScenarioCard key={s.state} scenario={s} index={i} active={active === i} />
          ))}
        </ul>
      </div>
    </section>
  )
}

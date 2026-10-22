import { useRef, useState } from 'react'
import { DEMO } from '@/content/landing'
import { cn } from '@/lib/utils'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ, clampStart } from '@/lib/motion/presets'
import SectionHeading from '@/components/landing/SectionHeading'
import ScenarioCard from '@/components/landing/demo/ScenarioCard'
import { createIdle } from '@/components/landing/demo/driverMotion'

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
 *  - hover / focus-within a card makes it active and pauses the cycle; leaving resumes it.
 * React state only mirrors the active index (aria-current + CSS lift / border / shadow); the
 * timelines are built once and never recreated on index changes.
 * Reduced motion: no cycle, no idle, first card statically active.
 */
export default function AiDemo() {
  const sectionRef = useRef(null)
  const [active, setActive] = useState(0)
  const scenarios = DEMO.scenarios

  useGSAP(
    () => {
      const section = sectionRef.current
      const list = section.querySelector('[data-demo-list]')
      const cards = Array.from(section.querySelectorAll('[data-demo-card]'))
      const items = Array.from(list.querySelectorAll(':scope > [data-reveal]'))

      const mm = gsap.matchMedia()
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
          scrollTrigger: { trigger: list, start: clampStart(), once: true },
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
          const run = inView && hovered === null && focused === null
          bars[current].paused(!run)
        }

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
            idles.forEach((tl) => (inView ? tl.play() : tl.pause()))
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
          })
          on(card, 'focusout', (e) => {
            if (card.contains(e.relatedTarget)) return
            focused = null
            if (hovered !== null) activate(hovered)
            else sync()
          })
        })

        return () => {
          off.forEach((fn) => fn())
          setActive(0)
        }
      })
      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="demo"
      aria-labelledby="demo-title"
      className="relative overflow-hidden bg-linear-to-b from-brand-50/50 via-brand-50 to-brand-50/40 py-16 md:py-20 lg:py-24"
    >
      {/* soft mint glows */}
      <div
        aria-hidden="true"
        data-speed="0.85"
        className="pointer-events-none absolute -top-24 -left-24 size-[22rem] rounded-full bg-brand-100/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        data-speed="1.1"
        className="pointer-events-none absolute -right-20 bottom-0 size-[18rem] rounded-full bg-brand-100/50 blur-3xl"
      />

      <div className="relative container-page">
        <SectionHeading id="demo-title" title={DEMO.title} subtitle={DEMO.subtitle} />

        <ul
          role="list"
          data-demo-list
          className={cn(
            // phones: horizontal scroll-snap carousel, edge to edge, scrollbar hidden
            '-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pt-4 pb-6',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // tablet 2 cols, desktop 4 cols
            'md:mx-0 md:mt-12 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-2',
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

import { useRef } from 'react'
import { AlarmClock, BrainCircuit, Cpu, ScanFace } from 'lucide-react'
import { STATS, TECHNOLOGY, formatStat } from '@/content/landing'
import { Button } from '@/components/ui/button'
import AiChip from '@/components/illustrations/AiChip'
import CitySkyline from '@/components/illustrations/CitySkyline'
import AnimatedIcon from '@/components/landing/AnimatedIcon'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import { deferSetup } from '@/lib/motion/defer'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ, revealTrigger } from '@/lib/motion/presets'
import { scrollToSection } from '@/lib/motion/scroll'
import { cn } from '@/lib/utils'
import { loopWhileVisible } from './motionPause'

// Explicit name → component map (keeps lucide tree-shakable; no `import * as Icons`).
const ICONS = { ScanFace, BrainCircuit, Cpu, AlarmClock }

// CitySkyline layer → ScrollSmoother speed. Rendered statically on each layer <svg> (ScrollSmoother
// reads data-speed when it is created); inert where no smoother runs (mobile, reduced motion).
const SKYLINE_SPEEDS = { 'layer-back': '0.6', 'layer-mid': '0.8', 'layer-front': '0.95' }

const statText = (s) => (s.text ?? formatStat(s.value, s.decimals ?? 0)) + (s.suffix ?? '')

/** Update a React-rendered number without replacing its text node (React keeps its reference). */
function setText(el, text) {
  if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = text
  else el.textContent = text
}

/**
 * "Công nghệ AI tiên tiến" — title + description + CTA on the left, 4 tech items on the right,
 * StatsBar at the bottom, CitySkyline behind. Motion (desktop + mobile, never under reduce;
 * built after first paint via deferSetup): AiChip traces draw in (strokeDashoffset on
 * pathLength=1) + glow pulse (while on screen and not paused), StatsBar scales in and counts up.
 * The skyline renders as three stacked <svg> layers; on desktop each gets `data-speed` for
 * ScrollSmoother parallax (composited HTML-level transforms, no SVG re-raster per frame).
 */
export default function Technology() {
  const ref = useRef(null)

  useGSAP(
    (context, contextSafe) => {
      const root = ref.current
      const mm = gsap.matchMedia()

      const build = contextSafe(() => {
        mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
          // AiChip: traces draw in once, glow breathes while the chip is on screen.
          const chip = root.querySelector('[data-tech-chip]')
          let offLoop = () => {}
          if (chip) {
            gsap.fromTo(
              chip.querySelectorAll('[data-part="traces"] > *'),
              { strokeDasharray: '1 2', strokeDashoffset: 1.001 },
              { strokeDashoffset: 0, duration: DUR.base, ease: EASE.out, stagger: 0.04, scrollTrigger: revealTrigger(chip) },
            )
            const glow = gsap.fromTo(
              chip.querySelector('[data-part="glow"]'),
              { scale: 0.86, opacity: 0.55, svgOrigin: '80 80' }, // AiChip viewBox center
              { scale: 1.08, opacity: 1, svgOrigin: '80 80', duration: 1.6, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true },
            )
            offLoop = loopWhileVisible(chip, [glow], ScrollTrigger)
          }

          // StatsBar: scale in from 0.96, then numbers count up from 0 to their final value.
          // The final text is server-rendered; it is only reset to 0 here (motion allowed).
          const bar = root.querySelector('[data-stats-bar]')
          const nums = Array.from(root.querySelectorAll('[data-stat-value]'))
          if (!bar) return offLoop
          const tl = gsap.timeline({ scrollTrigger: revealTrigger(bar, 'top 85%') })
          tl.from(bar, { scale: 0.96, opacity: 0, duration: DUR.base, ease: EASE.out })
          tl.from(bar.querySelectorAll('[data-stat]'), { opacity: 0, y: 12, duration: DUR.base, ease: EASE.out, stagger: 0.08 }, 0.1)
          nums.forEach((el) => {
            const value = Number(el.dataset.value)
            const decimals = Number(el.dataset.decimals)
            const counter = { v: 0 }
            setText(el, formatStat(0, decimals))
            tl.to(
              counter,
              {
                v: value,
                duration: 1.6,
                ease: 'power2.out',
                onUpdate: () => setText(el, formatStat(counter.v, decimals)),
              },
              0.15,
            )
          })
          // Restore the final values when this branch reverts (unmount, breakpoint → reduce).
          return () => {
            offLoop()
            nums.forEach((el) => setText(el, formatStat(Number(el.dataset.value), Number(el.dataset.decimals))))
          }
        })
      })
      const cancel = deferSetup(build)

      return () => {
        cancel()
        mm.revert()
      }
    },
    { scope: ref },
  )

  const onCta = (e) => {
    e.preventDefault()
    scrollToSection('demo')
  }

  return (
    <section
      ref={ref}
      id="technology"
      aria-labelledby="technology-title"
      className="relative overflow-hidden bg-linear-to-b from-surface/70 to-white pt-20 pb-14 lg:pt-20 lg:pb-20"
    >
      <CitySkyline
        layered
        layerSpeeds={SKYLINE_SPEEDS}
        data-tech-skyline
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(10rem,20vw,18rem)] w-full opacity-75"
      />

      <div className="relative container-page">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
          <div className="flex flex-col items-start gap-5">
            <AiChip data-tech-chip className="-mb-1 -ml-2 size-16 lg:size-[72px]" />
            <SectionHeading
              id="technology-title"
              align="left"
              title={TECHNOLOGY.title}
              subtitle={TECHNOLOGY.description}
              className="max-w-md"
            />
            <Reveal className="mt-2">
              <div data-reveal>
                <Button asChild variant="outline" size="lg" className="px-8">
                  <a href="#demo" onClick={onCta}>
                    {TECHNOLOGY.cta}
                  </a>
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal as="ul" y={24} stagger={0.08} className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 sm:gap-x-6">
            {TECHNOLOGY.items.map((item) => {
              const Icon = ICONS[item.icon]
              return (
                <li key={item.title} data-reveal data-icon-trigger className="flex flex-col items-center gap-3 text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-white shadow-card">
                    {Icon ? <AnimatedIcon icon={Icon} motion={item.motion} tone="brand" container="lg" size={28} strokeWidth={1.75} /> : null}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-body font-bold text-navy">{item.title}</h3>
                    <p className="text-body text-ink md:text-body-sm">{item.desc}</p>
                  </div>
                </li>
              )
            })}
          </Reveal>
        </div>

        <StatsBar className="mt-14 lg:mt-16" />
      </div>
    </section>
  )
}

/** Gradient bar with 4 figures (2×2 on mobile). Values carry data-* for the count-up above. */
function StatsBar({ className }) {
  return (
    <div
      data-stats-bar
      className={cn(
        // brand-dark → brand-darker: white labels stay ≥ 5.6:1 everywhere on the gradient (AA).
        'relative mx-auto max-w-[840px] overflow-hidden rounded-xl bg-linear-to-b from-brand-dark to-brand-darker px-2 py-3 text-white shadow-card-hover sm:px-4 lg:py-4',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/15 via-transparent to-transparent"
      />
      <ul className="relative grid grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <li key={s.label} data-stat className="relative flex flex-col items-center gap-1 px-3 py-4 text-center lg:py-3">
            <p className="text-h2 font-extrabold tabular-nums">
              <span aria-hidden="true">
                {s.text ?? (
                  <span data-stat-value data-value={s.value} data-decimals={s.decimals ?? 0}>
                    {formatStat(s.value, s.decimals ?? 0)}
                  </span>
                )}
                {s.suffix}
              </span>
              <span className="sr-only">{statText(s)}</span>
            </p>
            <p className="text-body text-white">{s.label}</p>
            {/* Divider rules: right edge (cols 1 & 3 on mobile, 1–3 on desktop), bottom edge (top row on mobile). */}
            {i < STATS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1/2 right-0 h-12 w-px -translate-y-1/2 bg-white/20',
                  i % 2 === 1 && 'hidden lg:block',
                )}
              />
            ) : null}
            {i < 2 ? (
              <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-white/20 lg:hidden" />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

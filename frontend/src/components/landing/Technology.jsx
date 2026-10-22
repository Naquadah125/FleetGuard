import { useRef } from 'react'
import { AlarmClock, BrainCircuit, Cpu, ScanFace } from 'lucide-react'
import { STATS, TECHNOLOGY, formatStat } from '@/content/landing'
import { Button } from '@/components/ui/button'
import AiChip from '@/components/illustrations/AiChip'
import CitySkyline from '@/components/illustrations/CitySkyline'
import AnimatedIcon from '@/components/landing/AnimatedIcon'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ, revealTrigger } from '@/lib/motion/presets'
import { scrollToSection } from '@/lib/motion/scroll'
import { cn } from '@/lib/utils'

// Explicit name → component map (keeps lucide tree-shakable; no `import * as Icons`).
const ICONS = { ScanFace, BrainCircuit, Cpu, AlarmClock }

// CitySkyline layer → ScrollSmoother speed (desktop only; inert until ScrollSmoother runs).
const SKYLINE_SPEEDS = { 'layer-back': '0.6', 'layer-mid': '0.8', 'layer-front': '0.95' }

const statText = (s) => (s.text ?? formatStat(s.value, s.decimals ?? 0)) + (s.suffix ?? '')

/**
 * "Công nghệ AI tiên tiến" — title + description + CTA on the left, 4 tech items on the right,
 * StatsBar at the bottom, CitySkyline behind. Motion (desktop + mobile, never under reduce):
 * AiChip traces draw in + glow pulse, StatsBar scales in and counts up. Skyline layers get
 * `data-speed` on desktop for ScrollSmoother parallax.
 */
export default function Technology() {
  const ref = useRef(null)

  useGSAP(
    () => {
      const root = ref.current
      const mm = gsap.matchMedia()

      mm.add(MQ.desktop, () => {
        const skyline = root.querySelector('[data-tech-skyline]')
        const layers = Object.entries(SKYLINE_SPEEDS)
          .map(([part, speed]) => {
            const el = skyline?.querySelector(`[data-part="${part}"]`)
            el?.setAttribute('data-speed', speed)
            return el
          })
          .filter(Boolean)
        return () => layers.forEach((el) => el.removeAttribute('data-speed'))
      })

      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
        // AiChip: traces draw in once, glow breathes while the chip is on screen.
        const chip = root.querySelector('[data-tech-chip]')
        if (chip) {
          gsap.from(chip.querySelectorAll('[data-part="traces"] > *'), {
            drawSVG: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: 0.04,
            scrollTrigger: revealTrigger(chip),
          })
          gsap.fromTo(
            chip.querySelector('[data-part="glow"]'),
            { scale: 0.86, opacity: 0.55, transformOrigin: '50% 50%' },
            {
              scale: 1.08,
              opacity: 1,
              duration: 1.6,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
              scrollTrigger: {
                trigger: chip,
                start: 'top bottom',
                end: 'bottom top',
                toggleActions: 'play pause resume pause',
              },
            },
          )
        }

        // StatsBar: scale in from 0.96, then numbers count up from 0 to their final value.
        // The final text is server-rendered; it is only reset to 0 here (motion allowed).
        const bar = root.querySelector('[data-stats-bar]')
        const nums = Array.from(root.querySelectorAll('[data-stat-value]'))
        if (!bar) return undefined
        const tl = gsap.timeline({ scrollTrigger: revealTrigger(bar, 'top 85%') })
        tl.from(bar, { scale: 0.96, opacity: 0, duration: DUR.base, ease: EASE.out })
        tl.from(bar.querySelectorAll('[data-stat]'), { opacity: 0, y: 12, duration: DUR.base, ease: EASE.out, stagger: 0.08 }, 0.1)
        nums.forEach((el) => {
          const value = Number(el.dataset.value)
          const decimals = Number(el.dataset.decimals)
          const counter = { v: 0 }
          el.textContent = formatStat(0, decimals)
          tl.to(
            counter,
            {
              v: value,
              duration: 1.6,
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent = formatStat(counter.v, decimals)
              },
            },
            0.15,
          )
        })
        // Restore the final values when this branch reverts (unmount, breakpoint → reduce).
        return () =>
          nums.forEach((el) => {
            el.textContent = formatStat(Number(el.dataset.value), Number(el.dataset.decimals))
          })
      })

      return () => mm.revert()
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
      className="relative overflow-hidden bg-linear-to-b from-surface/70 to-white pt-20 pb-14 lg:pt-24 lg:pb-20"
    >
      <CitySkyline
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
                <Button asChild variant="outline" size="lg" className="rounded-full px-8">
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
                    {Icon ? <AnimatedIcon icon={Icon} motion={item.motion} tone="brand" container="md" /> : null}
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
        'relative mx-auto max-w-[840px] overflow-hidden rounded-xl bg-linear-to-b from-brand to-brand-dark to-60% px-2 py-3 text-white shadow-card-hover sm:px-4 lg:py-4',
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
            <p className="text-body text-white/85 md:text-body-sm">{s.label}</p>
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

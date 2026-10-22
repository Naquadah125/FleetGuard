import { useRef } from 'react'
import { AlarmClock, BrainCircuit, Cpu, ScanFace } from 'lucide-react'
import { STATS, TECHNOLOGY, formatStat } from '@/content/landing'
import { Button } from '@/components/ui/button'
import AiChip from '@/components/illustrations/AiChip'
import CitySkyline from '@/components/illustrations/CitySkyline'
import AnimatedIcon from '@/components/landing/AnimatedIcon'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import { useCountUp } from '@/lib/motion/countUp'
import { deferSetup } from '@/lib/motion/defer'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { bindIdle } from '@/lib/motion/idle'
import { DUR, EASE, MQ, revealTrigger } from '@/lib/motion/presets'
import { scrollToSection } from '@/lib/motion/scroll'
import { cn } from '@/lib/utils'
import Float3D from './decor/Float3D'
import SectionBackdrop from './decor/SectionBackdrop'

// Explicit name → component map (keeps lucide tree-shakable; no `import * as Icons`).
const ICONS = { ScanFace, BrainCircuit, Cpu, AlarmClock }

// CitySkyline layer → ScrollSmoother speed. Rendered statically on each layer <svg> (ScrollSmoother
// reads data-speed when it is created); inert where no smoother runs (mobile, reduced motion).
const SKYLINE_SPEEDS = { 'layer-back': '0.6', 'layer-mid': '0.8', 'layer-front': '0.95' }

// Idle drift per skyline layer: [amplitude px, half-period s]. Nearer layers travel further and
// faster (depth). The skyline box overhangs the section by 3rem each side (clipped by the section's
// overflow-hidden), so ±amplitude never exposes an edge.
const SKYLINE_DRIFT = { 'layer-back': [10, 26], 'layer-mid': [18, 20], 'layer-front': [30, 15] }

// AiChip traces in clockwise order (top → right → bottom → left), for the signal sweep. Indices
// follow AiChip's TRACES / PADS arrays (top 0–2, bottom 3–5, left 6–8, right 9–11).
const TRACE_SWEEP = [0, 1, 2, 9, 10, 11, 5, 4, 3, 8, 7, 6]
const SWEEP_RANK = TRACE_SWEEP.reduce((rank, trace, i) => ((rank[trace] = i), rank), [])

const statText = (s) => (s.text ?? formatStat(s.value, s.decimals ?? 0)) + (s.suffix ?? '')

/**
 * "Công nghệ AI tiên tiến" — title + description + CTA on the left, 4 tech items on the right,
 * StatsBar at the bottom, CitySkyline behind, on the `technology` SectionBackdrop (navy/ink text
 * only on it — brand-coloured text fails AA where its violet/info glows overlap).
 * Motion (desktop + mobile, never under reduce; built after first paint via deferSetup):
 * AiChip traces draw in (strokeDashoffset on pathLength=1), then idle while on screen and not
 * paused (bindIdle): a clockwise signal sweep over the traces/pads + glow breathing; the skyline
 * layers drift sideways at different paces; StatsBar scales in while its numbers count up
 * (StatsBar's own useCountUp, same 'top 85%' trigger).
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
        mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, (mctx) => {
          const { desktop } = mctx.conditions
          const unbind = []

          // AiChip: traces draw in once; then, while the chip is on screen, a signal sweeps round
          // the traces (opacity dip + pad blink, clockwise) and the glow breathes.
          const chip = root.querySelector('[data-tech-chip]')
          if (chip) {
            const traceGroup = chip.querySelector('[data-part="traces"]')
            const paths = gsap.utils.toArray('path', traceGroup)
            const pads = gsap.utils.toArray('circle', traceGroup)
            gsap.fromTo(
              traceGroup.children,
              { strokeDasharray: '1 2', strokeDashoffset: 1.001 },
              // autoRound off: GSAP rounds px by default, which would snap a 0–1 (pathLength) offset.
              { strokeDashoffset: 0, duration: DUR.base, ease: EASE.out, stagger: 0.04, autoRound: false, scrollTrigger: revealTrigger(chip) },
            )
            const sweep = (i) => SWEEP_RANK[i] * 0.09
            const chipIdle = gsap.timeline()
            chipIdle.fromTo(
              chip.querySelector('[data-part="glow"]'),
              { scale: 0.86, opacity: 0.55, svgOrigin: '80 80' }, // AiChip viewBox center
              { scale: 1.08, opacity: 1, svgOrigin: '80 80', duration: 1.6, ease: 'sine.inOut', repeat: -1, yoyo: true },
              0,
            )
            const signal = gsap.timeline({ repeat: -1, repeatDelay: 1.1, delay: 0.8 })
            signal
              .to(paths, { keyframes: [{ opacity: 0.3, duration: 0.22 }, { opacity: 1, duration: 0.4 }], ease: 'sine.inOut', stagger: sweep }, 0)
              .to(pads, { keyframes: [{ scale: 1.45, duration: 0.22 }, { scale: 1, duration: 0.4 }], transformOrigin: '50% 50%', ease: 'sine.inOut', stagger: sweep }, 0.12)
            chipIdle.add(signal, 0)
            unbind.push(bindIdle(chipIdle, chip))
          }

          // CitySkyline: each layer drifts sideways at its own pace (on top of the ScrollSmoother
          // parallax on y, desktop). One timeline, gated by the skyline being on screen.
          const skyline = root.querySelector('[data-tech-skyline]')
          if (skyline) {
            const amp = desktop ? 1 : 0.6
            const drift = gsap.timeline()
            // Phase offsets: layer i starts (i × 0.6) half-periods into its swing, so the layers are
            // never in step. Children sit at (lead − offset) and the playhead starts at `lead`.
            const layers = Object.entries(SKYLINE_DRIFT).map(([part, [px, half]], i) => ({
              el: skyline.querySelector(`[data-part="${part}"]`),
              px: px * amp,
              half,
              offset: i * 0.6 * half,
            }))
            const lead = Math.max(...layers.map((l) => l.offset))
            layers.forEach(({ el, px, half, offset }) => {
              if (!el) return
              drift.fromTo(el, { x: -px }, { x: px, duration: half, ease: 'sine.inOut', repeat: -1, yoyo: true }, lead - offset)
            })
            drift.time(lead)
            unbind.push(bindIdle(drift, skyline))
          }

          // StatsBar entrance: scale in from 0.96 and fade the figures in. Their count-up (StatsBar's
          // useCountUp) fires on the same 'top 85%' line, so a number resets to 0 while it is hidden.
          const bar = root.querySelector('[data-stats-bar]')
          if (bar) {
            const tl = gsap.timeline({ scrollTrigger: revealTrigger(bar, 'top 85%') })
            tl.from(bar, { scale: 0.96, opacity: 0, duration: DUR.base, ease: EASE.out })
            tl.from(bar.querySelectorAll('[data-stat]'), { opacity: 0, y: 12, duration: DUR.base, ease: EASE.out, stagger: 0.08 }, 0.1)
          }
          return () => unbind.forEach((off) => off())
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
      className="relative isolate overflow-hidden pt-20 pb-14 lg:pt-20 lg:pb-20"
    >
      <SectionBackdrop variant="technology" />
      {/* Overhangs the section by 3rem a side (clipped) so the layers' sideways drift never shows an edge. */}
      <CitySkyline
        layered
        layerSpeeds={SKYLINE_SPEEDS}
        data-tech-skyline
        className="pointer-events-none absolute -inset-x-12 bottom-0 h-[clamp(10rem,20vw,18rem)] opacity-75"
      />
      {/* 3D accents. xl+ only: camera and chart flank the stats bar (it leaves a ≥ 150px gutter each
          side) at different heights, depths and phases so they never move in step. md–lg: none (the
          only free corner is top-right, which the parallax / contact CTA cross). Phones: a small
          camera beside the AI chip. */}

      <div className="relative container-page">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
          <div className="relative flex flex-col items-start gap-5">
            <Float3D badge="camera" mobile size={56} phase={0.1} className="top-1 left-28" />
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
                    <p className="text-body text-ink md:text-body-sm xl:text-body">{item.desc}</p>
                  </div>
                </li>
              )
            })}
          </Reveal>
        </div>

        <div className="relative mt-14 lg:mt-16">
          <Float3D badge="chart" from="xl" size={104} depth={0.9} phase={0.55} className="top-1/2 -mt-16 right-[calc(50%+440px)]" />
          <Float3D badge="camera" from="xl" size={96} depth={1.1} phase={0.1} className="-top-16 left-[calc(50%+444px)]" />
          <StatsBar />
        </div>
      </div>
    </section>
  )
}

/**
 * Gradient bar with 4 figures (2×2 on mobile). Numeric figures count up (useCountUp → countUp,
 * `[data-countup]`); the visible figure is aria-hidden and a single sr-only copy carries the final
 * value, so assistive tech reads each figure once. `[data-stat-number]` marks the value line.
 */
function StatsBar({ className }) {
  const ref = useRef(null)
  useCountUp(ref)
  return (
    <div
      ref={ref}
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
            <p data-stat-number className="text-h2 font-extrabold tabular-nums">
              <span aria-hidden="true">
                {s.text ?? (
                  <span data-countup={s.value} data-countup-decimals={s.decimals ?? 0} className="inline-block text-right">
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

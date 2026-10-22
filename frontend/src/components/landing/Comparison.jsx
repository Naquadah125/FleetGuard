import { useEffect, useRef, useState } from 'react'
import { Minus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PottedPlant from '@/components/illustrations/PottedPlant'
import SectionHeading from '@/components/landing/SectionHeading'
import SectionBackdrop from '@/components/landing/decor/SectionBackdrop'
import Float3D from '@/components/landing/decor/Float3D'
import { COMPARISON } from '@/content/landing'
import { deferSetup } from '@/lib/motion/defer'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { bindIdle } from '@/lib/motion/idle'
import { DUR, EASE, MQ, revealTrigger } from '@/lib/motion/presets'
import { cn } from '@/lib/utils'

// The plant is only displayed at xl (≥1280px), so its sway only runs there.
const MQ_PLANT = '(min-width: 1280px) and (prefers-reduced-motion: no-preference)'
// PottedPlant: the stem base (viewBox units) — the whole plant sways around it.
const PLANT_BASE = '100 207'

/** Lucide "check" path with pathLength=1, so it draws with a strokeDashoffset tween. */
function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path data-check pathLength="1" d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function Availability({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand text-white">
        <CheckMark />
        <span className="sr-only">{COMPARISON.yes}</span>
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex size-6 items-center justify-center text-ink-subtle">
        <Minus aria-hidden="true" className="size-4" strokeWidth={2.5} />
        <span className="sr-only">{COMPARISON.no}</span>
      </span>
    )
  }
  return <span className="text-body font-medium text-navy">{value}</span>
}

/**
 * Comparison (#comparison): feature table Cơ bản vs Nâng cao.
 * One scroll container (the shadcn table's own wrapper is flattened): on phones the table is
 * 420px wide, the feature column sticks, value cells are start-aligned so the "Nâng cao" column
 * visibly peeks in, and a right-edge fade shows until the end is reached. The scroller is a named,
 * focusable region (keyboard scrolling). A potted plant sits left of the table at xl
 * (data-speed parallax; leaves sway while on screen unless motion is paused).
 * Motion (deferred setup, below the fold): rows reveal with a stagger, check marks draw in
 * (strokeDashoffset on pathLength=1). Static under reduced motion.
 */
export default function Comparison() {
  const ref = useRef(null)
  const scrollRef = useRef(null)
  const [moreRight, setMoreRight] = useState(false)
  const [featureCol, basicCol, advancedCol] = COMPARISON.columns

  // Right-edge fade: visible while the table overflows and is not scrolled to its end.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const update = () => setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  useGSAP(
    (context, contextSafe) => {
      const root = ref.current
      const mm = gsap.matchMedia()

      const build = contextSafe(() => {
        const table = root.querySelector('[data-comparison-table]')
        const rows = table.querySelectorAll('tbody tr')
        const checks = table.querySelectorAll('[data-check]')

        mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
          gsap
            .timeline({ scrollTrigger: revealTrigger(table) })
            .from(rows, { opacity: 0, y: 16, duration: DUR.base, ease: EASE.out, stagger: 0.07 })
            .fromTo(
              checks,
              { strokeDasharray: '1 2', strokeDashoffset: 1.001 },
              // autoRound off: GSAP rounds these to whole units by default, which snaps a pathLength=1 draw.
              { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out', stagger: 0.04, autoRound: false },
              0.25,
            )
        })

        mm.add(MQ_PLANT, () => {
          const plant = root.querySelector('[data-plant]')
          if (!plant) return undefined
          const leaves = plant.querySelector('[data-part="leaves"]')
          const leaf = plant.querySelectorAll('[data-part^="leaf-"]')
          const sway = gsap
            .timeline({ paused: true, repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } })
            .fromTo(leaves, { rotation: -2.5, svgOrigin: PLANT_BASE }, { rotation: 2.5, svgOrigin: PLANT_BASE, duration: 2.6 }, 0)
            .fromTo(
              leaf,
              // each leaf's base is its group's local origin (see PottedPlant JSDoc)
              { rotation: -4, svgOrigin: '0 0' },
              { rotation: 4, svgOrigin: '0 0', duration: 1.3, stagger: { each: 0.12, from: 'end' } },
              0,
            )
          // Continuous sway while the plant is on screen (paused off screen / under MotionPause).
          return bindIdle(sway, plant)
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

  return (
    <section
      ref={ref}
      id="comparison"
      aria-labelledby="comparison-title"
      // isolate: keeps the backdrop's -z-10 layer inside the section. Top padding is tight: the
      // pricing road band above already closes that seam (tint-mist).
      className="relative isolate overflow-hidden pt-12 pb-16 lg:pt-14 lg:pb-20"
    >
      <SectionBackdrop variant="comparison" />

      <div className="container-page relative flex flex-col gap-8">
        <SectionHeading id="comparison-title" title={COMPARISON.title} />

        <div className="relative mx-auto w-full max-w-[880px]">
          <div
            aria-hidden="true"
            data-plant
            data-speed="0.9"
            className="pointer-events-none absolute right-full bottom-0 mr-10 hidden w-36 xl:block"
          >
            <PottedPlant className="h-auto w-full" />
          </div>

          {/* Clay 3D accents right of the table (xl), balancing the plant on the left. Lock + bell:
              Pricing (adjacent) shows the shield, so nothing repeats across the two sections. Both
              stay ≥ 84px from the viewport edge at 1280 (the contact CTA's column). */}
          <Float3D badge="lock" from="xl" size={88} depth={1.12} phase={0.2} className="top-2 left-full ml-6" />
          <Float3D badge="bell" from="xl" size={72} depth={0.9} phase={0.65} className="bottom-10 left-full ml-8" />

          <div
            data-comparison-table
            className="relative overflow-hidden rounded-lg border border-line bg-white shadow-card"
          >
            {/* The only scroller: shadcn's inner table-container is flattened to overflow visible. */}
            <div
              ref={scrollRef}
              role="region"
              aria-label={COMPARISON.scrollLabel}
              tabIndex={0}
              className={cn(
                'overflow-x-auto overflow-y-hidden overscroll-x-contain [&>[data-slot=table-container]]:overflow-visible',
                'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-dark focus-visible:outline-solid',
              )}
            >
              <Table className="min-w-[420px] table-fixed text-body sm:min-w-[560px]">
                <colgroup>
                  <col className="w-[38%]" />
                  <col className="w-[31%]" />
                  <col className="w-[31%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="border-line bg-brand-50 hover:bg-brand-50">
                    <TableHead scope="col" className="h-12 px-4 font-bold text-navy sm:px-5 max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:bg-brand-50 max-sm:shadow-[1px_0_0_var(--color-line)]">
                      {featureCol}
                    </TableHead>
                    <TableHead scope="col" className="h-12 px-4 text-start font-bold text-navy sm:text-center">
                      {basicCol}
                    </TableHead>
                    <TableHead scope="col" className="h-12 px-4 text-start font-bold text-brand-dark sm:text-center">
                      {advancedCol}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPARISON.rows.map(([feature, basic, advanced]) => (
                    <TableRow key={feature} data-reveal className="border-line hover:bg-brand-50/40">
                      <TableHead scope="row" className="h-12 px-4 font-medium whitespace-normal text-ink sm:px-5 max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:bg-white max-sm:shadow-[1px_0_0_var(--color-line)]">
                        {feature}
                      </TableHead>
                      {[basic, advanced].map((value, i) => (
                        <TableCell key={i} className="h-12 px-4 text-start sm:text-center">
                          <Availability value={value} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-white to-transparent transition-opacity duration-200',
                moreRight ? 'opacity-100' : 'opacity-0',
              )}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

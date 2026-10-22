import { useRef } from 'react'
import { Check, Minus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PottedPlant from '@/components/illustrations/PottedPlant'
import SectionHeading from '@/components/landing/SectionHeading'
import { COMPARISON } from '@/content/landing'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ, revealTrigger } from '@/lib/motion/presets'

function Availability({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand text-white">
        <Check aria-hidden="true" data-check className="size-3.5" strokeWidth={3.25} />
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
 * The table scrolls horizontally inside its own rounded container on phones (min-w 560px), so the
 * page never overflows. A potted plant sits left of the table on wide screens (data-speed parallax,
 * leaves sway while on screen).
 * Motion: rows reveal with a stagger, check marks draw in (DrawSVG). Static under reduced motion.
 */
export default function Comparison() {
  const ref = useRef(null)
  const [featureCol, basicCol, advancedCol] = COMPARISON.columns

  useGSAP(
    () => {
      const root = ref.current
      const table = root.querySelector('[data-comparison-table]')
      const rows = table.querySelectorAll('tbody tr')
      const checks = table.querySelectorAll('[data-check] path')
      const mm = gsap.matchMedia()

      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
        gsap
          .timeline({ scrollTrigger: revealTrigger(table) })
          .from(rows, { opacity: 0, y: 16, duration: DUR.base, ease: EASE.out, stagger: 0.07 })
          .from(checks, { drawSVG: '0%', duration: 0.45, ease: 'power2.out', stagger: 0.04 }, 0.25)
      })

      mm.add(MQ.desktop, () => {
        const plant = root.querySelector('[data-plant]')
        if (!plant) return
        const leaves = plant.querySelector('[data-part="leaves"]')
        const leaf = plant.querySelectorAll('[data-part^="leaf-"]')
        const sway = gsap
          .timeline({ paused: true, repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } })
          .fromTo(leaves, { rotation: -2.5, transformOrigin: '50% 100%' }, { rotation: 2.5, duration: 2.6 }, 0)
          .fromTo(
            leaf,
            { rotation: -4, transformOrigin: '50% 100%' },
            { rotation: 4, duration: 1.3, stagger: { each: 0.12, from: 'end' } },
            0,
          )
        ScrollTrigger.create({
          trigger: plant,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => (self.isActive ? sway.play() : sway.pause()),
        })
      })

      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <section ref={ref} id="comparison" className="relative overflow-hidden bg-surface/70 py-16 lg:py-20">
      {/* soft green blobs in the bottom corners (mockup); kept clear of the bottom edge and masked out
          toward it, so the section clip never shows as a hard band against Technology below */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mask-b-from-60% mask-b-to-100%">
        <div className="absolute bottom-6 -left-48 size-[420px] rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute -right-48 bottom-6 size-[460px] rounded-full bg-brand-100/50 blur-3xl" />
      </div>

      <div className="container-page relative flex flex-col gap-8">
        <SectionHeading title={COMPARISON.title} />

        <div className="relative mx-auto w-full max-w-[880px]">
          <div
            aria-hidden="true"
            data-plant
            data-speed="0.9"
            className="pointer-events-none absolute right-full bottom-0 mr-10 hidden w-36 xl:block"
          >
            <PottedPlant className="h-auto w-full" />
          </div>

          <div
            data-comparison-table
            className="relative overflow-x-auto rounded-lg border border-line bg-white shadow-card"
          >
            <Table className="min-w-[560px] table-fixed text-body">
              <colgroup>
                <col className="w-[38%]" />
                <col className="w-[31%]" />
                <col className="w-[31%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="border-line bg-brand-50 hover:bg-brand-50">
                  <TableHead scope="col" className="h-12 px-5 font-bold text-navy max-sm:bg-brand-50 max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:shadow-[1px_0_0_var(--color-line)]">
                    {featureCol}
                  </TableHead>
                  <TableHead scope="col" className="h-12 px-4 text-center font-bold text-navy">
                    {basicCol}
                  </TableHead>
                  <TableHead scope="col" className="h-12 px-4 text-center font-bold text-brand-dark">
                    {advancedCol}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON.rows.map(([feature, basic, advanced]) => (
                  <TableRow key={feature} data-reveal className="border-line hover:bg-brand-50/40">
                    <TableHead scope="row" className="h-12 px-5 font-medium whitespace-normal text-ink max-sm:bg-white max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:shadow-[1px_0_0_var(--color-line)]">
                      {feature}
                    </TableHead>
                    {[basic, advanced].map((value, i) => (
                      <TableCell key={i} className="h-12 px-4 text-center">
                        <Availability value={value} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </section>
  )
}

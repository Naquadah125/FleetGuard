import { useRef, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import BoxTruck3Q from '@/components/illustrations/BoxTruck3Q'
import RoadBand from '@/components/illustrations/RoadBand'
import SedanCar3Q from '@/components/illustrations/SedanCar3Q'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import SectionBackdrop from '@/components/landing/decor/SectionBackdrop'
import PricingCard from '@/components/landing/pricing/PricingCard'
import PricingRoad, { DASH_PERIOD } from '@/components/landing/pricing/PricingRoad'
import { PRICING, pricingAnnouncement } from '@/content/landing'
import { deferSetup } from '@/lib/motion/defer'
import { Flip, gsap, useGSAP } from '@/lib/motion/gsap'
import { bindIdle } from '@/lib/motion/idle'
import { EASE, MQ } from '@/lib/motion/presets'

const ROAD_BAND_DASH = 48 // RoadBand (mobile road) dash rhythm: 26 + 22
const IDLE_LOOP = 2.4 // s — one idle cycle: 2 bobs, 1 glint pulse, 1 dash period

/**
 * Continuous idle while the road is on screen (bindIdle: paused off screen, under MotionPause and
 * reduced motion): both bodies bob on their suspension out of phase (shadows breathe against the
 * bob), headlight / windshield glints pulse, the lane dashes flow. The 3Q wheels are edge-on, so
 * they never spin (SedanCar3Q / BoxTruck3Q contract). 5 tweens.
 */
function roadIdle(decor, dashPeriod) {
  const part = (vehicle, name) => decor.querySelector(`[data-vehicle="${vehicle}"] [data-part="${name}"]`)
  const bob = { y: -1.5, duration: IDLE_LOOP / 4, ease: 'sine.inOut', yoyo: true, repeat: 3 }
  const tl = gsap.timeline({ repeat: -1, paused: true })
  tl.to([part('sedan', 'body'), part('sedan', 'glint')], bob, 0)
    .to([part('truck', 'body'), part('truck', 'glint')], { ...bob, y: -1.2 }, IDLE_LOOP / 8)
    .fromTo(
      [part('sedan', 'shadow'), part('truck', 'shadow')],
      { scaleX: 1 },
      { scaleX: 0.96, duration: IDLE_LOOP / 4, ease: 'sine.inOut', yoyo: true, repeat: 3, transformOrigin: '50% 50%' },
      0,
    )
    .fromTo(
      [part('sedan', 'glint'), part('truck', 'glint')],
      { opacity: 0.4 },
      { opacity: 1, duration: IDLE_LOOP / 2, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.3 },
      0,
    )
    .fromTo(
      decor.querySelector('[data-part="dashes"]'),
      { strokeDashoffset: 0 },
      { strokeDashoffset: -dashPeriod, duration: IDLE_LOOP, ease: 'none', autoRound: false },
      0,
    )
  return tl
}

/**
 * Pricing (#pricing) — design mockup layout: compact heading, white billing pill (savings badge
 * inside it), two plan cards (824px grid at lg) over a wide light-grey curved road, with a white
 * sedan (front three-quarter) on the road at left and a green box truck at right, its cargo box
 * tucked behind the right card.
 * Motion — desktop: the vehicles scrub out from behind the cards as the band enters (sedan down-
 * left, truck down-right). Then, on every size, a continuous idle runs while the road is on screen
 * (bindIdle — paused off screen, under the shared motion pause and under reduced motion): bodies
 * bob, glints pulse, lane dashes flow. Mobile/tablet: a small road + vehicles below the cards.
 * Toggle thumb moves with Flip; prices tween; one polite live region announces both new prices.
 * The road/vehicle setup is deferred (deferSetup) — the section is far below the fold.
 * Reduced motion: everything static and in its final place.
 */
export default function Pricing() {
  const ref = useRef(null)
  const [billing, setBilling] = useState('monthly')
  // Empty until the first change, so nothing is announced on load.
  const [announcement, setAnnouncement] = useState('')
  const flipState = useRef(null)

  const onBillingChange = (value) => {
    // Radix single toggle groups emit '' when the active item is pressed again — keep a selection.
    if (!value || value === billing) return
    const thumb = ref.current?.querySelector('[data-billing-thumb]')
    flipState.current = thumb ? Flip.getState(thumb) : null
    setBilling(value)
    setAnnouncement(pricingAnnouncement(value))
  }

  // Toggle thumb: a one-shot Flip from the previously active item to the new one. No matchMedia
  // (a per-click mm kept every click's Flip state alive and replayed them all on the next
  // breakpoint change); revertOnUpdate kills the previous Flip before the next one starts.
  useGSAP(
    () => {
      const state = flipState.current
      flipState.current = null
      if (!state || window.matchMedia(MQ.reduce).matches) return
      Flip.from(state, {
        targets: ref.current.querySelector('[data-billing-thumb]'),
        duration: 0.45,
        ease: EASE.inOut,
        scale: true,
      })
    },
    { scope: ref, dependencies: [billing], revertOnUpdate: true },
  )

  // Road + vehicles (deferred: built after first paint, one section per task).
  useGSAP(
    (context, contextSafe) => {
      const root = ref.current
      const mm = gsap.matchMedia()
      const build = contextSafe(() => {
        mm.add(MQ.desktop, () => {
          const band = root.querySelector('[data-pricing-band]')
          const decor = root.querySelector('[data-road="desktop"]')
          // Entrance: both vehicles drive out from behind the cards, along their own lane.
          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: band,
                start: 'top bottom',
                end: 'top 35%',
                scrub: 0.8,
              },
            })
            .fromTo(decor.querySelector('[data-vehicle="sedan"]'), { x: 72, y: -12 }, { x: 0, y: 0 }, 0)
            .fromTo(decor.querySelector('[data-vehicle="truck"]'), { x: -64, y: -8 }, { x: 0, y: 0 }, 0)
          return bindIdle(roadIdle(decor, DASH_PERIOD), decor)
        })

        mm.add(MQ.mobile, () => {
          const decor = root.querySelector('[data-road="mobile"]')
          return bindIdle(roadIdle(decor, ROAD_BAND_DASH), decor)
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
      id="pricing"
      aria-labelledby="pricing-title"
      // isolate: keeps the backdrop's -z-10 layer inside the section. Near-white like the mockup:
      // the pricing tint gradient only (seams kept), no pattern, two faint blobs.
      className="relative isolate overflow-hidden pt-10 pb-10 lg:pt-12 lg:pb-14"
    >
      <SectionBackdrop variant="pricing" pattern="none" blobs={2} />
      {/* Mockup: a cool near-white field. Veils the tint (blobs show through faintly) and fades
          out at both edges so the seams with AI Demo / Comparison keep their shared colours. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgb(246_250_253/0.88)_160px,rgb(246_250_253/0.88)_calc(100%-140px),transparent)]"
      />
      <div className="container-page flex flex-col items-center gap-4">
        {/* Mockup heading size (25px at desktop) without touching the shared heading-section utility. */}
        <SectionHeading
          id="pricing-title"
          title={PRICING.title}
          className="[&_[data-heading-title]]:text-[22px] sm:[&_[data-heading-title]]:text-[24px] lg:[&_[data-heading-title]]:text-[25px]"
        />

        {/* Billing pill: on ≥sm the savings badge sits inside the white pill, on phones it wraps
            below. Revealed (like the heading above it) so it never shows before its heading. */}
        <Reveal y={12}>
          <div
            data-reveal
            data-billing-pill
            className="flex flex-col items-center gap-2 sm:flex-row sm:gap-0 sm:rounded-full sm:bg-white sm:p-[3px] sm:shadow-[0_4px_18px_-4px_rgb(13_34_50/0.1)] sm:ring-1 sm:ring-line/50"
          >
            <ToggleGroup
              type="single"
              value={billing}
              onValueChange={onBillingChange}
              aria-label={PRICING.toggleLabel}
              spacing={1}
              className="isolate rounded-full bg-white p-[3px] shadow-[0_4px_18px_-4px_rgb(13_34_50/0.1)] ring-1 ring-line/50 sm:p-0 sm:shadow-none sm:ring-0"
            >
              {[
                ['monthly', PRICING.monthlyLabel],
                ['yearly', PRICING.yearlyLabel],
              ].map(([value, label]) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="relative h-[30px] rounded-full px-5 text-[13px] font-semibold text-navy transition-colors duration-300 focus:z-auto focus-visible:z-auto hover:bg-transparent hover:text-brand-dark pointer-coarse:min-h-11 sm:px-9 data-[state=on]:bg-transparent data-[state=on]:text-white data-[state=on]:hover:text-white"
                >
                  {billing === value ? (
                    <span
                      aria-hidden="true"
                      data-billing-thumb
                      data-flip-id="billing-thumb"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_4px_10px_-3px_rgb(8_118_94/0.5)]"
                    />
                  ) : null}
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-3 text-body-sm font-semibold text-brand-dark sm:ml-1 sm:shadow-[0_2px_8px_-2px_rgb(14_155_120/0.25)]">
              {PRICING.yearlyBadge}
            </span>
          </div>
        </Reveal>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </div>

      <div data-pricing-band className="relative mt-6">
        {/* Desktop decor (behind the cards): a 1920px road frame centred on the 824px card grid,
            its top 180px below the cards' top (PricingRoad geometry). Vehicles are placed in the
            same frame: the sedan just left of the left card, the truck's cab right of the right
            card with its cargo box behind it. */}
        <div
          aria-hidden="true"
          data-road="desktop"
          className="pointer-events-none absolute top-[180px] left-1/2 hidden h-[210px] w-[1920px] -translate-x-1/2 lg:block"
        >
          <PricingRoad className="absolute inset-0" />
          <div data-vehicle="sedan" className="absolute top-[52px] left-[403px] w-[127px]">
            <SedanCar3Q className="h-auto w-full" />
          </div>
          <div data-vehicle="truck" className="absolute top-[48px] left-[1322px] w-[189px]">
            <BoxTruck3Q className="h-auto w-full" />
          </div>
        </div>

        <div className="container-page relative">
          <Reveal className="mx-auto grid max-w-[540px] gap-6 lg:max-w-[824px] lg:grid-cols-2 lg:items-start lg:gap-8">
            {PRICING.plans.map((plan) => (
              <div key={plan.id} data-reveal>
                <PricingCard plan={plan} billing={billing} unit={PRICING.unit} popularBadge={PRICING.popularBadge} />
              </div>
            ))}
          </Reveal>
        </div>
      </div>

      {/* Mobile / tablet decor: a small road with the two vehicles below the cards. */}
      <div aria-hidden="true" data-road="mobile" className="pointer-events-none relative mt-2 h-32 sm:h-40 lg:hidden">
        <RoadBand className="absolute inset-x-0 bottom-0 h-20 w-full sm:h-24" />
        <div data-vehicle="sedan" className="absolute bottom-7 left-[8%] w-24 sm:bottom-9 sm:left-[14%] sm:w-32">
          <SedanCar3Q className="h-auto w-full" />
        </div>
        <div data-vehicle="truck" className="absolute right-[6%] bottom-3 w-32 sm:right-[14%] sm:w-44">
          <BoxTruck3Q className="h-auto w-full" />
        </div>
      </div>
    </section>
  )
}

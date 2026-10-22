import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import DeliveryTruck from '@/components/illustrations/DeliveryTruck'
import RoadBand from '@/components/illustrations/RoadBand'
import SedanCar from '@/components/illustrations/SedanCar'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import PricingCard from '@/components/landing/pricing/PricingCard'
import { PRICING } from '@/content/landing'
import { Flip, gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { EASE, MQ } from '@/lib/motion/presets'

// Wheel radius as a fraction of each illustration's viewBox width (SedanCar r18/300, DeliveryTruck r19/320):
// lets the scrub roll the wheels exactly as far as the car travels.
const SEDAN_WHEEL = 18 / 300
const TRUCK_WHEEL = 19 / 320
const TRAVEL = 120
const DASH_PERIOD = 48 // RoadBand dash rhythm (26 + 22)

/** Degrees a wheel turns while its vehicle travels `distance` px on screen. */
function rollDeg(svg, ratio, distance) {
  const radius = svg.getBoundingClientRect().width * ratio
  return radius > 0 ? (distance / radius) * (180 / Math.PI) : 0
}

/** Runs a paused looping animation only while `trigger` is on screen. */
function loopWhileVisible(trigger, animations) {
  ScrollTrigger.create({
    trigger,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => animations.forEach((a) => (self.isActive ? a.play() : a.pause())),
  })
}

function dashLoop(dashes) {
  return gsap.fromTo(
    dashes,
    { strokeDashoffset: 0 },
    { strokeDashoffset: -DASH_PERIOD, duration: 0.9, ease: 'none', repeat: -1, paused: true },
  )
}

/**
 * Pricing (#pricing): heading, billing toggle (monthly/yearly) and two plan cards over a road band
 * with a sedan (left) and a delivery truck (right).
 * Motion — desktop: vehicles scrub in from ±120px as the cards enter, wheels roll by the distance
 * travelled, road dashes loop while in view. Mobile: road + vehicles sit small below the cards,
 * only the wheels spin and the dashes loop. Toggle thumb moves with Flip; prices tween.
 * Reduced motion: everything static and in its final place.
 */
export default function Pricing() {
  const ref = useRef(null)
  const [billing, setBilling] = useState('monthly')
  const flipState = useRef(null)

  const onBillingChange = (value) => {
    // Radix single toggle groups emit '' when the active item is pressed again — keep a selection.
    if (!value || value === billing) return
    const thumb = ref.current?.querySelector('[data-billing-thumb]')
    flipState.current = thumb ? Flip.getState(thumb) : null
    setBilling(value)
  }

  // Toggle thumb: Flip from the previously active item to the new one.
  useGSAP(
    () => {
      const state = flipState.current
      flipState.current = null
      if (!state) return undefined
      const mm = gsap.matchMedia()
      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
        Flip.from(state, {
          targets: ref.current.querySelector('[data-billing-thumb]'),
          duration: 0.45,
          ease: EASE.inOut,
          scale: true,
        })
      })
      return () => mm.revert()
    },
    { scope: ref, dependencies: [billing] },
  )

  // Road + vehicles.
  useGSAP(
    () => {
      const root = ref.current
      const mm = gsap.matchMedia()

      mm.add(MQ.desktop, () => {
        const band = root.querySelector('[data-pricing-band]')
        const decor = root.querySelector('[data-road="desktop"]')
        const sedan = decor.querySelector('[data-vehicle="sedan"]')
        const truck = decor.querySelector('[data-vehicle="truck"]')
        const sedanSvg = sedan.querySelector('svg')
        const truckSvg = truck.querySelector('svg')
        const sedanWheels = sedan.querySelectorAll('[data-part^="wheel-"]')
        const truckWheels = truck.querySelectorAll('[data-part^="wheel-"]')

        // Both SVGs are mirrored (-scale-x-100), so on-screen clockwise = negative local rotation.
        // Sedan rolls right (−120 → 0): screen CW → local starts positive. Truck rolls left: the opposite.
        gsap
          .timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: band,
              start: 'top bottom',
              end: 'top 30%',
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(sedan, { x: -TRAVEL }, { x: 0 }, 0)
          .fromTo(
            sedanWheels,
            { rotation: () => rollDeg(sedanSvg, SEDAN_WHEEL, TRAVEL), transformOrigin: '50% 50%' },
            { rotation: 0 },
            0,
          )
          .fromTo(truck, { x: TRAVEL }, { x: 0 }, 0)
          .fromTo(
            truckWheels,
            { rotation: () => -rollDeg(truckSvg, TRUCK_WHEEL, TRAVEL), transformOrigin: '50% 50%' },
            { rotation: 0 },
            0,
          )

        loopWhileVisible(decor, [dashLoop(decor.querySelector('[data-part="dashes"]'))])
      })

      mm.add(MQ.mobile, () => {
        const decor = root.querySelector('[data-road="mobile"]')
        // Static vehicles, wheels spinning "forward" for the way each one faces on screen
        // (sedan faces left → local CW; truck faces right → local CCW, both mirrored).
        const spin = (selector, dir) =>
          gsap.to(decor.querySelectorAll(`[data-vehicle="${selector}"] [data-part^="wheel-"]`), {
            rotation: 360 * dir,
            transformOrigin: '50% 50%',
            duration: 1.1,
            ease: 'none',
            repeat: -1,
            paused: true,
          })
        loopWhileVisible(decor, [
          spin('sedan', 1),
          spin('truck', -1),
          dashLoop(decor.querySelector('[data-part="dashes"]')),
        ])
      })

      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <section
      ref={ref}
      id="pricing"
      className="relative overflow-hidden bg-linear-to-b from-brand-50/40 via-white to-surface/70 pt-16 pb-12 lg:pt-24 lg:pb-24"
    >
      <div className="container-page flex flex-col items-center gap-8">
        <SectionHeading title={PRICING.title} />

        {/* Billing toggle: on ≥sm the badge sits inside the pill, on phones it wraps below. */}
        <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:gap-1 sm:rounded-full sm:bg-surface sm:p-1 sm:pr-3">
          <ToggleGroup
            type="single"
            value={billing}
            onValueChange={onBillingChange}
            aria-label={PRICING.toggleLabel}
            spacing={1}
            className="isolate rounded-full bg-surface p-1 sm:p-0"
          >
            {[
              ['monthly', PRICING.monthlyLabel],
              ['yearly', PRICING.yearlyLabel],
            ].map(([value, label]) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="relative h-11 rounded-full px-5 text-body font-semibold focus:z-auto focus-visible:z-auto text-ink transition-colors duration-300 hover:bg-transparent hover:text-navy data-[state=on]:bg-transparent data-[state=on]:text-white data-[state=on]:hover:text-white"
              >
                {billing === value ? (
                  <span
                    aria-hidden="true"
                    data-billing-thumb
                    data-flip-id="billing-thumb"
                    className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                  />
                ) : null}
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Badge variant="success">{PRICING.yearlyBadge}</Badge>
        </div>
      </div>

      <div data-pricing-band className="relative mt-10 lg:mt-12">
        {/* Desktop decor: road across the lower half of the cards, vehicles in the gutters. */}
        <div
          aria-hidden="true"
          data-road="desktop"
          className="pointer-events-none absolute inset-x-0 -bottom-14 hidden h-[270px] lg:block"
        >
          <RoadBand className="absolute inset-0 size-full" />
          <div
            data-vehicle="sedan"
            className="absolute right-[calc(50%+404px)] bottom-[33%] xl:right-[calc(50%+452px)] w-[clamp(132px,12vw,184px)]"
          >
            <SedanCar className="h-auto w-full -scale-x-100" />
          </div>
          <div
            data-vehicle="truck"
            className="absolute bottom-[20%] left-[calc(50%+396px)] w-[clamp(160px,15vw,224px)]"
          >
            <DeliveryTruck className="h-auto w-full -scale-x-100" />
          </div>
        </div>

        <div className="container-page relative">
          <Reveal className="mx-auto grid max-w-[560px] items-stretch gap-6 lg:max-w-[880px] lg:grid-cols-2 lg:gap-10">
            {PRICING.plans.map((plan) => (
              <div key={plan.id} data-reveal className="h-full">
                <PricingCard plan={plan} billing={billing} unit={PRICING.unit} popularBadge={PRICING.popularBadge} />
              </div>
            ))}
          </Reveal>
        </div>
      </div>

      {/* Mobile / tablet decor: smaller road + vehicles below the cards. */}
      <div aria-hidden="true" data-road="mobile" className="pointer-events-none relative mt-2 h-32 sm:h-40 lg:hidden">
        <RoadBand className="absolute inset-x-0 bottom-0 h-20 w-full sm:h-24" />
        <div data-vehicle="sedan" className="absolute bottom-9 left-[6%] w-28 sm:bottom-11 sm:left-[12%] sm:w-36">
          <SedanCar className="h-auto w-full -scale-x-100" />
        </div>
        <div data-vehicle="truck" className="absolute right-[5%] bottom-2 w-32 sm:right-[12%] sm:w-40">
          <DeliveryTruck className="h-auto w-full -scale-x-100" />
        </div>
      </div>
    </section>
  )
}

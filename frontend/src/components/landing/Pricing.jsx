import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import DeliveryTruck from '@/components/illustrations/DeliveryTruck'
import RoadBand from '@/components/illustrations/RoadBand'
import SedanCar from '@/components/illustrations/SedanCar'
import Reveal from '@/components/landing/Reveal'
import SectionHeading from '@/components/landing/SectionHeading'
import SectionBackdrop from '@/components/landing/decor/SectionBackdrop'
import Float3D from '@/components/landing/decor/Float3D'
import PricingCard from '@/components/landing/pricing/PricingCard'
import { PRICING, pricingAnnouncement } from '@/content/landing'
import { deferSetup } from '@/lib/motion/defer'
import { Flip, gsap, useGSAP } from '@/lib/motion/gsap'
import { bindIdle } from '@/lib/motion/idle'
import { EASE, MQ } from '@/lib/motion/presets'

// Wheel radius as a fraction of each illustration's viewBox width (SedanCar r18/300, DeliveryTruck r19/320):
// lets the scrub roll the wheels exactly as far as the car travels.
const SEDAN_WHEEL = 18 / 300
const TRUCK_WHEEL = 19 / 320
const TRAVEL = 120
const DASH_PERIOD = 48 // RoadBand dash rhythm (26 + 22)
const IDLE_LOOP = 1.8 // s — one wheel turn per loop

/** Degrees a wheel turns while its vehicle travels `distance` px on screen. */
function rollDeg(svg, ratio, distance) {
  const radius = svg.getBoundingClientRect().width * ratio
  return radius > 0 ? (distance / radius) * (180 / Math.PI) : 0
}

/**
 * Wheel rotation = entrance roll offset (desktop scrub) + idle spin, written with one quickSetter
 * per vehicle so the scrub and the idle loop never tween the same property.
 * Wheel geometry is centred on each part's local origin → svgOrigin '0 0' (no bbox read).
 */
function createWheels(decor) {
  const sedanWheels = decor.querySelectorAll('[data-vehicle="sedan"] [data-part^="wheel-"]')
  const truckWheels = decor.querySelectorAll('[data-vehicle="truck"] [data-part^="wheel-"]')
  gsap.set([...sedanWheels, ...truckWheels], { rotation: 0, svgOrigin: '0 0' })
  const setSedan = gsap.quickSetter(sedanWheels, 'rotation', 'deg')
  const setTruck = gsap.quickSetter(truckWheels, 'rotation', 'deg')
  const roll = { sedan: 0, truck: 0 }
  const spin = { deg: 0 }
  const apply = () => {
    // Each vehicle drives "forward" for the way it faces on screen: the sedan faces left (local CW,
    // both SVGs are mirrored), the truck faces right (local CCW).
    setSedan(roll.sedan + spin.deg)
    setTruck(roll.truck - spin.deg)
  }
  return { roll, spin, apply }
}

/**
 * Continuous idle while the road is on screen (bindIdle: paused off screen, under MotionPause and
 * reduced motion): wheels spin, both bodies bob on their suspension (out of phase), road dashes
 * flow. One 1.8s loop: 1 wheel turn, 2 bobs, 2 dash periods (≈53px/s). 4 tweens.
 */
function roadIdle(decor, wheels) {
  const part = (vehicle, name) => decor.querySelectorAll(`[data-vehicle="${vehicle}"] [data-part="${name}"]`)
  const bob = { y: -2, duration: IDLE_LOOP / 4, ease: 'sine.inOut', yoyo: true, repeat: 3 }
  return gsap
    .timeline({ repeat: -1, paused: true })
    .fromTo(wheels.spin, { deg: 0 }, { deg: 360, duration: IDLE_LOOP, ease: 'none', onUpdate: wheels.apply }, 0)
    .to(part('sedan', 'body'), bob, 0)
    .to([...part('truck', 'body'), ...part('truck', 'cab')], { ...bob, y: -1.6 }, IDLE_LOOP / 8)
    .fromTo(
      decor.querySelector('[data-part="dashes"]'),
      { strokeDashoffset: 0 },
      { strokeDashoffset: -2 * DASH_PERIOD, duration: IDLE_LOOP, ease: 'none' },
      0,
    )
}

/**
 * Pricing (#pricing): heading, billing toggle (monthly/yearly) and two plan cards over a road band
 * with a sedan (left) and a delivery truck (right).
 * Motion — desktop: vehicles scrub in from ±120px as the cards enter, wheels roll by the distance
 * travelled. Then, on every size, a continuous idle runs while the road is on screen (bindIdle —
 * paused off screen, under the shared motion pause and under reduced motion): wheels spin, bodies
 * bob, road dashes flow. Mobile: road + vehicles sit small below the cards (idle only). Toggle thumb
 * moves with Flip; prices tween; one polite live region announces both new prices.
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
          const sedan = decor.querySelector('[data-vehicle="sedan"]')
          const truck = decor.querySelector('[data-vehicle="truck"]')
          const sedanSvg = sedan.querySelector('svg')
          const truckSvg = truck.querySelector('svg')
          const wheels = createWheels(decor)

          // Entrance: vehicles scrub in from the gutters; their wheels roll by the distance travelled
          // (the roll is an offset added to the idle spin, so both can run without fighting).
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
            .fromTo(truck, { x: TRAVEL }, { x: 0 }, 0)
            .fromTo(
              wheels.roll,
              {
                sedan: () => rollDeg(sedanSvg, SEDAN_WHEEL, TRAVEL),
                truck: () => -rollDeg(truckSvg, TRUCK_WHEEL, TRAVEL),
              },
              { sedan: 0, truck: 0, onUpdate: wheels.apply },
              0,
            )
          wheels.apply() // the scrub's first render does not fire onUpdate

          return bindIdle(roadIdle(decor, wheels), decor)
        })

        mm.add(MQ.mobile, () => {
          const decor = root.querySelector('[data-road="mobile"]')
          return bindIdle(roadIdle(decor, createWheels(decor)), decor)
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
      // isolate: keeps the backdrop's -z-10 layer inside the section. Tight top padding: AiDemo above
      // ends on the same tint (seam tint-sky), so the heading follows the cards without a pale band.
      className="relative isolate overflow-hidden pt-10 pb-12 lg:pt-12 lg:pb-20"
    >
      <SectionBackdrop variant="pricing" />
      <div className="container-page flex flex-col items-center gap-8">
        <SectionHeading id="pricing-title" title={PRICING.title} />

        {/* Billing toggle: on ≥sm the badge sits inside the pill, on phones it wraps below.
            Revealed (like the heading above it) so it never shows before its heading. */}
        <Reveal y={12}>
          <div data-reveal className="flex flex-col items-center gap-2.5 sm:flex-row sm:gap-1 sm:rounded-full sm:bg-surface sm:p-1 sm:pr-3">
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
        </Reveal>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
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
          {/* Clay 3D accents in the upper gutters beside the cards (xl: the gutters are too narrow below). */}
          <Float3D badge="truck" size={112} depth={1.12} phase={0.3} className="md:hidden xl:block -top-10 right-[calc(50%+452px)]" />
          {/* Tablet (single column, 104px gutters): only the shield, smaller, beside the second card. */}
          <Float3D
            badge="shield"
            size={96}
            depth={0.9}
            phase={0.75}
            className="bottom-48 left-[calc(50%+292px)] size-[72px]! lg:hidden xl:bottom-auto xl:top-6 xl:left-[calc(50%+460px)] xl:block xl:size-[96px]!"
          />
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

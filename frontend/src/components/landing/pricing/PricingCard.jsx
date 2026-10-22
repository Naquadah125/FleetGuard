import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CircleCheck, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/content/landing'
import { deferSetup } from '@/lib/motion/defer'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ } from '@/lib/motion/presets'
import { cn } from '@/lib/utils'
import { loopWhileVisible } from '../motionPause'

const PLAN_ICONS = { basic: Leaf, advanced: Building2 }

/**
 * One pricing plan card (used by Pricing.jsx).
 * - Price number tweens between monthly/yearly values (formatVnd on every update). The animated
 *   number is aria-hidden; a static sr-only copy carries the current price (Pricing.jsx owns the
 *   single live region that announces a billing change).
 * - Popular plan: `border-2 border-brand` + full-width "PHỔ BIẾN" ribbon with a shimmer sweep
 *   loop (desktop only, deferred setup, plays only while on screen and motion is not paused).
 * - Hover: the card lifts 4px with a stronger shadow and a brand-tinted border.
 * Static under prefers-reduced-motion (price swaps instantly).
 *
 * @param {{ plan: { id: string, name: string, monthly: number, yearly: number, desc: string,
 *   features: string[], cta: string, popular: boolean }, billing: 'monthly'|'yearly',
 *   unit: string, popularBadge: string, className?: string }} props
 */
export default function PricingCard({ plan, billing, unit, popularBadge, className, ...rest }) {
  const ref = useRef(null)
  const numberRef = useRef(null)
  const price = plan[billing]
  // React renders the first value only; afterwards GSAP owns the text node (nodeValue writes keep
  // the same node, so React never sees a mismatch).
  const [initialText] = useState(() => formatVnd(price))
  const shownRef = useRef(price)
  const Icon = PLAN_ICONS[plan.id] ?? Leaf

  // Price tween on billing change.
  useGSAP(
    () => {
      const el = numberRef.current
      const node = el.firstChild
      const write = (v) => {
        node.nodeValue = formatVnd(v)
        shownRef.current = v
      }
      const from = shownRef.current
      if (from === price) {
        write(price)
        return undefined
      }

      const mm = gsap.matchMedia()
      mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: MQ.reduce }, (ctx) => {
        if (ctx.conditions.reduce) {
          write(price)
          return
        }
        const counter = { v: from }
        gsap.to(counter, {
          v: price,
          duration: DUR.base,
          ease: EASE.out,
          onUpdate: () => write(counter.v),
          onComplete: () => write(price),
        })
        gsap.fromTo(el, { y: -6, opacity: 0.5 }, { y: 0, opacity: 1, duration: DUR.base, ease: EASE.out })
      })
      return () => mm.revert()
    },
    { scope: ref, dependencies: [price], revertOnUpdate: true },
  )

  // Ribbon shimmer (desktop, popular card only; deferred — far below the fold).
  useGSAP(
    (context, contextSafe) => {
      if (!plan.popular) return undefined
      const shimmer = ref.current.querySelector('[data-shimmer]')
      const mm = gsap.matchMedia()
      const cancel = deferSetup(
        contextSafe(() => {
          mm.add(MQ.desktop, () => {
            gsap.set(shimmer, { opacity: 1 })
            const sweep = gsap.fromTo(
              shimmer,
              { xPercent: -120 },
              { xPercent: 420, duration: 1.4, ease: EASE.inOut, repeat: -1, repeatDelay: 2.4, paused: true },
            )
            return loopWhileVisible(ref.current, [sweep], ScrollTrigger)
          })
        }),
      )
      return () => {
        cancel()
        mm.revert()
      }
    },
    { scope: ref, dependencies: [plan.popular], revertOnUpdate: true },
  )

  return (
    <article
      ref={ref}
      className={cn(
        // The lift lives here, not on the GSAP-revealed wrapper (the reveal writes inline translate).
        'relative flex h-full flex-col overflow-hidden rounded-lg bg-white',
        'transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        plan.popular
          ? 'border-2 border-brand shadow-card-hover hover:border-brand-dark hover:shadow-dashboard'
          : 'border border-line shadow-card hover:border-brand/40 hover:shadow-card-hover',
        className,
      )}
      {...rest}
    >
      {plan.popular ? (
        <div className="relative overflow-hidden bg-brand-dark py-1.5 text-center text-caption font-bold tracking-[0.2em] text-white">
          {popularBadge}
          <span
            aria-hidden="true"
            data-shimmer
            className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-linear-to-r from-transparent via-white/45 to-transparent opacity-0"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white">
            <Icon className="size-6" strokeWidth={2} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="text-body font-bold tracking-wide text-navy">{plan.name}</h3>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span ref={numberRef} aria-hidden="true" data-price={plan.id} className="text-h1 font-extrabold tracking-tight text-navy">
                {initialText}
              </span>
              <span className="sr-only">{formatVnd(price)}</span>
              <span className="text-body text-ink">{unit}</span>
            </p>
            <p className="text-body text-ink">{plan.desc}</p>
          </div>
        </div>

        <ul className="flex flex-col gap-3.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-body text-ink">
              <CircleCheck
                aria-hidden="true"
                className="mt-px size-5 shrink-0 text-brand [&>circle]:fill-brand [&>path]:stroke-white"
                strokeWidth={2.25}
              />
              {feature}
            </li>
          ))}
        </ul>

        <Button asChild size="lg" variant={plan.popular ? 'default' : 'outline'} className="mt-auto w-full">
          <Link to="/register">{plan.cta}</Link>
        </Button>
      </div>
    </article>
  )
}

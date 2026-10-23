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
 * - Layout per the design mockup (1440): 32px icon chip on the plan-name line, 30px price,
 *   compact 16px-check list, full-width 44px CTA at the bottom.
 * - Popular plan: 1.5px brand border + soft green glow, and a thin 18px brand-dark top strip
 *   with a tiny "PHỔ BIẾN" and a shimmer sweep loop (desktop only, deferred setup, plays only
 *   while on screen and motion is not paused).
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
        'relative flex flex-col overflow-hidden rounded-lg bg-white',
        'transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        plan.popular
          ? 'border-[1.5px] border-brand shadow-[0_0_0_4px_rgb(14_155_120/0.07),0_14px_36px_-12px_rgb(14_155_120/0.4)] hover:border-brand-dark hover:shadow-[0_0_0_5px_rgb(14_155_120/0.1),0_18px_40px_-12px_rgb(14_155_120/0.45)]'
          : 'border border-line/60 shadow-[0_6px_24px_-6px_rgb(13_34_50/0.08)] hover:border-brand/30 hover:shadow-card-hover',
        className,
      )}
      {...rest}
    >
      {plan.popular ? (
        <div
          data-popular-strip
          className="relative h-[18px] overflow-hidden bg-linear-to-r from-brand-dark from-60% to-[#0b8a5c] text-center text-[10px] leading-[18px] font-bold tracking-[0.2em] text-white lg:text-[9px] lg:tracking-[0.22em]"
        >
          {popularBadge}
          <span
            aria-hidden="true"
            data-shimmer
            className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent opacity-0"
          />
        </div>
      ) : null}

      <div className={cn('flex flex-1 flex-col px-6 pb-5 sm:px-7 lg:pr-8', plan.popular ? 'pt-[11px]' : 'pt-6')}>
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            data-plan-icon
            className="mt-px grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-b from-brand to-brand-dark text-white shadow-[0_3px_8px_-2px_rgb(14_155_120/0.5)]"
          >
            <Icon className="size-4" strokeWidth={2.25} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h3 className="text-[15px] leading-5 font-bold tracking-wide text-navy">{plan.name}</h3>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5">
              <span
                ref={numberRef}
                aria-hidden="true"
                data-price={plan.id}
                className="text-[30px] leading-9 font-extrabold tracking-tight text-navy tabular-nums"
              >
                {initialText}
              </span>
              <span className="sr-only">{formatVnd(price)}</span>
              <span className="text-body text-ink">{unit}</span>
            </p>
            <p className="mt-1.5 text-[13.5px] leading-[22px] text-ink">{plan.desc}</p>
          </div>
        </div>

        <ul className="mt-[18px] flex flex-col gap-3 pl-1.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-body font-medium text-ink">
              <CircleCheck
                aria-hidden="true"
                className="mt-[3px] size-4 shrink-0 text-brand [&>circle]:fill-brand [&>path]:stroke-white"
                strokeWidth={2.5}
              />
              {feature}
            </li>
          ))}
        </ul>

        {/* mt-auto: the CTA sits on the card bottom when the grid stretches the cards. */}
        <div className="mt-auto pt-[26px]">
          <Button
            asChild
            variant={plan.popular ? 'default' : 'outline'}
            className={cn(
              'h-11 w-full rounded-md text-body',
              plan.popular
                ? 'shadow-[0_6px_16px_-6px_rgb(8_118_94/0.55)]'
                : 'border-[1.5px] border-brand/45 hover:border-brand',
            )}
          >
            <Link to="/register">{plan.cta}</Link>
          </Button>
        </div>
      </div>
    </article>
  )
}

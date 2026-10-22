/**
 * AuthShell — shared frame for /login and /register.
 *
 * Desktop (≥ 1024px): split screen. Left: pastel-teal brand panel (logo → "/", value line,
 * PhoneMap whose route draws in and pins drop, CitySkyline along the bottom). Right: the form in a
 * white card (max 440px). Mobile/tablet: logo + back link + form card only.
 *
 * Props
 *   title     card heading (rendered as the page <h1>)
 *   subtitle  line under the heading
 *   footer    content of the card footer (e.g. "Chưa có tài khoản? Đăng ký")
 *   children  the form body
 *
 * Also exports `AuthField` (Label + icon-led Input; extra props go to the <input>) and
 * `AuthBanner` (tone danger | success | info status message).
 *
 * Auth copy lives here and in the auth pages (not in content/landing.js — auth is not a landing section).
 */
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import FleetGuardLogo from '@/components/brand/FleetGuardLogo'
import PhoneMap from '@/components/illustrations/PhoneMap'
import CitySkyline from '@/components/illustrations/CitySkyline'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { MQ, EASE, DUR } from '@/lib/motion/presets'

const VALUE_LINE = 'An toàn trên mọi hành trình'
const BACK_HOME = 'Về trang chủ'

const BANNER_TONES = {
  danger: 'border-danger/25 bg-danger/8 text-[color:color-mix(in_oklab,var(--color-danger),black_25%)]',
  success: 'border-success/30 bg-success/10 text-[color:color-mix(in_oklab,var(--color-success),black_45%)]',
  info: 'border-info/25 bg-info/8 text-[color:color-mix(in_oklab,var(--color-info),black_30%)]',
}

/** Inline status message (error / success / notice) shown above the form. */
export function AuthBanner({ tone = 'info', icon: Icon, children }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-body font-medium', BANNER_TONES[tone])}
    >
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </div>
  )
}

/** Label + Input with a leading icon. Extra props go to the <input>. */
export function AuthField({ id, label, icon: Icon, ...inputProps }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-body font-semibold text-navy">
        {label}
      </Label>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
        ) : null}
        <Input id={id} className={cn('text-body', Icon && 'pl-11')} {...inputProps} />
      </div>
    </div>
  )
}

function BackHomeLink() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-body font-semibold text-ink transition-colors hover:text-brand-dark focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      <span>{BACK_HOME}</span>
    </Link>
  )
}

export default function AuthShell({ title, subtitle, footer, children }) {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Card entrance — every width, skipped under reduced motion.
      mm.add(MQ.desktop + ', ' + MQ.mobile, () => {
        gsap.from('[data-auth="card"]', { opacity: 0, y: 16, duration: DUR.base, ease: EASE.out })
      })

      // Brand panel is only rendered (display) on desktop.
      mm.add(MQ.desktop, () => {
        const phone = root.current.querySelector('[data-auth="phone"]')
        const route = phone.querySelector('[data-part="route"]')
        const pins = ['pin-4', 'pin-2', 'pin-3', 'pin-1'].map((p) => phone.querySelector(`[data-part="${p}"]`))

        const tl = gsap.timeline({ defaults: { ease: EASE.out } })
        tl.from('[data-auth="value"]', { opacity: 0, y: 18, duration: DUR.base })
          .from(phone, { opacity: 0, y: 40, duration: DUR.slow }, '<0.1')
          .from('[data-auth="skyline"]', { opacity: 0, y: 24, duration: DUR.slow }, '<')
          .fromTo(route, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.4, ease: EASE.inOut }, '-=0.3')
          .from(pins, { y: -28, opacity: 0, duration: 0.7, ease: 'bounce.out', stagger: 0.28 }, '<0.15')

        // Gentle idle float once the intro has settled.
        tl.to(phone, { y: -8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className="min-h-svh bg-surface/60 lg:flex">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden shrink-0 flex-col overflow-hidden bg-brand-50 lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-[44%]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-brand-100/70 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -left-40 size-[360px] rounded-full bg-white/60 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-10 px-12 pt-10 xl:px-16">
          <Link
            to="/"
            aria-label="FleetGuard"
            className="w-fit rounded-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <FleetGuardLogo className="text-[22px]" />
          </Link>
          <div data-auth="value" className="flex max-w-[480px] flex-col gap-4">
            <span aria-hidden="true" className="h-[3px] w-12 rounded-full bg-brand" />
            <p className="heading-section text-balance text-navy">{VALUE_LINE}</p>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-12 pt-6 pb-24">
          <PhoneMap
            data-auth="phone"
            className="h-[min(50vh,440px)] w-auto drop-shadow-[0_24px_40px_rgba(13,34,50,0.18)]"
          />
        </div>

        <CitySkyline
          data-auth="skyline"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[180px] w-full"
        />
      </aside>

      {/* Form column */}
      <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-brand-50 to-transparent lg:hidden"
        />
        <div className="relative flex items-center justify-between gap-4 lg:justify-end">
          <Link
            to="/"
            aria-label="FleetGuard"
            className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none lg:hidden"
          >
            <FleetGuardLogo className="text-xl" />
          </Link>
          <BackHomeLink />
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <Card data-auth="card" className="w-full max-w-[440px] gap-6 rounded-xl bg-white">
            <CardHeader className="gap-2">
              <h1 className="text-h3 text-navy">{title}</h1>
              {subtitle ? <p className="text-body text-ink">{subtitle}</p> : null}
            </CardHeader>
            <CardContent>{children}</CardContent>
            {footer ? (
              <CardFooter className="justify-center gap-1.5 rounded-b-xl border-line bg-surface/60 py-4 text-body text-ink">
                {footer}
              </CardFooter>
            ) : null}
          </Card>
        </div>
      </main>
    </div>
  )
}

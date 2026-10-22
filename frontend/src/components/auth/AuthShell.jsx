/**
 * AuthShell — shared frame for /login and /register.
 *
 * Desktop (≥ 1024px): split screen. Left: pastel-teal brand panel (logo → "/", value line,
 * PhoneMap whose route draws in and pins drop, CitySkyline along the bottom). After the intro the
 * panel idles (phone float, pins pulse, route dash flow, skyline layer drift) unless the shared
 * MotionPause is on; nothing moves under reduced motion. Right: the form in a
 * white card (max 440px). Mobile/tablet: logo + back link + form card only.
 *
 * Props
 *   title     card heading (rendered as the page <h1>; also the document <title>)
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
import { isMotionPaused, onMotionPauseChange } from '@/components/landing/motionPause'

const VALUE_LINE = 'An toàn trên mọi hành trình'
const BACK_HOME = 'Về trang chủ'

const BANNER_TONES = {
  danger: 'border-danger/25 bg-danger/8 text-danger-text',
  success: 'border-success/30 bg-success/10 text-success-text',
  info: 'border-info/25 bg-info/8 text-info-text',
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

/**
 * Label + Input with a leading icon. Extra props go to the <input>. `hint` renders persistent
 * helper text under the field (linked with aria-describedby) — use it for requirements instead
 * of a placeholder, which disappears once typing starts.
 */
export function AuthField({ id, label, icon: Icon, hint, ...inputProps }) {
  const hintId = hint ? `${id}-hint` : undefined
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
        <Input id={id} aria-describedby={hintId} className={cn('text-body', Icon && 'pl-11')} {...inputProps} />
      </div>
      {hint ? (
        <p id={hintId} className="text-body text-ink">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function BackHomeLink() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-body font-semibold text-ink transition-colors outline-none hover:text-brand-dark focus-ring"
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
          // Route draw: PhoneMap sets pathLength="1" on it, so a "1 2" dash slid from 1.05 to 0
          // draws it in with no DrawSVG length/bbox reads.
          .fromTo(
            route,
            { strokeDasharray: '1 2', strokeDashoffset: 1.05 },
            { strokeDashoffset: 0, duration: 1.4, ease: EASE.inOut, autoRound: false }, // keep sub-px offsets
            '-=0.3',
          )
          .from(pins, { y: -28, opacity: 0, duration: 0.7, ease: 'bounce.out', stagger: 0.28 }, '<0.15')

        // Idle loop once the intro has settled (the panel is sticky, so it is always on screen
        // while it exists): phone float, pins pulse in turn, a light "data" dash flows along the
        // route, skyline layers drift sideways at their own pace. Honours the site-wide motion
        // pause (set from the landing page's pause buttons, WCAG 2.2.2). Transform/opacity and
        // one dash offset on a 4.5px stroke — nothing that re-rasters the panel.
        // Skyline layers: [part, amplitude px, half-period s]; layer i starts i × 0.6 half-periods
        // into its swing. Every other loop sits at `lead` and the playhead starts there.
        const drift = [
          ['layer-back', 8, 24],
          ['layer-mid', 14, 18],
          ['layer-front', 24, 14],
        ].map(([part, px, half], i) => ({ part, px, half, offset: i * 0.6 * half }))
        const lead = Math.max(...drift.map((d) => d.offset))

        const idle = gsap.timeline({ paused: true })
        idle.to(phone, { y: -8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, lead)

        const pulse = gsap.timeline({ repeat: -1, repeatDelay: 1.4 })
        pulse.to(pins, {
          keyframes: [
            { scale: 1.14, duration: 0.28, ease: 'power2.out' },
            { scale: 1, duration: 0.5, ease: 'sine.inOut' },
          ],
          transformOrigin: '50% 100%', // pin tip
          stagger: 0.32,
        })
        idle.add(pulse, lead)

        // Flow: a white dashed copy of the route laid over it (the drawn route stays solid). The
        // copy drops pathLength so the dash is in viewBox units. `autoRound: false` everywhere a
        // dash offset tweens: GSAP rounds px values by default, which snaps sub-unit offsets.
        const flow = route.cloneNode(false)
        flow.removeAttribute('data-part')
        flow.removeAttribute('pathLength')
        flow.setAttribute('stroke', '#fff')
        flow.setAttribute('stroke-width', '2')
        flow.setAttribute('stroke-opacity', '0.9')
        route.after(flow)
        gsap.set(flow, { strokeDasharray: '6 10', strokeDashoffset: 0, opacity: 0 })
        idle.to(flow, { opacity: 1, duration: 0.6 }, lead)
        idle.to(flow, { strokeDashoffset: -16, duration: 0.9, ease: 'none', repeat: -1, autoRound: false }, lead)

        const skyline = root.current.querySelector('[data-auth="skyline"]')
        drift.forEach(({ part, px, half, offset }) => {
          const layer = skyline.querySelector(`[data-part="${part}"]`)
          if (layer) idle.fromTo(layer, { x: -px }, { x: px, duration: half, ease: 'sine.inOut', yoyo: true, repeat: -1 }, lead - offset)
        })
        idle.time(lead)

        let settled = false
        const sync = () => (settled && !isMotionPaused() ? idle.play() : idle.pause())
        tl.call(() => {
          settled = true
          sync()
        })
        const off = onMotionPauseChange(sync)
        return () => {
          off()
          flow.remove()
        }
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className="min-h-svh bg-surface/60 lg:flex">
      {/* React 19 hoists this into <head>: a route-specific document title (WCAG 2.4.2). */}
      <title>{`${title} · FleetGuard`}</title>
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
            className="flex min-h-11 w-fit items-center rounded-md outline-none focus-ring"
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

        {/* Layered (one <svg> per depth) so each layer drifts as its own composited box; overhangs
            the panel by 2.5rem a side (clipped) so the drift never shows an edge. */}
        <CitySkyline
          layered
          data-auth="skyline"
          className="pointer-events-none absolute -inset-x-10 bottom-0 h-[180px]"
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
            className="flex min-h-11 items-center rounded-md outline-none focus-ring lg:hidden"
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

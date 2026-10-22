import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { CirclePlay, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import LeafBranch from '@/components/illustrations/LeafBranch'
import { HERO, formatStat } from '@/content/landing'
import { countUp } from '@/lib/motion/countUp'
import { gsap, Flip, ScrollTrigger, SplitText, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ } from '@/lib/motion/presets'
import { scrollToSection } from '@/lib/motion/scroll'
import FleetDashboard from './hero/FleetDashboard'
import { isMotionPaused, onMotionPauseChange } from './motionPause'

/**
 * Hero (`#top`): headline + CTAs + trust row on the left, the live code-built FleetDashboard on
 * the right, leaf branch bottom-right and a soft wave into the next section.
 *
 * Motion (all inside gsap.matchMedia; static under prefers-reduced-motion):
 *  - intro: headline words rise (SplitText words), copy rises, dashboard rises + scales
 *    from 0.96, KPI/distance count up (lib/motion/countUp in timeline mode, each starting with
 *    its tile / card fade so the reset to 0 is never seen), fences pop, route draws, pins drop,
 *    alerts slide in, sparkline draws then its area fades, leaf branch grows.
 *  - live (only after the intro, only while the hero is in view, and not while the shared
 *    motion pause is on — the dashboard header has the pause button): pin pulse rings, vehicle
 *    driving the route, alert ticker (every 6s → Flip list shift, "alerts today" +1),
 *    desktop leaf sway. Out of view / paused → paused.
 *  - LCP: the description paragraph only rises (no fade) and the copy starts at 0s, so the LCP
 *    element paints with the first frame. Strokes (route, sparkline, stem) have pathLength="1" and
 *    draw with a strokeDashoffset tween; SVG parts pivot with svgOrigin (no bbox measuring).
 *  - desktop: dashboard tilts toward the pointer (quickTo rotationX/Y ±4°, perspective 1200).
 *  - parallax via data-speed (ScrollSmoother, enabled by the page): blobs 0.8, dashboard 0.95,
 *    distance card 1.08, leaves 0.95 — all clamp()ed so the effect starts at scroll 0 (layout at load
 *    = design layout; the card and trust row only move vertically, never closer horizontally).
 */

const TICK_SECONDS = 6
const TILT_DEG = 4
// Strokes with pathLength="1": the dash is pushed fully off the path (no round-cap dot) until drawn.
const UNDRAWN = { strokeDasharray: '1 2', strokeDashoffset: 1.001 }
const DRAWN = { strokeDashoffset: 0 }
const centerOf = (el) => `${el.getAttribute('cx')} ${el.getAttribute('cy')}`

// Tones for the decorative trust avatars (initials come from HERO.trustAvatars).
const AVATAR_TONES = ['bg-brand-100 text-brand-darker', 'bg-info/15 text-navy', 'bg-warning/20 text-navy']
const AVATARS = HERO.trustAvatars.map((initials, i) => ({ initials, className: AVATAR_TONES[i % AVATAR_TONES.length] }))

/** Update a React-rendered number without replacing its text node (React keeps its reference). */
function setText(el, text) {
  if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = text
  else el.textContent = text
}

/** Keep the last two words together so a line never ends with a lone word. SplitText splits the
 *  words inside the nowrap span individually, but they still never break apart. */
function NoOrphan({ text }) {
  const cut = text.lastIndexOf(' ', text.lastIndexOf(' ') - 1)
  if (cut < 0) return text
  return (
    <>
      {text.slice(0, cut + 1)}
      <span className="whitespace-nowrap">{text.slice(cut + 1)}</span>
    </>
  )
}

function Backdrop() {
  return (
    <div aria-hidden="true" data-speed="clamp(0.8)" className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute -top-40 -left-48 size-[620px] rounded-full opacity-90"
        style={{ background: 'radial-gradient(closest-side, var(--color-brand-50), transparent)' }}
      />
      <div
        className="absolute top-24 left-[38%] size-[420px] rounded-full opacity-70"
        style={{ background: 'radial-gradient(closest-side, var(--color-brand-50), transparent)' }}
      />
      <div
        className="absolute -top-24 -right-40 size-[560px] rounded-full"
        style={{
          background: 'radial-gradient(closest-side, color-mix(in oklab, var(--color-brand-100) 70%, transparent), transparent)',
        }}
      />
      <div
        className="absolute -right-24 bottom-0 size-[420px] rounded-full opacity-80"
        style={{ background: 'radial-gradient(closest-side, var(--color-brand-50), transparent)' }}
      />
    </div>
  )
}

/** Light curved wave closing the hero into the white Features section, green swell on the right. */
function Wave() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full md:h-24 lg:h-28"
    >
      <defs>
        <linearGradient id="fg-hero-swell" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-brand-100)" stopOpacity="0" />
          <stop offset="0.35" stopColor="var(--color-brand-100)" stopOpacity="0.9" />
          <stop offset="0.75" stopColor="var(--color-brand)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path
        d="M560 92 C820 84 1060 58 1250 34 C1340 23 1400 18 1440 16 L1440 120 L560 120 Z"
        fill="url(#fg-hero-swell)"
      />
      <path
        d="M0 62 C220 34 470 34 720 64 S1160 112 1440 70 L1440 120 L0 120 Z"
        fill="var(--color-surface)"
        opacity="0.7"
      />
      <path d="M0 78 C260 52 520 60 760 84 S1180 116 1440 96 L1440 120 L0 120 Z" fill="white" />
    </svg>
  )
}

function TrustRow() {
  return (
    <div data-reveal data-hero-copy className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-5">
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="flex -space-x-2">
          {AVATARS.map((a) => (
            <Avatar key={a.initials} className="size-9 ring-2 ring-white after:hidden">
              <AvatarFallback className={`text-[11px] font-bold ${a.className}`}>{a.initials}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="text-body text-ink lg:text-body-sm">
          <span className="text-body-lg font-bold text-navy">{HERO.trustCompanies}</span> {HERO.trustCompaniesLabel}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Star aria-hidden="true" className="size-8 shrink-0 fill-warning text-warning" strokeWidth={1.5} />
        <div className="flex flex-col">
          <p className="leading-none text-navy">
            <span className="text-h4 font-extrabold">{HERO.rating}</span>
            <span className="text-body font-semibold text-ink">/{HERO.ratingMax}</span>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span aria-hidden="true" className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-3.5 fill-warning text-warning" strokeWidth={1.5} />
              ))}
            </span>
            <span className="text-body text-ink lg:text-body-sm">{HERO.ratingCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  const rootRef = useRef(null)
  const dashRef = useRef(null)

  useGSAP(
    () => {
      const root = rootRef.current
      const one = (s) => root.querySelector(s)
      const all = (s) => Array.from(root.querySelectorAll(s))
      const mm = gsap.matchMedia()

      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, (ctx) => {
        const { desktop } = ctx.conditions
        const kpiCounters = all('[data-kpi] [data-count]')
        const distanceCounter = one('[data-distance-count]')
        const liveCounter = one('[data-kpi-live] [data-count]')
        const route = one('[data-map-route]')
        const vehicle = one('[data-map-vehicle]')
        const list = one('[data-alert-list]')
        const leafSvg = one('[data-hero-leaf] svg')
        const leaves = all('[data-hero-leaf] [data-part^="leaf-"]')

        // ---- headline: words rise (never chars — Vietnamese diacritics). Words only: no line
        // detection and no font-load re-split; inline-block words re-wrap on their own. ----------
        const split = SplitText.create(one('[data-hero-title]'), { type: 'words' })
        gsap.from(split.words, { opacity: 0, y: 28, duration: 0.8, ease: EASE.out, stagger: 0.06, delay: 0.1 })

        // ---- intro timeline ----------------------------------------------------------------
        let introDone = false
        const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: DUR.base } })
        // The description is the LCP element: rise only, never hidden. CTAs + trust row fade too.
        tl.from(one('[data-hero-lead]'), { y: 20 }, 0)
          .from(all('[data-hero-copy]'), { opacity: 0, y: 20, stagger: 0.1 }, 0.1)
          .from(one('[data-dash]'), { opacity: 0, y: 48, scale: 0.96, duration: DUR.slow, transformOrigin: '50% 100%' }, 0.2)
          .from(all('[data-kpi]'), { opacity: 0, y: 14, stagger: 0.08 }, 0.6)
          .from(one('[data-map]'), { opacity: 0, duration: 0.5 }, 0.7)
          .from(all('[data-map-fence]'), { scale: 0, opacity: 0, svgOrigin: (i, el) => centerOf(el), stagger: 0.15, duration: 0.8 }, 0.85)
          .fromTo(route, UNDRAWN, { ...DRAWN, duration: 1.4, ease: EASE.inOut }, 0.95)
          .from(all('[data-pin-body]'), { y: -34, opacity: 0, duration: 0.7, ease: EASE.spring, stagger: 0.14 }, 1.15)
          .from(vehicle, { scale: 0, opacity: 0, svgOrigin: centerOf(vehicle), duration: 0.4, ease: EASE.spring }, 2.2)
          .from(one('[data-alerts]'), { opacity: 0, x: 24 }, 0.75)
          .from(all('[data-alert]'), { opacity: 0, x: 32, stagger: 0.12 }, 0.95)
          .from(one('[data-distance-card]'), { opacity: 0, y: 28, duration: 0.8 }, 0.95)
          .fromTo(one('[data-spark-line]'), UNDRAWN, { ...DRAWN, duration: 1.2, ease: EASE.inOut }, 1.2)
          .from(one('[data-spark-area]'), { opacity: 0, duration: 0.7 }, 2.0)
          .from(one('[data-spark-dot]'), { scale: 0, duration: 0.45, ease: EASE.spring }, 2.25)
        // Count-ups start with their tile / card fade (0.6 + i·0.08 and 0.95 above). countUp restores
        // the final text when this branch reverts and never replays an element that already counted.
        kpiCounters.forEach((el, i) =>
          tl.add(countUp(el, { to: Number(el.dataset.count), duration: 1.3, scrollTrigger: false }), 0.6 + i * 0.08),
        )
        if (distanceCounter) {
          tl.add(countUp(distanceCounter, { to: Number(distanceCounter.dataset.count), duration: 1.5, scrollTrigger: false }), 0.95)
        }
        if (leafSvg) {
          tl.fromTo(one('[data-hero-leaf] [data-part="stem"]'), UNDRAWN, { ...DRAWN, duration: 1, ease: EASE.inOut }, 0.5).from(
            leaves,
            // Each leaf's base is its group's local origin (see LeafBranch JSDoc).
            { scale: 0, opacity: 0, svgOrigin: '0 0', duration: 0.6, ease: EASE.spring, stagger: 0.07 },
            0.75,
          )
        }
        tl.call(() => {
          introDone = true
          syncLive()
        })

        // ---- live loops (paused until intro done + hero in view) ---------------------------
        const loops = []
        all('[data-pin-ring]').forEach((ring, i) => {
          loops.push(
            gsap.fromTo(
              ring,
              // svgOrigin in BOTH vars: the ring is centered on the pin's local origin, and a from-state
              // rendered with another origin would skew the inverse-matrix origin math.
              { scale: 0.3, opacity: 0.8, svgOrigin: '0 0' },
              {
                scale: 2.2,
                opacity: 0,
                svgOrigin: '0 0',
                duration: 2,
                ease: 'power1.out',
                repeat: -1,
                repeatDelay: 0.6,
                delay: i * 0.5,
                paused: true,
                immediateRender: false,
              },
            ),
          )
        })
        loops.push(
          gsap.to(vehicle, {
            motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5] },
            duration: 9,
            ease: 'none',
            repeat: -1,
            yoyo: true,
            repeatDelay: 0.8,
            paused: true,
          }),
        )
        if (desktop && leafSvg) {
          leaves.forEach((leaf, i) => {
            loops.push(
              gsap.to(leaf, {
                keyframes: { rotation: [0, 4, 0, -4, 0], easeEach: 'sine.inOut' },
                svgOrigin: '0 0',
                duration: 4 + (i % 3) * 0.7,
                delay: i * 0.15,
                ease: 'none',
                repeat: -1,
                paused: true,
              }),
            )
          })
          loops.push(
            gsap.to(leafSvg, {
              keyframes: { rotation: [0, 1.5, 0, -1.5, 0], easeEach: 'sine.inOut' },
              transformOrigin: '80% 100%',
              duration: 7,
              ease: 'none',
              repeat: -1,
              paused: true,
            }),
          )
        }

        // ---- alert ticker: every 6s prepend the next alert, Flip the list ----------------
        let alive = true
        let bumped = 0
        const liveBase = liveCounter ? Number(liveCounter.dataset.count) : 0
        const tick = () => {
          if (!alive || !list || !dashRef.current) return
          const items = list.querySelectorAll('[data-alert]')
          gsap.to(items[items.length - 1], {
            opacity: 0,
            x: 24,
            duration: 0.35,
            ease: 'power2.in',
            onComplete: () => {
              if (!alive || !dashRef.current) return
              const state = Flip.getState(list.querySelectorAll('[data-alert]'))
              dashRef.current.pushAlert() // flushSync → DOM updated now
              Flip.from(state, {
                targets: list.querySelectorAll('[data-alert]'),
                duration: DUR.base,
                ease: EASE.out,
                onEnter: (els) =>
                  gsap.fromTo(els, { opacity: 0, x: 32 }, { opacity: 1, x: 0, duration: 0.55, ease: EASE.out, delay: 0.1 }),
              })
              if (liveCounter) {
                bumped += 1
                setText(liveCounter, formatStat(liveBase + bumped))
                gsap.fromTo(liveCounter, { scale: 1.3 }, { scale: 1, duration: 0.5, ease: EASE.spring })
              }
            },
          })
        }
        const ticker = gsap.timeline({ repeat: -1, paused: true }).call(tick, null, TICK_SECONDS)
        loops.push(ticker)

        let inView = true
        function syncLive() {
          const on = introDone && inView && !isMotionPaused()
          loops.forEach((a) => a.paused(!on))
        }
        const offPause = onMotionPauseChange(syncLive)
        const viewTrigger = ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            inView = self.isActive
            syncLive()
          },
        })
        inView = viewTrigger.isActive

        // ---- desktop: dashboard tilts toward the pointer ---------------------------------
        let removeTilt = () => {}
        const tiltEl = one('[data-dash-tilt]')
        if (desktop && tiltEl) {
          gsap.set(tiltEl, { transformPerspective: 1200, transformOrigin: '50% 50%' })
          const rx = gsap.quickTo(tiltEl, 'rotationX', { duration: 0.8, ease: EASE.out })
          const ry = gsap.quickTo(tiltEl, 'rotationY', { duration: 0.8, ease: EASE.out })
          const clamp = gsap.utils.clamp(-1, 1)
          // Cache the rect: reading it on every pointermove forced a style recalc per event while the
          // hero loops dirty styles each frame. Re-read only after a scroll / resize.
          let rect = null
          const invalidate = () => {
            rect = null
          }
          const onMove = (e) => {
            if (e.pointerType !== 'mouse') return
            const r = rect ?? (rect = tiltEl.getBoundingClientRect())
            ry(clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * TILT_DEG)
            rx(clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * -TILT_DEG)
          }
          const onLeave = () => {
            rx(0)
            ry(0)
          }
          root.addEventListener('pointermove', onMove)
          root.addEventListener('pointerleave', onLeave)
          root.addEventListener('pointerenter', invalidate)
          window.addEventListener('scroll', invalidate, { passive: true })
          window.addEventListener('resize', invalidate)
          ScrollTrigger.addEventListener('scrollEnd', invalidate)
          removeTilt = () => {
            root.removeEventListener('pointermove', onMove)
            root.removeEventListener('pointerleave', onLeave)
            root.removeEventListener('pointerenter', invalidate)
            window.removeEventListener('scroll', invalidate)
            window.removeEventListener('resize', invalidate)
            ScrollTrigger.removeEventListener('scrollEnd', invalidate)
          }
        }

        return () => {
          alive = false
          offPause()
          removeTilt()
          // Ticker tweens are created after this context ran, so clean them up by hand.
          const items = list ? list.querySelectorAll('[data-alert]') : []
          gsap.killTweensOf(items)
          gsap.set(items, { clearProps: 'opacity,transform' })
          if (liveCounter) {
            gsap.killTweensOf(liveCounter)
            gsap.set(liveCounter, { clearProps: 'transform' })
          }
        }
      })

      return () => mm.revert()
    },
    { scope: rootRef },
  )

  return (
    <section id="top" ref={rootRef} className="relative isolate overflow-hidden bg-white pt-[72px]">
      <Backdrop />

      <div className="container-page relative z-10 grid items-center gap-12 pt-10 pb-24 md:pt-14 md:pb-32 lg:grid-cols-12 lg:gap-8 lg:pt-14 lg:pb-32 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)] xl:gap-10">
        <div className="lg:col-span-5 xl:col-span-1">
          {/* 44px at xl so line 1 fits the 560px column on one line (3-line headline, as in the
              mockup). The {' '} keeps the two lines separate words in the accessible name. */}
          <h1 data-hero-title className="heading-hero tracking-[-0.02em] text-navy xl:text-[44px]">
            <span className="block"><NoOrphan text={HERO.titleLine1} /></span>{' '}
            <span className="block text-brand"><NoOrphan text={HERO.titleLine2} /></span>
          </h1>
          <p data-reveal data-hero-lead className="mt-5 max-w-[480px] text-body-lg text-ink">
            {HERO.description}
          </p>
          <div data-reveal data-hero-copy className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">{HERO.primaryCta}</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => scrollToSection('demo')}>
              {HERO.secondaryCta}
              <CirclePlay data-icon="inline-end" className="size-5" />
            </Button>
          </div>
          <TrustRow />
        </div>

        <div data-reveal className="lg:col-span-7 xl:col-span-1">
          <FleetDashboard ref={dashRef} className="xl:-mr-10" />
        </div>
      </div>

      <Wave />
      <div
        aria-hidden="true"
        data-hero-leaf
        data-speed="clamp(0.95)"
        className="pointer-events-none absolute right-0 bottom-2 hidden w-[150px] lg:block lg:w-[160px] xl:right-3 xl:w-[176px]"
      >
        <LeafBranch className="block h-auto w-full" />
      </div>
    </section>
  )
}

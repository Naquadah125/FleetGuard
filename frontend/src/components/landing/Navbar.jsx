import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'

import FleetGuardLogo from '@/components/brand/FleetGuardLogo'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { NAV_ACTIONS as COPY, NAV_LINKS } from '@/content/landing'
import { ScrollTrigger, gsap, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ } from '@/lib/motion/presets'
import { deferSetup } from '@/lib/motion/defer'
import { scrollToSection } from '@/lib/motion/scroll'
import { cn } from '@/lib/utils'

/** Scroll distance (px) after which the bar turns solid. */
const SOLID_AFTER = 24

const SECTION_IDS = [...new Set(NAV_LINKS.map((l) => l.id))]

/**
 * Two links share `contact` ("Tài nguyên", "Liên hệ"); only the last one is highlighted
 * so the bar never shows two active items at once.
 */
const activeIndexFor = (id) => NAV_LINKS.findLastIndex((l) => l.id === id)

/** Active section at scroll 0 (the hero): shown from the first paint, before the markers exist. */
const LOAD_ACTIVE_ID = NAV_LINKS[0].id

/**
 * Landing navbar — fixed, 72px. Transparent over the hero, white/90 + blur + shadow once the
 * page scrolls past 24px (`data-scrolled`, set directly — no React re-render).
 * Active link follows the section whose top has passed the middle of the viewport (one
 * measuring ScrollTrigger per section id); at the very bottom of the page the last section
 * ("Liên hệ" → the short footer, whose top never reaches the middle) is active. Ids that are not
 * in the DOM are skipped and bound later on ScrollTrigger refresh.
 * Both states are derived from the scroll position (not from trigger activity), so they also
 * hold at scroll === max, where ScrollTrigger reports an `end: 'max'` trigger as inactive.
 * The section binding + first measure run through `deferSetup` (after first paint):
 * `ScrollTrigger.create` forces the page's first full layout, which otherwise lands inside the
 * hero's first commit (~150ms at 4x CPU, on the LCP path). The markup already carries the load
 * state (`data-scrolled="false"`, "Trang chủ" active), and the scroll listener is attached at
 * once, so any scroll before the deferred bind (restore, hash jump) still updates `data-scrolled`;
 * the active link follows as soon as the markers are measured.
 * < 1024px: menu button opens a right-hand Sheet; picking a link closes it, then scrolls and
 * moves focus to the section (Radix's return-focus-to-trigger is skipped in that case).
 */
export default function Navbar() {
  const headerRef = useRef(null)
  const pendingScrollRef = useRef(null)
  const [activeId, setActiveId] = useState(LOAD_ACTIVE_ID)
  const [menuOpen, setMenuOpen] = useState(false)
  const activeIndex = activeId ? activeIndexFor(activeId) : -1

  useGSAP(
    (_ctx, contextSafe) => {
      const header = headerRef.current

      // Section markers: their `start` is the scroll position where the section's top reaches
      // the middle of the viewport (ScrollTrigger keeps it right with ScrollSmoother, fonts,
      // resizes). Bound lazily: sections may mount after the navbar.
      /** @type {{ id: string, st: ScrollTrigger }[]} */
      const markers = []
      const bindSections = contextSafe(() => {
        for (const id of SECTION_IDS) {
          if (markers.some((m) => m.id === id)) continue
          const el = document.getElementById(id)
          if (!el) continue
          markers.push({ id, st: ScrollTrigger.create({ trigger: el, start: 'top 50%', end: 'bottom 50%' }) })
        }
      })

      // Not an animation (CSS transitions the colours, motion-reduce disables that), so it runs
      // for every media query.
      // Layout-derived values are cached on ScrollTrigger refresh (which measures anyway), so a
      // scroll only reads scrollY — no extra forced layout per frame.
      let maxScroll = Infinity
      let sorted = []
      let measured = false
      const measure = () => {
        measured = true
        maxScroll = ScrollTrigger.maxScroll(window)
        sorted = markers.filter((m) => m.st.trigger?.isConnected).sort((a, b) => a.st.start - b.st.start)
      }
      const sync = () => {
        const y = window.scrollY
        const scrolled = String(y > SOLID_AFTER)
        if (header.dataset.scrolled !== scrolled) header.dataset.scrolled = scrolled
        // Markers not measured yet (deferred bind pending): keep the load state's active link.
        if (!measured) return
        let id = null
        if (sorted.length && y >= maxScroll - 1) id = sorted[sorted.length - 1].id
        else for (const m of sorted) if (m.st.start <= y) id = m.id
        setActiveId(id)
      }

      // A plain scroll listener, not a ScrollTrigger onUpdate: jumps straight to max scroll
      // (focusing a footer link through ScrollSmoother, End key, hash) skip trigger callbacks,
      // which left the bar transparent over the footer. Scroll events are dispatched once per
      // frame, before rAF/GSAP writes, so reading scrollY here is cheap.
      window.addEventListener('scroll', sync, { passive: true })
      const onRefresh = () => {
        if (markers.length < SECTION_IDS.length) bindSections()
        measure()
        sync()
      }
      ScrollTrigger.addEventListener('refresh', onRefresh)
      // Deferred past first paint (see the component doc). Until it runs, `sync` only keeps
      // `data-scrolled` in step; the active link stays at its load state (the hero).
      const cancelBind = deferSetup(
        contextSafe(() => {
          bindSections()
          measure()
          sync()
        }),
      )

      // Entrance. fromTo (not from): the buttons carry a CSS opacity transition, so after a
      // StrictMode revert `from()` would read a mid-transition opacity (~0) as its end value.
      const mm = gsap.matchMedia()
      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
        const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: DUR.base } })
        tl.fromTo(
          '[data-part="chevron-top"], [data-part="chevron-bottom"]',
          { x: -14, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.12 },
        )
          .fromTo('[data-part="wordmark"]', { x: -8, opacity: 0 }, { x: 0, opacity: 1 }, '<0.1')
          .fromTo(
            '[data-nav-item]',
            { y: -12, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.06, clearProps: 'transform,opacity' },
            '<0.05',
          )
      })

      return () => {
        cancelBind()
        window.removeEventListener('scroll', sync)
        ScrollTrigger.removeEventListener('refresh', onRefresh)
        mm.revert()
      }
    },
    { scope: headerRef },
  )

  // Close the sheet if the viewport grows into the desktop layout while it is open.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e) => {
      if (e.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const goTo = (id) => (event) => {
    event.preventDefault()
    scrollToSection(id)
  }

  // Mobile: close first; scroll once the sheet has finished closing (scroll lock released).
  const goToFromMenu = (id) => (event) => {
    event.preventDefault()
    pendingScrollRef.current = id
    setMenuOpen(false)
  }

  const onMenuCloseAutoFocus = (event) => {
    const id = pendingScrollRef.current
    if (!id) return
    pendingScrollRef.current = null
    // Focus goes to the target section (scrollToSection), not back to the menu button.
    event.preventDefault()
    requestAnimationFrame(() => scrollToSection(id))
  }

  return (
    <header
      ref={headerRef}
      data-scrolled="false"
      className={cn(
        'fixed inset-x-0 top-0 z-40 h-[72px] border-b border-transparent',
        'transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 motion-reduce:transition-none',
        'data-[scrolled=true]:border-line/60 data-[scrolled=true]:bg-white/90 data-[scrolled=true]:shadow-card data-[scrolled=true]:backdrop-blur-md',
      )}
    >
      {/* Skip link: first Tab stop, visible only while focused; jumps past the nav to <main>. */}
      <a
        href="#main"
        onClick={goTo('main')}
        className="sr-only rounded-md bg-white text-body font-semibold text-brand-dark shadow-card outline-none focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:px-4 focus-ring"
      >
        {COPY.skipToContent}
      </a>
      <div className="container-page flex h-full items-center justify-between gap-6">
        <a
          href="#top"
          onClick={goTo('top')}
          className="-mx-1 flex min-h-11 items-center rounded-md px-1 outline-none focus-ring"
        >
          <FleetGuardLogo className="text-xl" />
        </a>

        <nav aria-label={COPY.navLabel} className="hidden lg:block">
          <ul className="flex items-center gap-1 xl:gap-3">
            {NAV_LINKS.map((link, i) => {
              const active = i === activeIndex
              return (
                <li key={link.label} data-nav-item>
                  <a
                    href={`#${link.id}`}
                    onClick={goTo(link.id)}
                    aria-current={active ? 'location' : undefined}
                    className={cn(
                      'group/link relative flex h-11 items-center gap-1 rounded-md px-3 text-body font-medium text-ink',
                      'transition-colors duration-200 outline-none hover:text-brand-dark focus-ring',
                      active && 'text-brand-dark',
                    )}
                  >
                    {link.label}
                    {/* `menu` links are a dropdown-style group in the mockup: chevron. */}
                    {link.menu ? (
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 transition-transform duration-200 group-hover/link:translate-y-0.5 motion-reduce:transition-none"
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none absolute inset-x-3 bottom-1.5 h-0.5 origin-center scale-x-0 rounded-full bg-brand-dark',
                        'transition-transform duration-300 ease-out motion-reduce:transition-none',
                        active && 'scale-x-100',
                      )}
                    />
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="outline" data-nav-item>
            <Link to="/login">{COPY.login}</Link>
          </Button>
          <Button asChild data-nav-item>
            <Link to="/register">{COPY.register}</Link>
          </Button>
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-lg" aria-label={COPY.openMenu} className="-mr-2 lg:hidden" data-nav-item>
              <Menu aria-hidden="true" className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            aria-describedby={undefined}
            showCloseButton={false}
            onCloseAutoFocus={onMenuCloseAutoFocus}
            className="gap-0 bg-white"
          >
            <SheetHeader className="h-[72px] justify-center border-b border-line px-5">
              <SheetTitle>
                <FleetGuardLogo className="text-xl" />
              </SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon-lg" aria-label={COPY.closeMenu} className="absolute top-3 right-3">
                  <X aria-hidden="true" className="size-5" />
                </Button>
              </SheetClose>
            </SheetHeader>
            <nav aria-label={COPY.navLabel} className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link, i) => {
                  const active = i === activeIndex
                  return (
                    <li key={link.label}>
                      <a
                        href={`#${link.id}`}
                        onClick={goToFromMenu(link.id)}
                        aria-current={active ? 'location' : undefined}
                        className={cn(
                          'flex h-12 items-center rounded-md px-4 text-body-lg font-medium text-navy',
                          'transition-colors duration-200 outline-none hover:bg-surface focus-ring',
                          active && 'bg-brand-50 text-brand-dark',
                        )}
                      >
                        {link.label}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <SheetFooter className="gap-3 border-t border-line p-5">
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/login">{COPY.login}</Link>
              </Button>
              <Button asChild size="lg" className="w-full">
                <Link to="/register">{COPY.register}</Link>
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

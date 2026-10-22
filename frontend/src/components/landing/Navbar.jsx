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
import { scrollToSection } from '@/lib/motion/scroll'
import { cn } from '@/lib/utils'

/** Links that open a dropdown-style group in the mockup get a chevron. */
const WITH_CHEVRON = new Set(['Tài nguyên'])

/** Scroll distance (px) after which the bar turns solid. */
const SOLID_AFTER = 24

const SECTION_IDS = [...new Set(NAV_LINKS.map((l) => l.id))]

/**
 * Two links share `contact` ("Tài nguyên", "Liên hệ"); only the last one is highlighted
 * so the bar never shows two active items at once.
 */
const activeIndexFor = (id) => NAV_LINKS.findLastIndex((l) => l.id === id)

/**
 * Landing navbar — fixed, 72px. Transparent over the hero, white/90 + blur + shadow once the
 * page scrolls past 24px (ScrollTrigger onToggle → `data-scrolled`, no React re-render).
 * Active link follows the section in the middle of the viewport (one ScrollTrigger per
 * section id); ids that are not in the DOM are skipped and bound later on ScrollTrigger refresh.
 * < 1024px: menu button opens a right-hand Sheet; picking a link closes it, then scrolls.
 */
export default function Navbar() {
  const headerRef = useRef(null)
  const pendingScrollRef = useRef(null)
  const [activeId, setActiveId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const activeIndex = activeId ? activeIndexFor(activeId) : -1

  useGSAP(
    (_ctx, contextSafe) => {
      const header = headerRef.current

      // Solid background state. Not an animation (CSS transitions the colours, and
      // motion-reduce disables that), so it runs for every media query.
      ScrollTrigger.create({
        start: SOLID_AFTER,
        end: 'max',
        onToggle: (self) => {
          header.dataset.scrolled = String(self.isActive)
        },
      })

      // Active link per section. Bound lazily: sections may mount after the navbar.
      const bound = new Set()
      const bindSections = contextSafe(() => {
        for (const id of SECTION_IDS) {
          if (bound.has(id)) continue
          const el = document.getElementById(id)
          if (!el) continue
          bound.add(id)
          ScrollTrigger.create({
            trigger: el,
            start: 'top 50%',
            end: 'bottom 50%',
            // Refresh after other triggers (pins etc.) so section positions are final.
            refreshPriority: -1,
            onToggle: (self) => {
              if (self.isActive) setActiveId(id)
            },
          })
        }
      })
      bindSections()
      const onRefresh = () => {
        if (bound.size < SECTION_IDS.length) bindSections()
      }
      ScrollTrigger.addEventListener('refresh', onRefresh)

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

  const onMenuCloseAutoFocus = () => {
    const id = pendingScrollRef.current
    if (!id) return
    pendingScrollRef.current = null
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
      <div className="container-page flex h-full items-center justify-between gap-6">
        <a
          href="#top"
          onClick={goTo('top')}
          className="-mx-1 flex min-h-11 items-center rounded-md px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
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
                      'transition-colors duration-200 outline-none hover:text-brand-dark focus-visible:ring-3 focus-visible:ring-ring/40',
                      active && 'text-brand-dark',
                    )}
                  >
                    {link.label}
                    {WITH_CHEVRON.has(link.label) ? (
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
                          'transition-colors duration-200 outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/40',
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

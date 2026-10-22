import { Mail, MapPin, Phone } from 'lucide-react'

import FleetGuardLogo, { FleetGuardMark } from '@/components/brand/FleetGuardLogo'
import Reveal from '@/components/landing/Reveal'
import { Separator } from '@/components/ui/separator'
import { FOOTER, NAV_LINKS } from '@/content/landing'
import { scrollToSection } from '@/lib/motion/scroll'
import { cn } from '@/lib/utils'

/**
 * Brand glyphs (lucide has no brand icons). 24×24, filled with currentColor.
 * Labels are the brand names themselves, so they are not copy to translate.
 */
const SOCIAL = {
  facebook: {
    label: 'Facebook',
    path: 'M14 8.5h2.5V5H14c-2.2 0-4 1.8-4 4v2H8v3.5h2V22h3.5v-7.5H16l.5-3.5h-3V9c0-.3.2-.5.5-.5z',
  },
  youtube: {
    label: 'YouTube',
    path: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15.2V8.8l5.4 3.2L10 15.2z',
  },
  linkedin: {
    label: 'LinkedIn',
    path: 'M5 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.1 9.4h3.8V21H3.1V9.4zm6.3 0h3.6V11h.05c.5-.95 1.75-1.95 3.6-1.95 3.85 0 4.55 2.5 4.55 5.8V21h-3.8v-5.4c0-1.3-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.86V21H9.4V9.4z',
  },
  zalo: {
    label: 'Zalo',
    // Chat bubble with a "Z" knocked out (evenodd).
    path: 'M12 3C6.5 3 2 6.6 2 11.1c0 2.4 1.3 4.6 3.4 6.1L4.7 21l4.1-2.2c1 .3 2.1.4 3.2.4 5.5 0 10-3.6 10-8.1S17.5 3 12 3zM8.4 8h7.2v1.6l-4.7 5h4.7V16H8.4v-1.6l4.7-5H8.4V8z',
  },
}

/*
 * Faint route map behind the footer (static; decorative). Streets are white at a few percent, the
 * routes mint dashes, so the dark ground only lifts a hair and every text colour keeps its contrast
 * (white/70 stays ≥ 7:1). Masked to the outer edges so the link columns sit on calm ground.
 */
const FOOTER_STREETS = [
  'M-40 330C180 270 330 360 560 300S900 140 1120 190 1380 120 1500 60',
  'M980 -20C1010 120 940 210 1060 300S1300 380 1260 520',
  'M-40 120C140 160 260 90 420 140S640 260 600 400',
  'M1500 300C1360 330 1280 280 1180 330S1040 460 1100 540',
]
const FOOTER_ROUTES = [FOOTER_STREETS[0], FOOTER_STREETS[1]]
const FOOTER_STOPS = [
  [560, 300],
  [1060, 300],
  [420, 140],
  [1180, 330],
]
const FOOTER_MASK = 'radial-gradient(ellipse 70% 90% at 50% 45%, transparent 35%, #000 85%)'

function FooterRoutes() {
  return (
    <svg
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
      className="absolute inset-0 size-full"
      style={{ maskImage: FOOTER_MASK, WebkitMaskImage: FOOTER_MASK }}
    >
      <g fill="none" strokeLinecap="round">
        {FOOTER_STREETS.map((d) => (
          <path key={d} d={d} stroke="#fff" strokeOpacity="0.045" strokeWidth="12" vectorEffect="non-scaling-stroke" />
        ))}
        {FOOTER_ROUTES.map((d) => (
          <path
            key={`r${d}`}
            d={d}
            stroke="#34D3A4"
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeDasharray="2 10"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {FOOTER_STOPS.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="11" fill="#fff" fillOpacity="0.035" />
            <circle cx={x} cy={y} r="4" fill="var(--color-footer)" stroke="#34D3A4" strokeOpacity="0.35" strokeWidth="2" />
          </g>
        ))}
      </g>
    </svg>
  )
}

/** Product-group items that are also landing sections ("Tính năng" → #features …). */
const PRODUCT_SECTION_IDS = Object.fromEntries(NAV_LINKS.map((l) => [l.label, l.id]))

// -mx-1 px-1: the focus outline gets breathing room without shifting the text; min-w-11 keeps
// short labels ("Blog") a 44px touch target.
const linkClass = cn(
  '-mx-1 inline-flex min-h-11 min-w-11 items-center rounded-sm px-1 text-body text-white/80 lg:min-h-8 lg:min-w-0',
  'transition-colors duration-200 outline-none hover:text-white focus-ring-light',
)

/** Placeholder links (no destination yet) must not jump to the top or append "#" to the URL. */
const stayPut = (event) => event.preventDefault()

function SocialIcon({ name }) {
  const icon = SOCIAL[name]
  if (!icon) return null
  return (
    <a
      href="#"
      onClick={stayPut}
      aria-label={icon.label}
      className={cn(
        // 36px circle; the ::after extends the hit area to 44px.
        'relative flex size-9 items-center justify-center rounded-full bg-white/10 text-white',
        'transition-[background-color,transform] duration-200 outline-none after:absolute after:-inset-1 after:content-[""]',
        'hover:-translate-y-0.5 hover:bg-white/20 focus-ring-light',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-[18px]" fill="currentColor">
        <path d={icon.path} fillRule="evenodd" clipRule="evenodd" />
      </svg>
    </a>
  )
}

function LinkGroup({ group, sectionLinks }) {
  return (
    <div data-reveal className="flex flex-col gap-3">
      <h3 className="text-body font-semibold text-white">{group.title}</h3>
      <ul className="flex flex-col lg:gap-1">
        {group.links.map((label) => {
          const id = sectionLinks ? PRODUCT_SECTION_IDS[label] : undefined
          return (
            <li key={label}>
              {id ? (
                <a
                  href={`#${id}`}
                  onClick={(event) => {
                    event.preventDefault()
                    scrollToSection(id)
                  }}
                  className={linkClass}
                >
                  {label}
                </a>
              ) : (
                <a href="#" onClick={stayPut} className={linkClass}>
                  {label}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Landing footer (`#contact`): brand + socials, three link groups, contact block, bottom bar.
 * Columns reveal with a stagger (Reveal). Depth comes from a dark-teal gradient, a faint static
 * route map on the outer edges, a soft brand glow and an oversized brand mark (parallax via
 * `data-speed` once ScrollSmoother is on). No teal 3D badges here (they vanish on the dark ground).
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer id="contact" className="relative isolate overflow-hidden bg-footer text-white/80">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {/* Depth: a dark-teal fall (lifted toward brand at the top seam, deepening at the base). */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in oklab, var(--color-footer) 88%, var(--color-brand)), var(--color-footer) 45%, color-mix(in oklab, var(--color-footer) 80%, black))',
          }}
        />
        <FooterRoutes />
        {/* Soft glow as a radial gradient (no `filter: blur`, nothing to re-raster on scroll). */}
        <div className="absolute -top-56 -left-48 size-[640px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brand)_15%,transparent),transparent)]" />
        <FleetGuardMark
          variant="light"
          data-speed="0.92"
          className="absolute -right-24 -bottom-28 size-[360px] opacity-[0.04] lg:size-[440px]"
        />
      </div>

      <div className="relative container-page pt-14 pb-8 lg:pt-16">
        {/* Parent heading for the column h3s (otherwise they nest under the last section's h2). */}
        <h2 className="sr-only">{FOOTER.srTitle}</h2>
        <Reveal className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1.15fr_1fr_1.45fr] lg:gap-8">
          <div data-reveal className="col-span-2 flex flex-col gap-5 md:col-span-3 lg:col-span-1">
            <a
              href="#top"
              onClick={(event) => {
                event.preventDefault()
                scrollToSection('top')
              }}
              className="-mx-1 flex min-h-11 w-fit items-center rounded-md px-1 outline-none focus-ring-light"
            >
              <FleetGuardLogo variant="light" className="text-xl" />
            </a>
            <p className="max-w-xs text-body text-white/80">{FOOTER.description}</p>
            <ul className="flex items-center gap-3">
              {FOOTER.socials.map((name) => (
                <li key={name}>
                  <SocialIcon name={name} />
                </li>
              ))}
            </ul>
          </div>

          {FOOTER.groups.map((group, i) => (
            <LinkGroup key={group.title} group={group} sectionLinks={i === 0} />
          ))}

          <div data-reveal className="col-span-2 flex flex-col gap-3 md:col-span-3 lg:col-span-1">
            <h3 className="text-body font-semibold text-white">{FOOTER.contactTitle}</h3>
            <ul className="flex flex-col gap-1 lg:gap-2">
              <li>
                <a href={`tel:${FOOTER.phone.replace(/\s+/g, '')}`} className={cn(linkClass, 'gap-3')}>
                  <Phone aria-hidden="true" className="size-4 shrink-0 text-white/70" />
                  {FOOTER.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${FOOTER.email}`} className={cn(linkClass, 'gap-3 break-all')}>
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-white/70" />
                  {FOOTER.email}
                </a>
              </li>
              <li className="flex items-start gap-3 py-2.5 text-body lg:py-1">
                <MapPin aria-hidden="true" className="mt-[3px] size-4 shrink-0 text-white/70" />
                <span>{FOOTER.address}</span>
              </li>
            </ul>
          </div>
        </Reveal>

        <Separator className="mt-12 bg-white/10 lg:mt-14" />

        <div className="flex flex-col-reverse gap-3 pt-6 text-body md:flex-row md:items-center md:justify-between">
          <p className="text-white/70">
            © {year} {FOOTER.copyright}
          </p>
          <ul className="flex flex-wrap items-center gap-x-3">
            {FOOTER.legal.map((label, i) => (
              <li key={label} className="flex items-center gap-3">
                {i > 0 ? (
                  <span aria-hidden="true" className="text-white/40">
                    |
                  </span>
                ) : null}
                <a href="#" onClick={stayPut} className={linkClass}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

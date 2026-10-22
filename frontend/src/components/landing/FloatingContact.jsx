import { useEffect, useRef, useState } from 'react'
import { Phone } from 'lucide-react'
import { CONTACT_CTA } from '@/content/landing'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { EASE, MQ } from '@/lib/motion/presets'
import { cn } from '@/lib/utils'
import { isMotionPaused, onMotionPauseChange } from './motionPause'

/** Mount delay: nothing is added to the hero's first-paint path. */
const ENTRANCE_DELAY_MS = 1500
/** Pulse cycle: 1.4s ring + 2.6s rest ≈ one pulse every 4s. */
const PULSE = { duration: 1.4, rest: 2.6 }

/** Zalo mark: white speech bubble with the blue "Zalo" wordmark (brand name, not copy). */
function ZaloMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="size-8 md:size-[34px]">
      <path
        d="M16 4.5C9.1 4.5 3.5 9 3.5 14.6c0 3.1 1.8 5.9 4.6 7.7l-.9 4.4 4.6-2.4c1.3.4 2.7.6 4.2.6 6.9 0 12.5-4.5 12.5-10.3S22.9 4.5 16 4.5z"
        fill="white"
      />
      <text
        x="16"
        y="17.4"
        textAnchor="middle"
        fontSize="7.4"
        fontWeight="800"
        letterSpacing="-0.2"
        fill="var(--color-zalo)"
        style={{ fontFamily: 'inherit' }}
      >
        Zalo
      </text>
    </svg>
  )
}

/**
 * One round contact button: ≥48px disc (52px from md), white ring for separation on any tint,
 * label pill that slides out on hover / keyboard focus (md and up; phones show the disc only).
 * The pill is aria-hidden — the link's name is its aria-label.
 */
function ContactButton({ href, label, ariaLabel, discClassName, external, pulse, children }) {
  return (
    <div data-cta-item>
      <a
        href={href}
        aria-label={ariaLabel}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={cn(
          'group relative flex size-12 items-center justify-center rounded-full md:size-13',
          // Outline 4px out, just past the disc's 3px white ring. `brand` (not brand-dark): the CTA
          // floats over both the light tints (>= 3.1:1) and the dark footer (3.5:1), WCAG 1.4.11.
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand focus-visible:outline-solid',
        )}
      >
        {pulse ? (
          <span
            aria-hidden="true"
            data-cta-ring
            className="pointer-events-none absolute inset-0 rounded-full bg-brand/40 opacity-0"
          />
        ) : null}
        <span
          className={cn(
            'relative flex size-full items-center justify-center rounded-full text-white shadow-card-hover ring-[3px] ring-white',
            'transition-[scale,background-color] duration-200 ease-out group-hover:scale-105 group-active:scale-95',
            'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
            discClassName,
          )}
        >
          {children}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 whitespace-nowrap max-md:hidden',
            'rounded-full border border-line bg-white px-4 py-2 text-body font-semibold text-navy shadow-card',
            'translate-x-2 opacity-0 transition-[opacity,translate] duration-200 ease-out',
            'group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
            'motion-reduce:translate-x-0 motion-reduce:transition-none',
          )}
        >
          {label}
        </span>
      </a>
    </div>
  )
}

function Dock() {
  const ref = useRef(null)

  useGSAP(
    () => {
      const root = ref.current
      const mm = gsap.matchMedia()
      mm.add(`${MQ.desktop}, ${MQ.mobile}`, () => {
        gsap.from('[data-cta-item]', {
          autoAlpha: 0,
          y: 16,
          scale: 0.85,
          duration: 0.5,
          stagger: 0.08,
          ease: EASE.spring,
          clearProps: 'transform,opacity,visibility',
        })

        // Attention pulse on the hotline: every ~4s, only while motion is not paused and the
        // footer's own contact block (#contact) is off screen. IntersectionObserver (not a
        // ScrollTrigger) so the page's trigger count does not depend on this late mount.
        const ring = root.querySelector('[data-cta-ring]')
        const pulse = gsap
          .timeline({ paused: true, repeat: -1, delay: 0.8 })
          .fromTo(
            ring,
            { scale: 1, opacity: 0.55 },
            { scale: 1.75, opacity: 0, duration: PULSE.duration, ease: 'power2.out', immediateRender: false },
          )
          .to({}, { duration: PULSE.rest })

        let footerInView = false
        let running = false
        const sync = () => {
          const run = !footerInView && !isMotionPaused()
          if (run === running) return
          running = run
          if (run) pulse.restart(true)
          else {
            pulse.pause()
            gsap.set(ring, { opacity: 0 })
          }
        }
        const footer = document.getElementById('contact')
        const io =
          footer && typeof IntersectionObserver !== 'undefined'
            ? new IntersectionObserver(([entry]) => {
                footerInView = entry.isIntersecting
                sync()
              })
            : null
        if (io) io.observe(footer)
        const unsubscribe = onMotionPauseChange(sync)
        sync()

        return () => {
          io?.disconnect()
          unsubscribe()
        }
      })
      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <div
      ref={ref}
      data-floating-contact
      className={cn(
        'fixed z-30 flex flex-col items-end gap-3 print:hidden',
        'right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]',
      )}
    >
      <ContactButton
        href={`https://zalo.me/${CONTACT_CTA.zaloNumber}`}
        label={CONTACT_CTA.zaloLabel}
        ariaLabel={CONTACT_CTA.ariaZalo}
        discClassName="bg-zalo"
        external
      >
        <ZaloMark />
      </ContactButton>
      <ContactButton
        href={CONTACT_CTA.hotlineHref}
        label={CONTACT_CTA.hotlineLabel}
        ariaLabel={CONTACT_CTA.ariaHotline}
        discClassName="bg-brand-dark group-hover:bg-brand-darker"
        pulse
      >
        <Phone aria-hidden="true" className="size-[22px] md:size-6" strokeWidth={2.25} />
      </ContactButton>
    </div>
  )
}

/**
 * Floating contact CTA (Zalo + Hotline), fixed bottom-right, safe-area aware. Mount it OUTSIDE
 * `#smooth-wrapper` (ScrollSmoother transforms the content, which breaks `position: fixed`).
 *
 * - Appears 1.5s after mount (not rendered before: no work in the hero's first-paint path), with a
 *   short pop-in; under reduced motion it simply appears.
 * - z-30: above page content, below the fixed navbar (z-40) and the mobile Sheet (z-50).
 * - Sits 16px from the right/bottom edges; the hero dashboard and AI-demo pause buttons are
 *   inline (they scroll past it) and never under it at rest — see the Phase 6 V report.
 * - The hotline pulse respects MotionPause and pauses while the footer contact block is visible.
 */
export default function FloatingContact() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), ENTRANCE_DELAY_MS)
    return () => clearTimeout(t)
  }, [])
  return shown ? <Dock /> : null
}

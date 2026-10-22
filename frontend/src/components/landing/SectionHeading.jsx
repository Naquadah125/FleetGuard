import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { gsap, SplitText, useGSAP } from '@/lib/motion/gsap'
import { DUR, EASE, MQ, clampStart } from '@/lib/motion/presets'

/**
 * Section title block: h2 (heading-section, navy) + optional 48×3 brand underline + optional subtitle.
 * Reveals once on scroll: title words rise in (SplitText lines,words — never chars, to keep
 * Vietnamese diacritics intact; no line mask), then underline grows and subtitle fades up.
 * Static under prefers-reduced-motion.
 *
 * Don't place it as a direct `[data-reveal]` child of <Reveal>; it animates itself.
 *
 * @param {{ title: string, subtitle?: string, align?: 'center'|'left', underline?: boolean,
 *   as?: import('react').ElementType, id?: string, className?: string }} props
 */
export default function SectionHeading({
  title,
  subtitle,
  align = 'center',
  underline = false,
  as: Tag = 'h2',
  id,
  className,
}) {
  const ref = useRef(null)
  const center = align === 'center'

  useGSAP(
    () => {
      const root = ref.current
      const heading = root.querySelector('[data-heading-title]')
      const bar = root.querySelector('[data-heading-underline]')
      const sub = root.querySelector('[data-heading-subtitle]')

      const mm = gsap.matchMedia()
      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
        const scrollTrigger = () => ({ trigger: root, start: clampStart(), once: true })

        // autoSplit re-splits after the web font loads / on resize; returning the tween lets
        // SplitText revert and time-sync it on each re-split.
        SplitText.create(heading, {
          type: 'lines,words',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.words, {
              opacity: 0,
              y: 18,
              duration: DUR.base,
              ease: EASE.out,
              stagger: 0.05,
              scrollTrigger: scrollTrigger(),
            }),
        })

        if (bar || sub) {
          const tl = gsap.timeline({ delay: 0.25, scrollTrigger: scrollTrigger() })
          if (bar) {
            tl.from(bar, {
              scaleX: 0,
              transformOrigin: center ? '50% 50%' : '0% 50%',
              duration: DUR.base,
              ease: EASE.out,
            })
          }
          if (sub) tl.from(sub, { opacity: 0, y: 12, duration: DUR.base, ease: EASE.out }, bar ? '<0.1' : 0)
        }
      })
      return () => mm.revert()
    },
    { scope: ref, dependencies: [title, subtitle, underline, align], revertOnUpdate: true },
  )

  return (
    <div
      ref={ref}
      data-reveal
      className={cn('flex flex-col gap-4', center ? 'mx-auto items-center text-center' : 'items-start text-left', className)}
    >
      <Tag id={id} data-heading-title className="heading-section text-navy">
        {title}
      </Tag>
      {underline ? (
        <span aria-hidden="true" data-heading-underline className="block h-[3px] w-12 rounded-full bg-brand" />
      ) : null}
      {subtitle ? (
        <p data-heading-subtitle className={cn('text-body-lg text-ink', center && 'max-w-2xl')}>
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

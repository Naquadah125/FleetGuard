import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { gsap, useGSAP } from '@/lib/motion/gsap'
import { ICON_MOTIONS, drawIconIn } from '@/lib/motion/iconMotion'
import { MQ, revealTrigger } from '@/lib/motion/presets'

// Static class map so Tailwind can see every class (no string-built class names).
const TONES = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  violet: 'bg-violet/10 text-violet',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
}

const CONTAINERS = {
  lg: 'size-12', // 48px
  md: 'size-10', // 40px
}

/**
 * Pastel icon tile with motion.
 * - Draws the icon's strokes in once when it scrolls into view.
 * - Plays ICON_MOTIONS[motion] on pointer-enter / focus-in of the closest `[data-icon-trigger]`
 *   ancestor (e.g. the whole feature card), or of the tile itself.
 * - Fully static under prefers-reduced-motion.
 *
 * @param {{ icon: import('react').ElementType, motion?: keyof typeof ICON_MOTIONS,
 *   tone?: keyof typeof TONES, size?: number, container?: 'lg'|'md', className?: string }} props
 */
export default function AnimatedIcon({
  icon: Icon,
  motion,
  tone = 'brand',
  size = 24,
  container = 'lg',
  className,
}) {
  const ref = useRef(null)

  useGSAP(
    () => {
      const root = ref.current
      const svg = root?.querySelector('svg')
      if (!svg) return undefined
      const trigger = root.closest('[data-icon-trigger]') ?? root

      const mm = gsap.matchMedia()
      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, () => {
        drawIconIn(svg, gsap, { scrollTrigger: revealTrigger(root) })

        const make = motion ? ICON_MOTIONS[motion] : null
        if (!make) return undefined
        const tl = make(svg, gsap)
        const play = () => {
          if (!tl.isActive()) tl.restart()
        }
        trigger.addEventListener('pointerenter', play)
        trigger.addEventListener('focusin', play)
        return () => {
          trigger.removeEventListener('pointerenter', play)
          trigger.removeEventListener('focusin', play)
        }
      })
      return () => mm.revert()
    },
    { scope: ref, dependencies: [motion, Icon], revertOnUpdate: true },
  )

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md',
        CONTAINERS[container] ?? CONTAINERS.lg,
        TONES[tone] ?? TONES.brand,
        className,
      )}
    >
      <Icon size={size} strokeWidth={2} aria-hidden="true" focusable="false" className="overflow-visible">
        {motion === 'scan' ? (
          <rect
            key="fg-scanline"
            data-icon-fx="scanline"
            x="4"
            y="11.25"
            width="16"
            height="1.5"
            rx="0.75"
            fill="currentColor"
            stroke="none"
            opacity="0"
          />
        ) : null}
      </Icon>
    </span>
  )
}

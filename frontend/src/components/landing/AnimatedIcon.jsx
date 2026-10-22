import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { ScrollTrigger, gsap, useGSAP } from '@/lib/motion/gsap'
import { deferSetup } from '@/lib/motion/defer'
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
  '2xl': 'size-20', // 80px — pair with size 32
  xl: 'size-16', // 64px — pair with size 28–30
  lg: 'size-12', // 48px
  md: 'size-10', // 40px
}

/** Tile corner radius grows with the tile so large tiles don't look boxy. */
const RADII = { '2xl': 'rounded-xl', xl: 'rounded-lg', lg: 'rounded-md', md: 'rounded-md' }

/**
 * Pastel icon tile with motion.
 * - Draws the icon's strokes in once when it scrolls into view.
 * - Plays ICON_MOTIONS[motion] on pointer-enter / focus-in of the closest `[data-icon-trigger]`
 *   ancestor (e.g. the whole feature card), or of the tile itself.
 * - Fully static under prefers-reduced-motion.
 * - Motion setup is deferred past the first paint (deferSetup); a tile that is already on
 *   screen by then skips the draw-in (no visible → hidden → drawn flash) but keeps its hover motion.
 *
 * Sizes: `container` picks the tile (md 40 · lg 48 · xl 64 · 2xl 80 px), `size` the icon in px
 * (default 24), `strokeWidth` the lucide stroke (default 2; ~1.75 reads better at 28–32px).
 *
 * @param {{ icon: import('react').ElementType, motion?: keyof typeof ICON_MOTIONS,
 *   tone?: keyof typeof TONES, size?: number, strokeWidth?: number,
 *   container?: 'md'|'lg'|'xl'|'2xl', className?: string }} props
 */
export default function AnimatedIcon({
  icon: Icon,
  motion,
  tone = 'brand',
  size = 24,
  strokeWidth = 2,
  container = 'lg',
  className,
}) {
  const ref = useRef(null)

  useGSAP(
    (_ctx, contextSafe) => {
      const root = ref.current
      const svg = root?.querySelector('svg')
      if (!svg) return undefined
      const trigger = root.closest('[data-icon-trigger]') ?? root

      const setup = () => {
        if (!ScrollTrigger.isInViewport(root)) drawIconIn(svg, gsap, { scrollTrigger: revealTrigger(root) })

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
      }

      const mm = gsap.matchMedia()
      const cancel = deferSetup(contextSafe(() => mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, setup)))
      return () => {
        cancel()
        mm.revert()
      }
    },
    { scope: ref, dependencies: [motion, Icon, size, strokeWidth], revertOnUpdate: true },
  )

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        CONTAINERS[container] ?? CONTAINERS.lg,
        RADII[container] ?? RADII.lg,
        TONES[tone] ?? TONES.brand,
        className,
      )}
    >
      <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" className="overflow-visible">
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

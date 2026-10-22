import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { deferSetup } from '@/lib/motion/defer'
import { MQ } from '@/lib/motion/presets'
import { loopWhileVisible } from '@/components/landing/motionPause'
import { cn } from '@/lib/utils'
import Pattern from './patterns'
import { BLOB_TONES, TONES, VARIANTS } from './backdrops'

/** Seam fade on the decor layer (pattern + blobs), so nothing is clipped hard at a section edge. */
/** Below the md breakpoint (phones): 2 blobs, smaller drift. Combined with MQ.mobile. */
const PHONE = '(max-width: 767px)'

/** Soft disc: eased falloff (no plateau edge, less visible 8-bit banding than a 2-stop ramp). */
const blobGradient = (color) => {
  const at = (pct) => `color-mix(in oklab, ${color} ${pct}%, transparent)`
  return `radial-gradient(closest-side, ${color}, ${at(80)} 22%, ${at(48)} 48%, ${at(20)} 72%, ${at(5)} 88%, transparent)`
}

const SEAM_FADE = 'linear-gradient(to bottom, transparent, #000 72px, #000 calc(100% - 72px), transparent)'

/**
 * Section atmosphere: tinted base gradient + one pattern layer + 2–3 soft blobs.
 *
 * Render it as the FIRST child of a section that is `relative isolate overflow-hidden` and has no
 * background of its own (`isolate` keeps the `-z-10` layer inside the section's stacking context):
 *
 * ```jsx
 * <section id="features" className="relative isolate overflow-hidden py-20">
 *   <SectionBackdrop variant="mint" />
 *   …
 * </section>
 * ```
 *
 * Variants (see ./backdrops.js; SECTION_BACKDROPS maps section → variant + seam colours):
 * `hero`, `mint` (features), `demo`, `pricing`, `comparison`, `technology`.
 *
 * Motion (decorative, aria-hidden, pointer-events none):
 *  - parallax: each blob wrapper carries `data-speed` — ScrollSmoother (desktop only) picks it up;
 *    inert on touch sizes and under reduced motion. The hero uses `clamp()` speeds.
 *  - idle drift: each blob's inner disc drifts (x/y/scale, sine yoyo, 17–25s) — set up after the
 *    first paint (deferSetup), runs only while the section is on screen and motion is not paused
 *    (loopWhileVisible: one ScrollTrigger per backdrop); nothing moves under reduced motion.
 *    Phones drift 2 blobs at 60% amplitude.
 *  - transform only; blobs are radial gradients (no CSS blur / filter).
 *
 * @param {{
 *   variant?: keyof typeof VARIANTS,
 *   tone?: keyof typeof TONES,              // blob palette override: 'brand' | 'cool' | 'ai'
 *   pattern?: 'dots'|'routes'|'topo'|'grid'|'none', // pattern override
 *   blobs?: number,                         // max blobs (0–3), default all of the variant's
 *   className?: string,
 * }} props
 */
export default function SectionBackdrop({ variant = 'mint', tone, pattern, blobs, className }) {
  const ref = useRef(null)
  const v = VARIANTS[variant] ?? VARIANTS.mint
  const palette = TONES[tone ?? v.tone] ?? TONES.brand
  const blobSpecs = v.blobs.slice(0, blobs ?? v.blobs.length)
  const [top, mid, bottom] = v.stops

  useGSAP(
    (_ctx, contextSafe) => {
      const root = ref.current
      if (!root.querySelector('[data-blob]')) return undefined
      const cancel = deferSetup(
        contextSafe(() => {
          const mm = gsap.matchMedia()
          mm.add({ desktop: MQ.desktop, mobile: MQ.mobile, phone: PHONE }, (mctx) => {
            const { desktop, mobile } = mctx.conditions
            if (!desktop && !mobile) return undefined // reduced motion: nothing drifts
            const phone = mobile && mctx.conditions.phone
            const scale = phone ? 0.6 : 1
            const discs = gsap.utils
              .toArray('[data-blob]', root)
              .filter((el) => !(phone && el.hasAttribute('data-desktop-only')))
            const loops = discs.map((el) => {
              const [dx, dy, period] = (el.dataset.drift || '24,18,20').split(',').map(Number)
              return gsap.to(el, {
                x: dx * scale,
                y: dy * scale,
                scale: 1.06,
                duration: period / 2,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
                paused: true,
              })
            })
            return loopWhileVisible(root, loops, ScrollTrigger)
          })
        }),
      )
      return cancel
    },
    { scope: ref },
  )

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-backdrop={variant}
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
      style={{ background: `linear-gradient(to bottom, ${top}, ${mid} 50%, ${bottom})` }}
    >
      <div className="absolute inset-0" style={{ maskImage: SEAM_FADE, WebkitMaskImage: SEAM_FADE }}>
        {blobSpecs.map((b, i) => {
          const color = BLOB_TONES[palette[i % palette.length]]
          return (
            <div
              key={i}
              data-speed={b.speed}
              className={cn('absolute', b.desktopOnly && 'max-md:hidden')}
              style={{ top: b.top, left: b.left, right: b.right, bottom: b.bottom, width: b.size, height: b.size }}
            >
              <div
                data-blob
                data-drift={b.drift.join(',')}
                data-desktop-only={b.desktopOnly ? '' : undefined}
                className="size-full rounded-full"
                style={{ background: blobGradient(color) }}
              />
            </div>
          )
        })}
        {(pattern ?? v.pattern) !== 'none' ? (
          <Pattern name={pattern ?? v.pattern} mask={v.patternMask} seed={v.patternSeed} />
        ) : null}
      </div>
    </div>
  )
}

import { startTransition, useEffect, useRef, useState } from 'react'
import { bindCssIdle, whenNearViewport } from '@/lib/motion/idle'
import { cn } from '@/lib/utils'
import Pattern from './patterns'
import { BLOB_TONES, TONES, VARIANTS } from './backdrops'

/** Soft disc: eased falloff (no plateau edge, less visible 8-bit banding than a 2-stop ramp). */
const blobGradient = (color) => {
  const at = (pct) => `color-mix(in oklab, ${color} ${pct}%, transparent)`
  return `radial-gradient(closest-side, ${color}, ${at(80)} 22%, ${at(48)} 48%, ${at(20)} 72%, ${at(5)} 88%, transparent)`
}

/** Seam fade on the decor layer (pattern + blobs), so nothing is clipped hard at a section edge. */
const SEAM_FADE = 'linear-gradient(to bottom, transparent, #000 72px, #000 calc(100% - 72px), transparent)'

/** Deferred decor mounts when the section is within this distance of the viewport. */
const MOUNT_MARGIN = '100% 0px'

/** Blob drift phase offsets (fraction of the period) so no two blobs move in lockstep. */
const PHASES = [0, 0.37, 0.71]

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
 * Render cost (Phase 6 fix):
 *  - Only the base gradient (one div) is in the first render. The pattern + blobs mount when the
 *    section comes within one viewport of the screen (IntersectionObserver, in a transition), and
 *    fade in (CSS `@starting-style`). `eager` (default: the hero only) renders everything at once.
 *  - Idle drift is a CSS `@keyframes` on each blob disc (transform only → compositor thread, no
 *    per-frame main-thread style work; index.css `[data-blob]`). It runs only while the section is
 *    on screen and MotionPause is off (bindCssIdle: one IntersectionObserver, no ScrollTrigger),
 *    holds in place while paused, and never runs under reduced motion. Phones drift 2 blobs at 60%
 *    amplitude. Blobs are radial gradients (no CSS blur / filter).
 *  - Parallax: only the hero has one, on a single blob-layer wrapper (`data-speed="clamp(0.9)"`,
 *    ScrollSmoother, desktop only). Below-the-fold blobs have no `data-speed` (the drift gives the
 *    depth), keeping the page-wide smoother effect count low.
 *
 * @param {{
 *   variant?: keyof typeof VARIANTS,
 *   tone?: keyof typeof TONES,              // blob palette override: 'brand' | 'cool' | 'ai'
 *   pattern?: 'dots'|'routes'|'topo'|'grid'|'none', // pattern override
 *   blobs?: number,                         // max blobs (0–3), default all of the variant's
 *   eager?: boolean,                        // render the decor in the first commit (default: hero)
 *   className?: string,
 * }} props
 */
export default function SectionBackdrop({ variant = 'mint', tone, pattern, blobs, eager, className }) {
  const ref = useRef(null)
  const v = VARIANTS[variant] ?? VARIANTS.mint
  const isEager = eager ?? variant === 'hero'
  const [near, setNear] = useState(isEager)
  const palette = TONES[tone ?? v.tone] ?? TONES.brand
  const blobSpecs = v.blobs.slice(0, blobs ?? v.blobs.length)
  const patternName = pattern ?? v.pattern
  const [top, mid, bottom] = v.stops

  useEffect(() => {
    if (near) return undefined
    return whenNearViewport(ref.current, () => startTransition(() => setNear(true)), { rootMargin: MOUNT_MARGIN })
  }, [near])

  useEffect(() => {
    if (!near || !blobSpecs.length) return undefined
    return bindCssIdle(ref.current)
  }, [near, blobSpecs.length])

  const blobNodes = blobSpecs.map((b, i) => {
    const color = BLOB_TONES[palette[i % palette.length]]
    const [dx, dy, period] = b.drift
    return (
      <div
        key={i}
        data-blob
        className={cn('absolute rounded-full', b.desktopOnly && 'max-md:hidden')}
        style={{
          top: b.top,
          left: b.left,
          right: b.right,
          bottom: b.bottom,
          width: b.size,
          height: b.size,
          background: blobGradient(color),
          '--blob-dx': `${dx}px`,
          '--blob-dy': `${dy}px`,
          '--blob-half': `${period / 2}s`,
          '--blob-delay': `${-(PHASES[i % PHASES.length] * period).toFixed(2)}s`,
        }}
      />
    )
  })

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-backdrop={variant}
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
      style={{ background: `linear-gradient(to bottom, ${top}, ${mid} 50%, ${bottom})` }}
    >
      {near ? (
        <div
          data-backdrop-decor={isEager ? undefined : 'deferred'}
          className="absolute inset-0"
          style={{ maskImage: SEAM_FADE, WebkitMaskImage: SEAM_FADE }}
        >
          {v.parallax ? (
            <div data-speed={v.parallax} className="absolute inset-0">
              {blobNodes}
            </div>
          ) : (
            blobNodes
          )}
          {patternName !== 'none' ? <Pattern name={patternName} mask={v.patternMask} seed={v.patternSeed} /> : null}
        </div>
      ) : null}
    </div>
  )
}

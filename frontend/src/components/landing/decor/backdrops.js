/**
 * Section atmosphere config for <SectionBackdrop /> (pure data, no React).
 *
 * Each variant = tinted base gradient (top → mid → bottom, tokens from index.css `--color-tint-*`),
 * one pattern layer, and 2–3 soft blobs. Seams: a variant's `top` stop equals the previous
 * section's `bottom` stop (see SECTION_BACKDROPS), so adjacent sections blend without a hard edge.
 */

const tint = (name) => `var(--color-${name})`

/**
 * Blob tones (radial-gradient centre colour; the gradient fades to transparent at the edge of
 * the circle, so the centre is the darkest pixel). Alphas are capped so the darkest composite stays
 * >= 0.83 relative luminance (brand-dark small text >= 4.5:1 everywhere).
 */
export const BLOB_TONES = {
  mint: 'color-mix(in oklab, var(--color-brand-100) 60%, transparent)',
  brand: 'color-mix(in oklab, var(--color-brand) 7%, transparent)',
  info: 'color-mix(in oklab, var(--color-info) 6%, transparent)',
  violet: 'color-mix(in oklab, var(--color-violet) 6%, transparent)',
  sky: 'color-mix(in oklab, var(--color-info) 5%, var(--color-brand-100) 40%)',
}

/** Blob palettes selectable with the `tone` prop (overrides each variant's default). */
export const TONES = {
  brand: ['mint', 'brand', 'mint'],
  cool: ['mint', 'info', 'sky'],
  ai: ['violet', 'mint', 'info'],
}

/**
 * Blob layout per variant. Position values are CSS lengths relative to the section; `size` is the
 * blob diameter; `drift` the idle loop (CSS keyframes) amplitude [x, y] in px and its full
 * there-and-back period in seconds; `desktopOnly` hides the blob below 768px (phones get 2 blobs).
 *
 * @typedef {{ top?: string, left?: string, right?: string, bottom?: string, size: string,
 *   drift: [number, number, number], desktopOnly?: boolean }} BlobSpec
 */

/**
 * @typedef {'dots'|'routes'|'topo'|'grid'|'none'} PatternName
 * @typedef {'edges'|'left'|'right'|'top'|'bottom'|'diagonal'} PatternMask
 * `parallax` (optional): ScrollSmoother `data-speed` on ONE wrapper around all the variant's blobs
 * (desktop only; `clamp()` so it starts aligned at scroll 0). Only the hero has one — the page-wide
 * smoother effect budget is ~20 (badges + legacy layers); below the fold the drift gives depth.
 *
 * @typedef {{ stops: [string, string, string], pattern: PatternName, patternMask: PatternMask,
 *   patternSeed: number, tone: keyof TONES, parallax?: string, blobs: BlobSpec[] }} Variant
 */

/** @type {Record<string, Variant>} */
export const VARIANTS = {
  // Hero: whisper mint to mint; a faint map of dashed routes + pins behind the dashboard side.
  hero: {
    stops: [tint('tint-50'), tint('tint-50'), tint('tint-mint')],
    pattern: 'routes',
    patternMask: 'right',
    patternSeed: 0,
    tone: 'cool',
    parallax: 'clamp(0.9)',
    blobs: [
      { top: '-12rem', left: '-12rem', size: 'clamp(34rem, 65vw, 59rem)', drift: [36, 24, 19] },
      { top: '-8rem', right: '-10rem', size: 'clamp(29rem, 54vw, 51rem)', drift: [-28, 30, 23] },
      { bottom: '-6rem', left: '38%', size: 'clamp(23rem, 40vw, 38rem)', drift: [30, -20, 17], desktopOnly: true },
    ],
  },
  // Features: calm mint wash with a dot grid in the corners.
  mint: {
    stops: [tint('tint-mint'), tint('tint-50'), tint('tint-mint')],
    pattern: 'dots',
    patternMask: 'edges',
    patternSeed: 1,
    tone: 'brand',
    blobs: [
      { top: '-6rem', left: '-14rem', size: 'clamp(31rem, 54vw, 49rem)', drift: [30, 26, 21] },
      { bottom: '-8rem', right: '-12rem', size: 'clamp(29rem, 51vw, 46rem)', drift: [-26, -22, 18] },
      { top: '35%', left: '45%', size: 'clamp(21rem, 35vw, 32rem)', drift: [24, 18, 24], desktopOnly: true },
    ],
  },
  // AI demo: the deepest mint of the page, topographic contours, a violet "AI" glow.
  demo: {
    stops: [tint('tint-mint'), tint('tint-mint-deep'), tint('tint-sky')],
    pattern: 'topo',
    patternMask: 'edges',
    patternSeed: 2,
    tone: 'ai',
    blobs: [
      { top: '-8rem', right: '-10rem', size: 'clamp(29rem, 51vw, 46rem)', drift: [-30, 24, 20] },
      { top: '20%', left: '-14rem', size: 'clamp(31rem, 57vw, 51rem)', drift: [32, -18, 23] },
      { bottom: '-10rem', right: '22%', size: 'clamp(23rem, 40vw, 38rem)', drift: [26, -24, 17], desktopOnly: true },
    ],
  },
  // Pricing: cool teal-blue to mist (meets the grey road band); map routes in the upper corners.
  pricing: {
    stops: [tint('tint-sky'), tint('tint-50'), tint('tint-mist')],
    pattern: 'routes',
    patternMask: 'top',
    patternSeed: 1,
    tone: 'cool',
    blobs: [
      { top: '-6rem', left: '-12rem', size: 'clamp(29rem, 51vw, 46rem)', drift: [28, 22, 22] },
      { top: '10%', right: '-12rem', size: 'clamp(29rem, 54vw, 49rem)', drift: [-30, 26, 19] },
      { bottom: '12%', left: '30%', size: 'clamp(23rem, 43vw, 40rem)', drift: [24, -20, 25], desktopOnly: true },
    ],
  },
  // Comparison: mist to sea-glass; a dot grid in the corners around the table.
  comparison: {
    stops: [tint('tint-mist'), tint('tint-50'), tint('tint-teal')],
    pattern: 'dots',
    patternMask: 'edges',
    patternSeed: 0,
    tone: 'brand',
    blobs: [
      { bottom: '-6rem', left: '-14rem', size: 'clamp(31rem, 54vw, 49rem)', drift: [30, -22, 21] },
      { bottom: '-4rem', right: '-14rem', size: 'clamp(31rem, 57vw, 51rem)', drift: [-28, -26, 18] },
      { top: '-6rem', left: '40%', size: 'clamp(21rem, 35vw, 32rem)', drift: [22, 20, 24], desktopOnly: true },
    ],
  },
  // Technology: sea-glass with a teal-blue middle and a violet/info "tech" glow; blueprint grid
  // (white minor lines, faint brand major lines) in the corners; the skyline closes the bottom.
  technology: {
    stops: [tint('tint-teal'), tint('tint-sky'), tint('tint-teal')],
    pattern: 'grid',
    patternMask: 'edges',
    patternSeed: 3,
    tone: 'ai',
    blobs: [
      { top: '-8rem', left: '-10rem', size: 'clamp(29rem, 51vw, 46rem)', drift: [28, 24, 20] },
      { top: '15%', right: '-12rem', size: 'clamp(31rem, 57vw, 51rem)', drift: [-30, 20, 23] },
      { bottom: '-4rem', left: '35%', size: 'clamp(23rem, 40vw, 38rem)', drift: [26, -18, 18], desktopOnly: true },
    ],
  },
}

/**
 * Which variant each landing section uses, in page order, with its seam colours (top/bottom stop
 * tokens). Every `seamTop` equals the previous row's `seamBottom`. The footer (#contact) keeps its
 * own dark background (no backdrop); Technology's skyline sits on its bottom edge.
 */
export const SECTION_BACKDROPS = [
  { section: 'top', component: 'Hero', variant: 'hero', seamTop: 'tint-50', seamBottom: 'tint-mint' },
  { section: 'features', component: 'Features', variant: 'mint', seamTop: 'tint-mint', seamBottom: 'tint-mint' },
  { section: 'demo', component: 'AiDemo', variant: 'demo', seamTop: 'tint-mint', seamBottom: 'tint-sky' },
  { section: 'pricing', component: 'Pricing', variant: 'pricing', seamTop: 'tint-sky', seamBottom: 'tint-mist' },
  { section: 'comparison', component: 'Comparison', variant: 'comparison', seamTop: 'tint-mist', seamBottom: 'tint-teal' },
  { section: 'technology', component: 'Technology', variant: 'technology', seamTop: 'tint-teal', seamBottom: 'tint-teal' },
]

/**
 * Glyph — shared frame for the Features section's filled, colored glyph set (BellGlyph, PinGlyph, …).
 * Not meant to be used directly: each glyph passes a `draw(id, url)` render function.
 *
 * Contract shared by every glyph:
 *   - 32 × 32 user units, transparent, glyph ~21–25 × 24–29 units. Intended render size: 0.55 × the
 *     tile (44 px glyph in an 80 px tile at 1440) → ~29–34 × 34–39 px, like the mockup.
 *   - `dy` (internal, per glyph): shifts the viewBox (`0 -dy 32 32`) so the glyph sits ~1–2 px below
 *     the tile centre like the mockup, without any transform — pivots stay in plain user units.
 *   - Flat fill + a subtle top-light → bottom-shade linear gradient (no 3D extrusion).
 *   - A thin white "sticker" halo (`HALO`: white stroke painted under the fill) separates the glyph,
 *     and its parts, from the pastel tile — the mockup's crisp cut-out look. Invisible on white.
 *   - Pivots in each file's JSDoc are viewBox units for GSAP `svgOrigin`. No data-part element (or any
 *     ancestor of one) carries a static `transform` attribute, so `svgOrigin: 'x y'` works as written.
 *   - `title` → role="img" + <title>; no title → aria-hidden (decorative next to a visible heading).
 */
import { useId } from 'react'

/** White under-stroke halo; spread onto filled shapes. Half the width shows outside the fill. */
export const HALO = { stroke: '#fff', strokeWidth: 1.8, strokeLinejoin: 'round', paintOrder: 'stroke' }

/** Vertical gradient, top → bottom (objectBoundingBox). `stops`: [[offset, color], …]. */
export function Grad({ id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, ...props }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} {...props}>
      {stops.map(([o, c, a]) => (
        <stop key={o} offset={o} stopColor={c} stopOpacity={a} />
      ))}
    </linearGradient>
  )
}

export function Glyph({ className, title, draw, dy = 0, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox={`0 ${-dy} 32 32`} fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      {draw(id, url)}
    </svg>
  )
}

/**
 * Badge3D — shared frame for the "clay 3D" badge set (ShieldBadge3D, BellBadge3D, …).
 * Not meant to be used directly: each badge passes a `draw(id, url)` render function.
 *
 * Contract shared by every badge (viewBox 0 0 120 120, transparent):
 *   shadow   contact-shadow ellipse on the ground, centre (60, SHADOW_Y). Scale it in sync with the
 *            float: `{ scale: 0.8, opacity: 0.55, svgOrigin: '60 110' }` when the body is highest.
 *   body     everything that floats (all object parts live inside it). Float with `y`, tilt with
 *            `rotation` + `svgOrigin: '60 60'`.
 *   shine    specular highlight(s), inside body.
 * Pivots are given in viewBox units. No data-part element (or any ancestor of one) carries a static
 * `transform` attribute, so `svgOrigin: 'x y'` works as written — no transform-box, no bbox reads.
 * Light comes from the top-left (same as AiChip / PottedPlant): lit face gradient, darker extruded
 * side offset downward, white rim on the lit edge, soft reflected light on the shadow edge, and a
 * puffy radial `vol` highlight over each main face (shared def, objectBoundingBox).
 */
import { useId } from 'react'

export const SHADOW_Y = 110

export const TEAL = { hi: '#7DEBCB', light: '#2CCB9A', base: '#0E9B78', dark: '#08765E', deep: '#065F4C' }
export const BLUE = { hi: '#A9CBFF', light: '#5E9CFA', base: '#3882F6', dark: '#1F63D6', deep: '#184DA8' }
export const VIOLET = { hi: '#E2C2FF', light: '#C084FC', base: '#A855F7', dark: '#8A3EDF', deep: '#6A27B6' }
export const RED = { hi: '#FFA3A3', light: '#F87171', base: '#EF4444', dark: '#C62B2B', deep: '#9F1D1D' }
export const CLAY = { hi: '#FFFFFF', light: '#F8FAFC', base: '#E8EEF4', dark: '#C3CEDA', deep: '#94A3B8' }

/** Lit-face stops for a palette: highlight top-left → shade bottom-right. */
export const clay = (p) => [[0, p.hi], [0.3, p.light], [0.72, p.base], [1, p.dark]]

export function Lin({ id, stops, x1 = 0, y1 = 0, x2 = 0.75, y2 = 1 }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map(([o, c, a]) => (
        <stop key={o} offset={o} stopColor={c} stopOpacity={a} />
      ))}
    </linearGradient>
  )
}

export function Rad({ id, stops, cx = 0.5, cy = 0.5, r = 0.5 }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r}>
      {stops.map(([o, c, a]) => (
        <stop key={o} offset={o} stopColor={c} stopOpacity={a} />
      ))}
    </radialGradient>
  )
}

export function Badge3D({ className, title, shadowRx = 30, draw, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <Rad id={id('cs')} stops={[[0, '#0D2232', 0.3], [0.55, '#0D2232', 0.13], [1, '#0D2232', 0]]} />
        <Rad id={id('gl')} stops={[[0, '#fff', 0.95], [1, '#fff', 0]]} />
        <Rad id={id('vol')} stops={[[0, '#fff', 0.42], [0.55, '#fff', 0.08], [1, '#fff', 0]]} cx=".3" cy=".22" r=".75" />
      </defs>
      <ellipse data-part="shadow" cx="60" cy={SHADOW_Y} rx={shadowRx} ry="5.5" fill={url('cs')} />
      {draw(id, url)}
    </svg>
  )
}

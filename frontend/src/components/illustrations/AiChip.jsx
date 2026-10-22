/**
 * AiChip — teal processor chip with an "AI" face and circuit traces on all four sides.
 * Soft "3D vector" style. Static: no animation inside.
 *
 * data-part hooks (for GSAP):
 *   glow    soft radial halo behind the chip (pulse opacity / scale, origin 50% 50%)
 *   traces  group of stroked circuit paths + end pads, each with pathLength="1" — draw each child
 *           with a dash tween (`strokeDasharray: '1 2', strokeDashoffset: 1.001 → 0`), no DrawSVG
 *   chip    the chip package + "AI" face
 *
 * The "AI" label is SVG text using the inherited font (Plus Jakarta Sans on the landing page).
 * viewBox 0 0 160 160.
 */
import { useId } from 'react'

const TRACES = [
  'M64 46 V30', 'M80 46 V20', 'M96 46 V36 L106 26',
  'M64 114 V126 L54 136', 'M80 114 V140', 'M96 114 V130',
  'M46 64 H34 L24 54', 'M46 80 H20', 'M46 96 H30',
  'M114 64 H130', 'M114 80 H140', 'M114 96 H126 L136 106',
]
const PADS = [
  [64, 30], [80, 20], [106, 26], [54, 136], [80, 140], [96, 130],
  [24, 54], [20, 80], [30, 96], [130, 64], [140, 80], [136, 106],
]

export default function AiChip({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <radialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#34D3A4" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#34D3A4" stopOpacity="0.16" />
          <stop offset="1" stopColor="#34D3A4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('pkg')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2CCB9A" />
          <stop offset="0.5" stopColor="#0E9B78" />
          <stop offset="1" stopColor="#08765E" />
        </linearGradient>
        <linearGradient id={id('face')} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DDF5EB" />
        </linearGradient>
      </defs>

      <circle data-part="glow" cx="80" cy="80" r="76" fill={url('glow')} />

      <g data-part="traces" stroke="#0E9B78" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {TRACES.map((d) => (
          <path key={d} d={d} pathLength="1" />
        ))}
        {PADS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.6" fill="#fff" strokeWidth="2.4" pathLength="1" />
        ))}
      </g>

      <g data-part="chip">
        <rect x="44" y="49" width="72" height="72" rx="15" fill="#053F33" opacity="0.18" />
        <rect x="44" y="44" width="72" height="72" rx="15" fill={url('pkg')} />
        <rect x="45" y="45" width="70" height="70" rx="14" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d="M52 52 Q60 47 80 47" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
        <rect x="55" y="55" width="50" height="50" rx="10" fill={url('face')} />
        <rect x="55.5" y="55.5" width="49" height="49" rx="9.5" stroke="#08765E" strokeOpacity="0.18" />
        <circle cx="62" cy="62" r="2" fill="#0E9B78" opacity="0.5" />
        <text
          x="80"
          y="88.5"
          textAnchor="middle"
          fontSize="23"
          fontWeight="800"
          letterSpacing="-0.5"
          fill="#08765E"
        >
          AI
        </text>
      </g>
    </svg>
  )
}

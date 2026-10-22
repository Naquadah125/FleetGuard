/**
 * RoadBand — wide, soft grey curved road with a dashed center line (sits behind the pricing cards).
 * The band stretches to any box (`preserveAspectRatio="none"`); the edge lines and dashes use
 * `vector-effect: non-scaling-stroke`, so their width and dash rhythm stay constant in screen pixels.
 * Static: no animation inside.
 *
 * data-part hooks (for GSAP):
 *   road    the band fill + soft edge lines
 *   dashes  center line path — animate `strokeDashoffset` (period = 48px, e.g. 0 → -48, repeat)
 *           to suggest motion
 *
 * viewBox 0 0 1200 200. Give it an explicit height (e.g. `w-full h-40`).
 */
import { useId } from 'react'

const ROAD_D =
  'M0 64 C240 20 420 104 600 100 C800 96 960 30 1200 52 V168 C960 150 780 196 600 194 C420 192 240 150 0 178 Z'
const TOP_EDGE = 'M0 76 C240 32 420 115 600 111 C800 107 960 42 1200 64'
const BOTTOM_EDGE = 'M0 166 C240 139 420 181 600 183 C780 185 960 139 1200 156'
const CENTER = 'M0 121 C240 85 420 148 600 147 C800 146 960 90 1200 110'

export default function RoadBand({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...a11y}
      {...props}
    >
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <linearGradient id={id('road')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9EFF4" />
          <stop offset="0.55" stopColor="#DDE5EC" />
          <stop offset="1" stopColor="#D0DAE3" />
        </linearGradient>
        <linearGradient id={id('ends')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.12" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.88" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <g data-part="road">
        <path d={ROAD_D} fill={url('road')} />
        <path d={ROAD_D} fill={url('ends')} />
        <path d={TOP_EDGE} stroke="#fff" strokeOpacity="0.85" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={BOTTOM_EDGE} stroke="#fff" strokeOpacity="0.6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </g>
      <path
        data-part="dashes"
        d={CENTER}
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="26 22"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

import { useId } from 'react'

/**
 * PricingRoad — the wide, light-grey curved road behind the lower half of the pricing cards
 * (design mockup): it comes in from the left edge rising gently, runs behind both cards, and on
 * the right bends away towards the viewer, under a wide pale shoulder.
 *
 * Geometry is in fixed screen pixels (viewBox 1920×210, rendered at 1920×210 and centred on the
 * cards, so it never stretches): x = 240 is the left edge of a 1440 viewport, the cards' 824px grid
 * spans x ≈ 788–1612 (centre 960), y = 0 sits 180px below the top of the cards.
 * The middle fades out (the gap between the cards stays clean, as in the mockup), and so do the
 * frame's outer 192px (only seen on viewports wider than 1536px).
 *
 * data-part hooks (GSAP): `road` (band + shoulders), `dashes` (lane line — animate
 * `strokeDashoffset`, one period = DASH_PERIOD px).
 */
export const DASH_PERIOD = 64 // 34 dash + 30 gap

const ROAD =
  'M0 60 C200 52 380 40 540 34 C760 25 1180 30 1363 52 C1470 62 1560 72 1615 98 C1660 120 1690 150 1705 176 L900 176 C700 176 480 180 240 194 C160 198 80 202 0 205 Z'
const SHOULDER =
  'M1180 22 C1300 14 1440 18 1540 29 C1610 37 1650 50 1680 64 C1760 100 1860 142 1920 170 L1920 181 L1180 181 Z'
const LANE =
  'M0 196 C120 186 200 178 240 171 C400 150 470 140 540 134 C800 110 1300 80 1497 94 C1560 100 1600 112 1625 122 C1650 134 1670 148 1685 162'

export default function PricingRoad({ className }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const fade = `${uid}-fade`
  const tone = `${uid}-tone`

  return (
    <svg
      viewBox="0 0 1920 210"
      width="1920"
      height="210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        {/* Horizontal mask: nearly gone behind the middle of the cards; soft ends past 1680px viewports. */}
        <linearGradient id={fade} x1="0" x2="1920" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.1" stopColor="#fff" />
          <stop offset="0.3" stopColor="#fff" />
          <stop offset="0.46" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.54" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.66" stopColor="#fff" />
          <stop offset="0.9" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${fade}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="210">
          <rect width="1920" height="210" fill={`url(#${fade})`} />
        </mask>
        {/* Asphalt: a touch lighter towards the far (top) edge. */}
        <linearGradient id={tone} x1="0" x2="0" y1="20" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D3DFE9" />
          <stop offset="1" stopColor="#C6D5E2" />
        </linearGradient>
      </defs>
      <g mask={`url(#${fade}-m)`}>
        <g data-part="road">
          <path d={SHOULDER} fill="#E1EBF3" />
          {/* Soft shoulder: a wide pale stroke under the asphalt shows as an 8px edge band. */}
          <path d={ROAD} fill="#E1EBF3" stroke="#E1EBF3" strokeWidth="16" strokeLinejoin="round" />
          <path d={ROAD} fill={`url(#${tone})`} />
        </g>
        <path
          data-part="dashes"
          d={LANE}
          stroke="#fff"
          strokeOpacity="0.9"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="34 30"
        />
      </g>
    </svg>
  )
}

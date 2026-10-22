/**
 * PottedPlant — round white pot with a tall, slender leafy plant (comparison section, left side).
 * Soft "3D vector" style. Static: no animation inside.
 *
 * data-part hooks (for GSAP):
 *   pot        pot, rim and soil
 *   leaves     the whole plant (stem + all leaves) — sway with `transformOrigin: '50% 100%'`
 *   stem       main stem path
 *   leaf-1 … leaf-9
 *              individual leaves, bottom → top. Each leaf's base sits at the bottom-center of its
 *              own box, so `transformOrigin: '50% 100%'` pivots on the stem (GSAP resolves the % origin against
 *              the part's own bbox; no CSS transform-box is set). Odd = left side, even = right side, 9 = top.
 *
 * viewBox 0 0 200 300 (pot base at y≈290).
 */
import { useId } from 'react'


// [x, y, rotation°, length, half-width]
const LEAVES = [
  [99.5, 198, -64, 60, 15],
  [100, 188, 60, 58, 15],
  [99.8, 164, -50, 58, 15],
  [100.6, 150, 48, 56, 14.5],
  [101, 126, -38, 52, 14],
  [101.6, 112, 36, 50, 13.5],
  [102, 88, -26, 44, 12.5],
  [102, 76, 26, 42, 12],
  [101.4, 52, -4, 40, 11],
]

function Leaf({ n, x, y, rot, len, w, url }) {
  const l = len
  const left = `M0 0 C${-w} ${-l * 0.18} ${-w * 1.02} ${-l * 0.62} 0 ${-l} Z`
  const right = `M0 0 C${w} ${-l * 0.18} ${w * 1.02} ${-l * 0.62} 0 ${-l} Z`
  const veins = [0.3, 0.5, 0.68].flatMap((k) => [
    `M0 ${-l * k} L${-w * 0.55} ${-l * (k + 0.13)}`,
    `M0 ${-l * k} L${w * 0.55} ${-l * (k + 0.13)}`,
  ])
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g data-part={`leaf-${n}`}>
        <path d={left} fill={url('leafLit')} />
        <path d={right} fill={url('leafShade')} />
        <path d={`M0 -2 L0 ${-l * 0.9}`} stroke="#D9F7E6" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
        <path d={veins.join(' ')} stroke="#D9F7E6" strokeOpacity="0.22" strokeWidth="0.8" strokeLinecap="round" />
        <path d={`M${-w * 0.35} ${-l * 0.22} C${-w * 0.62} ${-l * 0.38} ${-w * 0.55} ${-l * 0.6} ${-w * 0.2} ${-l * 0.8}`} stroke="#fff" strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </g>
  )
}

export default function PottedPlant({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <radialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0D2232" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0D2232" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('pot')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#DCE4EC" />
          <stop offset="0.28" stopColor="#FFFFFF" />
          <stop offset="0.68" stopColor="#F1F5F9" />
          <stop offset="1" stopColor="#B4C1CF" />
        </linearGradient>
        <linearGradient id={id('potBottom')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="#94A3B8" stopOpacity="0" />
          <stop offset="1" stopColor="#94A3B8" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E7EDF3" />
          <stop offset="0.3" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#CBD5E1" />
        </linearGradient>
        <radialGradient id={id('soil')} cx="0.5" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#6B5442" />
          <stop offset="1" stopColor="#3B2E24" />
        </radialGradient>
        <linearGradient id={id('stem')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0B6B44" />
          <stop offset="1" stopColor="#3DBB78" />
        </linearGradient>
        <linearGradient id={id('leafLit')} x1="0" y1="1" x2="0.2" y2="0">
          <stop offset="0" stopColor="#139A5F" />
          <stop offset="0.6" stopColor="#3BC27C" />
          <stop offset="1" stopColor="#8BE0AE" />
        </linearGradient>
        <linearGradient id={id('leafShade')} x1="0" y1="1" x2="-0.2" y2="0">
          <stop offset="0" stopColor="#09673F" />
          <stop offset="0.6" stopColor="#1C9A5C" />
          <stop offset="1" stopColor="#4CC585" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="291" rx="72" ry="8" fill={url('shadow')} />

      <g data-part="pot">
        <path d="M47 214 L53 268 Q56 289 76 289 H124 Q144 289 147 268 L153 214 Z" fill={url('pot')} />
        <path d="M47 214 L53 268 Q56 289 76 289 H124 Q144 289 147 268 L153 214 Z" fill={url('potBottom')} />
        <path d="M60 228 L64 266 Q66 278 76 280" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        <path d="M42 207 Q42 203 46 203 H154 Q158 203 158 207 V214 Q158 222 150 222 H50 Q42 222 42 214 Z" fill={url('rim')} />
        <ellipse cx="100" cy="205" rx="58" ry="7" fill="#FFFFFF" />
        <ellipse cx="100" cy="206" rx="50" ry="5" fill={url('soil')} />
        <path d="M50 221 H150" stroke="#94A3B8" strokeOpacity="0.35" strokeWidth="1" />
      </g>

      <g data-part="leaves">
        <path data-part="stem" d="M100 207 C98 176 104 132 101.5 50" stroke={url('stem')} strokeWidth="3.6" strokeLinecap="round" />
        {LEAVES.map(([x, y, rot, len, w], i) => (
          <Leaf key={i} n={i + 1} x={x} y={y} rot={rot} len={len} w={w} url={url} />
        ))}
      </g>
    </svg>
  )
}

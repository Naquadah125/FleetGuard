/**
 * LeafBranch — the hero's leafy branch, rising from the bottom-right and arching up-left.
 * Designed to sit in a corner (bottom edge of the viewBox = ground line). Static: no animation inside.
 *
 * data-part hooks (for GSAP):
 *   stem          the curved branch stroke (single path, pathLength="1": draw it with
 *                 strokeDasharray 1 + strokeDashoffset 1 → 0, no length measurement needed)
 *   leaf-1 … leaf-10
 *                 leaves from bottom → top; each leaf's base is the bottom-center of its own box,
 *                 so `transformOrigin: '50% 100%'` pivots it on the branch (GSAP resolves the % origin
 *                 against the leaf's own bbox; no CSS transform-box is set). Cheaper and identical:
 *                 `svgOrigin: '0 0'` (the leaf base is its group's local origin). leaf-10 is the tip bud.
 *   (root <svg>)  sway the whole branch with `transformOrigin: '80% 100%'` (the base).
 *
 * viewBox 40 -14 240 334 (branch base at 200,318).
 */
import { useId } from 'react'


// Two cubic segments of the branch: base (200,318) → (140,120) → tip (104,30)
const SEGS = [
  [[200, 318], [188, 252], [172, 182], [140, 120]],
  [[140, 120], [124, 88], [112, 60], [104, 30]],
]
const STEM_D = 'M200 318 C188 252 172 182 140 120 C124 88 112 60 104 30'

function pointAt(t) {
  const [p0, p1, p2, p3] = SEGS[t >= 1 ? 1 : 0]
  const u = t >= 1 ? Math.min(t - 1, 1) : t
  const m = 1 - u
  const x = m * m * m * p0[0] + 3 * m * m * u * p1[0] + 3 * m * u * u * p2[0] + u * u * u * p3[0]
  const y = m * m * m * p0[1] + 3 * m * m * u * p1[1] + 3 * m * u * u * p2[1] + u * u * u * p3[1]
  const dx = 3 * m * m * (p1[0] - p0[0]) + 6 * m * u * (p2[0] - p1[0]) + 3 * u * u * (p3[0] - p2[0])
  const dy = 3 * m * m * (p1[1] - p0[1]) + 6 * m * u * (p2[1] - p1[1]) + 3 * u * u * (p3[1] - p2[1])
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI
  return { x: +x.toFixed(2), y: +y.toFixed(2), angle }
}

// [t along branch (0–2), side (-1 left, 1 right, 0 tip), length, half-width, spread°]
const SPEC = [
  [0.18, -1, 94, 30, 64],
  [0.32, 1, 96, 31, 54],
  [0.5, -1, 88, 29, 60],
  [0.68, 1, 84, 27, 52],
  [0.9, -1, 78, 25, 58],
  [1.08, 1, 70, 23, 50],
  [1.28, -1, 62, 21, 52],
  [1.48, 1, 54, 18, 46],
  [1.7, -1, 46, 15, 44],
  [2, 0, 38, 12.5, 0],
]
const LEAVES = SPEC.map(([t, side, len, w, spread]) => {
  const p = pointAt(t)
  return { x: p.x, y: p.y, rot: +(p.angle + side * spread).toFixed(1), len, w }
})

function Leaf({ n, x, y, rot, len, w, url }) {
  const l = len
  const left = `M0 0 C${-w} ${-l * 0.12} ${-w * 1.08} ${-l * 0.58} 0 ${-l} Z`
  const right = `M0 0 C${w} ${-l * 0.12} ${w * 1.08} ${-l * 0.58} 0 ${-l} Z`
  const veins = [0.24, 0.42, 0.6].flatMap((k) => [
    `M0 ${-l * k} Q${-w * 0.35} ${-l * (k + 0.05)} ${-w * 0.62} ${-l * (k + 0.15)}`,
    `M0 ${-l * k} Q${w * 0.35} ${-l * (k + 0.05)} ${w * 0.62} ${-l * (k + 0.15)}`,
  ])
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g data-part={`leaf-${n}`}>
        <path d={left} fill={url('leafLit')} />
        <path d={right} fill={url('leafShade')} />
        <path d={`M0 -2 L0 ${-l * 0.9}`} stroke="#E3FAEC" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
        <path d={veins.join(' ')} stroke="#E3FAEC" strokeOpacity="0.24" strokeWidth="0.9" strokeLinecap="round" />
        <path d={`M${-w * 0.42} ${-l * 0.18} C${-w * 0.74} ${-l * 0.36} ${-w * 0.66} ${-l * 0.6} ${-w * 0.22} ${-l * 0.82}`} stroke="#fff" strokeOpacity="0.32" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </g>
  )
}

export default function LeafBranch({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="40 -14 240 334" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <linearGradient id={id('stem')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0A6A42" />
          <stop offset="1" stopColor="#36B673" />
        </linearGradient>
        <linearGradient id={id('leafLit')} x1="0" y1="1" x2="0.2" y2="0">
          <stop offset="0" stopColor="#14985E" />
          <stop offset="0.55" stopColor="#3EC27E" />
          <stop offset="1" stopColor="#9BE6B9" />
        </linearGradient>
        <linearGradient id={id('leafShade')} x1="0" y1="1" x2="-0.2" y2="0">
          <stop offset="0" stopColor="#08623C" />
          <stop offset="0.55" stopColor="#1A9659" />
          <stop offset="1" stopColor="#52C98A" />
        </linearGradient>
      </defs>

      <path data-part="stem" pathLength="1" d={STEM_D} stroke={url('stem')} strokeWidth="5" strokeLinecap="round" />
      {LEAVES.map((leaf, i) => (
        <Leaf key={i} n={i + 1} {...leaf} url={url} />
      ))}
    </svg>
  )
}

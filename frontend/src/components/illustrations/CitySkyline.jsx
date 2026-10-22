/**
 * CitySkyline — translucent mint city silhouette in three depth layers (for parallax).
 * Buildings fade toward the bottom so the band melts into any light background.
 * Static: no animation inside.
 *
 * data-part hooks (for GSAP / ScrollTrigger parallax):
 *   layer-back   tallest, palest towers + soft clouds (move slowest)
 *   layer-mid    mid-height blocks
 *   layer-front  low buildings + round trees (move fastest)
 *
 * viewBox 0 0 1200 240, ground at y=240. Uses preserveAspectRatio "xMidYMax slice" by default so
 * it can fill a wide strip; override via props if needed.
 */
import { useId } from 'react'

const W = 1200
const GROUND = 240

// Deterministic pseudo-random so the skyline is identical on every render / SSR.
function rng(seed) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

// Returns [x, width, height, cap] — cap: 0 none, 1 stepped crown, 2 antenna, 3 dome
function row(seed, [minW, maxW], [minH, maxH], [minGap, maxGap], start = -10) {
  const r = rng(seed)
  const out = []
  let x = start
  while (x < W) {
    const w = Math.round(minW + r() * (maxW - minW))
    const h = Math.round(minH + r() * (maxH - minH))
    const roll = r()
    out.push([x, w, h, roll < 0.25 ? 1 : roll < 0.42 ? 2 : roll < 0.52 ? 3 : 0])
    x += w + Math.round(minGap + r() * (maxGap - minGap))
  }
  return out
}

const BACK = row(7, [34, 66], [120, 210], [6, 26])
const MID = row(23, [38, 74], [70, 140], [10, 40], 14)
const FRONT = row(41, [50, 96], [34, 72], [40, 110], 30)
const TREES = (() => {
  const r = rng(97)
  const out = []
  for (let x = 40; x < W; x += 90 + Math.round(r() * 120)) {
    out.push([x, Math.round(24 + r() * 14), Math.round(12 + r() * 7)])
  }
  return out
})()

function Building({ b, fill, windows, cap }) {
  const [x, w, h, kind] = b
  const y = GROUND - h
  return (
    <g>
      {kind === 1 ? <rect x={x + w * 0.2} y={y - 14} width={w * 0.6} height={16} rx="2" fill={cap} /> : null}
      {kind === 2 ? <path d={`M${x + w / 2} ${y - 22} V${y}`} stroke={cap} strokeWidth="2" strokeLinecap="round" /> : null}
      {kind === 3 ? <path d={`M${x + w * 0.18} ${y + 1} A${w * 0.32} ${w * 0.32} 0 0 1 ${x + w * 0.82} ${y + 1} Z`} fill={cap} /> : null}
      <rect x={x} y={y} width={w} height={h + 2} rx="3" fill={fill} />
      <rect x={x + 5} y={y + 10} width={w - 10} height={h - 16} fill={windows} />
      <rect x={x} y={y} width={w} height="2" rx="1" fill="#fff" opacity="0.35" />
    </g>
  )
}

export default function CitySkyline({ className, title, preserveAspectRatio = 'xMidYMax slice', ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  const layerGrad = (name, color, top, bottom) => (
    <linearGradient id={id(name)} x1="0" y1="0" x2="0" y2={GROUND} gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor={color} stopOpacity={top} />
      <stop offset="1" stopColor={color} stopOpacity={bottom} />
    </linearGradient>
  )
  const winPattern = (name, color, opacity, w = 10, h = 14) => (
    <pattern id={id(name)} width={w} height={h} patternUnits="userSpaceOnUse">
      <rect x="2" y="2" width={w - 6} height={h - 5} rx="1" fill={color} opacity={opacity} />
    </pattern>
  )

  return (
    <svg
      viewBox="0 0 1200 240"
      preserveAspectRatio={preserveAspectRatio}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...a11y}
      {...props}
    >
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        {layerGrad('back', '#A8E0C9', 0.5, 0.08)}
        {layerGrad('mid', '#7FD2B1', 0.5, 0.12)}
        {layerGrad('front', '#4FC097', 0.45, 0.16)}
        {winPattern('winBack', '#FFFFFF', 0.4, 9, 13)}
        {winPattern('winMid', '#FFFFFF', 0.35, 10, 14)}
        {winPattern('winFront', '#FFFFFF', 0.35, 11, 12)}
        <radialGradient id={id('tree')} cx="0.38" cy="0.32" r="0.7">
          <stop offset="0" stopColor="#8FE0BE" stopOpacity="0.8" />
          <stop offset="1" stopColor="#3DB98C" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      <g data-part="layer-back">
        <g fill="#C9EEDD" opacity="0.7">
          <ellipse cx="190" cy="30" rx="26" ry="8" />
          <ellipse cx="204" cy="24" rx="15" ry="10" />
          <ellipse cx="640" cy="22" rx="30" ry="8" />
          <ellipse cx="628" cy="16" rx="16" ry="10" />
          <ellipse cx="1010" cy="36" rx="24" ry="7" />
          <ellipse cx="1020" cy="30" rx="13" ry="9" />
        </g>
        {BACK.map((b) => (
          <Building key={b[0]} b={b} fill={url('back')} windows={url('winBack')} cap="#C4EBDB" />
        ))}
      </g>

      <g data-part="layer-mid">
        {MID.map((b) => (
          <Building key={b[0]} b={b} fill={url('mid')} windows={url('winMid')} cap="#ABE0C9" />
        ))}
      </g>

      <g data-part="layer-front">
        {FRONT.map((b) => (
          <Building key={b[0]} b={b} fill={url('front')} windows={url('winFront')} cap="#8AD6B6" />
        ))}
        {TREES.map(([x, h, r]) => (
          <g key={x}>
            <rect x={x - 1.5} y={GROUND - h + r} width="3" height={h - r + 2} fill="#3DB98C" opacity="0.35" />
            <circle cx={x} cy={GROUND - h} r={r} fill={url('tree')} />
            <circle cx={x - r * 0.35} cy={GROUND - h - r * 0.3} r={r * 0.35} fill="#fff" opacity="0.18" />
          </g>
        ))}
      </g>
    </svg>
  )
}

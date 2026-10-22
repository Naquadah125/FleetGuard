/**
 * SedanCar — white four-door sedan, side view with a hint of front three-quarter, facing RIGHT.
 * Soft "3D vector" style. Static: no animation inside.
 *
 * data-part hooks (for GSAP):
 *   body        whole car body (paint, glass, lights, trim) — nudge y for suspension bob
 *   wheel-front front (right) wheel; geometry centered on its own box, so
 *               `rotation` with `transformOrigin: '50% 50%'` spins in place. No CSS transform-box/origin is set:
 *               GSAP resolves the % origin against the part's own bbox (do not add transformBox)
 *   wheel-rear  rear (left) wheel (same as above)
 *   shadow      ground shadow ellipse
 *
 * Driving right means wheels rotate clockwise (positive rotation).
 * viewBox 0 0 300 140.
 */
import { useId } from 'react'

function spokes(r0, r1, count = 5) {
  return Array.from({ length: count }, (_, i) => {
    const a = ((-90 + (360 / count) * i) * Math.PI) / 180
    const c = Math.cos(a)
    const s = Math.sin(a)
    return [
      +(c * r0).toFixed(2),
      +(s * r0).toFixed(2),
      +(c * r1).toFixed(2),
      +(s * r1).toFixed(2),
    ]
  })
}

function Wheel({ part, cx, cy, url }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g data-part={part}>
        <circle r="18" fill={url('tire')} />
        <circle r="14.6" fill="none" stroke="#0B1219" strokeWidth="1" opacity="0.7" />
        <circle r="11.4" fill={url('rim')} />
        <g stroke="#64748B" strokeWidth="2.4" strokeLinecap="round">
          {spokes(3.2, 9.8).map(([x1, y1, x2, y2]) => (
            <line key={`${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
        <circle r="3.6" fill="#475569" />
        <circle r="1.4" fill="#E2E8F0" />
        <g stroke="#3B4754" strokeWidth="1.3" strokeLinecap="round" opacity="0.8">
          {spokes(15.6, 17.2, 10).map(([x1, y1, x2, y2]) => (
            <line key={`${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
      </g>
      <path d="M-13 -12 A18 18 0 0 1 6 -17" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

const BODY_D =
  'M18 92 C18 80 24 72 38 70 L84 64 C98 50 114 40 140 38 L178 38 C200 39 216 48 234 62 L262 67 C278 70 286 80 287 92 L287 103 C287 109 283 112 277 112 L28 112 C21 112 18 108 18 101 Z'

export default function SedanCar({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="0 0 300 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <radialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0D2232" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="#0D2232" stopOpacity="0.12" />
          <stop offset="1" stopColor="#0D2232" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('paint')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#F4F7FA" />
          <stop offset="0.78" stopColor="#DCE4EC" />
          <stop offset="1" stopColor="#B8C4D1" />
        </linearGradient>
        <linearGradient id={id('sideShade')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#94A3B8" stopOpacity="0.25" />
          <stop offset="0.18" stopColor="#94A3B8" stopOpacity="0" />
          <stop offset="0.82" stopColor="#94A3B8" stopOpacity="0" />
          <stop offset="1" stopColor="#94A3B8" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#3A5468" />
          <stop offset="1" stopColor="#0D2232" />
        </linearGradient>
        <linearGradient id={id('headlight')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#BFE9FF" />
        </linearGradient>
        <radialGradient id={id('tire')} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0.6" stopColor="#1E2933" />
          <stop offset="1" stopColor="#0F171F" />
        </radialGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset="0.55" stopColor="#D5DEE8" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
        <clipPath id={id('bodyClip')}>
          <path d={BODY_D} />
        </clipPath>
      </defs>

      <ellipse data-part="shadow" cx="152" cy="131" rx="140" ry="9" fill={url('shadow')} />

      <g data-part="body">
        <path d={BODY_D} fill={url('paint')} />
        <g clipPath={url('bodyClip')}>
          <rect x="14" y="34" width="276" height="80" fill={url('sideShade')} />
          {/* lower sill */}
          <path d="M14 98 H292 V114 H14 Z" fill="#AEBBC9" opacity="0.55" />
          {/* shoulder highlight + crease */}
          <path d="M30 74 L88 68 H232 L268 72" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
          <path d="M26 86 C90 82 200 82 284 86" stroke="#94A3B8" strokeOpacity="0.45" strokeWidth="1.2" />
          {/* door seams */}
          <g stroke="#94A3B8" strokeOpacity="0.55" strokeWidth="1.1">
            <path d="M150 66 V108" />
            <path d="M210 66 C214 80 214 96 210 108" />
            <path d="M92 70 C88 84 90 98 94 108" />
          </g>
        </g>
        {/* greenhouse */}
        <path d="M92 66 C104 54 118 46 140 45 H176 C194 46 208 54 222 65 Z" fill={url('glass')} />
        <path d="M148 45 H155 V66 H148 Z" fill="#F1F5F9" />
        <path d="M118 49 L128 47 L114 66 H103 Z" fill="#fff" opacity="0.2" />
        <path d="M172 46 H180 L166 66 H158 Z" fill="#fff" opacity="0.16" />
        <path d="M92 66 H222" stroke="#CBD5E1" strokeWidth="1.5" />
        {/* handles */}
        <rect x="133" y="76" width="11" height="3" rx="1.5" fill="#94A3B8" />
        <rect x="193" y="76" width="11" height="3" rx="1.5" fill="#94A3B8" />
        {/* mirror */}
        <path d="M214 64 Q215 58.5 221 58 L226 58.6 Q227.6 62.4 225.4 65.4 Q219 66.4 214 64 Z" fill="#CBD5E1" />
        <path d="M216.4 61.6 Q218 59.6 222 59.6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
        {/* headlight + glow */}
                <path d="M262 74.5 L281 78 Q285.5 80 284 84.5 L265 82 Q260.5 79 262 74.5 Z" fill={url('headlight')} />
        <path d="M265 77 L278 79.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        {/* front intake + bumper */}
        <path d="M264 96 H284 Q286 96 286 98 V102 Q286 104 284 104 H266 Q263 104 263 101 V98 Q263 96 264 96 Z" fill="#334155" />
        <path d="M268 99.5 H282" stroke="#94A3B8" strokeWidth="1" />
        {/* tail light */}
        <path d="M19.5 80 Q21 74 30 72.5 L31 82 Q24 83 19.5 84 Z" fill="#EF4444" />
        <path d="M22 78 Q24 75.5 28.5 74.8" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />
        {/* wheel wells */}
        <path d="M54 113 A23 23 0 0 1 100 113 Z" fill="#1E2933" />
        <path d="M203 113 A23 23 0 0 1 249 113 Z" fill="#1E2933" />
      </g>

      <Wheel part="wheel-rear" cx={77} cy={112} url={url} />
      <Wheel part="wheel-front" cx={226} cy={112} url={url} />
    </svg>
  )
}

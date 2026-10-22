/**
 * DeliveryTruck — green FleetGuard box truck, side / three-quarter view, facing LEFT.
 * Soft "3D vector" style (gradients, highlights, soft ground shadow). Static: no animation inside.
 *
 * data-part hooks (for GSAP):
 *   body        cargo box + chassis (everything behind the cab)
 *   cab         driver cab incl. windows, headlight, bumper, mirror
 *   wheel-front front wheel; its geometry is centered on its own box, so
 *               `rotation` with `transformOrigin: '50% 50%'` spins in place (CSS: transform-box fill-box set inline)
 *   wheel-rear  rear wheel (same as above)
 *   shadow      ground shadow ellipse (scaleX / opacity for bounce)
 *
 * Driving left means wheels rotate counter-clockwise (negative rotation).
 * viewBox 0 0 320 180 — scale freely via className (e.g. `w-64 h-auto`).
 */
import { useId } from 'react'

const WHEEL_STYLE = { transformBox: 'fill-box', transformOrigin: 'center' }

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
      <g data-part={part} style={WHEEL_STYLE}>
        <circle r="19" fill={url('tire')} />
        <circle r="15.6" fill="none" stroke="#0B1219" strokeWidth="1" opacity="0.7" />
        <circle r="11.5" fill={url('rim')} />
        <circle r="11.5" fill="none" stroke="#64748B" strokeWidth="0.8" opacity="0.6" />
        <g stroke="#64748B" strokeWidth="2.6" strokeLinecap="round">
          {spokes(3.4, 9.6).map(([x1, y1, x2, y2]) => (
            <line key={`${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
        <circle r="3.8" fill="#475569" />
        <circle r="1.5" fill="#E2E8F0" />
        {/* tread notches make rotation readable even at small sizes */}
        <g stroke="#3B4754" strokeWidth="1.4" strokeLinecap="round" opacity="0.8">
          {spokes(16.4, 18.2, 10).map(([x1, y1, x2, y2]) => (
            <line key={`${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
      </g>
      {/* static light rim on the tire — outside the rotating group */}
      <path d="M-14 -12.5 A19 19 0 0 1 6 -18" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

export default function DeliveryTruck({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <radialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0D2232" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="#0D2232" stopOpacity="0.12" />
          <stop offset="1" stopColor="#0D2232" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('boxSide')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2CC796" />
          <stop offset="0.45" stopColor="#12A57F" />
          <stop offset="1" stopColor="#0A7F63" />
        </linearGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('rearShade')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.86" stopColor="#053F33" stopOpacity="0" />
          <stop offset="1" stopColor="#053F33" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={id('cabSide')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34CF9C" />
          <stop offset="0.5" stopColor="#13A880" />
          <stop offset="1" stopColor="#0A7F63" />
        </linearGradient>
        <linearGradient id={id('cabFront')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E9B78" />
          <stop offset="1" stopColor="#076650" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#2E4A5E" />
          <stop offset="1" stopColor="#0D2232" />
        </linearGradient>
        <linearGradient id={id('headlight')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FDE68A" />
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
        <clipPath id={id('boxClip')}>
          <rect x="120" y="26" width="184" height="110" rx="7" />
        </clipPath>
        <clipPath id={id('cabClip')}>
          <path d="M120 46 H74 Q64 46 59.5 54 L45 88 Q43 92 43 98 V134 Q43 140 49 140 H120 Z" />
        </clipPath>
      </defs>

      <ellipse data-part="shadow" cx="166" cy="162" rx="150" ry="11" fill={url('shadow')} />

      {/* ───────── cargo box + chassis ───────── */}
      <g data-part="body">
        <rect x="40" y="130" width="266" height="11" rx="3" fill="#1F2D3A" />
        {/* front face of the box (visible above the cab, 3/4 view) */}
        <path d="M120 33 Q120 26 127 26 H128 L110 31 Q108 31.6 108 34 V46 H120 Z" fill={url('cabFront')} />
        <rect x="120" y="26" width="184" height="110" rx="7" fill={url('boxSide')} />
        <g clipPath={url('boxClip')}>
          <rect x="120" y="26" width="184" height="110" fill={url('rearShade')} />
          <rect x="120" y="26" width="184" height="110" fill={url('sheen')} />
          <rect x="120" y="26" width="184" height="3" fill="#fff" opacity="0.35" />
          <g stroke="#053F33" strokeOpacity="0.1" strokeWidth="1.2">
            <line x1="166" y1="34" x2="166" y2="128" />
            <line x1="212" y1="34" x2="212" y2="128" />
            <line x1="258" y1="34" x2="258" y2="128" />
          </g>
        </g>
        <rect x="129" y="35" width="166" height="92" rx="5" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.5" />
        {/* brand livery: mark + wordmark bars */}
        <g transform="translate(140 47) scale(0.9)">
          <path d="M4 3 L16 8.5 L28 3 V12.5 L16 18 L4 12.5 Z" fill="#fff" />
          <path d="M4 16 L16 21.5 L28 16 V24.5 L16 30 L4 24.5 Z" fill="#fff" opacity="0.75" />
        </g>
        <rect x="174" y="53" width="78" height="8" rx="4" fill="#fff" opacity="0.92" />
        <rect x="174" y="66" width="50" height="5" rx="2.5" fill="#fff" opacity="0.5" />
        <rect x="129" y="110" width="166" height="4" rx="2" fill="#fff" opacity="0.18" />
        {/* rear bumper + tail light */}
        <rect x="288" y="135" width="20" height="9" rx="2.5" fill="#334155" />
        <rect x="300" y="108" width="5" height="16" rx="2.5" fill="#EF4444" />
        <rect x="301" y="110" width="2" height="5" rx="1" fill="#FCA5A5" />
        {/* rear wheel well */}
        <path d="M226 141 A26 26 0 0 1 278 141 Z" fill="#0B2A24" />
      </g>

      {/* ───────── cab ───────── */}
      <g data-part="cab">
        {/* front face (3/4) */}
        <path d="M59.5 52 L45 88 L43 134 L21 130 L21.5 92 L35 57 Q36.4 54.6 39 54.4 Z" fill={url('cabFront')} />
        <path d="M54.6 57.4 L43.4 86 L24.6 89.4 L36.8 60.6 Q37.8 58.8 40 58.6 Z" fill={url('glass')} />
        <path d="M47 58 L51.5 57.7 L40 86.6 L35 87.5 Z" fill="#fff" opacity="0.2" />
        <path d="M24 100.5 L41.6 98.4 L41.4 107.6 L24 110 Z" fill={url('headlight')} />
        <g stroke="#053F33" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round">
          <line x1="25" y1="115.5" x2="40.5" y2="113.8" />
          <line x1="25" y1="119.5" x2="40.5" y2="117.8" />
          <line x1="25" y1="123.5" x2="40.5" y2="121.8" />
        </g>
        {/* side */}
        <path d="M120 46 H74 Q64 46 59.5 54 L45 88 Q43 92 43 98 V134 Q43 140 49 140 H120 Z" fill={url('cabSide')} />
        <g clipPath={url('cabClip')}>
          <rect x="40" y="44" width="82" height="100" fill={url('sheen')} />
          <rect x="40" y="46" width="82" height="2.5" fill="#fff" opacity="0.4" />
          <line x1="114" y1="48" x2="114" y2="140" stroke="#053F33" strokeOpacity="0.25" strokeWidth="1.2" />
        </g>
        <path d="M108 53 H76 Q69 53 66 59 L56 83 Q54.5 88 59.5 88 H108 Q110 88 110 86 V55 Q110 53 108 53 Z" fill={url('glass')} />
        <path d="M72 55 H84 L68.5 86.5 H57.6 Z" fill="#fff" opacity="0.16" />
        <path d="M88 55 H93 L77.5 86.5 H72.5 Z" fill="#fff" opacity="0.1" />
        <rect x="96" y="97" width="12" height="3.4" rx="1.7" fill="#053F33" opacity="0.45" />
        <rect x="56" y="118" width="58" height="3" rx="1.5" fill="#fff" opacity="0.16" />
        {/* mirror */}
        <path d="M44 84 L30 79" stroke="#1F2D3A" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="12" y="66" width="7" height="19" rx="2.5" fill="#1F2D3A" />
        <path d="M19 76 L30 79" stroke="#1F2D3A" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="13.2" y="67.5" width="2" height="10" rx="1" fill="#fff" opacity="0.25" />
        {/* step + bumper */}
        <rect x="78" y="134" width="26" height="4.5" rx="1.5" fill="#1F2D3A" />
        <path d="M18 126.5 L43 131.5 H66 V140.5 Q66 143.5 63 143.5 L20.5 141 Q18 140.9 18 138.5 Z" fill="#334155" />
        <path d="M19 128 L43 132.8 H65 V134.6 H43 L19 130 Z" fill="#fff" opacity="0.18" />
        {/* front wheel well */}
        <path d="M52 141 A26 26 0 0 1 104 141 Z" fill="#0B2A24" />
      </g>

      <Wheel part="wheel-front" cx={78} cy={142} url={url} />
      <Wheel part="wheel-rear" cx={252} cy={142} url={url} />
    </svg>
  )
}

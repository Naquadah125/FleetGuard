/**
 * PhoneMap — smartphone showing a mini city map with a driven route and status pins.
 * Soft "3D vector" style. Static: no animation inside.
 *
 * data-part hooks (for GSAP):
 *   phone   device body + bezel + blank screen
 *   phone-ui  on-screen chrome drawn above the map: status bar, search pill, bottom trip card
 *   map     map tiles: blocks, park, water, roads (clipped to the screen)
 *   route   ONE stroked path (start → destination), ideal for DrawSVG `drawSVG: '0% 100%'`
 *   pin-1   destination pin, green (large)
 *   pin-2   warning pin, orange
 *   pin-3   alert pin, red
 *   pin-4   start pin, green (small)
 *           Each pin's tip is the bottom-center of its own box → drop / bounce with
 *           `transformOrigin: '50% 100%'` (GSAP resolves the % origin against the pin's own bbox;
 *           no CSS transform-box is set — do not add one, it would shift GSAP's pivot).
 *
 * viewBox 0 0 200 380.
 */
import { useId } from 'react'

const PIN_D = 'M0 0 C-2.6 -5.6 -10 -9.4 -10 -16 A10 10 0 1 1 10 -16 C10 -9.4 2.6 -5.6 0 0 Z'

// [part, x, y, scale, gradient]
const PINS = [
  ['pin-1', 164, 120, 1.5, 'pinGreen'],
  ['pin-2', 96, 172, 1.2, 'pinOrange'],
  ['pin-3', 152, 262, 1.2, 'pinRed'],
  ['pin-4', 62, 284, 1, 'pinGreen'],
]
const ROUTE_D = 'M62 284 V226 Q62 214 74 214 H120 Q132 214 132 202 V132 Q132 120 144 120 H164'

export default function PhoneMap({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  const pinGrad = (name, light, dark) => (
    <linearGradient id={id(name)} x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stopColor={light} />
      <stop offset="1" stopColor={dark} />
    </linearGradient>
  )

  return (
    <svg viewBox="0 0 200 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <radialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0D2232" stopOpacity="0.25" />
          <stop offset="1" stopColor="#0D2232" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#24465A" />
          <stop offset="0.5" stopColor="#123043" />
          <stop offset="1" stopColor="#0A1B28" />
        </linearGradient>
        <linearGradient id={id('glare')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {pinGrad('pinGreen', '#2DCB97', '#08765E')}
        {pinGrad('pinOrange', '#FBBF4D', '#D97706')}
        {pinGrad('pinRed', '#F87171', '#DC2626')}
        <clipPath id={id('screen')}>
          <rect x="20" y="18" width="160" height="336" rx="23" />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="368" rx="86" ry="9" fill={url('shadow')} />

      <g data-part="phone">
        <rect x="12" y="8" width="176" height="356" rx="31" fill={url('body')} />
        <rect x="12.75" y="8.75" width="174.5" height="354.5" rx="30.25" stroke="#fff" strokeOpacity="0.16" strokeWidth="1.5" />
        <rect x="188" y="92" width="3" height="34" rx="1.5" fill="#123043" />
        <rect x="9" y="80" width="3" height="22" rx="1.5" fill="#123043" />
        <rect x="9" y="108" width="3" height="22" rx="1.5" fill="#123043" />
        <rect x="20" y="18" width="160" height="336" rx="23" fill="#F4F7F6" />
      </g>

      <g clipPath={url('screen')}>
        <g data-part="map">
          <rect x="20" y="56" width="160" height="300" fill="#EEF3F1" />
          {/* blocks */}
          <g fill="#E3EAE7">
            <rect x="26" y="62" width="28" height="50" rx="4" />
            <rect x="70" y="128" width="54" height="78" rx="4" />
            <rect x="140" y="128" width="34" height="78" rx="4" />
            <rect x="26" y="222" width="28" height="40" rx="4" />
            <rect x="70" y="222" width="54" height="40" rx="4" />
            <rect x="140" y="222" width="34" height="40" rx="4" />
          </g>
          <path d="M20 128 H54 V206 H20 Z" fill="#CDEEDC" />
          <circle cx="36" cy="150" r="6" fill="#B3E5CA" />
          <circle cx="44" cy="180" r="8" fill="#B3E5CA" />
          <path d="M140 56 H180 V104 Q160 112 148 96 Q138 82 140 56 Z" fill="#D5E7FA" />
          {/* roads: casing then surface */}
          <g strokeLinecap="round">
            <g stroke="#DCE4E8" strokeWidth="10">
              <path d="M62 50 V360 M132 50 V360 M14 120 H186 M14 214 H186 M14 270 H186" />
              <path d="M70 50 C90 80 120 92 186 100" />
            </g>
            <g stroke="#FFFFFF" strokeWidth="7">
              <path d="M62 50 V360 M132 50 V360 M14 120 H186 M14 214 H186 M14 270 H186" />
              <path d="M70 50 C90 80 120 92 186 100" />
            </g>
            <path d="M98 50 V112" stroke="#fff" strokeWidth="4" />
            <path d="M20 168 H54" stroke="#fff" strokeWidth="4" />
          </g>
          {/* alert / geofence zones */}
          <circle cx="152" cy="246" r="22" fill="#EF4444" fillOpacity="0.1" stroke="#EF4444" strokeOpacity="0.25" strokeDasharray="3 3" />
          <circle cx="96" cy="156" r="18" fill="#F59E0B" fillOpacity="0.1" />
        </g>

        <path d="M20 18 L120 18 L20 190 Z" fill={url('glare')} opacity="0.35" />

        <path data-part="route" d={ROUTE_D} stroke="#0E9B78" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

        {PINS.map(([part, x, y, s, grad]) => (
          <g key={part} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="0" rx={6 * s} ry={2.2 * s} fill="#0D2232" opacity="0.18" />
            <g data-part={part}>
              <g transform={`scale(${s})`}>
                <path d={PIN_D} fill={url(grad)} stroke="#fff" strokeWidth="1.6" />
                <circle cx="0" cy="-16" r="4" fill="#fff" />
                <path d="M-6 -21 A7 7 0 0 1 -1 -24" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" />
              </g>
            </g>
          </g>
        ))}

        {/* screen chrome (kept above the map) */}
        <g data-part="phone-ui">
          <rect x="20" y="18" width="160" height="40" fill="#FFFFFF" />
          <rect x="20" y="57" width="160" height="1" fill="#E2E8F0" />
          <rect x="80" y="23" width="40" height="9" rx="4.5" fill="#0D2232" />
          <rect x="30" y="25" width="16" height="4" rx="2" fill="#334155" />
          <circle cx="160" cy="27" r="2" fill="#334155" />
          <circle cx="167" cy="27" r="2" fill="#334155" />
          <rect x="30" y="38" width="140" height="13" rx="6.5" fill="#F1F5F9" />
          <path d="M37 41.5 L41 43.3 L45 41.5 V44.5 L41 46.3 L37 44.5 Z" fill="#0E9B78" />
          <rect x="51" y="42.5" width="46" height="4" rx="2" fill="#CBD5E1" />
          <circle cx="162" cy="44.5" r="3.5" fill="#0E9B78" opacity="0.25" />

          <rect x="28" y="302" width="144" height="42" rx="12" fill="#0D2232" opacity="0.08" transform="translate(0 2)" />
          <rect x="28" y="300" width="144" height="42" rx="12" fill="#FFFFFF" />
          <circle cx="46" cy="321" r="9" fill="#ECFDF5" />
          <path d="M42 318.5 L46 320.3 L50 318.5 V321.5 L46 323.3 L42 321.5 Z" fill="#0E9B78" />
          <rect x="61" y="313" width="54" height="5" rx="2.5" fill="#334155" />
          <rect x="61" y="323" width="38" height="4" rx="2" fill="#CBD5E1" />
          <rect x="128" y="313" width="34" height="16" rx="8" fill="#ECFDF5" />
          <rect x="134" y="319" width="22" height="4" rx="2" fill="#0E9B78" />
        </g>
      </g>
    </svg>
  )
}

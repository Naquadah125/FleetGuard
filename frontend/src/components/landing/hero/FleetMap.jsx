/**
 * FleetMap — code-built city map for the hero dashboard (no image, no tiles).
 * Streets grid on `surface`, two parks, two translucent geofence circles, one route and 4 pins.
 * Static markup; the Hero animates it through these hooks:
 *
 *   [data-map-route]     the route stroke (DrawSVG-friendly single path)
 *   [data-map-vehicle]   small vehicle dot (MotionPath along the route); sits at the route start
 *   [data-map-fence]     the two geofence circles
 *   [data-map-pin]       pin wrapper; inside it:
 *     [data-pin-body]    the pin itself (drop: animate y / opacity, origin = pin tip)
 *     [data-pin-ring]    ground ring under the tip (pulse: scale + opacity; rest opacity 0)
 *
 * viewBox 0 0 400 300, `preserveAspectRatio="xMidYMid slice"` so it fills any panel ratio.
 */

const STREETS_MAJOR = [
  'M0 92 H400',
  'M0 196 H400',
  'M0 262 H400',
  'M118 0 V300',
  'M250 0 V300',
  'M352 0 V300',
  'M147 300 L340 0',
]
const STREETS_MINOR = [
  'M0 30 H400',
  'M0 140 H250',
  'M250 150 H400',
  'M0 230 H400',
  'M60 0 V300',
  'M184 92 V300',
  'M300 0 V196',
  'M20 300 L118 196',
]

export const ROUTE_D = 'M30 262 H118 V196 H214 L250 140 V92 H352 V44'

const PINS = [
  { x: 74, y: 262, tone: 'brand' },
  { x: 166, y: 196, tone: 'brand' },
  { x: 250, y: 116, tone: 'brand' },
  { x: 352, y: 50, tone: 'info' },
]

const PIN_FILL = { brand: 'var(--color-brand)', info: 'var(--color-info)' }

function Pin({ x, y, tone }) {
  const fill = PIN_FILL[tone]
  return (
    <g data-map-pin transform={`translate(${x} ${y})`}>
      <ellipse
        data-pin-ring
        cx="0"
        cy="0"
        rx="12"
        ry="5"
        fill="none"
        stroke={fill}
        strokeWidth="2"
        opacity="0"
      />
      <g data-pin-body>
        <ellipse cx="0" cy="1" rx="5" ry="2" fill="var(--color-navy)" opacity="0.18" />
        <path
          d="M0 0 C-2.4 -6.5 -10 -10.5 -10 -18 A10 10 0 1 1 10 -18 C10 -10.5 2.4 -6.5 0 0 Z"
          fill={fill}
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="-18" r="4" fill="white" />
      </g>
    </g>
  )
}

export default function FleetMap({ className }) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="400" height="300" fill="var(--color-surface)" />

      {/* city blocks: faint tint so the grid reads as built-up area */}
      <g fill="var(--color-line)" opacity="0.45">
        <rect x="128" y="102" width="46" height="30" rx="3" />
        <rect x="128" y="150" width="46" height="38" rx="3" />
        <rect x="260" y="102" width="34" height="40" rx="3" />
        <rect x="310" y="102" width="34" height="86" rx="3" />
        <rect x="70" y="102" width="40" height="30" rx="3" />
        <rect x="8" y="150" width="44" height="38" rx="3" />
        <rect x="260" y="38" width="34" height="46" rx="3" />
        <rect x="8" y="238" width="44" height="18" rx="3" />
        <rect x="194" y="238" width="48" height="18" rx="3" />
        <rect x="360" y="204" width="40" height="50" rx="3" />
      </g>

      {/* parks + water */}
      <rect x="0" y="0" width="110" height="84" rx="4" fill="var(--color-success)" opacity="0.16" />
      <rect x="0" y="0" width="54" height="24" rx="4" fill="var(--color-success)" opacity="0.12" />
      <rect x="260" y="204" width="84" height="50" rx="6" fill="var(--color-success)" opacity="0.14" />
      <path
        d="M-6 168 C26 160 44 182 54 204 S86 250 96 306"
        stroke="var(--color-info)"
        strokeOpacity="0.22"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* streets: casing in `line`, white carriageway on top */}
      <g stroke="var(--color-line)" strokeLinecap="round">
        {STREETS_MAJOR.map((d) => (
          <path key={d} d={d} strokeWidth="12" />
        ))}
        {STREETS_MINOR.map((d) => (
          <path key={d} d={d} strokeWidth="6" />
        ))}
      </g>
      <g stroke="white" strokeLinecap="round">
        {STREETS_MAJOR.map((d) => (
          <path key={d} d={d} strokeWidth="9" />
        ))}
        {STREETS_MINOR.map((d) => (
          <path key={d} d={d} strokeWidth="4" />
        ))}
      </g>

      {/* geofences */}
      <circle
        data-map-fence
        cx="150"
        cy="112"
        r="72"
        fill="var(--color-info)"
        fillOpacity="0.12"
        stroke="var(--color-info)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="5 5"
      />
      <circle
        data-map-fence
        cx="300"
        cy="226"
        r="62"
        fill="var(--color-navy)"
        fillOpacity="0.07"
        stroke="var(--color-navy)"
        strokeOpacity="0.22"
        strokeWidth="1.5"
        strokeDasharray="5 5"
      />

      {/* route: white casing + info line */}
      <path d={ROUTE_D} stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <path
        data-map-route
        d={ROUTE_D}
        stroke="var(--color-info)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        data-map-vehicle
        cx="30"
        cy="262"
        r="6"
        fill="var(--color-brand-dark)"
        stroke="white"
        strokeWidth="2.5"
      />

      {PINS.map((p) => (
        <Pin key={`${p.x}-${p.y}`} {...p} />
      ))}
    </svg>
  )
}

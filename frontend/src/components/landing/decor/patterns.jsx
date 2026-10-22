/**
 * Static pattern layers for <SectionBackdrop /> (decorative, aria-hidden by the backdrop).
 * Dots and grid are CSS gradients; routes and topo are inline SVG (viewBox 1440×900, `slice`,
 * non-scaling strokes). Nothing here animates; the shape mask (where the pattern shows) comes
 * from PATTERN_MASKS so the content column stays calm.
 */

const BRAND = 'var(--color-brand)'
const INFO = 'var(--color-info)'

/** Where the pattern is visible (CSS mask-image; layers are unioned). */
export const PATTERN_MASKS = {
  edges: 'radial-gradient(ellipse 72% 68% at 50% 50%, transparent 40%, #000 100%)',
  left: 'radial-gradient(ellipse 55% 85% at 0% 45%, #000 15%, transparent 80%)',
  right: 'radial-gradient(ellipse 58% 90% at 100% 45%, #000 15%, transparent 80%)',
  top: 'radial-gradient(ellipse 42% 75% at 0% 0%, #000 10%, transparent 80%), radial-gradient(ellipse 42% 75% at 100% 0%, #000 10%, transparent 80%)',
  bottom: 'radial-gradient(ellipse 42% 75% at 0% 100%, #000 10%, transparent 80%), radial-gradient(ellipse 42% 75% at 100% 100%, #000 10%, transparent 80%)',
  diagonal: 'linear-gradient(135deg, #000, transparent 42%, transparent 62%, #000)',
}

const layer = 'absolute inset-0 size-full'

/*
 * Contrast budget: every pattern pixel must stay >= 0.82 relative luminance over its tint so
 * brand-dark small text keeps 4.5:1 wherever a section places it. Structure therefore comes from
 * WHITE strokes (lighter than the tint: they can only raise contrast) and the brand-coloured
 * marks stay at <= 15% alpha.
 */
const WHITE = 'var(--color-white, #fff)'
const brandA = (pct) => `color-mix(in oklab, ${BRAND} ${pct}%, transparent)`

function DotsPattern({ style }) {
  return (
    <div
      className={layer}
      style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, ${brandA(9)} 1.4px, transparent 1.9px)`,
        backgroundSize: '22px 22px',
        ...style,
      }}
    />
  )
}

function GridPattern({ style }) {
  // Blueprint paper: white minor lines every 32px, faint brand major lines every 128px.
  const minor = 'color-mix(in oklab, white 85%, transparent)'
  const major = brandA(5)
  return (
    <div
      className={layer}
      style={{
        backgroundImage: [
          `linear-gradient(${major} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${major} 1px, transparent 1px)`,
          `linear-gradient(${minor} 1.5px, transparent 1.5px)`,
          `linear-gradient(90deg, ${minor} 1.5px, transparent 1.5px)`,
        ].join(', '),
        backgroundSize: '128px 128px, 128px 128px, 32px 32px, 32px 32px',
        backgroundPosition: 'center top',
        ...style,
      }}
    />
  )
}

/** Map pin (tip at 0,0), 20×30 units: light mint body, faint brand outline, white hub. */
function Pin({ x, y, color = BRAND }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="1.5" rx="8" ry="2.6" fill={WHITE} fillOpacity="0.9" />
      <path
        d="M0 0C-3.5-7-10-11.5-10-19A10 10 0 1 1 10-19C10-11.5 3.5-7 0 0Z"
        fill="color-mix(in oklab, var(--color-brand-100) 65%, white)"
        stroke={color}
        strokeOpacity="0.1"
        strokeWidth="1.5"
      />
      <circle cx="0" cy="-19" r="4" fill={WHITE} />
    </g>
  )
}

/** [street path, route colour or null (street only)] — routes are dashed over their street. */
const ROUTES = [
  ['M-20 720C240 640 380 770 620 640S980 420 1180 470 1400 380 1480 300', BRAND],
  ['M760-20C800 160 700 260 860 380S1120 560 1060 760 1180 900 1240 940', BRAND],
  ['M1460 120C1300 160 1220 80 1080 150S880 260 900 120 1000-10 1040-30', INFO],
  ['M560 940C600 760 520 620 640 520S900 300 980 140 1100-20 1120-40', null],
  ['M-30 420C200 470 420 380 640 520S1000 640 1460 600', null],
  ['M1180 470C1230 560 1330 600 1460 640', null],
]
const PINS = [
  [1180, 470, BRAND],
  [860, 380, BRAND],
  [900, 120, INFO],
  [620, 640, BRAND],
]
const WAYPOINTS = [
  [380, 712],
  [1060, 760],
  [1300, 160],
  [980, 140],
  [240, 446],
]

function RoutesPattern({ seed = 0, style }) {
  // Seed 1 mirrors the map horizontally (same drawing, different composition).
  const flip = seed % 2 === 1 ? 'translate(1440 0) scale(-1 1)' : undefined
  return (
    <svg className={layer} style={style} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
      <g transform={flip} fill="none" strokeLinecap="round">
        {ROUTES.map(([d]) => (
          <path key={`s${d}`} d={d} stroke={WHITE} strokeOpacity="0.85" strokeWidth="10" vectorEffect="non-scaling-stroke" />
        ))}
        {ROUTES.filter(([, color]) => color).map(([d, color]) => (
          <path
            key={`r${d}`}
            d={d}
            stroke={color}
            strokeOpacity="0.12"
            strokeWidth="2.5"
            strokeDasharray="1 9"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {WAYPOINTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill={WHITE} stroke={BRAND} strokeOpacity="0.1" strokeWidth="2" />
        ))}
        {PINS.map(([x, y, color]) => (
          <Pin key={`${x}-${y}`} x={x} y={y} color={color} />
        ))}
      </g>
    </svg>
  )
}

/**
 * Closed, slightly irregular contour ring (Catmull-Rom through 16 points → cubic Béziers).
 * Deterministic; computed once at module load.
 */
function contour(cx, cy, r, phase) {
  const n = 16
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = 1 + 0.09 * Math.sin(2 * a + phase) + 0.05 * Math.sin(3 * a + phase * 1.7)
    return [cx + Math.cos(a) * r * k * 1.25, cy + Math.sin(a) * r * k]
  })
  const p = (i) => pts[(i + n) % n]
  const f = (v) => Math.round(v * 10) / 10
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return `${d}Z`
}

const HILLS = [
  // [cx, cy, first radius, step, rings, phase]
  [1200, 170, 46, 46, 7, 0.4],
  [210, 760, 40, 44, 6, 2.1],
  [1320, 860, 60, 50, 3, 4.0],
]
const TOPO = HILLS.flatMap(([cx, cy, r0, step, rings, phase]) =>
  Array.from({ length: rings }, (_, i) => ({ d: contour(cx, cy, r0 + i * step, phase + i * 0.35), major: i % 2 === 1 })),
)

function TopoPattern({ seed = 0, style }) {
  const flip = seed % 2 === 1 ? 'translate(1440 0) scale(-1 1)' : undefined
  return (
    <svg className={layer} style={style} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
      <g transform={flip} fill="none">
        {TOPO.map(({ d, major }) => (
          <path
            key={d}
            d={d}
            stroke={major ? WHITE : BRAND}
            strokeOpacity={major ? 0.9 : 0.06}
            strokeWidth={major ? 2.5 : 1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  )
}

const PATTERNS = { dots: DotsPattern, grid: GridPattern, routes: RoutesPattern, topo: TopoPattern }

/**
 * @param {{ name: 'dots'|'grid'|'routes'|'topo'|'none', mask?: keyof PATTERN_MASKS, seed?: number }} props
 */
export default function Pattern({ name, mask = 'edges', seed = 0 }) {
  const Component = PATTERNS[name]
  if (!Component) return null
  const maskImage = PATTERN_MASKS[mask] ?? PATTERN_MASKS.edges
  return <Component seed={seed} style={{ maskImage, WebkitMaskImage: maskImage }} />
}

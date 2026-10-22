/**
 * ChartBadge3D — three violet clay bars rising from a white plinth (smart reports).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow   contact shadow — scale with svgOrigin '60 110'
 *   body     floating object — y float, rotation svgOrigin '60 60'
 *   bars     group of the three bars (drawn behind the plinth's front edge)
 *   bar-1 … bar-3
 *            short → tall, left → right. Each bar's foot sits on y = 84, so grow / bounce with
 *            `scaleY` + svgOrigin '38 84' | '60 84' | '82 84' (bar centre x, foot y).
 *            Each bar carries its own cap highlight, so it scales with the bar.
 *   shine    plinth top-edge highlight + glint
 */
import { Badge3D, CLAY, Lin, VIOLET, clay } from './Badge3D.jsx'

// [part, x, top]; bars are 16 wide, foot at y 84
const BARS = [
  ['bar-1', 30, 60],
  ['bar-2', 52, 44],
  ['bar-3', 74, 26],
]

export default function ChartBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      shadowRx={36}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('bar')} stops={[[0, VIOLET.hi], [0.25, VIOLET.light], [0.7, VIOLET.base], [1, VIOLET.dark]]} y2="0" x2="1" />
            <Lin id={id('pl')} stops={clay(CLAY)} y2="1" x2="0.3" />
          </defs>
          <g data-part="body">
            <g data-part="bars">
              {BARS.map(([part, x, top]) => (
                <g key={part} data-part={part}>
                  <rect x={x + 2} y={top + 2} width="16" height={86 - top} rx="6" fill={VIOLET.deep} opacity=".55" />
                  <rect x={x} y={top} width="16" height={88 - top} rx="6" fill={url('bar')} />
                  <rect x={x + 0.75} y={top + 0.75} width="14.5" height={86 - top} rx="5.25" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
                  <rect x={x + 3} y={top + 3} width="4" height={Math.min(18, 70 - top)} rx="2" fill="#fff" opacity=".55" />
                </g>
              ))}
            </g>
            <rect x="20" y="84" width="80" height="14" rx="7" fill={CLAY.deep} />
            <rect x="20" y="80" width="80" height="14" rx="7" fill={url('pl')} />
            <rect x="20.75" y="80.75" width="78.5" height="12.5" rx="6.25" stroke="#fff" strokeWidth="1.5" />
            <g data-part="shine">
              <path d="M27 84 H70" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <ellipse cx="34" cy="86" rx="7" ry="2.2" fill={url('gl')} />
            </g>
          </g>
        </>
      )}
    />
  )
}

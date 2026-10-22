/**
 * ChartGlyph — three rising purple bars under an up-trend line (Báo cáo thông minh). Frame: see Glyph.jsx.
 *
 * data-part hooks:
 *   bar-1 … bar-3  bars left → right. Grow with `scaleY` from the baseline,
 *                  svgOrigin '8.7 28.3' / '16 28.3' / '23.3 28.3'.
 *   trend          the trend line + end dot (group). Its <path> has pathLength="1": draw it on with
 *                  strokeDasharray 1 + strokeDashoffset 1 → 0 (select `[data-part=trend] path`);
 *                  the halo path is the first child, the coloured stroke the second.
 */
import { Glyph, Grad, HALO } from './Glyph.jsx'

const BASE = 28.3
// [x, top] — bar width 5.6, so centres 8.7 / 16 / 23.3
const BARS = [
  [5.9, 19.4],
  [13.2, 16.9],
  [20.5, 12.6],
]
const TREND = 'M6.2 14.1 L12.5 8.6 L17.5 11.2 L25 5.5'

export default function ChartGlyph({ className, title, ...props }) {
  return (
    <Glyph
      className={className}
      title={title}
      dy={1.6}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Grad id={id('b')} stops={[[0, '#A762FC'], [0.45, '#9340F7'], [1, '#7D27EC']]} />
          </defs>
          {BARS.map(([x, top], i) => (
            <rect
              key={i}
              data-part={`bar-${i + 1}`}
              x={x}
              y={top}
              width="5.6"
              height={BASE - top}
              rx="1.3"
              fill={url('b')}
              {...HALO}
            />
          ))}
          <g data-part="trend">
            <path d={TREND} pathLength="1" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={TREND} pathLength="1" stroke="#8A2DF3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="25" cy="5.5" r="1.6" fill="#8A2DF3" {...HALO} />
          </g>
        </>
      )}
    />
  )
}

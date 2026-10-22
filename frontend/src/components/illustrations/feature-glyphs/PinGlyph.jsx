/**
 * PinGlyph — filled blue map pin with a white dot (Giám sát toàn diện). Frame contract: see Glyph.jsx.
 *
 * data-part hooks:
 *   pin   the teardrop (contains `dot`). Drop-bounce with `y` + squash `scaleY`, svgOrigin '16 30' (the tip).
 *   dot   white centre dot, inside `pin`. Pulse with `scale` (0.8 ↔ 1), svgOrigin '16 12.4'.
 */
import { Glyph, Grad, HALO } from './Glyph.jsx'

const DROP =
  'M16 30 C14.7 28.3 5.6 20.3 5.6 12.6 C5.6 6.8 10.2 2.2 16 2.2 C21.8 2.2 26.4 6.8 26.4 12.6 C26.4 20.3 17.3 28.3 16 30 Z'

export default function PinGlyph({ className, title, ...props }) {
  return (
    <Glyph
      className={className}
      title={title}
      dy={1.1}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Grad id={id('f')} stops={[[0, '#4C96FD'], [0.5, '#2A7CF8'], [1, '#1566EE']]} />
          </defs>
          <g data-part="pin">
            <path d={DROP} fill={url('f')} {...HALO} />
            <path d="M9.4 9.6 C10.4 7 12.5 5.3 15 4.9" stroke="#fff" strokeOpacity=".22" strokeWidth="1.1" strokeLinecap="round" />
            <circle data-part="dot" cx="16" cy="12.4" r="3.7" fill="#fff" />
          </g>
        </>
      )}
    />
  )
}

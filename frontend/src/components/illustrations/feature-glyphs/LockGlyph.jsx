/**
 * LockGlyph — filled pink-red padlock with a white keyhole (Bảo mật tuyệt đối). Frame: see Glyph.jsx.
 *
 * data-part hooks:
 *   shackle  the arch (drawn behind `body`). "Unlock-relock" with `y` (-2.4 → 0), or swing open with
 *            `rotation`, svgOrigin '22.4 15' (right leg foot).
 *   body     case + keyhole. Shake with `x` keyframes or `rotation`, svgOrigin '16 21'.
 */
import { Glyph, Grad, HALO } from './Glyph.jsx'

const SHACKLE = 'M8.3 15 V10.1 A7.7 7.7 0 0 1 23.7 10.1 V15 H21 V10.1 A5 5 0 0 0 11 10.1 V15 Z'
const KEYHOLE =
  'M16 17 A2.6 2.6 0 0 1 17.45 21.75 L18 24.6 Q18.1 25.5 17.25 25.5 H14.75 Q13.9 25.5 14 24.6 L14.55 21.75 A2.6 2.6 0 0 1 16 17 Z'

export default function LockGlyph({ className, title, ...props }) {
  return (
    <Glyph
      className={className}
      title={title}
      dy={0.7}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Grad id={id('s')} stops={[[0, '#FF9CBE'], [1, '#F7709F']]} />
            <Grad id={id('b')} stops={[[0, '#FF8AB1'], [0.5, '#FB6E9D'], [1, '#F2588E']]} />
          </defs>
          <path data-part="shackle" d={SHACKLE} fill={url('s')} {...HALO} />
          <g data-part="body">
            <rect x="4.7" y="12.8" width="22.6" height="16.8" rx="4" fill={url('b')} {...HALO} />
            <path d="M7.8 15.8 H12.6" stroke="#fff" strokeOpacity=".2" strokeWidth="1.1" strokeLinecap="round" />
            <path d={KEYHOLE} fill="#fff" />
          </g>
        </>
      )}
    />
  )
}

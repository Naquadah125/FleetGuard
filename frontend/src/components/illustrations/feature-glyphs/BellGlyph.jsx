/**
 * BellGlyph — filled green bell (Cảnh báo tức thời). Frame contract: see Glyph.jsx (viewBox 0 0 32 32).
 *
 * data-part hooks:
 *   body     knob + dome + flared lip. Ring with `rotation` (±12° keyframes), svgOrigin '16 2.6' (the knob).
 *   clapper  half-ellipse under the lip (drawn before `body`, so the body's halo cuts a gap above it).
 *            Counter-swing with `x` (±1.2) or `rotation`, svgOrigin '16 25.6'.
 */
import { Glyph, Grad, HALO } from './Glyph.jsx'

const DOME =
  'M16 4.4 C11.3 4.4 8.8 7.8 8.8 12.4 V17.1 C8.8 19.5 7.7 21.1 5.9 22.4 C4.7 23.2 4.2 23.9 4.2 24.6 C4.2 25.5 4.8 25.9 5.7 25.9 H26.3 C27.2 25.9 27.8 25.5 27.8 24.6 C27.8 23.9 27.3 23.2 26.1 22.4 C24.3 21.1 23.2 19.5 23.2 17.1 V12.4 C23.2 7.8 20.7 4.4 16 4.4 Z'

export default function BellGlyph({ className, title, ...props }) {
  return (
    <Glyph
      className={className}
      title={title}
      dy={0.7}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Grad id={id('f')} stops={[[0, '#1F9B48'], [0.5, '#0F8A37'], [1, '#087529']]} />
            <Grad id={id('c')} stops={[[0, '#1E9A47'], [1, '#0A7C2E']]} />
          </defs>
          <path data-part="clapper" d="M12.3 26.6 H19.7 C19.7 28.8 18 30.4 16 30.4 C14 30.4 12.3 28.8 12.3 26.6 Z" fill={url('c')} {...HALO} />
          <g data-part="body">
            <circle cx="16" cy="3.4" r="1.9" fill="#17933F" {...HALO} />
            <path d={DOME} fill={url('f')} {...HALO} />
            <path d="M12 9.2 C12.6 7.6 13.8 6.6 15.2 6.3" stroke="#fff" strokeOpacity=".2" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        </>
      )}
    />
  )
}

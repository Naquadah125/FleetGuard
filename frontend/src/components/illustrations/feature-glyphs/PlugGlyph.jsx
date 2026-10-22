/**
 * PlugGlyph — two-tone orange power plug (Dễ dàng tích hợp): light upper-left / deep lower-right split
 * on a diagonal, like the mockup. Frame contract: see Glyph.jsx.
 *
 * data-part hooks:
 *   plug     the whole plug (body + cord + `prongs`). "Plug in" with `y` (-2 → 0), wobble with
 *            `rotation`, svgOrigin '16 29' (cord end).
 *   prongs   the two pins, inside `plug`. Jiggle/spark with `y` or `scaleY`, svgOrigin '16 9.7' (body top).
 */
import { Glyph, HALO } from './Glyph.jsx'

const BODY =
  'M7.7 9.7 H24.3 Q25.8 9.7 25.8 11.2 V12.6 Q25.8 13.7 24.8 14.3 L24.1 14.7 Q23.1 15.4 22.7 16.5 L21.9 19.2 Q21.1 21.8 18.5 21.8 H13.5 Q10.9 21.8 10.1 19.2 L9.3 16.5 Q8.9 15.4 7.9 14.7 L7.2 14.3 Q6.2 13.7 6.2 12.6 V11.2 Q6.2 9.7 7.7 9.7 Z'

export default function PlugGlyph({ className, title, ...props }) {
  return (
    <Glyph
      className={className}
      title={title}
      dy={1.4}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            {/* Hard diagonal split through (18, 15): light upper-left, deep lower-right. */}
            <linearGradient id={id('f')} gradientUnits="userSpaceOnUse" x1="12.5" y1="9.5" x2="23.5" y2="20.5">
              <stop offset="0" stopColor="#FFB851" />
              <stop offset=".5" stopColor="#FF9C33" />
              <stop offset=".5" stopColor="#F2741A" />
              <stop offset="1" stopColor="#E3570B" />
            </linearGradient>
            <linearGradient id={id('p')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFB44C" />
              <stop offset="1" stopColor="#FF9A30" />
            </linearGradient>
          </defs>
          <g data-part="plug">
            <rect x="14.7" y="20" width="2.6" height="9" rx="1.3" fill="#F5841F" {...HALO} />
            <g data-part="prongs">
              <rect x="10.7" y="2.9" width="2.4" height="8" rx="1.2" fill={url('p')} {...HALO} />
              <rect x="18.9" y="2.9" width="2.4" height="8" rx="1.2" fill={url('p')} {...HALO} />
            </g>
            <path d={BODY} fill={url('f')} {...HALO} />
          </g>
        </>
      )}
    />
  )
}

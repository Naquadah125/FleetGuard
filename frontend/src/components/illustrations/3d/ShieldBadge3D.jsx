/**
 * ShieldBadge3D — teal clay shield with a white check (security / safety).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow   contact shadow — scale with svgOrigin '60 110'
 *   body     floating object — y float, rotation svgOrigin '60 60'
 *   shine    top-left specular streak + glint
 *   check    the white check stroke, pathLength="1" — draw with
 *            `strokeDasharray: '1 2', strokeDashoffset: 1.001 → 0` (no DrawSVG)
 */
import { Badge3D, Lin, TEAL, clay } from './Badge3D.jsx'

const D = 'M60 14 C70 19 81 22 92 23 C93 31 93 41 92 52 C90 74 78 88 60 97 C42 88 30 74 28 52 C27 41 27 31 28 23 C39 22 50 19 60 14 Z'
const IN = 'M60 25 C67 29 75 31 83 32 C84 38 84 45 83 53 C81 69 73 80 60 87 C47 80 39 69 37 53 C36 45 36 38 37 32 C45 31 53 29 60 25 Z'
const CHECK = 'M46 56 L56 66 L75 46'

export default function ShieldBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(TEAL)} />
            <Lin id={id('s')} stops={[[0, TEAL.dark], [1, TEAL.deep]]} x2="0" />
            <Lin id={id('in')} stops={[[0, TEAL.deep], [1, TEAL.light]]} x2="0.6" />
          </defs>
          <g data-part="body">
            <path d={D} transform="translate(0 5)" fill={url('s')} />
            <path d={D} fill={url('f')} />
            <path d={D} fill={url('vol')} />
            <path d={D} stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
            <path d="M91 55 C88 74 77 86 62 94" stroke={TEAL.hi} strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
            <path d={IN} fill={url('in')} opacity=".5" />
            <path d="M83 53 C81 69 73 80 60 87 C47 80 39 69 37 53" stroke="#fff" strokeOpacity=".3" strokeWidth="1.2" />
            <path d={CHECK} transform="translate(0 3)" stroke={TEAL.deep} strokeOpacity=".5" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path data-part="check" d={CHECK} pathLength="1" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <g data-part="shine">
              <path d="M34 29 C42 28 50 25 57 21" stroke="#fff" strokeOpacity=".8" strokeWidth="3.5" strokeLinecap="round" />
              <ellipse cx="36" cy="44" rx="3.5" ry="8" fill={url('gl')} opacity=".75" />
            </g>
          </g>
        </>
      )}
    />
  )
}

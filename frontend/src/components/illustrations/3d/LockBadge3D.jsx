/**
 * LockBadge3D — teal clay padlock with a silver shackle (data security).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow   contact shadow — scale with svgOrigin '60 110'
 *   body     floating object — y float, rotation svgOrigin '60 60'
 *   shackle  silver U — unlock by lifting (`y: -7`) and/or swinging open on its right leg:
 *            rotation with svgOrigin '77 50'. Drawn behind the case, so its legs hide inside.
 *   case     the lock body (everything except the shackle)
 *   keyhole  dark keyhole — "click" with scale, svgOrigin '60 70'
 *   shine    specular streak + glint on the case
 */
import { Badge3D, CLAY, Lin, TEAL, clay } from './Badge3D.jsx'

const SHACKLE = 'M43 54 V40 C43 29 51 22 60 22 C69 22 77 29 77 40 V54'
const KEY = 'M60 61 a7 7 0 0 1 4 12.7 L66 82 H54 L56 73.7 A7 7 0 0 1 60 61 Z'

export default function LockBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(TEAL)} />
            <Lin id={id('sk')} stops={[[0, '#fff'], [0.45, CLAY.base], [1, CLAY.deep]]} y2="0" x2="1" />
          </defs>
          <g data-part="body">
            <g data-part="shackle">
              <path d={SHACKLE} stroke={CLAY.deep} strokeWidth="12" />
              <path d={SHACKLE} stroke={url('sk')} strokeWidth="9" />
              <path d="M44.5 50 V40 C44.5 32 49 26 55 24" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g data-part="case">
              <rect x="28" y="50" width="64" height="50" rx="15" fill={TEAL.deep} />
              <rect x="28" y="46" width="64" height="50" rx="15" fill={url('f')} />
              <rect x="28" y="46" width="64" height="50" rx="15" fill={url('vol')} />
              <rect x="28.75" y="46.75" width="62.5" height="48.5" rx="14.25" stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
              <path d="M91 64 C91 80 89 90 78 95" stroke={TEAL.hi} strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
              <path d={KEY} transform="translate(0 1.6)" fill={TEAL.hi} opacity=".55" />
              <path data-part="keyhole" d={KEY} fill={TEAL.deep} />
            </g>
            <g data-part="shine">
              <path d="M35 62 C35 56 38 52 44 51" stroke="#fff" strokeOpacity=".8" strokeWidth="3.5" strokeLinecap="round" />
              <ellipse cx="35" cy="76" rx="2.6" ry="6" fill={url('gl')} opacity=".7" />
            </g>
          </g>
        </>
      )}
    />
  )
}

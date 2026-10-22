/**
 * HeadsetBadge3D — teal clay headset with dark cushions and a mic boom (24/7 support).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow     contact shadow — scale with svgOrigin '60 110'
 *   body       floating object — y float, rotation svgOrigin '60 60' (a "listening" head tilt)
 *   band       headband arc
 *   cup-left   viewer-left ear cup + cushion — squeeze with scaleX, svgOrigin '31 72'
 *   cup-right  viewer-right ear cup + cushion — squeeze with scaleX, svgOrigin '89 72'
 *   mic        boom + capsule (in front of cup-left) — nod with rotation, svgOrigin '30 84'
 *   shine      specular streak on the band + glint on the left cup
 */
import { Badge3D, CLAY, Lin, TEAL, clay } from './Badge3D.jsx'

const BAND = 'M31 64 V54 C31 36 44 22 60 22 C76 22 89 36 89 54 V64'

function Cup({ part, x, cushionX, url }) {
  return (
    <g data-part={part}>
      <rect x={cushionX} y="57" width="10" height="30" rx="5" fill={url('cu')} />
      <rect x={x} y="56" width="22" height="34" rx="11" fill={TEAL.deep} />
      <rect x={x} y="53" width="22" height="34" rx="11" fill={url('f')} />
      <rect x={x} y="53" width="22" height="34" rx="11" fill={url('vol')} />
      <rect x={x + 0.75} y="53.75" width="20.5" height="32.5" rx="10.25" stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
    </g>
  )
}

export default function HeadsetBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(TEAL)} />
            <Lin id={id('cu')} stops={[[0, '#56606C'], [0.5, '#2A3440'], [1, '#1A2028']]} y2="0" x2="1" />
            <Lin id={id('mc')} stops={[[0, '#fff'], [0.5, '#D1FAE5'], [1, '#8FDDBE']]} y2="0" x2="1" />
          </defs>
          <g data-part="body">
            <g data-part="band">
              <path d={BAND} transform="translate(0 3)" stroke={TEAL.deep} strokeWidth="10" strokeLinecap="round" />
              <path d={BAND} stroke={url('f')} strokeWidth="10" strokeLinecap="round" />
            </g>
            <Cup part="cup-left" x={20} cushionX={37} url={url} />
            <Cup part="cup-right" x={78} cushionX={73} url={url} />
            <g data-part="mic">
              <path d="M30 86 C32 96 41 100 52 99.5" stroke={TEAL.deep} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M30 86 C32 95 40 98.5 51 98" stroke={TEAL.base} strokeWidth="2.5" strokeLinecap="round" />
              <rect x="50" y="94.5" width="14" height="9" rx="4.5" fill={url('mc')} />
              <rect x="50.5" y="95" width="13" height="8" rx="4" stroke={TEAL.dark} strokeOpacity=".35" />
            </g>
            <path d="M98 64 C98 74 97 82 92 86" stroke={TEAL.hi} strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" />
            <g data-part="shine">
              <path d="M34 44 C37 34 44 27 53 24.5" stroke="#fff" strokeOpacity=".8" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="26" cy="66" rx="2.4" ry="6" fill={url('gl')} opacity=".75" />
            </g>
          </g>
        </>
      )}
    />
  )
}

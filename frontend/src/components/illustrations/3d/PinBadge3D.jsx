/**
 * PinBadge3D — info-blue clay map pin with a white core and a ground ripple ring (GPS / tracking).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow   contact shadow — scale with svgOrigin '60 110'
 *   ring     ground ripple around the landing spot (outside body, on the ground like the shadow) —
 *            pulse with `scale: 0.5 → 1.5, opacity: 0.6 → 0`, svgOrigin '60 110'
 *   body     floating pin — y float / drop-bounce, rotation svgOrigin '60 60'
 *   core     white sphere inside the pin head — pulse with scale, svgOrigin '60 46'
 *   shine    specular streak + glint on the pin head
 */
import { BLUE, Badge3D, CLAY, Lin, Rad, SHADOW_Y, clay } from './Badge3D.jsx'

const PIN = 'M60 98 C53 87 32 70 32 46 C32 30 44 18 60 18 C76 18 88 30 88 46 C88 70 67 87 60 98 Z'

export default function PinBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(BLUE)} />
            <Rad id={id('core')} stops={[[0, '#fff'], [0.6, CLAY.light], [1, CLAY.dark]]} cx=".35" cy=".3" r=".8" />
          </defs>
          <ellipse data-part="ring" cx="60" cy={SHADOW_Y} rx="22" ry="5.5" stroke={BLUE.base} strokeOpacity=".45" strokeWidth="2" />
          <g data-part="body">
            <path d={PIN} transform="translate(0 4)" fill={BLUE.deep} />
            <path d={PIN} fill={url('f')} />
            <path d={PIN} fill={url('vol')} />
            <path d={PIN} stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
            <path d="M86 52 C84 66 74 78 64 90" stroke={BLUE.hi} strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="60" cy="46" r="15" fill={BLUE.deep} opacity=".3" />
            <g data-part="core">
              <circle cx="60" cy="49" r="12" fill={BLUE.deep} opacity=".45" />
              <circle cx="60" cy="46" r="12" fill={url('core')} />
            </g>
            <g data-part="shine">
              <path d="M38 38 C40 30 46 24 54 21.5" stroke="#fff" strokeOpacity=".8" strokeWidth="3.5" strokeLinecap="round" />
              <ellipse cx="40" cy="54" rx="3" ry="7" fill={url('gl')} opacity=".7" />
            </g>
          </g>
        </>
      )}
    />
  )
}

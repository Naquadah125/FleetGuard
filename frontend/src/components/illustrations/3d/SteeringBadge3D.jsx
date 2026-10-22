/**
 * SteeringBadge3D — teal clay steering wheel with a white hub (driver / route).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow   contact shadow — scale with svgOrigin '60 110'
 *   body     floating object — y float, rotation svgOrigin '60 60'
 *   wheel    rim + spokes + hub — steer with rotation, svgOrigin '60 56'. The extruded rim side
 *            is a circle drawn outside `wheel`, so it stays correct at any angle.
 *   hub      white centre cap with a teal chevron — press with scale, svgOrigin '60 56'
 *   shine    static rim highlight (outside `wheel`, so the light does not turn with the wheel)
 */
import { Badge3D, CLAY, Lin, Rad, TEAL, clay } from './Badge3D.jsx'

const RING = 'M22 56 a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0 Z M35 56 a25 25 0 1 1 50 0 a25 25 0 1 1 -50 0 Z'

export default function SteeringBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(TEAL)} />
            <Lin id={id('sp')} stops={[[0, TEAL.light], [1, TEAL.dark]]} x2="0" />
            <Rad id={id('hub')} stops={[[0, '#fff'], [0.6, CLAY.light], [1, CLAY.dark]]} cx=".35" cy=".3" r=".8" />
          </defs>
          <g data-part="body">
            <path d={RING} transform="translate(0 5)" fill={TEAL.deep} fillRule="evenodd" />
            <g data-part="wheel">
              <g fill={TEAL.deep} opacity=".55">
                <rect x="34" y="54" width="52" height="9" rx="4.5" />
                <rect x="55.5" y="62" width="9" height="26" rx="4.5" />
              </g>
              <g fill={url('sp')}>
                <rect x="34" y="51.5" width="52" height="9" rx="4.5" />
                <rect x="55.5" y="58" width="9" height="27" rx="4.5" />
              </g>
              <path d={RING} fill={url('f')} fillRule="evenodd" />
              <path d={RING} fill={url('vol')} fillRule="evenodd" />
              <circle cx="60" cy="56" r="37.25" stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
              <circle cx="60" cy="56" r="25.75" stroke={TEAL.deep} strokeOpacity=".35" strokeWidth="1.5" />
              <g data-part="hub">
                <circle cx="60" cy="59" r="12" fill={TEAL.deep} opacity=".55" />
                <circle cx="60" cy="56" r="12" fill={url('hub')} />
                <circle cx="60" cy="56" r="11.4" stroke="#fff" strokeWidth="1.2" />
                <path d="M54.5 55 L60 58.5 L65.5 55" stroke={TEAL.base} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
            <path d="M93 64 A34 34 0 0 1 72 89" stroke={TEAL.hi} strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" />
            <g data-part="shine">
              <path d="M28 46 A33 33 0 0 1 47 25" stroke="#fff" strokeOpacity=".8" strokeWidth="3.5" strokeLinecap="round" />
              <ellipse cx="27" cy="60" rx="2.6" ry="6" fill={url('gl')} opacity=".7" />
            </g>
          </g>
        </>
      )}
    />
  )
}

/**
 * CameraBadge3D — white clay dashcam with an info-blue lens and a red REC dot (AI camera).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow   contact shadow — scale with svgOrigin '60 110'
 *   body     floating object — y float, rotation svgOrigin '60 60'
 *   mount    windshield mount plate + stem on top
 *   lens     lens assembly (blue bezel, glass, iris, glint) — slow "focus" with scale or rotation,
 *            svgOrigin '52 60'
 *   iris     inner blue iris — focus pulse with scale, svgOrigin '52 60'
 *   rec      red recording dot + halo — blink with opacity (no origin needed)
 *   shine    specular streak + glint on the housing
 */
import { BLUE, Badge3D, CLAY, Lin, RED, Rad, clay } from './Badge3D.jsx'

export default function CameraBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      shadowRx={34}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(CLAY)} />
            <Lin id={id('m')} stops={[[0, '#5B6573'], [1, '#2A313A']]} x2="0" />
            <Lin id={id('ring')} stops={clay(BLUE)} />
            <Rad id={id('glass')} stops={[[0, '#2A4A6B'], [0.7, '#132A40'], [1, '#0B1826']]} cx=".4" cy=".35" r=".75" />
            <Rad id={id('iris')} stops={[[0, BLUE.hi], [0.45, BLUE.base], [1, '#0F2E66']]} cx=".4" cy=".35" r=".7" />
          </defs>
          <g data-part="body">
            <g data-part="mount">
              <rect x="53" y="22" width="14" height="16" rx="3" fill={url('m')} />
              <rect x="38" y="16" width="44" height="9" rx="4.5" fill={url('m')} />
              <path d="M42 18.5 H64" stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
            </g>
            <rect x="20" y="39" width="80" height="52" rx="18" fill={CLAY.deep} />
            <rect x="20" y="34" width="80" height="52" rx="18" fill={url('f')} />
            <rect x="20" y="34" width="80" height="52" rx="18" fill={url('vol')} />
            <rect x="20.75" y="34.75" width="78.5" height="50.5" rx="17.25" stroke="#fff" strokeWidth="1.5" />
            <path d="M98 58 C98 72 94 82 82 85" stroke={CLAY.deep} strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
            <g data-part="lens">
              <circle cx="52" cy="63" r="20.5" fill={CLAY.deep} opacity=".55" />
              <circle cx="52" cy="60" r="20.5" fill={url('ring')} />
              <circle cx="52" cy="60" r="20.5" fill={url('vol')} />
              <circle cx="52" cy="60" r="20" stroke="#fff" strokeOpacity=".45" />
              <circle cx="52" cy="60" r="14" fill={url('glass')} />
              <circle data-part="iris" cx="52" cy="60" r="7" fill={url('iris')} />
              <circle cx="52" cy="60" r="2.6" fill="#0B1826" />
              <ellipse cx="46.5" cy="54" rx="4.6" ry="2.8" fill="#fff" opacity=".85" transform="rotate(-38 46.5 54)" />
              <circle cx="58" cy="66" r="1.6" fill="#fff" opacity=".5" />
            </g>
            <g data-part="rec">
              <circle cx="85" cy="47" r="7" fill={RED.base} opacity=".18" />
              <circle cx="85" cy="47" r="4.2" fill={RED.base} />
              <circle cx="83.8" cy="45.8" r="1.3" fill="#fff" opacity=".8" />
            </g>
            <g stroke={CLAY.dark} strokeWidth="3" strokeLinecap="round">
              <path d="M79 61 H91 M79 68 H91 M79 75 H91" />
            </g>
            <g data-part="shine">
              <path d="M27 54 C28 46 32 41 39 39" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
              <ellipse cx="29" cy="68" rx="2.6" ry="6" fill={url('gl')} />
            </g>
          </g>
        </>
      )}
    />
  )
}

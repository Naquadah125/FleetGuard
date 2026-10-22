/**
 * BellBadge3D — teal clay bell with a red alert dot (real-time alerts).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow   contact shadow — scale with svgOrigin '60 110'
 *   body     floating object — y float, rotation svgOrigin '60 60'
 *   bell     bell + knob + clapper — ring/swing with rotation, svgOrigin '60 20' (the knob)
 *   clapper  inside bell — counter-swing, svgOrigin '60 82'
 *   dot      red alert dot (outside `bell`, so it stays put while the bell rings) —
 *            pulse with scale, svgOrigin '85 31'
 *   shine    specular streak + glint on the bell's lit shoulder
 */
import { Badge3D, Lin, RED, Rad, TEAL, clay } from './Badge3D.jsx'

const BELL = 'M60 25 C45 25 36 37 36 52 V65 C36 71 32 75 28 78 C26 80 27 84 31 84 H89 C93 84 94 80 92 78 C88 75 84 71 84 65 V52 C84 37 75 25 60 25 Z'

export default function BellBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(TEAL)} />
            <Lin id={id('lip')} stops={[[0, TEAL.light], [0.5, TEAL.base], [1, TEAL.dark]]} y2="0" x2="1" />
            <Rad id={id('cl')} stops={[[0, '#FDE68A'], [0.6, '#F59E0B'], [1, '#C77A06']]} cx=".35" cy=".3" r=".75" />
            <Rad id={id('dot')} stops={[[0, RED.hi], [0.45, RED.base], [1, RED.dark]]} cx=".35" cy=".3" r=".8" />
          </defs>
          <g data-part="body">
            <g data-part="bell">
              <g data-part="clapper">
                <circle cx="60" cy="89" r="7.5" fill={url('cl')} />
                <circle cx="57.5" cy="86.5" r="2" fill="#fff" opacity=".7" />
              </g>
              <circle cx="60" cy="21" r="5.5" fill={url('f')} />
              <circle cx="60" cy="21" r="5" stroke="#fff" strokeOpacity=".45" />
              <path d={BELL} transform="translate(0 4)" fill={TEAL.deep} />
              <path d={BELL} fill={url('f')} />
              <path d={BELL} fill={url('vol')} />
              <path d={BELL} stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
              <path d="M82 50 C83 58 83 66 85 71" stroke={TEAL.hi} strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
              <rect x="25" y="81" width="70" height="10" rx="5" fill={TEAL.deep} />
              <rect x="25" y="78" width="70" height="10" rx="5" fill={url('lip')} />
              <path d="M30 80.5 H70" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
              <g data-part="shine">
                <path d="M43 44 C44 36 49 30 56 28.5" stroke="#fff" strokeOpacity=".8" strokeWidth="3.5" strokeLinecap="round" />
                <ellipse cx="42" cy="58" rx="3.2" ry="8" fill={url('gl')} opacity=".7" />
              </g>
            </g>
            <g data-part="dot">
              <circle cx="85" cy="33" r="11.5" fill={RED.deep} opacity=".35" />
              <circle cx="85" cy="31" r="11.5" fill="#fff" />
              <circle cx="85" cy="31" r="8.5" fill={url('dot')} />
              <ellipse cx="82" cy="28" rx="3" ry="2" fill="#fff" opacity=".75" />
            </g>
          </g>
        </>
      )}
    />
  )
}

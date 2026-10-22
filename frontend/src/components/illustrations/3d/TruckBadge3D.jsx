/**
 * TruckBadge3D — chunky mini truck: white clay cargo box, teal cab, faces right (fleet).
 * Shared contract (viewBox 0 0 120 120, pivots in viewBox units): see Badge3D.jsx.
 *
 * data-part hooks:
 *   shadow       contact shadow (wider, rx 42) — scale with svgOrigin '60 110'
 *   body         the whole truck — y float / bob, rotation svgOrigin '60 60'
 *   chassis      cargo box + cab + bumper (everything sprung) — suspension bob with small `y`
 *   cargo        white cargo box with the FleetGuard chevron + stripes
 *   cab          teal cab, window, headlight
 *   wheel-back   rear wheel  — spin with rotation, svgOrigin '36 88'
 *   wheel-front  front wheel — spin with rotation, svgOrigin '87 88'
 *   shine        streaks on the cargo box and cab roof
 */
import { Badge3D, CLAY, Lin, TEAL, clay } from './Badge3D.jsx'

const CAB = 'M72 46 H86 C91 46 94 49 96 54 L101 67 V79 C101 81 99 83 97 83 H72 Z'

function Wheel({ part, cx }) {
  return (
    <g data-part={part}>
      <circle cx={cx} cy="88" r="11" fill="#1E2227" />
      <circle cx={cx} cy="88" r="10" stroke="#4B535D" strokeWidth="1.5" />
      <circle cx={cx} cy="88" r="5" fill={CLAY.base} />
      <circle cx={cx - 1} cy="87" r="3" fill="#fff" opacity=".6" />
      <g fill={CLAY.deep}>
        <circle cx={cx} cy="85" r="1.1" />
        <circle cx={cx + 2.6} cy="89.5" r="1.1" />
        <circle cx={cx - 2.6} cy="89.5" r="1.1" />
      </g>
    </g>
  )
}

export default function TruckBadge3D({ className, title, ...props }) {
  return (
    <Badge3D
      className={className}
      title={title}
      shadowRx={42}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Lin id={id('f')} stops={clay(TEAL)} />
            <Lin id={id('box')} stops={clay(CLAY)} />
            <Lin id={id('win')} stops={[[0, '#E6F1FF'], [1, '#8DB9F5']]} />
          </defs>
          <g data-part="body">
            <g data-part="chassis">
              <rect x="16" y="78" width="88" height="9" rx="4.5" fill="#2A3440" />
              <g data-part="cargo">
                <rect x="17" y="35" width="56" height="48" rx="10" fill={CLAY.deep} />
                <rect x="16" y="32" width="55" height="47" rx="10" fill={url('box')} />
                <rect x="16.75" y="32.75" width="53.5" height="45.5" rx="9.25" stroke="#fff" strokeWidth="1.5" />
                <path d="M24 46 L30 50 L36 46 V52 L30 56 L24 52 Z M24 56 L30 60 L36 56 V62 L30 66 L24 62 Z" fill={url('f')} />
                <rect x="40" y="50" width="24" height="6" rx="3" fill={url('f')} />
                <rect x="40" y="60" width="16" height="4" rx="2" fill={TEAL.light} opacity=".6" />
                <path d="M69 46 V70" stroke={CLAY.deep} strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
              </g>
              <g data-part="cab">
                <path d={CAB} transform="translate(1 3)" fill={TEAL.deep} />
                <path d={CAB} fill={url('f')} />
                <path d={CAB} fill={url('vol')} />
                <path d={CAB} stroke="#fff" strokeOpacity=".4" strokeWidth="1.5" />
                <path d="M77 52 H86 C88 52 89.5 53.5 90.5 56 L93.5 64 H77 Z" fill={url('win')} />
                <path d="M80 54.5 L84 54.5 L80 61" fill="#fff" opacity=".6" />
                <rect x="96" y="70" width="5" height="5" rx="2" fill="#FDE68A" />
              </g>
              <rect x="94" y="77" width="11" height="7" rx="3.5" fill={CLAY.dark} />
            </g>
            <circle cx="36" cy="86" r="13" fill="#2A3440" />
            <circle cx="87" cy="86" r="13" fill="#2A3440" />
            <Wheel part="wheel-back" cx={36} />
            <Wheel part="wheel-front" cx={87} />
            <g data-part="shine">
              <path d="M22 50 C22 43 25 39 31 38" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M75 49 H84" stroke="#fff" strokeOpacity=".75" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </g>
        </>
      )}
    />
  )
}

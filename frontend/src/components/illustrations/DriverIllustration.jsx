import { useId } from 'react'

/**
 * DriverIllustration — one layered, animatable SVG of the FleetGuard driver
 * in 4 states. All variant layers are always mounted; `state` only switches
 * which ones are visible (CSS keyed on the root `data-state`), so a parent can
 * change state / crossfade with GSAP without remounting.
 *
 * Props
 *  - state: 'normal' | 'drowsy' | 'fatigued' | 'distracted' (default 'normal')
 *  - className, title (overrides the Vietnamese default <title>)
 *  - transition: boolean (default true). Built-in CSS crossfade (opacity) and
 *    pose easing (head tilt, pupils, brows). Pass `false` when GSAP drives the
 *    variant opacity / poses itself, so CSS transitions don't fight the tweens.
 *
 * data-part map (all inside the root <svg>, query with `[data-part="..."]`)
 *  root                 the <svg>; carries data-state
 *  bg                   window background group (sky, hills, road)
 *    bg-sky, bg-clouds (cloud-1..3), bg-hills, bg-road (incl. roadside dots)
 *  seat                 seat back + headrest
 *  torso                shirt, collar, neck, sleeves (static body)
 *  head-pose            CSS-posed wrapper (tilt per state). Don't tween it.
 *    head               GSAP target for idle nod/breath. Rotate around the neck:
 *                       svgOrigin "160 145" (viewBox units; what driverMotion.js uses).
 *      hair-back        crown volume behind the main hair (static)
 *      hair, face, ears, brows (brow-left, brow-right), nose
 *        hair-strands   inside hair: crown tufts, fringe clumps, gloss + strand lines
 *      eyes-open        normal + distracted
 *        pupils-pose    CSS-posed (look-down in distracted). Don't tween it.
 *          pupils       GSAP target for glances (x/y a few units)
 *        eyelids        blink lids, rest at scaleY≈0 from their top edge.
 *                       Blink: gsap.to('[data-part=eyelids] > g', { scaleY: 1,
 *                       transformOrigin: '50% 0%', duration: .08, yoyo: true,
 *                       repeat: 1 })
 *      eyes-closed      drowsy
 *      eyes-squint      fatigued (incl. tear)
 *      mouth-smile      normal + distracted
 *      mouth-relaxed    drowsy
 *      mouth-yawn       fatigued (mouth-yawn-inner = tongue/teeth group)
 *      phone-light      distracted: phone glow cast on the face
 *  wheel                steering wheel (rim + hub)
 *  hand-left            viewer-left forearm + fist on the wheel (all states)
 *  hand-right-wheel     viewer-right forearm + fist on the wheel (normal, drowsy)
 *  sleeve-right-raised  re-posed right sleeve (upper arm angled in, hem tilted toward the bent
 *                       elbow); covers the static torso sleeve (fatigued + distracted). Static.
 *  hand-right-cheek     raised forearm + open hand at the cheek (fatigued). Elbow at ≈(242 210):
 *                       rub with rotation, svgOrigin "242 206".
 *  hand-right-phone     forearm + hand holding the phone (distracted)
 *    phone, phone-glow
 *  zzz                  drowsy; zzz-1 (big navy), zzz-2 (small navy), zzz-3 (teal)
 *
 * Variant groups carry `data-v="<states…>"`; visibility = opacity via CSS.
 */

export const DRIVER_STATES = ['normal', 'drowsy', 'fatigued', 'distracted']

const TITLES = {
  normal: 'Tài xế tập trung lái xe',
  drowsy: 'Tài xế có dấu hiệu buồn ngủ',
  fatigued: 'Tài xế mệt mỏi đang ngáp',
  distracted: 'Tài xế mất tập trung dùng điện thoại',
}

const C = {
  skinHi: '#FCDCBE',
  skin: '#F6C49C',
  skinMid: '#EDB088',
  skinShade: '#D99367',
  skinLine: '#B4704C',
  hair: '#16181D',
  hairMid: '#272B33',
  hairHi: '#505866',
  shirtHi: '#4CCB6E',
  shirt: '#25A84D',
  shirtDark: '#178038',
  shirtDeep: '#0F5F29',
  seatHi: '#59616C',
  seat: '#3A4049',
  seatDark: '#24282E',
  wheel: '#1E2227',
  wheelHi: '#4B535D',
  navy: '#0D2232',
  teal: '#0E9B78',
  lip: '#A14A3A',
  mouth: '#5B1D1F',
  iris: '#3B2416',
}

function styles(uid, transition) {
  const t = transition
  const s = `#${uid}`
  return `
${s} [data-v]{opacity:0;${t ? 'transition:opacity .35s ease;' : ''}}
${DRIVER_STATES.map((k) => `${s}[data-state="${k}"] [data-v~="${k}"]`).join(',')}{opacity:1}
${s} [data-part="head-pose"]{transform-box:view-box;transform-origin:160px 150px;${t ? 'transition:transform .5s cubic-bezier(.3,.7,.3,1);' : ''}}
${s}[data-state="drowsy"] [data-part="head-pose"]{transform:translate(-2px,3px) rotate(-10deg)}
${s}[data-state="fatigued"] [data-part="head-pose"]{transform:rotate(4deg)}
${s}[data-state="distracted"] [data-part="head-pose"]{transform:translate(2px,3px) rotate(3deg)}
${s} [data-part="pupils-pose"]{${t ? 'transition:transform .4s ease;' : ''}}
${s}[data-state="distracted"] [data-part="pupils-pose"]{transform:translate(1.6px,3px)}
${s} [data-part^="brow-"]{transform-box:fill-box;transform-origin:50% 50%;${t ? 'transition:transform .4s ease;' : ''}}
${s}[data-state="drowsy"] [data-part="brow-left"]{transform:translateY(2px) rotate(4deg)}
${s}[data-state="drowsy"] [data-part="brow-right"]{transform:translateY(2px) rotate(-4deg)}
${s}[data-state="fatigued"] [data-part="brow-left"]{transform:translateY(-1px) rotate(-9deg)}
${s}[data-state="fatigued"] [data-part="brow-right"]{transform:translateY(-1px) rotate(9deg)}
${s}[data-state="distracted"] [data-part="brow-left"],${s}[data-state="distracted"] [data-part="brow-right"]{transform:translateY(1.5px)}
`
}

/* Fist gripping the rim. Local frame: rim runs along +x through the origin,
   +y points toward the wheel centre. Rotate/mirror via the parent transform. */
function Fist({ u }) {
  return (
    <g>
      {/* hand mass wrapped around the rim */}
      <path
        d="M-14 -3 C-15 -12 -8 -16 0 -16 C8 -16 14 -12 15 -4 C16 4 13 11 6 13 C0 14.5 -8 13.6 -12 9 C-14 6 -14 2 -14 -3 Z"
        fill={u('fist')}
      />
      {/* finger creases across the rim */}
      <g fill="none" stroke={C.skinShade} strokeWidth="1.2" strokeLinecap="round">
        <path d="M-7.4 -2 C-8 3 -7.6 7 -6 11" />
        <path d="M-1.6 -2.6 C-2 3 -1.6 8 -0.6 12.6" />
        <path d="M4.2 -2.4 C4.4 3 4.8 7 6 11.6" />
      </g>
      <g fill="#fff" opacity=".35">
        <ellipse cx="-10.4" cy="1" rx="1.6" ry="3.4" />
        <ellipse cx="-4.6" cy="1.6" rx="1.6" ry="3.8" />
        <ellipse cx="1.2" cy="1.8" rx="1.6" ry="3.8" />
      </g>
      {/* thumb on top of the rim, pointing along it */}
      <path d="M2 -14 C9 -17.5 17 -15 19.6 -10 C21 -7 19 -4.6 16 -5.4 C12 -6.6 7 -8 3 -8.6 Z" fill={u('fist')} />
      <path d="M3 -8.6 C7 -8 12 -6.6 16 -5.4" stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Z({ x, y, s, color, part }) {
  return (
    <g data-part={part} transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M-5 -6 H5 L-5 6 H5"
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

/* Blink lid: covers the eye, scale origin = its top edge (cy - 9). Rests at
   scaleY 0.001 encoded as a matrix so GSAP can tween scaleY -> 1. */
function Lid({ cx, cy, u }) {
  const top = cy - 9
  const s = 0.001
  return (
    <g transform={`matrix(1 0 0 ${s} 0 ${(top * (1 - s)).toFixed(3)})`}>
      <path
        d={`M${cx - 8} ${top} H${cx + 8} V${cy + 2} Q${cx} ${cy + 9} ${cx - 8} ${cy + 2} Z`}
        fill={u('skinFace')}
      />
      <path
        d={`M${cx - 7.5} ${cy + 2.4} Q${cx} ${cy + 8.6} ${cx + 7.5} ${cy + 2.4}`}
        stroke="#2A1A12"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

function OpenEye({ cx, cy, u }) {
  return <ellipse cx={cx} cy={cy} rx="6.4" ry="7.4" fill={u('eyeWhite')} />
}

export default function DriverIllustration({ state = 'normal', className, title, transition = true }) {
  const uid = `drv${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const u = (n) => `url(#${uid}-${n})`
  const current = DRIVER_STATES.includes(state) ? state : 'normal'
  const label = title ?? TITLES[current]

  const eyeL = { cx: 145, cy: 90 }
  const eyeR = { cx: 175, cy: 90 }

  return (
    <svg
      id={uid}
      data-part="root"
      data-state={current}
      className={className}
      viewBox="0 0 320 260"
      width="100%"
      role="img"
      aria-labelledby={id('title')}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', height: 'auto' }}
    >
      <title id={id('title')}>{label}</title>
      <style>{styles(uid, transition)}</style>
      <defs>
        <clipPath id={id('win')}>
          <path d="M44 7 C110 3 210 3 276 7 C302 9 313 24 314 52 C315.5 110 315.5 160 314 214 C313 242 300 254 272 256 C200 259 120 259 48 256 C20 254 7 242 6 214 C4.5 160 4.5 110 6 52 C7 24 18 9 44 7 Z" />
        </clipPath>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9D5EC" />
          <stop offset=".55" stopColor="#DCEAF5" />
          <stop offset="1" stopColor="#F1F6FA" />
        </linearGradient>
        <linearGradient id={id('hillFar')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B7C4D0" />
          <stop offset="1" stopColor="#D6DEE6" />
        </linearGradient>
        <linearGradient id={id('hill')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7F8C99" />
          <stop offset="1" stopColor="#AEB8C2" />
        </linearGradient>
        <linearGradient id={id('road')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C3CAD2" />
          <stop offset="1" stopColor="#8F99A4" />
        </linearGradient>
        <radialGradient id={id('haze')} cx=".5" cy=".45" r=".62">
          <stop offset=".72" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".55" />
        </radialGradient>
        <linearGradient id={id('seat')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.seatHi} />
          <stop offset=".45" stopColor={C.seat} />
          <stop offset="1" stopColor={C.seatDark} />
        </linearGradient>
        <radialGradient id={id('headrest')} cx=".38" cy=".25" r=".85">
          <stop offset="0" stopColor="#5E6671" />
          <stop offset=".5" stopColor={C.seat} />
          <stop offset="1" stopColor={C.seatDark} />
        </radialGradient>
        <linearGradient id={id('shirt')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.shirtHi} />
          <stop offset=".35" stopColor={C.shirt} />
          <stop offset="1" stopColor={C.shirtDark} />
        </linearGradient>
        <linearGradient id={id('sleeve')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.shirtHi} />
          <stop offset=".55" stopColor={C.shirt} />
          <stop offset="1" stopColor={C.shirtDark} />
        </linearGradient>
        <linearGradient id={id('shirtSide')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.shirtDeep} stopOpacity=".55" />
          <stop offset=".2" stopColor={C.shirtDeep} stopOpacity="0" />
          <stop offset=".8" stopColor={C.shirtDeep} stopOpacity="0" />
          <stop offset="1" stopColor={C.shirtDeep} stopOpacity=".6" />
        </linearGradient>
        <radialGradient id={id('skinFace')} gradientUnits="userSpaceOnUse" cx="150" cy="78" r="66">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".55" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinMid} />
        </radialGradient>
        <linearGradient id={id('skinBody')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".6" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinMid} />
        </linearGradient>
        <linearGradient id={id('fist')} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".5" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinShade} />
        </linearGradient>
        <linearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.skinShade} />
          <stop offset=".55" stopColor={C.skinMid} />
          <stop offset="1" stopColor={C.skin} />
        </linearGradient>
        <radialGradient id={id('hair')} cx=".35" cy=".2" r=".9">
          <stop offset="0" stopColor="#3A404B" />
          <stop offset=".45" stopColor={C.hairMid} />
          <stop offset="1" stopColor={C.hair} />
        </radialGradient>
        <radialGradient id={id('eyeWhite')} cx=".5" cy=".65" r=".6">
          <stop offset=".6" stopColor="#fff" />
          <stop offset="1" stopColor="#E3E8EE" />
        </radialGradient>
        <radialGradient id={id('iris')} cx=".5" cy=".7" r=".6">
          <stop offset="0" stopColor="#7A5034" />
          <stop offset="1" stopColor={C.iris} />
        </radialGradient>
        <radialGradient id={id('blush')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#F08A7A" stopOpacity=".45" />
          <stop offset="1" stopColor="#F08A7A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('wheel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B424B" />
          <stop offset=".35" stopColor={C.wheel} />
          <stop offset="1" stopColor="#111316" />
        </linearGradient>
        <radialGradient id={id('glow')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#CFFAF0" stopOpacity=".95" />
          <stop offset=".45" stopColor="#7FE3CB" stopOpacity=".45" />
          <stop offset="1" stopColor="#7FE3CB" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id('faceClip')}>
          <path d="M160 34 C184 34 198 52 198 80 C198 104 190 124 176 134 C168 140 152 140 144 134 C130 124 122 104 122 80 C122 52 136 34 160 34 Z" />
        </clipPath>
        <clipPath id={id('torsoClip')}>
          <path d="M102 162 C118 153 136 149 148 147 L172 147 C184 149 202 153 218 162 C226 182 228 214 230 262 L90 262 C92 214 94 182 102 162 Z" />
        </clipPath>
        <clipPath id={id('eyesClip')}>
          <ellipse cx="145" cy="90" rx="6.4" ry="7.4" />
          <ellipse cx="175" cy="90" rx="6.4" ry="7.4" />
        </clipPath>
        <clipPath id={id('yawnClip')}>
          <ellipse cx="160" cy="123" rx="8.6" ry="11.2" />
        </clipPath>
        <filter id={id('soft')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      <g clipPath={u('win')}>
        {/* ───────── background ───────── */}
        <g data-part="bg">
          <rect data-part="bg-sky" x="0" y="0" width="320" height="260" fill={u('sky')} />
          <g data-part="bg-clouds" fill="#fff">
            <g data-part="cloud-1">
              <path d="M30 54 C24 54 22 46 28 44 C28 36 38 33 43 38 C46 28 62 27 66 37 C74 35 80 42 77 48 C82 50 80 56 74 56 Z" />
              <path d="M30 54 H74 C80 56 76 58 70 58 H34 C28 58 26 56 30 54 Z" fill="#E1EAF3" />
            </g>
            <g data-part="cloud-2">
              <path d="M240 78 C233 78 231 70 238 68 C238 59 249 55 255 61 C259 49 278 48 282 60 C291 58 298 66 294 72 C300 74 298 80 291 80 Z" />
              <path d="M240 78 H291 C298 80 293 82 287 82 H244 C237 82 236 80 240 78 Z" fill="#E1EAF3" />
            </g>
            <g data-part="cloud-3" opacity=".85">
              <path d="M226 30 C221 30 220 25 225 24 C226 18 233 16 237 20 C240 14 250 14 252 21 C257 21 260 26 256 30 Z" />
            </g>
          </g>
          <g data-part="bg-hills">
            <path d="M0 162 C30 146 52 150 74 158 C110 150 210 150 246 158 C268 148 296 144 320 156 V200 H0 Z" fill={u('hillFar')} />
            <path d="M0 150 C14 128 30 118 44 124 C58 130 70 150 92 176 L92 210 H0 Z" fill={u('hill')} />
            <path d="M320 146 C304 124 288 116 274 122 C258 130 248 152 228 176 L228 210 H320 Z" fill={u('hill')} />
            <path d="M18 140 C28 128 36 124 44 126 C38 132 30 140 26 152 Z" fill="#fff" opacity=".22" />
            <path d="M302 136 C292 124 284 120 276 124 C282 130 290 138 294 150 Z" fill="#fff" opacity=".22" />
            <g fill="#9AAEA5" opacity=".8">
              <ellipse cx="18" cy="182" rx="14" ry="6" />
              <ellipse cx="44" cy="186" rx="12" ry="5" />
              <ellipse cx="300" cy="182" rx="15" ry="6" />
              <ellipse cx="274" cy="186" rx="11" ry="5" />
            </g>
          </g>
          <g data-part="bg-road">
            <path d="M0 188 C60 186 100 186 160 186 C220 186 260 186 320 188 V260 H0 Z" fill={u('road')} />
            <path d="M0 192 C30 189 60 188 96 188 L0 214 Z" fill="#D7B85A" opacity=".55" />
            <path d="M320 192 C290 189 260 188 224 188 L320 214 Z" fill="#D7B85A" opacity=".55" />
            <g fill="#F2C94C">
              <circle cx="10" cy="198" r="2.2" />
              <circle cx="24" cy="194" r="1.8" />
              <circle cx="38" cy="192" r="1.6" />
              <circle cx="16" cy="205" r="1.6" />
              <circle cx="52" cy="191" r="1.3" />
              <circle cx="310" cy="198" r="2.2" />
              <circle cx="296" cy="194" r="1.8" />
              <circle cx="282" cy="192" r="1.6" />
              <circle cx="304" cy="205" r="1.6" />
              <circle cx="268" cy="191" r="1.3" />
            </g>
            <path d="M0 236 L60 214 M320 236 L260 214" stroke="#fff" strokeWidth="2" opacity=".55" />
          </g>
        </g>

        {/* ───────── seat ───────── */}
        <g data-part="seat">
          <path d="M74 262 L80 152 C82 130 98 118 120 116 L200 116 C222 118 238 130 240 152 L246 262 Z" fill={u('seat')} />
          <path d="M80 152 C82 132 94 122 108 119 C100 132 96 150 96 170 L94 262 H74 Z" fill="#fff" opacity=".07" />
          <path d="M240 152 C238 132 226 122 212 119 C220 132 224 150 224 170 L226 262 H246 Z" fill="#000" opacity=".18" />
          <rect x="110" y="44" width="100" height="86" rx="32" fill={u('headrest')} />
          <rect x="116" y="50" width="88" height="74" rx="27" fill="none" stroke="#fff" strokeOpacity=".12" strokeDasharray="2 2.5" />
          <path d="M120 60 C128 50 142 47 156 47" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* ───────── torso ───────── */}
        <g data-part="torso">
          <path d="M147 120 L147 152 Q160 162 173 152 L173 120 Z" fill={u('neck')} />
          <ellipse cx="160" cy="140" rx="13" ry="5" fill={C.skinLine} opacity=".3" filter={u('soft')} />
          <path d="M102 162 C118 153 136 149 148 147 L172 147 C184 149 202 153 218 162 C226 182 228 214 230 262 L90 262 C92 214 94 182 102 162 Z" fill={u('shirt')} />
          <g clipPath={u('torsoClip')}>
            <rect x="60" y="140" width="200" height="130" fill={u('shirtSide')} />
            <ellipse cx="124" cy="182" rx="24" ry="16" fill="#fff" opacity=".12" filter={u('soft')} />
            <path d="M120 214 C132 222 146 226 158 226 M178 208 C190 214 200 222 206 232" stroke={C.shirtDeep} strokeOpacity=".35" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* soft shadow cast by the wheel */}
            <path d="M70 230 C100 196 130 186 160 186 C190 186 220 196 250 230 L250 262 H70 Z" fill={C.shirtDeep} opacity=".18" filter={u('soft')} />
          </g>
          {/* neckline */}
          <path d="M146 146 L160 167 L174 146 Z" fill={C.skinMid} />
          <path d="M150 146 L160 160 L170 146 Z" fill={C.skinShade} opacity=".5" />
          {/* placket */}
          <path d="M155.5 161 H164.5 V196 Q160 198 155.5 196 Z" fill={C.shirtDark} />
          <path d="M155.5 161 V196" stroke={C.shirtDeep} strokeWidth=".8" opacity=".6" />
          <circle cx="160" cy="173" r="1.7" fill="#E8F5EC" />
          <circle cx="160" cy="185" r="1.7" fill="#E8F5EC" />
          {/* collar */}
          <path d="M143 145 Q160 139 177 145 L176 149 Q160 144 144 149 Z" fill={C.shirtDark} />
          <path d="M144 145 C140 150 136 156 132 163 L151 171 L160 163 Z" fill={C.shirt} />
          <path d="M176 145 C180 150 184 156 188 163 L169 171 L160 163 Z" fill={C.shirt} />
          <path d="M144 145 C140 150 136 156 132 163 L151 171" stroke={C.shirtDeep} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <path d="M176 145 C180 150 184 156 188 163 L169 171" stroke={C.shirtDeep} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <path d="M140 152 L136 160" stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M151 171 L160 163 L169 171" fill="none" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" />
          {/* sleeves */}
          {[1, -1].map((m) => (
            <g key={m} transform={m === 1 ? undefined : 'matrix(-1 0 0 1 320 0)'}>
              <path d="M104 178 C98 186 93 195 91 204" stroke={C.shirtDeep} strokeOpacity=".45" strokeWidth="4" fill="none" filter={u('soft')} />
              <path d="M110 157 C90 156 74 166 66 184 L60 198 L90 203 C92 194 96 186 102 178 C106 172 108 166 110 160 Z" fill={u('sleeve')} />
              <path d="M110 157 C90 156 74 166 66 184 L60 198 M90 203 C92 194 96 186 102 178" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" fill="none" />
              <path d="M60 198 L90 203 L89 208 L59 203 Z" fill={C.shirtDark} />
              <path d="M102 160 C88 162 78 170 72 182" stroke="#fff" strokeOpacity=".28" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>

        {/* ───────── head ───────── */}
        <g data-part="head-pose">
          <g transform="matrix(1.05 0 0 1.05 -8 -0.5)">
          <g data-part="head">
            <path data-part="hair-back" d="M124 58 C120 44 126 30 140 22 C156 13 178 12 192 20 C204 27 210 40 208 58 Z" fill={u('hair')} />
            <g data-part="ears">
              <ellipse cx="122" cy="92" rx="7.5" ry="11" fill={C.skinMid} />
              <ellipse cx="123" cy="92" rx="4" ry="7" fill={C.skinShade} opacity=".55" />
              <ellipse cx="198" cy="92" rx="7.5" ry="11" fill={C.skinMid} />
              <ellipse cx="197" cy="92" rx="4" ry="7" fill={C.skinShade} opacity=".55" />
            </g>
            <g data-part="face">
              <path d="M160 34 C184 34 198 52 198 80 C198 104 190 124 176 134 C168 140 152 140 144 134 C130 124 122 104 122 80 C122 52 136 34 160 34 Z" fill={u('skinFace')} />
              <g clipPath={u('faceClip')}>
                <path d="M186 60 C200 80 198 112 176 136 L200 140 L204 60 Z" fill={C.skinShade} opacity=".35" filter={u('soft')} />
                <ellipse cx="160" cy="62" rx="40" ry="8" fill={C.skinShade} opacity=".35" filter={u('soft')} />
                <ellipse cx="138" cy="106" rx="8" ry="5" fill={u('blush')} />
                <ellipse cx="182" cy="106" rx="8" ry="5" fill={u('blush')} />
                <ellipse cx="141" cy="78" rx="8" ry="5" fill="#fff" opacity=".22" filter={u('soft')} />
                {/* jaw + chin shading, cheekbone light */}
                <path d="M121 94 C123 113 133 128 149 138 L128 142 L114 108 Z" fill={C.skinShade} opacity=".3" filter={u('soft')} />
                <path d="M199 92 C197 113 188 128 172 138 L194 142 L206 108 Z" fill={C.skinShade} opacity=".38" filter={u('soft')} />
                <ellipse cx="160" cy="140" rx="19" ry="6" fill={C.skinShade} opacity=".45" filter={u('soft')} />
                <path d="M150 131 Q160 135 170 131" stroke="#fff" strokeOpacity=".28" strokeWidth="2" fill="none" strokeLinecap="round" filter={u('soft')} />
                <ellipse cx="139" cy="97" rx="7" ry="3.6" fill="#fff" opacity=".2" filter={u('soft')} />
                <ellipse cx="181" cy="97" rx="5" ry="3" fill="#fff" opacity=".1" filter={u('soft')} />
              </g>
              <g data-part="phone-light" data-v="distracted">
                <path d="M174 112 C186 112 196 118 198 128 C190 138 176 140 168 136 C172 128 172 118 174 112 Z" fill="#C9FBEF" opacity=".14" filter={u('soft')} clipPath={u('faceClip')} />
              </g>
            </g>
            <g data-part="nose">
              <path d="M163 95 C164.5 100 165 103.5 163.6 106" fill="none" stroke={C.skinShade} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
              <path d="M155.6 106.4 C157.6 108.8 162.4 108.8 164.4 106.4" fill="none" stroke={C.skinLine} strokeWidth="1.4" strokeLinecap="round" opacity=".75" />
              <ellipse cx="159" cy="102.5" rx="1.8" ry="2.8" fill="#fff" opacity=".4" />
            </g>

            {/* eyes */}
            <g data-part="eyes-open" data-v="normal distracted">
              <OpenEye {...eyeL} u={u} />
              <OpenEye {...eyeR} u={u} />
              <g clipPath={u('eyesClip')}>
              <g data-part="pupils-pose">
                <g data-part="pupils">
                  {[eyeL, eyeR].map((e) => (
                    <g key={e.cx}>
                      <circle cx={e.cx + 0.3} cy={e.cy + 0.9} r="4.8" fill={u('iris')} />
                      <circle cx={e.cx + 0.3} cy={e.cy + 0.9} r="2.3" fill="#0D0806" />
                      <circle cx={e.cx + 1.9} cy={e.cy - 1.1} r="1.5" fill="#fff" />
                      <circle cx={e.cx - 1.3} cy={e.cy + 2.6} r=".7" fill="#fff" opacity=".8" />
                    </g>
                  ))}
                </g>
              </g>
              </g>
              <g fill="none" stroke="#2A1A12" strokeLinecap="round">
                <path d={`M${eyeL.cx - 7.5} ${eyeL.cy - 1} Q${eyeL.cx - 1} ${eyeL.cy - 10.5} ${eyeL.cx + 7} ${eyeL.cy - 3}`} strokeWidth="2.1" />
                <path d={`M${eyeR.cx - 7} ${eyeR.cy - 3} Q${eyeR.cx + 1} ${eyeR.cy - 10.5} ${eyeR.cx + 7.5} ${eyeR.cy - 1}`} strokeWidth="2.1" />
              </g>
              <g data-part="eyelids">
                <Lid {...eyeL} u={u} />
                <Lid {...eyeR} u={u} />
              </g>
            </g>
            <g data-part="eyes-closed" data-v="drowsy" fill="none" stroke="#2A1A12" strokeWidth="2" strokeLinecap="round">
              <path d={`M${eyeL.cx - 7} ${eyeL.cy + 1} Q${eyeL.cx} ${eyeL.cy + 6.5} ${eyeL.cx + 7} ${eyeL.cy + 1}`} />
              <path d={`M${eyeR.cx - 7} ${eyeR.cy + 1} Q${eyeR.cx} ${eyeR.cy + 6.5} ${eyeR.cx + 7} ${eyeR.cy + 1}`} />
              <path d={`M${eyeL.cx - 5} ${eyeL.cy + 4} l-1.6 2.4 M${eyeL.cx - 1} ${eyeL.cy + 5.4} l-.6 2.6`} strokeWidth="1.2" />
              <path d={`M${eyeR.cx + 5} ${eyeR.cy + 4} l1.6 2.4 M${eyeR.cx + 1} ${eyeR.cy + 5.4} l.6 2.6`} strokeWidth="1.2" />
            </g>
            <g data-part="eyes-squint" data-v="fatigued">
              {[eyeL, eyeR].map((e, i) => (
                <g key={e.cx}>
                  <ellipse cx={e.cx} cy={e.cy + 1} rx="6.2" ry="6.4" fill={u('eyeWhite')} />
                  <circle cx={e.cx} cy={e.cy + 2.6} r="4.4" fill={u('iris')} />
                  <circle cx={e.cx} cy={e.cy + 2.6} r="2" fill="#0D0806" />
                  <path d={`M${e.cx - 8} ${e.cy - 9} H${e.cx + 8} V${e.cy + 1.5} Q${e.cx} ${e.cy + 3.6} ${e.cx - 8} ${e.cy + 1.5} Z`} fill={u('skinFace')} />
                  <path d={`M${e.cx - 7.4} ${e.cy + 1.6} Q${e.cx} ${e.cy + 3.8} ${e.cx + 7.4} ${e.cy + 1.6}`} stroke="#2A1A12" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d={`M${e.cx - 5} ${e.cy - 2.5} Q${e.cx} ${e.cy - 4.2} ${e.cx + 5} ${e.cy - 2.5}`} stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".8" />
                  <path d={`M${e.cx - 5} ${e.cy + 9.5} Q${e.cx} ${e.cy + 11.5} ${e.cx + 5} ${e.cy + 9.5}`} stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".7" />
                  <circle cx={e.cx + (i ? -1.6 : 1.6)} cy={e.cy + 1.6} r=".9" fill="#fff" />
                </g>
              ))}
              <path d="M137.5 96 C139.6 99.5 140.8 101.6 139 103.4 C137.2 104.6 135.4 102.8 136 100.6 Z" fill="#A6DDF2" stroke="#6FC0E2" strokeWidth=".5" />
            </g>

            <g data-part="brows" fill="none" stroke="#1C1716" strokeWidth="3.6" strokeLinecap="round">
              <path data-part="brow-left" d="M135 77.5 Q143 71 153 75" />
              <path data-part="brow-right" d="M167 75 Q177 71 185 77.5" />
            </g>

            {/* mouths */}
            <g data-part="mouth-smile" data-v="normal distracted">
              <path d="M149 116.5 Q160 129 171 116.5 Q160 120.5 149 116.5 Z" fill={C.lip} />
              <path d="M151.6 117.8 Q160 120.8 168.4 117.8 L167.2 119.8 Q160 122 152.8 119.8 Z" fill="#fff" />
              <path d="M148 115.6 Q149 117 150 117.2 M172 115.6 Q171 117 170 117.2" stroke={C.skinLine} strokeWidth="1" strokeLinecap="round" opacity=".6" />
              <path d="M155 124.4 Q160 126.2 165 124.4" stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".7" />
            </g>
            <g data-part="mouth-relaxed" data-v="drowsy">
              <path d="M154 120 Q160 117.8 166.5 120.6 Q162 127 155.6 123.6 Q153.4 122 154 120 Z" fill={C.mouth} />
              <path d="M156.5 123.4 Q160 121.8 164 123.4 Q161 126 157.8 124.8 Z" fill="#E07468" />
              <path d="M154 120 Q160 117.8 166.5 120.6" stroke={C.lip} strokeWidth="1" fill="none" strokeLinecap="round" />
            </g>
            <g data-part="mouth-yawn" data-v="fatigued">
              <ellipse cx="160" cy="123" rx="9.2" ry="11.8" fill={C.lip} />
              <ellipse cx="160" cy="123" rx="8.6" ry="11.2" fill={C.mouth} />
              <g data-part="mouth-yawn-inner" clipPath={u('yawnClip')}>
                <rect x="150" y="110" width="20" height="4.2" rx="1.5" fill="#fff" />
                <ellipse cx="160" cy="133" rx="7.5" ry="5.5" fill="#E26B66" />
                <path d="M160 129.5 V133" stroke="#B9474A" strokeWidth=".8" />
              </g>
            </g>

            <g data-part="hair">
              <path
                d="M120 93 C112 74 112 52 124 37 C136 22 160 15 183 20 C202 26 211 45 207 66 C206 76 203 85 200 93 L196 93 C195 81 192 72 186 66 C176 64 162 66 154 72 C152 76 150 79 146 82 C147 78 147 75 146 72 C141 75 137 79 133 85 C134 81 134 78 133 76 C129 79 127 83 126 87 L125 93 Z"
                fill={u('hair')}
              />
              <g data-part="hair-strands">
                {/* crown tufts lifting the silhouette */}
                <g fill={u('hair')}>
                  <path d="M128 42 C131 27 146 16 166 14 C156 19 148 25 144 33 Z" />
                  <path d="M150 28 C160 15 180 11 196 19 C183 19 172 23 165 30 Z" />
                  <path d="M180 24 C194 24 204 32 207 44 C201 38 194 34 186 32 Z" />
                  {/* fringe clumps swept to viewer-left */}
                  <path d="M168 63 C160 64 153 68 148 75 C146 80 141 85 135 88 C140 81 142 75 142 69 C150 63 159 61 168 63 Z" />
                  <path d="M190 67 C184 64 176 64 170 66 C166 71 162 75 156 78 C161 73 163 68 163 63 C172 60 183 61 190 67 Z" />
                </g>
                <path d="M131 40 C144 26 170 21 190 29 C172 28 152 32 139 44 Z" fill={C.hairHi} opacity=".42" />
                <g fill="none" stroke={C.hairHi} strokeLinecap="round">
                  <path d="M138 47 C148 37 164 33 180 35" strokeOpacity=".4" strokeWidth="3.4" />
                  <path d="M156 46 C168 40 184 42 194 54" strokeOpacity=".45" strokeWidth="2" />
                  <path d="M178 66 C168 62 156 64 148 72" strokeOpacity=".35" strokeWidth="1.4" />
                  <path d="M150 30 C164 24 182 26 194 36 C200 42 202 50 202 56" strokeOpacity=".35" strokeWidth="3" />
                  <path d="M126 58 C132 47 143 40 154 37" strokeOpacity=".4" strokeWidth="1.6" />
                  <path d="M140 22 C150 18 160 17 168 17" strokeOpacity=".4" strokeWidth="1.4" />
                </g>
                <g fill="none" stroke="#08090B" strokeWidth="1" strokeLinecap="round" opacity=".4">
                  <path d="M178 34 C172 44 164 54 156 64" />
                  <path d="M160 36 C152 46 144 58 140 70" />
                  <path d="M194 48 C192 54 189 59 187 63" />
                  <path d="M170 64 C166 70 161 74 157 77" />
                </g>
              </g>
            </g>
          </g>
          </g>
        </g>

        {/* re-posed right sleeve for the raised-forearm states: covers the static torso sleeve */}
        <g data-part="sleeve-right-raised" data-v="fatigued distracted">
          <path d="M210 157 C231 155 248 165 256 184 L263 201 L229 213 C226 200 222 188 217 179 C213 172 211 166 210 160 Z" fill={u('sleeve')} />
          <path d="M210 157 C231 155 248 165 256 184 L263 201 M229 213 C226 200 222 188 217 179" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" fill="none" />
          <path d="M263 201 L229 213 L230 218 L264 206 Z" fill={C.shirtDark} />
          <path d="M219 162 C233 164 243 171 249 181" stroke="#fff" strokeOpacity=".28" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <g stroke={C.shirtDeep} strokeOpacity=".45" strokeWidth="1.3" fill="none" strokeLinecap="round">
            <path d="M232 190 C238 196 244 200 252 201" />
            <path d="M238 182 C244 188 250 192 257 193" />
          </g>
        </g>

        <g data-part="hand-right-cheek" data-v="fatigued">
          {/* forearm: tapered wrist → rounded elbow below the sleeve hem, soft cast shadow */}
          <path d="M206 141 C218 156 243 178 256 208 L240 224 C226 200 208 172 194 150 Z" fill={C.shirtDeep} opacity=".22" filter={u('soft')} />
          <path d="M202 139 C213 152 240 175 252 205 C255 213 253 221 247 223 C241 225 235 223 232 219 C222 202 202 170 190 147 Z" fill={u('skinBody')} />
          <path d="M232 218 C222 201 203 171 192 150" stroke={C.skinShade} strokeWidth="1.6" fill="none" opacity=".6" strokeLinecap="round" />
          <path d="M206 144 C216 155 236 172 246 194" stroke="#fff" strokeOpacity=".3" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M240 216 C244 218 248 217 250 213" stroke={C.skinShade} strokeWidth="1.2" fill="none" opacity=".6" strokeLinecap="round" />
          <g transform="translate(193 127) rotate(-12)">
            {/* back of hand + fingers pointing up */}
            <path d="M-11 4 C-12 -6 -10 -12 -4 -14 L8 -14 C13 -12 14 -6 13 4 C12 12 6 16 0 16 C-6 16 -10 11 -11 4 Z" fill={u('skinBody')} />
            {[-7.5, -2.5, 2.5, 7.5].map((x, i) => (
              <rect key={x} x={x - 2.6} y={-30 + [4, 0, 1, 6][i]} width="5.2" height={22 - [4, 0, 1, 6][i]} rx="2.6" fill={u('skinBody')} />
            ))}
            <g stroke={C.skinShade} strokeWidth=".9" fill="none" opacity=".75">
              <path d="M-5 -24 V-12 M0 -28 V-12 M5 -27 V-12" />
            </g>
            <path d="M-11 2 C-16 -2 -19 -8 -17 -11 C-15 -13 -12 -10 -10 -6" fill={u('skinBody')} stroke={C.skinShade} strokeWidth=".8" />
            <ellipse cx="-2" cy="-4" rx="6" ry="4" fill="#fff" opacity=".2" />
          </g>
        </g>

        <g data-part="hand-right-phone" data-v="distracted">
          <path d="M222 178 C234 186 248 196 255 210 L244 228 C232 212 220 198 210 190 Z" fill={C.shirtDeep} opacity=".22" filter={u('soft')} />
          <path d="M219 175 C231 182 243 191 249 205 C251 212 248 219 243 220 C240 221 238 219 237 217 C229 205 218 194 209 185 Z" fill={u('skinBody')} />
          <path d="M237 216 C229 205 219 195 210 187" stroke={C.skinShade} strokeWidth="1.6" fill="none" opacity=".6" strokeLinecap="round" />
          <path d="M222 178 C233 185 242 192 246 201" stroke="#fff" strokeOpacity=".3" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse data-part="phone-glow" cx="203" cy="144" rx="19" ry="15" fill={u('glow')} />
          <g data-part="phone" transform="translate(202 160) rotate(-10)">
            <rect x="-11" y="-21" width="22" height="42" rx="4.5" fill="#1B1F26" />
            <rect x="-11" y="-21" width="22" height="42" rx="4.5" fill="none" stroke="#4A525E" strokeWidth="1" />
            <rect x="-7.5" y="-17.5" width="7" height="9" rx="2.4" fill="#2C323C" />
            <circle cx="-5.5" cy="-15.2" r="1.4" fill="#0B0D10" />
            <circle cx="-2.4" cy="-11" r="1.4" fill="#0B0D10" />
            <path d="M-11 -18 C-11 -20 -10 -21 -8 -21 L8 -21" stroke="#9EEBD8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".9" />
          </g>
          <g transform="translate(206 170) rotate(-10)">
            <path d="M4 -8 C10 -8 14 -2 14 4 C14 12 8 16 0 16 C-6 16 -10 12 -10 8 L-10 2 C-6 -2 0 -8 4 -8 Z" fill={u('skinBody')} />
            {[-6, -1, 4].map((y) => (
              <rect key={y} x="-17" y={y} width="12" height="5" rx="2.5" fill={u('skinBody')} />
            ))}
            <path d="M-9 -1 V18" stroke={C.skinShade} strokeWidth=".9" opacity=".6" />
            <path d="M8 -6 C12 -10 14 -16 12 -18 C10 -19 7 -15 5 -11" fill={u('skinBody')} stroke={C.skinShade} strokeWidth=".7" />
          </g>
        </g>

        {/* ───────── wheel ───────── */}
        <g data-part="wheel">
          <path d="M116 262 C118 240 136 230 160 230 C184 230 202 240 204 262 Z" fill={u('wheel')} />
          <path d="M140 236 C150 233 170 233 180 236" stroke="#fff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="160" cy="280" rx="94" ry="102" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="22" filter={u('soft')} transform="translate(0 4)" />
          <ellipse cx="160" cy="280" rx="94" ry="102" fill="none" stroke={u('wheel')} strokeWidth="18" />
          <path d="M68.7 236 A100 108 0 0 1 251.3 236" fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* ───────── hands ───────── */}
        <g data-part="hand-left">
          <path d="M60 202 C59 212 65 222 76 227 L97 216 C93 212 90 208 89 205 Z" fill={u('skinBody')} />
          <path d="M61 206 C61 213 65 220 72 224" stroke={C.skinShade} strokeWidth="1.4" fill="none" opacity=".6" />
          <g transform="translate(87 216) rotate(-51)">
            <Fist u={u} />
          </g>
        </g>

        <g data-part="hand-right-wheel" data-v="normal drowsy">
          <path d="M260 202 C261 212 255 222 244 227 L223 216 C227 212 230 208 231 205 Z" fill={u('skinBody')} />
          <path d="M259 206 C259 213 255 220 248 224" stroke={C.skinShade} strokeWidth="1.4" fill="none" opacity=".6" />
          <g transform="translate(233 216) scale(-1 1) rotate(-51)">
            <Fist u={u} />
          </g>
        </g>

        {/* ───────── zzz ───────── */}
        <g data-part="zzz" data-v="drowsy">
          <Z part="zzz-1" x={212} y={46} s={1.6} color={C.navy} />
          <Z part="zzz-2" x={234} y={24} s={1} color={C.navy} />
          <Z part="zzz-3" x={100} y={70} s={0.95} color={C.teal} />
        </g>

        {/* soft window haze */}
        <rect x="0" y="0" width="320" height="260" fill={u('haze')} pointerEvents="none" />
      </g>
    </svg>
  )
}

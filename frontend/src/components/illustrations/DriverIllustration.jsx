import { useId } from 'react'

/**
 * DriverIllustration — one layered, animatable SVG of the FleetGuard driver
 * in 4 states. All variant layers are always mounted; `state` only switches
 * which ones are visible (CSS keyed on the root `data-state`), so a parent can
 * change state / crossfade with GSAP without remounting.
 *
 * Look (round 3, laid out from pixel measurements of the design mockup): soft "painted" driver
 * seen from the dashboard — oval face with a messy black mop whose pointed locks fall to the brows
 * and cover the ear tops, open-collar green polo, dark seat + headrest, and a flattened
 * steering-wheel ellipse in front of the belly, gripped at 9 and 3 o'clock. Hazy road / rocks /
 * trees backdrop inside a squircle window.
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
 *    bg-sky, bg-clouds (cloud-1..3), bg-hills (rocks + trees), bg-road (incl. roadside flowers)
 *  seat                 seat back + headrest
 *  torso                shirt, collar, neck, sleeves (static body)
 *  head-pose            CSS-posed wrapper (tilt per state). Don't tween it.
 *    head               GSAP target for idle nod/breath. Rotate around the neck:
 *                       svgOrigin "160 140" (viewBox units; what driverMotion.js uses).
 *      hair-back        mop volume behind the face (static)
 *      hair, face, ears, brows (brow-left, brow-right), nose
 *        hair-strands   inside hair: lock gaps, sheen + strand lines
 *      eyes-open        normal + distracted
 *        pupils-pose    CSS-posed (look-down in distracted). Don't tween it.
 *          pupils       GSAP target for glances (x/y a few units)
 *        eyelids        blink lids, rest at scaleY≈0 from their top edge.
 *                       Blink: gsap.to('[data-part=eyelids] > g', { scaleY: 1,
 *                       transformOrigin: '50% 0%', duration: .08, yoyo: true,
 *                       repeat: 1 })
 *      eyes-closed      drowsy
 *      eyes-squint      fatigued (heavy half-closed lids)
 *      mouth-smile      normal + distracted
 *      mouth-relaxed    drowsy
 *      mouth-yawn       fatigued (mouth-yawn-inner = teeth/tongue group)
 *      phone-light      distracted: phone glow cast on the face
 *  sleeve-right-raised  re-posed right sleeve (upper arm swung out toward the elbow); covers the
 *                       static torso sleeve (fatigued + distracted). Static.
 *  wheel                steering wheel (rim + hub)
 *  hand-left            viewer-left forearm + fist on the rim (all states)
 *  hand-right-wheel     viewer-right forearm + fist on the rim (normal, drowsy)
 *  hand-right-cheek     raised forearm + open hand at the cheek (fatigued). Elbow at ≈(244 222):
 *                       rub with rotation, svgOrigin "244 220".
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
  skinHi: '#FAD4AE',
  skin: '#F1BC8F',
  skinMid: '#E5A578',
  skinShade: '#C98B62',
  skinLine: '#9E5E3A',
  hair: '#101216',
  hairMid: '#1F232A',
  hairHi: '#5D6878',
  hairRim: '#8A97A8',
  shirtHi: '#62C94F',
  shirt: '#3BAA3E',
  shirtDark: '#288A32',
  shirtDeep: '#176424',
  seatHi: '#55606E',
  seat: '#313843',
  seatDark: '#1B1F26',
  wheel: '#1C2026',
  navy: '#0D2232',
  teal: '#2E9E62',
  lip: '#B5574A',
  mouth: '#4A1618',
  iris: '#2A1A12',
  lash: '#1E1410',
}

/* oval face, narrower jaw; reused by the face fill and its clip */
const FACE =
  'M160 36 C186 36 202 54 202 80 C202 98 197 111 188 120 C180 128 170 133 160 133 C150 133 140 128 132 120 C123 111 118 98 118 80 C118 54 134 36 160 36 Z'

const NECK = { x: 160, y: 140 }

/* almond eye opening */
const EW = 8.2
const eyePath = (cx, cy) =>
  `M${cx - EW} ${cy + 0.6} C${cx - 6.6} ${cy - 6.8} ${cx + 5.8} ${cy - 7.3} ${cx + EW} ${cy - 0.6} C${cx + 5.8} ${cy + 5.8} ${cx - 5.8} ${cy + 6.2} ${cx - EW} ${cy + 0.6} Z`

function styles(uid, transition) {
  const t = transition
  const s = `#${uid}`
  return `
${s} [data-v]{opacity:0;${t ? 'transition:opacity .35s ease;' : ''}}
${DRIVER_STATES.map((k) => `${s}[data-state="${k}"] [data-v~="${k}"]`).join(',')}{opacity:1}
${s} [data-part="head-pose"]{transform-box:view-box;transform-origin:${NECK.x}px ${NECK.y}px;${t ? 'transition:transform .5s cubic-bezier(.3,.7,.3,1);' : ''}}
${s}[data-state="drowsy"] [data-part="head-pose"]{transform:translate(-2px,4px) rotate(-10deg)}
${s}[data-state="fatigued"] [data-part="head-pose"]{transform:translate(-1px,1px) rotate(-3deg)}
${s}[data-state="distracted"] [data-part="head-pose"]{transform:translate(1px,3px) rotate(3deg)}
${s} [data-part="pupils-pose"]{${t ? 'transition:transform .4s ease;' : ''}}
${s}[data-state="distracted"] [data-part="pupils-pose"]{transform:translate(1.8px,2.2px)}
${s} [data-part^="brow-"]{transform-box:fill-box;transform-origin:50% 50%;${t ? 'transition:transform .4s ease;' : ''}}
${s}[data-state="drowsy"] [data-part="brow-left"]{transform:translateY(1.5px) rotate(5deg)}
${s}[data-state="drowsy"] [data-part="brow-right"]{transform:translateY(1.5px) rotate(-5deg)}
${s}[data-state="fatigued"] [data-part="brow-left"]{transform:translateY(-1.5px) rotate(-9deg)}
${s}[data-state="fatigued"] [data-part="brow-right"]{transform:translateY(-1.5px) rotate(9deg)}
${s}[data-state="distracted"] [data-part="brow-left"],${s}[data-state="distracted"] [data-part="brow-right"]{transform:translateY(1px)}
`
}

/* Fist gripping the rim. Local frame: rim runs along +x through the origin,
   +y points toward the wheel centre. Rotate/mirror via the parent transform. */
function Fist({ u }) {
  return (
    <g>
      {/* hand mass wrapped around the rim */}
      <path
        d="M-15 -3 C-16 -13 -8 -18 0 -18 C9 -18 15 -13 16 -4 C17 5 13 12 6 14 C-1 15.5 -9 14.6 -13 10 C-15 7 -15 2 -15 -3 Z"
        fill={u('fist')}
      />
      {/* finger creases across the rim */}
      <g fill="none" stroke={C.skinShade} strokeWidth="1.2" strokeLinecap="round" opacity=".85">
        <path d="M-8 -2 C-8.6 3 -8.2 8 -6.6 12" />
        <path d="M-2 -2.6 C-2.4 3 -2 9 -1 13.4" />
        <path d="M4.2 -2.4 C4.4 3 4.8 8 6 12.4" />
      </g>
      <g fill="#fff" opacity=".3">
        <ellipse cx="-11" cy="1" rx="1.8" ry="3.6" />
        <ellipse cx="-5" cy="1.6" rx="1.8" ry="4" />
        <ellipse cx="1.2" cy="1.8" rx="1.8" ry="4" />
      </g>
      {/* thumb along the rim */}
      <path d="M4 -15 C10 -16.6 16 -14.4 17.6 -10 C18.6 -7 16.6 -4.4 13.6 -5 C10.6 -5.6 7 -7 4 -8.4 Z" fill={u('fist')} />
      <path d="M4 -8.4 C7 -7 10.6 -5.6 13.6 -5" stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" />
    </g>
  )
}

/* chunky slanted "Z" like the design's hand-lettered sleep mark */
function Z({ x, y, s, color, part }) {
  return (
    <g data-part={part} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5.6 -7 H6.4 L6 -4.4 L-1.6 4.2 H5 L4.4 7 H-6.6 L-6.2 4.4 L1.4 -4.2 H-5 Z" fill={color} />
    </g>
  )
}

/* Blink lid: covers the eye, scale origin = its top edge. Rests at
   scaleY 0.001 encoded as a matrix so GSAP can tween scaleY -> 1. */
function Lid({ cx, cy, u }) {
  const top = cy - 8
  const s = 0.001
  return (
    <g transform={`matrix(1 0 0 ${s} 0 ${(top * (1 - s)).toFixed(3)})`}>
      <path
        d={`M${cx - 9} ${top} H${cx + 9} V${cy + 2} C${cx + 5} ${cy + 7.6} ${cx - 5} ${cy + 7.8} ${cx - 9} ${cy + 2.4} Z`}
        fill={u('skinFace')}
      />
      <path
        d={`M${cx - 8} ${cy + 2.6} C${cx - 4} ${cy + 6.4} ${cx + 4} ${cy + 6.4} ${cx + 8} ${cy + 2.2}`}
        stroke={C.lash}
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

/* Viewer-left forearm: from the elbow below the frame up to the fist on the rim's left side. */
const FOREARM_L = 'M56 262 C60 246 68 230 80 216 L101 224 C95 236 92 250 92 262 Z'

export default function DriverIllustration({ state = 'normal', className, title, transition = true }) {
  const uid = `drv${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const u = (n) => `url(#${uid}-${n})`
  const current = DRIVER_STATES.includes(state) ? state : 'normal'
  const label = title ?? TITLES[current]

  const eyeL = { cx: 143, cy: 82 }
  const eyeR = { cx: 177, cy: 82 }

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
          <path d="M52 6 C110 2 210 2 268 6 C300 8 313 24 314 58 C315.5 112 315.5 160 314 208 C313 242 298 254 266 256 C200 259 120 259 54 256 C22 254 7 242 6 208 C4.5 160 4.5 112 6 58 C7 24 20 8 52 6 Z" />
        </clipPath>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#AFC6DF" />
          <stop offset=".45" stopColor="#CFDDEB" />
          <stop offset=".75" stopColor="#E4EBF1" />
          <stop offset="1" stopColor="#EEF1F2" />
        </linearGradient>
        <radialGradient id={id('sun')} cx=".82" cy=".1" r=".7">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('rock')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7E8A98" />
          <stop offset="1" stopColor="#A9B3BE" />
        </linearGradient>
        <linearGradient id={id('road')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9C1C9" />
          <stop offset="1" stopColor="#7F8995" />
        </linearGradient>
        <radialGradient id={id('haze')} cx=".5" cy=".45" r=".62">
          <stop offset=".74" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".5" />
        </radialGradient>
        <linearGradient id={id('seat')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.seatHi} />
          <stop offset=".45" stopColor={C.seat} />
          <stop offset="1" stopColor={C.seatDark} />
        </linearGradient>
        <radialGradient id={id('headrest')} cx=".3" cy=".2" r=".95">
          <stop offset="0" stopColor="#5C6673" />
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
          <stop offset="0" stopColor={C.shirtDeep} stopOpacity=".45" />
          <stop offset=".2" stopColor={C.shirtDeep} stopOpacity="0" />
          <stop offset=".75" stopColor={C.shirtDeep} stopOpacity="0" />
          <stop offset="1" stopColor={C.shirtDeep} stopOpacity=".55" />
        </linearGradient>
        <radialGradient id={id('skinFace')} gradientUnits="userSpaceOnUse" cx="150" cy="82" r="64">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".55" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinMid} />
        </radialGradient>
        <linearGradient id={id('skinBody')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".45" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinShade} />
        </linearGradient>
        <linearGradient id={id('fist')} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".5" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinShade} />
        </linearGradient>
        <linearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.skinShade} />
          <stop offset=".5" stopColor={C.skinMid} />
          <stop offset="1" stopColor={C.skin} />
        </linearGradient>
        <radialGradient id={id('hair')} gradientUnits="userSpaceOnUse" cx="146" cy="22" r="80">
          <stop offset="0" stopColor="#373D47" />
          <stop offset=".45" stopColor={C.hairMid} />
          <stop offset="1" stopColor={C.hair} />
        </radialGradient>
        <radialGradient id={id('eyeWhite')} cx=".5" cy=".7" r=".65">
          <stop offset=".55" stopColor="#fff" />
          <stop offset="1" stopColor="#E2E6EA" />
        </radialGradient>
        <radialGradient id={id('iris')} cx=".5" cy=".72" r=".6">
          <stop offset="0" stopColor="#5A3520" />
          <stop offset="1" stopColor={C.iris} />
        </radialGradient>
        <radialGradient id={id('blush')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#E0765C" stopOpacity=".22" />
          <stop offset="1" stopColor="#F28C78" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('wheel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#424A55" />
          <stop offset=".35" stopColor={C.wheel} />
          <stop offset="1" stopColor="#0C0E11" />
        </linearGradient>
        <radialGradient id={id('hub')} cx=".4" cy=".3" r=".8">
          <stop offset="0" stopColor="#3C434D" />
          <stop offset="1" stopColor="#111418" />
        </radialGradient>
        <radialGradient id={id('glow')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#D6FBF1" stopOpacity=".9" />
          <stop offset=".45" stopColor="#8DE6CF" stopOpacity=".4" />
          <stop offset="1" stopColor="#8DE6CF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('screen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A4250" />
          <stop offset=".5" stopColor="#1B2029" />
          <stop offset="1" stopColor="#10141A" />
        </linearGradient>
        <clipPath id={id('faceClip')}>
          <path d={FACE} />
        </clipPath>
        <clipPath id={id('torsoClip')}>
          <path d="M146 136 C128 139 104 144 90 152 C78 159 72 172 70 192 L66 262 H254 L250 192 C248 172 242 159 230 152 C216 144 192 139 174 136 Z" />
        </clipPath>
        <clipPath id={id('eyesClip')}>
          <path d={eyePath(eyeL.cx, eyeL.cy)} />
          <path d={eyePath(eyeR.cx, eyeR.cy)} />
        </clipPath>
        <clipPath id={id('yawnClip')}>
          <ellipse cx="159" cy="115" rx="7.8" ry="9.4" />
        </clipPath>
        <filter id={id('soft')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={id('blur')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <g clipPath={u('win')}>
        {/* ───────── background ───────── */}
        <g data-part="bg">
          <rect data-part="bg-sky" x="0" y="0" width="320" height="260" fill={u('sky')} />
          <rect x="0" y="0" width="320" height="200" fill={u('sun')} />
          <g data-part="bg-clouds" fill="#fff">
            <g data-part="cloud-1">
              <path d="M240 66 C232 66 230 57 237 55 C237 46 248 42 255 48 C259 36 278 35 283 47 C292 45 300 52 297 59 C304 60 304 66 298 67 Z" />
              <path d="M240 66 H298 C303 68 298 71 292 71 H246 C239 71 237 68 240 66 Z" fill="#DCE5EE" />
            </g>
            <g data-part="cloud-2" opacity=".7">
              <path d="M16 104 C10 104 9 98 15 97 C16 90 25 88 30 93 C33 86 45 86 48 94 C54 93 58 98 54 104 Z" />
            </g>
            <g data-part="cloud-3" opacity=".8">
              <path d="M272 26 C268 26 267 22 271 21 C272 16 278 15 281 18 C283 13 291 13 293 19 C297 19 299 23 296 26 Z" />
            </g>
          </g>
          <g data-part="bg-hills">
            {/* distant tree line */}
            <g fill="#93AA97" opacity=".8">
              <path d="M0 200 V180 C6 172 12 174 16 178 C20 168 30 168 34 176 C40 170 48 172 52 180 C58 176 64 180 66 188 V200 Z" />
              <path d="M320 200 V178 C314 170 306 172 302 177 C298 168 288 168 284 176 C278 170 270 172 266 180 C260 176 254 180 252 188 V200 Z" />
            </g>
            {/* rock outcrops at the frame edges */}
            <path d="M0 150 C8 140 16 134 24 138 C34 144 46 166 60 200 H0 Z" fill={u('rock')} />
            <path d="M320 148 C312 138 302 134 294 138 C284 146 272 168 260 200 H320 Z" fill={u('rock')} />
            <path d="M6 148 C12 140 18 138 24 140 C18 148 14 160 12 176 Z" fill="#fff" opacity=".22" />
            <path d="M314 146 C308 140 302 138 296 140 C302 148 306 160 308 176 Z" fill="#fff" opacity=".2" />
            <path d="M30 152 C38 162 46 176 52 196 M290 152 C282 162 274 176 268 196" stroke="#6B7684" strokeOpacity=".4" strokeWidth="1.2" fill="none" />
          </g>
          <g data-part="bg-road">
            <path d="M0 199 C60 197 100 197 160 197 C220 197 260 197 320 199 V260 H0 Z" fill={u('road')} />
            {/* sunlit verge with yellow wildflowers */}
            <path d="M0 200 C30 198 60 198 90 199 L0 226 Z" fill="#D9C27C" opacity=".6" />
            <path d="M320 200 C290 198 260 198 230 199 L320 226 Z" fill="#D9C27C" opacity=".6" />
            <g fill="#F2C14E">
              <circle cx="8" cy="207" r="2.2" />
              <circle cx="20" cy="203" r="1.8" />
              <circle cx="34" cy="201" r="1.6" />
              <circle cx="14" cy="214" r="1.7" />
              <circle cx="28" cy="209" r="1.4" />
              <circle cx="312" cy="207" r="2.2" />
              <circle cx="300" cy="203" r="1.8" />
              <circle cx="286" cy="201" r="1.6" />
              <circle cx="306" cy="214" r="1.7" />
              <circle cx="292" cy="209" r="1.4" />
            </g>
            <path d="M0 244 L50 222 M320 244 L270 222" stroke="#fff" strokeWidth="2" opacity=".5" />
          </g>
        </g>

        {/* ───────── seat ───────── */}
        <g data-part="seat">
          <path d="M60 262 L62 122 C62 98 74 82 96 76 C118 70 202 70 224 76 C246 82 258 98 258 122 L260 262 Z" fill={u('seat')} />
          {/* side bolsters: lit on the left, shaded on the right */}
          <path d="M62 122 C62 98 74 82 96 76 C88 94 86 114 88 140 L86 262 H60 Z" fill="#fff" opacity=".1" />
          <path d="M258 122 C258 98 246 82 224 76 C232 94 234 114 232 140 L234 262 H260 Z" fill="#000" opacity=".22" />
          <path d="M70 114 C74 96 84 84 98 79" stroke="#fff" strokeOpacity=".22" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <rect x="102" y="30" width="116" height="104" rx="38" fill={u('headrest')} />
          <path d="M112 50 C120 38 132 33 146 33" stroke="#fff" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* ───────── torso ───────── */}
        <g data-part="torso">
          <path d="M149 110 L149 144 Q160 152 171 144 L171 110 Z" fill={u('neck')} />
          <path d="M146 136 C128 139 104 144 90 152 C78 159 72 172 70 192 L66 262 H254 L250 192 C248 172 242 159 230 152 C216 144 192 139 174 136 Z" fill={u('shirt')} />
          <g clipPath={u('torsoClip')}>
            <rect x="60" y="130" width="200" height="140" fill={u('shirtSide')} />
            <ellipse cx="122" cy="168" rx="20" ry="12" fill="#fff" opacity=".12" filter={u('soft')} />
            {/* fabric folds pulled toward the arms */}
            <path d="M104 186 C116 194 128 198 140 198 M216 182 C206 190 196 196 186 198 M118 222 C132 228 146 230 158 230" stroke={C.shirtDeep} strokeOpacity=".3" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* shadow cast by the wheel */}
            <ellipse cx="160" cy="226" rx="70" ry="46" fill={C.shirtDeep} opacity=".2" filter={u('soft')} />
          </g>
          {/* open-collar V */}
          <path d="M147 135 L160 158 L173 135 Z" fill={C.skinMid} />
          <path d="M151 135 L160 151 L169 135 Z" fill={C.skinShade} opacity=".4" />
          {/* placket */}
          <path d="M156.4 154 H163.6 V182 Q160 184 156.4 182 Z" fill={C.shirtDark} />
          <circle cx="160" cy="164" r="1.4" fill="#E8F5EC" />
          <circle cx="160" cy="174" r="1.4" fill="#E8F5EC" />
          {/* polo collar */}
          <path d="M143 135 Q160 129 177 135 L176 138.6 Q160 134 144 138.6 Z" fill={C.shirtDark} />
          <path d="M144 135 C140 140 136.4 146 133.4 152 L150 160 L160 157 Z" fill={C.shirt} />
          <path d="M176 135 C180 140 183.6 146 186.6 152 L170 160 L160 157 Z" fill={C.shirt} />
          <path d="M144 135 C140 140 136.4 146 133.4 152 L150 160" stroke={C.shirtDeep} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <path d="M176 135 C180 140 183.6 146 186.6 152 L170 160" stroke={C.shirtDeep} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <path d="M139 141 L136 147" stroke="#fff" strokeOpacity=".35" strokeWidth="1.3" strokeLinecap="round" />
          {/* short sleeves over the upper arms */}
          {[1, -1].map((m) => (
            <g key={m} transform={m === 1 ? undefined : 'matrix(-1 0 0 1 320 0)'}>
              <path d="M98 172 C94 182 92 192 91 204" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="4" fill="none" filter={u('soft')} />
              <path d="M94 150 C82 154 72 164 66 178 C62 186 59 194 57 202 L88 206 C88 197 90 188 93 180 C96 172 99 165 101 160 Z" fill={u('sleeve')} />
              <path d="M94 150 C82 154 72 164 66 178 C62 186 59 194 57 202" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" fill="none" />
              <path d="M88 206 C88 197 90 188 93 180 C96 172 99 165 101 160" stroke={C.shirtDeep} strokeOpacity=".7" strokeWidth="1.3" fill="none" />
              <path d="M57 202 L88 206 L87.6 211 L56.4 207 Z" fill={C.shirtDark} />
              <path d="M88 156 C78 161 71 169 67 178" stroke="#fff" strokeOpacity=".2" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>

        {/* ───────── head ───────── */}
        <g data-part="head-pose">
          <g data-part="head">
            {/* mop volume behind the face, sky-lit rim */}
            <path
              data-part="hair-back"
              d="M112 76 C105 62 103 42 112 26 C122 10 142 3 162 3 C184 3 202 12 210 28 C216 42 215 60 208 76 Z"
              fill={u('hair')}
              stroke="#fff"
              strokeOpacity=".3"
              strokeWidth="2.2"
            />
            <g data-part="ears">
              <path d="M121 76 C113 70 106 73 107 84 C108 94 114 101 122 101 Z" fill={C.skinMid} />
              <path d="M119 82 C114.6 78.6 111.4 81.4 111.8 86.6 C112.2 92 115 96.4 119.4 97.6" stroke={C.skinShade} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".7" />
              <path d="M199 76 C207 70 214 73 213 84 C212 94 206 101 198 101 Z" fill={C.skinMid} />
              <path d="M201 82 C205.4 78.6 208.6 81.4 208.2 86.6 C207.8 92 205 96.4 200.6 97.6" stroke={C.skinShade} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".75" />
            </g>
            <g data-part="face">
              <path d={FACE} fill={u('skinFace')} />
              <g clipPath={u('faceClip')}>
                {/* fringe shadow on the forehead, right-side form shadow, jaw + chin */}
                <ellipse cx="160" cy="64" rx="40" ry="6" fill={C.skinShade} opacity=".45" filter={u('soft')} />
                <path d="M190 60 C202 80 200 108 178 132 L204 136 L208 60 Z" fill={C.skinShade} opacity=".36" filter={u('soft')} />
                <path d="M119 96 C122 112 132 124 146 132 L126 138 L114 106 Z" fill={C.skinShade} opacity=".26" filter={u('soft')} />
                <ellipse cx="160" cy="137" rx="18" ry="5" fill={C.skinShade} opacity=".45" filter={u('soft')} />
                <ellipse cx="136" cy="101" rx="8" ry="5" fill={u('blush')} />
                <ellipse cx="184" cy="101" rx="8" ry="5" fill={u('blush')} />
                {/* cheek light from the window */}
                <ellipse cx="134" cy="96" rx="6" ry="4" fill="#fff" opacity=".2" filter={u('soft')} />
                <path d="M151 127 Q160 130 169 127" stroke="#fff" strokeOpacity=".26" strokeWidth="2" fill="none" strokeLinecap="round" filter={u('soft')} />
              </g>
              <path d="M122 98 C125 112 134 123 147 130" stroke={C.skinLine} strokeOpacity=".22" strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M198 98 C195 112 186 123 173 130" stroke={C.skinLine} strokeOpacity=".32" strokeWidth="1" fill="none" strokeLinecap="round" />
              <g data-part="phone-light" data-v="distracted">
                <path d="M174 102 C188 102 198 110 200 120 C192 132 178 136 168 132 C172 122 172 110 174 102 Z" fill="#C9FBEF" opacity=".16" filter={u('soft')} clipPath={u('faceClip')} />
              </g>
            </g>
            <g data-part="nose">
              <path d="M162.4 89 C163.8 93.4 164.8 97 163.8 100" fill="none" stroke={C.skinShade} strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
              <path d="M155.4 100.6 C157.2 103.2 162.8 103.2 164.6 100.6" fill="none" stroke={C.skinLine} strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
              <ellipse cx="160" cy="100.8" rx="5.2" ry="2.2" fill={C.skinShade} opacity=".3" filter={u('soft')} />
              <ellipse cx="158.8" cy="95.4" rx="1.6" ry="2.6" fill="#fff" opacity=".38" />
            </g>

            {/* eyes */}
            <g data-part="eyes-open" data-v="normal distracted">
              {[eyeL, eyeR].map((e) => (
                <path key={e.cx} d={eyePath(e.cx, e.cy)} fill={u('eyeWhite')} />
              ))}
              <g clipPath={u('eyesClip')}>
                <g data-part="pupils-pose">
                  <g data-part="pupils">
                    {[eyeL, eyeR].map((e) => (
                      <g key={e.cx}>
                        <circle cx={e.cx + 0.3} cy={e.cy + 0.4} r="5.1" fill={u('iris')} />
                        <circle cx={e.cx + 0.3} cy={e.cy + 0.4} r="2.4" fill="#0B0705" />
                        <circle cx={e.cx + 2} cy={e.cy - 1.6} r="1.6" fill="#fff" />
                        <circle cx={e.cx - 1.1} cy={e.cy + 1.8} r=".55" fill="#fff" opacity=".8" />
                      </g>
                    ))}
                  </g>
                </g>
                {/* upper-lid shadow on the eyeball */}
                {[eyeL, eyeR].map((e) => (
                  <ellipse key={e.cx} cx={e.cx} cy={e.cy - 5.8} rx="9.4" ry="3" fill="#8A6A5A" opacity=".22" />
                ))}
              </g>
              <g fill="none" stroke={C.lash} strokeLinecap="round">
                {/* lash line, thicker toward the outer corner */}
                <path d={`M${eyeL.cx - 9} ${eyeL.cy + 0.6} C${eyeL.cx - 6.8} ${eyeL.cy - 7} ${eyeL.cx + 5.4} ${eyeL.cy - 7.6} ${eyeL.cx + 8.2} ${eyeL.cy - 0.8}`} strokeWidth="2.2" />
                <path d={`M${eyeR.cx - 8.2} ${eyeR.cy - 0.8} C${eyeR.cx - 5.4} ${eyeR.cy - 7.6} ${eyeR.cx + 6.8} ${eyeR.cy - 7} ${eyeR.cx + 9} ${eyeR.cy + 0.6}`} strokeWidth="2.2" />
              </g>
              <g data-part="eyelids">
                <Lid {...eyeL} u={u} />
                <Lid {...eyeR} u={u} />
              </g>
            </g>
            <g data-part="eyes-closed" data-v="drowsy" fill="none" stroke={C.lash} strokeLinecap="round">
              {[eyeL, eyeR].map((e, i) => {
                const d = i ? 1 : -1
                return (
                  <g key={e.cx}>
                    <path d={`M${e.cx - 7.6} ${e.cy - 0.4} C${e.cx - 3.6} ${e.cy + 4.2} ${e.cx + 3.6} ${e.cy + 4.2} ${e.cx + 7.6} ${e.cy - 0.4}`} strokeWidth="2" />
                    <path d={`M${e.cx + d * 3.6} ${e.cy + 3.1} l${d * 1.3} 2.2 M${e.cx + d * 6.6} ${e.cy + 1.1} l${d * 1.6} 1.6`} strokeWidth="1.1" />
                    <path d={`M${e.cx - 6.4} ${e.cy - 4.6} C${e.cx - 2.8} ${e.cy - 6.4} ${e.cx + 2.8} ${e.cy - 6.4} ${e.cx + 6.4} ${e.cy - 4.6}`} stroke={C.skinShade} strokeWidth="1" opacity=".75" />
                  </g>
                )
              })}
            </g>
            <g data-part="eyes-squint" data-v="fatigued">
              {[eyeL, eyeR].map((e, i) => {
                const lid = i ? 1.4 : -0.4 // viewer-right eye droops more
                return (
                  <g key={e.cx}>
                    <path d={`M${e.cx - 7.4} ${e.cy + 1} C${e.cx - 4.6} ${e.cy + 4.4} ${e.cx + 4.6} ${e.cy + 4.4} ${e.cx + 7.4} ${e.cy + 0.6} L${e.cx + 7.4} ${e.cy + lid} L${e.cx - 7.4} ${e.cy + lid} Z`} fill={u('eyeWhite')} />
                    <circle cx={e.cx + 0.3} cy={e.cy + 2.2} r={i ? 3.2 : 3.7} fill={u('iris')} />
                    <circle cx={e.cx + 0.3} cy={e.cy + 2.2} r="1.7" fill="#0B0705" />
                    <path d={`M${e.cx - 8.8} ${e.cy - 7.4} H${e.cx + 8.8} V${e.cy + lid} C${e.cx + 3.6} ${e.cy + lid + 1.3} ${e.cx - 3.6} ${e.cy + lid + 1.3} ${e.cx - 8.8} ${e.cy + lid} Z`} fill={u('skinFace')} />
                    <path d={`M${e.cx - 8} ${e.cy + lid + 0.4} C${e.cx - 3.6} ${e.cy + lid + 1.7} ${e.cx + 3.6} ${e.cy + lid + 1.7} ${e.cx + 8} ${e.cy + lid}`} stroke={C.lash} strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d={`M${e.cx - 5.6} ${e.cy - 3.8} C${e.cx - 1.8} ${e.cy - 5.6} ${e.cx + 1.8} ${e.cy - 5.6} ${e.cx + 5.6} ${e.cy - 3.8}`} stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".8" />
                    <path d={`M${e.cx - 5.4} ${e.cy + 7.8} C${e.cx - 1.8} ${e.cy + 9.6} ${e.cx + 1.8} ${e.cy + 9.6} ${e.cx + 5.4} ${e.cy + 7.8}`} stroke={C.skinShade} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".7" />
                  </g>
                )
              })}
            </g>

            <g data-part="brows" fill="#16120F">
              <path data-part="brow-left" d="M132 70.4 C134 65 142 62.4 152 63.8 C153.8 64.2 153.6 67.8 151.8 67.8 C144 67.4 138.6 68.6 134.6 71.8 C133 73 131.4 71.8 132 70.4 Z" />
              <path data-part="brow-right" d="M188 70.4 C186 65 178 62.4 168 63.8 C166.2 64.2 166.4 67.8 168.2 67.8 C176 67.4 181.4 68.6 185.4 71.8 C187 73 188.6 71.8 188 70.4 Z" />
            </g>

            {/* mouths */}
            <g data-part="mouth-smile" data-v="normal distracted">
              <path d="M149 108.4 C153.4 118.8 166.6 118.8 171 108.4 C164 110.8 156 110.8 149 108.4 Z" fill={C.mouth} />
              <path d="M151.4 109.6 C156 111.4 164 111.4 168.6 109.6 L167.8 111.4 C163 113 157 113 152.2 111.4 Z" fill="#fff" opacity=".92" />
              <path d="M155 115.4 C158 113.6 162 113.6 165 115.4 C162.6 117 157.4 117 155 115.4 Z" fill="#D9645A" />
              <path d="M147.8 107.6 Q148.8 109.4 150 109.6 M172.2 107.6 Q171.2 109.4 170 109.6" stroke={C.skinLine} strokeWidth="1" strokeLinecap="round" opacity=".6" />
              <path d="M155.4 122.6 Q160 124.2 164.6 122.6" stroke={C.skinShade} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".7" />
            </g>
            <g data-part="mouth-relaxed" data-v="drowsy">
              <path d="M154.6 112.6 C158.4 111 164.6 111.2 168 113.4 C165.6 118.2 158.6 118.6 155.6 116 C154.6 115.1 154.2 113.7 154.6 112.6 Z" fill={C.mouth} />
              <path d="M156.8 115.4 C159.8 114.3 163.8 114.5 166 115.6 C163.4 117.8 159.2 117.6 156.8 115.4 Z" fill="#D86A60" />
              <path d="M154.6 112.6 C158.4 111 164.6 111.2 168 113.4" stroke={C.lip} strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M156.4 122 Q161 123.4 165.6 121.8" stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".7" />
            </g>
            <g data-part="mouth-yawn" data-v="fatigued">
              <ellipse cx="159" cy="115" rx="8.4" ry="10" fill={C.lip} />
              <ellipse cx="159" cy="115" rx="7.8" ry="9.4" fill={C.mouth} />
              <g data-part="mouth-yawn-inner" clipPath={u('yawnClip')}>
                <path d="M151 105 H167 V108.8 C163.4 110.2 154.6 110.2 151 108.8 Z" fill="#fff" />
                <ellipse cx="159" cy="123" rx="6" ry="4.6" fill="#E9744A" />
                <path d="M159 120.4 V123.4" stroke="#B9473A" strokeWidth=".8" />
              </g>
            </g>

            <g data-part="hair">
              {/* side part on the viewer-right; fringe swept across the forehead to the left, tufts flicking out at the temples */}
              <path
                d="M121 76 C117 71 113 67 110 64 L102 61 C105 57 106.4 52 106.6 46 C106 27 120 11 142 5 C158 1 182 3 196 12 C208 20 214 34 212 48 C214 52 217 55 220 58 C214 60 209 64 205 69 L200 76 C199 68 197 62 194 58 C191 58 188 59 185 60.5 C182 57.6 178 56.6 174 57.4 C170 54.6 165 53.6 160 54.4 C155 52.6 150 52.4 145.6 53.6 C141 54.8 137 57.4 134 60.6 C130.6 63.6 128.4 66.6 126.6 70 C124.6 72.4 122.8 74.4 121 76 Z"
                fill={u('hair')}
              />
              <g data-part="hair-strands">
                {/* broad sheen on the dome */}
                <ellipse cx="146" cy="20" rx="24" ry="9" transform="rotate(-14 146 20)" fill={C.hairHi} opacity=".38" filter={u('blur')} />
                <ellipse cx="194" cy="26" rx="9" ry="6" transform="rotate(40 194 26)" fill={C.hairHi} opacity=".25" filter={u('blur')} />
                {/* side part + soft lock separations sweeping from the part down to the left */}
                <g fill="none" stroke="#07080A" strokeLinecap="round" opacity=".55">
                  <path d="M188 12 C193 22 196 34 195 50" strokeWidth="1.4" />
                  <path d="M184 15 C168 20 150 33 139 55" strokeWidth="1.1" />
                  <path d="M190 26 C176 32 164 42 158 53" strokeWidth="1" />
                  <path d="M176 10 C156 14 136 28 127 50" strokeWidth="1" />
                  <path d="M204 22 C208 32 209 44 206 58" strokeWidth="1" />
                </g>
                {/* highlight strands riding along the swept locks */}
                <g fill="none" stroke={C.hairHi} strokeLinecap="round">
                  <path d="M180 18 C164 24 150 34 141 46" strokeOpacity=".55" strokeWidth="1.4" />
                  <path d="M170 11 C152 15 135 25 126 38" strokeOpacity=".45" strokeWidth="1.2" />
                  <path d="M187 30 C176 35 166 41 159 47" strokeOpacity=".4" strokeWidth="1.1" />
                  <path d="M199 18 C204 27 206 36 205 46" strokeOpacity=".35" strokeWidth="1" />
                </g>
                <g fill="none" stroke={C.hairRim} strokeLinecap="round" strokeOpacity=".5">
                  <path d="M107 46 C107 34 113 22 124 14" strokeWidth="1.1" />
                  <path d="M132 9 C142 5 152 3 164 3" strokeWidth="1" />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* re-posed right sleeve for the raised-forearm states: covers the static torso sleeve */}
        <g data-part="sleeve-right-raised" data-v="fatigued distracted">
          <path d="M226 150 C240 155 250 166 256 180 C260 188 262 196 264 204 L233 209 C232 200 230 191 227 183 C224 175 221 167 219 160 Z" fill={u('sleeve')} />
          <path d="M226 150 C240 155 250 166 256 180 C260 188 262 196 264 204 M233 209 C232 200 230 191 227 183" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" fill="none" />
          <path d="M264 204 L233 209 L233.4 214 L264.6 209 Z" fill={C.shirtDark} />
          <path d="M234 156 C244 161 250 169 254 178" stroke="#fff" strokeOpacity=".16" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>

        {/* ───────── wheel ───────── */}
        <g data-part="wheel">
          {/* steering column + hub; the lower half of the rim sits below the frame */}
          <path d="M142 262 L145 244 H175 L178 262 Z" fill="#14171B" />
          {/* spokes from the hub out to the rim */}
          <path d="M138 236 C124 234 110 230 98 226 L99 218 C112 222 126 226 139 228 Z" fill={C.wheel} />
          <path d="M182 236 C196 234 210 230 222 226 L221 218 C208 222 194 226 181 228 Z" fill={C.wheel} />
          <rect x="136" y="226" width="48" height="22" rx="10" fill={u('hub')} />
          <path d="M144 230 C152 228 168 228 176 230" stroke="#fff" strokeOpacity=".22" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* rim: soft drop shadow, body, top-edge light */}
          <ellipse cx="160" cy="225" rx="66" ry="50" fill="none" stroke="#000" strokeOpacity=".22" strokeWidth="14" filter={u('soft')} transform="translate(0 3)" />
          <ellipse cx="160" cy="222" rx="66" ry="50" fill="none" stroke={u('wheel')} strokeWidth="11" />
          <path d="M104 196 C120 182 140 176 160 176 C180 176 200 182 216 196" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* ───────── hands ───────── */}
        <g data-part="hand-left">
          <path d={FOREARM_L} fill={u('skinBody')} />
          <path d="M62 258 C66 244 72 232 80 222" stroke={C.skinShade} strokeWidth="1.3" fill="none" opacity=".6" />
          <g transform="translate(96 210) rotate(-78) scale(1.22)">
            <Fist u={u} />
          </g>
        </g>

        <g data-part="hand-right-wheel" data-v="normal drowsy">
          <g transform="matrix(-1 0 0 1 320 0)">
            <path d={FOREARM_L} fill={u('skinBody')} />
            <path d="M62 258 C66 244 72 232 80 222" stroke={C.skinShade} strokeWidth="1.3" fill="none" opacity=".6" />
          </g>
          <g transform="translate(224 210) scale(-1.22 1.22) rotate(-78)">
            <Fist u={u} />
          </g>
        </g>

        <g data-part="hand-right-cheek" data-v="fatigued">
          {/* forearm: wrist under the jaw → elbow resting out by the rim, soft cast shadow */}
          <path d="M206 136 C218 154 238 184 250 214 L236 226 C224 198 206 168 194 148 Z" fill={C.shirtDeep} opacity=".2" filter={u('soft')} />
          <path d="M204 128 C218 148 240 182 252 212 C255 220 251 228 244 229 C238 230 234 226 232 222 C220 196 204 166 192 142 Z" fill={u('skinBody')} />
          <path d="M232 221 C221 196 205 166 194 145" stroke={C.skinShade} strokeWidth="1.5" fill="none" opacity=".6" strokeLinecap="round" />
          <path d="M210 138 C222 156 238 182 248 204" stroke="#fff" strokeOpacity=".3" strokeWidth="2" fill="none" strokeLinecap="round" />
          <g transform="translate(192 114) rotate(-10)">
            {/* back of the hand pressed to the cheek, fingers up */}
            <path d="M-11 6 C-12 -5 -10 -11 -4.6 -13 L7.4 -13 C12 -11 14 -5 13 6 C12 13 6.4 17 0 17 C-6.4 17 -10 12 -11 6 Z" fill={u('skinBody')} />
            {[-7.2, -2.4, 2.4, 7.2].map((x, i) => (
              <rect key={x} x={x - 2.6} y={-29 + [5, 0, 1, 5][i]} width="5.2" height={21 - [5, 0, 1, 5][i]} rx="2.6" fill={u('skinBody')} />
            ))}
            <g stroke={C.skinShade} strokeWidth=".9" fill="none" opacity=".75">
              <path d="M-4.8 -22 V-11 M0 -27 V-11 M4.8 -26 V-11" />
            </g>
            <g fill={C.skinShade} opacity=".45">
              {[-7.2, -2.4, 2.4, 7.2].map((x, i) => (
                <ellipse key={x} cx={x} cy={-25.4 + [5, 0, 1, 5][i]} rx="1.5" ry="1.1" />
              ))}
            </g>
            <path d="M-11 3 C-16 -1 -19 -6 -17 -9 C-15 -11 -12 -8 -10 -4.6" fill={u('skinBody')} stroke={C.skinShade} strokeWidth=".8" />
            <ellipse cx="-2" cy="-3" rx="5.6" ry="3.8" fill="#fff" opacity=".2" />
          </g>
        </g>

        <g data-part="hand-right-phone" data-v="distracted">
          {/* forearm rising from the elbow below the frame, over the rim, up to the wrist */}
          <path d="M214 196 C226 214 240 238 246 262 L276 262 C270 236 252 206 234 184 Z" fill={C.shirtDeep} opacity=".22" filter={u('soft')} transform="translate(4 4)" />
          <path d="M210 196 C222 214 236 238 242 262 L272 262 C266 236 250 206 232 182 Z" fill={u('skinBody')} />
          <path d="M244 262 C238 238 224 214 213 200" stroke={C.skinShade} strokeWidth="1.5" fill="none" opacity=".55" strokeLinecap="round" />
          <path d="M232 190 C244 206 256 230 262 254" stroke="#fff" strokeOpacity=".28" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* wristwatch */}
          <path d="M216 208 L234 193 L239 200 L221 215 Z" fill="#2B3138" />
          <rect x="-4.6" y="-4" width="9.2" height="8" rx="2.2" fill="#C9A54C" transform="translate(227.4 204) rotate(-40)" />
          <rect x="-3.1" y="-2.7" width="6.2" height="5.4" rx="1.5" fill="#1D3B36" transform="translate(227.4 204) rotate(-40)" />
          <ellipse data-part="phone-glow" cx="204" cy="140" rx="24" ry="20" fill={u('glow')} />
          <g transform="translate(212 154) rotate(10) scale(1)">
            {/* palm behind the phone (shows past its right and bottom edges) */}
            <path d="M2 -8 C16 -12 32 -4 34 12 C35.6 27 30 39 17 42 C5 44 -7 39 -11 30 L-8 18 Z" fill={u('skinBody')} />
            <path d="M28 6 C30.6 16 29.6 28 24 34" stroke="#fff" strokeOpacity=".3" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M-6 31 C-1 37 8 40 17 38" stroke={C.skinShade} strokeWidth="1.2" fill="none" opacity=".6" />
            <g data-part="phone">
              <rect x="-14.5" y="-27" width="29" height="54" rx="5.5" fill="#15191F" />
              <rect x="-12.8" y="-25.2" width="25.6" height="50.4" rx="4.2" fill={u('screen')} />
              <rect x="-14.5" y="-27" width="29" height="54" rx="5.5" fill="none" stroke="#4A525E" strokeWidth="1" />
              <path d="M-11 -22 L5 -22 L-11 5 Z" fill="#fff" opacity=".1" />
              <path d="M-14.5 -22 C-14.5 -25 -12.5 -27 -9.5 -27 L9.5 -27" stroke="#9EEBD8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".8" />
            </g>
            {/* fingertips wrapping the far (left) edge, thumb along the near edge */}
            {[8, 14.6, 21.2].map((y, i) => (
              <rect key={y} x={-20.4 + i * 0.6} y={y - 0.6} width="11" height="7" rx="3.5" fill={u('skinBody')} />
            ))}
            <g stroke={C.skinShade} strokeWidth=".8" fill="none" opacity=".6">
              <path d="M-12 14 H-9.6 M-11.4 20.6 H-9 M-10.8 27.2 H-8.4" />
            </g>
            <path d="M11 32 C9.4 22 9.2 10 10.6 2 C11.6 -2 17.4 -1.8 18.2 2.4 C19.4 10 19.8 22 20.6 32 Z" fill={u('skinBody')} />
            <path d="M12.2 9 C13.4 7.4 15.6 7.4 16.6 9" stroke={C.skinShade} strokeWidth=".8" fill="none" opacity=".7" />
          </g>
        </g>

        {/* ───────── zzz ───────── */}
        <g data-part="zzz" data-v="drowsy">
          <Z part="zzz-1" x={228} y={42} s={1.8} color={C.navy} />
          <Z part="zzz-2" x={250} y={24} s={1} color={C.navy} />
          <Z part="zzz-3" x={60} y={100} s={1.1} color={C.teal} />
        </g>

        {/* soft window haze */}
        <rect x="0" y="0" width="320" height="260" fill={u('haze')} pointerEvents="none" />
      </g>
    </svg>
  )
}

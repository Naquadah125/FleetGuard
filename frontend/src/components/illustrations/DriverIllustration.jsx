import { useId } from 'react'

/**
 * DriverIllustration — one layered, animatable SVG of the FleetGuard driver
 * in 4 states. All variant layers are always mounted; `state` only switches
 * which ones are visible (CSS keyed on the root `data-state`), so a parent can
 * change state / crossfade with GSAP without remounting.
 *
 * Look (Phase 7, matched to the design mockup): soft-3D "painted" driver in a
 * close crop — head ~half the frame height with its crown near the top edge,
 * natural face proportions, textured black hair with blue-grey sheen strands,
 * green polo, dark seat + headrest, wheel rim across the bottom with both fists
 * on it, and a hazy road / rocks / trees backdrop.
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
 *                       svgOrigin "160 145" (viewBox units; what driverMotion.js uses).
 *      hair-back        crown volume behind the face (static)
 *      hair, face, ears, brows (brow-left, brow-right), nose
 *        hair-strands   inside hair: crown tufts, fringe locks, sheen + strand lines
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
 *  wheel                steering wheel (rim + hub)
 *  hand-left            viewer-left arm + fist on the wheel (all states)
 *  hand-right-wheel     viewer-right arm + fist on the wheel (normal, drowsy)
 *  sleeve-right-raised  re-posed right sleeve (upper arm angled toward the bent elbow); covers
 *                       the static torso sleeve (fatigued + distracted). Static.
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
  skinHi: '#F6CBA0',
  skin: '#E9B98F',
  skinMid: '#DDA578',
  skinShade: '#C98B62',
  skinLine: '#A0603C',
  hair: '#111317',
  hairMid: '#22262D',
  hairHi: '#6E7B8D',
  hairRim: '#8C99AA',
  shirtHi: '#6ED062',
  shirt: '#3FB047',
  shirtDark: '#2A9038',
  shirtDeep: '#1A6B29',
  seatHi: '#4E5764',
  seat: '#2D333D',
  seatDark: '#1A1E25',
  wheel: '#1D2127',
  navy: '#0D2232',
  teal: '#2E9E62',
  lip: '#B5574A',
  mouth: '#4A1618',
  iris: '#2A1A12',
  lash: '#1E1410',
}

/* face outline, reused by the face fill and its clip */
const FACE =
  'M160 33 C187 33 205 50 205 79 C205 97 202 110 193 121 C184 131 172 136.5 160 136.5 C148 136.5 136 131 127 121 C118 110 115 97 115 79 C115 50 133 33 160 33 Z'

/* almond eye opening */
const eyePath = (cx, cy) =>
  `M${cx - 9.4} ${cy + 0.8} C${cx - 7.4} ${cy - 7.6} ${cx + 6.4} ${cy - 8.2} ${cx + 9.4} ${cy - 0.6} C${cx + 6.4} ${cy + 6.8} ${cx - 6.4} ${cy + 7.2} ${cx - 9.4} ${cy + 0.8} Z`

function styles(uid, transition) {
  const t = transition
  const s = `#${uid}`
  return `
${s} [data-v]{opacity:0;${t ? 'transition:opacity .35s ease;' : ''}}
${DRIVER_STATES.map((k) => `${s}[data-state="${k}"] [data-v~="${k}"]`).join(',')}{opacity:1}
${s} [data-part="head-pose"]{transform-box:view-box;transform-origin:160px 150px;${t ? 'transition:transform .5s cubic-bezier(.3,.7,.3,1);' : ''}}
${s}[data-state="drowsy"] [data-part="head-pose"]{transform:translate(-3px,4px) rotate(-11deg)}
${s}[data-state="fatigued"] [data-part="head-pose"]{transform:translate(-1px,1px) rotate(-3deg)}
${s}[data-state="distracted"] [data-part="head-pose"]{transform:translate(1px,2px) rotate(2deg)}
${s} [data-part="pupils-pose"]{${t ? 'transition:transform .4s ease;' : ''}}
${s}[data-state="distracted"] [data-part="pupils-pose"]{transform:translate(1.8px,1.6px)}
${s} [data-part^="brow-"]{transform-box:fill-box;transform-origin:50% 50%;${t ? 'transition:transform .4s ease;' : ''}}
${s}[data-state="drowsy"] [data-part="brow-left"]{transform:translateY(2px) rotate(5deg)}
${s}[data-state="drowsy"] [data-part="brow-right"]{transform:translateY(2px) rotate(-5deg)}
${s}[data-state="fatigued"] [data-part="brow-left"]{transform:translateY(-1.5px) rotate(-10deg)}
${s}[data-state="fatigued"] [data-part="brow-right"]{transform:translateY(-1.5px) rotate(10deg)}
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
      <g fill="#fff" opacity=".32">
        <ellipse cx="-11" cy="1" rx="1.8" ry="3.6" />
        <ellipse cx="-5" cy="1.6" rx="1.8" ry="4" />
        <ellipse cx="1.2" cy="1.8" rx="1.8" ry="4" />
      </g>
      {/* thumb on top of the rim, pointing along it */}
      <path d="M4 -15 C10 -16.6 16 -14.4 17.6 -10 C18.6 -7 16.6 -4.4 13.6 -5 C10.6 -5.6 7 -7 4 -8.4 Z" fill={u('fist')} />
      <path d="M4 -8.4 C7 -7 10.6 -5.6 13.6 -5" stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M14.4 -13.8 C15.8 -12.8 16.6 -11.4 16.6 -10" stroke="#fff" strokeOpacity=".4" strokeWidth="1" fill="none" strokeLinecap="round" />
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

/* Blink lid: covers the eye, scale origin = its top edge (cy - 8). Rests at
   scaleY 0.001 encoded as a matrix so GSAP can tween scaleY -> 1. */
function Lid({ cx, cy, u }) {
  const top = cy - 9
  const s = 0.001
  return (
    <g transform={`matrix(1 0 0 ${s} 0 ${(top * (1 - s)).toFixed(3)})`}>
      <path
        d={`M${cx - 10} ${top} H${cx + 10} V${cy + 2.4} C${cx + 5.6} ${cy + 8.4} ${cx - 5.6} ${cy + 8.6} ${cx - 10} ${cy + 2.8} Z`}
        fill={u('skinFace')}
      />
      <path
        d={`M${cx - 9} ${cy + 3} C${cx - 4.4} ${cy + 7.2} ${cx + 4.4} ${cy + 7.2} ${cx + 9} ${cy + 2.6}`}
        stroke={C.lash}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

export default function DriverIllustration({ state = 'normal', className, title, transition = true }) {
  const uid = `drv${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const u = (n) => `url(#${uid}-${n})`
  const current = DRIVER_STATES.includes(state) ? state : 'normal'
  const label = title ?? TITLES[current]

  const eyeL = { cx: 142.5, cy: 81 }
  const eyeR = { cx: 177.5, cy: 81 }

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
          <stop offset="0" stopColor="#B7CCE2" />
          <stop offset=".5" stopColor="#D3E0EC" />
          <stop offset=".78" stopColor="#E6EDF2" />
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
        <radialGradient id={id('headrest')} cx=".35" cy=".22" r=".9">
          <stop offset="0" stopColor="#58616E" />
          <stop offset=".5" stopColor={C.seat} />
          <stop offset="1" stopColor={C.seatDark} />
        </radialGradient>
        <linearGradient id={id('shirt')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.shirtHi} />
          <stop offset=".3" stopColor={C.shirt} />
          <stop offset="1" stopColor={C.shirtDark} />
        </linearGradient>
        <linearGradient id={id('sleeve')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.shirtHi} />
          <stop offset=".55" stopColor={C.shirt} />
          <stop offset="1" stopColor={C.shirtDark} />
        </linearGradient>
        <linearGradient id={id('shirtSide')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.shirtDeep} stopOpacity=".5" />
          <stop offset=".18" stopColor={C.shirtDeep} stopOpacity="0" />
          <stop offset=".75" stopColor={C.shirtDeep} stopOpacity="0" />
          <stop offset="1" stopColor={C.shirtDeep} stopOpacity=".6" />
        </linearGradient>
        <radialGradient id={id('skinFace')} gradientUnits="userSpaceOnUse" cx="148" cy="80" r="70">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".5" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinMid} />
        </radialGradient>
        <linearGradient id={id('skinBody')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.skinHi} />
          <stop offset=".45" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinShade} />
        </linearGradient>
        <linearGradient id={id('fist')} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor={C.skin} />
          <stop offset=".5" stopColor={C.skin} />
          <stop offset="1" stopColor={C.skinShade} />
        </linearGradient>
        <linearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.skinShade} />
          <stop offset=".5" stopColor={C.skinMid} />
          <stop offset="1" stopColor={C.skin} />
        </linearGradient>
        <radialGradient id={id('hair')} gradientUnits="userSpaceOnUse" cx="140" cy="20" r="96">
          <stop offset="0" stopColor="#353B45" />
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
          <stop offset="0" stopColor="#E0765C" stopOpacity=".2" />
          <stop offset="1" stopColor="#F28C78" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('wheel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A414B" />
          <stop offset=".3" stopColor={C.wheel} />
          <stop offset="1" stopColor="#0E1013" />
        </linearGradient>
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
          <path d="M104 160 C118 151 134 145 147 142 L173 142 C186 145 202 151 216 160 C224 178 228 210 230 262 L90 262 C92 210 96 178 104 160 Z" />
        </clipPath>
        <clipPath id={id('eyesClip')}>
          <path d={eyePath(eyeL.cx, eyeL.cy)} />
          <path d={eyePath(eyeR.cx, eyeR.cy)} />
        </clipPath>
        <clipPath id={id('yawnClip')}>
          <ellipse cx="158" cy="119" rx="9.4" ry="11.2" />
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
              <path d="M236 70 C228 70 226 61 233 59 C233 50 244 46 251 52 C255 40 274 39 279 51 C288 49 296 56 293 63 C300 64 300 70 294 71 Z" />
              <path d="M236 70 H294 C299 72 294 75 288 75 H242 C235 75 233 72 236 70 Z" fill="#DCE5EE" />
            </g>
            <g data-part="cloud-2" opacity=".7">
              <path d="M14 104 C8 104 7 98 13 97 C14 90 23 88 28 93 C31 86 43 86 46 94 C52 93 56 98 52 104 Z" />
            </g>
            <g data-part="cloud-3" opacity=".8">
              <path d="M270 30 C266 30 265 26 269 25 C270 20 276 19 279 22 C281 17 289 17 291 23 C295 23 297 27 294 30 Z" />
            </g>
          </g>
          <g data-part="bg-hills">
            {/* distant tree line */}
            <g fill="#9DB0A2" opacity=".75">
              <path d="M0 196 V178 C6 170 12 172 16 176 C20 166 30 166 34 174 C40 168 48 170 52 178 C58 174 64 178 66 186 V196 Z" />
              <path d="M320 196 V176 C314 168 306 170 302 175 C298 166 288 166 284 174 C278 168 270 170 266 178 C260 174 254 178 252 186 V196 Z" />
            </g>
            {/* rock outcrops at the frame edges */}
            <path d="M0 150 C8 140 16 134 24 138 C34 144 46 166 62 198 H0 Z" fill={u('rock')} />
            <path d="M320 148 C312 138 302 134 294 138 C284 146 272 168 258 198 H320 Z" fill={u('rock')} />
            <path d="M6 148 C12 140 18 138 24 140 C18 148 14 160 12 176 Z" fill="#fff" opacity=".22" />
            <path d="M314 146 C308 140 302 138 296 140 C302 148 306 160 308 176 Z" fill="#fff" opacity=".2" />
            <path d="M30 152 C38 162 46 176 54 196 M290 152 C282 162 274 176 266 196" stroke="#6B7684" strokeOpacity=".4" strokeWidth="1.2" fill="none" />
          </g>
          <g data-part="bg-road">
            <path d="M0 196 C60 194 100 194 160 194 C220 194 260 194 320 196 V260 H0 Z" fill={u('road')} />
            {/* sunlit verge with yellow wildflowers */}
            <path d="M0 197 C30 195 60 195 90 196 L0 222 Z" fill="#D9C27C" opacity=".6" />
            <path d="M320 197 C290 195 260 195 230 196 L320 222 Z" fill="#D9C27C" opacity=".6" />
            <g fill="#F2C14E">
              <circle cx="8" cy="204" r="2.2" />
              <circle cx="20" cy="200" r="1.8" />
              <circle cx="34" cy="198" r="1.6" />
              <circle cx="14" cy="211" r="1.7" />
              <circle cx="48" cy="198" r="1.3" />
              <circle cx="28" cy="206" r="1.4" />
              <circle cx="312" cy="204" r="2.2" />
              <circle cx="300" cy="200" r="1.8" />
              <circle cx="286" cy="198" r="1.6" />
              <circle cx="306" cy="211" r="1.7" />
              <circle cx="272" cy="198" r="1.3" />
              <circle cx="292" cy="206" r="1.4" />
            </g>
            <path d="M0 240 L56 218 M320 240 L264 218" stroke="#fff" strokeWidth="2" opacity=".5" />
          </g>
        </g>

        {/* ───────── seat ───────── */}
        <g data-part="seat">
          <path d="M68 262 L72 128 C72 98 84 78 106 70 C124 64 196 64 214 70 C236 78 248 98 248 128 L252 262 Z" fill={u('seat')} />
          {/* side bolsters: lit on the left, shaded on the right */}
          <path d="M72 128 C72 98 84 78 106 70 C98 88 96 110 98 138 L96 262 H68 Z" fill="#fff" opacity=".1" />
          <path d="M248 128 C248 98 236 78 214 70 C222 88 224 110 222 138 L224 262 H252 Z" fill="#000" opacity=".22" />
          <path d="M80 112 C84 92 94 80 108 74" stroke="#fff" strokeOpacity=".22" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M104 74 C98 92 96 112 98 140 M216 74 C222 92 224 112 222 140" stroke="#000" strokeOpacity=".3" strokeWidth="1.4" fill="none" />
          <rect x="118" y="18" width="84" height="98" rx="34" fill={u('headrest')} />
          <path d="M126 34 C134 24 146 21 158 21" stroke="#fff" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* ───────── torso ───────── */}
        <g data-part="torso">
          <path d="M147 106 L147 150 Q160 158 173 150 L173 106 Z" fill={u('neck')} />
          <ellipse cx="160" cy="136" rx="14" ry="6" fill={C.skinLine} opacity=".32" filter={u('soft')} />
          <path d="M104 160 C118 151 134 145 147 142 L173 142 C186 145 202 151 216 160 C224 178 228 210 230 262 L90 262 C92 210 96 178 104 160 Z" fill={u('shirt')} />
          <g clipPath={u('torsoClip')}>
            <rect x="60" y="140" width="200" height="130" fill={u('shirtSide')} />
            <ellipse cx="128" cy="178" rx="20" ry="14" fill="#fff" opacity=".1" filter={u('soft')} />
            <path d="M118 208 C132 218 146 222 158 222 M180 204 C192 210 200 218 206 228" stroke={C.shirtDeep} strokeOpacity=".3" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* soft shadow cast by the wheel */}
            <path d="M70 222 C100 188 130 178 160 178 C190 178 220 188 250 222 L250 262 H70 Z" fill={C.shirtDeep} opacity=".2" filter={u('soft')} />
          </g>
          {/* neckline */}
          <path d="M147 141 L160 160 L173 141 Z" fill={C.skinMid} />
          <path d="M150.5 141 L160 154 L169.5 141 Z" fill={C.skinShade} opacity=".45" />
          {/* placket */}
          <path d="M156.2 155 H163.8 V181 Q160 183 156.2 181 Z" fill={C.shirtDark} />
          <path d="M156.2 155 V181" stroke={C.shirtDeep} strokeWidth=".8" opacity=".6" />
          <circle cx="160" cy="164" r="1.4" fill="#E8F5EC" />
          <circle cx="160" cy="173" r="1.4" fill="#E8F5EC" />
          {/* polo collar */}
          <path d="M144 141 Q160 135.5 176 141 L175 144.4 Q160 140 145 144.4 Z" fill={C.shirtDark} />
          <path d="M145 141 C141.4 145.6 138.4 150.6 135.6 156 L151 162 L160 156 Z" fill={C.shirt} />
          <path d="M175 141 C178.6 145.6 181.6 150.6 184.4 156 L169 162 L160 156 Z" fill={C.shirt} />
          <path d="M145 141 C141.4 145.6 138.4 150.6 135.6 156 L151 162" stroke={C.shirtDeep} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <path d="M175 141 C178.6 145.6 181.6 150.6 184.4 156 L169 162" stroke={C.shirtDeep} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <path d="M141 147 L138 153" stroke="#fff" strokeOpacity=".35" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M151 162 L160 156 L169 162" fill="none" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" />
          {/* sleeves: upper arms hang beside the torso, a shadowed crease separates them */}
          {[1, -1].map((m) => (
            <g key={m} transform={m === 1 ? undefined : 'matrix(-1 0 0 1 320 0)'}>
              <path d="M103 170 C98 182 95 196 93 212" stroke={C.shirtDeep} strokeOpacity=".55" strokeWidth="4" fill="none" filter={u('soft')} />
              <path d="M114 152 C98 154 84 162 76 176 C70 186 64 196 60 206 L91 212 C92 198 96 184 102 172 C106 164 110 158 114 154 Z" fill={u('sleeve')} />
              <path d="M114 152 C98 154 84 162 76 176 C70 186 64 196 60 206" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" fill="none" />
              <path d="M91 212 C92 198 96 184 102 172 C106 164 110 158 114 154" stroke={C.shirtDeep} strokeOpacity=".75" strokeWidth="1.3" fill="none" />
              <path d="M60 206 L91 212 L90 217 L59 211 Z" fill={C.shirtDark} />
              <path d="M106 156 C94 159 84 166 78 177" stroke="#fff" strokeOpacity=".18" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>

        {/* ───────── head ───────── */}
        <g data-part="head-pose">
          <g data-part="head">
            {/* sky-lit halo + crown volume behind the face */}
            <path
              data-part="hair-back"
              d="M110 68 C100 48 106 20 130 8 C152 0 186 1 202 13 C218 25 220 48 210 68 Z"
              fill={u('hair')}
              stroke="#fff"
              strokeOpacity=".35"
              strokeWidth="2.5"
            />
            <g data-part="ears">
              <path d="M117.5 78 C110 71 102 74 102 85 C102 95 108 103 116.5 104 Z" fill={C.skinMid} />
              <path d="M115 83 C110 79 106.4 82 107 87.6 C107.6 93 110.6 97.6 115 99" stroke={C.skinShade} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7" />
              <path d="M104.6 82 C103.8 88 105.4 95 109 99.6" stroke="#fff" strokeOpacity=".3" strokeWidth="1.1" fill="none" strokeLinecap="round" />
              <path d="M202.5 78 C210 71 218 74 218 85 C218 95 212 103 203.5 104 Z" fill={C.skinMid} />
              <path d="M205 83 C210 79 213.6 82 213 87.6 C212.4 93 209.4 97.6 205 99" stroke={C.skinShade} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".75" />
            </g>
            <g data-part="face">
              <path d={FACE} fill={u('skinFace')} />
              <g clipPath={u('faceClip')}>
                {/* hair shadow on the forehead, right-side form shadow, jaw + chin */}
                <ellipse cx="160" cy="49" rx="46" ry="7" fill={C.skinShade} opacity=".4" filter={u('soft')} />
                <path d="M192 56 C206 78 204 110 180 136 L206 140 L210 56 Z" fill={C.skinShade} opacity=".38" filter={u('soft')} />
                <path d="M114 96 C117 114 128 128 146 137 L124 142 L110 108 Z" fill={C.skinShade} opacity=".28" filter={u('soft')} />
                <ellipse cx="160" cy="139" rx="20" ry="6" fill={C.skinShade} opacity=".45" filter={u('soft')} />
                <ellipse cx="135" cy="103" rx="9" ry="5.4" fill={u('blush')} />
                <ellipse cx="186" cy="103" rx="9" ry="5.4" fill={u('blush')} />
                {/* cheek + forehead light from the window */}
                <ellipse cx="140" cy="54" rx="10" ry="4" fill="#fff" opacity=".22" filter={u('soft')} />
                <ellipse cx="134" cy="97" rx="7" ry="4" fill="#fff" opacity=".2" filter={u('soft')} />
                <path d="M150 128 Q160 132 170 128" stroke="#fff" strokeOpacity=".28" strokeWidth="2" fill="none" strokeLinecap="round" filter={u('soft')} />
              </g>
              <path d="M118 96 C121 112 131 125 146 133" stroke={C.skinLine} strokeOpacity=".25" strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M202 96 C199 112 189 125 174 133" stroke={C.skinLine} strokeOpacity=".35" strokeWidth="1" fill="none" strokeLinecap="round" />
              <g data-part="phone-light" data-v="distracted">
                <path d="M176 104 C190 104 202 112 204 124 C196 136 180 140 170 136 C174 126 174 112 176 104 Z" fill="#C9FBEF" opacity=".16" filter={u('soft')} clipPath={u('faceClip')} />
              </g>
            </g>
            <g data-part="nose">
              <path d="M163 87 C164.6 92.5 165.8 97.5 164.6 101.4" fill="none" stroke={C.skinShade} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
              <path d="M154.6 102.6 C156.4 105.4 163.6 105.4 165.4 102.6" fill="none" stroke={C.skinLine} strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
              <path d="M153.2 101 C152 102.2 152.4 103.8 153.8 104.2 M166.8 101 C168 102.2 167.6 103.8 166.2 104.2" stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".7" />
              <ellipse cx="160" cy="102.6" rx="6" ry="2.6" fill={C.skinShade} opacity=".3" filter={u('soft')} />
              <ellipse cx="158.6" cy="97" rx="1.8" ry="3" fill="#fff" opacity=".38" />
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
                        <circle cx={e.cx + 0.4} cy={e.cy + 0.4} r="5.3" fill={u('iris')} />
                        <circle cx={e.cx + 0.4} cy={e.cy + 0.4} r="2.7" fill="#0B0705" />
                        <circle cx={e.cx + 2.4} cy={e.cy - 1.8} r="1.8" fill="#fff" />
                        <circle cx={e.cx - 1.2} cy={e.cy + 2} r=".6" fill="#fff" opacity=".8" />
                      </g>
                    ))}
                  </g>
                </g>
                {/* upper-lid shadow on the eyeball */}
                {[eyeL, eyeR].map((e) => (
                  <ellipse key={e.cx} cx={e.cx} cy={e.cy - 6.6} rx="10.5" ry="3.4" fill="#8A6A5A" opacity=".22" />
                ))}
              </g>
              <g fill="none" stroke={C.lash} strokeLinecap="round">
                {/* lash line, thicker toward the outer corner; lid crease above */}
                <path d={`M${eyeL.cx - 10.2} ${eyeL.cy + 0.6} C${eyeL.cx - 7.6} ${eyeL.cy - 7.8} ${eyeL.cx + 6} ${eyeL.cy - 8.6} ${eyeL.cx + 9.4} ${eyeL.cy - 1}`} strokeWidth="2.4" />
                <path d={`M${eyeR.cx - 9.4} ${eyeR.cy - 1} C${eyeR.cx - 6} ${eyeR.cy - 8.6} ${eyeR.cx + 7.6} ${eyeR.cy - 7.8} ${eyeR.cx + 10.2} ${eyeR.cy + 0.6}`} strokeWidth="2.4" />
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
                    <path d={`M${e.cx - 8.4} ${e.cy - 0.4} C${e.cx - 4} ${e.cy + 4.6} ${e.cx + 4} ${e.cy + 4.6} ${e.cx + 8.4} ${e.cy - 0.4}`} strokeWidth="2.1" />
                    <path d={`M${e.cx + d * 4} ${e.cy + 3.4} l${d * 1.4} 2.4 M${e.cx + d * 7.4} ${e.cy + 1.2} l${d * 1.8} 1.8`} strokeWidth="1.2" />
                    <path d={`M${e.cx - 7} ${e.cy - 5} C${e.cx - 3} ${e.cy - 7} ${e.cx + 3} ${e.cy - 7} ${e.cx + 7} ${e.cy - 5}`} stroke={C.skinShade} strokeWidth="1" opacity=".75" />
                  </g>
                )
              })}
            </g>
            <g data-part="eyes-squint" data-v="fatigued">
              {[eyeL, eyeR].map((e, i) => {
                const lid = i ? 1.6 : -0.4 // viewer-right eye droops more
                return (
                  <g key={e.cx}>
                    <path d={`M${e.cx - 8} ${e.cy + 1} C${e.cx - 5} ${e.cy + 4.8} ${e.cx + 5} ${e.cy + 4.8} ${e.cx + 8} ${e.cy + 0.6} L${e.cx + 8} ${e.cy + lid} L${e.cx - 8} ${e.cy + lid} Z`} fill={u('eyeWhite')} />
                    <circle cx={e.cx + 0.4} cy={e.cy + 2.4} r={i ? 3.4 : 4} fill={u('iris')} />
                    <circle cx={e.cx + 0.4} cy={e.cy + 2.4} r="1.8" fill="#0B0705" />
                    <path d={`M${e.cx - 9.5} ${e.cy - 8} H${e.cx + 9.5} V${e.cy + lid} C${e.cx + 4} ${e.cy + lid + 1.4} ${e.cx - 4} ${e.cy + lid + 1.4} ${e.cx - 9.5} ${e.cy + lid} Z`} fill={u('skinFace')} />
                    <path d={`M${e.cx - 8.6} ${e.cy + lid + 0.4} C${e.cx - 4} ${e.cy + lid + 1.8} ${e.cx + 4} ${e.cy + lid + 1.8} ${e.cx + 8.6} ${e.cy + lid}`} stroke={C.lash} strokeWidth="2.1" fill="none" strokeLinecap="round" />
                    <path d={`M${e.cx - 6} ${e.cy - 4} C${e.cx - 2} ${e.cy - 6} ${e.cx + 2} ${e.cy - 6} ${e.cx + 6} ${e.cy - 4}`} stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".8" />
                    <path d={`M${e.cx - 6} ${e.cy + 8.5} C${e.cx - 2} ${e.cy + 10.4} ${e.cx + 2} ${e.cy + 10.4} ${e.cx + 6} ${e.cy + 8.5}`} stroke={C.skinShade} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".7" />
                  </g>
                )
              })}
            </g>

            <g data-part="brows" fill="#141210">
              <path data-part="brow-left" d="M129.4 67 C131.6 59.4 142 56 154.6 58.8 C156.6 59.3 156.4 64.6 154.2 64.6 C145 63.8 137.6 65.2 132.6 69.8 C130.8 71.2 128.8 69 129.4 67 Z" />
              <path data-part="brow-right" d="M190.6 67 C188.4 59.4 178 56 165.4 58.8 C163.4 59.3 163.6 64.6 165.8 64.6 C175 63.8 182.4 65.2 187.4 69.8 C189.2 71.2 191.2 69 190.6 67 Z" />
            </g>

            {/* mouths */}
            <g data-part="mouth-smile" data-v="normal distracted">
              <path d="M146.6 110.6 C151.6 122.4 168.4 122.4 173.4 110.6 C165 113.6 155 113.6 146.6 110.6 Z" fill={C.mouth} />
              <path d="M149.4 112 C155 114.2 165 114.2 170.6 112 L169.8 113.8 C164 115.8 156 115.8 150.2 113.8 Z" fill="#fff" opacity=".9" />
              <path d="M153.6 119.2 C157 117 163 117 166.4 119.2 C163.6 121 156.4 121 153.6 119.2 Z" fill="#D9645A" />
              <path d="M152.6 121.4 C157 123.8 163 123.8 167.4 121.4" stroke="#C9745E" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".5" />
              <path d="M145.2 109.6 Q146.4 111.6 147.8 111.8 M174.8 109.6 Q173.6 111.6 172.2 111.8" stroke={C.skinLine} strokeWidth="1" strokeLinecap="round" opacity=".6" />
              <path d="M155 126 Q160 127.8 165 126" stroke={C.skinShade} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".7" />
            </g>
            <g data-part="mouth-relaxed" data-v="drowsy">
              <path d="M154 116.6 C158 114.8 165 115 168.6 117.4 C166 122.6 158.4 123 155.2 120.2 C154 119.2 153.6 117.8 154 116.6 Z" fill={C.mouth} />
              <path d="M156.4 119.6 C159.6 118.4 164 118.6 166.4 119.8 C163.6 122.2 159 122 156.4 119.6 Z" fill="#D86A60" />
              <path d="M154 116.6 C158 114.8 165 115 168.6 117.4" stroke={C.lip} strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M156 125.4 Q161 127 166 125.2" stroke={C.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".7" />
            </g>
            <g data-part="mouth-yawn" data-v="fatigued">
              <ellipse cx="158" cy="119" rx="10" ry="11.8" fill={C.lip} />
              <ellipse cx="158" cy="119" rx="9.4" ry="11.2" fill={C.mouth} />
              <g data-part="mouth-yawn-inner" clipPath={u('yawnClip')}>
                <path d="M149 107 H167 V111.4 C163 113 153 113 149 111.4 Z" fill="#fff" />
                <path d="M152 111.8 V109 M156 112.6 V109 M160 112.6 V109 M164 111.8 V109" stroke="#D9D4CF" strokeWidth=".5" />
                <ellipse cx="158" cy="128.6" rx="7" ry="5.4" fill="#E9744A" />
                <path d="M158 125.4 V129" stroke="#B9473A" strokeWidth=".8" />
              </g>
            </g>

            <g data-part="hair">
              {/* side part on the viewer-left; locks flow diagonally over the crown to the viewer-right */}
              <path
                d="M118 74 C113 70 109 64 108 57 C106 50 106 44 108 38 C106 31 108 24 114 20 C118 13 126 9 134 7 C142 4 150 3 156 3 C168 3 182 6 192 11 C202 16 209 25 211 35 C214 45 213 55 209 63 C206 68 203 71 200 73 C198 66 196 60 193 55 C189 50 184 48 178 47 C170 46 162 46 154 47 C146 47 138 48 131 51 C126 54 123 58 121 63 C119 67 118 71 118 74 Z"
                fill={u('hair')}
              />
              <g data-part="hair-strands">
                {/* silhouette bumps + jagged fringe tips */}
                <g fill={u('hair')}>
                  <path d="M106 42 C104 32 108 24 116 19 C113 26 112 32 112.4 40 Z" />
                  <path d="M194 12 C203 16 209 24 212 33 C206 27 200 23 192 19 Z" />
                  <path d="M164 45 C170 46 175 49 178 54 C172 51 166 50 160 50 Z" />
                  <path d="M142 46 C148 46 153 48 156 52 C150 50 144 50 138 51 Z" />
                  <path d="M184 47 C190 50 195 55 198 62 C193 57 187 54 181 52 Z" />
                  <path d="M126 53 C122 57 120 62 120 68 C123 63 126 59 130 56 Z" />
                </g>
                {/* broad light on the upper-left of the dome */}
                <ellipse cx="136" cy="22" rx="24" ry="11" transform="rotate(-20 136 22)" fill={C.hairHi} opacity=".45" filter={u('blur')} />
                {/* dark gaps between locks, flowing from the part down to the right */}
                <g fill="none" stroke="#07080A" strokeWidth="1.2" strokeLinecap="round" opacity=".55">
                  <path d="M132 11 C150 17 166 31 175 47" />
                  <path d="M152 7 C171 13 186 27 193 46" />
                  <path d="M120 24 C135 30 147 39 154 48" />
                  <path d="M177 7 C193 15 203 27 207 42" />
                  <path d="M111 38 C120 42 129 47 136 51" />
                  <path d="M128 9 C126 15 124 20 122 25" />
                </g>
                {/* blue-grey highlight strands along the locks */}
                <g fill="none" stroke={C.hairHi} strokeLinecap="round">
                  <path d="M128 14 C146 20 161 33 170 47" strokeOpacity=".7" strokeWidth="1.6" />
                  <path d="M147 9 C166 15 181 28 188 45" strokeOpacity=".6" strokeWidth="1.4" />
                  <path d="M117 28 C131 33 142 41 148 49" strokeOpacity=".6" strokeWidth="1.3" />
                  <path d="M171 7 C187 14 198 25 203 38" strokeOpacity=".5" strokeWidth="1.2" />
                  <path d="M110 44 C116 46 122 49 128 53" strokeOpacity=".45" strokeWidth="1.1" />
                </g>
                <g fill="none" stroke={C.hairRim} strokeLinecap="round" strokeOpacity=".5">
                  <path d="M107 50 C105 41 108 31 114 24" strokeWidth="1.1" />
                  <path d="M122 12 C134 6 146 3 158 3" strokeWidth="1" />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* re-posed right sleeve for the raised-forearm states: covers the static torso sleeve */}
        <g data-part="sleeve-right-raised" data-v="fatigued distracted">
          <path d="M206 152 C222 154 236 162 244 176 C250 186 256 196 261 206 L229 213 C228 199 224 185 218 173 C214 165 210 158 206 154 Z" fill={u('sleeve')} />
          <path d="M206 152 C222 154 236 162 244 176 C250 186 256 196 261 206 M229 213 C230 200 226 188 220 178" stroke={C.shirtDeep} strokeOpacity=".5" strokeWidth="1" fill="none" />
          <path d="M261 206 L229 213 L230 218 L262 211 Z" fill={C.shirtDark} />
          <path d="M218 155 C234 158 246 166 252 180" stroke="#fff" strokeOpacity=".16" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <g stroke={C.shirtDeep} strokeOpacity=".45" strokeWidth="1.3" fill="none" strokeLinecap="round">
            <path d="M234 192 C240 198 248 202 256 202" />
            <path d="M240 182 C246 188 252 192 259 192" />
          </g>
        </g>

        <g data-part="hand-right-cheek" data-v="fatigued">
          {/* forearm: wrist under the jaw → rounded elbow below the sleeve hem, soft cast shadow */}
          <path d="M212 146 C224 162 246 182 258 210 L242 226 C228 202 212 176 200 156 Z" fill={C.shirtDeep} opacity=".22" filter={u('soft')} />
          <path d="M206 140 C218 154 242 176 254 205 C257 213 255 221 249 223 C243 225 237 223 234 219 C224 202 206 172 194 150 Z" fill={u('skinBody')} />
          <path d="M234 218 C224 201 207 172 196 152" stroke={C.skinShade} strokeWidth="1.6" fill="none" opacity=".6" strokeLinecap="round" />
          <path d="M210 146 C220 157 238 173 248 194" stroke="#fff" strokeOpacity=".3" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M242 216 C246 218 250 217 252 213" stroke={C.skinShade} strokeWidth="1.2" fill="none" opacity=".6" strokeLinecap="round" />
          <g transform="translate(188 125) rotate(-12) scale(1.12)">
            {/* back of the hand pressed to the cheek, fingers up */}
            <path d="M-12 6 C-13 -5 -11 -12 -5 -14 L8 -14 C13 -12 15 -5 14 6 C13 14 7 18 0 18 C-7 18 -11 13 -12 6 Z" fill={u('skinBody')} />
            {[-7.8, -2.6, 2.6, 7.8].map((x, i) => (
              <rect key={x} x={x - 2.8} y={-31 + [5, 0, 1, 6][i]} width="5.6" height={23 - [5, 0, 1, 6][i]} rx="2.8" fill={u('skinBody')} />
            ))}
            <g stroke={C.skinShade} strokeWidth=".9" fill="none" opacity=".75">
              <path d="M-5.2 -24 V-12 M0 -29 V-12 M5.2 -28 V-12" />
            </g>
            <g fill={C.skinShade} opacity=".5">
              {[-7.8, -2.6, 2.6, 7.8].map((x, i) => (
                <ellipse key={x} cx={x} cy={-27 + [5, 0, 1, 6][i]} rx="1.6" ry="1.2" />
              ))}
            </g>
            <path d="M-12 3 C-17 -1 -20 -7 -18 -10 C-16 -12 -13 -9 -11 -5" fill={u('skinBody')} stroke={C.skinShade} strokeWidth=".8" />
            <ellipse cx="-2" cy="-3" rx="6" ry="4" fill="#fff" opacity=".2" />
          </g>
        </g>

        <g data-part="hand-right-phone" data-v="distracted">
          {/* forearm from the elbow (below the frame, crossing behind the rim) up to the wrist */}
          <path d="M210 184 C222 198 240 228 248 262 L276 262 C270 232 250 200 228 174 Z" fill={C.shirtDeep} opacity=".22" filter={u('soft')} transform="translate(4 4)" />
          <path d="M204 186 C214 200 232 230 240 262 L272 262 C266 232 248 200 226 172 Z" fill={u('skinBody')} />
          <path d="M242 262 C234 232 218 203 207 188" stroke={C.skinShade} strokeWidth="1.6" fill="none" opacity=".55" strokeLinecap="round" />
          <path d="M226 180 C240 198 254 226 260 252" stroke="#fff" strokeOpacity=".28" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* wristwatch */}
          <path d="M212 202 L231 186 L236 193 L217 209 Z" fill="#2B3138" />
          <rect x="-5" y="-4.4" width="10" height="8.8" rx="2.4" fill="#C9A54C" transform="translate(224 197) rotate(-40)" />
          <rect x="-3.4" y="-3" width="6.8" height="6" rx="1.6" fill="#1D3B36" transform="translate(224 197) rotate(-40)" />
          <ellipse data-part="phone-glow" cx="199" cy="146" rx="24" ry="19" fill={u('glow')} />
          <g transform="translate(202 155) rotate(12) scale(.95)">
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

        {/* ───────── wheel ───────── */}
        <g data-part="wheel">
          <path d="M114 262 C116 240 135 230 160 230 C185 230 204 240 206 262 Z" fill={u('wheel')} />
          <path d="M140 235 C150 232 170 232 180 235" stroke="#fff" strokeOpacity=".2" strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="160" cy="286" rx="100" ry="104" fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="24" filter={u('soft')} transform="translate(0 4)" />
          <ellipse cx="160" cy="286" rx="100" ry="104" fill="none" stroke={u('wheel')} strokeWidth="17" />
          <path d="M68 232 A104 112 0 0 1 252 232" fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* ───────── hands ───────── */}
        <g data-part="hand-left">
          <path d="M60 208 C56 220 57 234 62 246 L90 238 C89 228 89 220 91 212 Z" fill={u('skinBody')} />
          <path d="M61 212 C59 222 60 232 63 240" stroke={C.skinShade} strokeWidth="1.4" fill="none" opacity=".6" />
          <g transform="translate(78 228) rotate(-57) scale(1.32)">
            <Fist u={u} />
          </g>
        </g>

        <g data-part="hand-right-wheel" data-v="normal drowsy">
          <path d="M260 208 C264 220 263 234 258 246 L230 238 C231 228 231 220 229 212 Z" fill={u('skinBody')} />
          <path d="M259 212 C261 222 260 232 257 240" stroke={C.skinShade} strokeWidth="1.4" fill="none" opacity=".6" />
          <g transform="translate(242 228) scale(-1.32 1.32) rotate(-57)">
            <Fist u={u} />
          </g>
        </g>

        {/* ───────── zzz ───────── */}
        <g data-part="zzz" data-v="drowsy">
          <Z part="zzz-1" x={226} y={40} s={1.9} color={C.navy} />
          <Z part="zzz-2" x={250} y={22} s={1} color={C.navy} />
          <Z part="zzz-3" x={56} y={98} s={1.1} color={C.teal} />
        </g>

        {/* soft window haze */}
        <rect x="0" y="0" width="320" height="260" fill={u('haze')} pointerEvents="none" />
      </g>
    </svg>
  )
}

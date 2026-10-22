/**
 * SedanCar3Q — white four-door sedan in FRONT THREE-QUARTER view: nose toward the viewer at
 * lower-left, right flank receding to the upper-right (Pricing road, design mockup).
 * Soft "painted 3D" look: white paint with cool blue-grey form shading, dark tinted glass.
 * Static: no animation inside.
 *
 * data-part hooks (for GSAP, pivots in viewBox units — use `svgOrigin`):
 *   body    paint, glass, lights, trim. Suspension bob: `y` ±1.5; pitch with
 *           `rotation` ±1 around svgOrigin "150 186" (front-right contact patch)
 *   wheels  group of both visible wheels (front-right + rear-right). Keep still or
 *           nudge `y` with the body; wheels are seen edge-on so do NOT spin them
 *   shadow  soft ground shadow; scale with svgOrigin "150 190" against the bob
 *   glint   headlight + windshield highlights; animate `opacity` (0.35 to 1) for a glint
 *
 * viewBox 20 26 254 172 (car bbox ≈ x 26–270, y 32–196).
 */
import { useId } from 'react'

const SILHOUETTE =
  'M36 176 C30 170 26 156 27 140 C27 130 30 123 40 118 L80 91 C89 72 100 56 110 46 C116 38 124 34 132 33 L206 32 C220 33 233 41 244 50 L258 55 C266 58 270 66 269 80 L266 112 C265 119 260 123 253 125 L178 181 C174 187 168 190 160 190 L52 182 C44 181 39 179 36 176 Z'

export default function SedanCar3Q({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="20 26 254 172" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <filter id={id('blur')} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <linearGradient id={id('hood')} x1="0.3" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#F3F6F9" />
          <stop offset="0.45" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F2F5F8" />
        </linearGradient>
        <linearGradient id={id('front')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#EEF2F6" />
          <stop offset="1" stopColor="#C9D3DE" />
        </linearGradient>
        <linearGradient id={id('side')} x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0" stopColor="#F4F6F8" />
          <stop offset="0.5" stopColor="#E3E8EE" />
          <stop offset="1" stopColor="#C3CEDA" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#2B323B" />
          <stop offset="0.6" stopColor="#0E1217" />
          <stop offset="1" stopColor="#05070A" />
        </linearGradient>
        <linearGradient id={id('grille')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6B7385" />
          <stop offset="1" stopColor="#3E4454" />
        </linearGradient>
        <linearGradient id={id('lamp')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D5DEE8" />
        </linearGradient>
        <radialGradient id={id('rim')} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#F4F7FA" />
          <stop offset="0.7" stopColor="#C7D0D9" />
          <stop offset="1" stopColor="#8C98A6" />
        </radialGradient>
        <clipPath id={id('clip')}>
          <path d={SILHOUETTE} />
        </clipPath>
      </defs>

      <path
        data-part="shadow"
        d="M30 178 C60 190 140 196 174 192 C210 168 246 140 270 120 C262 114 244 116 224 128 L150 166 Z"
        fill="#5E7489"
        opacity="0.42"
        filter={url('blur')}
      />

      <g data-part="body">
        <path d={SILHOUETTE} fill={url('side')} />
        <g clipPath={url('clip')}>
          {/* right flank (receding): beltline light, character crease, rocker shade */}
          <path d="M166 127 L196 93 L262 54 L276 60 L272 122 L178 192 L166 190 Z" fill={url('side')} />
          <path d="M197 95 C220 82 242 69 262 57" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <path d="M168 140 C200 120 232 100 266 80" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
          <path d="M170 150 C204 129 234 109 268 88" stroke="#A9B6C4" strokeOpacity="0.35" strokeWidth="1" />
          <path d="M174 180 L254 121 L276 117 L276 140 L180 198 Z" fill="#9FADBC" opacity="0.5" />
          {/* door seams + handles */}
          <g stroke="#9AA8B7" strokeWidth="0.9" strokeOpacity="0.4">
            <path d="M212 86 C214 110 214 132 212 154" />
            <path d="M234 73 C236 95 236 118 234 138" />
          </g>
          <path d="M199 109 l7 -4.5" stroke="#AEBAC7" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M221 95 l6 -4" stroke="#AEBAC7" strokeWidth="2" strokeLinecap="round" />
          {/* hood */}
          <path d="M80 90 L191 93 L166 127 L26 121 C30 119 35 118 40 117 Z" fill={url('hood')} />
          <path d="M58 106 C90 101 150 101 178 111" stroke="#DCE3EA" strokeWidth="1.2" />
          <path d="M96 93 C92 102 90 112 90 124" stroke="#E2E8EE" strokeWidth="1" />
          {/* front face */}
          <path d="M26 121 L166 127 L171 190 L30 180 Z" fill={url('front')} />
        </g>

        {/* roof + sunroof */}
        <path d="M112 46 C118 38 125 34 133 33.5 L205 32.5 C214 33 224 38 232 46 Z" fill="#F7F9FB" />
        <path d="M131 41.5 C133 37 136 35 141 35 L200 34.5 C203 34.6 206 37 207 41 Z" fill="#0E1217" />
        {/* windshield */}
        <path d="M111 46 L197 45.5 L190 93 L80 90 Z" fill={url('glass')} />
        {/* side glass with B-pillar */}
        <path d="M201 45 C215 46 228 49 238 54 L243 59 L242 64 L195 92 Z" fill={url('glass')} />
        <path d="M218 46 L219 79" stroke="#E9EEF3" strokeWidth="2.6" />
        <path d="M199 44.5 L192.5 94" stroke="#F4F7FA" strokeWidth="3" />
        {/* mirrors */}
        <path d="M80 84 L88 86 L86 90 L79 88 Z" fill="#C3CDD8" />
        <path d="M68 82 C68 77 72 74 77 75 L84 78 L82 86 C76 87 70 86 68 82 Z" fill="#F4F7FA" />
        <path d="M69 82 C72 85 78 85 82 84" stroke="#B9C4D0" strokeWidth="1" />
        <path d="M198 90 C200 84 205 82 210 83 L212 90 C208 93 202 94 198 90 Z" fill="#E5EAF0" />
        {/* headlights */}
        <path d="M30 122 L55 123.5 C55 129 52 134 47 135 L33 133 C30 131 29 127 30 122 Z" fill={url('lamp')} stroke="#C3CDD8" strokeWidth="0.7" />
        <path d="M114 126 L165 128.5 C165 134 161 140 155 141 L124 139 C118 137 114 132 114 126 Z" fill={url('lamp')} stroke="#C3CDD8" strokeWidth="0.7" />
        <path d="M148 134 L160 134.6" stroke="#FCD9A6" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        {/* grille + emblem */}
        <path d="M50 141 C50 139 52 138 54 138 L109 140.5 C111 140.6 112 142 112 144 L111 154 C111 156 109 157 107 157 L54 154 C52 154 51 153 51 151 Z" fill={url('grille')} />
        <g stroke="#8E97A8" strokeWidth="0.9" opacity="0.85">
          <path d="M54 143.5 L109 146" />
          <path d="M54 148 L109 150.5" />
        </g>
        <ellipse cx="81" cy="147.5" rx="4" ry="2.6" fill="#D6DCE4" stroke="#5A6272" strokeWidth="0.8" />
        {/* lower intake, fog lamps, bumper lip */}
        <path d="M42 167 L117 172 C118.5 172.5 118.5 177 117 180 L50 176.5 C44 176 41 171 42 167 Z" fill="#2E3440" />
        <path d="M128 176 L152 177.5 C153 179.5 152 181.5 150 181.5 L130 180.5 C128 179.5 127 178 128 176 Z" fill="#3A414D" />
        <ellipse cx="36" cy="161" rx="3.4" ry="2.4" fill="#B9C4D0" />
        <path d="M34 178 L162 187" stroke="#B4C0CD" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <g data-part="wheels">
        {/* rear-right */}
        <ellipse cx="251" cy="104" rx="12" ry="21" transform="rotate(14 251 104)" fill="#2A323C" />
        <ellipse cx="252" cy="106" rx="9.5" ry="19.5" transform="rotate(14 252 106)" fill="#1C222A" />
        <ellipse cx="253.5" cy="106.5" rx="6.8" ry="15.5" transform="rotate(14 253.5 106.5)" fill={url('rim')} />
        {/* front-right */}
        <ellipse cx="180" cy="157" rx="16" ry="30" transform="rotate(10 180 157)" fill="#2A323C" />
        <ellipse cx="182" cy="161" rx="13" ry="28" transform="rotate(10 182 161)" fill="#1C222A" />
        <ellipse cx="185" cy="162" rx="10" ry="22.5" transform="rotate(10 185 162)" fill={url('rim')} />
        <g stroke="#9AA6B3" strokeWidth="1.1" opacity="0.9" transform="rotate(10 185 162)">
          <path d="M185 142 L185 182" />
          <path d="M177.5 150 L192.5 174" />
          <path d="M192.5 150 L177.5 174" />
        </g>
        <ellipse cx="185" cy="162" rx="2.6" ry="4.6" transform="rotate(10 185 162)" fill="#7D8896" />
      </g>

      <g data-part="glint" stroke="#FFFFFF" strokeLinecap="round">
        <path d="M120 52 L100 86" strokeWidth="5" opacity="0.14" />
        <path d="M132 52 L116 80" strokeWidth="2" opacity="0.18" />
        <path d="M119 129 L145 130.4" strokeWidth="1.6" />
        <path d="M34 124.5 L49 125.6" strokeWidth="1.4" />
      </g>
    </svg>
  )
}

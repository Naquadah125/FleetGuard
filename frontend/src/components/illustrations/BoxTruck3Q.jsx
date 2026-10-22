/**
 * BoxTruck3Q — cab-over box truck in FRONT THREE-QUARTER view: green cab facing the viewer
 * at right, grey/silver cargo box receding to the left (Pricing road, design mockup — the
 * box may be cut by the right pricing card). Soft "painted 3D" look, light from the left.
 * Static: no animation inside.
 *
 * data-part hooks (for GSAP, pivots in viewBox units — use `svgOrigin`):
 *   body    everything that rides on the suspension (box + cab + chassis). Bob `y` ±1.5,
 *           pitch `rotation` ±0.8 around svgOrigin "250 210" (front axle contact)
 *   box     cargo box (inside body) — optional lag sway `rotation` ±0.6, svgOrigin "162 182"
 *   cab     cab (inside body) — optional nod `rotation` ±0.8, svgOrigin "225 180"
 *   wheels  group of the visible wheels; edge-on ellipses, do NOT spin them
 *   shadow  soft ground shadow; scale against the bob with svgOrigin "200 214"
 *   glint   windshield sheen + headlight cores; animate `opacity` (0.35 to 1)
 *
 * viewBox 34 38 298 190 (truck bbox ≈ x 38–328, y 43–224).
 */
import { useId } from 'react'

export default function BoxTruck3Q({ className, title, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = (n) => `${uid}-${n}`
  const url = (n) => `url(#${id(n)})`
  const a11y = title
    ? { role: 'img', 'aria-labelledby': id('title') }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg viewBox="34 38 298 190" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...a11y} {...props}>
      {title ? <title id={id('title')}>{title}</title> : null}
      <defs>
        <filter id={id('blur')} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <linearGradient id={id('boxSide')} x1="0" y1="0" x2="0.1" y2="1">
          <stop offset="0" stopColor="#D3D7DA" />
          <stop offset="0.45" stopColor="#B9BDC0" />
          <stop offset="1" stopColor="#9EA2A8" />
        </linearGradient>
        <linearGradient id={id('boxFront')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7C828A" />
          <stop offset="1" stopColor="#5E636B" />
        </linearGradient>
        <linearGradient id={id('cabSide')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#1DD3A4" />
          <stop offset="0.5" stopColor="#0FB98C" />
          <stop offset="1" stopColor="#0B9A74" />
        </linearGradient>
        <linearGradient id={id('fairing')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12CF97" />
          <stop offset="0.35" stopColor="#05BC84" />
          <stop offset="0.75" stopColor="#088C66" />
          <stop offset="1" stopColor="#0A7556" />
        </linearGradient>
        <linearGradient id={id('cabFront')} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#0BA27A" />
          <stop offset="0.6" stopColor="#088A66" />
          <stop offset="1" stopColor="#067A5A" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#3B4047" />
          <stop offset="1" stopColor="#1C1F23" />
        </linearGradient>
        <radialGradient id={id('rim')} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#E3E8EC" />
          <stop offset="0.7" stopColor="#A9B1B9" />
          <stop offset="1" stopColor="#6E7780" />
        </radialGradient>
      </defs>

      <path
        data-part="shadow"
        d="M42 176 L170 190 L230 206 C270 214 312 216 328 210 C330 220 300 226 250 226 L170 214 L44 190 Z"
        fill="#4E6377"
        opacity="0.45"
        filter={url('blur')}
      />

      <g data-part="body">
        <g data-part="box">
          {/* chassis rail + tank under the box */}
          <path d="M42 166 L178 174 L178 192 L42 182 Z" fill="#2B2F35" />
          <path d="M60 172 L104 175 C106 175 107 177 107 179 L107 184 L60 181 C58 181 57 179 57 177 L57 175 C57 173 58 172 60 172 Z" fill="#8D949C" />
          {/* box side + front edge strip */}
          <path d="M40 50 L162 44 L162 175 L40 167 Z" fill={url('boxSide')} />
          <path d="M162 44 L268 45 L268 100 L162 100 Z" fill={url('boxFront')} />
          <path d="M162 44 L178 44 L178 176 L162 175 Z" fill={url('boxFront')} />
          <path d="M40 50 L162 44 L268 45" stroke="#E6E9EC" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M162 44 L162 175" stroke="#E3E6E9" strokeWidth="1.2" />
          <path d="M40 166 L162 174" stroke="#7F858C" strokeWidth="2" />
          <g stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1">
            <path d="M72 48.5 L72 169" />
            <path d="M102 47 L102 171" />
            <path d="M132 45.5 L132 173" />
          </g>
          <path d="M40 50 L40 167" stroke="#8A9097" strokeWidth="1.4" />
        </g>

        <g data-part="cab">
          {/* side face */}
          <path d="M178 58 C178 52 182 50 188 50 L226 50 L226 182 L178 175 Z" fill={url('cabSide')} />
          <path d="M178 58 C178 52 182 50 188 50 L216 50 C221 64 224 80 226 94 L178 96 Z" fill="#3FE0B6" opacity="0.45" />
          <path d="M216 51 C221 64 224 80 226 94" stroke="#0A9E76" strokeWidth="1" opacity="0.6" />
          {/* roof fairing + front face */}
          <path d="M225 50 L278 49 C298 50 311 66 316 91 L226 92 Z" fill={url('fairing')} />
          <path d="M226 51 L277 50 C292 51 301 58 306 66" stroke="#5DEBC2" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
          <path d="M226 91 L318 89 L322 178 L225 182 Z" fill={url('cabFront')} />
          <path d="M226 52 L226 172" stroke="#6FE8C4" strokeWidth="1" opacity="0.35" />
          {/* door window + inner mirror */}
          <path d="M194 96 C194 93 196 92 199 92 L222 92 L222 140 L201 140 C197 140 195 138 195 135 Z" fill={url('glass')} />
          <path d="M209 112 C209 108 211 107 213 107 L216 107 C218 107 219 108 219 110 L219 128 C219 130 218 131 216 131 L213 131 C211 131 209 130 209 128 Z" fill="#9AA3AD" />
          {/* door seam, handle, step */}
          <path d="M190 96 L190 172" stroke="#0A8B66" strokeWidth="1.2" />
          <rect x="196" y="146" width="10" height="2.6" rx="1.3" fill="#0A7E5E" />
          <path d="M184 166 C182 172 186 176 192 176 L222 180" stroke="#0A7E5E" strokeWidth="1.4" />
          {/* windshield with dark wiper "V" */}
          <path d="M230 93 L315 91 C317 106 318 124 318 138 C290 142 258 143 231 142 Z" fill={url('glass')} />
          <path d="M236 141.6 Q262 128 273 93 Q284 128 314 139 Z" fill="#08090B" />
          <path d="M226 92 L229 142" stroke="#0FB88A" strokeWidth="3" />
          {/* emblem, grille */}
          <path d="M272 145 L279 145 L275.5 151 Z" fill="#7DF0CB" opacity="0.8" />
          <path d="M248 155 C248 153 249 152 251 152 L303 151 C305 151 306 152 306 154 L306 166 C306 168 305 169 303 169 L251 170 C249 170 248 169 248 167 Z" fill="#14292A" />
          <g stroke="#2B4A47" strokeWidth="1.1">
            <path d="M251 156 L303 155.4" />
            <path d="M251 160.4 L303 159.8" />
            <path d="M251 164.8 L303 164.2" />
          </g>
          {/* black lower skirt wrapping the side, bumper, plate */}
          <path d="M178 170 L226 176 L226 196 L178 188 Z" fill="#1A1C20" />
          <path d="M224 180 L323 176 C325 176 326 178 326 180 L326 200 C326 203 324 205 321 205 L230 209 C226 209 224 207 224 204 Z" fill="#1A1C20" />
          <path d="M226 182 L324 178" stroke="#3A3E44" strokeWidth="1.2" />
          <rect x="266" y="196" width="18" height="7" rx="1" fill="#C9CED3" />
          {/* lamps */}
          <path d="M231 186 L247 185.5 C248 185.5 249 187 248 189 L233 190 C231 190 230 188 231 186 Z" fill="#DDE3E6" />
          <path d="M306 183.5 L320 183 C321 183 322 184 321 186.5 L308 187.5 C306 187.5 305 185.5 306 183.5 Z" fill="#DDE3E6" />
          {/* mirror */}
          <path d="M318 104 L323 106 L324 134 C324 136 322 137 320 136 L319 134 Z" fill="#15181B" />
        </g>
      </g>

      <g data-part="wheels">
        <path d="M118 194 C118 184 124 178 132 178 C140 178 146 184 146 194" fill="#0F1114" />
        <ellipse cx="129" cy="200" rx="11" ry="15" fill="#15181B" />
        <ellipse cx="136" cy="201" rx="12" ry="16.5" fill="#1A1D21" />
        <ellipse cx="138.5" cy="202" rx="7.4" ry="10.6" fill={url('rim')} />
        <ellipse cx="139" cy="202" rx="2.6" ry="3.6" fill="#5B636C" />
        <path d="M277 206.6 C277 216 284 222 292 222 C300 222 307 216 307 205.4 Z" fill="#14171A" />
        <path d="M184 198 C184 184 192 178 202 178 C212 178 220 184 220 198" fill="#0F1114" />
        <ellipse cx="202" cy="201" rx="16" ry="21" fill="#1A1D21" />
        <ellipse cx="205" cy="202" rx="10" ry="14" fill={url('rim')} />
        <ellipse cx="205.5" cy="202" rx="3.4" ry="4.6" fill="#5B636C" />
      </g>

      <g data-part="glint" strokeLinecap="round">
        <path d="M236 100 L250 98.5" stroke="#FFFFFF" strokeWidth="2" opacity="0.35" />
        <path d="M300 99 L310 108" stroke="#FFFFFF" strokeWidth="3" opacity="0.18" />
        <path d="M234 187.4 L244 187" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M309 185.2 L318 184.8" stroke="#FFFFFF" strokeWidth="1.4" />
      </g>
    </svg>
  )
}

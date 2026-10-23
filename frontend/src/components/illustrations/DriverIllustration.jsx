import { useId } from 'react'
import normalArt from '@/assets/driver/normal.webp'
import drowsyArt from '@/assets/driver/drowsy.webp'
import fatiguedArt from '@/assets/driver/fatigued.webp'
import distractedArt from '@/assets/driver/distracted.webp'

/**
 * DriverIllustration — the FleetGuard driver in 4 states: a painted raster per state (800×650
 * WebP, generated from the design mockup's driver) inside the mockup's squircle window, plus a
 * small SVG overlay for the parts that still move.
 *
 * Props
 *  - state: 'normal' | 'drowsy' | 'fatigued' | 'distracted' (default 'normal')
 *  - className, title (overrides the Vietnamese default label)
 *
 * The image is lazy-loaded (the AI demo section sits below the fold) and has fixed intrinsic
 * size via the root's aspect-ratio, so it never shifts layout.
 *
 * data-part map (query with `[data-part="..."]`)
 *  root          the wrapper <div>; carries data-state, role="img" + aria-label
 *  art           wrapper around the <img>, overscanned 2% on every side so small idle moves
 *                (y / yPercent, scale) never reveal an edge inside the window. GSAP target.
 *  overlay       the SVG on top (viewBox 0 0 320 260, same frame as the image)
 *    zzz         drowsy; zzz-1 (big navy), zzz-2 (small navy), zzz-3 (teal) — each carries a
 *                translate+scale transform; GSAP parses it into x/y/scale
 *    phone-glow  distracted: soft light at the top edge of the phone, pulse its opacity
 */

export const DRIVER_STATES = ['normal', 'drowsy', 'fatigued', 'distracted']

const ART = { normal: normalArt, drowsy: drowsyArt, fatigued: fatiguedArt, distracted: distractedArt }

const TITLES = {
  normal: 'Tài xế tập trung lái xe',
  drowsy: 'Tài xế có dấu hiệu buồn ngủ',
  fatigued: 'Tài xế mệt mỏi đang ngáp',
  distracted: 'Tài xế mất tập trung dùng điện thoại',
}

const NAVY = '#0D2232'
const TEAL = '#2E9E62'

/* The mockup's soft squircle window (viewBox 0 0 320 260), applied as a CSS mask so the <img>
   inside can stay a plain lazy-loaded element. */
const WINDOW =
  'M52 6 C110 2 210 2 268 6 C300 8 313 24 314 58 C315.5 112 315.5 160 314 208 C313 242 298 254 266 256 C200 259 120 259 54 256 C22 254 7 242 6 208 C4.5 160 4.5 112 6 58 C7 24 20 8 52 6 Z'
const MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 260' preserveAspectRatio='none'><path d='${WINDOW}'/></svg>`,
)}")`

/* chunky slanted "Z" like the design's hand-lettered sleep mark */
function Z({ x, y, s, color, part }) {
  return (
    <g data-part={part} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5.6 -7 H6.4 L6 -4.4 L-1.6 4.2 H5 L4.4 7 H-6.6 L-6.2 4.4 L1.4 -4.2 H-5 Z" fill={color} />
    </g>
  )
}

export default function DriverIllustration({ state = 'normal', className, title }) {
  const uid = `drv${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const current = DRIVER_STATES.includes(state) ? state : 'normal'

  return (
    <div
      data-part="root"
      data-state={current}
      role="img"
      aria-label={title ?? TITLES[current]}
      className={className}
      style={{
        position: 'relative',
        aspectRatio: '320 / 260',
        overflow: 'hidden',
        maskImage: MASK,
        WebkitMaskImage: MASK,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
      }}
    >
      <div data-part="art" style={{ position: 'absolute', inset: '-2%' }}>
        <img
          src={ART[current]}
          alt=""
          width="800"
          height="650"
          loading="lazy"
          decoding="async"
          draggable="false"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <svg
        data-part="overlay"
        viewBox="0 0 320 260"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {current === 'distracted' && (
          <>
            <defs>
              <radialGradient id={`${uid}-glow`} cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#E6FFF8" stopOpacity=".85" />
                <stop offset=".45" stopColor="#9BEBD6" stopOpacity=".35" />
                <stop offset="1" stopColor="#9BEBD6" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse data-part="phone-glow" cx="184" cy="134" rx="22" ry="13" fill={`url(#${uid}-glow)`} style={{ mixBlendMode: 'screen' }} />
          </>
        )}
        {current === 'drowsy' && (
          <g data-part="zzz">
            <Z part="zzz-1" x={216} y={46} s={1.8} color={NAVY} />
            <Z part="zzz-2" x={238} y={28} s={1} color={NAVY} />
            <Z part="zzz-3" x={66} y={96} s={1.1} color={TEAL} />
          </g>
        )}
      </svg>
    </div>
  )
}

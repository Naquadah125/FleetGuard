/**
 * HeadsetGlyph — filled cyan support headset with a mic boom (Hỗ trợ 24/7). Frame: see Glyph.jsx.
 *
 * data-part hooks:
 *   band   the headband arch (drawn first; the cups' halo caps its ends). Breathe with `scaleY`,
 *          svgOrigin '16 17'.
 *   cups   both ear cups (group). Pulse with `scale` (1 ↔ 1.06), svgOrigin '16 19.4'.
 *   mic    boom + mic capsule (group, drawn last). Wiggle with `rotation` (±8°), svgOrigin '25.6 24'
 *          (where the boom leaves the right cup).
 */
import { Glyph, Grad, HALO } from './Glyph.jsx'

const BAND = 'M3.1 17 V15.6 A12.9 12.9 0 0 1 28.9 15.6 V17 H26.5 V15.6 A10.5 10.5 0 0 0 5.5 15.6 V17 Z'
const BOOM = 'M25.6 24 C25.6 27.6 23.2 29.3 19.4 29.3'

export default function HeadsetGlyph({ className, title, ...props }) {
  return (
    <Glyph
      className={className}
      title={title}
      {...props}
      draw={(id, url) => (
        <>
          <defs>
            <Grad id={id('f')} stops={[[0, '#3CC8F4'], [0.5, '#1CB2EA'], [1, '#0A9BD9']]} />
            <Grad id={id('band')} stops={[[0, '#33C1F1'], [1, '#14A8E3']]} />
          </defs>
          <path data-part="band" d={BAND} fill={url('band')} {...HALO} />
          <g data-part="cups">
            <rect x="3" y="13.6" width="7.4" height="11.6" rx="3.4" fill={url('f')} {...HALO} />
            <rect x="21.6" y="13.6" width="7.4" height="11.6" rx="3.4" fill={url('f')} {...HALO} />
          </g>
          <g data-part="mic">
            <path d={BOOM} stroke="#fff" strokeWidth="3.8" strokeLinecap="round" />
            <path d={BOOM} stroke="#13A6E2" strokeWidth="2" strokeLinecap="round" />
            <rect x="14.6" y="27.6" width="5.4" height="3.4" rx="1.7" fill="#0E9FDC" {...HALO} />
          </g>
        </>
      )}
    />
  )
}

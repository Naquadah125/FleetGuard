/**
 * FleetGuard brand logo — shield-chevron mark (two stacked chevrons) + "FleetGuard" wordmark.
 *
 * Sizing is font-size driven: the mark is 1.4em tall and the wordmark inherits font-size and
 * font-family (Plus Jakarta Sans on the landing page), so `className="text-xl"` scales both.
 *
 * Props
 *   variant       'default' (teal mark, navy "Fleet" + dark-teal "Guard") | 'light' (all white, for dark footer)
 *   showWordmark  render the text beside the mark (default true)
 *   className     applied to the outer <span>
 *
 * data-part hooks (for GSAP): chevron-top, chevron-bottom (inside the mark), wordmark.
 *
 * Also exports `FleetGuardMark` (mark only; pass `title` to make it a labelled image).
 */
import { useId } from 'react'

export const MARK_TOP_D = 'M4 3 L16 8.5 L28 3 V12.5 L16 18 L4 12.5 Z'
export const MARK_BOTTOM_D = 'M4 16 L16 21.5 L28 16 V24.5 L16 30 L4 24.5 Z'

export function FleetGuardMark({ variant = 'default', className, title, style, ...props }) {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const light = variant === 'light'
  const a11y = title
    ? { role: 'img', 'aria-labelledby': `${uid}-title` }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...a11y}
      {...props}
    >
      {title ? <title id={`${uid}-title`}>{title}</title> : null}
      {light ? null : (
        <defs>
          <linearGradient id={`${uid}-top`} x1="4" y1="3" x2="28" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0A8466" />
            <stop offset="1" stopColor="#0B6E57" />
          </linearGradient>
          <linearGradient id={`${uid}-bottom`} x1="4" y1="16" x2="28" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1BBF94" />
            <stop offset="1" stopColor="#0E9B78" />
          </linearGradient>
        </defs>
      )}
      <path data-part="chevron-top" d={MARK_TOP_D} fill={light ? '#FFFFFF' : `url(#${uid}-top)`} />
      <path
        data-part="chevron-bottom"
        d={MARK_BOTTOM_D}
        fill={light ? '#FFFFFF' : `url(#${uid}-bottom)`}
        fillOpacity={light ? 0.82 : 1}
      />
    </svg>
  )
}

export default function FleetGuardLogo({ variant = 'default', showWordmark = true, className, style, ...props }) {
  const light = variant === 'light'
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45em', lineHeight: 1, ...style }}
      {...(showWordmark ? {} : { role: 'img', 'aria-label': 'FleetGuard' })}
      {...props}
    >
      <FleetGuardMark variant={variant} style={{ width: '1.4em', height: '1.4em' }} />
      {showWordmark ? (
        <span
          data-part="wordmark"
          style={{
            fontFamily: 'inherit',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: light ? '#FFFFFF' : '#0D2232',
            whiteSpace: 'nowrap',
          }}
        >
          Fleet<span style={{ color: light ? '#FFFFFF' : '#08765E' }}>Guard</span>
        </span>
      ) : null}
    </span>
  )
}

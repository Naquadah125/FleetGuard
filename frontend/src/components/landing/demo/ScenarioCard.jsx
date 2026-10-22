import { useId } from 'react'
import { ScanFace } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import DriverIllustration from '@/components/illustrations/DriverIllustration'

/* Static class maps so Tailwind sees every tone class. */
const TONE = {
  success: { dot: 'bg-success', border: 'data-[active=true]:border-success', bar: 'bg-success' },
  warning: { dot: 'bg-warning', border: 'data-[active=true]:border-warning', bar: 'bg-warning' },
  danger: { dot: 'bg-danger', border: 'data-[active=true]:border-danger', bar: 'bg-danger' },
}

/**
 * One AI-demo scenario: tone dot + label, a DriverIllustration fixed to one state, caption,
 * a "detected" Badge and a 3px cycle progress bar.
 *
 * Purely presentational. The parent (AiDemo) owns all motion and finds the moving parts through
 * `data-demo-card` / `data-demo-badge` / `data-demo-progress` / `[data-part="root"]`.
 * Static (reduced-motion) look of the active card comes from CSS alone: lifted −6px, tone border,
 * hover shadow, badge visible, full progress bar.
 *
 * @param {{ scenario: { state: string, label: string, caption: string, tone: 'success'|'warning'|'danger' },
 *   index: number, active: boolean }} props
 */
export default function ScenarioCard({ scenario, index, active }) {
  const labelId = useId()
  const tone = TONE[scenario.tone] ?? TONE.success

  return (
    <li data-reveal className="flex w-[80%] shrink-0 snap-center md:w-auto">
      <article
        tabIndex={0}
        data-demo-card={index}
        data-active={active}
        aria-labelledby={labelId}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'group relative flex w-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-card',
          'transition-[translate,box-shadow,border-color] duration-300 ease-out motion-reduce:transition-none',
          'data-[active=true]:-translate-y-1.5 data-[active=true]:shadow-card-hover',
          tone.border,
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark focus-visible:outline-solid',
        )}
      >
        <header className="flex items-center justify-center gap-2.5 px-5 pt-5 pb-3">
          <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', tone.dot)} />
          <h3 id={labelId} className="text-h4 text-navy">
            {scenario.label}
          </h3>
        </header>

        <div className="relative px-4 lg:px-3 xl:px-4">
          <DriverIllustration state={scenario.state} transition={false} className="w-full" />
          <Badge
            aria-hidden="true"
            data-demo-badge
            variant={scenario.tone}
            className={cn(
              // HUD-style detection tag over the steering wheel
              'absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 shadow-card ring-1 ring-current/20',
              // Static fallback (reduced motion); with motion GSAP drives opacity inline.
              'group-data-[active=false]:opacity-0',
            )}
          >
            <ScanFace strokeWidth={2.25} />
            {scenario.label}
          </Badge>
        </div>

        <p className="px-5 pt-3 pb-6 text-center text-body text-ink">{scenario.caption}</p>

        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-line/60">
          <span
            data-demo-progress
            className={cn(
              'block h-full w-full origin-left opacity-0 group-data-[active=true]:opacity-100',
              tone.bar,
            )}
          />
        </span>
      </article>
    </li>
  )
}

import { useId } from 'react'
import { cn } from '@/lib/utils'
import DriverIllustration from '@/components/illustrations/DriverIllustration'

/* Status dot per tone, sampled from the mockup (a touch deeper / more orange than the
   success / warning / danger tokens). Static class map so Tailwind sees every class. */
const DOT = {
  success: 'bg-[#16AE42]',
  warning: 'bg-[#FB9228]',
  danger: 'bg-[#E3161B]',
}

/**
 * One AI-demo scenario, as in the design mockup: a plain white card (very light mint border, soft
 * shadow) with a "● Label" header, a DriverIllustration fixed to one state (it carries its
 * own squircle window) and a one-line caption. Measured against the 1440 px mockup: 267×284 card,
 * 14px radius, 226 px illustration, 17px bold label, 14px caption.
 *
 * Purely presentational. The parent (AiDemo) owns all motion and finds the moving parts through
 * `data-demo-card` / `[data-part="root"]`. The only "active" cue (auto-cycle / hover / focus) is
 * a subtle lift + deeper shadow, from CSS alone, so the reduced-motion look is the same.
 *
 * @param {{ scenario: { state: string, label: string, caption: string, tone: 'success'|'warning'|'danger' },
 *   index: number, active: boolean }} props
 */
export default function ScenarioCard({ scenario, index, active }) {
  const labelId = useId()

  return (
    <li data-reveal className="flex w-[78%] max-w-[300px] shrink-0 snap-center md:w-auto md:max-w-none">
      <article
        tabIndex={0}
        data-demo-card={index}
        data-active={active}
        aria-labelledby={labelId}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'relative flex w-full flex-col rounded-[14px] border border-[#D3E8E2] bg-white',
          'shadow-[0_4px_18px_-2px_rgba(14,110,84,0.09),0_1px_3px_rgba(13,34,50,0.04)]',
          'transition-[translate,box-shadow] duration-500 ease-out motion-reduce:transition-none',
          'data-[active=true]:-translate-y-[3px]',
          'data-[active=true]:shadow-[0_12px_28px_-6px_rgba(14,110,84,0.16),0_2px_6px_-2px_rgba(13,34,50,0.06)]',
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark focus-visible:outline-solid',
        )}
      >
        <header className="flex items-center justify-center gap-2.5 px-4 pt-4 pb-[15px]">
          <span aria-hidden="true" className={cn('size-3.5 shrink-0 rounded-full', DOT[scenario.tone] ?? DOT.success)} />
          <h3 id={labelId} className="text-[17px] leading-6 font-bold text-navy">
            {scenario.label}
          </h3>
        </header>

        <div className="px-5">
          <DriverIllustration state={scenario.state} className="w-full" />
        </div>

        <p className="px-4 pt-2.5 pb-3.5 text-center text-balance lg:px-3 xl:px-4 text-body font-medium text-[#3A3D45]">{scenario.caption}</p>
      </article>
    </li>
  )
}

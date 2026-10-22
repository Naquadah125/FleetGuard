import { Pause, Play } from 'lucide-react'
import { MOTION_CONTROL } from '@/content/landing'
import { cn } from '@/lib/utils'
import { setMotionPaused, useMotionPaused } from './motionPause'

/**
 * Pause / resume button for the landing's auto-playing motion (WCAG 2.2.2). Drives the shared
 * motionPause flag, so the hero and demo buttons stay in sync. Its name follows the action it
 * performs ("Tạm dừng…" ↔ "Tiếp tục…"), like a media play/pause control. Hidden under
 * prefers-reduced-motion, where nothing moves.
 *
 * @param {{ variant?: 'icon'|'pill', className?: string }} props
 *   icon: 28px round button (44px hit area via ::after), name in aria-label + title.
 *   pill: icon + visible label.
 */
export default function MotionPauseButton({ variant = 'pill', className }) {
  const paused = useMotionPaused()
  const label = paused ? MOTION_CONTROL.resume : MOTION_CONTROL.pause
  const Icon = paused ? Play : Pause
  const icon = variant === 'icon'

  return (
    <button
      type="button"
      onClick={() => setMotionPaused(!paused)}
      aria-label={icon ? label : undefined}
      title={icon ? label : undefined}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center justify-center text-ink transition-colors motion-reduce:hidden',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark focus-visible:outline-solid',
        'hover:border-brand/50 hover:text-brand-dark',
        icon
          ? 'size-7 rounded-full border border-line bg-white after:absolute after:-inset-2'
          : 'h-9 gap-2 rounded-full border border-brand/25 bg-white/80 px-4 text-body-sm font-semibold pointer-coarse:min-h-11',
        className,
      )}
    >
      <Icon aria-hidden="true" className={icon ? 'size-3.5' : 'size-4'} strokeWidth={2.25} />
      {icon ? null : label}
    </button>
  )
}

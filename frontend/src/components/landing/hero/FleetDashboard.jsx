import { memo, useImperativeHandle, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Bell,
  ChartColumn,
  Coffee,
  LayoutDashboard,
  MapPinned,
  Moon,
  Plus,
  Search,
  Settings,
  Smartphone,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DASHBOARD, formatStat } from '@/content/landing'
import { FleetGuardMark } from '@/components/brand/FleetGuardLogo'
import MotionPauseButton from '@/components/landing/MotionPauseButton'
import FleetMap from './FleetMap'

/**
 * FleetDashboard — the hero's code-built product mock (no image).
 * Card: icon rail · header · 4 KPI tiles · FleetMap · recent-alerts list, plus the floating
 * "distance today" card with a sparkline. Presentational (its only control is the shared
 * MotionPauseButton in the header); the KPI/map/alerts block and the distance card are each exposed
 * as role="img" with a text summary. Every animation lives in Hero.jsx and reaches the DOM through
 * these hooks:
 *
 *   [data-dash-speed] / [data-distance-speed]  parallax wrappers (data-speed, ScrollSmoother)
 *   [data-dash-tilt]   pointer-tilt layer      [data-dash]  intro rise/scale layer (the card)
 *   [data-kpi]         KPI tile                [data-count] number span (value in data-count)
 *   [data-kpi-live]    the "alerts today" tile (bumped by the ticker)
 *   [data-map]         map panel               (FleetMap hooks inside)
 *   [data-alerts]      alerts panel            [data-alert-list] > [data-alert] items
 *   [data-distance-card]  floating card        [data-distance-count] km number
 *   [data-spark-line] / [data-spark-area] / [data-spark-dot]  sparkline parts
 *   [data-spark-halo]  pulse halo behind the live point (rest opacity 0)
 *
 * Imperative handle (React 19 `ref` prop): `pushAlert()` prepends the next alert synchronously
 * (flushSync) so the caller can wrap it in Flip.getState()/Flip.from().
 */

// Status text colors: the darkened `*-text` tokens (index.css) keep small text >= 4.5:1.
const VALUE_TONE = {
  info: 'text-info-text',
  success: 'text-success-text',
  danger: 'text-danger-text',
  navy: 'text-navy',
}
const TILE_TONE = {
  info: 'bg-info/[0.06]',
  success: 'bg-success/[0.08]',
  danger: 'bg-danger/[0.06]',
  navy: 'bg-surface/80',
}
const CHIP_TONE = {
  danger: 'bg-danger/12 text-danger-text',
  warning: 'bg-warning/15 text-warning-text',
}
const ALERT_ICON = { drowsy: Moon, distracted: Smartphone, fatigued: Coffee }
const SUCCESS_TEXT = 'text-success-text'
const LINK_TEXT = 'text-info-text'

const RAIL = [LayoutDashboard, Truck, MapPinned, ChartColumn]

// ---- live alert feed -------------------------------------------------------------------
const POOL = [...DASHBOARD.extraAlerts, ...DASHBOARD.alerts]
const INITIAL_FEED = DASHBOARD.alerts.map((a, i) => ({ ...a, id: `a${i}` }))

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number)
  const t = (h * 60 + m + minutes) % (24 * 60)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Next alert after `top`: extraAlerts first (their own times), then cycle, always newer. */
function nextAlert(top, seq) {
  const base = POOL[seq % POOL.length]
  const time = seq < DASHBOARD.extraAlerts.length ? base.time : addMinutes(top.time, 2 + (seq % 3))
  return { ...base, time, id: `n${seq}` }
}

// ---- pieces ----------------------------------------------------------------------------
function Rail() {
  return (
    <div
      aria-hidden="true"
      className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-line/70 bg-white py-4 sm:flex"
    >
      <FleetGuardMark className="mb-2 size-7" />
      {RAIL.map((Icon, i) => (
        <span
          key={i}
          className={cn(
            'grid size-9 place-items-center rounded-md',
            i === 0 ? 'bg-info text-white shadow-card' : 'text-ink-subtle',
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      ))}
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="truncate text-[15px] leading-6 font-bold text-navy">{DASHBOARD.title}</p>
      <div className="flex shrink-0 items-center gap-1.5">
        {/* The one real control in the mock: pauses the live ticker / map (WCAG 2.2.2). */}
        <MotionPauseButton variant="icon" />
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full border border-line text-ink">
          <Search className="size-3.5" />
        </span>
        <span aria-hidden="true" className="relative grid size-7 place-items-center rounded-full border border-brand-100 bg-brand-50 text-brand-dark">
          <Bell className="size-3.5" />
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-danger ring-2 ring-brand-50" />
        </span>
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full border border-line text-ink">
          <Settings className="size-3.5" />
        </span>
      </div>
    </div>
  )
}

const KpiGrid = memo(function KpiGrid() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      {DASHBOARD.kpis.map((k, i) => (
        <div
          key={k.label}
          data-kpi
          {...(i === 2 ? { 'data-kpi-live': '' } : {})}
          className={cn('flex min-w-0 flex-col justify-between rounded-md px-3 py-2.5 ring-1 ring-line/60 lg:px-2.5', TILE_TONE[k.tone])}
        >
          <p className="text-body-sm leading-4 tracking-tight text-ink">{k.label}</p>
          <p className={cn('mt-0.5 text-[22px] leading-7 font-bold tabular-nums', VALUE_TONE[k.tone])}>
            <span data-count={k.value} className="inline-block origin-left">
              {formatStat(k.value)}
            </span>
          </p>
        </div>
      ))}
    </div>
  )
})

const MapPanel = memo(function MapPanel() {
  return (
    <div data-map className="relative h-[196px] overflow-hidden rounded-lg ring-1 ring-line md:h-full md:min-h-[236px]">
      <FleetMap className="absolute inset-0 block size-full" />
    </div>
  )
})

function AlertItem({ alert }) {
  const Icon = ALERT_ICON[alert.kind] ?? TriangleAlert
  return (
    <li data-alert className="flex items-center gap-2.5 rounded-md bg-surface/70 px-2.5 py-2">
      <span
        aria-hidden="true"
        className={cn('grid size-8 shrink-0 place-items-center rounded-full', CHIP_TONE[alert.tone] ?? CHIP_TONE.warning)}
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm font-semibold text-navy">{alert.type}</span>
        <span className="truncate text-body-sm text-ink tabular-nums">
          {alert.time} - {DASHBOARD.alertMetaPrefix} {alert.plate}
        </span>
      </span>
    </li>
  )
}

// Proportionally scaled (no preserveAspectRatio="none"). The line has pathLength=1 so the Hero
// draws it with a plain strokeDashoffset tween (no DrawSVG length measurement).
function Sparkline({ series, className }) {
  const W = 180
  const H = 64
  const max = Math.max(...series) * 1.08
  const pts = series.map((v, i) => [(i / (series.length - 1)) * W, H - 3 - (v / max) * (H - 6)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W} ${H} L0 ${H} Z`
  const [, lastY] = pts[pts.length - 1]
  const gid = 'fg-hero-spark'
  return (
    <div aria-hidden="true" className={cn('relative aspect-[180/64]', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block size-full overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-brand)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path data-spark-area d={area} fill={`url(#${gid})`} />
        <path
          data-spark-line
          pathLength="1"
          d={line}
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {/* Halo behind the live point (idle pulse: scale + fade; rest opacity 0). The wrapper holds
          the centring translate so GSAP's scale on the halo never touches it. */}
      <span className="absolute right-0 size-2.5 translate-x-1/2 -translate-y-1/2" style={{ top: `${(lastY / H) * 100}%` }}>
        <span data-spark-halo className="absolute inset-0 rounded-full bg-brand opacity-0" />
      </span>
      <span
        data-spark-dot
        className="absolute right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-white"
        style={{ top: `${(lastY / H) * 100}%` }}
      />
    </div>
  )
}

function DistanceCard() {
  return (
    // Inline (< lg): text left, chart right. Floating (lg+): stacked, chart under the numbers.
    <div
      data-distance-card
      role="img"
      aria-label={DASHBOARD.distanceMockLabel}
      className="relative flex items-end gap-4 rounded-lg bg-white p-4 shadow-dashboard ring-1 ring-line/70 lg:block"
    >
      <Plus aria-hidden="true" className="absolute top-4 right-4 hidden size-4 text-ink-subtle lg:block" />
      <div className="shrink-0 lg:pr-5">
        <p className="text-body-sm font-medium text-ink">{DASHBOARD.distanceLabel}</p>
        <p className="mt-1.5 flex items-baseline gap-1.5 text-navy">
          <span data-count={DASHBOARD.distanceKm} data-distance-count className="text-[26px] leading-8 font-extrabold tabular-nums">
            {formatStat(DASHBOARD.distanceKm)}
          </span>
          <span className="text-body-sm font-semibold text-ink">{DASHBOARD.distanceUnit}</span>
        </p>
        <p className={cn('mt-0.5 text-body-sm font-semibold', SUCCESS_TEXT)}>{DASHBOARD.distanceDelta}</p>
      </div>
      <Sparkline series={DASHBOARD.distanceSeries} className="ml-auto w-full max-w-[220px] min-w-0 lg:mt-3 lg:max-w-none" />
    </div>
  )
}

/** Soft mint disc + dotted arc peeking out behind the card's top-right corner. */
function CornerDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-4 -z-10 size-36 md:-right-8">
      <div className="absolute inset-4 rounded-full bg-brand-100/70" />
      <svg viewBox="0 0 144 144" className="absolute inset-0 size-full" fill="none">
        <path
          d="M22 40 A62 62 0 0 1 122 30"
          stroke="var(--color-brand)"
          strokeOpacity="0.45"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="0.1 9"
        />
        <path
          d="M128 52 A62 62 0 0 1 132 92"
          stroke="var(--color-brand)"
          strokeOpacity="0.35"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="0.1 9"
        />
      </svg>
    </div>
  )
}

export default function FleetDashboard({ ref, className }) {
  const [feed, setFeed] = useState(INITIAL_FEED)
  // Source of truth for the ticker (written only in pushAlert, never during render).
  const feedRef = useRef(INITIAL_FEED)
  const seq = useRef(0)

  useImperativeHandle(
    ref,
    () => ({
      pushAlert() {
        const next = nextAlert(feedRef.current[0], seq.current++)
        const updated = [next, ...feedRef.current].slice(0, DASHBOARD.alerts.length)
        feedRef.current = updated
        flushSync(() => setFeed(updated))
      },
    }),
    [],
  )

  return (
    <div className={cn('relative isolate', className)}>
      <CornerDecor />
      <div data-dash-speed data-speed="clamp(0.95)">
        <div data-dash-tilt>
          <div data-dash className="flex overflow-hidden rounded-xl bg-white shadow-dashboard ring-1 ring-line/60">
            <Rail />
            <div className="min-w-0 flex-1 p-4 md:p-5">
              <Header />
              {/* Exposed as one image with a summary: the KPI / map / alert text is decorative mock
                  data (and the alert list changes every few seconds). */}
              <div role="img" aria-label={DASHBOARD.mockLabel}>
                <KpiGrid />
                <div className="mt-3 grid gap-3 md:mt-4 md:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:grid-cols-2 xl:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)]">
                  <MapPanel />
                  <div data-alerts className="flex min-w-0 flex-col rounded-lg bg-white ring-1 ring-line">
                    <p className="px-3.5 pt-3 text-body font-bold text-navy">{DASHBOARD.alertsTitle}</p>
                    <ul data-alert-list className="flex flex-col gap-2 p-2.5">
                      {feed.map((a) => (
                        <AlertItem key={a.id} alert={a} />
                      ))}
                    </ul>
                    <p className={cn('mt-auto border-t border-line py-2.5 text-center text-body-sm font-semibold', LINK_TEXT)}>
                      {DASHBOARD.viewAll}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        data-distance-speed
        data-speed="clamp(1.08)"
        className="mt-4 lg:absolute lg:-bottom-14 lg:-left-12 lg:mt-0 lg:w-[208px] xl:-bottom-8 xl:-left-8"
      >
        <DistanceCard />
      </div>
    </div>
  )
}

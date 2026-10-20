import styles from './Common.module.css'

export default function Meter({
  label,
  value = 0,
  min = 0,
  max = 1,
  threshold,
  thresholdType = 'lower', // 'lower' (alert if below threshold, e.g. EAR) or 'upper' (alert if above, e.g. MAR)
  unit = '',
  decimals = 2,
  warningColor = '#F59E0B',
  dangerColor = '#EF4444',
  normalColor = '#10B981',
}) {
  const clamped = Math.max(min, Math.min(max, value))
  const percent = ((clamped - min) / (max - min)) * 100
  const thresholdPercent = threshold !== undefined ? ((threshold - min) / (max - min)) * 100 : null

  // Determine alert status
  let isAlert = false
  if (threshold !== undefined) {
    if (thresholdType === 'lower') {
      isAlert = value < threshold
    } else {
      isAlert = value > threshold
    }
  }

  const barColor = isAlert ? dangerColor : normalColor

  return (
    <div className={styles.meterWrapper}>
      <div className={styles.meterHeader}>
        <span className={styles.meterLabel}>{label}</span>
        <span className={styles.meterValue} style={{ color: isAlert ? dangerColor : '#ffffff' }}>
          {typeof value === 'number' ? value.toFixed(decimals) : value}
          {unit}
          {threshold !== undefined && (
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: 4 }}>
              ({thresholdType === 'lower' ? '<' : '>'}{threshold})
            </span>
          )}
        </span>
      </div>

      <div className={styles.meterTrack}>
        <div
          className={styles.meterFill}
          style={{
            width: `${percent}%`,
            backgroundColor: barColor,
          }}
        />
        {thresholdPercent !== null && (
          <div
            className={styles.meterThreshold}
            style={{ left: `${thresholdPercent}%` }}
            title={`Ngưỡng: ${threshold}`}
          />
        )}
      </div>
    </div>
  )
}

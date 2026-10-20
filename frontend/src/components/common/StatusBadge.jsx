import styles from './Common.module.css'

export default function StatusBadge({ level, status, label }) {
  if (level !== undefined && level !== null) {
    if (level === 2) {
      return (
        <span className={`${styles.badge} ${styles.badgeLevel2}`}>
          <span className={styles.statusDot} style={{ background: '#EF4444' }} />
          <span>{label || 'Cấp 2 · Nguy hiểm'}</span>
        </span>
      )
    }
    if (level === 1) {
      return (
        <span className={`${styles.badge} ${styles.badgeLevel1}`}>
          <span className={styles.statusDot} style={{ background: '#F59E0B' }} />
          <span>{label || 'Cấp 1 · Cảnh báo'}</span>
        </span>
      )
    }
    return (
      <span className={`${styles.badge} ${styles.badgeLevel0}`}>
        <span className={styles.statusDot} style={{ background: '#10B981' }} />
        <span>{label || 'Cấp 0 · An toàn'}</span>
      </span>
    )
  }

  if (status) {
    const s = String(status).toLowerCase()
    if (s === 'driving' || s === 'active') {
      return (
        <span className={`${styles.badge} ${styles.badgeDriving}`}>
          <span className={styles.statusDot} style={{ background: '#10B981' }} />
          <span>{label || (s === 'driving' ? 'Đang lái xe' : 'Hoạt động')}</span>
        </span>
      )
    }
    if (s === 'resting') {
      return (
        <span className={`${styles.badge} ${styles.badgeResting}`}>
          <span className={styles.statusDot} style={{ background: '#F59E0B' }} />
          <span>{label || 'Đang nghỉ ngơi'}</span>
        </span>
      )
    }
    if (s === 'available') {
      return (
        <span className={`${styles.badge} ${styles.badgeDriving}`}>
          <span className={styles.statusDot} style={{ background: '#38BDF8' }} />
          <span>{label || 'Sẵn sàng'}</span>
        </span>
      )
    }
    return (
      <span className={`${styles.badge} ${styles.badgeOffline}`}>
        <span className={styles.statusDot} style={{ background: '#94A3B8' }} />
        <span>{label || 'Ngoại tuyến'}</span>
      </span>
    )
  }

  return null
}

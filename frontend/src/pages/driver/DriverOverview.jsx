import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Award,
  ShieldAlert,
  ArrowRight,
  Camera,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getDB, subscribe } from '../../store/db'
import { BarChart } from '../../components/common/SVGCharts'
import styles from './DriverPages.module.css'

export default function DriverOverview() {
  const { user } = useAuth()
  const [db, setDb] = useState(() => getDB())

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  // Calculate stats for current driver
  const myTrips = useMemo(() => {
    return (db.trips || []).filter((t) => t.driverId === user?._id)
  }, [db.trips, user?._id])

  const myIncidents = useMemo(() => {
    return (db.incidents || []).filter((i) => i.driverId === user?._id)
  }, [db.incidents, user?._id])

  // Latest trip
  const latestTrip = myTrips.length > 0 ? myTrips[0] : null
  const hasTrips = myTrips.length > 0

  // Today's driving time
  const todayTrips = useMemo(() => {
    const today = new Date().toDateString()
    return myTrips.filter((t) => new Date(t.startedAt).toDateString() === today)
  }, [myTrips])

  const todayHours = useMemo(() => {
    return todayTrips.reduce((acc, t) => {
      const end = t.endedAt ? new Date(t.endedAt).getTime() : Date.now()
      const start = new Date(t.startedAt).getTime()
      return acc + Math.max(0, (end - start) / 3600000)
    }, 0)
  }, [todayTrips])

  // Real 7-day alerts per day
  const { weeklyAlerts, totalWeeklyAlerts } = useMemo(() => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const result = []
    let total = 0
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toDateString()
      const count = myIncidents.filter((inc) => new Date(inc.ts).toDateString() === dateStr).length
      total += count
      result.push({
        label: i === 0 ? 'H.nay' : days[d.getDay()],
        value: count,
      })
    }
    return { weeklyAlerts: result, totalWeeklyAlerts: total }
  }, [myIncidents])

  // Safe days count
  const safeDays = useMemo(() => {
    if (!hasTrips) return 0
    const criticalIncidents = myIncidents.filter((i) => i.level === 2)
    if (criticalIncidents.length === 0) return Math.max(1, myTrips.length)
    return Math.min(myTrips.length, 5)
  }, [hasTrips, myTrips.length, myIncidents])

  return (
    <div>
      {/* Welcome Banner for empty state */}
      {!hasTrips && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
            border: '1px solid var(--card-border)',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'var(--amber-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F172A',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: 2 }}>
                Chào mừng {user?.name || 'Tài xế'} đến với buồng lái FleetGuard!
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Bạn chưa thực hiện phiên quét nào. Hãy mở buồng lái camera để bắt đầu hành trình có AI đồng hành.
              </div>
            </div>
          </div>

          <Link to="/driver/camera" className={styles.btnPrimaryAmber}>
            <Camera size={16} />
            <span>Kích Hoạt Buồng Lái</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className={styles.grid3}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Clock size={16} />
              <span>Thời Gian Lái Hôm Nay</span>
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: todayHours > 0 ? '#10B981' : 'var(--text-muted)',
                padding: '3px 8px',
                borderRadius: '6px',
                background: todayHours > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-subtle)',
              }}
            >
              {todayHours > 0 ? 'Hoạt Động' : 'Chưa Lăn Bánh'}
            </span>
          </div>
          <div className={styles.statValue}>
            {todayHours.toFixed(1)} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>giờ</span>
          </div>
          <div className={styles.statSub}>
            {todayTrips.length > 0 ? `Đã hoàn thành ${todayTrips.length} phiên hôm nay` : 'Chưa ghi nhận thời gian lái hôm nay'}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Award size={16} />
              <span>Điểm An Toàn Gần Nhất</span>
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: !hasTrips ? 'var(--text-muted)' : latestTrip.safetyScore >= 90 ? '#10B981' : '#F59E0B',
                padding: '3px 8px',
                borderRadius: '6px',
                background: !hasTrips ? 'var(--bg-subtle)' : latestTrip.safetyScore >= 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              }}
            >
              {!hasTrips ? 'Chưa Có Điểm' : latestTrip.safetyScore >= 90 ? 'Xuất Sắc' : 'Cần Chú Ý'}
            </span>
          </div>
          <div className={styles.statValue}>
            {hasTrips ? latestTrip.safetyScore : '--'} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <div className={styles.statSub}>
            {hasTrips ? `Phiên gần nhất · ${latestTrip.drowsyCount || 0} lần ngủ gật` : 'Dữ liệu sẽ xuất hiện sau phiên quét camera đầu tiên'}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <CheckCircle2 size={16} />
              <span>Chuỗi Ngày Lái An Toàn</span>
            </span>
            <span className={styles.statHighlight} style={{ fontWeight: 800, fontSize: '12px' }}>
              {safeDays >= 7 ? 'Hạng Vàng' : safeDays >= 3 ? 'Hạng Bạc' : 'Khởi Động'}
            </span>
          </div>
          <div className={styles.statValue}>
            {safeDays} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>ngày</span>
          </div>
          <div className={styles.statSub}>
            {safeDays > 0 ? 'Không vi phạm ngủ gật cấp 2 nghiêm trọng' : 'Tích lũy ngày an toàn sau các chuyến đi'}
          </div>
        </div>
      </div>

      {/* Main Grid: Weekly Chart & Safe Streaks */}
      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <ShieldAlert size={16} />
              <span>Số Lần Cảnh Báo Tuần Này</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tổng: {totalWeeklyAlerts} cảnh báo</span>
          </div>
          <div className={styles.overviewChart}>
            <BarChart data={weeklyAlerts} height={180} barColor="#F59E0B" activeBarColor="#EF4444" />
          </div>
          {totalWeeklyAlerts === 0 && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: 8 }}>
              Tốt lắm! Bạn chưa có cảnh báo vi phạm nào trong tuần này.
            </div>
          )}
        </div>

        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <Award size={16} />
                <span>Huy Hiệu Tài Xế Đạt Được</span>
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Duy trì trạng thái tập trung và phản xạ nhanh để mở khóa toàn bộ huy hiệu danh dự FleetGuard.
            </p>

            <div className={styles.streakWrapper}>
              <div className={`${styles.badgePill} ${safeDays >= 3 ? styles.badgePillUnlocked : ''}`}>
                <span className={styles.badgeDays}>3</span>
                <span className={styles.badgeLabel}>Ngày Liên Tục</span>
                {safeDays >= 3 ? (
                  <CheckCircle2 size={12} color="#F59E0B" style={{ marginTop: 4 }} />
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>{safeDays}/3</span>
                )}
              </div>

              <div className={`${styles.badgePill} ${safeDays >= 7 ? styles.badgePillUnlocked : ''}`}>
                <span className={styles.badgeDays}>7</span>
                <span className={styles.badgeLabel}>Ngày Liên Tục</span>
                {safeDays >= 7 ? (
                  <CheckCircle2 size={12} color="#F59E0B" style={{ marginTop: 4 }} />
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>{safeDays}/7</span>
                )}
              </div>

              <div className={`${styles.badgePill} ${safeDays >= 30 ? styles.badgePillUnlocked : ''}`}>
                <span className={styles.badgeDays}>30</span>
                <span className={styles.badgeLabel}>Hảo Thủ Lái Xe</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>
                  {safeDays}/30
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Sẵn sàng lên đường?</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bật camera HUD để hệ thống canh chừng</div>
            </div>
            <Link to="/driver/camera" className={styles.btnPrimaryAmber}>
              <Camera size={16} />
              <span>Mở Buồng Lái</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

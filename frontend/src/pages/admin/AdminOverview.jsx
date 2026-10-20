import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck,
  Award,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { getDB, updateDB, subscribe } from '../../store/db'
import StatusBadge from '../../components/common/StatusBadge'
import { Sparkline } from '../../components/common/SVGCharts'
import styles from './AdminPages.module.css'

export default function AdminOverview() {
  const [db, setDb] = useState(() => getDB())

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  // KPI Computations
  const totalVehicles = db.vehicles.length
  const activeVehicles = db.vehicles.filter((v) => v.status === 'driving').length

  const orgTrips = db.trips.filter((t) => t.driverId !== 'user_driver_free')
  const avgSafetyScore = useMemo(() => {
    if (orgTrips.length === 0) return 90
    const sum = orgTrips.reduce((a, b) => a + (b.safetyScore || 90), 0)
    return (sum / orgTrips.length).toFixed(1)
  }, [orgTrips])

  const todayIncidentsCount = useMemo(() => {
    const today = new Date().toDateString()
    return db.incidents.filter((i) => {
      return i.level === 2 && new Date(i.ts).toDateString() === today
    }).length
  }, [db.incidents])

  const safeHoursTotal = useMemo(() => {
    const totalDist = orgTrips.reduce((a, b) => a + (b.distanceKm || 0), 0)
    return Math.round(totalDist / 45) // Approx 45km/h avg
  }, [orgTrips])

  // Incident Feed (recent 8 incidents)
  const recentIncidents = useMemo(() => {
    return [...db.incidents].slice(0, 8)
  }, [db.incidents])

  // Driver Risk Ranking (worst score first)
  const orgDrivers = useMemo(() => {
    return db.users.filter((u) => u.role === 'DRIVER' && u.organizationId)
  }, [db.users])

  const driverRankings = useMemo(() => {
    return orgDrivers
      .map((d) => {
        const dTrips = db.trips.filter((t) => t.driverId === d._id)
        const dIncidents = db.incidents.filter((i) => i.driverId === d._id)
        const avgScore = dTrips.length > 0
          ? Math.round(dTrips.reduce((a, b) => a + b.safetyScore, 0) / dTrips.length)
          : 88

        // Generate small trend of recent 5 scores
        const spark = dTrips.slice(0, 6).map((t) => t.safetyScore).reverse()
        if (spark.length < 2) spark.push(avgScore, avgScore + 2, avgScore - 1)

        return {
          ...d,
          avgScore,
          incidentsCount: dIncidents.length,
          spark,
        }
      })
      .sort((a, b) => a.avgScore - b.avgScore) // Worst first
  }, [orgDrivers, db.trips, db.incidents])

  const handleResolveIncident = (incidentId) => {
    updateDB((currentDb) => {
      const inc = currentDb.incidents.find((i) => i._id === incidentId)
      if (inc) {
        inc.status = 'resolved'
        inc.resolvedBy = 'Trần Quản Trị'
        inc.note = 'Đã xử lý và ghi nhận vào hồ sơ an toàn.'
      }
      return currentDb
    })
  }

  const formatTimeAgo = (iso) => {
    const diffMins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    const hours = Math.floor(diffMins / 60)
    if (hours < 24) return `${hours} giờ trước`
    return `${Math.floor(hours / 24)} ngày trước`
  }

  return (
    <div>
      {/* 4 KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Xe Đang Hoạt Động</span>
            <Truck size={18} color="#38BDF8" />
          </div>
          <div className={styles.kpiValue}>
            {activeVehicles} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {totalVehicles}</span>
          </div>
          <div className={styles.kpiSub}>Tỷ lệ lăn bánh: {Math.round((activeVehicles / totalVehicles) * 100)}%</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Điểm An Toàn Đội Xe</span>
            <Award size={18} color="#10B981" />
          </div>
          <div className={styles.kpiValue} style={{ color: Number(avgSafetyScore) >= 90 ? '#10B981' : '#F59E0B' }}>
            {avgSafetyScore} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <div className={styles.kpiSub}>+2.4 điểm so với tháng trước</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Sự Cố Nguy Hiểm Hôm Nay</span>
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <div className={styles.kpiValue} style={{ color: todayIncidentsCount > 0 ? '#EF4444' : '#10B981' }}>
            {todayIncidentsCount} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>vụ</span>
          </div>
          <div className={styles.kpiSub}>Cảnh báo ngủ gật Cấp 2 tự động</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Giờ Lái An Toàn Tích Lũy</span>
            <Clock size={18} color="#F59E0B" />
          </div>
          <div className={styles.kpiValue}>
            {safeHoursTotal} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>giờ</span>
          </div>
          <div className={styles.kpiSub}>Tổng số km giám sát: {(safeHoursTotal * 45).toLocaleString('vi-VN')} km</div>
        </div>
      </div>

      {/* Main 2-Col Grid: Real-time Incident Feed & Driver Risk Ranking */}
      <div className={styles.twoColGrid}>
        {/* Left: Real-time Incident Feed */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <AlertTriangle size={16} color="#EF4444" />
              <span>Dòng Sự Kiện & Cảnh Báo An Toàn Thời Gian Thực</span>
            </span>
            <Link to="/admin/history" style={{ fontSize: '12px', color: 'var(--amber-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Xem tất cả</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.incidentList}>
            {recentIncidents.map((inc) => {
              const driver = db.users.find((u) => u._id === inc.driverId)
              const isResolved = inc.status === 'resolved'
              const isLevel2 = inc.level === 2

              return (
                <div
                  key={inc._id}
                  className={`${styles.incidentItem} ${isLevel2 ? styles.incidentItemLevel2 : styles.incidentItemLevel1}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: isLevel2 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isLevel2 ? '#EF4444' : '#F59E0B',
                        flexShrink: 0,
                      }}
                    >
                      <AlertTriangle size={18} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-main)' }}>
                          {driver?.name || 'Tài xế'}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          [{inc.vehicleId}]
                        </span>
                        <StatusBadge level={inc.level} label={inc.type === 'DROWSY' ? 'Ngủ gật' : inc.type === 'YAWN' ? 'Ngáp' : 'Lơ đãng'} />
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {inc.metrics} · {formatTimeAgo(inc.ts)}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isResolved ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11.5px', color: '#10B981', fontWeight: 700 }}>
                        <CheckCircle size={14} />
                        <span>Đã xử lý</span>
                      </span>
                    ) : (
                      <button
                        className={styles.resolveBtn}
                        onClick={() => handleResolveIncident(inc._id)}
                      >
                        Xử lý ngay
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Driver Risk Ranking (Worst First) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <TrendingUp size={16} color="#F59E0B" />
              <span>Xếp Hạng Rủi Ro Tài Xế (Điểm Thấp Nhất)</span>
            </span>
            <Link to="/admin/employees" style={{ fontSize: '12px', color: 'var(--amber-primary)', fontWeight: 700 }}>
              Hồ sơ
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {driverRankings.map((driver, index) => {
              const isRiskHigh = driver.avgScore < 85
              return (
                <div
                  key={driver._id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: index < 2 ? 'var(--red-bg)' : '#FFFFFF',
                        border: '1px solid var(--card-border)',
                        color: index < 2 ? '#EF4444' : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {index + 1}
                    </span>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {driver.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {driver.vehicleId || 'Chưa gán xe'} · {driver.incidentsCount} cảnh báo
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Sparkline data={driver.spark} color={isRiskHigh ? '#EF4444' : '#F59E0B'} width={70} height={20} />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: isRiskHigh ? '#EF4444' : driver.avgScore >= 90 ? '#10B981' : '#F59E0B',
                        minWidth: 42,
                        textAlign: 'right',
                      }}
                    >
                      {driver.avgScore}đ
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

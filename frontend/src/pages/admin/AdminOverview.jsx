import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Award,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Inbox,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getDB, updateDB, subscribe } from '../../store/db'
import StatusBadge from '../../components/common/StatusBadge'
import { Sparkline } from '../../components/common/SVGCharts'
import EmptyState from '../../components/common/EmptyState'
import styles from './AdminPages.module.css'

export default function AdminOverview() {
  const { user, organization } = useAuth()
  const [db, setDb] = useState(() => getDB())

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  // Filter Drivers by Organization
  const orgDrivers = useMemo(() => {
    const list = db.users || []
    if (!user?.organizationId) return []
    return list.filter(
      (u) => u.role === 'DRIVER' && u.organizationId === user.organizationId
    )
  }, [db.users, user?.organizationId])

  const orgDriverIds = useMemo(() => orgDrivers.map((d) => d._id), [orgDrivers])

  // Filter Trips & Incidents for this Organization
  const orgTrips = useMemo(() => {
    return (db.trips || []).filter((t) => orgDriverIds.includes(t.driverId))
  }, [db.trips, orgDriverIds])

  const orgIncidents = useMemo(() => {
    return (db.incidents || []).filter(
      (i) => orgDriverIds.includes(i.driverId) || (user?.organizationId && i.organizationId === user.organizationId)
    )
  }, [db.incidents, orgDriverIds, user?.organizationId])

  // KPI Computations
  const totalDrivers = orgDrivers.length
  const activeDrivers = orgDrivers.filter((d) => d.status === 'driving' || d.cameraActive).length

  const avgSafetyScore = useMemo(() => {
    if (orgTrips.length === 0) return null
    const sum = orgTrips.reduce((a, b) => a + (b.safetyScore || 90), 0)
    return (sum / orgTrips.length).toFixed(1)
  }, [orgTrips])

  const todayIncidentsCount = useMemo(() => {
    const today = new Date().toDateString()
    return orgIncidents.filter((i) => {
      return i.level === 2 && new Date(i.ts).toDateString() === today
    }).length
  }, [orgIncidents])

  const safeHoursTotal = useMemo(() => {
    if (orgTrips.length === 0) return 0
    const totalDist = orgTrips.reduce((a, b) => a + (b.distanceKm || 0), 0)
    return Math.round(totalDist / 45) // Approx 45km/h avg
  }, [orgTrips])

  // Recent 8 incidents
  const recentIncidents = useMemo(() => {
    return [...orgIncidents].slice(0, 8)
  }, [orgIncidents])

  // Driver Risk Ranking (worst score first)
  const driverRankings = useMemo(() => {
    return orgDrivers
      .map((d) => {
        const dTrips = orgTrips.filter((t) => t.driverId === d._id)
        const dIncidents = orgIncidents.filter((i) => i.driverId === d._id)
        const avgScore = dTrips.length > 0
          ? Math.round(dTrips.reduce((a, b) => a + b.safetyScore, 0) / dTrips.length)
          : null

        const spark = dTrips.slice(0, 6).map((t) => t.safetyScore).reverse()
        if (spark.length === 0 && avgScore) spark.push(avgScore)

        return {
          ...d,
          avgScore,
          incidentsCount: dIncidents.length,
          spark,
        }
      })
      .sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100))
  }, [orgDrivers, orgTrips, orgIncidents])

  const handleResolveIncident = (incidentId) => {
    updateDB((currentDb) => {
      const inc = currentDb.incidents.find((i) => i._id === incidentId)
      if (inc) {
        inc.status = 'resolved'
        inc.resolvedBy = user?.name || 'Quản Trị Viên'
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
            <span className={styles.kpiLabel}>Tài Xế Đang Lái</span>
            <Users size={18} color="#38BDF8" />
          </div>
          <div className={styles.kpiValue}>
            {activeDrivers} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {totalDrivers}</span>
          </div>
          <div className={styles.kpiSub}>
            {totalDrivers > 0
              ? `Tỷ lệ trực tuyến: ${Math.round((activeDrivers / totalDrivers) * 100)}%`
              : 'Chưa có tài xế nào trong tổ chức'}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Điểm An Toàn Đội Xe</span>
            <Award size={18} color="#10B981" />
          </div>
          <div className={styles.kpiValue} style={{ color: avgSafetyScore ? (Number(avgSafetyScore) >= 90 ? '#10B981' : '#F59E0B') : 'var(--text-muted)' }}>
            {avgSafetyScore || '--'} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <div className={styles.kpiSub}>
            {avgSafetyScore ? 'Tính trên các phiên lái đã hoàn thành' : 'Chưa có dữ liệu chuyến đi'}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Sự Cố Nguy Hiểm Hôm Nay</span>
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <div className={styles.kpiValue} style={{ color: todayIncidentsCount > 0 ? '#EF4444' : '#10B981' }}>
            {todayIncidentsCount} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>vụ</span>
          </div>
          <div className={styles.kpiSub}>
            {todayIncidentsCount > 0 ? 'Cảnh báo ngủ gật Cấp 2 tự động' : 'Không có sự cố nghiêm trọng'}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Giờ Lái An Toàn Tích Lũy</span>
            <Clock size={18} color="#F59E0B" />
          </div>
          <div className={styles.kpiValue}>
            {safeHoursTotal} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>giờ</span>
          </div>
          <div className={styles.kpiSub}>
            {orgTrips.length > 0 ? `Tổng ${orgTrips.length} chuyến đi được giám sát` : 'Chưa ghi nhận giờ lái nào'}
          </div>
        </div>
      </div>

      {/* Main 2-Col Grid: Real-time Incident Feed & Driver Risk Ranking */}
      <div className={styles.twoColGrid}>
        {/* Left: Real-time Incident Feed */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <AlertTriangle size={16} color="#EF4444" />
              <span>Dòng Sự Kiện & Cảnh Báo An Toàn</span>
            </span>
            <Link
              to="/admin/history"
              style={{
                fontSize: '12px',
                color: 'var(--amber-dark)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Xem tất cả</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {recentIncidents.length === 0 ? (
            <div style={{ padding: '30px 10px' }}>
              <EmptyState
                icon={ShieldCheck}
                title="Chưa có cảnh báo nào"
                description="Khi tài xế kích hoạt buồng lái và hệ thống phát hiện mất tập trung hoặc ngủ gật, sự cố sẽ lập tức xuất hiện tại đây."
              />
            </div>
          ) : (
            <div className={styles.incidentList}>
              {recentIncidents.map((inc) => {
                const driver = orgDrivers.find((u) => u._id === inc.driverId)
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
                            {driver?.name || inc.driverName || 'Tài xế'}
                          </span>
                          <StatusBadge
                            level={inc.level}
                            label={inc.type === 'DROWSY' ? 'Ngủ gật' : inc.type === 'YAWN' ? 'Ngáp' : 'Lơ đãng'}
                          />
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
          )}
        </div>

        {/* Right: Driver Risk Ranking (Worst First) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <TrendingUp size={16} color="#F59E0B" />
              <span>Xếp Hạng An Toàn Nhân Viên</span>
            </span>
            <Link to="/admin/employees" style={{ fontSize: '12px', color: 'var(--amber-dark)', fontWeight: 700 }}>
              Quản lý đội ngũ
            </Link>
          </div>

          {driverRankings.length === 0 ? (
            <div style={{ padding: '30px 10px' }}>
              <EmptyState
                icon={Users}
                title="Chưa có nhân viên"
                description="Tổ chức chưa có tài xế nào. Hãy thêm tài xế đầu tiên để bắt đầu theo dõi hiệu suất an toàn."
                action={
                  <Link
                    to="/admin/employees"
                    className={styles.btnPrimary}
                    style={{ textDecoration: 'none', display: 'inline-flex', marginTop: 12 }}
                  >
                    Thêm Nhân Viên
                  </Link>
                }
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {driverRankings.map((driver, index) => {
                const score = driver.avgScore
                const isRiskHigh = score !== null && score < 85

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
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: index === 0 && isRiskHigh ? 'var(--red-bg)' : '#FFFFFF',
                          border: '1px solid var(--card-border)',
                          color: index === 0 && isRiskHigh ? '#EF4444' : 'var(--text-muted)',
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
                          {driver.email} · {driver.incidentsCount} cảnh báo
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {driver.spark.length > 1 && (
                        <Sparkline data={driver.spark} color={isRiskHigh ? '#EF4444' : '#F59E0B'} width={65} height={18} />
                      )}
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          color: score === null ? 'var(--text-muted)' : isRiskHigh ? '#EF4444' : score >= 90 ? '#10B981' : '#F59E0B',
                          minWidth: 42,
                          textAlign: 'right',
                        }}
                      >
                        {score !== null ? `${score}đ` : '--'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

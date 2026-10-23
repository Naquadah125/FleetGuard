import { useState, useMemo } from 'react'
import {
  FileText,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  Award,
  Clock,
  TrendingUp,
  CheckCircle,
  Inbox,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getDB } from '../../store/db'
import { LineChart, BarChart } from '../../components/common/SVGCharts'
import { toast } from '../../components/common/Toast'
import EmptyState from '../../components/common/EmptyState'
import styles from './AdminPages.module.css'

export default function AdminReports() {
  const { user, organization } = useAuth()
  const db = getDB()
  const [timeRange, setTimeRange] = useState('30days') // '7days' | '30days' | 'all'

  // Filter Drivers by current admin's Organization
  const orgDrivers = useMemo(() => {
    const list = db.users || []
    if (!user?.organizationId) return []
    return list.filter(
      (u) => u.role === 'DRIVER' && u.organizationId === user.organizationId
    )
  }, [db.users, user?.organizationId])

  const orgDriverIds = useMemo(() => orgDrivers.map((d) => d._id), [orgDrivers])

  // Filter trips and incidents within selected time range
  const { filteredTrips, filteredIncidents } = useMemo(() => {
    const now = Date.now()
    const msLimit =
      timeRange === '7days'
        ? 7 * 86400000
        : timeRange === '30days'
        ? 30 * 86400000
        : Infinity

    const trips = (db.trips || []).filter((t) => {
      if (!orgDriverIds.includes(t.driverId)) return false
      if (msLimit !== Infinity) {
        return now - new Date(t.startedAt).getTime() <= msLimit
      }
      return true
    })

    const incidents = (db.incidents || []).filter((i) => {
      const belongs = orgDriverIds.includes(i.driverId) || (user?.organizationId && i.organizationId === user.organizationId)
      if (!belongs) return false
      if (msLimit !== Infinity) {
        return now - new Date(i.ts).getTime() <= msLimit
      }
      return true
    })

    return { filteredTrips: trips, filteredIncidents: incidents }
  }, [db.trips, db.incidents, orgDriverIds, user?.organizationId, timeRange])

  // Incidents Breakdown by Type
  const typeBreakdown = useMemo(() => {
    let drowsy = 0
    let yawn = 0
    let distract = 0

    filteredIncidents.forEach((i) => {
      if (i.type === 'DROWSY') drowsy++
      else if (i.type === 'YAWN') yawn++
      else distract++
    })

    const total = filteredIncidents.length || 1
    return [
      { label: 'Ngủ gật buồng lái (EAR < 0.21)', count: drowsy, percent: Math.round((drowsy / total) * 100), color: '#EF4444' },
      { label: 'Ngáp buồn ngủ (MAR > 0.60)', count: yawn, percent: Math.round((yawn / total) * 100), color: '#F59E0B' },
      { label: 'Mất tập trung / Quay đầu (> 25°)', count: distract, percent: Math.round((distract / total) * 100), color: '#38BDF8' },
    ]
  }, [filteredIncidents])

  // Incidents by Hour of Day
  const hourDistribution = useMemo(() => {
    const buckets = [
      { label: '00-04h', value: 0 },
      { label: '04-08h', value: 0 },
      { label: '08-12h', value: 0 },
      { label: '12-16h', value: 0 },
      { label: '16-20h', value: 0 },
      { label: '20-24h', value: 0 },
    ]

    filteredIncidents.forEach((inc) => {
      const h = new Date(inc.ts).getHours()
      if (h < 4) buckets[0].value++
      else if (h < 8) buckets[1].value++
      else if (h < 12) buckets[2].value++
      else if (h < 16) buckets[3].value++
      else if (h < 20) buckets[4].value++
      else buckets[5].value++
    })

    return buckets
  }, [filteredIncidents])

  // Safety Score Trend for line chart
  const trendScores = useMemo(() => {
    if (filteredTrips.length === 0) return []
    // Group by days
    const days = timeRange === '7days' ? 7 : 14
    const arr = []
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(Date.now() - i * 86400000).toDateString()
      const dayTrips = filteredTrips.filter((t) => new Date(t.startedAt).toDateString() === targetDate)
      if (dayTrips.length > 0) {
        const avg = Math.round(dayTrips.reduce((a, b) => a + (b.safetyScore || 90), 0) / dayTrips.length)
        arr.push(avg)
      } else if (arr.length > 0) {
        arr.push(arr[arr.length - 1]) // carry forward last known score
      }
    }
    return arr
  }, [filteredTrips, timeRange])

  // Top Risky Drivers
  const riskyDrivers = useMemo(() => {
    const map = {}
    filteredIncidents.forEach((inc) => {
      map[inc.driverId] = (map[inc.driverId] || 0) + 1
    })

    return Object.entries(map)
      .map(([id, count]) => {
        const u = orgDrivers.find((userItem) => userItem._id === id)
        return {
          id,
          name: u ? u.name : 'Tài xế',
          email: u ? u.email : '',
          incidentsCount: count,
        }
      })
      .sort((a, b) => b.incidentsCount - a.incidentsCount)
      .slice(0, 5)
  }, [filteredIncidents, orgDrivers])

  // Resolution Rate (real computation)
  const resolutionRate = useMemo(() => {
    if (filteredIncidents.length === 0) return 100
    const resolved = filteredIncidents.filter((i) => i.status === 'resolved').length
    return Math.round((resolved / filteredIncidents.length) * 100)
  }, [filteredIncidents])

  // Export CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredIncidents.length === 0) {
      toast.error('Không có dữ liệu', 'Chưa có sự cố nào trong khoảng thời gian đã chọn để xuất file.')
      return
    }

    const headers = ['ID,Thời Gian,Tài Xế,Email,Loại Sự Cố,Mức Độ,Chi Tiết Sinh Trắc,Trạng Thái,Xử Lý Bởi,Ghi Chú']
    const rows = filteredIncidents.map((inc) => {
      const d = orgDrivers.find((u) => u._id === inc.driverId)
      return `"${inc._id}","${inc.ts}","${d?.name || inc.driverName || 'Tài xế'}","${d?.email || ''}","${inc.type}",${inc.level},"${inc.metrics}","${inc.status}","${inc.resolvedBy || ''}","${inc.note || ''}"`
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FleetGuard_Bao_Cao_${organization?.name || 'Doanh_Nghiep'}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Xuất file thành công', 'File báo cáo CSV đã được tải xuống máy tính.')
  }

  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div>
      {/* Top Header & Filters Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Báo cáo tổng hợp số liệu an toàn buồng lái của tổ chức <strong>{organization?.name || 'Đội xe'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Time Range Selector */}
          <div
            style={{
              display: 'inline-flex',
              background: '#FFFFFF',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              padding: '3px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              style={{
                background: timeRange === '7days' ? 'var(--amber-primary)' : 'transparent',
                color: timeRange === '7days' ? '#0F172A' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => setTimeRange('7days')}
            >
              7 ngày qua
            </button>
            <button
              style={{
                background: timeRange === '30days' ? 'var(--amber-primary)' : 'transparent',
                color: timeRange === '30days' ? '#0F172A' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => setTimeRange('30days')}
            >
              30 ngày qua
            </button>
            <button
              style={{
                background: timeRange === 'all' ? 'var(--amber-primary)' : 'transparent',
                color: timeRange === 'all' ? '#0F172A' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => setTimeRange('all')}
            >
              Toàn bộ
            </button>
          </div>

          <button className={styles.btnSecondary} onClick={handlePrintPDF}>
            <Printer size={15} />
            <span>In / PDF</span>
          </button>

          <button className={styles.btnPrimary} onClick={handleExportCSV}>
            <Download size={15} />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
            TỔNG SỐ PHIÊN LÁI
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0' }}>
            {filteredTrips.length}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={13} />
            <span>100% có giám sát AI</span>
          </div>
        </div>

        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
            TỔNG SỐ CẢNH BÁO
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: filteredIncidents.length > 0 ? '#F59E0B' : 'var(--text-main)', margin: '6px 0' }}>
            {filteredIncidents.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Gồm Cấp 1 và Cấp 2
          </div>
        </div>

        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
            NGỦ GẬT CẤP 2 (NGUY HIỂM)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: filteredIncidents.some((i) => i.level === 2) ? '#EF4444' : '#10B981', margin: '6px 0' }}>
            {filteredIncidents.filter((i) => i.level === 2).length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Kích hoạt còi báo tức thì
          </div>
        </div>

        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
            TỶ LỆ XỬ LÝ SỰ CỐ
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', margin: '6px 0' }}>
            {resolutionRate}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Biên bản giải quyết hoàn tất
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className={styles.twoColGrid} style={{ marginBottom: 24 }}>
        {/* Safety Trend Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <TrendingUp size={16} color="#10B981" />
              <span>Xu Hướng Điểm An Toàn Đội Xe</span>
            </span>
            <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>Mục tiêu &ge; 90đ</span>
          </div>

          {trendScores.length > 1 ? (
            <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--card-border)' }}>
              <LineChart
                series={[{ name: 'Điểm an toàn', color: '#10B981', data: trendScores }]}
                thresholds={[{ value: 90, color: '#F59E0B', label: 'Chuẩn 90đ' }]}
                height={190}
                min={60}
                max={100}
              />
            </div>
          ) : (
            <div style={{ padding: '40px 10px', textAlign: 'center' }}>
              <EmptyState
                icon={TrendingUp}
                title="Chưa có dữ liệu xu hướng"
                description="Hệ thống cần ít nhất 2 phiên lái hoàn tất để vẽ biểu đồ diễn biến điểm an toàn."
              />
            </div>
          )}
        </div>

        {/* Incidents by Hour of Day Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Clock size={16} color="#F59E0B" />
              <span>Phân Bố Cảnh Báo Theo Khung Giờ</span>
            </span>
          </div>

          {filteredIncidents.length > 0 ? (
            <>
              <BarChart data={hourDistribution} height={190} barColor="#38BDF8" activeBarColor="#EF4444" />
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                * Biểu thị khung giờ tài xế hay gặp mệt mỏi, hỗ trợ điều chỉnh lịch ca hợp lý
              </div>
            </>
          ) : (
            <div style={{ padding: '40px 10px', textAlign: 'center' }}>
              <EmptyState
                icon={Clock}
                title="Chưa có dữ liệu khung giờ"
                description="Chưa có sự cố nào được ghi nhận trong khoảng thời gian đã chọn."
              />
            </div>
          )}
        </div>
      </div>

      {/* Breakdown by Type & Top Risky Drivers */}
      <div className={styles.twoColGrid}>
        {/* Breakdown by Type */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <AlertTriangle size={16} color="#EF4444" />
              <span>Cơ Cấu Sự Cố Theo Tính Chất Vi Phạm</span>
            </span>
          </div>

          {filteredIncidents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {typeBreakdown.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {item.count} vụ ({item.percent}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'var(--border-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${item.percent}%`, height: '100%', background: item.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '30px 10px', textAlign: 'center' }}>
              <EmptyState
                icon={ShieldCheck}
                title="Đội ngũ an toàn tuyệt đối"
                description="Không ghi nhận vi phạm sinh trắc học nào trong kỳ báo cáo này."
              />
            </div>
          )}
        </div>

        {/* Top Risky Drivers */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Award size={16} color="#EF4444" />
              <span>Tài Xế Cần Huấn Luyện Thêm</span>
            </span>
          </div>

          {riskyDrivers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {riskyDrivers.map((driver, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
                      {driver.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {driver.email}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#EF4444',
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {driver.incidentsCount} cảnh báo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '30px 10px', textAlign: 'center' }}>
              <EmptyState
                icon={Award}
                title="Chưa có tài xế nào bị cảnh báo"
                description="Tất cả các tài xế đều đang duy trì mức độ an toàn cao."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

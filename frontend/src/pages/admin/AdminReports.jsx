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
} from 'lucide-react'
import { getDB } from '../../store/db'
import { LineChart, BarChart } from '../../components/common/SVGCharts'
import { toast } from '../../components/common/Toast'
import styles from './AdminPages.module.css'

export default function AdminReports() {
  const db = getDB()
  const [timeRange, setTimeRange] = useState('30days') // '7days' | '30days'

  const orgTrips = useMemo(() => {
    return db.trips.filter((t) => t.driverId !== 'user_driver_free')
  }, [db.trips])

  const orgIncidents = useMemo(() => {
    return db.incidents.filter((i) => i.driverId !== 'user_driver_free')
  }, [db.incidents])

  // Incidents by Type Breakdown
  const typeBreakdown = useMemo(() => {
    let drowsy = 0
    let perclos = 0
    let yawn = 0
    let distract = 0

    orgIncidents.forEach((i) => {
      if (i.type === 'DROWSY') drowsy++
      else if (i.type === 'PERCLOS_HIGH') perclos++
      else if (i.type === 'YAWN') yawn++
      else distract++
    })

    const total = orgIncidents.length || 1
    return [
      { label: 'Ngủ gật (EAR < 0.21)', count: drowsy, percent: Math.round((drowsy / total) * 100), color: '#EF4444' },
      { label: 'Mệt mỏi kéo dài (PERCLOS > 30%)', count: perclos, percent: Math.round((perclos / total) * 100), color: '#F43F5E' },
      { label: 'Ngáp buồn ngủ (MAR > 0.60)', count: yawn, percent: Math.round((yawn / total) * 100), color: '#F59E0B' },
      { label: 'Lơ đãng / Quay mặt (> 25°)', count: distract, percent: Math.round((distract / total) * 100), color: '#38BDF8' },
    ]
  }, [orgIncidents])

  // Incidents by Hour of Day (Circadian rhythm distribution)
  const hourDistribution = useMemo(() => {
    const buckets = [
      { label: '00-04h', value: 0 },
      { label: '04-08h', value: 0 },
      { label: '08-12h', value: 0 },
      { label: '12-16h', value: 0 },
      { label: '16-20h', value: 0 },
      { label: '20-24h', value: 0 },
    ]

    orgIncidents.forEach((inc) => {
      const h = new Date(inc.ts).getHours()
      if (h < 4) buckets[0].value++
      else if (h < 8) buckets[1].value++
      else if (h < 12) buckets[2].value++
      else if (h < 16) buckets[3].value++
      else if (h < 20) buckets[4].value++
      else buckets[5].value++
    })

    return buckets
  }, [orgIncidents])

  // Trend Data for 30 days
  const trendScores = useMemo(() => {
    const arr = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toDateString()
      const dayTrips = orgTrips.filter((t) => new Date(t.startedAt).toDateString() === d)
      const avg = dayTrips.length > 0
        ? Math.round(dayTrips.reduce((a, b) => a + b.safetyScore, 0) / dayTrips.length)
        : 88 + ((i * 3) % 7)
      arr.push(avg)
    }
    return arr
  }, [orgTrips])

  // Top Risky Drivers
  const riskyDrivers = useMemo(() => {
    const map = {}
    orgIncidents.forEach((inc) => {
      map[inc.driverId] = (map[inc.driverId] || 0) + 1
    })

    return Object.entries(map)
      .map(([id, count]) => {
        const u = db.users.find((user) => user._id === id)
        return {
          name: u ? u.name : id,
          vehicle: u?.vehicleId || 'N/A',
          incidentsCount: count,
        }
      })
      .sort((a, b) => b.incidentsCount - a.incidentsCount)
      .slice(0, 5)
  }, [orgIncidents, db.users])

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID,Thời Gian,Tài Xế,Phương Tiện,Loại Sự Cố,Mức Độ,Chi Tiết Sinh Trắc,Trạng Thái,Ghi Chú']
    const rows = orgIncidents.map((inc) => {
      const d = db.users.find((u) => u._id === inc.driverId)
      return `"${inc._id}","${inc.ts}","${d?.name || 'Tài xế'}","${inc.vehicleId}","${inc.type}",${inc.level},"${inc.metrics}","${inc.status}","${inc.note || ''}"`
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FleetGuard_Bao_Cao_An_Toan_${new Date().toISOString().slice(0, 10)}.csv`)
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
      {/* Top Action Header */}
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
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Tổng hợp dữ liệu vi phạm an toàn, phân bố khung giờ và xếp hạng rủi ro
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className={styles.btnSecondary} onClick={handlePrintPDF}>
            <Printer size={15} />
            <span>In / Lưu PDF</span>
          </button>

          <button className={styles.btnPrimary} onClick={handleExportCSV}>
            <Download size={15} />
            <span>Xuất Dữ Liệu CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Overview Mini Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TỔNG SỐ CHUYẾN ĐI</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>
            {orgTrips.length}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981' }}>100% có giám sát AI</div>
        </div>

        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TỔNG CẢNH BÁO AN TOÀN</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', margin: '4px 0' }}>
            {orgIncidents.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trong 30 ngày qua</div>
        </div>

        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CẢNH BÁO NGỦ GẬT CẤP 2</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444', margin: '4px 0' }}>
            {orgIncidents.filter((i) => i.level === 2).length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Kích hoạt còi báo tức thì</div>
        </div>

        <div className={styles.card} style={{ padding: 18 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TỶ LỆ XỬ LÝ SỰ CỐ</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', margin: '4px 0' }}>
            94.2%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Biên bản điều hành hoàn tất</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className={styles.twoColGrid} style={{ marginBottom: 24 }}>
        {/* Safety Trend 30 days */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <TrendingUp size={16} color="#10B981" />
              <span>Xu Hướng Điểm An Toàn Đội Xe 30 Ngày</span>
            </span>
            <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>Đạt chuẩn &ge; 90đ</span>
          </div>

          <div style={{ background: 'rgba(6, 14, 28, 0.5)', padding: 16, borderRadius: 12 }}>
            <LineChart
              series={[{ name: 'Điểm an toàn', color: '#10B981', data: trendScores }]}
              thresholds={[{ value: 90, color: '#F59E0B', label: 'Mục tiêu (90đ)' }]}
              height={190}
              min={70}
              max={100}
            />
          </div>
        </div>

        {/* Incidents by Hour of Day */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Clock size={16} color="#F59E0B" />
              <span>Phân Bố Cảnh Báo Theo Khung Giờ</span>
            </span>
          </div>
          <BarChart data={hourDistribution} height={190} barColor="#38BDF8" activeBarColor="#EF4444" />
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            * Khung giờ 00-04h và 16-20h ghi nhận tỷ lệ mệt mỏi & ngủ gật cao nhất
          </div>
        </div>
      </div>

      {/* Breakdown by Type & Top Risky Drivers */}
      <div className={styles.twoColGrid}>
        {/* Breakdown by Type */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <AlertTriangle size={16} />
              <span>Cơ Cấu Sự Cố Theo Tính Chất Vi Phạm</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {typeBreakdown.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {item.count} vụ ({item.percent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: 7, background: 'var(--border-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${item.percent}%`, height: '100%', background: item.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Risky Drivers */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Award size={16} color="#EF4444" />
              <span>Tài Xế Cần Huấn Luyện An Toàn Thêm</span>
            </span>
          </div>

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
                    Phương tiện: {driver.vehicle}
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
        </div>
      </div>
    </div>
  )
}

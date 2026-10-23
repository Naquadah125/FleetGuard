import { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Award,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getDB, generateTelemetryForTrip } from '../../store/db'
import { fetchSessions, getUserId } from '../../api/sessions'
import Modal from '../../components/common/Modal'
import { LineChart } from '../../components/common/SVGCharts'
import styles from './DriverPages.module.css'

export default function DriverHistory() {
  const { user, organization } = useAuth()
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [filterScore, setFilterScore] = useState('all')
  const [serverTrips, setServerTrips] = useState([])
  const [historyError, setHistoryError] = useState('')

  const isFreePlan = !organization || organization.plan === 'free'
  const userId = getUserId(user)

  const db = getDB()
  const allMyTrips = useMemo(() => {
    const localTrips = db.trips.filter((t) => t.driverId === userId)
    const tripsById = new Map(localTrips.map((trip) => [trip._id, trip]))
    serverTrips.forEach((trip) => tripsById.set(trip._id, { ...tripsById.get(trip._id), ...trip }))
    return [...tripsById.values()].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  }, [db.trips, serverTrips, userId])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    fetchSessions(userId)
      .then((trips) => {
        if (!cancelled) {
          setServerTrips(trips)
          setHistoryError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHistoryError(`${err.message}. Đang hiển thị dữ liệu cục bộ.`)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  // Filter 7 days if free plan
  const visibleTrips = useMemo(() => {
    let list = allMyTrips
    if (isFreePlan) {
      const sevenDaysAgo = Date.now() - 7 * 86400000
      list = list.filter((t) => new Date(t.startedAt).getTime() >= sevenDaysAgo)
    }

    if (filterScore === 'high') return list.filter((t) => t.safetyScore >= 90)
    if (filterScore === 'low') return list.filter((t) => t.safetyScore < 90)
    return list
  }, [allMyTrips, isFreePlan, filterScore])

  // Telemetry curve for selected trip
  const telemetryData = useMemo(() => {
    if (!selectedTrip) return []
    return generateTelemetryForTrip(selectedTrip, 40)
  }, [selectedTrip])

  const earSeries = telemetryData.map((d) => d.ear)
  const marSeries = telemetryData.map((d) => d.mar)

  const tripIncidents = useMemo(() => {
    if (!selectedTrip) return []
    return db.incidents.filter((i) => i.tripId === selectedTrip._id)
  }, [db.incidents, selectedTrip])

  const chartMarkers = tripIncidents.map((inc, i) => ({
    index: Math.min(38, (i + 1) * 8),
    label: inc.type === 'DROWSY' ? 'Ngủ gật' : inc.type === 'YAWN' ? 'Ngáp' : 'Lơ đãng',
    color: inc.level === 2 ? '#EF4444' : '#F59E0B',
  }))

  const formatDate = (iso) => {
    if (!iso) return 'N/A'
    const d = new Date(iso)
    return `${d.toLocaleDateString('vi-VN')} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  }

  const formatDuration = (start, end) => {
    if (!start) return 'N/A'
    const s = new Date(start).getTime()
    const e = end ? new Date(end).getTime() : Date.now()
    const diffMins = Math.round((e - s) / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} phút`
  }

  return (
    <div>
      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Lọc theo điểm số:
          </span>
          <button
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: filterScore === 'all' ? 'var(--amber-primary)' : '#FFFFFF',
              color: filterScore === 'all' ? '#0F172A' : 'var(--text-secondary)',
              border: filterScore === 'all' ? '1px solid var(--amber-primary)' : '1px solid var(--card-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onClick={() => setFilterScore('all')}
          >
            Tất cả ({allMyTrips.length})
          </button>
          <button
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: filterScore === 'high' ? 'var(--amber-primary)' : '#FFFFFF',
              color: filterScore === 'high' ? '#0F172A' : 'var(--text-secondary)',
              border: filterScore === 'high' ? '1px solid var(--amber-primary)' : '1px solid var(--card-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onClick={() => setFilterScore('high')}
          >
            An toàn (&ge; 90đ)
          </button>
          <button
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: filterScore === 'low' ? 'var(--amber-primary)' : '#FFFFFF',
              color: filterScore === 'low' ? '#0F172A' : 'var(--text-secondary)',
              border: filterScore === 'low' ? '1px solid var(--amber-primary)' : '1px solid var(--card-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onClick={() => setFilterScore('low')}
          >
            Có cảnh báo (&lt; 90đ)
          </button>
        </div>
      </div>

      {historyError && (
        <div style={{ marginBottom: 12, fontSize: '12px', color: 'var(--amber-dark)' }}>
          {historyError}
        </div>
      )}

      {/* Trips List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleTrips.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--bg-subtle)',
              borderRadius: '16px',
              border: '1px dashed var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Clock size={36} color="var(--text-muted)" style={{ opacity: 0.6 }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              Chưa có hành trình lái xe nào
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.5 }}>
              Hệ thống sẽ tự động lưu lại phiên làm việc, điểm an toàn và các cảnh báo sau khi bạn kích hoạt camera tại mục Giám Sát.
            </div>
          </div>
        ) : (
          visibleTrips.map((trip) => {
            const isHigh = trip.safetyScore >= 90
          return (
            <div
              key={trip._id}
              className={styles.card}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
              }}
              onClick={() => setSelectedTrip(trip)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: isHigh ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${isHigh ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 800, color: isHigh ? '#34D399' : '#FBBF24' }}>
                    {trip.safetyScore}
                  </span>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Điểm</span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {formatDate(trip.startedAt)}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--card-border)',
                        color: 'var(--text-secondary)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {trip.vehicleId}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <span>Thời lượng: {formatDuration(trip.startedAt, trip.endedAt)}</span>
                    <span>Quãng đường: {trip.distanceKm} km</span>
                    <span>Cảnh báo: {trip.drowsyCount + trip.yawnCount + trip.distractedCount}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '12.5px', color: 'var(--amber-primary)', fontWeight: 700 }}>
                  Xem Biểu Đồ
                </span>
                <ChevronRight size={18} color="var(--amber-primary)" />
              </div>
            </div>
          )
        }))}
      </div>

      {/* Trip Detail Modal */}
      {selectedTrip && (
        <Modal
          isOpen={!!selectedTrip}
          onClose={() => setSelectedTrip(null)}
          title={`Chi Tiết Hành Trình · ${formatDate(selectedTrip.startedAt)}`}
          size="large"
          footer={
            <button
              style={{
                background: '#FFFFFF',
                color: 'var(--text-main)',
                border: '1px solid var(--card-border)',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
              onClick={() => setSelectedTrip(null)}
            >
              Đóng
            </button>
          }
        >
          <div>
            {/* KPI Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ĐIỂM AN TOÀN</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: selectedTrip.safetyScore >= 90 ? '#10B981' : '#F59E0B' }}>
                  {selectedTrip.safetyScore} / 100
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>QUÃNG ĐƯỜNG</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedTrip.distanceKm} km
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NGỦ GẬT (CẤP 2)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: selectedTrip.drowsyCount > 0 ? '#EF4444' : '#10B981' }}>
                  {selectedTrip.drowsyCount} lần
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NGÁP / LƠ ĐÃNG</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>
                  {selectedTrip.yawnCount + selectedTrip.distractedCount} lần
                </div>
              </div>
            </div>

            {/* Telemetry Chart */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  Biểu Đồ Sinh Trắc Học Thời Gian Thực (EAR & MAR)
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '11.5px' }}>
                  <span style={{ color: '#2563EB' }}>● Độ mở mắt (EAR)</span>
                  <span style={{ color: '#F59E0B' }}>● Độ mở miệng (MAR)</span>
                  <span style={{ color: '#EF4444' }}>- - Ngưỡng ngủ gật 0.21</span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--card-border)' }}>
                <LineChart
                  series={[
                    { name: 'EAR', color: '#2563EB', data: earSeries },
                    { name: 'MAR', color: '#F59E0B', data: marSeries },
                  ]}
                  thresholds={[
                    { value: 0.21, color: '#EF4444', label: 'Ngưỡng nhắm mắt (0.21)' },
                  ]}
                  markers={chartMarkers}
                  height={190}
                />
              </div>
            </div>

            {/* Incidents List in this Trip */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: 10 }}>
                Nhật Ký Cảnh Báo Trên Hành Trình
              </div>

              {tripIncidents.length === 0 ? (
                <div style={{ padding: 14, background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 8, fontSize: '13px', color: 'var(--green-dark)' }}>
                  ✓ Không ghi nhận cảnh báo nguy hiểm nào. Chuyến đi an toàn tuyệt đối!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tripIncidents.map((inc) => (
                    <div
                      key={inc._id}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={16} color={inc.level === 2 ? '#EF4444' : '#F59E0B'} />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {inc.type === 'DROWSY' ? 'Cảnh báo ngủ gật' : inc.type === 'YAWN' ? 'Ngáp mệt mỏi' : 'Mất tập trung'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>({inc.metrics})</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatDate(inc.ts)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

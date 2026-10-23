import { useEffect, useMemo, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSocket } from '../../api/socket'
import { fetchAdminTrips, recordAdminAudit } from '../../api/adminOperations'
import EmptyState from '../../components/common/EmptyState'
import styles from './AdminTrips.module.css'

const periodOptions = [
  { value: '7', label: '7 ngày gần đây' },
  { value: '30', label: '30 ngày gần đây' },
  { value: 'all', label: 'Toàn bộ lịch sử' },
]

function periodDates(period) {
  if (period === 'all') return {}
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - Number(period))
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function AdminTrips() {
  const { user, token } = useAuth()
  const [period, setPeriod] = useState('7')
  const [status, setStatus] = useState('')
  const [driverSearch, setDriverSearch] = useState('')
  const [data, setData] = useState({ items: [], summary: {}, pagination: { page: 1, pages: 0, total: 0 } })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextPage = page) => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchAdminTrips(token, {
        ...periodDates(period),
        status,
        driverSearch,
        page: nextPage,
        limit: 20,
      })
      setData(result)
      setPage(nextPage)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [period, status, token])

  useEffect(() => {
    const socket = getSocket()
    const refresh = () => load(1)
    socket.on('trip:lifecycle', refresh)
    return () => socket.off('trip:lifecycle', refresh)
  }, [period, status, driverSearch])

  const score = data.summary.averageSafetyScore
  const hasCompleted = data.summary.completedSessions > 0
  const driverHint = useMemo(() => driverSearch.trim(), [driverSearch])

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VẬN HÀNH ĐỘI XE</p>
          <h1>Lịch sử chuyến đi</h1>
          <p>Theo dõi các phiên lái của nhân viên trong tổ chức.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={() => load(page)} disabled={loading}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </header>

      <div className={styles.scoreCard}>
        <div><span>Điểm An Toàn Đội Xe</span><strong>{hasCompleted ? `${score} / 100` : '-- / 100'}</strong></div>
        <small>{hasCompleted ? `${data.summary.completedSessions} chuyến đã hoàn thành` : 'Chưa có dữ liệu chuyến đi'}</small>
      </div>

      <div className={styles.filters}>
        <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Khoảng thời gian">
          {periodOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Trạng thái">
          <option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang chạy</option><option value="COMPLETED">Đã kết thúc</option>
        </select>
        <input value={driverSearch} onChange={(event) => setDriverSearch(event.target.value)} placeholder="Tìm tên hoặc email tài xế" />
        <button type="button" onClick={() => load(1)} disabled={loading}>Lọc</button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {!loading && !data.items.length ? (
        <EmptyState
          icon={Activity}
          title="Chưa có dữ liệu chuyến đi"
          description="Chưa có dữ liệu chuyến đi, thêm lịch sử chuyến đi (session) để có thể dùng cho dữ liệu này."
          action={<div className={styles.emptyActions}><Link to="/admin/employees">Quản lý nhân viên</Link><Link to="/admin/cameras">Mở camera giám sát</Link></div>}
        />
      ) : (
        <div className={styles.tableWrap}>
          <table><thead><tr><th>Tài xế</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thời lượng</th><th>Điểm</th><th>Vi phạm</th><th>Trạng thái</th></tr></thead>
            <tbody>{data.items.map((item) => <tr key={item.session_id}><td><strong>{item.driver?.name}</strong><small>{item.driver?.email}</small></td><td>{formatDate(item.start_time)}</td><td>{formatDate(item.end_time)}</td><td>{Math.max(0, item.duration_seconds || 0)}s</td><td>{item.status === 'COMPLETED' ? `${item.safety_score ?? '—'}/100` : '—'}</td><td>{(item.drowsy_count || 0) + (item.yawn_count || 0) + (item.distracted_count || 0)}</td><td><span className={item.status === 'ACTIVE' ? styles.active : styles.completed}>{item.status === 'ACTIVE' ? 'Đang chạy' : 'Đã kết thúc'}</span></td></tr>)}</tbody>
          </table>
          <div className={styles.pagination}><span>{data.pagination.total} phiên · {driverHint || 'toàn bộ tài xế'}</span><div><button type="button" onClick={() => load(page - 1)} disabled={page <= 1 || loading}>Trước</button><span>{page} / {Math.max(1, data.pagination.pages)}</span><button type="button" onClick={() => load(page + 1)} disabled={page >= data.pagination.pages || loading}>Sau</button></div></div>
        </div>
      )}
    </section>
  )
}

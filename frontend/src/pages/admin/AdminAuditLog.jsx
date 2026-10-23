import { useEffect, useState } from 'react'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { fetchAdminAuditLog, recordAdminAudit } from '../../api/adminOperations'
import EmptyState from '../../components/common/EmptyState'
import styles from './AdminAuditLog.module.css'

function formatDate(value) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function AdminAuditLog() {
  const { token } = useAuth()
  const [filters, setFilters] = useState({ page: 1, limit: 20, action: '', resourceType: '' })
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 0, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextFilters = filters) => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchAdminAuditLog(token, nextFilters))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }))
  const goToPage = (page) => {
    const next = { ...filters, page }
    setFilters(next)
    load(next)
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>KIỂM SOÁT THAY ĐỔI</p>
          <h1>Audit log</h1>
          <p>Lịch sử thao tác quản trị, chỉ đọc và không có thao tác xóa.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={() => load()} disabled={loading}><RefreshCw size={16} /> Làm mới</button>
      </header>
      <div className={styles.filters}>
        <input placeholder="Tên action, ví dụ CREATE_EMPLOYEE" value={filters.action} onChange={(event) => updateFilter('action', event.target.value)} />
        <select value={filters.resourceType} onChange={(event) => updateFilter('resourceType', event.target.value)} aria-label="Loại tài nguyên">
          <option value="">Tất cả tài nguyên</option><option value="employee">Nhân viên</option><option value="driving_session">Chuyến đi</option><option value="incident">Sự cố</option><option value="audit_log">Audit log</option>
        </select>
        <button type="button" onClick={() => load({ ...filters, page: 1 })} disabled={loading}>Lọc</button>
      </div>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {!loading && !data.items.length ? (
        <EmptyState icon={ClipboardList} title="Chưa có audit log" description="Các thao tác quản trị sẽ xuất hiện tại đây." />
      ) : (
        <div className={styles.tableWrap}>
          <table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người thực hiện</th><th>Tài nguyên</th><th>Mô tả</th></tr></thead>
            <tbody>{data.items.map((item) => <tr key={item._id || item.id}><td>{formatDate(item.timestamp || item.createdAt)}</td><td><strong>{item.action}</strong></td><td>{item.actorName || item.actorEmail || item.actor?.name || item.actor?.email || item.actor_id || 'Hệ thống'}</td><td>{item.resourceType || item.resource_type || '—'}{item.resourceId ? <small>{item.resourceId}</small> : null}</td><td>{item.description || '—'}</td></tr>)}</tbody>
          </table>
          <div className={styles.pagination}><span>{data.pagination.total} bản ghi</span><div><button type="button" onClick={() => goToPage(filters.page - 1)} disabled={filters.page <= 1 || loading}>Trước</button><span>{filters.page} / {Math.max(1, data.pagination.pages)}</span><button type="button" onClick={() => goToPage(filters.page + 1)} disabled={filters.page >= data.pagination.pages || loading}>Sau</button></div></div>
        </div>
      )}
    </section>
  )
}

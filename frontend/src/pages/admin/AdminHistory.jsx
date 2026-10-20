import { useState, useEffect, useMemo } from 'react'
import {
  History,
  AlertTriangle,
  CheckCircle,
  Filter,
  Save,
  Clock,
  User,
  Truck,
} from 'lucide-react'
import { getDB, updateDB, subscribe } from '../../store/db'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import { toast } from '../../components/common/Toast'
import styles from './AdminPages.module.css'

export default function AdminHistory() {
  const [db, setDb] = useState(() => getDB())
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [resolveNote, setResolveNote] = useState('')

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('all') // 'all' | 'level2' | 'level1'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'open' | 'resolved'
  const [filterDriver, setFilterDriver] = useState('all')

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  const orgDrivers = useMemo(() => {
    return db.users.filter((u) => u.role === 'DRIVER' && u.organizationId)
  }, [db.users])

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return db.incidents.filter((inc) => {
      if (filterSeverity === 'level2' && inc.level !== 2) return false
      if (filterSeverity === 'level1' && inc.level !== 1) return false
      if (filterStatus === 'open' && inc.status !== 'open') return false
      if (filterStatus === 'resolved' && inc.status !== 'resolved') return false
      if (filterDriver !== 'all' && inc.driverId !== filterDriver) return false
      return true
    })
  }, [db.incidents, filterSeverity, filterStatus, filterDriver])

  const handleOpenResolve = (inc) => {
    setSelectedIncident(inc)
    setResolveNote(inc.note || 'Đã liên hệ tài xế qua bộ đàm, yêu cầu dừng xe kiểm tra an toàn.')
  }

  const handleSaveResolve = () => {
    if (!selectedIncident) return
    updateDB((currentDb) => {
      const inc = currentDb.incidents.find((i) => i._id === selectedIncident._id)
      if (inc) {
        inc.status = 'resolved'
        inc.resolvedBy = 'Trần Quản Trị'
        inc.note = resolveNote.trim()
      }
      return currentDb
    })
    toast.success('Đã xử lý sự cố', 'Đã lưu ghi nhận giải quyết vào nhật ký đội xe.')
    setSelectedIncident(null)
  }

  const formatDate = (iso) => {
    if (!iso) return 'N/A'
    const d = new Date(iso)
    return `${d.toLocaleDateString('vi-VN')} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  }

  const columns = [
    {
      header: 'Thời Gian',
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {formatDate(row.ts)}
        </span>
      ),
    },
    {
      header: 'Tài Xế',
      render: (row) => {
        const d = db.users.find((u) => u._id === row.driverId)
        return <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{d ? d.name : 'Tài xế'}</span>
      },
    },
    {
      header: 'Phương Tiện',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {row.vehicleId}
        </span>
      ),
    },
    {
      header: 'Loại Vi Phạm & Chi Tiết',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
            {row.type === 'DROWSY'
              ? 'Ngủ gật buồng lái'
              : row.type === 'YAWN'
              ? 'Ngáp mệt mỏi'
              : row.type === 'PERCLOS_HIGH'
              ? 'Nhắm mắt liên tục (PERCLOS)'
              : 'Quay đầu mất tập trung'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{row.metrics}</div>
        </div>
      ),
    },
    {
      header: 'Mức Độ',
      render: (row) => <StatusBadge level={row.level} />,
    },
    {
      header: 'Trạng Thái',
      render: (row) => {
        const isResolved = row.status === 'resolved'
        return isResolved ? (
          <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', fontWeight: 700 }}>
            <CheckCircle size={14} />
            <span>Đã xử lý</span>
          </span>
        ) : (
          <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', fontWeight: 700 }}>
            <AlertTriangle size={14} />
            <span>Chờ xử lý</span>
          </span>
        )
      },
    },
    {
      header: 'Thao Tác',
      render: (row) => (
        <button
          style={{
            background: row.status === 'resolved' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${row.status === 'resolved' ? 'var(--card-border)' : 'rgba(245, 158, 11, 0.4)'}`,
            color: row.status === 'resolved' ? 'var(--text-secondary)' : 'var(--amber-primary)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onClick={() => handleOpenResolve(row)}
        >
          {row.status === 'resolved' ? 'Xem biên bản' : 'Xử lý ngay'}
        </button>
      ),
    },
  ]

  return (
    <div>
      {/* Filters Bar */}
      <div
        className={styles.card}
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <Filter size={15} />
            <span style={{ fontWeight: 700 }}>Mức độ:</span>
          </div>

          <select
            className={styles.formSelect}
            style={{ padding: '6px 12px', fontSize: '12.5px' }}
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">Tất cả mức độ</option>
            <option value="level2">Cấp 2 (Nguy hiểm / Ngủ gật)</option>
            <option value="level1">Cấp 1 (Cảnh báo mệt mỏi)</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700 }}>Trạng thái:</span>
          </div>

          <select
            className={styles.formSelect}
            style={{ padding: '6px 12px', fontSize: '12.5px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="open">Chờ xử lý</option>
            <option value="resolved">Đã xử lý</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700 }}>Tài xế:</span>
          </div>

          <select
            className={styles.formSelect}
            style={{ padding: '6px 12px', fontSize: '12.5px' }}
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
          >
            <option value="all">Tất cả tài xế</option>
            {orgDrivers.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          Lọc được: <strong>{filteredIncidents.length}</strong> sự cố
        </span>
      </div>

      {/* Incidents Table */}
      <DataTable
        columns={columns}
        data={filteredIncidents}
        searchPlaceholder="Tìm theo chi tiết cảnh báo hoặc loại vi phạm..."
        searchKey="type"
        pageSize={10}
      />

      {/* Incident Detail & Resolve Modal */}
      {selectedIncident && (
        <Modal
          isOpen={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          title={`Chi Tiết & Xử Lý Sự Cố · ${selectedIncident.type}`}
          footer={
            <>
              <button className={styles.btnSecondary} onClick={() => setSelectedIncident(null)}>
                Đóng
              </button>
              <button className={styles.btnPrimary} onClick={handleSaveResolve}>
                <Save size={14} />
                <span>Lưu Biên Bản Xử Lý</span>
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ background: 'rgba(6, 14, 28, 0.6)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MỨC ĐỘ NGUY HIỂM</div>
                <StatusBadge level={selectedIncident.level} />
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>THỜI ĐIỂM GHI NHẬN</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatDate(selectedIncident.ts)}
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PHƯƠNG TIỆN</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blue-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedIncident.vehicleId}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 8, border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: 4 }}>
                THÔNG SỐ SINH TRẮC HỌC TẠI THỜI ĐIỂM VI PHẠM
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--amber-dark)' }}>
                {selectedIncident.metrics}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>
                Ghi Chú Xử Lý Của Điều Hành Viên
              </label>
              <textarea
                style={{
                  width: '100%',
                  height: 90,
                  background: '#FFFFFF',
                  border: '1px solid var(--card-border)',
                  borderRadius: 8,
                  padding: 12,
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  resize: 'none',
                }}
                placeholder="Nhập ghi chú liên hệ, nhắc nhở hoặc yêu cầu đổi ca lái..."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

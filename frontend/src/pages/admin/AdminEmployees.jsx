import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  User,
  Mail,
  Truck,
  FileText,
  Save,
  CheckCircle,
} from 'lucide-react'
import { getDB, updateDB, subscribe } from '../../store/db'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { LineChart, Sparkline } from '../../components/common/SVGCharts'
import { toast } from '../../components/common/Toast'
import styles from './AdminPages.module.css'

export default function AdminEmployees() {
  const [db, setDb] = useState(() => getDB())

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [deleteConfirmDriver, setDeleteConfirmDriver] = useState(null)
  const [profileDriver, setProfileDriver] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')

  // Form fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formVehicle, setFormVehicle] = useState('')
  const [formStatus, setFormStatus] = useState('resting')

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  // Org Drivers
  const orgDrivers = useMemo(() => {
    return db.users.filter((u) => u.role === 'DRIVER' && u.organizationId)
  }, [db.users])

  // Available vehicles
  const vehicles = db.vehicles

  const handleOpenAdd = () => {
    setEditingDriver(null)
    setFormName('')
    setFormEmail('')
    setFormVehicle('')
    setFormStatus('resting')
    setIsAddEditOpen(true)
  }

  const handleOpenEdit = (driver, e) => {
    e.stopPropagation()
    setEditingDriver(driver)
    setFormName(driver.name)
    setFormEmail(driver.email)
    setFormVehicle(driver.vehicleId || '')
    setFormStatus(driver.status || 'resting')
    setIsAddEditOpen(true)
  }

  const handleSaveDriver = (e) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim()) return

    updateDB((currentDb) => {
      if (editingDriver) {
        // Edit existing
        const idx = currentDb.users.findIndex((u) => u._id === editingDriver._id)
        if (idx !== -1) {
          currentDb.users[idx] = {
            ...currentDb.users[idx],
            name: formName.trim(),
            email: formEmail.trim(),
            vehicleId: formVehicle || null,
            status: formStatus,
          }
        }
      } else {
        // Add new
        const newId = 'driver_' + Date.now()
        currentDb.users.push({
          _id: newId,
          name: formName.trim(),
          email: formEmail.trim(),
          passwordHash: 'fleet1234',
          role: 'DRIVER',
          organizationId: 'org_phuongnam',
          vehicleId: formVehicle || null,
          status: formStatus,
          avatarColor: '#2563EB',
          notes: '',
          createdAt: new Date().toISOString(),
        })
      }
      return currentDb
    })

    setIsAddEditOpen(false)
    toast.success('Thành công', editingDriver ? 'Đã cập nhật thông tin nhân viên' : 'Đã thêm tài xế mới vào đội xe')
  }

  const handleDeleteDriver = () => {
    if (!deleteConfirmDriver) return
    updateDB((currentDb) => {
      currentDb.users = currentDb.users.filter((u) => u._id !== deleteConfirmDriver._id)
      return currentDb
    })
    toast.success('Đã xóa', `Đã xóa tài xế ${deleteConfirmDriver.name}`)
    setDeleteConfirmDriver(null)
    if (profileDriver?._id === deleteConfirmDriver._id) setProfileDriver(null)
  }

  const handleOpenProfile = (driver) => {
    setProfileDriver(driver)
    setAdminNotes(driver.notes || '')
  }

  const handleSaveNotes = () => {
    if (!profileDriver) return
    updateDB((currentDb) => {
      const u = currentDb.users.find((user) => user._id === profileDriver._id)
      if (u) u.notes = adminNotes
      return currentDb
    })
    toast.success('Đã lưu ghi chú', 'Ghi chú điều hành đã được cập nhật.')
  }

  // Profile data
  const driverTrips = useMemo(() => {
    if (!profileDriver) return []
    return db.trips.filter((t) => t.driverId === profileDriver._id)
  }, [profileDriver, db.trips])

  const driverIncidents = useMemo(() => {
    if (!profileDriver) return []
    return db.incidents.filter((i) => i.driverId === profileDriver._id)
  }, [profileDriver, db.incidents])

  const driverScores = useMemo(() => {
    if (driverTrips.length === 0) return [92, 90, 94, 91]
    return driverTrips.map((t) => t.safetyScore).reverse()
  }, [driverTrips])

  // Columns for DataTable
  const columns = [
    {
      header: 'Họ Và Tên',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: row.avatarColor || '#2563EB',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '12px',
            }}
          >
            {row.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Phương Tiện',
      render: (row) => {
        const v = vehicles.find((veh) => veh._id === row.vehicleId)
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {v ? v.plate : row.vehicleId || 'Chưa gán xe'}
          </span>
        )
      },
    },
    {
      header: 'Trạng Thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Điểm An Toàn',
      render: (row) => {
        const dTrips = db.trips.filter((t) => t.driverId === row._id)
        const avg = dTrips.length > 0
          ? Math.round(dTrips.reduce((a, b) => a + b.safetyScore, 0) / dTrips.length)
          : 90
        const isHigh = avg >= 90
        return (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: isHigh ? '#10B981' : '#F59E0B',
            }}
          >
            {avg} / 100
          </span>
        )
      },
    },
    {
      header: 'Thao Tác',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              cursor: 'pointer',
            }}
            onClick={(e) => handleOpenEdit(row, e)}
          >
            <Edit2 size={13} />
            <span>Sửa</span>
          </button>

          <button
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation()
              setDeleteConfirmDriver(row)
            }}
          >
            <Trash2 size={13} />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className={styles.btnPrimary} onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Thêm Nhân Viên Mới</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={orgDrivers}
        searchPlaceholder="Tìm kiếm theo tên hoặc email tài xế..."
        searchKey="name"
        pageSize={8}
        toolbarExtra={<span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng số: {orgDrivers.length} tài xế</span>}
      />

      {/* Add / Edit Driver Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingDriver ? `Chỉnh Sửa Hồ Sơ · ${editingDriver.name}` : 'Thêm Tài Xế Mới Vào Đoàn Xe'}
        footer={
          <>
            <button className={styles.btnSecondary} onClick={() => setIsAddEditOpen(false)}>
              Hủy
            </button>
            <button className={styles.btnPrimary} onClick={handleSaveDriver}>
              <Save size={14} />
              <span>{editingDriver ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}</span>
            </button>
          </>
        }
      >
        <form className={styles.formGrid} onSubmit={handleSaveDriver}>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Họ và tên tài xế</label>
            <input
              className={styles.formInput}
              placeholder="Nguyễn Văn A"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>Email đăng nhập</label>
            <input
              type="email"
              className={styles.formInput}
              placeholder="taixe@phuongnam.vn"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>Gán phương tiện phụ trách</label>
            <select
              className={styles.formSelect}
              value={formVehicle}
              onChange={(e) => setFormVehicle(e.target.value)}
            >
              <option value="">-- Chưa gán xe --</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.plate} ({v.type})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>Trạng thái làm việc</label>
            <select
              className={styles.formSelect}
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            >
              <option value="driving">Đang lái xe (Hoạt động)</option>
              <option value="resting">Đang nghỉ ngơi</option>
              <option value="offline">Ngoại tuyến</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmDriver}
        onClose={() => setDeleteConfirmDriver(null)}
        onConfirm={handleDeleteDriver}
        title="Xác Nhận Xóa Nhân Viên"
        message={`Bạn có chắc chắn muốn xóa tài xế ${deleteConfirmDriver?.name} khỏi hệ thống đội xe?`}
      />

      {/* Driver Profile Drawer Modal (Triggered by row click if needed) */}
      {profileDriver && (
        <Modal
          isOpen={!!profileDriver}
          onClose={() => setProfileDriver(null)}
          title={`Hồ Sơ Toàn Diện · ${profileDriver.name}`}
          size="large"
          footer={
            <button className={styles.btnSecondary} onClick={() => setProfileDriver(null)}>
              Đóng
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Trend Chart */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10, textTransform: 'uppercase' }}>
                Xu Hướng Điểm An Toàn Gần Đây
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--card-border)' }}>
                <LineChart
                  series={[{ name: 'Điểm an toàn', color: '#10B981', data: driverScores }]}
                  height={160}
                  min={60}
                  max={100}
                />
              </div>
            </div>

            {/* Admin Notes Field */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  Ghi Chú Quản Trị Viên
                </span>
                <button
                  style={{
                    background: 'var(--amber-primary)',
                    color: '#0F172A',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={handleSaveNotes}
                >
                  Lưu Ghi Chú
                </button>
              </div>
              <textarea
                style={{
                  width: '100%',
                  height: 80,
                  background: '#FFFFFF',
                  border: '1px solid var(--card-border)',
                  borderRadius: 8,
                  padding: 12,
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  resize: 'none',
                }}
                placeholder="Ghi chú về phản ứng, lộ trình hoặc lịch hẹn huấn luyện bổ sung..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

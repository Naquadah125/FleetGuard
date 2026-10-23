import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  User,
  Mail,
  Lock,
  FileText,
  Save,
  CheckCircle,
  Eye,
  Camera,
  CameraOff,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getDB, updateDB, subscribe } from '../../store/db'
import { recordAdminAudit } from '../../api/adminOperations'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { LineChart } from '../../components/common/SVGCharts'
import { toast } from '../../components/common/Toast'
import styles from './AdminPages.module.css'

export default function AdminEmployees() {
  const { user, organization, token } = useAuth()
  const [db, setDb] = useState(() => getDB())

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [deleteConfirmDriver, setDeleteConfirmDriver] = useState(null)
  const [profileDriver, setProfileDriver] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('123456')

  const targetOrgId = user?.organizationId || 'org_6adb1f069a6b13c161dc5f70'
  const targetOrgName = organization?.name || user?.organizationName || 'testcty'

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  // Fetch employees from MongoDB backend on mount & sync
  const fetchEmployees = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`/api/auth/employees?organizationId=${targetOrgId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.employees)) {
          updateDB((currentDb) => {
            const nonOrgUsers = currentDb.users.filter(
              (u) => !(u.role === 'DRIVER' && (u.organizationId === targetOrgId || !u.organizationId))
            )
            currentDb.users = [...nonOrgUsers, ...data.employees]
            return currentDb
          })
        }
      }
    } catch (err) {
      console.warn('Failed to fetch employees from backend:', err)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [targetOrgId, token])

  // Filter Org Drivers by logged in admin's organization
  const orgDrivers = useMemo(() => {
    const list = db.users || []
    return list.filter(
      (u) => (u.role === 'DRIVER' || u.role === 'USER') && (u.organizationId === targetOrgId || (!user?.organizationId && u.organizationId === 'org_6adb1f069a6b13c161dc5f70'))
    )
  }, [db.users, targetOrgId, user?.organizationId])

  const handleOpenAdd = () => {
    setEditingDriver(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('123456')
    setIsAddEditOpen(true)
  }

  const handleOpenEdit = (driver, e) => {
    if (e) e.stopPropagation()
    setEditingDriver(driver)
    setFormName(driver.name)
    setFormEmail(driver.email)
    setFormPassword(driver.passwordHash || '123456')
    setIsAddEditOpen(true)
  }

  const handleSaveDriver = async (e) => {
    if (e) e.preventDefault()
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập họ tên và email')
      return
    }

    const lowerEmail = formEmail.trim().toLowerCase()
    setIsSaving(true)

    try {
      if (editingDriver) {
        // Edit existing
        const res = await fetch(`/api/auth/employees/${editingDriver._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: formName.trim(),
            email: lowerEmail,
            password: formPassword.trim() || undefined
          })
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Lỗi khi cập nhật tài xế')
        }

        updateDB((currentDb) => {
          const idx = currentDb.users.findIndex((u) => u._id === editingDriver._id)
          if (idx !== -1) {
            currentDb.users[idx] = {
              ...currentDb.users[idx],
              name: formName.trim(),
              email: lowerEmail,
            }
          }
          return currentDb
        })
        toast.success('Thành công', `Đã cập nhật thông tin tài xế ${formName}`)
        recordAdminAudit(token, { action: 'UPDATE_EMPLOYEE', resourceType: 'employee', resourceId: editingDriver._id, description: `Cập nhật nhân viên ${formName}` }).catch(() => {})
      } else {
        // Add new driver to organization via backend API -> MongoDB
        const res = await fetch('/api/auth/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: formName.trim(),
            email: lowerEmail,
            password: formPassword.trim() || '123456',
            organizationId: targetOrgId,
            organizationName: targetOrgName
          })
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Lỗi khi tạo tài khoản nhân viên')
        }

        const newDriver = data.user
        recordAdminAudit(token, { action: 'CREATE_EMPLOYEE', resourceType: 'employee', resourceId: newDriver?._id, description: `Tạo nhân viên ${formName}` }).catch(() => {})
        updateDB((currentDb) => {
          const existingIdx = currentDb.users.findIndex((u) => u._id === newDriver._id || u.email === newDriver.email)
          if (existingIdx !== -1) {
            currentDb.users[existingIdx] = newDriver
          } else {
            currentDb.users.push(newDriver)
          }
          return currentDb
        })

        toast.success(
          'Thành công',
          `Đã tạo tài khoản tài xế mới (${formEmail}). Mật khẩu: ${formPassword || '123456'}`
        )
      }

      setIsAddEditOpen(false)
    } catch (err) {
      toast.error('Lỗi', err.message || 'Không thể lưu tài xế')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDriver = async () => {
    if (!deleteConfirmDriver) return
    try {
      await fetch(`/api/auth/employees/${deleteConfirmDriver._id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err)
    }

    updateDB((currentDb) => {
      currentDb.users = currentDb.users.filter((u) => u._id !== deleteConfirmDriver._id)
      return currentDb
    })
    toast.success('Đã xóa', `Đã xóa tài khoản tài xế ${deleteConfirmDriver.name}`)
    recordAdminAudit(token, { action: 'DELETE_EMPLOYEE', resourceType: 'employee', resourceId: deleteConfirmDriver._id, description: `Xóa nhân viên ${deleteConfirmDriver.name}` }).catch(() => {})
    setDeleteConfirmDriver(null)
    if (profileDriver?._id === deleteConfirmDriver._id) setProfileDriver(null)
  }

  const handleOpenProfile = (driver, e) => {
    if (e) e.stopPropagation()
    setProfileDriver(driver)
    setAdminNotes(driver.notes || '')
  }

  const handleSaveNotes = async () => {
    if (!profileDriver) return
    try {
      await fetch(`/api/auth/employees/${profileDriver._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ notes: adminNotes })
      })
    } catch (err) {
      console.warn('Backend update note failed:', err)
    }
    updateDB((currentDb) => {
      const u = currentDb.users.find((userItem) => userItem._id === profileDriver._id)
      if (u) u.notes = adminNotes
      return currentDb
    })
    toast.success('Đã lưu ghi chú', 'Ghi chú điều hành đã được cập nhật thành công.')
  }

  // Profile data for selected driver
  const driverTrips = useMemo(() => {
    if (!profileDriver) return []
    return (db.trips || []).filter((t) => t.driverId === profileDriver._id)
  }, [profileDriver, db.trips])

  const driverScores = useMemo(() => {
    if (driverTrips.length === 0) return []
    return driverTrips.map((t) => t.safetyScore).reverse()
  }, [driverTrips])

  // Columns for DataTable
  const columns = [
    {
      header: 'Họ Và Tên Tài Xế',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: row.avatarColor || '#2563EB',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {row.avatarImage
              ? <img src={row.avatarImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (row.name ? row.name.charAt(0).toUpperCase() : 'T')}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Trạng Thái Làm Việc',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Camera Buồng Lái',
      render: (row) => {
        const isActive = row.cameraActive === true || row.status === 'driving'
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '12px',
              fontWeight: 700,
              color: isActive ? '#10B981' : 'var(--text-muted)',
            }}
          >
            {isActive ? <Camera size={14} /> : <CameraOff size={14} />}
            <span>{isActive ? 'Đang bật' : 'Đang tắt'}</span>
          </span>
        )
      },
    },
    {
      header: 'Điểm An Toàn',
      render: (row) => {
        const dTrips = (db.trips || []).filter((t) => t.driverId === row._id)
        if (dTrips.length === 0) {
          return <span style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>Chưa có phiên</span>
        }
        const avg = Math.round(dTrips.reduce((a, b) => a + b.safetyScore, 0) / dTrips.length)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            style={{
              background: 'rgba(37, 99, 235, 0.08)',
              color: '#2563EB',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={(e) => handleOpenProfile(row, e)}
            title="Xem chi tiết hồ sơ & xu hướng"
          >
            <Eye size={13} />
            <span>Hồ sơ</span>
          </button>

          <button
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--card-border)',
              color: 'var(--text-main)',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
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
              border: 'none',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
          Danh sách tài khoản nhân viên trực thuộc tổ chức <strong>{organization?.name || 'Đội xe'}</strong>
        </div>

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
        emptyTitle="Chưa có nhân viên nào trong đội ngũ"
        emptyDescription="Tạo tài khoản nhân viên mới để cấp quyền đăng nhập cho tài xế của tổ chức."
        toolbarExtra={<span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng số: {orgDrivers.length} tài xế</span>}
      />

      {/* Add / Edit Driver Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingDriver ? `Chỉnh Sửa Hồ Sơ · ${editingDriver.name}` : 'Tạo Tài Khoản Nhân Viên / Tài Xế Mới'}
        footer={
          <>
            <button className={styles.btnSecondary} onClick={() => setIsAddEditOpen(false)}>
              Hủy
            </button>
            <button className={styles.btnPrimary} onClick={handleSaveDriver} disabled={isSaving}>
              <Save size={14} />
              <span>{isSaving ? 'Đang xử lý...' : editingDriver ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}</span>
            </button>
          </>
        }
      >
        <form className={styles.formGrid} onSubmit={handleSaveDriver}>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Họ và tên tài xế</label>
            <input
              className={styles.formInput}
              placeholder="VD: Nguyễn Văn Nam"
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
              placeholder="taixe@fleet.vn"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>Mật khẩu đăng nhập ban đầu</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Mặc định: 123456"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
              * Tài xế sẽ dùng email và mật khẩu này để đăng nhập vào buồng lái.
            </span>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmDriver}
        onClose={() => setDeleteConfirmDriver(null)}
        onConfirm={handleDeleteDriver}
        title="Xác Nhận Xóa Nhân Viên"
        message={`Bạn có chắc chắn muốn xóa tài khoản tài xế ${deleteConfirmDriver?.name} (${deleteConfirmDriver?.email}) khỏi tổ chức?`}
      />

      {/* Driver Profile Modal */}
      {profileDriver && (
        <Modal
          isOpen={!!profileDriver}
          onClose={() => setProfileDriver(null)}
          title={`Hồ Sơ An Toàn · ${profileDriver.name}`}
          size="large"
          footer={
            <button className={styles.btnSecondary} onClick={() => setProfileDriver(null)}>
              Đóng
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Driver Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EMAIL ĐĂNG NHẬP</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                  {profileDriver.email}
                </div>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TỔNG SỐ PHIÊN LÁI</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                  {driverTrips.length} phiên
                </div>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TRẠNG THÁI CAMERA</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: profileDriver.cameraActive ? '#10B981' : 'var(--text-muted)', marginTop: 2 }}>
                  {profileDriver.cameraActive ? '● Đang mở camera' : '○ Đang tắt camera'}
                </div>
              </div>
            </div>

            {/* Trend Chart */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8, textTransform: 'uppercase' }}>
                Xu Hướng Điểm An Toàn Gần Đây
              </div>
              {driverScores.length > 0 ? (
                <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--card-border)' }}>
                  <LineChart
                    series={[{ name: 'Điểm an toàn', color: '#10B981', data: driverScores }]}
                    height={160}
                    min={60}
                    max={100}
                  />
                </div>
              ) : (
                <div style={{ padding: '24px', background: 'var(--bg-subtle)', border: '1px dashed var(--card-border)', borderRadius: 12, textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Tài xế chưa có phiên lái nào được ghi nhận. Biểu đồ sẽ xuất hiện sau phiên đầu tiên.
                </div>
              )}
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
                    border: 'none',
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
                placeholder="Ghi chú về phản ứng, ca làm việc hoặc đánh giá huấn luyện..."
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

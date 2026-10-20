import { useState, useEffect, useMemo } from 'react'
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  Save,
  CheckCircle,
} from 'lucide-react'
import { getDB, updateDB, subscribe } from '../../store/db'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { toast } from '../../components/common/Toast'
import styles from './AdminPages.module.css'

export default function AdminVehicles() {
  const [db, setDb] = useState(() => getDB())

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deleteConfirmVehicle, setDeleteConfirmVehicle] = useState(null)

  // Form fields
  const [formPlate, setFormPlate] = useState('')
  const [formType, setFormType] = useState('Đầu kéo Freightliner')
  const [formDriver, setFormDriver] = useState('')
  const [formStatus, setFormStatus] = useState('available')

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  const vehicles = useMemo(() => {
    return db.vehicles.filter((v) => v._id !== 'veh_free_1')
  }, [db.vehicles])

  const drivers = useMemo(() => {
    return db.users.filter((u) => u.role === 'DRIVER' && u.organizationId)
  }, [db.users])

  const handleOpenAdd = () => {
    setEditingVehicle(null)
    setFormPlate('')
    setFormType('Đầu kéo Freightliner')
    setFormDriver('')
    setFormStatus('available')
    setIsAddEditOpen(true)
  }

  const handleOpenEdit = (vehicle) => {
    setEditingVehicle(vehicle)
    setFormPlate(vehicle.plate)
    setFormType(vehicle.type)
    setFormDriver(vehicle.driverId || '')
    setFormStatus(vehicle.status || 'available')
    setIsAddEditOpen(true)
  }

  const handleSaveVehicle = (e) => {
    e.preventDefault()
    if (!formPlate.trim()) return

    updateDB((currentDb) => {
      if (editingVehicle) {
        // Edit existing
        const idx = currentDb.vehicles.findIndex((v) => v._id === editingVehicle._id)
        if (idx !== -1) {
          currentDb.vehicles[idx] = {
            ...currentDb.vehicles[idx],
            plate: formPlate.trim().toUpperCase(),
            type: formType,
            driverId: formDriver || null,
            status: formDriver ? formStatus : 'available',
          }
        }
      } else {
        // Add new
        const newId = 'veh_' + Date.now()
        currentDb.vehicles.push({
          _id: newId,
          plate: formPlate.trim().toUpperCase(),
          type: formType,
          organizationId: 'org_phuongnam',
          driverId: formDriver || null,
          status: formDriver ? formStatus : 'available',
        })
      }
      return currentDb
    })

    setIsAddEditOpen(false)
    toast.success('Thành công', editingVehicle ? 'Đã cập nhật thông tin xe' : 'Đã thêm xe mới vào đội')
  }

  const handleDeleteVehicle = () => {
    if (!deleteConfirmVehicle) return
    updateDB((currentDb) => {
      currentDb.vehicles = currentDb.vehicles.filter((v) => v._id !== deleteConfirmVehicle._id)
      return currentDb
    })
    toast.success('Đã xóa', `Đã xóa phương tiện biển số ${deleteConfirmVehicle.plate}`)
    setDeleteConfirmVehicle(null)
  }

  const columns = [
    {
      header: 'Biển Số Xe',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(37, 99, 235, 0.15)',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Truck size={16} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
            {row.plate}
          </span>
        </div>
      ),
    },
    {
      header: 'Loại Phương Tiện',
      accessor: 'type',
    },
    {
      header: 'Tài Xế Phụ Trách',
      render: (row) => {
        const d = drivers.find((user) => user._id === row.driverId)
        return d ? (
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.name}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa gán tài xế</span>
        )
      },
    },
    {
      header: 'Trạng Thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Thao Tác',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            onClick={() => handleOpenEdit(row)}
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
            onClick={() => setDeleteConfirmVehicle(row)}
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
          <span>Thêm Phương Tiện Mới</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={vehicles}
        searchPlaceholder="Tìm kiếm theo biển số xe hoặc loại xe..."
        searchKey="plate"
        pageSize={8}
        toolbarExtra={<span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng số: {vehicles.length} xe</span>}
      />

      {/* Add / Edit Vehicle Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingVehicle ? `Chỉnh Sửa Xe · ${editingVehicle.plate}` : 'Thêm Xe Mới Vào Đội Ngũ'}
        footer={
          <>
            <button className={styles.btnSecondary} onClick={() => setIsAddEditOpen(false)}>
              Hủy
            </button>
            <button className={styles.btnPrimary} onClick={handleSaveVehicle}>
              <Save size={14} />
              <span>{editingVehicle ? 'Lưu Thay Đổi' : 'Thêm Xe'}</span>
            </button>
          </>
        }
      >
        <form className={styles.formGrid} onSubmit={handleSaveVehicle}>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Biển số đăng ký</label>
            <input
              className={styles.formInput}
              placeholder="VD: 51F-889.24"
              value={formPlate}
              onChange={(e) => setFormPlate(e.target.value)}
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>Chủng loại xe</label>
            <select
              className={styles.formSelect}
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="Đầu kéo Freightliner">Đầu kéo Freightliner</option>
              <option value="Xe tải thùng 15 tấn">Xe tải thùng 15 tấn</option>
              <option value="Xe tải Hino 5 tấn">Xe tải Hino 5 tấn</option>
              <option value="Xe container 40 feet">Xe container 40 feet</option>
              <option value="Xe khách 45 chỗ">Xe khách 45 chỗ</option>
              <option value="Xe khách giường nằm">Xe khách giường nằm</option>
              <option value="Xe van trung chuyển">Xe van trung chuyển</option>
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>Gán tài xế phụ trách</label>
            <select
              className={styles.formSelect}
              value={formDriver}
              onChange={(e) => setFormDriver(e.target.value)}
            >
              <option value="">-- Chưa gán tài xế --</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.email})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel}>Trạng thái phương tiện</label>
            <select
              className={styles.formSelect}
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            >
              <option value="driving">Đang lăn bánh (Hoạt động)</option>
              <option value="resting">Đang nghỉ ngơi / Bến bãi</option>
              <option value="available">Sẵn sàng điều động</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmVehicle}
        onClose={() => setDeleteConfirmVehicle(null)}
        onConfirm={handleDeleteVehicle}
        title="Xác Nhận Xóa Phương Tiện"
        message={`Bạn có chắc chắn muốn xóa phương tiện biển số ${deleteConfirmVehicle?.plate} khỏi danh sách đội xe?`}
      />
    </div>
  )
}

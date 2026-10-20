import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác Nhận Hành Động',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này? Dữ liệu đã xóa không thể phục hồi.',
  confirmText = 'Xác Nhận Xóa',
  cancelText = 'Hủy Bỏ',
  danger = true,
}) {
  const footer = (
    <>
      <button
        style={{
          background: '#FFFFFF',
          color: 'var(--text-main)',
          border: '1px solid var(--card-border)',
          padding: '9px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        onClick={onClose}
      >
        {cancelText}
      </button>
      <button
        style={{
          background: danger ? '#EF4444' : '#F59E0B',
          color: '#ffffff',
          padding: '9px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: danger ? '0 4px 14px rgba(239, 68, 68, 0.35)' : 'none',
        }}
        onClick={() => {
          onConfirm()
          onClose()
        }}
      >
        {confirmText}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: danger ? '#EF4444' : '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={22} />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      </div>
    </Modal>
  )
}

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { playAdminChime } from '../../utils/audio'
import styles from './Common.module.css'

// Simple Global Toast Event Bus
const toastListeners = new Set()

export const toast = {
  show: (opts) => {
    const item = {
      id: opts.id || 'toast_' + Date.now() + Math.random(),
      title: opts.title || 'Thông báo',
      desc: opts.desc || '',
      type: opts.type || 'info', // 'info' | 'success' | 'level2'
      level: opts.level,
      duration: opts.duration || 6000,
      action: opts.action,
    }
    toastListeners.forEach((fn) => fn(item))
  },
  level2: (payload) => {
    playAdminChime()
    toast.show({
      title: `⚡ CẢNH BÁO NGUY HIỂM: ${payload.driverName || 'Tài xế'}`,
      desc: `Xe ${payload.vehiclePlate || 'N/A'}: ${payload.type || 'Ngủ gật / Mất tập trung'} (${payload.metrics || ''})`,
      type: 'level2',
      duration: 10000,
    })
  },
  success: (title, desc) => {
    toast.show({ title, desc, type: 'success', duration: 4000 })
  },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (newToast) => {
      setToasts((prev) => [newToast, ...prev.slice(0, 4)]) // Keep max 5 toasts

      if (newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
        }, newToast.duration)
      }
    }

    toastListeners.add(handleToast)
    return () => toastListeners.delete(handleToast)
  }, [])

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className={styles.toastContainer}>
      {toasts.map((t) => {
        const isLevel2 = t.type === 'level2'
        const isSuccess = t.type === 'success'

        return (
          <div
            key={t.id}
            className={`${styles.toast} ${isLevel2 ? styles.toastLevel2 : isSuccess ? styles.toastSuccess : ''}`}
          >
            {isLevel2 ? (
              <AlertTriangle size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
            ) : isSuccess ? (
              <CheckCircle size={20} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
            ) : (
              <Info size={20} color="#38BDF8" style={{ flexShrink: 0, marginTop: 2 }} />
            )}

            <div className={styles.toastContent}>
              <div className={styles.toastTitle}>{t.title}</div>
              <div className={styles.toastDesc}>{t.desc}</div>
              {t.action && <div style={{ marginTop: 8 }}>{t.action}</div>}
            </div>

            <button className={styles.toastClose} onClick={() => removeToast(t.id)}>
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

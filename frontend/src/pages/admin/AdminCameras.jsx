import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Maximize2,
  Camera,
  CameraOff,
  AlertTriangle,
  CheckCircle2,
  Users,
  Activity,
  Eye,
  Smile,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getDB, subscribe } from '../../store/db'
import { getSocket } from '../../api/socket'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import styles from './AdminPages.module.css'

export default function AdminCameras() {
  const { user } = useAuth()
  const [db, setDb] = useState(() => getDB())
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [liveFrames, setLiveFrames] = useState({})

  const targetOrgId = user?.organizationId || 'org_6adb1f069a6b13c161dc5f70'

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  // Sync drivers from backend MongoDB if needed
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch(`/api/auth/employees?organizationId=${targetOrgId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.employees)) {
            setDb((prev) => {
              const otherUsers = (prev.users || []).filter(
                (u) => u.organizationId !== targetOrgId || u.role !== 'DRIVER'
              )
              return { ...prev, users: [...otherUsers, ...data.employees] }
            })
          }
        }
      } catch (err) {
        console.warn('Failed to sync drivers in AdminCameras:', err)
      }
    }
    fetchDrivers()
  }, [targetOrgId])

  // Socket.IO: Join organization room & receive live 15 FPS camera frames
  useEffect(() => {
    const socket = getSocket()
    socket.emit('admin:join', { organizationId: targetOrgId })

    const handleFrame = (payload) => {
      if (!payload || !payload.driverId) return
      setLiveFrames((prev) => ({
        ...prev,
        [payload.driverId]: {
          image: payload.image,
          metrics: payload.metrics || {},
          lastSeen: Date.now(),
        },
      }))
    }

    const handleStatus = (payload) => {
      if (!payload || !payload.driverId) return
      if (payload.cameraActive === false) {
        setLiveFrames((prev) => {
          const copy = { ...prev }
          delete copy[payload.driverId]
          return copy
        })
      }
    }

    socket.on('driver:camera_frame', handleFrame)
    socket.on('driver:camera_status', handleStatus)

    // Heartbeat: switch to 'Camera Chưa Bật' after 4 seconds of silence
    const heartbeatTimer = setInterval(() => {
      const now = Date.now()
      setLiveFrames((prev) => {
        let changed = false
        const next = { ...prev }
        for (const [dId, data] of Object.entries(next)) {
          if (now - data.lastSeen > 4000) {
            delete next[dId]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 1000)

    return () => {
      socket.off('driver:camera_frame', handleFrame)
      socket.off('driver:camera_status', handleStatus)
      clearInterval(heartbeatTimer)
    }
  }, [targetOrgId])

  // Filter Drivers by current admin's Organization
  const orgDrivers = useMemo(() => {
    const list = db.users || []
    return list.filter(
      (u) => u.role === 'DRIVER' && (u.organizationId === targetOrgId || (!user?.organizationId && u.organizationId === 'org_6adb1f069a6b13c161dc5f70'))
    )
  }, [db.users, targetOrgId, user?.organizationId])

  // Get active alert level for driver (check if there is an open incident in last 5 minutes)
  const getDriverAlertLevel = (driverId) => {
    const live = liveFrames[driverId]
    if (live?.metrics?.level) return live.metrics.level

    const fiveMinsAgo = Date.now() - 5 * 60000
    const activeInc = (db.incidents || []).find(
      (i) => i.driverId === driverId && i.status === 'open' && new Date(i.ts).getTime() > fiveMinsAgo
    )
    if (activeInc) return activeInc.level
    return 0
  }

  return (
    <div>
      {/* Top Header Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Giám sát trực tiếp camera buồng lái thời gian thực của toàn bộ tài xế trong đội ngũ
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span>Camera Đang Bật</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />
            <span>Camera Đang Tắt / Nghỉ</span>
          </div>
        </div>
      </div>

      {/* Empty State when no drivers exist in organization */}
      {orgDrivers.length === 0 ? (
        <div className={styles.card} style={{ padding: '60px 20px', textAlign: 'center' }}>
          <EmptyState
            icon={CameraOff}
            title="Chưa có tài xế trong đội ngũ"
            description="Tổ chức hiện chưa có nhân viên nào. Hãy thêm tài xế mới để bắt đầu theo dõi camera buồng lái khi tài xế làm việc."
            action={
              <Link
                to="/admin/employees"
                className={styles.btnPrimary}
                style={{ textDecoration: 'none', display: 'inline-flex', marginTop: 14 }}
              >
                <Users size={16} />
                <span>Thêm Nhân Viên Ngay</span>
              </Link>
            }
          />
        </div>
      ) : (
        /* Camera Wall Grid */
        <div className={styles.cameraWallGrid}>
          {orgDrivers.map((driver) => {
            const live = liveFrames[driver._id]
            const isCameraActive = !!live
            const alertLevel = getDriverAlertLevel(driver._id)
            const isLevel2 = alertLevel === 2
            const isLevel1 = alertLevel === 1

            return (
              <div
                key={driver._id}
                className={`${styles.cameraTile} ${isLevel2 ? styles.cameraTileLevel2 : isLevel1 ? styles.cameraTileLevel1 : ''}`}
                onClick={() => setSelectedDriver({ ...driver, isCameraActive, alertLevel })}
                style={{ cursor: 'pointer' }}
              >
                {/* Screen Area: Live Image Feed vs Inactive Screen */}
                <div
                  className={styles.tileVideoArea}
                  style={{
                    background: '#0B1120',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 180,
                  }}
                >
                  {isCameraActive && live?.image ? (
                    /* Active Live Stream (15 FPS JPEG) with bottom info bar */
                    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 180 }}>
                      <img
                        src={live.image}
                        alt={`Camera ${driver.name}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: 180,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />

                      {/* Top HUD Badge: LIVE · 15 FPS */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#10B981',
                            boxShadow: '0 0 6px #10B981',
                          }}
                        />
                        <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10B981' }}>
                          LIVE · 15 FPS
                        </span>
                      </div>

                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <Maximize2 size={13} color="rgba(255, 255, 255, 0.85)" />
                      </div>

                      {/* Bottom Info Bar: EAR, MAR, Status */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.6) 70%, transparent 100%)',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: '#F1F5F9',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ color: '#38BDF8' }}>
                            EAR {(live.metrics?.ear ?? 0.32).toFixed(2)}
                          </span>
                          <span style={{ color: '#F59E0B' }}>
                            MAR {(live.metrics?.mar ?? 0.18).toFixed(2)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: isLevel2 ? '#EF4444' : isLevel1 ? '#F59E0B' : '#10B981',
                          }}
                        >
                          {isLevel2 ? 'Nguy hiểm' : isLevel1 ? 'Mệt mỏi' : 'Bình thường'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Inactive Camera State - Clean Camera Off screen */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          marginBottom: 10,
                        }}
                      >
                        <CameraOff size={22} />
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8', marginBottom: 3 }}>
                        Camera Chưa Bật
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Tài xế đang nghỉ ngơi
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Tile Info Card */}
                <div className={styles.tileInfo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: driver.avatarColor || '#2563EB',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '12px',
                        flexShrink: 0,
                      }}
                    >
                      {driver.name ? driver.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div>
                      <div className={styles.tileDriverName} style={{ fontSize: '13.5px', fontWeight: 700 }}>
                        {driver.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {driver.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isCameraActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-subtle)',
                        color: isCameraActive ? '#10B981' : 'var(--text-muted)',
                        border: `1px solid ${isCameraActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--card-border)'}`,
                      }}
                    >
                      {isCameraActive ? 'Đang Lái Xe' : 'Đang Nghỉ'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Expanded Tile Modal */}
      {selectedDriver && (
        <Modal
          isOpen={!!selectedDriver}
          onClose={() => setSelectedDriver(null)}
          title={`Chi Tiết Camera Buồng Lái · ${selectedDriver.name}`}
          size="medium"
          footer={
            <button className={styles.btnSecondary} onClick={() => setSelectedDriver(null)}>
              Đóng Cửa Sổ
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {liveFrames[selectedDriver._id]?.image ? (
              <div
                style={{
                  background: '#0B1120',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `2px solid ${selectedDriver.alertLevel === 2 ? '#EF4444' : '#10B981'}`,
                  position: 'relative',
                }}
              >
                <img
                  src={liveFrames[selectedDriver._id].image}
                  alt={selectedDriver.name}
                  style={{
                    width: '100%',
                    maxHeight: 380,
                    objectFit: 'contain',
                    display: 'block',
                    background: '#000000',
                  }}
                />

                {/* Larger bottom telemetry bar */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 800, color: '#10B981' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                      LIVE · 15 FPS
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#38BDF8' }}>
                      EAR: {(liveFrames[selectedDriver._id].metrics?.ear ?? 0.32).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#F59E0B' }}>
                      MAR: {(liveFrames[selectedDriver._id].metrics?.mar ?? 0.18).toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <StatusBadge level={selectedDriver.alertLevel} />
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#0F172A',
                  borderRadius: 12,
                  padding: 36,
                  textAlign: 'center',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CameraOff size={28} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#E2E8F0' }}>
                  Camera Hiện Đang Tắt
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8', maxWidth: 380 }}>
                  Tài xế {selectedDriver.name} chưa kích hoạt buồng lái hoặc đang nghỉ ngơi giữa ca.
                </div>
              </div>
            )}

            {/* Driver Details Card */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>
                Thông Tin Nhân Viên
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Họ và tên</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedDriver.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email đăng nhập</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedDriver.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trạng thái kết nối</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: liveFrames[selectedDriver._id]?.image ? '#10B981' : 'var(--text-muted)' }}>
                    {liveFrames[selectedDriver._id]?.image ? '● Đang truyền hình ảnh trực tiếp' : '○ Ngoại tuyến'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mức cảnh báo an toàn</div>
                  <StatusBadge level={selectedDriver.alertLevel} />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}


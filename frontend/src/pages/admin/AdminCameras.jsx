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
  Zap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getDB, updateDB, subscribe } from '../../store/db'
import { getSocket } from '../../api/socket'
import StatusBadge from '../../components/common/StatusBadge'
import Meter from '../../components/common/Meter'
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
            updateDB((currentDb) => {
              const otherUsers = (currentDb.users || []).filter(
                (u) => !( (u.role === 'DRIVER' || u.role === 'USER') && (u.organizationId === targetOrgId || !u.organizationId) )
              )
              currentDb.users = [...otherUsers, ...data.employees]
              return currentDb
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
    const joinRoom = () => {
      console.log('[AdminCameras] Joining room for organization:', targetOrgId)
      socket.emit('admin:join', { organizationId: targetOrgId })
    }
    joinRoom()
    socket.on('connect', joinRoom)

    let adminFrameCount = 0
    const handleFrame = (payload) => {
      if (!payload || !payload.driverId) return
      adminFrameCount++
      if (adminFrameCount === 1 || adminFrameCount % 150 === 0) {
        console.log('[AdminCameras] Received live frame from driver:', payload.driverId, 'Count:', adminFrameCount)
      }
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
    const filtered = list.filter(
      (u) => (u.role === 'DRIVER' || u.role === 'USER') && (
        u.organizationId === targetOrgId ||
        (!user?.organizationId) ||
        (user?.organizationId && u.organizationId === user.organizationId) ||
        liveFrames[u._id] || liveFrames[u.id]
      )
    )
    if (filtered.length === 0 && list.some(u => u.role === 'DRIVER' || u.role === 'USER')) {
      return list.filter(u => u.role === 'DRIVER' || u.role === 'USER')
    }
    return filtered
  }, [db.users, targetOrgId, user?.organizationId, liveFrames])

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
            const driverKey = driver._id || driver.id
            const live = liveFrames[driverKey] || liveFrames[driver._id] || liveFrames[driver.id]
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
          size="large"
          footer={
            <button className={styles.btnSecondary} onClick={() => setSelectedDriver(null)}>
              Đóng Cửa Sổ
            </button>
          }
        >
          {(() => {
            const selectedKey = selectedDriver._id || selectedDriver.id
            const liveSelected = liveFrames[selectedKey] || liveFrames[selectedDriver._id] || liveFrames[selectedDriver.id]
            const isLive = !!liveSelected?.image

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(340px, 1.35fr) minmax(290px, 1fr)',
                  gap: 20,
                  alignItems: 'start',
                }}
              >
                {/* Left Column: Continuous Live Video Feed (Clean, without bottom bar) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {isLive ? (
                    <div
                      style={{
                        background: '#0B1120',
                        borderRadius: 16,
                        overflow: 'hidden',
                        border: `2px solid ${selectedDriver.alertLevel === 2 ? '#EF4444' : '#10B981'}`,
                        position: 'relative',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                        minHeight: 280,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={liveSelected.image}
                        alt={selectedDriver.name}
                        style={{
                          width: '100%',
                          maxHeight: 380,
                          objectFit: 'contain',
                          display: 'block',
                          background: '#000000',
                        }}
                      />

                      {/* Top HUD Badge: LIVE · 15 FPS */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(0, 0, 0, 0.75)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#10B981',
                            boxShadow: '0 0 8px #10B981',
                          }}
                        />
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10B981' }}>
                          LIVE · 15 FPS
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Inactive Camera Screen */
                    <div
                      style={{
                        background: '#0F172A',
                        borderRadius: 16,
                        padding: 44,
                        textAlign: 'center',
                        border: '1px solid var(--card-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        minHeight: 280,
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
                      <div style={{ fontSize: '13px', color: '#94A3B8', maxWidth: 320 }}>
                        Tài xế {selectedDriver.name} chưa kích hoạt buồng lái hoặc đang nghỉ ngơi giữa ca.
                      </div>
                    </div>
                  )}

                  {/* Driver basic quick info */}
                  <div
                    style={{
                      background: 'var(--bg-subtle, #F8FAFC)',
                      border: '1px solid var(--card-border, #E2E8F0)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {selectedDriver.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {selectedDriver.email}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-subtle)',
                          color: isLive ? '#10B981' : 'var(--text-muted)',
                          border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'var(--card-border)'}`,
                        }}
                      >
                        {isLive ? 'Đang Lái Xe' : 'Đang Nghỉ'}
                      </span>
                      <StatusBadge level={selectedDriver.alertLevel} />
                    </div>
                  </div>
                </div>

                {/* Right Column: CHỈ SỐ SINH TRẮC HỌC Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--card-border, #E2E8F0)',
                      borderRadius: 16,
                      padding: '20px 22px',
                      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 18,
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={18} style={{ color: 'var(--amber-primary, #F59E0B)' }} />
                        <span style={{ fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-main)' }}>
                          Chỉ Số Sinh Trắc Học
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Thời gian thực</span>
                    </div>

                    {/* Biometric Meters */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <Meter
                        label="Độ Mở Mắt"
                        value={liveSelected?.metrics?.ear ?? 0.32}
                        min={0}
                        max={0.45}
                        threshold={0.24}
                        thresholdType="lower"
                        decimals={2}
                      />

                      <Meter
                        label="Độ Mở Miệng"
                        value={liveSelected?.metrics?.mar ?? 0.18}
                        min={0}
                        max={0.85}
                        threshold={0.60}
                        thresholdType="upper"
                        decimals={2}
                      />

                      <Meter
                        label="Mức Mệt Mỏi"
                        value={liveSelected?.metrics?.perclos ?? 0}
                        min={0}
                        max={50}
                        threshold={30}
                        thresholdType="upper"
                        unit="%"
                        decimals={1}
                      />
                    </div>
                  </div>

                  {/* Summary Explanations */}
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.05)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0284C7' }}>Quy tắc ngưỡng cảnh báo:</div>
                    <div>• <strong>EAR &lt; 0.24</strong>: Cảnh báo nhắm mắt / ngủ gật</div>
                    <div>• <strong>MAR &gt; 0.60</strong>: Cảnh báo mở miệng / ngáp dài</div>
                    <div>• <strong>PERCLOS &gt; 30%</strong>: Dấu hiệu mệt mỏi tích lũy cao</div>
                  </div>
                </div>
              </div>
            )
          })()}
        </Modal>
      )}
    </div>
  )
}


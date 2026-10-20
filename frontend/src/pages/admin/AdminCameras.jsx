import { useState, useEffect, useMemo } from 'react'
import {
  Grid,
  Maximize2,
  Camera,
  AlertTriangle,
  Zap,
  Volume2,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import { getDB, subscribe } from '../../store/db'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import styles from './AdminPages.module.css'

export default function AdminCameras() {
  const [db, setDb] = useState(() => getDB())
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [pulseTick, setPulseTick] = useState(0)

  useEffect(() => {
    return subscribe((newDb) => setDb(newDb))
  }, [])

  // Pulse animation tick for animated face wireframe
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((t) => t + 1)
    }, 1500)
    return () => clearInterval(timer)
  }, [])

  const orgDrivers = useMemo(() => {
    return db.users.filter((u) => u.role === 'DRIVER' && u.organizationId)
  }, [db.users])

  // Get active alert level for driver (check if there is an open incident in last 5 minutes)
  const getDriverAlertLevel = (driverId) => {
    const fiveMinsAgo = Date.now() - 5 * 60000
    const activeInc = db.incidents.find(
      (i) => i.driverId === driverId && i.status === 'open' && new Date(i.ts).getTime() > fiveMinsAgo
    )
    if (activeInc) return activeInc.level
    return 0
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Tường camera AI giám sát đa buồng lái trực tiếp từ đoàn xe
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
            <span>Cấp 0 (Bình thường)</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', marginLeft: 8 }} />
            <span>Cấp 1 (Cảnh báo)</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginLeft: 8 }} />
            <span>Cấp 2 (Nguy hiểm)</span>
          </div>
        </div>
      </div>

      {/* Camera Wall Grid */}
      <div className={styles.cameraWallGrid}>
        {orgDrivers.map((driver, index) => {
          const alertLevel = getDriverAlertLevel(driver._id)
          const vehicle = db.vehicles.find((v) => v._id === driver.vehicleId)
          const plate = vehicle ? vehicle.plate : `51F-88${index}.24`

          // Mock telemetry
          const simulatedEar = alertLevel === 2 ? 0.14 : 0.31 + (index % 3) * 0.02
          const simulatedMar = alertLevel === 1 ? 0.68 : 0.18 + (index % 2) * 0.03
          const isLevel2 = alertLevel === 2
          const isLevel1 = alertLevel === 1

          return (
            <div
              key={driver._id}
              className={`${styles.cameraTile} ${isLevel2 ? styles.cameraTileLevel2 : isLevel1 ? styles.cameraTileLevel1 : ''}`}
              onClick={() => setSelectedDriver({ ...driver, plate, alertLevel, ear: simulatedEar, mar: simulatedMar })}
            >
              {/* Tile Video / FaceMesh Area */}
              <div className={styles.tileVideoArea}>
                {/* Animated Face Wireframe Graphic */}
                <div
                  style={{
                    width: 110,
                    height: 135,
                    border: `1.5px dashed ${isLevel2 ? '#EF4444' : isLevel1 ? '#F59E0B' : 'rgba(56, 189, 248, 0.45)'}`,
                    borderRadius: '50% 50% 45% 45%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    padding: '16px 0',
                    transition: 'all 0.5s ease',
                    transform: isLevel2 ? 'translateY(8px) scale(0.96)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div
                      style={{
                        width: 16,
                        height: isLevel2 ? 2 : 7,
                        border: `1.5px solid ${isLevel2 ? '#EF4444' : '#38BDF8'}`,
                        borderRadius: isLevel2 ? 0 : '50%',
                        background: isLevel2 ? '#EF4444' : 'transparent',
                      }}
                    />
                    <div
                      style={{
                        width: 16,
                        height: isLevel2 ? 2 : 7,
                        border: `1.5px solid ${isLevel2 ? '#EF4444' : '#38BDF8'}`,
                        borderRadius: isLevel2 ? 0 : '50%',
                        background: isLevel2 ? '#EF4444' : 'transparent',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      width: 22,
                      height: isLevel1 ? 16 : 5,
                      border: `1.5px solid ${isLevel1 ? '#F59E0B' : '#38BDF8'}`,
                      borderRadius: isLevel1 ? '50%' : '30%',
                      background: isLevel1 ? 'rgba(245, 158, 11, 0.4)' : 'transparent',
                    }}
                  />
                </div>

                {/* HUD Overlay On Tile */}
                <div className={styles.tileHudOverlay}>
                  <div className={styles.tileHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: isLevel2 ? '#EF4444' : '#10B981',
                          boxShadow: `0 0 6px ${isLevel2 ? '#EF4444' : '#10B981'}`,
                        }}
                      />
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                        LIVE
                      </span>
                    </div>

                    <Maximize2 size={13} color="rgba(255,255,255,0.7)" />
                  </div>

                  <div className={styles.tileFooter}>
                    <div className={styles.tileMetrics}>
                      <span className={styles.tileMetricItem} style={{ color: isLevel2 ? '#EF4444' : '#ffffff' }}>
                        EAR {simulatedEar.toFixed(2)}
                      </span>
                      <span className={styles.tileMetricItem} style={{ color: isLevel1 ? '#F59E0B' : '#ffffff' }}>
                        MAR {simulatedMar.toFixed(2)}
                      </span>
                    </div>

                    <StatusBadge level={alertLevel} />
                  </div>
                </div>
              </div>

              {/* Bottom Tile Info Card */}
              <div className={styles.tileInfo}>
                <div>
                  <div className={styles.tileDriverName}>{driver.name}</div>
                  <div className={styles.tilePlate}>{plate}</div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {driver.status === 'driving' ? 'Đang chạy' : 'Đang nghỉ'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Expanded Tile Modal */}
      {selectedDriver && (
        <Modal
          isOpen={!!selectedDriver}
          onClose={() => setSelectedDriver(null)}
          title={`Phóng To Camera Buồng Lái · ${selectedDriver.name} (${selectedDriver.plate})`}
          size="large"
          footer={
            <button
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
              onClick={() => setSelectedDriver(null)}
            >
              Đóng Camera
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                background: '#020610',
                borderRadius: '12px',
                border: `2px solid ${selectedDriver.alertLevel === 2 ? '#EF4444' : 'var(--card-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Expanded Animated Mesh */}
              <div
                style={{
                  width: 220,
                  height: 270,
                  border: `2px dashed ${selectedDriver.alertLevel === 2 ? '#EF4444' : '#38BDF8'}`,
                  borderRadius: '50% 50% 45% 45%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  padding: '28px 0',
                }}
              >
                <div style={{ display: 'flex', gap: 36 }}>
                  <div style={{ width: 28, height: selectedDriver.alertLevel === 2 ? 3 : 14, border: '2px solid #38BDF8', borderRadius: selectedDriver.alertLevel === 2 ? 0 : '50%' }} />
                  <div style={{ width: 28, height: selectedDriver.alertLevel === 2 ? 3 : 14, border: '2px solid #38BDF8', borderRadius: selectedDriver.alertLevel === 2 ? 0 : '50%' }} />
                </div>
                <div style={{ width: 40, height: 12, border: '2px solid #38BDF8', borderRadius: '30%' }} />
              </div>

              {/* HUD Banner */}
              {selectedDriver.alertLevel === 2 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    right: 20,
                    background: '#EF4444',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  ⚡ CẢNH BÁO: TÀI XẾ CÓ DẤU HIỆU NGỦ GẬT — HÃY GỌI BỘ ĐÀM
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MẮT (EAR)</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: selectedDriver.ear < 0.21 ? '#EF4444' : 'var(--text-main)' }}>
                  {selectedDriver.ear.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MIỆNG (MAR)</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: selectedDriver.mar > 0.60 ? '#F59E0B' : 'var(--text-main)' }}>
                  {selectedDriver.mar.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--card-border)', padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TRẠNG THÁI</div>
                <StatusBadge level={selectedDriver.alertLevel} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

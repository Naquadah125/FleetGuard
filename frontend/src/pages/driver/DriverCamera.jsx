import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera,
  CameraOff,
  Volume2,
  AlertTriangle,
  Zap,
  Sliders,
  Clock,
  Play,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { updateDB, broadcastAlert } from '../../store/db'
import {
  SFX_OPTIONS,
  startSfxLoop,
  stopSfxLoop,
  playSfxPreview,
} from '../../utils/audio'
import Meter from '../../components/common/Meter'
import styles from './DriverPages.module.css'

// Helper for 2D distance
function dist(p1, p2) {
  if (!p1 || !p2) return 0
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

export default function DriverCamera() {
  const { user } = useAuth()

  // Camera Active state (starts off until user turns it on)
  const [cameraActive, setCameraActive] = useState(false)

  // Telemetry & Safety State
  const [ear, setEar] = useState(0.32)
  const [mar, setMar] = useState(0.18)
  const [yaw, setYaw] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [perclos, setPerclos] = useState(0)
  const [level, setLevel] = useState(0) // 0: Normal, 1: Warning, 2: Critical

  // Selected SFX sound
  const [selectedSfx, setSelectedSfx] = useState(() => {
    return localStorage.getItem('fleetguard_selected_sfx') || SFX_OPTIONS[0].src
  })

  // Alert Screen & Acknowledge State
  const [alertOverlay, setAlertOverlay] = useState(false)
  const [alertReason, setAlertReason] = useState('Phát hiện dấu hiệu buồn ngủ nghiêm trọng')

  // Calibration state
  const [calibrating, setCalibrating] = useState(false)
  const [calibProgress, setCalibProgress] = useState(0)
  const [earBaseline, setEarBaseline] = useState(0.30)
  const earThreshold = Number((earBaseline * 0.70).toFixed(2)) // 70% of awake baseline

  // No-face state
  const [noFaceSeconds, setNoFaceSeconds] = useState(0)

  // Error message
  const [cameraError, setCameraError] = useState(null)

  // Trip tracking
  const [tripSeconds, setTripSeconds] = useState(145)
  const [tripId] = useState(() => 'trip_live_' + Date.now())

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const cameraInstanceRef = useRef(null)
  const consecutiveClosedRef = useRef(0)
  const earWindowRef = useRef([])
  const lastFaceTimeRef = useRef(Date.now())
  const lastAlert2TimeRef = useRef(0)
  const cooldownUntilRef = useRef(0)
  const earRef = useRef(ear)

  // Keep earRef up-to-date for calibration loop
  useEffect(() => {
    earRef.current = ear
  }, [ear])

  // Format trip timer
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Trip timer runs continuously every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTripSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Calibration loop (Smooth 5-second sampling without resetting)
  useEffect(() => {
    if (!calibrating || !cameraActive) return
    const samples = []
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const prog = Math.min(100, Math.round((elapsed / 5000) * 100))
      setCalibProgress(prog)

      if (prog < 100) {
        if (earRef.current > 0) {
          samples.push(earRef.current)
        }
      } else {
        clearInterval(interval)
        setCalibrating(false)
        const validSamples = samples.filter((s) => s > 0.1)
        const avg = validSamples.length > 0
          ? validSamples.reduce((a, b) => a + b, 0) / validSamples.length
          : 0.32
        setEarBaseline(Number(avg.toFixed(2)))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [calibrating, cameraActive])

  // Trigger manual calibration
  const startCalibration = () => {
    if (!cameraActive) return
    setCalibProgress(0)
    setCalibrating(true)
  }

  // Process alert level changes & Audio Alarm loop
  const triggerIncident = useCallback((type, metrics, lvl) => {
    const now = Date.now()
    if (now - lastAlert2TimeRef.current < 4000) return
    lastAlert2TimeRef.current = now

    const newInc = {
      _id: 'inc_' + now,
      tripId,
      driverId: user?._id || 'user_driver_1',
      vehicleId: user?.vehicleId || '51F-889.24',
      ts: new Date().toISOString(),
      type,
      metrics,
      level: lvl,
      status: 'open',
      resolvedBy: null,
      note: '',
    }

    // Save to DB
    updateDB((db) => {
      db.incidents.unshift(newInc)
      return db
    }, { action: 'NEW_INCIDENT', incident: newInc })

    // Broadcast across tabs if Level 2
    if (lvl === 2) {
      broadcastAlert({
        driverName: user?.name || 'Tài xế',
        vehiclePlate: user?.vehicleId || '51F-889.24',
        type: type === 'DROWSY' ? 'Ngủ gật nghiêm trọng' : 'Mất tập trung',
        metrics,
      })
    }
  }, [tripId, user])

  // Trigger Level 2 alert & continuous SFX loop
  useEffect(() => {
    if (cameraActive && level === 2 && !alertOverlay) {
      if (Date.now() < cooldownUntilRef.current) return
      setAlertOverlay(true)
      startSfxLoop(selectedSfx)
    }
  }, [cameraActive, level, alertOverlay, selectedSfx])

  // Acknowledge alert handler: stops audio and dismisses alert overlay
  const handleAcknowledge = () => {
    stopSfxLoop()
    setAlertOverlay(false)
    setLevel(0)
    consecutiveClosedRef.current = 0
    earWindowRef.current = []
    cooldownUntilRef.current = Date.now() + 6000 // 6-second grace period
  }

  // Toggle Camera with explicit browser permission request
  const handleToggleCamera = async () => {
    if (cameraActive) {
      // Turn off camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (cameraInstanceRef.current) {
        try {
          cameraInstanceRef.current.stop()
        } catch (e) {
          // ignore
        }
        cameraInstanceRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
      setCameraActive(false)
      setLevel(0)
      stopSfxLoop()
      setAlertOverlay(false)
      setNoFaceSeconds(0)
      setCalibrating(false)
      setEar(0.32)
      setMar(0.18)
      setPerclos(0)
    } else {
      // Request permission and turn on
      setCameraError(null)
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Trình duyệt không hỗ trợ truy cập Camera.')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        })
        streamRef.current = stream
        setCameraActive(true)
        setCalibrating(true)
        setCalibProgress(0)
      } catch (err) {
        console.error('Lỗi khi xin quyền camera:', err)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Quyền truy cập Camera bị từ chối. Vui lòng cấp quyền Camera trên trình duyệt để tiếp tục.')
        } else {
          setCameraError('Không thể mở Camera: ' + (err.message || 'Lỗi không xác định.'))
        }
        setCameraActive(false)
      }
    }
  }

  // REAL CAMERA & MEDIAPIPE FACE MESH ENGINE
  useEffect(() => {
    if (!cameraActive) {
      return
    }

    let isMounted = true
    setCameraError(null)

    // Load MediaPipe from CDN dynamically if not yet on window
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const s = document.createElement('script')
        s.src = src
        s.crossOrigin = 'anonymous'
        s.onload = () => resolve()
        s.onerror = (e) => reject(e)
        document.head.appendChild(s)
      })
    }

    const initMediaPipe = async () => {
      try {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current
          try {
            await videoRef.current.play()
          } catch (e) {
            // ignore play aborts
          }
        }

        await Promise.all([
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'),
        ])

        if (!isMounted) return

        if (!window.FaceMesh) {
          throw new Error('MediaPipe FaceMesh scripts failed to initialize.')
        }

        const faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        })

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        faceMesh.onResults((results) => {
          if (!isMounted) return
          const now = Date.now()
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            lastFaceTimeRef.current = now
            setNoFaceSeconds(0)
            const landmarks = results.multiFaceLandmarks[0]

            // 1. Compute EAR (Right eye: 33, 160, 158, 133, 153, 144)
            const r_p1 = landmarks[33]
            const r_p2 = landmarks[160]
            const r_p3 = landmarks[158]
            const r_p4 = landmarks[133]
            const r_p5 = landmarks[153]
            const r_p6 = landmarks[144]
            const r_ear = (dist(r_p2, r_p6) + dist(r_p3, r_p5)) / (2 * dist(r_p1, r_p4) || 1)

            // Left eye: 362, 385, 387, 263, 373, 380
            const l_p1 = landmarks[362]
            const l_p2 = landmarks[385]
            const l_p3 = landmarks[387]
            const l_p4 = landmarks[263]
            const l_p5 = landmarks[373]
            const l_p6 = landmarks[380]
            const l_ear = (dist(l_p2, l_p6) + dist(l_p3, l_p5)) / (2 * dist(l_p1, l_p4) || 1)

            const currentEar = Number(((r_ear + l_ear) / 2).toFixed(3))
            setEar(currentEar)

            // 2. Compute MAR (|lip13 - lip14| / |lip78 - lip308|)
            const lip13 = landmarks[13]
            const lip14 = landmarks[14]
            const lip78 = landmarks[78]
            const lip308 = landmarks[308]
            const currentMar = Number((dist(lip13, lip14) / (dist(lip78, lip308) || 1)).toFixed(3))
            setMar(currentMar)

            // 3. Head Pose (Yaw/Pitch estimate)
            const noseTip = landmarks[1]
            const leftCheek = landmarks[234]
            const rightCheek = landmarks[454]
            const chin = landmarks[152]
            const forehead = landmarks[10]

            const distLeft = dist(noseTip, leftCheek)
            const distRight = dist(noseTip, rightCheek)
            const currentYaw = Number(((distLeft - distRight) * 90).toFixed(1))
            const currentPitch = Number(((noseTip.y - (forehead.y + chin.y) / 2) * 120).toFixed(1))

            setYaw(currentYaw)
            setPitch(currentPitch)

            // 4. Consecutive Drowsy Counter & Sliding PERCLOS
            earWindowRef.current.push(currentEar < earThreshold ? 1 : 0)
            if (earWindowRef.current.length > 90) earWindowRef.current.shift()

            const closedRatio = earWindowRef.current.reduce((a, b) => a + b, 0) / earWindowRef.current.length
            const currentPerclos = Number((closedRatio * 100).toFixed(1))
            setPerclos(currentPerclos)

            if (currentEar < earThreshold) {
              consecutiveClosedRef.current += 1
            } else {
              consecutiveClosedRef.current = 0
            }

            // Determine Alert Level
            let newLvl = 0
            if (now > cooldownUntilRef.current) {
              if (consecutiveClosedRef.current >= 45 || currentPerclos >= 30) {
                newLvl = 2
                setAlertReason('Phát hiện mắt nhắm quá lâu — Dấu hiệu ngủ gật nguy hiểm!')
                triggerIncident('DROWSY', `Độ mở mắt ${currentEar} · ${consecutiveClosedRef.current} frames`, 2)
              } else if (currentMar > 0.60 || Math.abs(currentYaw) > 25 || Math.abs(currentPitch) > 20) {
                newLvl = 1
                if (currentMar > 0.60) triggerIncident('YAWN', `Độ mở miệng ${currentMar}`, 1)
                else triggerIncident('DISTRACTED', `Lệch góc nhìn`, 1)
              } else {
                newLvl = 0
              }
            }

            setLevel(newLvl)

            // 5. Draw HUD Brackets & Landmarks on Overlay
            drawHudCanvas(ctx, canvas, landmarks, newLvl)
          } else {
            // No face found
            const noFaceSec = Math.floor((now - lastFaceTimeRef.current) / 1000)
            setNoFaceSeconds(noFaceSec)
            if (noFaceSec >= 5 && now > cooldownUntilRef.current) {
              setLevel(2)
              setAlertReason('Không phát hiện tài xế nhìn về phía trước quá 5 giây!')
              triggerIncident('NO_FACE', 'Không thấy tài xế > 5 giây', 2)
            } else if (noFaceSec >= 2) {
              setLevel(1)
            }
          }
        })

        // Process frames
        let active = true
        const processFrame = async () => {
          if (!active || !isMounted) return
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              await faceMesh.send({ image: videoRef.current })
            } catch (e) {
              // frame send error
            }
          }
          if (active && isMounted) {
            requestAnimationFrame(processFrame)
          }
        }
        requestAnimationFrame(processFrame)

        cameraInstanceRef.current = {
          stop: () => {
            active = false
          },
        }
      } catch (err) {
        console.error('Camera initiation error', err)
        if (isMounted) {
          setCameraError('Không thể mở Webcam hoặc khởi chạy nhận diện khuôn mặt.')
        }
      }
    }

    initMediaPipe()

    return () => {
      isMounted = false
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop()
        cameraInstanceRef.current = null
      }
    }
  }, [cameraActive, earThreshold, triggerIncident])

  // Clean up media stream and audio on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      stopSfxLoop()
    }
  }, [])

  // Draw HUD Graphics on Canvas
  const drawHudCanvas = (ctx, canvas, landmarks, alertLevel) => {
    const w = canvas.width
    const h = canvas.height
    const color = alertLevel === 2 ? '#EF4444' : alertLevel === 1 ? '#F59E0B' : '#38BDF8'

    // Compute bounding box around face
    let minX = 1, minY = 1, maxX = 0, maxY = 0
    landmarks.forEach((pt) => {
      if (pt.x < minX) minX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.x > maxX) maxX = pt.x
      if (pt.y > maxY) maxY = pt.y
    })

    const bx = minX * w
    const by = minY * h
    const bw = (maxX - minX) * w
    const bh = (maxY - minY) * h

    // Corner brackets
    const bracketLen = 22
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()

    // Top-left
    ctx.moveTo(bx, by + bracketLen); ctx.lineTo(bx, by); ctx.lineTo(bx + bracketLen, by)
    // Top-right
    ctx.moveTo(bx + bw - bracketLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bracketLen)
    // Bottom-left
    ctx.moveTo(bx, by + bh - bracketLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bracketLen, by + bh)
    // Bottom-right
    ctx.moveTo(bx + bw - bracketLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - bracketLen)
    ctx.stroke()

    // Draw eye mesh contours
    const eyeIndices = [33, 160, 158, 133, 153, 144, 33, 362, 385, 387, 263, 373, 380, 362]
    ctx.strokeStyle = alertLevel === 2 ? '#EF4444' : '#10B981'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    eyeIndices.forEach((idx, i) => {
      const p = landmarks[idx]
      if (p) {
        if (i === 0 || i === 7) ctx.moveTo(p.x * w, p.y * h)
        else ctx.lineTo(p.x * w, p.y * h)
      }
    })
    ctx.stroke()

    // Draw mouth contour
    const mouthIndices = [78, 13, 308, 14, 78]
    ctx.strokeStyle = alertLevel === 1 ? '#F59E0B' : 'rgba(56, 189, 248, 0.7)'
    ctx.beginPath()
    mouthIndices.forEach((idx, i) => {
      const p = landmarks[idx]
      if (p) {
        if (i === 0) ctx.moveTo(p.x * w, p.y * h)
        else ctx.lineTo(p.x * w, p.y * h)
      }
    })
    ctx.stroke()
  }

  return (
    <div>
      {/* Main Cockpit Layout */}
      <div className={styles.cameraLayout}>
        {/* Left Column: Video Viewport & Overlays */}
        <div>
          <div className={`${styles.viewportContainer} ${level === 2 ? styles.viewportContainerLevel2 : ''}`}>
            {cameraActive ? (
              <>
                <video ref={videoRef} className={styles.videoFeed} playsInline muted autoPlay />
                <canvas ref={canvasRef} width={1280} height={720} className={styles.hudCanvas} />
              </>
            ) : (
              /* Camera Off Standby View */
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'radial-gradient(circle at center, #0B192C 0%, #030712 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                  }}
                >
                  <CameraOff size={32} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                    Camera Giám Sát Đang Tắt
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', maxWidth: 360 }}>
                    Nhấn nút bên dưới để cấp quyền và bật camera nhận diện độ tập trung tài xế theo thời gian thực.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.cameraToggleBtnStandby}
                  onClick={handleToggleCamera}
                >
                  <Camera size={16} />
                  <span>Bật Camera</span>
                </button>
              </div>
            )}

            {/* In-HUD Top & Bottom Info Layers */}
            <div className={styles.hudOverlay}>
              {cameraActive && (
                <div className={styles.hudTopBar}>
                  <button
                    type="button"
                    className={styles.cameraToggleBtnActive}
                    onClick={handleToggleCamera}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <CameraOff size={15} />
                    <span>Tắt Camera</span>
                  </button>
                </div>
              )}

              {/* No-face warning */}
              {cameraActive && noFaceSeconds >= 2 && level !== 2 && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.9)',
                    color: '#060E1C',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    textAlign: 'center',
                  }}
                >
                  ▲ KHÔNG THẤY KHUÔN MẶT ({noFaceSeconds}s) — HÃY NHÌN VÀO CAMERA
                </div>
              )}
            </div>

            {/* Alert Screen Overlay with Acknowledge Button & Looping SFX */}
            {alertOverlay && (
              <div className={styles.acknowledgeOverlay}>
                <AlertTriangle size={56} color="#EF4444" style={{ filter: 'drop-shadow(0 0 12px #EF4444)' }} />
                <div className={styles.acknowledgeTitle}>
                  CẢNH BÁO NGUY CƠ TAI NẠN!
                </div>
                <div className={styles.acknowledgeSub}>
                  {alertReason}. Âm thanh cảnh báo đang phát liên tục. Nhấn nút bên dưới để xác nhận sự tỉnh táo và tắt còi.
                </div>
                <button
                  type="button"
                  className={styles.acknowledgeBtn}
                  onClick={handleAcknowledge}
                >
                  <CheckCircle2 size={20} />
                  <span>Acknowledge (Xác Nhận)</span>
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #EF4444', borderRadius: '8px', fontSize: '13px', color: '#F87171', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Action and Control Bar below Video: SFX Sound Selector */}
          <div className={styles.tripControlBar}>
            <div className={styles.sfxSelector}>
              <div className={styles.sfxLabel}>
                <Volume2 size={16} color="var(--amber-dark)" />
                <span>Âm thanh còi báo:</span>
              </div>
              <select
                className={styles.sfxSelect}
                value={selectedSfx}
                onChange={(e) => {
                  const newSrc = e.target.value
                  setSelectedSfx(newSrc)
                  localStorage.setItem('fleetguard_selected_sfx', newSrc)
                  playSfxPreview(newSrc)
                }}
              >
                {SFX_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.src}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.sfxPreviewBtn}
                onClick={() => playSfxPreview(selectedSfx)}
                title="Nghe thử âm thanh đã chọn"
              >
                <Play size={13} />
                <span>Nghe thử</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Trip Info & Telemetry Gauges & Calibration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card 1: Trip Duration Card */}
          <div className={styles.card} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={16} color="var(--amber-dark)" />
                <span className={styles.cardTitle} style={{ margin: 0 }}>
                  Hành Trình
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 6px #10B981',
                  }}
                  title="Đang ghi nhận"
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--amber-dark)',
                    letterSpacing: '0.5px',
                  }}
                >
                  {formatTime(tripSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Real-time Telemetry Meters */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <Zap size={16} />
                <span>Chỉ Số Sinh Trắc Học</span>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thời gian thực</span>
            </div>

            <div className={styles.telemetryGrid}>
              <Meter
                label="Độ Mở Mắt"
                value={ear}
                min={0}
                max={0.45}
                threshold={earThreshold}
                thresholdType="lower"
                decimals={2}
              />

              <Meter
                label="Độ Mở Miệng"
                value={mar}
                min={0}
                max={0.85}
                threshold={0.60}
                thresholdType="upper"
                decimals={2}
              />

              <Meter
                label="Mức Mệt Mỏi"
                value={perclos}
                min={0}
                max={50}
                threshold={30}
                thresholdType="upper"
                unit="%"
                decimals={1}
              />
            </div>
          </div>

          {/* Card 3: Calibration Card (Moved below Card 2 as requested) */}
          <div className={styles.card} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: calibrating ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sliders size={16} color="var(--blue-primary)" />
                <span className={styles.cardTitle} style={{ margin: 0 }}>
                  Hiệu Chuẩn Sinh Trắc
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--blue-primary)' }}>
                {calibrating ? `${calibProgress}%` : `Baseline: ${earBaseline.toFixed(2)}`}
              </div>
            </div>

            {calibrating ? (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Vui lòng nhìn thẳng vào camera trong 5 giây để hiệu chuẩn mắt.
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${calibProgress}%`,
                      height: '100%',
                      background: 'var(--blue-primary)',
                      transition: 'width 0.15s ease',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Ngưỡng cảnh báo mắt: &lt;{earThreshold}
                </span>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: cameraActive ? 'pointer' : 'not-allowed',
                    opacity: cameraActive ? 1 : 0.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  disabled={!cameraActive}
                  onClick={startCalibration}
                  title={cameraActive ? 'Bắt đầu hiệu chuẩn lại mắt' : 'Cần bật camera trước'}
                >
                  <RotateCcw size={11} />
                  <span>Hiệu chuẩn lại</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

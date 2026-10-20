// FleetGuard In-Memory / LocalStorage MongoDB-shaped Database
// Synchronized across browser tabs via BroadcastChannel & Storage Event

const DB_KEY = 'fleetguard_db_v1'
const BROADCAST_NAME = 'fleetguard_channel'

let channel = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel(BROADCAST_NAME)
  } catch (e) {
    console.warn('BroadcastChannel not supported', e)
  }
}

// Deterministic PRNG (Mulberry32)
function createPRNG(seed = 42) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateSeedData() {
  const rand = createPRNG(98765)

  const orgId = 'org_phuongnam'
  const organization = {
    _id: orgId,
    name: 'Công Ty Vận Tải Phương Nam',
    plan: 'pro',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    thresholds: {
      ear: 0.21,
      mar: 0.60,
      yaw: 25,
      pitch: 20,
      perclos: 30,
    },
  }

  // Vehicles
  const vehicleSpecs = [
    { plate: '51F-889.24', type: 'Đầu kéo Freightliner', driverId: 'user_driver_1' },
    { plate: '51B-123.45', type: 'Xe khách 45 chỗ', driverId: 'user_driver_2' },
    { plate: '29C-789.12', type: 'Xe tải thùng 15 tấn', driverId: 'user_driver_3' },
    { plate: '43A-654.32', type: 'Xe van trung chuyển', driverId: 'user_driver_4' },
    { plate: '60B-998.11', type: 'Xe bồn xăng dầu', driverId: 'user_driver_5' },
    { plate: '61C-445.67', type: 'Xe đông lạnh 8 tấn', driverId: 'user_driver_6' },
    { plate: '51D-332.19', type: 'Xe tải Hino 5 tấn', driverId: 'user_driver_7' },
    { plate: '72B-887.65', type: 'Xe khách giường nằm', driverId: 'user_driver_8' },
    { plate: '49A-221.34', type: 'Xe container 40 feet', driverId: null },
    { plate: '68C-554.21', type: 'Xe cẩu tự hành', driverId: null },
  ]

  const vehicles = vehicleSpecs.map((v, i) => ({
    _id: `veh_${i + 1}`,
    plate: v.plate,
    type: v.type,
    organizationId: orgId,
    driverId: v.driverId,
    status: v.driverId ? (i < 6 ? 'driving' : 'resting') : 'available',
  }))

  // Free individual driver vehicle
  const freeVehicle = {
    _id: 'veh_free_1',
    plate: '51A-999.88',
    type: 'Xe bán tải Ford Ranger',
    organizationId: null,
    driverId: 'user_driver_free',
    status: 'resting',
  }
  vehicles.push(freeVehicle)

  // Users
  const avatarColors = [
    '#2563EB', '#F59E0B', '#10B981', '#EC4899',
    '#8B5CF6', '#06B6D4', '#E11D48', '#D97706',
  ]

  const driverNames = [
    'Nguyễn Hoàng Nam',
    'Lê Quốc Bảo',
    'Trần Đình Trọng',
    'Phạm Minh Tuấn',
    'Vũ Đức Huy',
    'Đặng Văn Lâm',
    'Hoàng Anh Dũng',
    'Bùi Tiến Dũng',
  ]

  const users = [
    {
      _id: 'user_admin_1',
      name: 'Trần Quản Trị',
      email: 'admin@fleet.vn',
      passwordHash: 'fleet1234',
      role: 'ADMIN',
      organizationId: orgId,
      vehicleId: null,
      status: 'active',
      avatarColor: '#F59E0B',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      _id: 'user_driver_free',
      name: 'Nguyễn Văn Lái Xe',
      email: 'user@fleet.vn',
      passwordHash: 'fleet1234',
      role: 'DRIVER',
      organizationId: null,
      vehicleId: 'veh_free_1',
      status: 'resting',
      avatarColor: '#2563EB',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
  ]

  driverNames.forEach((name, i) => {
    const driverId = `user_driver_${i + 1}`
    const vehId = `veh_${i + 1}`
    const isDriving = i < 6
    users.push({
      _id: driverId,
      name,
      email: `tai-xe-${i + 1}@phuongnam.vn`,
      passwordHash: 'fleet1234',
      role: 'DRIVER',
      organizationId: orgId,
      vehicleId: vehId,
      status: isDriving ? 'driving' : 'resting',
      avatarColor: avatarColors[i % avatarColors.length],
      notes: i === 0 ? 'Tài xế chuyên tuyến TP.HCM - Đà Lạt. Lái xe cẩn trọng, phản hồi còi báo tốt.' : '',
      createdAt: new Date(Date.now() - (45 - i * 3) * 86400000).toISOString(),
    })
  })

  // Trips & Incidents (30 days history)
  const trips = []
  const incidents = []
  const now = Date.now()

  const incidentTypes = [
    { type: 'DROWSY', label: 'Ngủ gật (EAR < 0.21)', level: 2 },
    { type: 'YAWN', label: 'Ngáp mệt mỏi (MAR > 0.60)', level: 1 },
    { type: 'DISTRACTED', label: 'Quay đầu mất tập trung', level: 1 },
    { type: 'PERCLOS_HIGH', label: 'Mắt nhắm liên tục (PERCLOS > 30%)', level: 2 },
  ]

  // Generate for Org Drivers (30 days)
  for (let day = 30; day >= 0; day--) {
    const dateBase = now - day * 86400000

    driverNames.forEach((_, dIdx) => {
      const driverId = `user_driver_${dIdx + 1}`
      const vehId = `veh_${dIdx + 1}`

      // Drivers make 1 trip per day most days
      if (rand() > 0.15) {
        // Shift times: Day shifts or night shifts
        const isNightShift = dIdx % 3 === 0
        const startHour = isNightShift ? 21 : 6 + Math.floor(rand() * 3)
        const durationHours = 4 + rand() * 4.5
        const startedAt = new Date(dateBase)
        startedAt.setHours(startHour, Math.floor(rand() * 60), 0, 0)
        const endedAt = new Date(startedAt.getTime() + durationHours * 3600000)

        // Believable pattern: more fatigue between 16-18 and 02-04
        let drowsyCount = 0
        let yawnCount = 0
        let distractedCount = 0

        const tripIncidentsCount = Math.floor(rand() * (isNightShift ? 5 : 3))

        const tripId = `trip_org_${dIdx}_${day}`

        for (let inc = 0; inc < tripIncidentsCount; inc++) {
          const incOffset = rand() * durationHours * 3600000
          const incTime = new Date(startedAt.getTime() + incOffset)
          const incHour = incTime.getHours()

          // Higher probability in fatigue windows
          const isFatigueWindow = (incHour >= 16 && incHour <= 18) || (incHour >= 2 && incHour <= 4)
          const incMeta = isFatigueWindow && rand() < 0.7
            ? incidentTypes[rand() < 0.5 ? 0 : 3] // Drowsy / PERCLOS
            : incidentTypes[Math.floor(rand() * incidentTypes.length)]

          if (incMeta.type === 'DROWSY' || incMeta.type === 'PERCLOS_HIGH') drowsyCount++
          else if (incMeta.type === 'YAWN') yawnCount++
          else distractedCount++

          const isResolved = day > 0 || rand() > 0.4
          const incidentId = `inc_${tripId}_${inc}`

          incidents.push({
            _id: incidentId,
            tripId,
            driverId,
            vehicleId: vehId,
            ts: incTime.toISOString(),
            type: incMeta.type,
            level: incMeta.level,
            metrics: incMeta.type === 'DROWSY'
              ? `EAR ${(0.12 + rand() * 0.06).toFixed(2)} · ${Math.floor(48 + rand() * 20)} frames`
              : incMeta.type === 'YAWN'
              ? `MAR ${(0.65 + rand() * 0.15).toFixed(2)} · ${Math.floor(45 + rand() * 15)} frames`
              : incMeta.type === 'PERCLOS_HIGH'
              ? `PERCLOS ${(32 + rand() * 15).toFixed(1)}% (60s)`
              : `Góc quay ${Math.floor(28 + rand() * 15)}° (Yaw)`,
            status: isResolved ? 'resolved' : 'open',
            resolvedBy: isResolved ? 'Trần Quản Trị' : null,
            note: isResolved ? 'Đã liên hệ tài xế qua bộ đàm nhắc nghỉ ngơi tại trạm dừng chân.' : '',
          })
        }

        const penalty = (drowsyCount * 6) + (yawnCount * 1.5) + (distractedCount * 2)
        const safetyScore = Math.max(65, Math.round(100 - penalty + (rand() * 4 - 2)))
        const distanceKm = Math.round(durationHours * (55 + rand() * 25))

        trips.push({
          _id: tripId,
          driverId,
          vehicleId: vehId,
          startedAt: startedAt.toISOString(),
          endedAt: day === 0 && dIdx < 6 ? null : endedAt.toISOString(),
          distanceKm,
          safetyScore,
          drowsyCount,
          yawnCount,
          distractedCount,
          breaks: Math.floor(durationHours / 3),
        })
      }
    })
  }

  // Free Individual User (7 days of trips)
  for (let day = 7; day >= 0; day--) {
    const dateBase = now - day * 86400000
    const startedAt = new Date(dateBase)
    startedAt.setHours(7 + Math.floor(rand() * 3), Math.floor(rand() * 50), 0)
    const durationHours = 2.5 + rand() * 2.5
    const endedAt = new Date(startedAt.getTime() + durationHours * 3600000)

    const tripId = `trip_free_${day}`
    const drowsyCount = rand() < 0.4 ? 1 : 0
    const yawnCount = Math.floor(rand() * 3)
    const distractedCount = rand() < 0.3 ? 1 : 0

    if (drowsyCount > 0) {
      incidents.push({
        _id: `inc_free_${day}_drowsy`,
        tripId,
        driverId: 'user_driver_free',
        vehicleId: 'veh_free_1',
        ts: new Date(startedAt.getTime() + 3600000 * 1.8).toISOString(),
        type: 'DROWSY',
        level: 2,
        metrics: `EAR ${(0.13 + rand() * 0.05).toFixed(2)} · 49 frames`,
        status: 'resolved',
        resolvedBy: 'Tự động (Còi xe)',
        note: 'Còi cabin đã kích hoạt đánh thức tài xế.',
      })
    }

    const penalty = (drowsyCount * 8) + (yawnCount * 2) + (distractedCount * 3)
    const safetyScore = Math.max(78, Math.round(100 - penalty))

    trips.push({
      _id: tripId,
      driverId: 'user_driver_free',
      vehicleId: 'veh_free_1',
      startedAt: startedAt.toISOString(),
      endedAt: day === 0 ? null : endedAt.toISOString(),
      distanceKm: Math.round(durationHours * 48),
      safetyScore,
      drowsyCount,
      yawnCount,
      distractedCount,
      breaks: durationHours > 3 ? 1 : 0,
    })
  }

  return {
    organizations: [organization],
    users,
    vehicles,
    trips,
    incidents,
    chat_messages: [],
    version: 1,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Get current database from localStorage or seed
 */
export function getDB() {
  if (typeof window === 'undefined') return generateSeedData()
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) {
      const seeded = generateSeedData()
      localStorage.setItem(DB_KEY, JSON.stringify(seeded))
      return seeded
    }
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading FleetGuard DB', e)
    const seeded = generateSeedData()
    localStorage.setItem(DB_KEY, JSON.stringify(seeded))
    return seeded
  }
}

// Subscriptions
const listeners = new Set()

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyAll(db, eventMeta = null) {
  listeners.forEach((fn) => {
    try {
      fn(db, eventMeta)
    } catch (e) {
      console.error('DB listener error', e)
    }
  })
}

/**
 * Update database state
 */
export function updateDB(mutatorFn, eventMeta = null) {
  const current = getDB()
  const updated = mutatorFn(current) || current
  updated.lastUpdated = new Date().toISOString()

  try {
    localStorage.setItem(DB_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('Error writing to FleetGuard DB', e)
  }

  // Broadcast to other tabs
  if (channel) {
    try {
      channel.postMessage({ type: 'DB_UPDATE', meta: eventMeta, lastUpdated: updated.lastUpdated })
    } catch (e) {
      console.warn('Channel post error', e)
    }
  }

  notifyAll(updated, eventMeta)
  return updated
}

/**
 * Reset database to demo seed data
 */
export function resetDemo() {
  const seeded = generateSeedData()
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  } catch (e) {
    console.error('Error resetting demo DB', e)
  }

  if (channel) {
    try {
      channel.postMessage({ type: 'DEMO_RESET', lastUpdated: seeded.lastUpdated })
    } catch (e) {
      console.warn('Channel post error', e)
    }
  }

  notifyAll(seeded, { action: 'RESET_DEMO' })
  return seeded
}

/**
 * Broadcast custom incident alert across tabs (Level 2 alert)
 */
export function broadcastAlert(alertPayload) {
  if (channel) {
    try {
      channel.postMessage({ type: 'LEVEL2_ALERT', payload: alertPayload })
    } catch (e) {
      console.warn('Channel post error', e)
    }
  }
}

// Listen to storage event (for cross-tab sync fallback)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        notifyAll(parsed, { action: 'STORAGE_SYNC' })
      } catch (err) {
        console.error('Storage sync error', err)
      }
    }
  })

  if (channel) {
    channel.onmessage = (msg) => {
      if (msg.data?.type === 'DB_UPDATE' || msg.data?.type === 'DEMO_RESET') {
        const db = getDB()
        notifyAll(db, msg.data)
      }
    }
  }
}

/**
 * Generate 2-second interval telemetry curve on demand for trip detail charts
 */
export function generateTelemetryForTrip(trip, count = 60) {
  const rand = createPRNG((trip._id || 'trip').split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const data = []

  let currentEar = 0.32
  let currentMar = 0.18
  let currentYaw = 0
  let currentPitch = 0

  for (let i = 0; i < count; i++) {
    // Normal fluctuations
    currentEar += (rand() - 0.48) * 0.04
    currentEar = Math.max(0.08, Math.min(0.42, currentEar))

    currentMar += (rand() - 0.48) * 0.05
    currentMar = Math.max(0.05, Math.min(0.75, currentMar))

    currentYaw += (rand() - 0.5) * 6
    currentYaw = Math.max(-35, Math.min(35, currentYaw))

    currentPitch += (rand() - 0.5) * 5
    currentPitch = Math.max(-25, Math.min(25, currentPitch))

    const isLevel2 = currentEar < 0.20
    const isLevel1 = !isLevel2 && (currentMar > 0.60 || Math.abs(currentYaw) > 25)

    data.push({
      idx: i,
      ts: i * 2, // seconds
      ear: Number(currentEar.toFixed(3)),
      mar: Number(currentMar.toFixed(3)),
      yaw: Number(currentYaw.toFixed(1)),
      pitch: Number(currentPitch.toFixed(1)),
      perclos: Number((isLevel2 ? 35 : 8 + rand() * 10).toFixed(1)),
      level: isLevel2 ? 2 : isLevel1 ? 1 : 0,
    })
  }

  return data
}

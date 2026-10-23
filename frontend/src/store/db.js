// FleetGuard In-Memory / LocalStorage MongoDB-shaped Database
// Synchronized across browser tabs via BroadcastChannel & Storage Event

const DB_KEY = 'fleetguard_db_v2'
const BROADCAST_NAME = 'fleetguard_channel'

let channel = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel(BROADCAST_NAME)
  } catch (e) {
    console.warn('BroadcastChannel not supported', e)
  }
}

/**
 * Empty seed database for clean test workflow
 */
export function generateSeedData() {
  return {
    organizations: [],
    users: [],
    trips: [],
    incidents: [],
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
    const parsed = JSON.parse(raw)
    // Guarantee required collections exist
    if (!Array.isArray(parsed.organizations)) parsed.organizations = []
    if (!Array.isArray(parsed.users)) parsed.users = []
    if (!Array.isArray(parsed.trips)) parsed.trips = []
    if (!Array.isArray(parsed.incidents)) parsed.incidents = []
    return parsed
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
 * Reset database to empty seed data
 */
export function resetDemo() {
  const seeded = generateSeedData()
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  } catch (e) {
    console.error('Error resetting DB', e)
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

// Deterministic PRNG for generating chart telemetry
function createPRNG(seed = 42) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generate 2-second interval telemetry curve on demand for trip detail charts
 */
export function generateTelemetryForTrip(trip, count = 60) {
  const rand = createPRNG((trip?._id || 'trip').split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const data = []

  let currentEar = 0.32
  let currentMar = 0.18
  let currentYaw = 0
  let currentPitch = 0

  for (let i = 0; i < count; i++) {
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

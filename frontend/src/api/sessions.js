// Driving session persistence — talks to backend POST /api/analytics/sessions
// (upsert by session_id). Used to create a session when a trip starts and
// to finalize it when the trip ends.

const SESSIONS_URL = '/api/analytics/sessions'

export function getUserId(user) {
  return user?._id || user?.id || ''
}

export function normalizeSession(session) {
  return {
    _id: session.session_id,
    driverId: session.user_id,
    vehicleId: session.vehicle_id || null,
    startedAt: session.start_time,
    endedAt: session.end_time || null,
    distanceKm: session.distance_km || 0,
    safetyScore: session.safety_score ?? 100,
    drowsyCount: session.drowsy_count || 0,
    yawnCount: session.yawn_count || 0,
    distractedCount: session.distracted_count || 0,
    breaks: session.breaks || 0,
  }
}

export async function fetchSessions(userId) {
  const params = new URLSearchParams({ user_id: userId })
  const res = await fetch(`${SESSIONS_URL}?${params.toString()}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Không tải được lịch sử phiên (HTTP ${res.status})`)
  }
  return (data.sessions || []).map(normalizeSession)
}

/**
 * Upsert a driving session on the backend.
 * @param {object} session - DrivingSession-shaped payload (must include session_id)
 * @param {{ keepalive?: boolean }} [opts] - keepalive lets the request survive page unload
 * @returns {Promise<object>} saved session from the backend
 */
export async function saveSession(session, { keepalive = false } = {}) {
  const res = await fetch(SESSIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
    keepalive,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Lưu phiên thất bại (HTTP ${res.status})`)
  }
  return data.session
}

/**
 * Safety score formula shared with seed data: penalise each incident type.
 */
export function computeSafetyScore({ drowsy = 0, yawn = 0, distracted = 0 }) {
  const penalty = drowsy * 6 + yawn * 1.5 + distracted * 2
  return Math.max(0, Math.round(100 - penalty))
}

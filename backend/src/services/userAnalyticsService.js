import { DrivingSession } from '../models/DrivingSession.js';
import { getIsMongoConnected, memoryStore } from '../db.js';

function parseDate(value, fieldName) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${fieldName}`);
    error.code = 'INVALID_ANALYTICS_PERIOD';
    throw error;
  }
  return date;
}

export async function resolveUserAnalytics({
  userId,
  requestedDays,
  startDate,
  endDate,
  sessionId,
  now = new Date(),
  sessions,
} = {}) {
  if (!userId) {
    const error = new Error('Authenticated user is required');
    error.code = 'ANALYTICS_USER_REQUIRED';
    throw error;
  }

  const explicitStart = parseDate(startDate, 'start_date');
  const explicitEnd = parseDate(endDate, 'end_date');
  const days = Number.isFinite(Number(requestedDays)) && Number(requestedDays) > 0
    ? Number(requestedDays)
    : 7;
  const periodStart = explicitStart || (explicitEnd || sessionId ? null : new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
  const periodEnd = explicitEnd || now;

  let records;
  if (Array.isArray(sessions)) {
    records = sessions;
  } else if (getIsMongoConnected()) {
    const filter = { user_id: String(userId) };
    if (sessionId) filter.session_id = sessionId;
    if (periodStart || periodEnd) {
      filter.start_time = {};
      if (periodStart) filter.start_time.$gte = periodStart;
      if (periodEnd) filter.start_time.$lte = periodEnd;
    }
    records = await DrivingSession.find(filter).lean();
  } else {
    records = Array.from(memoryStore.sessions.values());
  }

  records = records.filter((session) => {
    if (String(session.user_id) !== String(userId)) return false;
    if (sessionId && session.session_id !== sessionId) return false;
    const startedAt = new Date(session.start_time);
    if (Number.isNaN(startedAt.getTime())) return false;
    return (!periodStart || startedAt >= periodStart) && startedAt <= periodEnd;
  });

  const totals = records.reduce((summary, session) => ({
    safetyScore: summary.safetyScore + Number(session.safety_score || 0),
    drowsy: summary.drowsy + Number(session.drowsy_count || 0),
    yawns: summary.yawns + Number(session.yawn_count || 0),
    distracted: summary.distracted + Number(session.distracted_count || 0),
    critical: summary.critical + (session.peak_alert_level === 2 ? 1 : 0),
    warning: summary.warning + (session.peak_alert_level === 1 ? 1 : 0),
    duration: summary.duration + Number(session.duration_seconds || 0),
  }), {
    safetyScore: 0,
    drowsy: 0,
    yawns: 0,
    distracted: 0,
    critical: 0,
    warning: 0,
    duration: 0,
  });

  return {
    type: 'user_safety_summary',
    title: 'Thống kê an toàn chuyến lái',
    source: 'internal',
    period: {
      source: explicitStart || explicitEnd ? 'custom' : sessionId ? 'session' : `${days}d`,
      start: periodStart?.toISOString() || null,
      end: periodEnd.toISOString(),
    },
    recordsUsed: { sessions: records.length },
    metrics: {
      session_count: records.length,
      average_safety_score: records.length
        ? Number((totals.safetyScore / records.length).toFixed(1))
        : 0,
      drowsy_count: totals.drowsy,
      yawn_count: totals.yawns,
      distracted_count: totals.distracted,
      critical_alerts: totals.critical,
      warning_alerts: totals.warning,
      duration_seconds: totals.duration,
    },
  };
}

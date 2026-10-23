import { User } from '../models/User.js';
import { DrivingSession } from '../models/DrivingSession.js';
import { EmotionLog } from '../models/EmotionLog.js';
import { getIsMongoConnected, memoryStore } from '../db.js';

const EMOTIONS = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'fatigued'];

export function detectAdminIntent(message = '') {
  const text = message.toLowerCase();
  if (text.includes('cảm xúc') || text.includes('emotion') || text.includes('giận dữ')) return 'emotions';
  if (text.includes('cảnh báo') || text.includes('vi phạm') || text.includes('nguy hiểm')) return 'alerts';
  if (text.includes('xếp hạng') || text.includes('rủi ro tài xế')) return 'ranking';
  return 'overview';
}

export function requestedPeriodDays(message = '') {
  const match = message.match(/(\d+)\s*ngày/i);
  return match ? Number(match[1]) : null;
}

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPlain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function periodFor(days, now) {
  return {
    source: days ? `${days}d` : 'all',
    start: days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null,
    end: now,
  };
}

function inPeriod(value, period) {
  const date = asDate(value);
  return date && (!period.start || date >= period.start) && date <= period.end;
}

function selectPeriod(records, now, requestedDays) {
  const candidates = requestedDays ? [requestedDays, 30, null] : [7, 30, null];
  for (const days of [...new Set(candidates)]) {
    const period = periodFor(days, now);
    if (records.some((record) => inPeriod(record.timestamp || record.start_time, period))) {
      return period;
    }
  }
  return periodFor(null, now);
}

function emptyResult(organizationId, period) {
  return {
    type: 'no_data_guidance',
    title: 'Chưa có dữ liệu phân tích',
    reply: 'Tổ chức chưa có dữ liệu phù hợp. Hãy thêm nhân viên và tạo phiên lái để FleetGuard bắt đầu ghi nhận.',
    period: { source: period.source, organizationId },
    source: 'internal',
    recordsUsed: { sessions: 0, emotionLogs: 0 },
  };
}

export async function resolveAdminAnalytics({
  organizationId,
  intent = 'overview',
  driverId,
  requestedDays,
  now = new Date(),
  users,
  sessions,
  emotionLogs,
  mongoConnected = getIsMongoConnected(),
  models = { User, DrivingSession, EmotionLog },
} = {}) {
  if (!organizationId) {
    return emptyResult(null, periodFor(7, now));
  }

  let scopedUsers;
  let scopedSessions;
  let scopedEmotionLogs;

  if (users && sessions && emotionLogs) {
    scopedUsers = users.map(toPlain).filter((user) => user.organizationId === organizationId);
    const driverIds = new Set(scopedUsers
      .filter((user) => ['DRIVER', 'USER'].includes(user.role))
      .map((user) => String(user.id || user._id)));
    scopedSessions = sessions.map(toPlain).filter((session) => driverIds.has(String(session.user_id)));
    scopedEmotionLogs = emotionLogs.map(toPlain).filter((log) => driverIds.has(String(log.driver_id)));
  } else if (mongoConnected) {
    scopedUsers = await models.User.find({ organizationId }).select('name id _id role').lean();
    const driverIds = scopedUsers
      .filter((user) => ['DRIVER', 'USER'].includes(user.role))
      .map((user) => String(user.id || user._id));
    scopedSessions = await models.DrivingSession.find({ user_id: { $in: driverIds } }).lean();
    scopedEmotionLogs = await models.EmotionLog.find({ driver_id: { $in: driverIds } }).lean();
  } else {
    return resolveAdminAnalytics({
      organizationId,
      intent,
      driverId,
      requestedDays,
      now,
      users: Array.from(memoryStore.users.values()),
      sessions: Array.from(memoryStore.sessions.values()),
      emotionLogs: memoryStore.emotionLogs,
    });
  }

  const relevantRecords = [...scopedSessions, ...scopedEmotionLogs];
  const requestedPeriod = requestedDays ? periodFor(requestedDays, now) : null;
  const period = requestedPeriod && relevantRecords.some((record) => inPeriod(record.timestamp || record.start_time, requestedPeriod))
    ? requestedPeriod
    : selectPeriod(relevantRecords, now, requestedDays);
  const filteredSessions = scopedSessions.filter((session) =>
    inPeriod(session.start_time, period) && (!driverId || String(session.user_id) === String(driverId)));
  const filteredEmotionLogs = scopedEmotionLogs.filter((log) =>
    inPeriod(log.timestamp, period) && (!driverId || String(log.driver_id) === String(driverId)));
  if (!filteredSessions.length && !filteredEmotionLogs.length) {
    return emptyResult(organizationId, period);
  }

  const emotionCounts = Object.fromEntries(EMOTIONS.map((emotion) => [emotion, 0]));
  for (const log of filteredEmotionLogs) {
    const emotion = EMOTIONS.includes(log.dominant_emotion) ? log.dominant_emotion : 'neutral';
    emotionCounts[emotion] += 1;
  }

  const driverNames = new Map(scopedUsers.map((user) => [
    String(user.id || user._id),
    user.name,
  ]));
  const rankings = [...new Set(filteredSessions.map((session) => String(session.user_id)))]
    .map((id) => {
      const driverSessions = filteredSessions.filter((session) => String(session.user_id) === id);
      const alerts = driverSessions.reduce((sum, session) => sum + (session.peak_alert_level > 0 ? 1 : 0), 0);
      const score = driverSessions.reduce((sum, session) => sum + (session.safety_score || 0), 0) / driverSessions.length;
      return { driverId: id, name: driverNames.get(id) || 'Tài xế', sessions: driverSessions.length, alerts, safetyScore: Number(score.toFixed(1)) };
    })
    .sort((a, b) => a.safetyScore - b.safetyScore);

  const base = {
    period: { source: period.source, start: period.start?.toISOString() || null, end: period.end.toISOString(), organizationId },
    source: 'internal',
    recordsUsed: { sessions: filteredSessions.length, emotionLogs: filteredEmotionLogs.length },
    driverIds: [...new Set([...filteredSessions.map((session) => String(session.user_id)), ...filteredEmotionLogs.map((log) => String(log.driver_id))])],
  };

  if (intent === 'emotions') {
    return { ...base, type: 'emotion_breakdown', title: 'Phân bố cảm xúc đội xe', emotionDistribution: emotionCounts, disclaimer: 'Cảm xúc là tín hiệu dự đoán từ model, không phải kết luận tâm lý.' };
  }
  if (intent === 'alerts') {
    return { ...base, type: 'alert_breakdown', title: 'Cảnh báo và vi phạm', criticalAlerts: filteredSessions.filter((session) => session.peak_alert_level === 2).length, warningAlerts: filteredSessions.filter((session) => session.peak_alert_level === 1).length, driverRanking: rankings };
  }
  if (intent === 'ranking') {
    return { ...base, type: 'driver_alert_ranking', title: 'Xếp hạng rủi ro tài xế', driverRanking: rankings };
  }
  return {
    ...base,
    type: 'fleet_overview',
    title: 'Tổng quan an toàn đội xe',
    metrics: {
      drivers: scopedUsers.length,
      sessions: filteredSessions.length,
      averageSafetyScore: rankings.length ? Number((rankings.reduce((sum, row) => sum + row.safetyScore, 0) / rankings.length).toFixed(1)) : 0,
      criticalAlerts: filteredSessions.filter((session) => session.peak_alert_level === 2).length,
    },
    driverRanking: rankings,
  };
}

export { EMOTIONS };

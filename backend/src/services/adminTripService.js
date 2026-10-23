import { DrivingSession } from '../models/DrivingSession.js';
import { User } from '../models/User.js';
import { getIsMongoConnected, memoryStore } from '../db.js';

const ALLOWED_LIMITS = [20, 50, 100];

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function normalizeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function normalizePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizeLimit(value) {
  const requested = Number.parseInt(value, 10);
  return ALLOWED_LIMITS.includes(requested) ? requested : 20;
}

function enrichSession(session, user) {
  const item = plain(session);
  return {
    ...item,
    driver: {
      id: user.id || user._id?.toString(),
      name: user.name,
      email: user.email,
    },
  };
}

function buildResult(sessions, userMap, { page, limit }) {
  const enriched = sessions
    .map((session) => enrichSession(session, userMap.get(String(session.user_id))))
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  const completed = enriched.filter((session) => session.status === 'COMPLETED');
  const scores = completed
    .map((session) => Number(session.safety_score))
    .filter((score) => Number.isFinite(score) && score >= 0 && score <= 100);
  const totalDurationSeconds = completed.reduce((total, session) => {
    const duration = Number(session.duration_seconds);
    return total + (Number.isFinite(duration) && duration > 0 ? duration : 0);
  }, 0);

  const start = (page - 1) * limit;
  const items = enriched.slice(start, start + limit);
  return {
    summary: {
      completedSessions: completed.length,
      activeSessions: enriched.filter((session) => session.status === 'ACTIVE').length,
      averageSafetyScore: scores.length
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : null,
      criticalAlerts: completed.filter((session) => session.peak_alert_level === 2).length,
      totalDurationSeconds,
    },
    items,
    pagination: {
      page,
      limit,
      total: enriched.length,
      pages: Math.ceil(enriched.length / limit),
    },
  };
}

export async function resolveAdminTrips({
  organizationId,
  startDate,
  endDate,
  driverId,
  driverSearch,
  status,
  page: rawPage = 1,
  limit: rawLimit = 20,
  source,
}) {
  const page = normalizePage(rawPage);
  const limit = normalizeLimit(rawLimit);
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  let users;
  let sessions;
  if (source) {
    users = source.users.map(plain)
      .filter((user) => user.organizationId === organizationId && ['DRIVER', 'USER'].includes(user.role));
    if (driverId) users = users.filter((user) => String(user._id || user.id) === String(driverId));
    sessions = source.sessions.map(plain);
  } else if (getIsMongoConnected()) {
    const userQuery = {
      organizationId,
      role: { $in: ['DRIVER', 'USER'] },
    };
    if (driverId) userQuery._id = driverId;
    users = await User.find(userQuery).select('_id id name email organizationId role').lean();
    const userIds = users.map((user) => String(user._id || user.id));
    sessions = userIds.length
      ? await DrivingSession.find({ user_id: { $in: userIds } }).lean()
      : [];
  } else {
    users = Array.from(memoryStore.users.values()).map(plain)
      .filter((user) => user.organizationId === organizationId && ['DRIVER', 'USER'].includes(user.role));
    if (driverId) users = users.filter((user) => String(user._id || user.id) === String(driverId));
    const userIds = new Set(users.map((user) => String(user._id || user.id)));
    sessions = Array.from(memoryStore.sessions.values()).map(plain)
      .filter((session) => userIds.has(String(session.user_id)));
  }

  const userMap = new Map(users.map((user) => [String(user._id || user.id), user]));
  const search = driverSearch?.trim().toLowerCase();
  const matchingUserIds = new Set(users
    .filter((user) => !search || `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(search))
    .map((user) => String(user._id || user.id)));

  const filtered = sessions.filter((session) => {
    const user = userMap.get(String(session.user_id));
    if (!user || !matchingUserIds.has(String(session.user_id))) return false;
    const sessionStart = normalizeDate(session.start_time);
    if (!sessionStart || (start && sessionStart < start) || (end && sessionStart > end)) return false;
    if (status && session.status !== status) return false;
    return true;
  });

  return buildResult(filtered, userMap, { page, limit });
}

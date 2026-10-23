import { AuditLog } from '../models/AuditLog.js';
import { getIsMongoConnected, memoryStore } from '../db.js';

const LIMITS = [20, 50, 100];

export function createAuditMemoryStore() {
  return [];
}

function normalizePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizeLimit(value) {
  const limit = Number.parseInt(value, 10);
  return LIMITS.includes(limit) ? limit : 20;
}

function normalizeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function toRecord(input) {
  const actor = input.actor || {};
  return {
    actorId: String(actor.id || actor._id || ''),
    actorName: actor.name || '',
    actorEmail: actor.email || '',
    organizationId: actor.organizationId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId || null,
    description: input.description || '',
    metadata: input.metadata || {},
    timestamp: input.timestamp || new Date(),
  };
}

const recentEventsCache = new Map();

export async function recordAuditEvent(input) {
  const record = toRecord(input);
  if (!record.action) return null;

  if (record.action.startsWith('VIEW_') && input.deduplicate !== false) {
    // Deduplication guard: ignore identical events within 3000ms
    const dedupKey = `${record.organizationId || ''}_${record.actorId || ''}_${record.action}_${record.resourceType || ''}_${record.resourceId || ''}`;
    const now = Date.now();
    const lastTime = recentEventsCache.get(dedupKey);
    if (lastTime && now - lastTime < 3000) {
      return null;
    }
    recentEventsCache.set(dedupKey, now);

    // Clean old entries periodically
    if (recentEventsCache.size > 200) {
      for (const [key, timestamp] of recentEventsCache.entries()) {
        if (now - timestamp > 10000) {
          recentEventsCache.delete(key);
        }
      }
    }
  }

  try {
    if (input.persistence?.create) {
      return await input.persistence.create(record);
    }
    if (getIsMongoConnected()) {
      return await AuditLog.create(record);
    }
    const store = input.store || memoryStore.auditLogs || (memoryStore.auditLogs = []);
    store.push(record);
    return record;
  } catch (error) {
    console.error('[Audit log persistence failed]:', error.message);
    return null;
  }
}

export async function listAuditEvents({
  organizationId,
  startDate,
  endDate,
  action,
  actorId,
  resourceType,
  page: rawPage = 1,
  limit: rawLimit = 20,
  store,
}) {
  const page = normalizePage(rawPage);
  const limit = normalizeLimit(rawLimit);
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  let records;

  if (store) {
    records = [...store];
  } else if (getIsMongoConnected()) {
    const filter = { organizationId };
    if (action) filter.action = action;
    if (actorId) filter.actorId = actorId;
    if (resourceType) filter.resourceType = resourceType;
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = start;
      if (end) filter.timestamp.$lte = end;
    }
    const total = await AuditLog.countDocuments(filter);
    const items = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  } else {
    records = [...(memoryStore.auditLogs || [])];
  }

  records = records
    .filter((record) => record.organizationId === organizationId)
    .filter((record) => !action || record.action === action)
    .filter((record) => !actorId || record.actorId === actorId)
    .filter((record) => !resourceType || record.resourceType === resourceType)
    .filter((record) => {
      const timestamp = normalizeDate(record.timestamp);
      return timestamp && (!start || timestamp >= start) && (!end || timestamp <= end);
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const offset = (page - 1) * limit;
  return {
    items: records.slice(offset, offset + limit),
    pagination: { page, limit, total: records.length, pages: Math.ceil(records.length / limit) },
  };
}

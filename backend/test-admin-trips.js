import assert from 'node:assert/strict';
import { resolveAdminTrips } from './src/services/adminTripService.js';

const users = [
  { id: 'driver-a', role: 'DRIVER', organizationId: 'org-a', name: 'A Driver', email: 'a@fleet.vn' },
  { id: 'driver-b', role: 'DRIVER', organizationId: 'org-b', name: 'B Driver', email: 'b@fleet.vn' },
];

const sessions = [
  { session_id: 'completed-a', user_id: 'driver-a', start_time: '2026-10-20T10:00:00.000Z', end_time: '2026-10-20T11:00:00.000Z', duration_seconds: 3600, safety_score: 80, peak_alert_level: 2, status: 'COMPLETED' },
  { session_id: 'active-a', user_id: 'driver-a', start_time: '2026-10-21T10:00:00.000Z', duration_seconds: 10, safety_score: 20, peak_alert_level: 2, status: 'ACTIVE' },
  { session_id: 'completed-b', user_id: 'driver-b', start_time: '2026-10-21T10:00:00.000Z', end_time: '2026-10-21T11:00:00.000Z', duration_seconds: 2000, safety_score: 10, peak_alert_level: 2, status: 'COMPLETED' },
  { session_id: 'orphan', user_id: 'missing', start_time: '2026-10-21T12:00:00.000Z', duration_seconds: 100, safety_score: 1, status: 'COMPLETED' },
  { session_id: 'old-a', user_id: 'driver-a', start_time: '2026-09-01T10:00:00.000Z', duration_seconds: 100, safety_score: 1, status: 'COMPLETED' },
];

const result = await resolveAdminTrips({
  organizationId: 'org-a',
  startDate: '2026-10-20T00:00:00.000Z',
  endDate: '2026-10-22T00:00:00.000Z',
  page: 1,
  limit: 20,
  source: { users, sessions },
});

assert.deepEqual(result.items.map((item) => item.session_id), ['active-a', 'completed-a']);
assert.equal(result.summary.completedSessions, 1);
assert.equal(result.summary.activeSessions, 1);
assert.equal(result.summary.averageSafetyScore, 80);
assert.equal(result.summary.criticalAlerts, 1);
assert.equal(result.summary.totalDurationSeconds, 3600);
assert.equal(result.pagination.total, 2);

const limited = await resolveAdminTrips({
  organizationId: 'org-a',
  page: 1,
  limit: 1,
  source: { users, sessions },
});
assert.equal(limited.pagination.limit, 20);

const empty = await resolveAdminTrips({
  organizationId: 'org-missing',
  source: { users, sessions },
});
assert.deepEqual(empty.items, []);
assert.equal(empty.summary.averageSafetyScore, null);

console.log('Admin trip service tests passed.');

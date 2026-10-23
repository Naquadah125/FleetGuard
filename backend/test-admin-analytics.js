import assert from 'node:assert/strict';
import { detectAdminIntent, requestedPeriodDays, resolveAdminAnalytics } from './src/services/adminAnalyticsService.js';

const now = new Date('2026-10-23T12:00:00.000Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const deps = {
  users: [
    { id: 'driver-a', role: 'DRIVER', organizationId: 'org-a', name: 'Driver A' },
    { id: 'driver-b', role: 'DRIVER', organizationId: 'org-b', name: 'Driver B' },
  ],
  sessions: [
    {
      session_id: 'session-a',
      user_id: 'driver-a',
      start_time: daysAgo(12),
      end_time: daysAgo(12),
      safety_score: 82,
      peak_alert_level: 2,
      status: 'COMPLETED',
    },
    {
      session_id: 'session-b',
      user_id: 'driver-b',
      start_time: daysAgo(1),
      end_time: daysAgo(1),
      safety_score: 10,
      peak_alert_level: 2,
      status: 'COMPLETED',
    },
  ],
  emotionLogs: [
    {
      session_id: 'session-a',
      driver_id: 'driver-a',
      timestamp: daysAgo(12),
      dominant_emotion: 'angry',
      confidence: 0.9,
      alert_level: 1,
      status: 'ANGRY_OUTBURST',
    },
    {
      session_id: 'session-b',
      driver_id: 'driver-b',
      timestamp: daysAgo(1),
      dominant_emotion: 'fatigued',
      confidence: 0.95,
      alert_level: 2,
      status: 'DROWSY',
    },
  ],
  videos: [],
};

const overview = await resolveAdminAnalytics({
  organizationId: 'org-a',
  intent: 'overview',
  now,
  ...deps,
});

assert.equal(overview.type, 'fleet_overview');
assert.equal(overview.period.source, '30d');
assert.equal(overview.recordsUsed.sessions, 1);
assert.equal(overview.metrics.criticalAlerts, 1);
assert.deepEqual(overview.driverIds, ['driver-a']);
const requested = await resolveAdminAnalytics({
  organizationId: 'org-a',
  intent: 'overview',
  requestedDays: requestedPeriodDays('trong 14 ngày gần đây'),
  now,
  ...deps,
});
assert.equal(requested.period.source, '14d');

const noData = await resolveAdminAnalytics({
  organizationId: 'org-empty',
  intent: 'emotions',
  now,
  ...deps,
});

assert.equal(noData.type, 'no_data_guidance');
assert.match(noData.reply, /nhân viên|phiên/i);
assert.equal(noData.driverNames, undefined);
assert.equal(detectAdminIntent('Thống kê cảm xúc đội xe'), 'emotions');
assert.equal(detectAdminIntent('Danh sách cảnh báo nguy hiểm'), 'alerts');
assert.equal(detectAdminIntent('Tổng quan đội xe'), 'overview');
assert.equal(detectAdminIntent('Thống kê trong 30 ngày gần đây'), 'overview');

console.log('Admin analytics service tests passed.');

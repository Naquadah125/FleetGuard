import assert from 'node:assert/strict';
import { resolveUserAnalytics } from './src/services/userAnalyticsService.js';

const now = new Date('2026-10-23T12:00:00.000Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const sessions = [
  {
    session_id: 'recent-1',
    user_id: 'driver-a',
    start_time: daysAgo(1),
    duration_seconds: 3600,
    safety_score: 80,
    drowsy_count: 2,
    yawn_count: 3,
    distracted_count: 1,
    peak_alert_level: 2,
  },
  {
    session_id: 'recent-2',
    user_id: 'driver-a',
    start_time: daysAgo(3),
    duration_seconds: 1800,
    safety_score: 100,
    drowsy_count: 0,
    yawn_count: 1,
    distracted_count: 0,
    peak_alert_level: 1,
  },
  {
    session_id: 'old',
    user_id: 'driver-a',
    start_time: daysAgo(10),
    duration_seconds: 7200,
    safety_score: 60,
    drowsy_count: 5,
    yawn_count: 0,
    distracted_count: 2,
    peak_alert_level: 2,
  },
  {
    session_id: 'other-user',
    user_id: 'driver-b',
    start_time: daysAgo(1),
    duration_seconds: 10000,
    safety_score: 0,
    drowsy_count: 99,
    yawn_count: 99,
    distracted_count: 99,
    peak_alert_level: 2,
  },
];

const result = await resolveUserAnalytics({
  userId: 'driver-a',
  now,
  sessions,
});

assert.equal(result.type, 'user_safety_summary');
assert.equal(result.period.source, '7d');
assert.deepEqual(result.recordsUsed, { sessions: 2 });
assert.deepEqual(result.metrics, {
  session_count: 2,
  average_safety_score: 90,
  drowsy_count: 2,
  yawn_count: 4,
  distracted_count: 1,
  critical_alerts: 1,
  warning_alerts: 1,
  duration_seconds: 5400,
});

const selectedSession = await resolveUserAnalytics({
  userId: 'driver-a',
  sessionId: 'old',
  now,
  sessions,
});
assert.deepEqual(selectedSession.recordsUsed, { sessions: 1 });
assert.equal(selectedSession.metrics.average_safety_score, 60);

const selectedPeriod = await resolveUserAnalytics({
  userId: 'driver-a',
  startDate: daysAgo(4).toISOString(),
  endDate: daysAgo(2).toISOString(),
  now,
  sessions,
});
assert.deepEqual(selectedPeriod.recordsUsed, { sessions: 1 });
assert.equal(selectedPeriod.metrics.session_count, 1);
assert.equal(selectedPeriod.metrics.duration_seconds, 1800);

console.log('User analytics service tests passed.');

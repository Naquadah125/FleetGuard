import test from 'node:test'
import assert from 'node:assert/strict'
import { getUserId, normalizeSession } from './sessions.js'

test('gets the backend id from either user id shape', () => {
  assert.equal(getUserId({ _id: 'mongo-id' }), 'mongo-id')
  assert.equal(getUserId({ id: 'backend-id' }), 'backend-id')
})

test('normalizes a backend driving session for history', () => {
  const trip = normalizeSession({
    session_id: 'SES-123',
    user_id: 'user-123',
    start_time: '2026-10-23T06:00:00.000Z',
    end_time: '2026-10-23T07:30:00.000Z',
    safety_score: 94,
    drowsy_count: 1,
    yawn_count: 2,
    distracted_count: 0,
  })

  assert.deepEqual(trip, {
    _id: 'SES-123',
    driverId: 'user-123',
    vehicleId: null,
    startedAt: '2026-10-23T06:00:00.000Z',
    endedAt: '2026-10-23T07:30:00.000Z',
    distanceKm: 0,
    safetyScore: 94,
    drowsyCount: 1,
    yawnCount: 2,
    distractedCount: 0,
    breaks: 0,
  })
})

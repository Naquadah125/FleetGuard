import assert from 'node:assert/strict'
import { buildTelemetryPayload } from './src/utils/telemetry.js'

const payload = buildTelemetryPayload({
  sessionId: 'SES-1',
  driverId: 'driver-1',
  level: 2,
  status: 'DROWSY',
  perclos: 42.5,
  yaw: 3,
})

assert.equal(payload.session_id, 'SES-1')
assert.equal(payload.driver_id, 'driver-1')
assert.equal(payload.alert_level, 2)
assert.equal(payload.status, 'DROWSY')
assert.deepEqual(payload.head_pose, { yaw: 3, pitch: 0, roll: 0 })
console.log('Telemetry payload test passed.')

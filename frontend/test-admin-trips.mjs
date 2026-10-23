import assert from 'node:assert/strict'
import { buildTripQuery } from './src/api/adminOperations.js'

const query = buildTripQuery({ startDate: '2026-10-01', status: 'COMPLETED', page: 2, limit: 50 })
assert.equal(query.get('start_date'), '2026-10-01')
assert.equal(query.get('status'), 'COMPLETED')
assert.equal(query.get('page'), '2')
assert.equal(query.get('limit'), '50')
assert.equal(query.get('organizationId'), null)
console.log('Admin trip UI contract test passed.')

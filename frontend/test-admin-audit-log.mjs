import assert from 'node:assert/strict'
import { buildTripQuery } from './src/api/adminOperations.js'

const query = buildTripQuery({ driverSearch: 'an@example.com', page: 3, limit: 100 })
assert.equal(query.get('driver_search'), 'an@example.com')
assert.equal(query.get('page'), '3')
assert.equal(query.get('limit'), '100')
console.log('Admin audit UI contract test passed.')

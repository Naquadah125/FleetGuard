import assert from 'node:assert/strict';
import { createAuditMemoryStore, listAuditEvents, recordAuditEvent } from './src/services/auditLogService.js';

const store = createAuditMemoryStore();
await recordAuditEvent({
  actor: { id: 'admin-a', name: 'Admin A', email: 'a@fleet.vn', organizationId: 'org-a' },
  action: 'VIEW_TRIPS',
  resourceType: 'driving_session',
  resourceId: 's1',
  description: 'Viewed trips',
  metadata: { page: 1 },
  store,
});
await recordAuditEvent({
  actor: { id: 'admin-b', name: 'Admin B', email: 'b@fleet.vn', organizationId: 'org-b' },
  action: 'DELETE_EMPLOYEE',
  resourceType: 'user',
  resourceId: 'u1',
  description: 'Deleted employee',
  store,
});

const result = await listAuditEvents({
  organizationId: 'org-a',
  action: 'VIEW_TRIPS',
  page: 1,
  limit: 20,
  store,
});
assert.equal(result.items.length, 1);
assert.equal(result.items[0].actorId, 'admin-a');
assert.equal(result.items[0].metadata.page, 1);
assert.equal(result.pagination.total, 1);

const forbidden = await listAuditEvents({ organizationId: 'org-missing', store });
assert.equal(forbidden.items.length, 0);

let failedWriteLogged = false;
const originalError = console.error;
console.error = (...args) => {
  if (args.join(' ').includes('Audit log persistence failed')) failedWriteLogged = true;
};
await recordAuditEvent({
  actor: { id: 'admin-a', organizationId: 'org-a' },
  action: 'VIEW_AUDIT_LOG',
  resourceType: 'audit_log',
  persistence: { create: async () => { throw new Error('db down'); } },
});
console.error = originalError;
assert.equal(failedWriteLogged, true);
console.log('Admin audit service tests passed.');

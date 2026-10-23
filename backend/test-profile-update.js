import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app, telemetryHandler } from './src/server.js';
import { memoryStore } from './src/db.js';
import { JWT_SECRET } from './src/middleware/authMiddleware.js';

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();

const passwordHash = await bcrypt.hash('oldpass1', 10);
const userId = 'profile-test-user';
memoryStore.users.set(userId, {
  _id: userId,
  id: userId,
  name: 'Old Name',
  email: 'profile@example.com',
  passwordHash,
  role: 'DRIVER',
  organizationId: 'org-test',
  organizationName: 'Test Fleet',
});

const token = jwt.sign({ id: userId, email: 'profile@example.com', role: 'DRIVER' }, JWT_SECRET);
const response = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Name',
    phone: '0901234567',
    dateOfBirth: '12-04-1998',
    avatarColor: '#2563eb',
  }),
});

assert.notEqual(response.status, 404);
const result = await response.json();
assert.equal(response.status, 200);
assert.equal(result.user.name, 'New Name');
assert.equal(result.user.email, 'profile@example.com');
assert.equal(result.user.phone, '0901234567');
assert.equal(result.user.dateOfBirth, '12-04-1998');
assert.equal(result.user.passwordHash, undefined);
assert.equal(memoryStore.users.get(userId).name, 'New Name');
assert.equal(memoryStore.auditLogs.at(-1).action, 'UPDATE_PROFILE');
assert.deepEqual(memoryStore.auditLogs.at(-1).metadata.changedFields, ['name', 'phone', 'dateOfBirth', 'avatarColor']);

const invalidPhone = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Should Not Save', phone: '123', dateOfBirth: '12-04-1998', avatarColor: '#2563eb' }),
});
assert.equal(invalidPhone.status, 400);
assert.equal(memoryStore.users.get(userId).name, 'New Name');

const wrongPassword = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Should Not Save',
    phone: '0901234567',
    dateOfBirth: '12-04-1998',
    avatarColor: '#2563eb',
    currentPassword: 'wrongpass',
    newPassword: 'newpass1',
    confirmPassword: 'newpass1',
  }),
});
assert.equal(wrongPassword.status, 401);
assert.equal(memoryStore.users.get(userId).name, 'New Name');

const protectedField = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Name',
    phone: '0901234567',
    dateOfBirth: '12-04-1998',
    avatarColor: '#2563eb',
    email: 'changed@example.com',
  }),
});
assert.equal(protectedField.status, 400);
assert.equal(memoryStore.users.get(userId).email, 'profile@example.com');

server.close();
telemetryHandler.stop();
console.log('Profile update API contract test reached the endpoint.');

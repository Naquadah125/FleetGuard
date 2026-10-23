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

const avatarImage = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64')}`;
const avatarResponse = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: 'New Name',
    phone: '0901234567',
    dateOfBirth: '12-04-1998',
    avatarColor: '#2563eb',
    avatarImage,
  }),
});
assert.equal(avatarResponse.status, 200);
const avatarResult = await avatarResponse.json();
assert.equal(avatarResult.user.avatarImage, avatarImage);
assert.equal(memoryStore.users.get(userId).avatarImage, avatarImage);
assert.ok(memoryStore.auditLogs.at(-1).metadata.changedFields.includes('avatarImage'));

const keepAvatarResponse = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: 'New Name',
    phone: '0901234567',
    dateOfBirth: '12-04-1998',
    avatarColor: '#2563eb',
  }),
});
assert.equal(keepAvatarResponse.status, 200);
assert.equal(memoryStore.users.get(userId).avatarImage, avatarImage);

for (const invalidAvatar of [
  'data:image/png;base64,/9j/2Q==',
  'data:image/jpeg;base64,not-base64!',
]) {
  const invalidAvatarResponse = await fetch(`http://localhost:${port}/api/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Must Not Save',
      phone: '0901234567',
      dateOfBirth: '12-04-1998',
      avatarColor: '#2563eb',
      avatarImage: invalidAvatar,
    }),
  });
  assert.equal(invalidAvatarResponse.status, 400);
  assert.equal(memoryStore.users.get(userId).name, 'New Name');
  assert.equal(memoryStore.users.get(userId).avatarImage, avatarImage);
}

const oversizedAvatar = `data:image/jpeg;base64,${Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  Buffer.alloc(512 * 1024),
]).toString('base64')}`;
const oversizedAvatarResponse = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: 'Must Not Save',
    phone: '0901234567',
    dateOfBirth: '12-04-1998',
    avatarColor: '#2563eb',
    avatarImage: oversizedAvatar,
  }),
});
assert.equal(oversizedAvatarResponse.status, 400);
assert.equal(memoryStore.users.get(userId).name, 'New Name');
assert.equal(memoryStore.users.get(userId).avatarImage, avatarImage);

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

const invalidBirthDate = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Should Not Save', phone: '0901234567', dateOfBirth: '31-02-1998', avatarColor: '#2563eb' }),
});
assert.equal(invalidBirthDate.status, 400);
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

const passwordChange = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Name',
    phone: '0901234567',
    dateOfBirth: '12-04-1998',
    avatarColor: '#2563eb',
    currentPassword: 'oldpass1',
    newPassword: 'newpass1',
    confirmPassword: 'newpass1',
  }),
});
assert.equal(passwordChange.status, 200);
assert.equal(await bcrypt.compare('newpass1', memoryStore.users.get(userId).passwordHash), true);
assert.equal(JSON.stringify(memoryStore.auditLogs.at(-1).metadata).includes('newpass1'), false);
assert.ok(memoryStore.auditLogs.at(-1).metadata.changedFields.includes('password'));

const soloId = 'profile-solo-user';
memoryStore.users.set(soloId, {
  _id: soloId,
  id: soloId,
  name: 'Solo User',
  email: 'solo@example.com',
  passwordHash,
  role: 'USER',
});
const soloToken = jwt.sign({ id: soloId, email: 'solo@example.com', role: 'USER' }, JWT_SECRET);
const soloResponse = await fetch(`http://localhost:${port}/api/auth/me`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${soloToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Solo User', phone: '0912345678', dateOfBirth: '12-04-1998', avatarColor: '#2563eb' }),
});
assert.equal(soloResponse.status, 200);
assert.equal(memoryStore.auditLogs.at(-1).organizationId, `user_${soloId}`);

server.close();
telemetryHandler.stop();
console.log('Profile update API contract test reached the endpoint.');

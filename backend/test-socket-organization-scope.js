import assert from 'node:assert/strict';
import { TelemetryHandler } from './src/socket/telemetryHandler.js';

let connectionHandler;
const events = [];
const io = {
  on: (event, handler) => {
    if (event === 'connection') connectionHandler = handler;
  },
  to: (room) => ({
    emit: (event, payload) => events.push({ room, event, payload }),
  }),
};

const handler = new TelemetryHandler(io, { batchIntervalMs: 60000 });
const socket = {
  rooms: [],
  on: (event, callback) => { socket[event] = callback; },
  join: (room) => socket.rooms.push(room),
  emit: () => {},
  authUser: { id: 'admin-a', organizationId: 'org-a', role: 'ADMIN' },
};
connectionHandler(socket);
socket['admin:join']({ organizationId: 'org-forged' });
assert.equal(socket.rooms.includes('room:org_org-a'), true);
assert.equal(socket.rooms.includes('room:org-forged'), false);

const driverSocket = {
  rooms: [],
  on: (event, callback) => { driverSocket[event] = callback; },
  join: (room) => driverSocket.rooms.push(room),
  emit: () => {},
  authUser: { id: 'driver-a', organizationId: 'org-a', role: 'DRIVER' },
};
connectionHandler(driverSocket);
driverSocket['driver:join']({ driverId: 'driver-a', organizationId: 'org-forged' });
assert.equal(driverSocket.organizationId, 'org-a');

driverSocket['trip:lifecycle']({ session_id: 's1', status: 'COMPLETED', organizationId: 'org-forged', driver_id: 'driver-a' });
assert.equal(events.at(-1).room, 'room:org_org-a');
assert.equal(events.at(-1).event, 'trip:lifecycle');
handler.stop();
console.log('Socket organization scope tests passed.');

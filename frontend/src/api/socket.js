import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    // In dev, with vite proxy, relative root '/' works.
    // Fallback to origin or http://localhost:5000 if needed.
    const url = window.location.origin;
    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

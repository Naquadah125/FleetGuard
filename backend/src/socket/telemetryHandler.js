import { insertBatchLogs } from '../db.js';

/**
 * Socket.io Telemetry Streaming Handler with 2-Second Batch Buffer & Alert Level 2 Relay
 */
export class TelemetryHandler {
  constructor(io, options = {}) {
    this.io = io;
    this.batchIntervalMs = options.batchIntervalMs ?? 2000;
    this.telemetryBuffer = [];
    this.totalFlushedCount = 0;
    this.lastFlushTime = null;
    this.activeAlerts = new Map();
    this.timer = null;

    this._startBatchTimer();
    this._setupSocketListeners();
  }

  /**
   * Start interval timer to batch insert every 2 seconds
   */
  _startBatchTimer() {
    this.timer = setInterval(async () => {
      await this.flushBatch();
    }, this.batchIntervalMs);
  }

  /**
   * Stop batch timer (for testing or cleanup)
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Flush in-memory telemetry buffer to database
   * @returns {Promise<number>} Number of records inserted
   */
  async flushBatch() {
    if (this.telemetryBuffer.length === 0) return 0;

    // Take snapshot and reset buffer
    const recordsToInsert = [...this.telemetryBuffer];
    this.telemetryBuffer = [];

    try {
      await insertBatchLogs(recordsToInsert);
      this.totalFlushedCount += recordsToInsert.length;
      this.lastFlushTime = new Date();
      return recordsToInsert.length;
    } catch (err) {
      console.error('[Telemetry Batch Flush Error]:', err.message);
      // Re-queue records if flush fails
      this.telemetryBuffer.unshift(...recordsToInsert);
      return 0;
    }
  }

  /**
   * Setup Socket.io event listeners
   */
  _setupSocketListeners() {
    this.io.on('connection', (socket) => {
      // 1. Join fleet admin room for real-time monitoring (organization scoped)
      socket.on('admin:join', (data) => {
        const orgId = socket.authUser?.organizationId;
        if (!orgId || !['ADMIN', 'FLEET_ADMIN'].includes(socket.authUser?.role)) {
          socket.emit('admin:join:error', { message: 'Admin socket access required' });
          return;
        }
        socket.join('room:fleet_admins');
        socket.join(`room:org_${orgId}`);
        socket.emit('admin:joined', { room: `room:org_${orgId}`, timestamp: Date.now() });
      });

      // 2. Driver registers their connection with organization
      socket.on('driver:join', (data) => {
        if (data?.driverId && socket.authUser?.id === data.driverId) {
          socket.driverId = data.driverId;
          socket.organizationId = socket.authUser.organizationId || null;
          if (socket.organizationId) {
            socket.join(`room:org_${socket.organizationId}`);
          }
        }
      });

      // 3. Driver stream live camera frame (10-15 fps JPEG)
      socket.on('driver:camera_frame', (payload) => {
        if (!payload || !payload.driverId) return;
        const orgId = payload.organizationId;
        const targetRoom = orgId ? `room:org_${orgId}` : 'room:fleet_admins';

        // Relay live frame to Admin room
        this.io.to(targetRoom).emit('driver:camera_frame', payload);
        if (targetRoom !== 'room:fleet_admins') {
          this.io.to('room:fleet_admins').emit('driver:camera_frame', payload);
        }
      });

      // 4. Driver camera status toggle (cameraActive: true/false)
      socket.on('driver:camera_status', (payload) => {
        if (!payload || !payload.driverId) return;
        const orgId = payload.organizationId;
        const targetRoom = orgId ? `room:org_${orgId}` : 'room:fleet_admins';

        this.io.to(targetRoom).emit('driver:camera_status', payload);
        if (targetRoom !== 'room:fleet_admins') {
          this.io.to('room:fleet_admins').emit('driver:camera_status', payload);
        }
      });

      // 5. Driver stream telemetry event
      socket.on('telemetry:stream', (payload) => {
        if (!payload) return;

        const normalizedRecord = {
          session_id: payload.session_id || 'default_session',
          driver_id: payload.driver_id || 'default_driver',
          organization_id: payload.organization_id || null,
          vehicle_id: payload.vehicle_id || null,
          timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
          dominant_emotion: payload.emotion || payload.dominant_emotion || 'neutral',
          confidence: payload.emotion_confidence ?? payload.confidence ?? 0.5,
          scores: payload.emotion_scores || payload.scores || {},
          ear: payload.ear ?? 0,
          mar: payload.mar ?? 0,
          perclos: payload.perclos ?? 0,
          head_pose: payload.head_pose || { yaw: 0, pitch: 0, roll: 0 },
          alert_level: payload.alert_level ?? 0,
          status: payload.status || 'NORMAL',
          yawn_count: payload.yawn_count ?? 0
        };

        // Enqueue into 2-second in-memory buffer
        this.telemetryBuffer.push(normalizedRecord);

        // Relay live telemetry to fleet admins
        this.io.to('room:fleet_admins').emit('telemetry:live', normalizedRecord);

        // Immediate relay if Alert Level 2 (Critical Alert: DROWSY, DISTRACTED, ANGRY_OUTBURST)
        const alertKey = `${normalizedRecord.driver_id}:${normalizedRecord.session_id}`;
        const previousAlert = this.activeAlerts.get(alertKey);
        if (normalizedRecord.alert_level > 0) {
          this.activeAlerts.set(alertKey, {
            level: normalizedRecord.alert_level,
            status: normalizedRecord.status,
          });
        } else {
          this.activeAlerts.delete(alertKey);
        }

        const isNewIncident = normalizedRecord.alert_level > 0 && (
          !previousAlert ||
          normalizedRecord.alert_level > previousAlert.level ||
          normalizedRecord.status !== previousAlert.status
        );
        if (isNewIncident) {
          const alertPayload = {
            alert_id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            driver_id: normalizedRecord.driver_id,
            organization_id: normalizedRecord.organization_id,
            vehicle_id: normalizedRecord.vehicle_id,
            session_id: normalizedRecord.session_id,
            status: normalizedRecord.status,
            alert_level: 2,
            ear: normalizedRecord.ear,
            mar: normalizedRecord.mar,
            perclos: normalizedRecord.perclos,
            head_pose: normalizedRecord.head_pose,
            emotion: normalizedRecord.dominant_emotion,
            timestamp: normalizedRecord.timestamp
          };

          // Broadcast immediately so every Admin page can record the incident.
          this.io.to('room:fleet_admins').emit('alert:incident', alertPayload);
          if (normalizedRecord.alert_level === 2) {
            this.io.to('room:fleet_admins').emit('alert:critical', alertPayload);
          }

          // Echo back to Driver client
          socket.emit('alert:critical', alertPayload);
        }
      });

      socket.on('disconnect', () => {
        if (socket.driverId) {
          const orgId = socket.organizationId;
          const targetRoom = orgId ? `room:org_${orgId}` : 'room:fleet_admins';
          const payload = {
            driverId: socket.driverId,
            organizationId: orgId,
            cameraActive: false,
            status: 'resting',
            reason: 'disconnected'
          };
          this.io.to(targetRoom).emit('driver:camera_status', payload);
          if (targetRoom !== 'room:fleet_admins') {
            this.io.to('room:fleet_admins').emit('driver:camera_status', payload);
          }
        }
      });

      socket.on('trip:lifecycle', (payload) => {
        if (!payload || socket.authUser?.id !== payload.driver_id) return;
        const organizationId = socket.authUser.organizationId;
        if (!organizationId) return;
        this.io.to(`room:org_${organizationId}`).emit('trip:lifecycle', {
          session_id: payload.session_id,
          status: payload.status,
          driver_id: socket.authUser.id,
        });
      });
    });
  }

  /**
   * Get buffer diagnostics
   */
  getDiagnostics() {
    return {
      currentBufferSize: this.telemetryBuffer.length,
      totalFlushedCount: this.totalFlushedCount,
      lastFlushTime: this.lastFlushTime,
      batchIntervalMs: this.batchIntervalMs
    };
  }
}

export default TelemetryHandler;

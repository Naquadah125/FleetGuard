import mongoose from 'mongoose';

const emotionLogSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    index: true
  },
  driver_id: {
    type: String,
    required: true,
    index: true
  },
  vehicle_id: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  dominant_emotion: {
    type: String,
    enum: ['neutral', 'happy', 'angry', 'sad', 'surprised', 'fatigued'],
    default: 'neutral'
  },
  confidence: {
    type: Number,
    default: 0
  },
  scores: {
    neutral: { type: Number, default: 0 },
    happy: { type: Number, default: 0 },
    angry: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    surprised: { type: Number, default: 0 },
    fatigued: { type: Number, default: 0 }
  },
  ear: {
    type: Number,
    default: 0
  },
  mar: {
    type: Number,
    default: 0
  },
  perclos: {
    type: Number,
    default: 0
  },
  head_pose: {
    yaw: { type: Number, default: 0 },
    pitch: { type: Number, default: 0 },
    roll: { type: Number, default: 0 }
  },
  alert_level: {
    type: Number,
    enum: [0, 1, 2],
    default: 0
  },
  status: {
    type: String,
    enum: ['NORMAL', 'DROWSY', 'DISTRACTED', 'ANGRY_OUTBURST', 'YAWNING', 'NO_FACE'],
    default: 'NORMAL'
  },
  yawn_count: {
    type: Number,
    default: 0
  }
});

// Compound indexes for optimal telemetry queries
emotionLogSchema.index({ driver_id: 1, timestamp: -1 });
emotionLogSchema.index({ session_id: 1, timestamp: 1 });
emotionLogSchema.index({ alert_level: -1, timestamp: -1 });

export const EmotionLog = mongoose.models.EmotionLog || mongoose.model('EmotionLog', emotionLogSchema);
export default EmotionLog;

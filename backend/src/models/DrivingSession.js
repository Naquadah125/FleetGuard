import mongoose from 'mongoose';

const drivingSessionSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  user_email: {
    type: String,
    default: ''
  },
  start_time: {
    type: Date,
    default: Date.now,
    index: true
  },
  end_time: {
    type: Date,
    default: Date.now
  },
  duration_seconds: {
    type: Number,
    default: 0
  },
  safety_score: {
    type: Number,
    default: 100
  },
  drowsy_count: {
    type: Number,
    default: 0
  },
  yawn_count: {
    type: Number,
    default: 0
  },
  distracted_count: {
    type: Number,
    default: 0
  },
  normal_count: {
    type: Number,
    default: 0
  },
  peak_alert_level: {
    type: Number,
    enum: [0, 1, 2],
    default: 0
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'ACTIVE'],
    default: 'COMPLETED'
  },
  notes: {
    type: String,
    default: ''
  }
});

drivingSessionSchema.index({ user_id: 1, start_time: -1 });

export const DrivingSession = mongoose.models.DrivingSession || mongoose.model('DrivingSession', drivingSessionSchema);
export default DrivingSession;

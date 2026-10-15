import mongoose from 'mongoose';

const videoAnalysisSchema = new mongoose.Schema({
  video_name: {
    type: String,
    required: true,
    trim: true
  },
  driver_id: {
    type: String,
    default: null,
    index: true
  },
  duration_sec: {
    type: Number,
    default: 0
  },
  violations: [
    {
      timestamp_sec: Number,
      type: String,
      alert_level: Number,
      frame_index: Number,
      description: String,
      ear: Number,
      mar: Number,
      head_pose: Object
    }
  ],
  emotion_timeline: [
    {
      timestamp_sec: Number,
      dominant_emotion: String,
      confidence: Number,
      scores: Object,
      status: String,
      alert_level: Number,
      ear: Number,
      mar: Number,
      head_pose: Object
    }
  ],
  summary: {
    total_duration_sec: Number,
    total_frames_analyzed: Number,
    sampling_interval_ms: Number,
    violation_counts: Object,
    total_violations: Number,
    highest_alert_level: Number,
    dominant_overall_emotion: String,
    emotion_distribution_percent: Object,
    safety_score: Number
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export const VideoAnalysis = mongoose.models.VideoAnalysis || mongoose.model('VideoAnalysis', videoAnalysisSchema);
export default VideoAnalysis;

/**
 * VideoAnalyzer - Offline Video & Frame Stream Analysis Engine
 * Samples frames at regular intervals (default 500ms) to compute emotion timelines and violation markers.
 */

import { DriverSafetyMonitor } from './DriverSafetyMonitor.js';

export class VideoAnalyzer {
  /**
   * @param {Object} [options]
   * @param {number} [options.sampleIntervalMs=500] Sampling interval in milliseconds (default 500ms = 2 FPS)
   * @param {DriverSafetyMonitor} [options.monitor] Optional custom monitor instance
   * @param {Object} [options.monitorOptions] Options passed to DriverSafetyMonitor if created internally
   */
  constructor(options = {}) {
    this.sampleIntervalMs = options.sampleIntervalMs ?? 500;
    this.monitor = options.monitor || new DriverSafetyMonitor(options.monitorOptions || {});
  }

  /**
   * Format milliseconds or seconds to float seconds
   * @param {number} ms 
   * @returns {number}
   */
  _toSeconds(ms) {
    return parseFloat((ms / 1000).toFixed(2));
  }

  /**
   * Analyze an array of frames containing landmarks and timestamps.
   * Filters frames according to sampleIntervalMs (default 500ms).
   * 
   * @param {Array<{landmarks: Array<Object>|null, timestamp: number}>} frames 
   * @returns {{
   *   emotion_timeline: Array<Object>,
   *   violations: Array<Object>,
   *   summary: Object
   * }}
   */
  analyzeFrames(frames = []) {
    this.monitor.reset();

    const emotionTimeline = [];
    const violations = [];
    let lastSampledTime = -Infinity;
    let lastViolationType = null;
    let lastViolationSec = -1;

    let totalFramesAnalyzed = 0;
    const emotionCounts = {
      neutral: 0,
      happy: 0,
      angry: 0,
      sad: 0,
      surprised: 0,
      fatigued: 0
    };

    const violationCounts = {
      DROWSY: 0,
      DISTRACTED: 0,
      ANGRY_OUTBURST: 0,
      YAWNING: 0,
      NO_FACE: 0
    };

    let highestAlertLevel = 0;
    const startTime = frames.length > 0 ? frames[0].timestamp : 0;
    let endTime = startTime;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const currentTime = frame.timestamp ?? (startTime + i * (1000 / 30));
      endTime = Math.max(endTime, currentTime);

      // Continuous monitor tracking across all frames
      const result = this.monitor.processLandmarks(frame.landmarks, currentTime);
      const timestampSec = this._toSeconds(currentTime - startTime);

      // Sample emotion timeline every 500ms (or first/last frame)
      const timeSinceLastSample = currentTime - lastSampledTime;
      const isSamplingPoint = (timeSinceLastSample >= this.sampleIntervalMs) || (i === 0) || (i === frames.length - 1);

      if (isSamplingPoint) {
        lastSampledTime = currentTime;
        totalFramesAnalyzed++;

        emotionTimeline.push({
          timestamp_sec: timestampSec,
          dominant_emotion: result.emotion,
          confidence: result.emotion_confidence,
          scores: result.emotion_scores,
          status: result.status,
          alert_level: result.alert_level,
          ear: result.ear,
          mar: result.mar,
          head_pose: result.head_pose
        });

        // Count emotion frequencies for sampling distribution
        if (result.emotion && emotionCounts[result.emotion] !== undefined) {
          emotionCounts[result.emotion]++;
        }
      }

      // Check for violation events
      if (result.alert_level > 0 && result.status !== 'NORMAL') {
        if (result.alert_level > highestAlertLevel) {
          highestAlertLevel = result.alert_level;
        }

        // Avoid spamming consecutive violations if within 1.0 second of same type
        const isDuplicateRecent =
          result.status === lastViolationType && (timestampSec - lastViolationSec < 1.0);

        if (!isDuplicateRecent) {
          violations.push({
            timestamp_sec: timestampSec,
            type: result.status,
            alert_level: result.alert_level,
            frame_index: i,
            ear: result.ear,
            mar: result.mar,
            head_pose: result.head_pose,
            description: this._getViolationDescription(result.status, result)
          });

          if (violationCounts[result.status] !== undefined) {
            violationCounts[result.status]++;
          }

          lastViolationType = result.status;
          lastViolationSec = timestampSec;
        }
      } else {
        lastViolationType = null;
      }
    }

    const durationSec = this._toSeconds(endTime - startTime);

    // Compute emotion percentage distribution
    const emotionDistribution = {};
    for (const [emo, count] of Object.entries(emotionCounts)) {
      emotionDistribution[emo] = totalFramesAnalyzed > 0
        ? parseFloat(((count / totalFramesAnalyzed) * 100).toFixed(1))
        : 0;
    }

    // Determine overall dominant emotion
    let dominantOverall = 'neutral';
    let maxCount = -1;
    for (const [emo, count] of Object.entries(emotionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantOverall = emo;
      }
    }

    // Safety score calculation (100 is perfect, penalties for violations)
    let safetyScore = 100;
    safetyScore -= (violationCounts.DROWSY * 15);
    safetyScore -= (violationCounts.DISTRACTED * 10);
    safetyScore -= (violationCounts.ANGRY_OUTBURST * 12);
    safetyScore -= (violationCounts.YAWNING * 5);
    safetyScore = Math.max(0, Math.min(100, safetyScore));

    const summary = {
      total_duration_sec: durationSec,
      total_frames_analyzed: totalFramesAnalyzed,
      sampling_interval_ms: this.sampleIntervalMs,
      violation_counts: violationCounts,
      total_violations: violations.length,
      highest_alert_level: highestAlertLevel,
      dominant_overall_emotion: dominantOverall,
      emotion_distribution_percent: emotionDistribution,
      safety_score: safetyScore
    };

    return {
      emotion_timeline: emotionTimeline,
      violations,
      summary
    };
  }

  /**
   * Helper description string for violations
   */
  _getViolationDescription(status, result) {
    switch (status) {
      case 'DROWSY':
        return `Drowsiness detected (EAR: ${result.ear}, PERCLOS: ${result.perclos})`;
      case 'DISTRACTED':
        return `Distracted head pose (Yaw: ${result.head_pose.yaw}°, Pitch: ${result.head_pose.pitch}°)`;
      case 'ANGRY_OUTBURST':
        return `Sustained aggressive / angry facial expression`;
      case 'YAWNING':
        return `Yawning detected (MAR: ${result.mar})`;
      case 'NO_FACE':
        return `Driver face lost or obstructed`;
      default:
        return `Safety violation: ${status}`;
    }
  }

  /**
   * Asynchronous video analysis simulation running on a real 500ms timer
   * @param {Array<Object>} frames 
   * @param {Function} [onProgress] Callback per sample: (progressPercent, currentResult) => {}
   * @returns {Promise<{emotion_timeline: Array, violations: Array, summary: Object}>}
   */
  async analyzeWithTimer(frames, onProgress = null) {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const sampledFrames = [];
      const interval = Math.max(20, Math.floor(this.sampleIntervalMs / 10)); // Scaled speed for tests if needed

      const timer = setInterval(() => {
        if (currentIndex >= frames.length) {
          clearInterval(timer);
          const results = this.analyzeFrames(sampledFrames);
          resolve(results);
          return;
        }

        sampledFrames.push(frames[currentIndex]);
        if (onProgress) {
          const progress = Math.round((currentIndex / frames.length) * 100);
          onProgress(progress, frames[currentIndex]);
        }

        currentIndex += Math.max(1, Math.floor(this.sampleIntervalMs / 33)); // ~15 frames jump at 30fps
      }, interval);
    });
  }
}

export default VideoAnalyzer;

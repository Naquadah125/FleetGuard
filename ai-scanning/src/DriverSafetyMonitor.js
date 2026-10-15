/**
 * DriverSafetyMonitor - Core Computer Vision & Safety Decision Engine
 * Computes EAR, MAR, Head Pose, PERCLOS, and Facial Action Unit Emotions from 468 3D Landmarks.
 */

export class DriverSafetyMonitor {
  /**
   * @param {Object} options Configuration parameters
   * @param {number} [options.earThreshold=0.21] Eye Aspect Ratio threshold (below = closed)
   * @param {number} [options.marThreshold=0.65] Mouth Aspect Ratio threshold (above = yawning)
   * @param {number} [options.perclosThreshold=0.15] PERCLOS threshold for drowsiness warning
   * @param {number} [options.yawThresholdDeg=25.0] Head yaw threshold in degrees
   * @param {number} [options.pitchThresholdDeg=20.0] Head pitch threshold in degrees
   * @param {number} [options.drowsyFramesLimit=45] Consecutive closed frames to trigger DROWSY (~1.5s at 30fps)
   * @param {number} [options.distractFramesLimit=60] Consecutive turned frames to trigger DISTRACTED (~2.0s at 30fps)
   * @param {number} [options.yawnFramesLimit=45] Consecutive yawn frames to trigger YAWNING (~1.5s at 30fps)
   * @param {number} [options.angerBufferFrames=45] Smoothing window size for anger outburst
   * @param {number} [options.angerRatioThreshold=0.65] Ratio of angry frames to trigger ANGRY_OUTBURST
   * @param {number} [options.slidingWindowSeconds=60] PERCLOS time window in seconds
   * @param {number} [options.targetFps=30] Target frame rate
   * @param {Function} [options.onFrameAnalysis] Callback invoked on every processed frame
   * @param {Function} [options.onAlert] Callback invoked when alert_level > 0
   */
  constructor(options = {}) {
    this.config = {
      earThreshold: options.earThreshold ?? 0.21,
      marThreshold: options.marThreshold ?? 0.65,
      perclosThreshold: options.perclosThreshold ?? 0.15,
      yawThresholdDeg: options.yawThresholdDeg ?? 25.0,
      pitchThresholdDeg: options.pitchThresholdDeg ?? 20.0,
      drowsyFramesLimit: options.drowsyFramesLimit ?? 45,
      distractFramesLimit: options.distractFramesLimit ?? 60,
      yawnFramesLimit: options.yawnFramesLimit ?? 45,
      angerBufferFrames: options.angerBufferFrames ?? 45,
      angerRatioThreshold: options.angerRatioThreshold ?? 0.65,
      minAngerFrames: options.minAngerFrames ?? Math.ceil((options.angerBufferFrames ?? 45) * 0.65),
      slidingWindowSeconds: options.slidingWindowSeconds ?? 60,
      targetFps: options.targetFps ?? 30,
      minPerclosFrames: options.minPerclosFrames ?? Math.max(options.drowsyFramesLimit ?? 45, (options.targetFps ?? 30) * 3),
      ...options
    };

    // State counters
    this.consecutiveDrowsyFrames = 0;
    this.consecutiveDistractFrames = 0;
    this.consecutiveYawnFrames = 0;
    this.yawnCount = 0;

    // Sliding window buffer for PERCLOS
    this.maxWindowSize = this.config.slidingWindowSeconds * this.config.targetFps;
    this.closureBuffer = [];

    // Temporal smoothing buffer for emotion classification
    this.emotionHistory = [];

    this.onFrameAnalysis = options.onFrameAnalysis || (() => {});
    this.onAlert = options.onAlert || (() => {});
  }

  /**
   * Reset all internal counters and buffers
   */
  reset() {
    this.consecutiveDrowsyFrames = 0;
    this.consecutiveDistractFrames = 0;
    this.consecutiveYawnFrames = 0;
    this.yawnCount = 0;
    this.closureBuffer = [];
    this.emotionHistory = [];
  }

  /**
   * 3D Euclidean distance calculation between two landmarks
   * @param {Object} p1 {x, y, z}
   * @param {Object} p2 {x, y, z}
   * @returns {number}
   */
  _dist3D(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = (p1.x || 0) - (p2.x || 0);
    const dy = (p1.y || 0) - (p2.y || 0);
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 1. Eye Aspect Ratio (EAR)
   * Left Eye: corners [33, 133], vertical pairs [160, 144], [158, 153]
   * Right Eye: corners [362, 263], vertical pairs [385, 380], [387, 373]
   * @param {Array<Object>} landmarks 468 landmark points
   * @returns {number} Average EAR
   */
  calculateEAR(landmarks) {
    if (!landmarks || landmarks.length < 468) return 0;

    const leftDistH = this._dist3D(landmarks[33], landmarks[133]) || 0.001;
    const leftDistV1 = this._dist3D(landmarks[160], landmarks[144]);
    const leftDistV2 = this._dist3D(landmarks[158], landmarks[153]);
    const leftEar = (leftDistV1 + leftDistV2) / (2.0 * leftDistH);

    const rightDistH = this._dist3D(landmarks[362], landmarks[263]) || 0.001;
    const rightDistV1 = this._dist3D(landmarks[385], landmarks[380]);
    const rightDistV2 = this._dist3D(landmarks[387], landmarks[373]);
    const rightEar = (rightDistV1 + rightDistV2) / (2.0 * rightDistH);

    return (leftEar + rightEar) / 2.0;
  }

  /**
   * 2. Mouth Aspect Ratio (MAR)
   * Lips: vertical [13, 14], [82, 317], [87, 312], horizontal [78, 308]
   * @param {Array<Object>} landmarks 468 landmark points
   * @returns {number} MAR
   */
  calculateMAR(landmarks) {
    if (!landmarks || landmarks.length < 468) return 0;

    const v1 = this._dist3D(landmarks[13], landmarks[14]);
    const v2 = this._dist3D(landmarks[82], landmarks[317]);
    const v3 = this._dist3D(landmarks[87], landmarks[312]);
    const horizontal = this._dist3D(landmarks[78], landmarks[308]) || 0.001;

    return (v1 + v2 + v3) / (2.0 * horizontal);
  }

  /**
   * 3. Head Pose Estimation (Yaw, Pitch, Roll in degrees)
   * Points: Nose [1], Chin [152], Left eye outer [33], Right eye outer [263]
   * @param {Array<Object>} landmarks 468 landmark points
   * @returns {{yaw: number, pitch: number, roll: number}}
   */
  calculateHeadPose(landmarks) {
    if (!landmarks || landmarks.length < 468) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }

    const nose = landmarks[1];
    const chin = landmarks[152];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    const eyeMidX = (leftEye.x + rightEye.x) / 2.0;
    const eyeMidY = (leftEye.y + rightEye.y) / 2.0;
    const eyeSpan = Math.abs(rightEye.x - leftEye.x) || 0.001;

    // Yaw: horizontal head rotation
    const noseOffsetFromMid = nose.x - eyeMidX;
    const yaw = Math.atan2(noseOffsetFromMid, eyeSpan / 2.0) * (180.0 / Math.PI) * 2.6;

    // Pitch: vertical nod / tilt
    const faceHeight = Math.abs(chin.y - eyeMidY) || 0.001;
    const noseDrop = nose.y - eyeMidY;
    const pitch = (noseDrop / faceHeight - 0.35) * 125.0;

    // Roll: lateral head tilt
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180.0 / Math.PI);

    return {
      yaw: parseFloat(yaw.toFixed(2)),
      pitch: parseFloat(pitch.toFixed(2)),
      roll: parseFloat(roll.toFixed(2))
    };
  }

  /**
   * 4. PERCLOS Sliding Window Update
   * Percentage of eye closure over the sliding window
   * @param {boolean} isClosed True if eyes are closed (EAR < earThreshold)
   * @returns {number} PERCLOS value between 0.0 and 1.0
   */
  updatePERCLOS(isClosed) {
    this.closureBuffer.push(isClosed ? 1 : 0);
    if (this.closureBuffer.length > this.maxWindowSize) {
      this.closureBuffer.shift();
    }
    const closedCount = this.closureBuffer.reduce((a, b) => a + b, 0);
    return parseFloat((closedCount / this.closureBuffer.length).toFixed(3));
  }

  /**
   * 5. Facial Action Unit (FAU) Emotion Classification & Temporal Smoothing
   * Uses geometry-based Action Units (AU4, AU12, AU15, AU1/2)
   * @param {Array<Object>} landmarks
   * @param {number} ear
   * @param {number} mar
   * @param {Object} headPose
   * @returns {{dominant: string, confidence: number, isSustainedAnger: boolean, scores: Object}}
   */
  classifyEmotion(landmarks, ear, mar, headPose) {
    if (!landmarks || landmarks.length < 468) {
      return {
        dominant: 'neutral',
        confidence: 0.5,
        isSustainedAnger: false,
        scores: { neutral: 0.5, happy: 0.0, angry: 0.0, sad: 0.0, surprised: 0.0, fatigued: 0.0 }
      };
    }

    const eyeSpan = this._dist3D(landmarks[33], landmarks[263]) || 0.001;

    // Eyebrow distance & furrow (AU4: Corrugator supercilii - Anger/Stress)
    const browDist = this._dist3D(landmarks[55], landmarks[285]);
    const browRatio = browDist / eyeSpan; // Lower when angry/furrowed

    // Lip corner puller (AU12: Zygomaticus major - Happy/Smile)
    const mouthWidth = this._dist3D(landmarks[61], landmarks[291]) / eyeSpan;
    const lipCornersAvgY = (landmarks[61].y + landmarks[291].y) / 2.0;
    const lipCenterY = (landmarks[13].y + landmarks[14].y) / 2.0;
    const smileLift = lipCenterY - lipCornersAvgY;

    // Lip corner depressor (AU15: Sadness)
    const sadDroop = lipCornersAvgY - lipCenterY;

    // Eyebrow elevator (AU1/AU2: Surprise)
    const leftBrowHeight = Math.abs(landmarks[70].y - landmarks[159].y) / eyeSpan;
    const rightBrowHeight = Math.abs(landmarks[300].y - landmarks[386].y) / eyeSpan;
    const avgBrowHeight = (leftBrowHeight + rightBrowHeight) / 2.0;

    const scores = {
      neutral: 0.5,
      happy: 0.0,
      angry: 0.0,
      sad: 0.0,
      surprised: 0.0,
      fatigued: 0.0
    };

    if (smileLift > 0.015 && mouthWidth > 0.42) {
      scores.happy = Math.min(1.0, 0.4 + smileLift * 25.0);
    }
    if (browRatio < 0.28 && !scores.happy) {
      scores.angry = Math.min(1.0, (0.28 - browRatio) * 18.0 + 0.35);
    }
    if (sadDroop > 0.02 && mouthWidth < 0.38) {
      scores.sad = Math.min(1.0, sadDroop * 20.0 + 0.3);
    }
    if (avgBrowHeight > 0.22 && mar > 0.45) {
      scores.surprised = Math.min(1.0, avgBrowHeight * 3.5);
    }
    if (mar > this.config.marThreshold || ear < this.config.earThreshold) {
      scores.fatigued = 0.85;
    }

    // Find instantaneous dominant emotion
    let dominant = 'neutral';
    let maxScore = scores.neutral;

    for (const [emo, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = emo;
      }
    }

    // Temporal smoothing buffer for sustained anger
    this.emotionHistory.push(dominant);
    if (this.emotionHistory.length > this.config.angerBufferFrames) {
      this.emotionHistory.shift();
    }

    const angryCount = this.emotionHistory.filter(e => e === 'angry').length;
    const isSustainedAnger =
      this.emotionHistory.length >= this.config.minAngerFrames &&
      (angryCount / this.emotionHistory.length) >= this.config.angerRatioThreshold;

    return {
      dominant: isSustainedAnger ? 'angry' : dominant,
      confidence: parseFloat(maxScore.toFixed(2)),
      isSustainedAnger,
      scores: {
        neutral: parseFloat(scores.neutral.toFixed(2)),
        happy: parseFloat(scores.happy.toFixed(2)),
        angry: parseFloat(scores.angry.toFixed(2)),
        sad: parseFloat(scores.sad.toFixed(2)),
        surprised: parseFloat(scores.surprised.toFixed(2)),
        fatigued: parseFloat(scores.fatigued.toFixed(2))
      }
    };
  }

  /**
   * Process a single frame with 468 landmarks
   * State Machine & Safety Decision Engine
   * @param {Array<Object>|null} landmarks 468 facial landmark coordinates
   * @param {number} [timestampOverride] Optional timestamp for offline analysis
   * @returns {Object} Telemetry payload
   */
  processLandmarks(landmarks, timestampOverride = null) {
    const timestamp = timestampOverride ?? Date.now();

    if (!landmarks || landmarks.length < 468) {
      const payload = {
        ear: 0,
        mar: 0,
        perclos: 0,
        head_pose: { yaw: 0, pitch: 0, roll: 0 },
        emotion: 'neutral',
        emotion_confidence: 0,
        emotion_scores: { neutral: 0.5, happy: 0, angry: 0, sad: 0, surprised: 0, fatigued: 0 },
        status: 'NO_FACE',
        alert_level: 1,
        message: 'No driver face detected',
        yawn_count: this.yawnCount,
        timestamp
      };

      this.onFrameAnalysis(payload);
      this.onAlert(payload);
      return payload;
    }

    const ear = parseFloat(this.calculateEAR(landmarks).toFixed(3));
    const mar = parseFloat(this.calculateMAR(landmarks).toFixed(3));
    const headPose = this.calculateHeadPose(landmarks);
    const isEyeClosed = ear < this.config.earThreshold;
    const perclos = this.updatePERCLOS(isEyeClosed);
    const emotionData = this.classifyEmotion(landmarks, ear, mar, headPose);

    // Micro-sleep detection
    if (isEyeClosed) {
      this.consecutiveDrowsyFrames++;
    } else {
      this.consecutiveDrowsyFrames = Math.max(0, this.consecutiveDrowsyFrames - 2);
    }

    // Yawn detection
    if (mar > this.config.marThreshold) {
      this.consecutiveYawnFrames++;
      if (this.consecutiveYawnFrames === this.config.yawnFramesLimit) {
        this.yawnCount++;
      }
    } else {
      this.consecutiveYawnFrames = 0;
    }

    // Distraction detection (Yaw or Pitch beyond thresholds)
    const isDistracted =
      Math.abs(headPose.yaw) > this.config.yawThresholdDeg ||
      Math.abs(headPose.pitch) > this.config.pitchThresholdDeg;

    if (isDistracted) {
      this.consecutiveDistractFrames++;
    } else {
      this.consecutiveDistractFrames = Math.max(0, this.consecutiveDistractFrames - 2);
    }

    // State machine & Alert levels (0: Normal, 1: Warning, 2: Danger)
    let status = 'NORMAL';
    let alert_level = 0;

    const isPerclosDrowsy =
      this.closureBuffer.length >= this.config.minPerclosFrames &&
      perclos >= this.config.perclosThreshold;

    if (this.consecutiveDrowsyFrames >= this.config.drowsyFramesLimit || isPerclosDrowsy) {
      status = 'DROWSY';
      alert_level = 2;
    } else if (this.consecutiveDistractFrames >= this.config.distractFramesLimit) {
      status = 'DISTRACTED';
      alert_level = 2;
    } else if (emotionData.isSustainedAnger) {
      status = 'ANGRY_OUTBURST';
      alert_level = 2;
    } else if (this.consecutiveYawnFrames >= this.config.yawnFramesLimit) {
      status = 'YAWNING';
      alert_level = 1;
    }

    const payload = {
      ear,
      mar,
      perclos,
      head_pose: headPose,
      emotion: emotionData.dominant,
      emotion_confidence: emotionData.confidence,
      emotion_scores: emotionData.scores,
      status,
      alert_level,
      yawn_count: this.yawnCount,
      timestamp
    };

    this.onFrameAnalysis(payload);

    if (alert_level > 0) {
      this.onAlert(payload);
    }

    return payload;
  }
}

export default DriverSafetyMonitor;

import { EmotionLog } from '../models/EmotionLog.js';
import { VideoAnalysis } from '../models/VideoAnalysis.js';
import { DrivingSession } from '../models/DrivingSession.js';
import { getIsMongoConnected, memoryStore } from '../db.js';
import { ChatService } from '../../../ai-chatbot/src/chatService.js';
import { ChatConversation } from '../models/ChatConversation.js';
import { detectAdminIntent, requestedPeriodDays, resolveAdminAnalytics } from '../services/adminAnalyticsService.js';

async function saveChatMessage({ userId, sessionId, role, message, structuredData = null }) {
  const record = { user_id: userId, session_id: sessionId, role, message, structured_data: structuredData };
  if (getIsMongoConnected()) return ChatConversation.create(record);
  memoryStore.chatConversations.push({ ...record, timestamp: new Date() });
  return record;
}

/**
 * GET /api/analytics/emotions
 * Aggregation endpoint for emotions, attention metrics, and alert counts
 */
export async function getEmotionAnalytics(req, res) {
  try {
    const { driver_id, session_id, start_date, end_date } = req.query;

    const filter = {};
    if (driver_id) filter.driver_id = driver_id;
    if (session_id) filter.session_id = session_id;

    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) filter.timestamp.$gte = new Date(start_date);
      if (end_date) filter.timestamp.$lte = new Date(end_date);
    }

    if (getIsMongoConnected()) {
      // MongoDB Aggregation Pipeline
      const pipeline = [
        { $match: filter },
        {
          $facet: {
            overall_stats: [
              {
                $group: {
                  _id: null,
                  total_records: { $sum: 1 },
                  avg_ear: { $avg: '$ear' },
                  avg_mar: { $avg: '$mar' },
                  avg_perclos: { $avg: '$perclos' },
                  critical_alerts: {
                    $sum: { $cond: [{ $eq: ['$alert_level', 2] }, 1, 0] }
                  },
                  warning_alerts: {
                    $sum: { $cond: [{ $eq: ['$alert_level', 1] }, 1, 0] }
                  }
                }
              }
            ],
            emotion_breakdown: [
              {
                $group: {
                  _id: '$dominant_emotion',
                  count: { $sum: 1 }
                }
              }
            ],
            status_breakdown: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ];

      const [aggResult] = await EmotionLog.aggregate(pipeline);
      const overall = aggResult.overall_stats[0] || {
        total_records: 0,
        avg_ear: 0,
        avg_mar: 0,
        avg_perclos: 0,
        critical_alerts: 0,
        warning_alerts: 0
      };

      const total = overall.total_records || 0;
      const emotionDistribution = {};
      for (const item of aggResult.emotion_breakdown) {
        emotionDistribution[item._id] = {
          count: item.count,
          percentage: total > 0 ? parseFloat(((item.count / total) * 100).toFixed(1)) : 0
        };
      }

      const statusCounts = {};
      for (const item of aggResult.status_breakdown) {
        statusCounts[item._id] = item.count;
      }

      const normalCount = statusCounts.NORMAL || 0;
      const distractedCount = statusCounts.DISTRACTED || 0;
      const drowsyCount = statusCounts.DROWSY || 0;

      return res.json({
        success: true,
        filter: { driver_id: driver_id || 'ALL', session_id: session_id || 'ALL' },
        metrics: {
          total_records: total,
          avg_ear: parseFloat((overall.avg_ear || 0).toFixed(3)),
          avg_mar: parseFloat((overall.avg_mar || 0).toFixed(3)),
          avg_perclos: parseFloat((overall.avg_perclos || 0).toFixed(3)),
          critical_alerts: overall.critical_alerts || 0,
          warning_alerts: overall.warning_alerts || 0,
          focus_ratio: total > 0 ? parseFloat(((normalCount / total) * 100).toFixed(1)) : 100,
          distracted_ratio: total > 0 ? parseFloat(((distractedCount / total) * 100).toFixed(1)) : 0,
          drowsy_ratio: total > 0 ? parseFloat(((drowsyCount / total) * 100).toFixed(1)) : 0
        },
        emotion_distribution: emotionDistribution,
        status_counts: statusCounts
      });
    } else {
      // Memory Store Aggregation Fallback
      let logs = [...memoryStore.emotionLogs];
      if (driver_id) logs = logs.filter(l => l.driver_id === driver_id);
      if (session_id) logs = logs.filter(l => l.session_id === session_id);
      if (start_date) logs = logs.filter(l => new Date(l.timestamp) >= new Date(start_date));
      if (end_date) logs = logs.filter(l => new Date(l.timestamp) <= new Date(end_date));

      const total = logs.length;
      let sumEar = 0, sumMar = 0, sumPerclos = 0;
      let criticalAlerts = 0, warningAlerts = 0;
      const emotionCounts = {};
      const statusCounts = {};

      for (const log of logs) {
        sumEar += log.ear || 0;
        sumMar += log.mar || 0;
        sumPerclos += log.perclos || 0;
        if (log.alert_level === 2) criticalAlerts++;
        if (log.alert_level === 1) warningAlerts++;

        const emo = log.dominant_emotion || 'neutral';
        emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;

        const st = log.status || 'NORMAL';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      }

      const emotionDistribution = {};
      for (const [emo, count] of Object.entries(emotionCounts)) {
        emotionDistribution[emo] = {
          count,
          percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0
        };
      }

      const normalCount = statusCounts.NORMAL || 0;
      const distractedCount = statusCounts.DISTRACTED || 0;
      const drowsyCount = statusCounts.DROWSY || 0;

      return res.json({
        success: true,
        filter: { driver_id: driver_id || 'ALL', session_id: session_id || 'ALL' },
        metrics: {
          total_records: total,
          avg_ear: total > 0 ? parseFloat((sumEar / total).toFixed(3)) : 0,
          avg_mar: total > 0 ? parseFloat((sumMar / total).toFixed(3)) : 0,
          avg_perclos: total > 0 ? parseFloat((sumPerclos / total).toFixed(3)) : 0,
          critical_alerts: criticalAlerts,
          warning_alerts: warningAlerts,
          focus_ratio: total > 0 ? parseFloat(((normalCount / total) * 100).toFixed(1)) : 100,
          distracted_ratio: total > 0 ? parseFloat(((distractedCount / total) * 100).toFixed(1)) : 0,
          drowsy_ratio: total > 0 ? parseFloat(((drowsyCount / total) * 100).toFixed(1)) : 0
        },
        emotion_distribution: emotionDistribution,
        status_counts: statusCounts
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/videos/analysis/:id
 * Fetch offline video analysis report with emotion timeline and violation markers
 */
export async function getVideoAnalysis(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id?.toString();
    const isScopedUser = req.user.role === 'DRIVER' || req.user.role === 'USER';

    let analysis = null;
    if (getIsMongoConnected()) {
      const filter = isScopedUser ? { _id: id, driver_id: userId } : { _id: id };
      analysis = await VideoAnalysis.findOne(filter);
    } else {
      analysis = memoryStore.videoAnalyses.get(id);
      if (isScopedUser && analysis?.driver_id !== userId) analysis = null;
    }

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Video analysis report not found' });
    }

    return res.json({
      success: true,
      analysis
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/videos/analysis
 * Save offline video analysis report
 */
export async function saveVideoAnalysis(req, res) {
  try {
    const payload = req.body;
    if (!payload || !payload.video_name) {
      return res.status(400).json({ success: false, message: 'video_name is required' });
    }

    let saved = null;
    if (getIsMongoConnected()) {
      saved = await VideoAnalysis.create(payload);
    } else {
      const id = 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      saved = {
        _id: id,
        id,
        ...payload,
        created_at: new Date()
      };
      memoryStore.videoAnalyses.set(id, saved);
    }

    return res.status(201).json({
      success: true,
      id: saved._id || saved.id,
      analysis: saved
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/analytics/fleet-overview
 */
export async function getFleetOverview(req, res) {
  try {
    let totalLogs = 0;
    let criticalAlertsCount = 0;

    if (getIsMongoConnected()) {
      totalLogs = await EmotionLog.countDocuments();
      criticalAlertsCount = await EmotionLog.countDocuments({ alert_level: 2 });
    } else {
      totalLogs = memoryStore.emotionLogs.length;
      criticalAlertsCount = memoryStore.emotionLogs.filter(l => l.alert_level === 2).length;
    }

    return res.json({
      success: true,
      overview: {
        total_telemetry_logs: totalLogs,
        critical_alerts_total: criticalAlertsCount,
        active_vehicles: 4,
        system_status: 'OPERATIONAL'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/analytics/sessions
 * Save or auto-save a completed camera driving session
 */
export async function saveDrivingSession(req, res) {
  try {
    const payload = req.body;
    if (!payload || !payload.session_id) {
      return res.status(400).json({ success: false, message: 'session_id is required' });
    }

    let saved = null;
    if (getIsMongoConnected()) {
      saved = await DrivingSession.findOneAndUpdate(
        { session_id: payload.session_id },
        { ...payload, end_time: payload.end_time || new Date() },
        { upsert: true, new: true }
      );
    } else {
      saved = {
        _id: payload.session_id,
        id: payload.session_id,
        ...payload,
        end_time: payload.end_time || new Date()
      };
      memoryStore.sessions.set(payload.session_id, saved);
    }

    return res.status(201).json({
      success: true,
      message: 'Phiên quét an toàn đã được lưu thành công',
      session: saved
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/analytics/sessions
 * Fetch driving/camera sessions for a specific user
 */
export async function getDrivingSessions(req, res) {
  try {
    const { user_id, user_email, limit = 50 } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (user_email) filter.user_email = user_email;

    let sessions = [];
    if (getIsMongoConnected()) {
      sessions = await DrivingSession.find(filter)
        .sort({ start_time: -1 })
        .limit(parseInt(limit, 10));
    } else {
      sessions = Array.from(memoryStore.sessions.values());
      if (user_id) {
        sessions = sessions.filter(s => s.user_id === user_id);
      }
      if (user_email) {
        sessions = sessions.filter(s => s.user_email === user_email);
      }
      sessions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
      sessions = sessions.slice(0, parseInt(limit, 10));
    }

    return res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/analytics/chatbot
 * AI Safety Advisor query handler analyzing driver's drowsiness and trip patterns
 */
export async function chatWithSafetyAdvisor(req, res) {
  try {
    const { message, session_id } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
    }

    const user = req.user;
    const chatSessionId = session_id || `chat_${Date.now()}`;
    const userId = user.id || user._id?.toString();
    const previousMessages = getIsMongoConnected()
      ? await ChatConversation.find({ user_id: userId, session_id: chatSessionId })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean()
      : memoryStore.chatConversations
        .filter((item) => item.user_id === userId && item.session_id === chatSessionId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);

    await saveChatMessage({ userId, sessionId: chatSessionId, role: 'user', message });
    const isAdmin = ['ADMIN', 'FLEET_ADMIN'].includes(user.role);
    if (isAdmin) {
      const structuredData = await resolveAdminAnalytics({
        organizationId: user.organizationId,
        intent: detectAdminIntent(message),
        requestedDays: requestedPeriodDays(message),
      });
      const interpreter = new ChatService({
        allowedRoles: ['ADMIN', 'FLEET_ADMIN'],
      });
      const interpretation = await interpreter.interpretAdminResult(message, user, structuredData);
      const reply = structuredData.type === 'no_data_guidance' ? structuredData.reply : interpretation.reply;
      await saveChatMessage({
        userId,
        sessionId: chatSessionId,
        role: 'model',
        message: reply,
        structuredData
      });
      return res.json({
        success: true,
        session_id: chatSessionId,
        reply,
        structuredData,
        toolsUsed: ['resolve_admin_analytics'],
        modelStatus: interpretation.modelStatus,
        timestamp: new Date().toISOString()
      });
    }

    const service = new ChatService({
      requireGemini: false,
      allowedRoles: ['DRIVER', 'USER', 'FLEET_ADMIN'],
      driverId: user.role === 'DRIVER' || user.role === 'USER'
        ? (user.id || user._id?.toString())
        : undefined
    });
    const result = await service.sendMessage(
      message,
      user,
      previousMessages.reverse().map((item) => ({ role: item.role, message: item.message })),
      {
      authToken: req.headers.authorization?.replace('Bearer ', '')
      }
    );
    await saveChatMessage({
      userId,
      sessionId: chatSessionId,
      role: 'model',
      message: result.reply,
      structuredData: result.structuredData
    });

    return res.json({
      success: true,
      session_id: chatSessionId,
      reply: result.reply,
      structuredData: result.structuredData,
      toolsUsed: result.toolsUsed,
      modelStatus: result.modelStatus,
      model: service.model,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, message: err.message, code: err.code });
    }
    console.error('[Admin chatbot error]:', err);
    return res.status(500).json({ success: false, message: 'Không thể hoàn tất phân tích lúc này. Vui lòng thử lại.' });
  }
}

export async function getChatSession(req, res) {
  try {
    const userId = req.user.id || req.user._id?.toString();
    const { session_id } = req.params;
    const messages = getIsMongoConnected()
      ? await ChatConversation.find({ user_id: userId, session_id }).sort({ timestamp: 1 }).lean()
      : memoryStore.chatConversations
        .filter((item) => item.user_id === userId && item.session_id === session_id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.json({ success: true, session_id, messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  getEmotionAnalytics,
  getVideoAnalysis,
  saveVideoAnalysis,
  getFleetOverview,
  saveDrivingSession,
  getDrivingSessions,
  chatWithSafetyAdvisor,
  getChatSession
};

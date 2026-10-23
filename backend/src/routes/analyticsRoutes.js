import express from 'express';
import {
  getEmotionAnalytics,
  getVideoAnalysis,
  saveVideoAnalysis,
  getFleetOverview,
  saveDrivingSession,
  getDrivingSessions,
  chatWithSafetyAdvisor,
  getChatSession
} from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/analytics/emotions
router.get('/emotions', getEmotionAnalytics);

// GET /api/analytics/fleet-overview
router.get('/fleet-overview', getFleetOverview);

// Driving Sessions endpoints
router.get('/sessions', getDrivingSessions);
router.post('/sessions', saveDrivingSession);

// Chatbot AI Safety Advisor
router.post('/chatbot', requireAuth, chatWithSafetyAdvisor);
router.get('/chatbot/sessions/:session_id', requireAuth, getChatSession);

// Video Analysis endpoints
router.get('/videos/:id', requireAuth, getVideoAnalysis);
router.post('/videos', saveVideoAnalysis);

export default router;

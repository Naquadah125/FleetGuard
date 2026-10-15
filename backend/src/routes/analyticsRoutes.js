import express from 'express';
import {
  getEmotionAnalytics,
  getVideoAnalysis,
  saveVideoAnalysis,
  getFleetOverview,
  saveDrivingSession,
  getDrivingSessions,
  chatWithSafetyAdvisor
} from '../controllers/analyticsController.js';

const router = express.Router();

// GET /api/analytics/emotions
router.get('/emotions', getEmotionAnalytics);

// GET /api/analytics/fleet-overview
router.get('/fleet-overview', getFleetOverview);

// Driving Sessions endpoints
router.get('/sessions', getDrivingSessions);
router.post('/sessions', saveDrivingSession);

// Chatbot AI Safety Advisor
router.post('/chatbot', chatWithSafetyAdvisor);

// Video Analysis endpoints
router.get('/videos/:id', getVideoAnalysis);
router.post('/videos', saveVideoAnalysis);

export default router;

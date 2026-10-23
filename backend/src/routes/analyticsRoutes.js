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
import { resolveAdminTrips } from '../services/adminTripService.js';

const router = express.Router();
const requireAdmin = (req, res, next) => {
  if (!['ADMIN', 'FLEET_ADMIN'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  return next();
};

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
router.get('/admin/trips', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await resolveAdminTrips({
      organizationId: req.user.organizationId,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      driverId: req.query.driver_id,
      driverSearch: req.query.driver_search,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Admin trips error]:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải lịch sử chuyến đi.' });
  }
});

// Video Analysis endpoints
router.get('/videos/:id', requireAuth, getVideoAnalysis);
router.post('/videos', saveVideoAnalysis);

export default router;

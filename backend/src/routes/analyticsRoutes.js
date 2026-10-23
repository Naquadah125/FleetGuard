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
import { listAuditEvents, recordAuditEvent } from '../services/auditLogService.js';

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

router.get('/admin/audit-log', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await listAuditEvents({
      organizationId: req.user.organizationId,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      action: req.query.action,
      actorId: req.query.actor_id,
      resourceType: req.query.resource_type,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Admin audit log error]:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải audit log.' });
  }
});

router.post('/admin/audit-log', requireAuth, requireAdmin, async (req, res) => {
  const { action, resourceType, resourceId, description, metadata } = req.body || {};
  if (!action || !resourceType) {
    return res.status(400).json({ success: false, message: 'action and resourceType are required' });
  }
  await recordAuditEvent({
    actor: req.user,
    action,
    resourceType,
    resourceId,
    description,
    metadata,
  });
  return res.status(201).json({ success: true });
});

// Video Analysis endpoints
router.get('/videos/:id', requireAuth, getVideoAnalysis);
router.post('/videos', saveVideoAnalysis);

export default router;

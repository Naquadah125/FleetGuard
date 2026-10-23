import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: { type: String, required: true, index: true },
  actorName: { type: String, default: '' },
  actorEmail: { type: String, default: '' },
  organizationId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId: { type: String, default: null },
  description: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
});

auditLogSchema.index({ organizationId: 1, timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;

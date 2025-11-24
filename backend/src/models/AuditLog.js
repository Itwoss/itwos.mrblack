const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actorRole: {
    type: String,
    enum: ['moderator', 'admin', 'super_admin'],
    required: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  target: {
    type: {
      type: String,
      enum: ['post', 'user', 'system'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  beforeState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  afterState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  reason: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // For time-based queries

module.exports = mongoose.model('AuditLog', auditLogSchema);


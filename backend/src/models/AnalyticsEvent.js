const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'page_view',
      'page_stay_time',
      'call_start',
      'call_end',
      'video_play',
      'video_pause',
      'video_complete',
      'video_seek',
      'chat_message_sent',
      'chat_room_entered',
      'chat_room_left'
    ],
    index: true
  },
  path: {
    type: String,
    required: false,
    default: '/unknown',
    index: true
  },
  screen: {
    type: String,
    index: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  relatedId: {
    type: String,
    index: true,
    default: null
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    default: null
  },
  duration: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  deviceInfo: {
    browser: String,
    os: String,
    deviceType: String,
    userAgent: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
analyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ path: 1, timestamp: -1 });
analyticsEventSchema.index({ relatedId: 1, eventType: 1 });
analyticsEventSchema.index({ timestamp: -1 });

// TTL index to auto-delete events older than 1 year (optional, uncomment if needed)
// analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

module.exports = AnalyticsEvent;


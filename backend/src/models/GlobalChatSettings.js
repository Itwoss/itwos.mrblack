const mongoose = require('mongoose');

const globalChatSettingsSchema = new mongoose.Schema({
  slowModeSeconds: {
    type: Number,
    default: 30,
    min: 0,
    max: 300
  },
  maxMessageLength: {
    type: Number,
    default: 500,
    min: 50,
    max: 2000
  },
  allowReactions: {
    type: Boolean,
    default: true
  },
  allowReplies: {
    type: Boolean,
    default: true
  },
  allowMentions: {
    type: Boolean,
    default: true
  },
  maxDuplicateCheck: {
    type: Number,
    default: 2,
    min: 1,
    max: 10
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Singleton pattern - only one settings document
globalChatSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('GlobalChatSettings', globalChatSettingsSchema);










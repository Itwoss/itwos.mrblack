const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: 'ITWOS AI Platform'
  },
  siteDescription: {
    type: String,
    default: 'A comprehensive full-stack platform'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  chatEnabled: {
    type: Boolean,
    default: true
  },
  maxFileSize: {
    type: Number,
    default: 10 // MB
  },
  allowedFileTypes: {
    type: [String],
    default: ['jpg', 'png', 'pdf', 'doc']
  },
  emailSettings: {
    smtpHost: {
      type: String,
      default: ''
    },
    smtpPort: {
      type: Number,
      default: 587
    },
    smtpUser: {
      type: String,
      default: ''
    },
    smtpPassword: {
      type: String,
      default: ''
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Singleton pattern - only one settings document
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);


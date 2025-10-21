const mongoose = require('mongoose')

const PrebookRequestSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  projectType: {
    type: String,
    required: true,
    enum: ['website', 'web-app', 'mobile-app', 'ecommerce', 'landing-page', 'other']
  },
  budget: {
    type: String,
    required: true,
    enum: ['under-5k', '5k-10k', '10k-25k', '25k-50k', '50k-100k', '100k-plus']
  },
  timeline: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  features: [{
    type: String,
    enum: ['responsive-design', 'seo-optimization', 'user-authentication', 'payment-integration', 'admin-dashboard', 'mobile-app']
  }],
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  contactInfo: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: ''
    },
    company: {
      type: String,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  estimatedPrice: {
    type: Number,
    default: null
  },
  estimatedTimeline: {
    type: Number,
    default: null
  },
  adminNotes: {
    type: String,
    default: null
  },
  paymentId: {
    type: String,
    default: null
  },
  paymentOrderId: {
    type: String,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: null
  },
  paymentAmount: {
    type: Number,
    default: null
  },
  paymentDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Index for better performance
PrebookRequestSchema.index({ productId: 1 })
PrebookRequestSchema.index({ userId: 1 })
PrebookRequestSchema.index({ status: 1 })
PrebookRequestSchema.index({ createdAt: -1 })

// Virtual for budget display
PrebookRequestSchema.virtual('budgetDisplay').get(function() {
  const budgetMap = {
    'under-5k': 'Under $5,000',
    '5k-10k': '$5,000 - $10,000',
    '10k-25k': '$10,000 - $25,000',
    '25k-50k': '$25,000 - $50,000',
    '50k-100k': '$50,000 - $100,000',
    '100k-plus': '$100,000+'
  }
  return budgetMap[this.budget] || this.budget
})

// Virtual for project type display
PrebookRequestSchema.virtual('projectTypeDisplay').get(function() {
  const typeMap = {
    'website': 'Website',
    'web-app': 'Web Application',
    'mobile-app': 'Mobile App',
    'ecommerce': 'E-commerce',
    'landing-page': 'Landing Page',
    'other': 'Other'
  }
  return typeMap[this.projectType] || this.projectType
})

module.exports = mongoose.model('PrebookRequest', PrebookRequestSchema)






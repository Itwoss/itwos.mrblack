const mongoose = require('mongoose')

const preBookingSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  projectRequirements: {
    websiteType: {
      type: String,
      required: true,
      enum: ['E-commerce', 'Portfolio', 'Blog', 'Corporate', 'Custom']
    },
    customWebsiteType: {
      type: String,
      trim: true
    },
    requirements: {
      type: String,
      required: true,
      maxlength: 1000
    },
    features: [{
      type: String,
      enum: ['User Auth', 'Payment Gateway', 'Blog', 'Admin Panel', 'API Integration', 'SEO Optimization', 'Mobile Responsive', 'E-commerce', 'CMS', 'Analytics']
    }],
    additionalFeatures: {
      type: String,
      maxlength: 500
    },
    budgetRange: {
      type: String,
      required: true,
      enum: ['$500-$1000', '$1000-$2500', '$2500-$5000', '$5000+', 'Custom']
    },
    customBudget: {
      type: Number,
      min: 0
    },
    timeline: {
      type: String,
      required: true,
      enum: ['1-2 weeks', '2-4 weeks', '1-2 months', '2-3 months', 'Flexible']
    },
    startDate: {
      type: Date
    },
    designPreferences: {
      referenceImages: [String],
      colorScheme: {
        primary: String,
        secondary: String,
        accent: String
      },
      style: {
        type: String,
        enum: ['Modern', 'Classic', 'Minimal', 'Bold', 'Creative']
      },
      additionalNotes: {
        type: String,
        maxlength: 1000
      }
    }
  },
  contactInfo: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: true
    },
    preferredContactMethod: {
      type: String,
      enum: ['Email', 'Phone', 'WhatsApp'],
      default: 'Email'
    },
    bestTimeToContact: [{
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening']
    }]
  },
  terms: {
    agreedToTerms: {
      type: Boolean,
      required: true,
      validate: {
        validator: function(v) {
          return v === true
        },
        message: 'You must agree to the terms and conditions'
      }
    },
    sendUpdates: {
      type: Boolean,
      default: true
    }
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  estimatedCost: {
    type: Number,
    min: 0
  },
  actualCost: {
    type: Number,
    min: 0
  },
  startDate: {
    type: Date
  },
  expectedCompletionDate: {
    type: Date
  },
  actualCompletionDate: {
    type: Date
  },
  milestones: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedDate: Date
  }],
  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'meeting', 'note'],
      required: true
    },
    subject: String,
    message: {
      type: String,
      required: true
    },
    from: {
      type: String,
      required: true
    },
    to: String,
    date: {
      type: Date,
      default: Date.now
    },
    attachments: [String]
  }]
}, {
  timestamps: true
})

// Indexes for better performance
preBookingSchema.index({ product: 1, user: 1 })
preBookingSchema.index({ status: 1 })
preBookingSchema.index({ createdAt: -1 })
preBookingSchema.index({ 'contactInfo.email': 1 })

// Virtual for project duration in days
preBookingSchema.virtual('projectDurationDays').get(function() {
  if (this.startDate && this.expectedCompletionDate) {
    return Math.ceil((this.expectedCompletionDate - this.startDate) / (1000 * 60 * 60 * 24))
  }
  return null
})

// Method to update status
preBookingSchema.methods.updateStatus = function(newStatus, adminNotes = '') {
  this.status = newStatus
  if (adminNotes) {
    this.adminNotes = adminNotes
  }
  return this.save()
}

// Method to add communication
preBookingSchema.methods.addCommunication = function(type, subject, message, from, to = null, attachments = []) {
  const communication = {
    type,
    subject,
    message,
    from,
    to,
    date: new Date(),
    attachments
  }
  
  this.communications.push(communication)
  return this.save()
}

// Method to add milestone
preBookingSchema.methods.addMilestone = function(title, description, dueDate) {
  const milestone = {
    title,
    description,
    dueDate,
    completed: false
  }
  
  this.milestones.push(milestone)
  return this.save()
}

// Method to complete milestone
preBookingSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.milestones.id(milestoneId)
  if (milestone) {
    milestone.completed = true
    milestone.completedDate = new Date()
    return this.save()
  }
  throw new Error('Milestone not found')
}

// Static method to get statistics
preBookingSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ])
  
  const result = {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0
  }
  
  stats.forEach(stat => {
    result[stat._id] = stat.count
    result.total += stat.count
  })
  
  return result
}

module.exports = mongoose.model('PreBooking', preBookingSchema)














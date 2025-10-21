const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  websiteUrl: {
    type: String,
    required: true
  },
  websiteTitle: {
    type: String,
    default: ''
  },
  websiteLink: {
    type: String,
    default: ''
  },
  thumbnailUrl: {
    type: String,
    default: ''
  },
  screenshots: [{
    type: String
  }],
  descriptionAuto: {
    type: String,
    default: ''
  },
  descriptionManual: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: function() {
      return this.status === 'published'
    },
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  trending: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  categories: [{
    type: String,
    trim: true
  }],
  developerName: {
    type: String,
    required: function() {
      return this.status === 'published'
    },
    default: 'TBD'
  },
  techStack: [{
    type: String,
    trim: true
  }],
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  visitsLast30Days: [{
    date: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String,
    referrer: String
  }],
  previewSaved: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  meta: {
    title: String,
    description: String,
    keywords: [String]
  }
}, {
  timestamps: true
})

// Virtual for description (manual takes precedence over auto)
ProductSchema.virtual('description').get(function() {
  return this.descriptionManual || this.descriptionAuto
})

// Virtual for average rating
ProductSchema.virtual('averageRating').get(function() {
  if (this.reviews.length === 0) return 0
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0)
  return sum / this.reviews.length
})

// Virtual for total visits
ProductSchema.virtual('totalVisits').get(function() {
  return this.visitsLast30Days.length
})

// Virtual for reviews count
ProductSchema.virtual('reviewsCount').get(function() {
  return this.reviews.length
})

// Method to get public data for API responses
ProductSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    title: this.title,
    slug: this.slug,
    websiteUrl: this.websiteUrl,
    websiteTitle: this.websiteTitle,
    websiteLink: this.websiteLink,
    thumbnailUrl: this.thumbnailUrl,
    screenshots: this.screenshots,
    description: this.description,
    descriptionAuto: this.descriptionAuto,
    descriptionManual: this.descriptionManual,
    price: this.price,
    currency: this.currency,
    trending: this.trending,
    tags: this.tags,
    categories: this.categories,
    developerName: this.developerName,
    techStack: this.techStack,
    averageRating: this.averageRating,
    reviewsCount: this.reviewsCount,
    totalVisits: this.totalVisits,
    previewSaved: this.previewSaved,
    status: this.status,
    meta: this.meta,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  }
}

// Index for better performance
ProductSchema.index({ slug: 1 })
ProductSchema.index({ status: 1 })
ProductSchema.index({ trending: 1 })
ProductSchema.index({ tags: 1 })
ProductSchema.index({ categories: 1 })
ProductSchema.index({ createdAt: -1 })

// Static method to find products for user
ProductSchema.statics.findForUser = function(filters = {}) {
  const query = { status: 'published' }
  
  if (filters.trending) {
    query.trending = true
  }
  
  if (filters.category) {
    query.categories = { $in: [filters.category] }
  }
  
  if (filters.tag) {
    query.tags = { $in: [filters.tag] }
  }
  
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { descriptionAuto: { $regex: filters.search, $options: 'i' } },
      { descriptionManual: { $regex: filters.search, $options: 'i' } },
      { tags: { $in: [new RegExp(filters.search, 'i')] } }
    ]
  }
  
  return this.find(query)
    .sort(filters.trending ? { trending: -1, createdAt: -1 } : { createdAt: -1 })
    .limit(filters.limit || 20)
    .skip(filters.skip || 0)
}

module.exports = mongoose.model('Product', ProductSchema)


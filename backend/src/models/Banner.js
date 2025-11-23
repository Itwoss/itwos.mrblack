const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  rarity: {
    type: String,
    enum: ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'],
    default: 'Common'
  },
  effect: {
    type: String,
    enum: ['none', 'glow', 'fire', 'neon', 'ice', 'thunder', 'sparkle', 'animated'],
    default: 'none'
  },
  effectColor: {
    type: String,
    default: '#FFD700' // Gold color for glow effects
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['Fire', 'Ice', 'Thunder', 'Diamond', 'Season', 'Special', 'Default'],
    default: 'Default'
  },
  season: {
    type: String,
    trim: true
  },
  stock: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
bannerSchema.index({ isActive: 1, rarity: 1 });
bannerSchema.index({ price: 1 });

// Method to get public banner data
bannerSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    name: this.name,
    description: this.description,
    imageUrl: this.imageUrl,
    price: this.price,
    rarity: this.rarity,
    effect: this.effect,
    effectColor: this.effectColor,
    category: this.category,
    season: this.season,
    stock: this.stock,
    purchaseCount: this.purchaseCount,
    createdAt: this.createdAt
  };
};

// Static method to get active banners
bannerSchema.statics.getActiveBanners = function() {
  return this.find({ isActive: true }).sort({ rarity: -1, createdAt: -1 });
};

module.exports = mongoose.model('Banner', bannerSchema);


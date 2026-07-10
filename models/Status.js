const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text','image','video'], default: 'text' },
  content: { type: String, default: '' },
  backgroundColor: { type: String, default: '#2E6BFF' },
  media: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  caption: { type: String, default: '' },
  privacy: { type: String, default: 'contacts' },
  viewers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
}, { timestamps: true });

StatusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Status', StatusSchema);

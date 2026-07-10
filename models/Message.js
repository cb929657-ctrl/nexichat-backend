const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['text','image','video','audio','document','location','contact','sticker','gif'],
    default: 'text'
  },
  content: { type: String, default: '' },
  media: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' }
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    name: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  disappearsAt: { type: Date, default: null },
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }
}, { timestamps: true });

MessageSchema.index({ disappearsAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', MessageSchema);

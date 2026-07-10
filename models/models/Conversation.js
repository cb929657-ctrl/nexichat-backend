const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['private','group'], default: 'private' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  disappearingMessages: {
    enabled: { type: Boolean, default: false },
    duration: { type: Number, default: 0 }
  },
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);

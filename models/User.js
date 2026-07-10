const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  phone: { type: String, required: true, unique: true },
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  about: { type: String, default: 'Hey there! I am using Nexi Chat', maxlength: 139 },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, select: false },
  otpExpire: { type: Date, select: false },
  privacy: {
    lastSeen: { type: String, default: 'contacts' },
    profilePhoto: { type: String, default: 'contacts' },
    readReceipts: { type: Boolean, default: true }
  },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

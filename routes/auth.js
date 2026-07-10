const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });
    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    let user = await User.findOne({ phone });
    if (!user) user = new User({ phone, name: 'Nexi User' });
    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save({ validateBeforeSave: false });
    const isDev = process.env.NODE_ENV === 'development';
    res.status(200).json({
      success: true,
      message: 'OTP sent',
      ...(isDev && { otp })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });
    const user = await User.findOne({ phone }).select('+otp +otpExpire');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (user.otpExpire < Date.now()) return res.status(400).json({ success: false, message: 'OTP expired' });
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);
    const isNewUser = !user.name || user.name === 'Nexi User';
    res.status(200).json({
      success: true,
      token,
      isNewUser,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/setup-profile', require('../middleware/auth').protect, async (req, res) => {
  try {
    const { name, about } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (about) user.about = about;
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, user });
});

module.exports = router;

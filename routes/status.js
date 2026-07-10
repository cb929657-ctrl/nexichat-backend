const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Status = require('../models/Status');
const User = require('../models/User');

router.post('/', protect, async (req, res) => {
  try {
    const { type, content, backgroundColor, media, caption, privacy } = req.body;
    const status = await Status.create({
      user: req.user._id, type, content, backgroundColor,
      media, caption, privacy: privacy || 'contacts'
    });
    res.status(201).json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/feed', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const statuses = await Status.find({
      user: { $in: [...user.contacts, req.user._id] },
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 });
    const grouped = {};
    statuses.forEach(s => {
      const uid = s.user._id.toString();
      if (!grouped[uid]) grouped[uid] = { user: s.user, statuses: [] };
      grouped[uid].statuses.push(s);
    });
    res.status(200).json({ success: true, feed: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/view', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    const alreadyViewed = status.viewers.some(v => v.user.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      status.viewers.push({ user: req.user._id });
      await status.save();
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    status.reactions = status.reactions.filter(r => r.user.toString() !== req.user._id.toString());
    if (emoji) status.reactions.push({ user: req.user._id, emoji });
    await status.save();
    res.status(200).json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/viewers', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id).populate('viewers.user', 'name avatar');
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, viewers: status.viewers, reactions: status.reactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await status.deleteOne();
    res.status(200).json({ success: true, message: 'Status deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

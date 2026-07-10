const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name avatar isOnline lastSeen phone')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/conversations', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [req.user._id, userId], $size: 2 }
    }).populate('participants', 'name avatar isOnline lastSeen phone');
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        participants: [req.user._id, userId]
      });
      conversation = await conversation.populate('participants', 'name avatar isOnline lastSeen phone');
    }
    res.status(200).json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:conversationId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const messages = await Message.find({
      conversation: req.params.conversationId,
      deletedFor: { $ne: req.user._id }
    })
      .populate('sender', 'name avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.status(200).json({ success: true, messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:conversationId', protect, async (req, res) => {
  try {
    const { type = 'text', content, media, location, replyTo } = req.body;
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
    let disappearsAt = null;
    if (conversation.disappearingMessages?.enabled) {
      disappearsAt = new Date(Date.now() + conversation.disappearingMessages.duration * 1000);
    }
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      type, content, media, location, replyTo, disappearsAt
    });
    conversation.lastMessage = message._id;
    await conversation.save();
    const populated = await message.populate('sender', 'name avatar');
    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:messageId/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    message.reactions = message.reactions.filter(r => r.user.toString() !== req.user._id.toString());
    if (emoji) message.reactions.push({ user: req.user._id, emoji });
    await message.save();
    res.status(200).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { forEveryone } = req.query;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (forEveryone === 'true' && message.sender.toString() === req.user._id.toString()) {
      message.isDeleted = true;
      message.content = '';
    } else {
      message.deletedFor.push(req.user._id);
    }
    await message.save();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:conversationId/read', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { conversation: req.params.conversationId, 'readBy.user': { $ne: req.user._id } },
      { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
    );
    res.status(200).json({ success: true });
  } catch (err) {

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

router.post('/', protect, async (req, res) => {
  try {
    const { name, description, participantIds } = req.body;
    if (!name || !participantIds || participantIds.length < 1) {
      return res.status(400).json({ success: false, message: 'Name and participants required' });
    }
    const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])];
    const group = await Conversation.create({
      type: 'group',
      name,
      description: description || '',
      participants: allParticipants,
      admins: [req.user._id]
    });
    await Message.create({
      conversation: group._id,
      sender: req.user._id,
      type: 'text',
      content: req.user.name + ' created group ' + name
    });
    const populated = await group.populate('participants', 'name avatar isOnline');
    res.status(201).json({ success: true, group: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admins can edit' });
    }
    const { name, description } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();
    res.status(200).json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/members', protect, async (req, res) => {
  try {
    const { add = [], remove = [] } = req.body;
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admins can manage members' });
    }
    add.forEach(id => {
      if (!group.participants.map(String).includes(id)) group.participants.push(id);
    });
    group.participants = group.participants.filter(p => !remove.includes(p.toString()));
    group.admins = group.admins.filter(a => !remove.includes(a.toString()));
    await group.save();
    const populated = await group.populate('participants', 'name avatar isOnline');
    res.status(200).json({ success: true, group: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/admins', protect, async (req, res) => {
  try {
    const { userId, action } = req.body;
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admins can manage admins' });
    }
    if (action === 'promote' && !group.admins.includes(userId)) group.admins.push(userId);
    if (action === 'demote') group.admins = group.admins.filter(a => a.toString() !== userId);
    await group.save();
    res.status(200).json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id/leave', protect, async (req, res) => {
  try {
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    group.participants = group.participants.filter(p => p.toString() !== req.user._id.toString());
    group.admins = group.admins.filter(a => a.toString() !== req.user._id.toString());
    await group.save();
    await Message.create({
      conversation: group._id,
      sender: req.user._id,
      type: 'text',
      content: req.user.name + ' left the group'
    });
    res.status(200).json({ success: true, message: 'Left group' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

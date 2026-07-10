const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  status: { type: String, enum: ['success','pending','failed'], default: 'success' },
  txnId: { type: String, unique: true }
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

router.post('/send', protect, async (req, res) => {
  try {
    const { toUserId, amount, note } = req.body;
    if (!toUserId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Recipient and valid amount required' });
    }
    const txnId = 'NEXI' + Date.now().toString().slice(-12);
    const txn = await Transaction.create({
      from: req.user._id, to: toUserId, amount, note, status: 'success', txnId
    });
    res.status(201).json({ success: true, transaction: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ from: req.user._id }, { to: req.user._id }]
    })
      .populate('from to', 'name phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

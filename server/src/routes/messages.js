const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:userId - Get conversation history between req.user and :userId
router.get('/:userId', authenticateToken, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({
        error: 'Invalid user ID specified.',
      });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({
        error: 'Cannot open a private conversation with yourself.',
      });
    }

    // Verify recipient user exists
    const targetUser = db.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    // Fetch messages (only accessible to conversation participants)
    const messages = db.getConversationMessages(req.user.id, targetUserId, limit, offset);

    return res.status(200).json({
      recipient: targetUser,
      messages,
    });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve conversation history.',
    });
  }
});

// POST /api/messages - HTTP endpoint to send a message
router.post('/', authenticateToken, (req, res) => {
  try {
    const { recipient_id, content } = req.body || {};

    const targetRecipientId = parseInt(recipient_id, 10);
    if (isNaN(targetRecipientId)) {
      return res.status(400).json({
        error: 'A valid recipient_id is required.',
      });
    }

    if (targetRecipientId === req.user.id) {
      return res.status(400).json({
        error: 'Cannot send a message to yourself.',
      });
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Message content cannot be empty.',
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        error: 'Message content exceeds maximum allowed length of 2,000 characters.',
      });
    }

    // Check that recipient exists
    const recipient = db.findUserById(targetRecipientId);
    if (!recipient) {
      return res.status(404).json({
        error: 'Recipient user does not exist.',
      });
    }

    // Save message to SQLite
    const savedMessage = db.createMessage(req.user.id, targetRecipientId, content.trim());

    // If socket.io is attached to app, broadcast in real time
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetRecipientId}`).emit('message:new', savedMessage);
      io.to(`user:${req.user.id}`).emit('message:new', savedMessage);
    }

    return res.status(201).json({
      message: 'Message sent successfully',
      data: savedMessage,
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({
      error: 'Failed to send message.',
    });
  }
});

module.exports = router;

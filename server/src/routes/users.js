const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - list registered users excluding current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const users = db.getAllUsersExcept(req.user.id);
    return res.status(200).json({ users });
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve user directory.',
    });
  }
});

module.exports = router;

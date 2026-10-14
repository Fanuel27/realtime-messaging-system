const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    // Field presence validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are all required.',
      });
    }

    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    // Format validations
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return res.status(400).json({
        error: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores.',
      });
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address.',
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long.',
      });
    }

    // Duplicate check
    const dupCheck = db.checkDuplicateUser(trimmedUsername, trimmedEmail);
    if (dupCheck) {
      if (dupCheck.duplicate_username && dupCheck.duplicate_email) {
        return res.status(409).json({
          error: 'Both username and email are already registered.',
        });
      }
      if (dupCheck.duplicate_username) {
        return res.status(409).json({
          error: 'Username is already taken. Please choose another.',
        });
      }
      if (dupCheck.duplicate_email) {
        return res.status(409).json({
          error: 'An account with this email already exists.',
        });
      }
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(cleanPassword, salt);

    // Save user to database
    const newUser = db.createUser(trimmedUsername, trimmedEmail, passwordHash);

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    setTokenCookie(res, token);

    return res.status(201).json({
      message: 'Registration successful',
      user: newUser,
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      error: 'An unexpected server error occurred during registration.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
      });
    }

    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    const userWithHash = db.findUserByEmail(trimmedEmail);
    if (!userWithHash) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, userWithHash.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    const user = {
      id: userWithHash.id,
      username: userWithHash.username,
      email: userWithHash.email,
      created_at: userWithHash.created_at,
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    setTokenCookie(res, token);

    return res.status(200).json({
      message: 'Login successful',
      user,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'An unexpected server error occurred during login.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return res.status(200).json({
    message: 'Logged out successfully.',
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

module.exports = router;

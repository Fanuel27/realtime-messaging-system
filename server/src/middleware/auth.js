const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

function extractTokenFromRequest(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

function authenticateToken(req, res, next) {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid session. User account not found.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired authentication token.',
    });
  }
}

function socketAuthMiddleware(socket, next) {
  let token = null;

  if (socket.handshake.auth && socket.handshake.auth.token) {
    token = socket.handshake.auth.token;
  } else if (socket.handshake.headers && socket.handshake.headers.cookie) {
    // Parse cookies from header if present
    const cookieHeader = socket.handshake.headers.cookie;
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    return next(new Error('Authentication required: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.findUserById(decoded.id);

    if (!user) {
      return next(new Error('Authentication failed: User not found'));
    }

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Authentication failed: Invalid or expired token'));
  }
}

module.exports = {
  authenticateToken,
  socketAuthMiddleware,
  extractTokenFromRequest,
};

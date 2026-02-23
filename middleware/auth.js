const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const JWT_SECRET = 'prince-automotive-secret-key-2025';
const JWT_EXPIRES_IN = '7d';

/**
 * Extracts and verifies the JWT token from cookies or Authorization header.
 * Attaches the full user record (minus password) to req.user if valid.
 * Does NOT block the request if no token is present — use requireAuth for that.
 */
function authenticateToken(req, res, next) {
  try {
    let token = null;

    // 1. Check cookies
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2. Fall back to Authorization header
    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch full user from DB (password excluded in the SELECT)
    const db = getDb();
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, phone, address, city, state, zip,
             drivers_license, role, created_at
      FROM users WHERE id = ?
    `).get(decoded.id);

    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    // Token invalid / expired — treat as unauthenticated
    req.user = null;
    next();
  }
}

/**
 * Middleware that blocks the request with 401 if not authenticated.
 */
function requireAuth(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    next();
  });
}

/**
 * Middleware that blocks the request with 403 if the user is not an admin.
 * Must be used AFTER requireAuth (or it will 401 first).
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user) {
      // requireAuth already sent 401
      return;
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

/**
 * Helper — generates a signed JWT for a given user id.
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin,
  generateToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};

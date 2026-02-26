const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { requireAuth, generateToken } = require('../middleware/auth');

// -------------------------------------------------------------------------
// POST /api/auth/register
// -------------------------------------------------------------------------
router.post('/register', (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Validation
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        error: 'Email, password, first name, and last name are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const db = getDb();

    // Check for existing user
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password & insert
    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (email, password, first_name, last_name, phone, role)
      VALUES (?, ?, ?, ?, ?, 'customer')
    `).run(
      email.toLowerCase().trim(),
      hashedPassword,
      first_name.trim(),
      last_name.trim(),
      phone || null
    );

    const token = generateToken(result.lastInsertRowid);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user info (no password)
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, phone, role, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Account created successfully. Welcome to Prince Automotive Group!',
      user,
      token
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// -------------------------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------------------------
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful.',
      user: userWithoutPassword,
      token
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// -------------------------------------------------------------------------
// POST /api/auth/logout
// -------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ message: 'Logged out successfully.' });
});

// -------------------------------------------------------------------------
// GET /api/auth/me
// -------------------------------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// -------------------------------------------------------------------------
// PUT /api/auth/profile
// -------------------------------------------------------------------------
router.put('/profile', requireAuth, (req, res) => {
  try {
    const {
      first_name, last_name, phone, address, city, state, zip, drivers_license
    } = req.body;

    const db = getDb();

    db.prepare(`
      UPDATE users
      SET first_name = COALESCE(?, first_name),
          last_name  = COALESCE(?, last_name),
          phone      = COALESCE(?, phone),
          address    = COALESCE(?, address),
          city       = COALESCE(?, city),
          state      = COALESCE(?, state),
          zip        = COALESCE(?, zip),
          drivers_license = COALESCE(?, drivers_license)
      WHERE id = ?
    `).run(
      first_name || null,
      last_name || null,
      phone || null,
      address || null,
      city || null,
      state || null,
      zip || null,
      drivers_license || null,
      req.user.id
    );

    const updatedUser = db.prepare(`
      SELECT id, email, first_name, last_name, phone, address, city, state, zip,
             drivers_license, role, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (err) {
    console.error('[AUTH] Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// -------------------------------------------------------------------------
// PUT /api/auth/change-email
// -------------------------------------------------------------------------
router.put('/change-email', requireAuth, (req, res) => {
  try {
    const { current_password, new_email } = req.body;

    if (!current_password || !new_email) {
      return res.status(400).json({ error: 'Current password and new email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const db = getDb();

    // Fetch user with password to verify
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const validPassword = bcrypt.compareSync(current_password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Check if new email is already taken
    const normalizedEmail = new_email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(normalizedEmail, req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(normalizedEmail, req.user.id);

    res.json({ message: 'Email updated successfully.', email: normalizedEmail });
  } catch (err) {
    console.error('[AUTH] Change email error:', err);
    res.status(500).json({ error: 'Failed to update email.' });
  }
});

// -------------------------------------------------------------------------
// PUT /api/auth/change-password
// -------------------------------------------------------------------------
router.put('/change-password', requireAuth, (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    if (current_password === new_password) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    const db = getDb();

    // Fetch user with password to verify
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const validPassword = bcrypt.compareSync(current_password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash and save new password
    const hashedPassword = bcrypt.hashSync(new_password, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[AUTH] Change password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

module.exports = router;

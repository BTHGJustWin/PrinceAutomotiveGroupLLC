const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/auth');

// -------------------------------------------------------------------------
// Helper — generate a booking reference like "PRN-A3F8K2"
// -------------------------------------------------------------------------
function generateBookingRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'PRN-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

// -------------------------------------------------------------------------
// Helper — calculate rental total based on duration and daily/weekly/monthly rates
// -------------------------------------------------------------------------
function calculateRentalPrice(vehicle, duration) {
  switch (duration) {
    case '1-day':
      return vehicle.rental_daily;
    case '3-days':
      return vehicle.rental_daily * 3;
    case '1-week':
      return vehicle.rental_weekly;
    case '2-weeks':
      return vehicle.rental_weekly * 2;
    case '1-month':
      return vehicle.rental_monthly;
    case '3-months':
      return vehicle.rental_monthly * 3;
    case '6-months':
      return vehicle.rental_monthly * 6;
    default:
      // Default to daily rate
      return vehicle.rental_daily;
  }
}

// -------------------------------------------------------------------------
// POST /api/bookings — Create a new booking
// -------------------------------------------------------------------------
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      vehicle_id,
      booking_type,
      start_date,
      end_date,
      duration,
      notes,
      financing_type
    } = req.body;

    // Validation
    if (!vehicle_id || !booking_type) {
      return res.status(400).json({
        error: 'Vehicle ID and booking type are required.'
      });
    }

    const validTypes = ['purchase', 'lease', 'rental'];
    if (!validTypes.includes(booking_type)) {
      return res.status(400).json({
        error: 'Booking type must be purchase, lease, or rental.'
      });
    }

    const db = getDb();

    // Verify vehicle exists and is available
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    if (vehicle.status !== 'available') {
      return res.status(400).json({
        error: 'This vehicle is not currently available for ' + booking_type + '.'
      });
    }

    // Generate unique booking reference
    let bookingRef;
    let refExists = true;
    while (refExists) {
      bookingRef = generateBookingRef();
      refExists = db.prepare('SELECT id FROM bookings WHERE booking_ref = ?').get(bookingRef);
    }

    // Calculate total price
    let totalPrice = null;
    if (booking_type === 'purchase') {
      totalPrice = vehicle.price;
    } else if (booking_type === 'lease') {
      totalPrice = vehicle.lease_monthly;
    } else if (booking_type === 'rental') {
      if (!duration) {
        return res.status(400).json({ error: 'Duration is required for rental bookings.' });
      }
      totalPrice = calculateRentalPrice(vehicle, duration);
    }

    // Insert booking
    const result = db.prepare(`
      INSERT INTO bookings (
        booking_ref, user_id, vehicle_id, booking_type,
        start_date, end_date, duration, status, total_price,
        notes, financing_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      bookingRef,
      req.user.id,
      vehicle_id,
      booking_type,
      start_date || null,
      end_date || null,
      duration || null,
      totalPrice,
      notes || null,
      financing_type || null
    );

    // Update vehicle status to reserved
    db.prepare("UPDATE vehicles SET status = 'reserved' WHERE id = ?").run(vehicle_id);

    // Fetch the created booking with vehicle info
    const booking = db.prepare(`
      SELECT b.*, v.year, v.make, v.model, v.trim, v.exterior_color, v.images
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Booking created successfully! Your reference number is ' + bookingRef + '.',
      booking
    });
  } catch (err) {
    console.error('[BOOKINGS] Create error:', err);
    res.status(500).json({ error: 'Failed to create booking.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/bookings/my — Current user's bookings
// -------------------------------------------------------------------------
router.get('/my', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const bookings = db.prepare(`
      SELECT b.*, v.year, v.make, v.model, v.trim, v.exterior_color,
             v.interior_color, v.images, v.price AS vehicle_price
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);

    // Parse vehicle images JSON
    const parsed = bookings.map(b => {
      try {
        b.images = b.images ? JSON.parse(b.images) : [];
      } catch {
        b.images = [];
      }
      return b;
    });

    res.json({ bookings: parsed });
  } catch (err) {
    console.error('[BOOKINGS] My bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch your bookings.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/bookings/:id — Single booking detail
// -------------------------------------------------------------------------
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const booking = db.prepare(`
      SELECT b.*, v.year, v.make, v.model, v.trim, v.exterior_color,
             v.interior_color, v.images, v.price AS vehicle_price,
             v.lease_monthly, v.rental_daily, v.rental_weekly, v.rental_monthly
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ? AND b.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    try {
      booking.images = booking.images ? JSON.parse(booking.images) : [];
    } catch {
      booking.images = [];
    }

    res.json({ booking });
  } catch (err) {
    console.error('[BOOKINGS] Detail error:', err);
    res.status(500).json({ error: 'Failed to fetch booking details.' });
  }
});

// -------------------------------------------------------------------------
// PUT /api/bookings/:id/cancel — Cancel a booking
// -------------------------------------------------------------------------
router.put('/:id/cancel', requireAuth, (req, res) => {
  try {
    const db = getDb();

    // Verify booking belongs to current user
    const booking = db.prepare(`
      SELECT * FROM bookings WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'This booking is already cancelled.' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed booking.' });
    }

    // Cancel the booking
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);

    // Set the vehicle back to available
    db.prepare("UPDATE vehicles SET status = 'available' WHERE id = ?").run(booking.vehicle_id);

    res.json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('[BOOKINGS] Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

// -------------------------------------------------------------------------
// Multer configuration — save uploads with unique filenames
// -------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `vehicle-${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB per file
});

// -------------------------------------------------------------------------
// GET /api/admin/stats — Dashboard statistics
// -------------------------------------------------------------------------
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const db = getDb();

    const totalVehicles = db.prepare('SELECT COUNT(*) AS count FROM vehicles').get().count;
    const availableVehicles = db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status = 'available'").get().count;
    const soldVehicles = db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status = 'sold'").get().count;
    const leasedVehicles = db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status = 'leased'").get().count;
    const rentedVehicles = db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status = 'rented'").get().count;

    const activeBookings = db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE status IN ('pending', 'confirmed', 'active')").get().count;
    const totalBookings = db.prepare('SELECT COUNT(*) AS count FROM bookings').get().count;

    const registeredCustomers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'").get().count;

    const revenuePotential = db.prepare("SELECT SUM(price) AS total FROM vehicles WHERE status = 'available'").get().total || 0;

    const totalRevenue = db.prepare("SELECT SUM(total_price) AS total FROM bookings WHERE status IN ('confirmed', 'active', 'completed')").get().total || 0;

    const newInquiries = db.prepare("SELECT COUNT(*) AS count FROM inquiries WHERE status = 'new'").get().count;

    const recentBookings = db.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.email,
             v.year, v.make, v.model, v.trim
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `).all();

    res.json({
      stats: {
        totalVehicles,
        availableVehicles,
        soldVehicles,
        leasedVehicles,
        rentedVehicles,
        activeBookings,
        totalBookings,
        registeredCustomers,
        revenuePotential,
        totalRevenue,
        newInquiries
      },
      recentBookings
    });
  } catch (err) {
    console.error('[ADMIN] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/admin/vehicles — All vehicles (including sold, rented, etc.)
// -------------------------------------------------------------------------
router.get('/vehicles', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status, sort, order } = req.query;

    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const allowedSortFields = ['price', 'year', 'mileage', 'make', 'created_at', 'status'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    const vehicles = db.prepare(sql).all(...params);

    const parsed = vehicles.map(v => {
      try { v.features = v.features ? JSON.parse(v.features) : []; } catch { v.features = []; }
      try { v.images = v.images ? JSON.parse(v.images) : []; } catch { v.images = []; }
      return v;
    });

    res.json({ vehicles: parsed });
  } catch (err) {
    console.error('[ADMIN] Vehicles list error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/vehicles — Add a new vehicle (with image upload)
// -------------------------------------------------------------------------
router.post('/vehicles', requireAdmin, upload.array('images', 10), (req, res) => {
  try {
    const db = getDb();
    const {
      year, make, model, trim, vin, exterior_color, interior_color,
      mileage, price, lease_monthly, rental_daily, rental_weekly, rental_monthly,
      body_type, fuel_type, transmission, engine, drivetrain,
      description, features, status, featured
    } = req.body;

    // Validation
    if (!year || !make || !model) {
      return res.status(400).json({ error: 'Year, make, and model are required.' });
    }

    // Build images array from uploaded files
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(f => `/uploads/${f.filename}`);
    }

    // Parse features if it's a string
    let featuresJson = '[]';
    if (features) {
      if (typeof features === 'string') {
        try {
          JSON.parse(features); // Validate it's valid JSON
          featuresJson = features;
        } catch {
          // If it's a comma-separated string, convert to array
          featuresJson = JSON.stringify(features.split(',').map(f => f.trim()));
        }
      } else if (Array.isArray(features)) {
        featuresJson = JSON.stringify(features);
      }
    }

    const result = db.prepare(`
      INSERT INTO vehicles (
        year, make, model, trim, vin, exterior_color, interior_color,
        mileage, price, lease_monthly, rental_daily, rental_weekly, rental_monthly,
        body_type, fuel_type, transmission, engine, drivetrain,
        description, features, images, status, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(year),
      make,
      model,
      trim || null,
      vin || null,
      exterior_color || null,
      interior_color || null,
      mileage ? parseInt(mileage) : null,
      price ? parseFloat(price) : null,
      lease_monthly ? parseFloat(lease_monthly) : null,
      rental_daily ? parseFloat(rental_daily) : null,
      rental_weekly ? parseFloat(rental_weekly) : null,
      rental_monthly ? parseFloat(rental_monthly) : null,
      body_type || null,
      fuel_type || null,
      transmission || null,
      engine || null,
      drivetrain || null,
      description || null,
      featuresJson,
      JSON.stringify(imagePaths),
      status || 'available',
      featured ? 1 : 0
    );

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    try { vehicle.features = JSON.parse(vehicle.features); } catch { vehicle.features = []; }
    try { vehicle.images = JSON.parse(vehicle.images); } catch { vehicle.images = []; }

    res.status(201).json({
      message: 'Vehicle added successfully.',
      vehicle
    });
  } catch (err) {
    console.error('[ADMIN] Add vehicle error:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed: vehicles.vin')) {
      return res.status(409).json({ error: 'A vehicle with this VIN already exists.' });
    }
    res.status(500).json({ error: 'Failed to add vehicle.' });
  }
});

// -------------------------------------------------------------------------
// PUT /api/admin/vehicles/:id — Update a vehicle
// -------------------------------------------------------------------------
router.put('/vehicles/:id', requireAdmin, upload.array('images', 10), (req, res) => {
  try {
    const db = getDb();
    const vehicleId = req.params.id;

    const existing = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    const {
      year, make, model, trim, vin, exterior_color, interior_color,
      mileage, price, lease_monthly, rental_daily, rental_weekly, rental_monthly,
      body_type, fuel_type, transmission, engine, drivetrain,
      description, features, status, featured, existing_images
    } = req.body;

    // Handle images — keep existing + add new uploads
    let imagePaths = [];
    if (existing_images) {
      try {
        imagePaths = typeof existing_images === 'string' ? JSON.parse(existing_images) : existing_images;
      } catch {
        imagePaths = [];
      }
    }
    if (req.files && req.files.length > 0) {
      const newPaths = req.files.map(f => `/uploads/${f.filename}`);
      imagePaths = imagePaths.concat(newPaths);
    }

    // Parse features
    let featuresJson = existing.features || '[]';
    if (features) {
      if (typeof features === 'string') {
        try {
          JSON.parse(features);
          featuresJson = features;
        } catch {
          featuresJson = JSON.stringify(features.split(',').map(f => f.trim()));
        }
      } else if (Array.isArray(features)) {
        featuresJson = JSON.stringify(features);
      }
    }

    db.prepare(`
      UPDATE vehicles SET
        year = ?, make = ?, model = ?, trim = ?, vin = ?,
        exterior_color = ?, interior_color = ?,
        mileage = ?, price = ?, lease_monthly = ?,
        rental_daily = ?, rental_weekly = ?, rental_monthly = ?,
        body_type = ?, fuel_type = ?, transmission = ?, engine = ?, drivetrain = ?,
        description = ?, features = ?, images = ?, status = ?, featured = ?
      WHERE id = ?
    `).run(
      year ? parseInt(year) : existing.year,
      make || existing.make,
      model || existing.model,
      trim !== undefined ? trim : existing.trim,
      vin !== undefined ? vin : existing.vin,
      exterior_color !== undefined ? exterior_color : existing.exterior_color,
      interior_color !== undefined ? interior_color : existing.interior_color,
      mileage ? parseInt(mileage) : existing.mileage,
      price ? parseFloat(price) : existing.price,
      lease_monthly ? parseFloat(lease_monthly) : existing.lease_monthly,
      rental_daily ? parseFloat(rental_daily) : existing.rental_daily,
      rental_weekly ? parseFloat(rental_weekly) : existing.rental_weekly,
      rental_monthly ? parseFloat(rental_monthly) : existing.rental_monthly,
      body_type || existing.body_type,
      fuel_type || existing.fuel_type,
      transmission || existing.transmission,
      engine || existing.engine,
      drivetrain || existing.drivetrain,
      description !== undefined ? description : existing.description,
      featuresJson,
      JSON.stringify(imagePaths),
      status || existing.status,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      vehicleId
    );

    const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    try { updated.features = JSON.parse(updated.features); } catch { updated.features = []; }
    try { updated.images = JSON.parse(updated.images); } catch { updated.images = []; }

    res.json({
      message: 'Vehicle updated successfully.',
      vehicle: updated
    });
  } catch (err) {
    console.error('[ADMIN] Update vehicle error:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed: vehicles.vin')) {
      return res.status(409).json({ error: 'A vehicle with this VIN already exists.' });
    }
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

// -------------------------------------------------------------------------
// DELETE /api/admin/vehicles/:id — Delete a vehicle
// -------------------------------------------------------------------------
router.delete('/vehicles/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    // Check for active bookings
    const activeBooking = db.prepare(`
      SELECT id FROM bookings
      WHERE vehicle_id = ? AND status IN ('pending', 'confirmed', 'active')
    `).get(req.params.id);

    if (activeBooking) {
      return res.status(400).json({
        error: 'Cannot delete a vehicle with active bookings. Cancel or complete the bookings first.'
      });
    }

    db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);

    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (err) {
    console.error('[ADMIN] Delete vehicle error:', err);
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/admin/bookings — All bookings with user and vehicle info
// -------------------------------------------------------------------------
router.get('/bookings', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;

    let sql = `
      SELECT b.*, u.first_name, u.last_name, u.email, u.phone AS user_phone,
             v.year, v.make, v.model, v.trim, v.exterior_color, v.images
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC';

    const bookings = db.prepare(sql).all(...params);

    const parsed = bookings.map(b => {
      try { b.images = b.images ? JSON.parse(b.images) : []; } catch { b.images = []; }
      return b;
    });

    res.json({ bookings: parsed });
  } catch (err) {
    console.error('[ADMIN] Bookings list error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// -------------------------------------------------------------------------
// PUT /api/admin/bookings/:id — Update booking status
// -------------------------------------------------------------------------
router.put('/bookings/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status, notes } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }

    // Update booking
    db.prepare(`
      UPDATE bookings SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(status || null, notes || null, req.params.id);

    // Update vehicle status based on booking status
    if (status) {
      let vehicleStatus = 'available';
      if (status === 'confirmed' || status === 'active') {
        if (booking.booking_type === 'purchase') vehicleStatus = 'sold';
        else if (booking.booking_type === 'lease') vehicleStatus = 'leased';
        else if (booking.booking_type === 'rental') vehicleStatus = 'rented';
      } else if (status === 'completed' || status === 'cancelled') {
        vehicleStatus = 'available';
      } else if (status === 'pending') {
        vehicleStatus = 'reserved';
      }
      db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run(vehicleStatus, booking.vehicle_id);
    }

    const updated = db.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.email,
             v.year, v.make, v.model, v.trim
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ?
    `).get(req.params.id);

    res.json({
      message: 'Booking updated successfully.',
      booking: updated
    });
  } catch (err) {
    console.error('[ADMIN] Update booking error:', err);
    res.status(500).json({ error: 'Failed to update booking.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/admin/customers — All registered customers
// -------------------------------------------------------------------------
router.get('/customers', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const customers = db.prepare(`
      SELECT id, email, first_name, last_name, phone, address, city, state, zip,
             drivers_license, role, created_at
      FROM users
      WHERE role = 'customer'
      ORDER BY created_at DESC
    `).all();

    // Add booking count for each customer
    const enriched = customers.map(c => {
      const bookingCount = db.prepare('SELECT COUNT(*) AS count FROM bookings WHERE user_id = ?').get(c.id).count;
      return { ...c, booking_count: bookingCount };
    });

    res.json({ customers: enriched });
  } catch (err) {
    console.error('[ADMIN] Customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/admin/inquiries — All inquiries
// -------------------------------------------------------------------------
router.get('/inquiries', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;

    let sql = `
      SELECT i.*,
             v.year AS vehicle_year, v.make AS vehicle_make,
             v.model AS vehicle_model, v.trim AS vehicle_trim
      FROM inquiries i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE i.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY i.created_at DESC';

    const inquiries = db.prepare(sql).all(...params);

    res.json({ inquiries });
  } catch (err) {
    console.error('[ADMIN] Inquiries error:', err);
    res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/inquiries — Create inquiry (contact form, no auth required)
// -------------------------------------------------------------------------
router.post('/inquiries', (req, res) => {
  try {
    const { user_id, vehicle_id, name, email, phone, inquiry_type, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const validTypes = ['general', 'test-drive', 'financing', 'trade-in'];
    const type = validTypes.includes(inquiry_type) ? inquiry_type : 'general';

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO inquiries (user_id, vehicle_id, name, email, phone, inquiry_type, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
    `).run(
      user_id || null,
      vehicle_id || null,
      name.trim(),
      email.trim().toLowerCase(),
      phone || null,
      type,
      message.trim()
    );

    res.status(201).json({
      message: 'Thank you for your inquiry! Our team will be in touch shortly.',
      inquiry_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('[ADMIN] Create inquiry error:', err);
    res.status(500).json({ error: 'Failed to submit inquiry.' });
  }
});

// -------------------------------------------------------------------------
// PUT /api/admin/inquiries/:id — Update inquiry status
// -------------------------------------------------------------------------
router.put('/inquiries/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;

    const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    const validStatuses = ['new', 'in-progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid inquiry status. Use: new, in-progress, resolved, or closed.' });
    }

    db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, req.params.id);

    const updated = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);

    res.json({
      message: 'Inquiry status updated.',
      inquiry: updated
    });
  } catch (err) {
    console.error('[ADMIN] Update inquiry error:', err);
    res.status(500).json({ error: 'Failed to update inquiry.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// -------------------------------------------------------------------------
// GET /api/vehicles/featured
// -------------------------------------------------------------------------
router.get('/featured', (req, res) => {
  try {
    const db = getDb();
    const vehicles = db.prepare(`
      SELECT * FROM vehicles
      WHERE featured = 1 AND status = 'available'
      ORDER BY created_at DESC
    `).all();

    // Parse JSON fields
    const parsed = vehicles.map(parseVehicleJson);

    res.json({ vehicles: parsed });
  } catch (err) {
    console.error('[VEHICLES] Featured error:', err);
    res.status(500).json({ error: 'Failed to fetch featured vehicles.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/vehicles/makes
// -------------------------------------------------------------------------
router.get('/makes', (req, res) => {
  try {
    const db = getDb();
    const makes = db.prepare(`
      SELECT DISTINCT make FROM vehicles
      WHERE status = 'available'
      ORDER BY make ASC
    `).all();

    res.json({ makes: makes.map(m => m.make) });
  } catch (err) {
    console.error('[VEHICLES] Makes error:', err);
    res.status(500).json({ error: 'Failed to fetch makes.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/vehicles/search
// -------------------------------------------------------------------------
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const db = getDb();
    const keyword = `%${q.trim()}%`;

    const vehicles = db.prepare(`
      SELECT * FROM vehicles
      WHERE status = 'available'
        AND (
          make LIKE ? OR model LIKE ? OR trim LIKE ?
          OR body_type LIKE ? OR exterior_color LIKE ?
          OR interior_color LIKE ? OR description LIKE ?
          OR engine LIKE ? OR fuel_type LIKE ?
          OR CAST(year AS TEXT) LIKE ?
        )
      ORDER BY created_at DESC
    `).all(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);

    res.json({ vehicles: vehicles.map(parseVehicleJson), count: vehicles.length });
  } catch (err) {
    console.error('[VEHICLES] Search error:', err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/vehicles
// -------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const {
      make,
      body_type,
      fuel_type,
      min_price,
      max_price,
      min_year,
      max_year,
      status,
      sort,
      order,
      limit,
      offset
    } = req.query;

    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    // Default to available vehicles for public listing
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      sql += " AND status = 'available'";
    }

    if (make) {
      sql += ' AND make = ?';
      params.push(make);
    }

    if (body_type) {
      sql += ' AND body_type = ?';
      params.push(body_type);
    }

    if (fuel_type) {
      sql += ' AND fuel_type = ?';
      params.push(fuel_type);
    }

    if (min_price) {
      sql += ' AND price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      sql += ' AND price <= ?';
      params.push(parseFloat(max_price));
    }

    if (min_year) {
      sql += ' AND year >= ?';
      params.push(parseInt(min_year));
    }

    if (max_year) {
      sql += ' AND year <= ?';
      params.push(parseInt(max_year));
    }

    // Sorting
    const allowedSortFields = ['price', 'year', 'mileage', 'make', 'created_at'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    // Pagination
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const offsetNum = parseInt(offset) || 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const vehicles = db.prepare(sql).all(...params);

    // Get total count (without LIMIT/OFFSET) for pagination
    let countSql = sql.replace(/SELECT \*/, 'SELECT COUNT(*) AS total')
                      .replace(/ORDER BY.*$/, '');
    // Remove the LIMIT ? OFFSET ? params for count
    const countParams = params.slice(0, -2);
    const { total } = db.prepare(countSql).get(...countParams);

    res.json({
      vehicles: vehicles.map(parseVehicleJson),
      total,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (err) {
    console.error('[VEHICLES] List error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// -------------------------------------------------------------------------
// GET /api/vehicles/:id
// -------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    res.json({ vehicle: parseVehicleJson(vehicle) });
  } catch (err) {
    console.error('[VEHICLES] Detail error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicle details.' });
  }
});

// -------------------------------------------------------------------------
// Helper — parse JSON string fields on a vehicle row
// -------------------------------------------------------------------------
function parseVehicleJson(vehicle) {
  if (!vehicle) return vehicle;
  try {
    vehicle.features = vehicle.features ? JSON.parse(vehicle.features) : [];
  } catch {
    vehicle.features = [];
  }
  try {
    vehicle.images = vehicle.images ? JSON.parse(vehicle.images) : [];
  } catch {
    vehicle.images = [];
  }
  return vehicle;
}

module.exports = router;

require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

// ---------------------------------------------------------------------------
// SPA catch-all — serve index.html for any non-API, non-static request
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
function startServer() {
  // Initialize database (creates tables & seeds data if needed)
  initDatabase();

  app.listen(PORT, () => {
    console.log(`
 ====================================================================
  ____  ____  ___ _   _  ____ _____
 |  _ \\|  _ \\|_ _| \\ | |/ ___| ____|
 | |_) | |_) || ||  \\| | |   |  _|
 |  __/|  _ < | || |\\  | |___| |___
 |_|   |_| \\_\\___|_| \\_|\\____|_____|

     _   _   _ _____ ___  __  __  ___ _____ _____     _____
    / \\ | | | |_   _/ _ \\|  \\/  |/ _ \\_   _|_ _\\ \\   / / __|
   / _ \\| | | | | || | | | |\\/| | | | || |  | | \\ \\ / /| _|
  / ___ \\ |_| | | || |_| | |  | | |_| || |  | |  \\ V / | |___
 /_/   \\_\\___/  |_| \\___/|_|  |_|\\___/ |_| |___|  \\_/  |_____|

   ____ ____   ___  _   _ ____
  / ___|  _ \\ / _ \\| | | |  _ \\
 | |  _| |_) | | | | | | | |_) |
 | |_| |  _ <| |_| | |_| |  __/
  \\____|_| \\_\\\\___/ \\___/|_|

 ====================================================================
  Prince Automotive Group LLC
  Premium Pre-Owned Vehicle Sales, Leasing & Rentals
 ====================================================================
  Server running on http://localhost:${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
 ====================================================================
    `);
  });
}

// On Vercel, just init DB and export. Locally, start the server.
if (process.env.VERCEL) {
  initDatabase();
} else {
  startServer();
}

module.exports = app;

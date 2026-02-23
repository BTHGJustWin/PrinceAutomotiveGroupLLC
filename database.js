const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Use /tmp on Vercel (serverless, read-only filesystem except /tmp)
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'prince_automotive.db')
  : path.join(__dirname, 'prince_automotive.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const database = getDb();

  // -----------------------------------------------------------------------
  // Create tables
  // -----------------------------------------------------------------------
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      drivers_license TEXT,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      trim TEXT,
      vin TEXT UNIQUE,
      exterior_color TEXT,
      interior_color TEXT,
      mileage INTEGER,
      price REAL,
      lease_monthly REAL,
      rental_daily REAL,
      rental_weekly REAL,
      rental_monthly REAL,
      body_type TEXT,
      fuel_type TEXT,
      transmission TEXT,
      engine TEXT,
      drivetrain TEXT,
      description TEXT,
      features TEXT,
      images TEXT,
      status TEXT DEFAULT 'available',
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      vehicle_id INTEGER REFERENCES vehicles(id),
      booking_type TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      duration TEXT,
      status TEXT DEFAULT 'pending',
      total_price REAL,
      notes TEXT,
      financing_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      vehicle_id INTEGER,
      name TEXT,
      email TEXT,
      phone TEXT,
      inquiry_type TEXT,
      message TEXT,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // -----------------------------------------------------------------------
  // Seed data — only if vehicles table is empty
  // -----------------------------------------------------------------------
  const vehicleCount = database.prepare('SELECT COUNT(*) AS count FROM vehicles').get();
  if (vehicleCount.count === 0) {
    seedVehicles(database);
  }

  const adminCount = database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get();
  if (adminCount.count === 0) {
    seedAdmin(database);
  }

  console.log('[DB] Database initialized successfully.');
}

function seedAdmin(database) {
  const hashedPassword = bcrypt.hashSync('PrinceAdmin2025!', 10);
  database.prepare(`
    INSERT INTO users (email, password, first_name, last_name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin@princeautomotivegroupllc.com', hashedPassword, 'Prince', 'Admin', 'admin');
  console.log('[DB] Default admin user seeded.');
}

function seedVehicles(database) {
  const insertVehicle = database.prepare(`
    INSERT INTO vehicles (
      year, make, model, trim, vin, exterior_color, interior_color,
      mileage, price, lease_monthly, rental_daily, rental_weekly, rental_monthly,
      body_type, fuel_type, transmission, engine, drivetrain,
      description, features, images, status, featured
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const vehicles = [
    {
      year: 2024,
      make: 'Mercedes-Benz',
      model: 'S-Class',
      trim: 'S580 4MATIC',
      vin: 'WDD2173441A' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Black',
      interior_color: 'Black Leather',
      mileage: 8200,
      price: 94900,
      lease_monthly: 1389,
      rental_daily: 299,
      rental_weekly: 1799,
      rental_monthly: 5999,
      body_type: 'sedan',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '4.0L V8 Biturbo',
      drivetrain: 'AWD',
      description: 'Immaculate 2024 Mercedes-Benz S580 4MATIC finished in stunning Black over Black leather. This flagship sedan combines cutting-edge technology with unmatched luxury. Every journey becomes a first-class experience with the Executive Rear Seat Package, Burmester 4D surround sound, and massaging seats front and rear. Night Vision Assist and MBUX Augmented Reality Navigation ensure confident driving in any condition.',
      features: JSON.stringify(['Burmester 4D Sound System', 'Head-Up Display', 'Executive Rear Seat Package', 'Night Vision Assist', 'MBUX Augmented Reality Navigation', 'Massaging Front & Rear Seats', 'Air Balance Package']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1764089859662-7b4773dff85b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1660108384081-62099678489e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1577546311477-67ef792021b7?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2024,
      make: 'BMW',
      model: '760i',
      trim: 'xDrive',
      vin: 'WBA73AG07R' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Alpine White',
      interior_color: 'Cognac Nappa Leather',
      mileage: 5100,
      price: 112500,
      lease_monthly: 1649,
      rental_daily: 349,
      rental_weekly: 2099,
      rental_monthly: 6999,
      body_type: 'sedan',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '4.4L V8 TwinPower Turbo',
      drivetrain: 'AWD',
      description: 'Breathtaking 2024 BMW 760i xDrive in Alpine White with sumptuous Cognac Nappa Leather. This ultimate luxury sedan showcases BMW\'s finest craftsmanship. The Sky Lounge Panoramic Roof bathes the cabin in ambient light, while the BMW Theater Screen transforms rear-seat travel into a cinematic experience. Crystal Headlights and Automatic Doors complete the extraordinary presence.',
      features: JSON.stringify(['Bowers & Wilkins Diamond Surround Sound', 'Sky Lounge Panoramic Roof', 'Executive Lounge Seating', 'BMW Theater Screen', 'Automatic Doors', 'Crystal Headlights']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1627936354732-ffbe552799d8?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1759002369921-ba54006bff01?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/flagged/photo-1575790952429-f3204e58396b?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2023,
      make: 'Porsche',
      model: 'Cayenne',
      trim: 'Turbo GT',
      vin: 'WP1BG2AY1P' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'GT Silver Metallic',
      interior_color: 'Black/Alcantara',
      mileage: 12400,
      price: 149900,
      lease_monthly: 2199,
      rental_daily: 449,
      rental_weekly: 2699,
      rental_monthly: 8999,
      body_type: 'suv',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '4.0L Twin-Turbo V8',
      drivetrain: 'AWD',
      description: 'Thrilling 2023 Porsche Cayenne Turbo GT in iconic GT Silver Metallic with Black and Alcantara interior. The most powerful Cayenne ever built delivers an astonishing 631 HP. The Lightweight Sport Package, carbon ceramic brakes, and 22" GT Design Wheels ensure performance that defies the SUV category. Sport Chrono and Sport Exhaust elevate every drive to a track-day experience.',
      features: JSON.stringify(['Sport Chrono Package', 'Carbon Ceramic Brakes (PCCB)', 'Lightweight Sport Package', 'Porsche Dynamic Chassis Control', 'Sport Exhaust System', '22" GT Design Wheels']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1654159866298-e3c8ee93e43b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1699325974549-fd06639650aa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1696315072523-1bd90867944b?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2024,
      make: 'Land Rover',
      model: 'Range Rover',
      trim: 'Autobiography LWB',
      vin: 'SALGS5SE5R' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Santorini Black',
      interior_color: 'Vintage Tan',
      mileage: 3800,
      price: 168000,
      lease_monthly: 2449,
      rental_daily: 499,
      rental_weekly: 2999,
      rental_monthly: 9999,
      body_type: 'suv',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '4.4L Twin-Turbo V8',
      drivetrain: 'AWD',
      description: 'Majestic 2024 Range Rover Autobiography Long Wheelbase in Santorini Black with opulent Vintage Tan leather. With only 3,800 miles, this near-new masterpiece offers unparalleled luxury. The Executive Class Comfort-Plus Rear Seats recline to first-class airline standards, while the Meridian Signature Sound System creates an immersive audio experience. Pixel LED Headlights and Cabin Air Purification Pro complete the ultimate luxury SUV.',
      features: JSON.stringify(['Meridian Signature Sound System', 'Executive Class Comfort-Plus Rear Seats', 'Pixel LED Headlights', 'All-Terrain Progress Control', 'Cabin Air Purification Pro']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1740954694714-3e8c83f20c04?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1679506640602-0144b3bb5053?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1563458563737-e60b1f1b345f?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2023,
      make: 'Audi',
      model: 'RS e-tron GT',
      trim: '',
      vin: 'WUAESFF1XP' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Daytona Gray',
      interior_color: 'Express Red',
      mileage: 9700,
      price: 119900,
      lease_monthly: 1749,
      rental_daily: 379,
      rental_weekly: 2299,
      rental_monthly: 7499,
      body_type: 'sedan',
      fuel_type: 'Electric',
      transmission: 'Automatic',
      engine: 'Dual Electric Motors (637 HP)',
      drivetrain: 'AWD',
      description: 'Electrifying 2023 Audi RS e-tron GT in striking Daytona Gray with bold Express Red interior. This all-electric grand tourer delivers 637 HP and launches from 0-60 in a breathtaking 3.1 seconds. The carbon roof lowers the center of gravity, while the RS Sport Suspension Plus adapts to every driving scenario. Sustainable luxury at its absolute finest.',
      features: JSON.stringify(['Carbon Roof', 'Bang & Olufsen Premium Sound System', 'Matrix LED Headlights', 'RS Sport Suspension Plus', 'Head-Up Display', 'Carbon Fiber Inlays']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1655126276417-a2427cc1ba20?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1655126275489-2c41cb7f2b74?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1655126277775-f984a7576047?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2024,
      make: 'Cadillac',
      model: 'Escalade',
      trim: 'V-Series',
      vin: '1GYS4CKL3R' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Black Raven',
      interior_color: 'Jet Black Semi-Aniline Leather',
      mileage: 6300,
      price: 139500,
      lease_monthly: 2049,
      rental_daily: 399,
      rental_weekly: 2399,
      rental_monthly: 7999,
      body_type: 'suv',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '6.2L Supercharged V8 (682 HP)',
      drivetrain: 'AWD',
      description: 'Commanding 2024 Cadillac Escalade V-Series in Black Raven with Jet Black Semi-Aniline leather. The most powerful Escalade ever, packing a hand-built 682HP supercharged V8. The AKG Studio Reference 36-speaker audio system is the most advanced in any vehicle. Super Cruise enables true hands-free highway driving, while Night Vision and Magnetic Ride Control ensure supreme confidence.',
      features: JSON.stringify(['AKG Studio Reference 36-Speaker System', 'Super Cruise Hands-Free Driving', '682HP Supercharged V8', 'Magnetic Ride Control 4.0', 'Night Vision', '22" Polished Forged Aluminum Wheels']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1574729420434-c2ee5b0a5b03?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1768024175218-5878b8880eab?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1768024175224-db216683d310?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2024,
      make: 'Lexus',
      model: 'LC 500',
      trim: 'Convertible',
      vin: 'JTHHP5BC5R' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Infrared',
      interior_color: 'White Semi-Aniline Leather',
      mileage: 4200,
      price: 104900,
      lease_monthly: 1529,
      rental_daily: 329,
      rental_weekly: 1999,
      rental_monthly: 6499,
      body_type: 'convertible',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '5.0L Naturally Aspirated V8',
      drivetrain: 'RWD',
      description: 'Stunning 2024 Lexus LC 500 Convertible in head-turning Infrared with White Semi-Aniline leather. This rolling work of art pairs a glorious naturally-aspirated 5.0L V8 with open-air grand touring capability. The Mark Levinson Reference 21-speaker sound system delivers concert-hall audio, while the Torsen limited-slip differential and Variable Gear Ratio Steering provide genuine sports car dynamics.',
      features: JSON.stringify(['Mark Levinson Reference 21-Speaker Sound', 'Torsen Limited-Slip Differential', 'Variable Gear Ratio Steering', 'Sport Package', 'Carbon Fiber Roof Panel (hardtop)', 'Alcantara Headliner']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1771556907904-073e16b61983?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1771556907938-af4f87462310?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1762095210069-07db3b009eb9?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 0
    },
    {
      year: 2023,
      make: 'Tesla',
      model: 'Model X',
      trim: 'Plaid',
      vin: '5YJXCBE20P' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Ultra White',
      interior_color: 'Cream Interior',
      mileage: 11500,
      price: 84900,
      lease_monthly: 1249,
      rental_daily: 269,
      rental_weekly: 1599,
      rental_monthly: 5499,
      body_type: 'suv',
      fuel_type: 'Electric',
      transmission: 'Automatic',
      engine: 'Tri-Motor Electric (1,020 HP)',
      drivetrain: 'AWD',
      description: 'Remarkable 2023 Tesla Model X Plaid in Ultra White with Cream interior. With 1,020 HP from its tri-motor powertrain, this is one of the fastest SUVs ever made. The iconic Falcon Wing Doors make every entrance unforgettable, while Full Self-Driving Capability represents the cutting edge of autonomous technology. HEPA filtration ensures the cabin air is always pristine.',
      features: JSON.stringify(['Full Self-Driving Capability', 'Falcon Wing Doors', '1,020 HP Tri-Motor Powertrain', '22" Turbine Wheels', 'HEPA Air Filtration System', 'Yoke Steering Wheel', '17" Cinematic Display']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1707002752329-5a4a889f7de9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1652509197980-9f3d9ac7916e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1622620645406-3aa46ce15ef2?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 0
    },
    {
      year: 2024,
      make: 'Genesis',
      model: 'GV80 Coupe',
      trim: '3.5T Sport Prestige',
      vin: 'KMUHBDSB3R' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Mauna Loa Garnet',
      interior_color: 'Obsidian Black',
      mileage: 2900,
      price: 79900,
      lease_monthly: 1169,
      rental_daily: 249,
      rental_weekly: 1499,
      rental_monthly: 4999,
      body_type: 'suv',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '3.5L Twin-Turbo V6',
      drivetrain: 'AWD',
      description: 'Exquisite 2024 Genesis GV80 Coupe 3.5T Sport Prestige in rare Mauna Loa Garnet with Obsidian Black interior. With a mere 2,900 miles, this coupe-SUV combines athletic design with Genesis\' renowned luxury. Road Active Noise Cancellation creates a serene cabin, while the electronic limited-slip differential and Sport+ mode deliver genuine driving excitement. The 22" Dark Sport Wheels complete the aggressive stance.',
      features: JSON.stringify(['Bang & Olufsen 3D Premium Sound', 'Lexicon Sound System', 'Road Active Noise Cancellation', 'Electronic Limited-Slip Differential', 'Sport+ Drive Mode', '22" Dark Sport Wheels', 'Ergo Motion Driver Seat']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1709104761873-24cc12d23b28?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1739950075618-f9ae2f90b0c0?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1741744582317-06860916ad38?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 0
    },
    {
      year: 2024,
      make: 'Maserati',
      model: 'Grecale',
      trim: 'Trofeo',
      vin: 'ZNCFAGMM3R' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Grigio Maratea',
      interior_color: 'Rosso Corallo Leather',
      mileage: 7600,
      price: 89500,
      lease_monthly: 1299,
      rental_daily: 279,
      rental_weekly: 1699,
      rental_monthly: 5699,
      body_type: 'suv',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: 'MC20-derived 3.0L V6 Nettuno',
      drivetrain: 'AWD',
      description: 'Captivating 2024 Maserati Grecale Trofeo in sophisticated Grigio Maratea with passionate Rosso Corallo leather interior. Powered by the MC20-derived Nettuno V6, this Italian luxury SUV combines Maserati\'s racing heritage with everyday versatility. The Sonus Faber High-Premium sound system delivers audiophile-grade music, while Corsa Drive Mode unleashes the full 523 HP. True Italian luxury meets modern performance.',
      features: JSON.stringify(['MC20-derived Nettuno V6 Engine', 'Sonus Faber High-Premium Sound System', 'Highway Assist Pro', 'Corsa Drive Mode', 'Adaptive Matrix LED Headlights', '21" Efesto Dark Forged Wheels']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1680744764636-60dfa5471940?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1530505849655-e0a1121554a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1692966307728-1d615077f813?auto=format&fit=crop&w=1200&q=80'
      ]),
      status: 'available',
      featured: 0
    }
  ];

  const insertMany = database.transaction((vehicleList) => {
    for (const v of vehicleList) {
      insertVehicle.run(
        v.year, v.make, v.model, v.trim, v.vin, v.exterior_color, v.interior_color,
        v.mileage, v.price, v.lease_monthly, v.rental_daily, v.rental_weekly, v.rental_monthly,
        v.body_type, v.fuel_type, v.transmission, v.engine, v.drivetrain,
        v.description, v.features, v.images, v.status, v.featured
      );
    }
  });

  insertMany(vehicles);
  console.log(`[DB] Seeded ${vehicles.length} luxury vehicles.`);
}

module.exports = { initDatabase, getDb };

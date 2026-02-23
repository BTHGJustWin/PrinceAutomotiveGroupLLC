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
        'https://s3.amazonaws.com/dcmcarimages/car-images/Mercedes-Benz/S-Class-S580-4Matic/678777/W1K6G7GB7PA199192_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Mercedes-Benz/S-Class-S580-4Matic/678777/W1K6G7GB7PA199192_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Mercedes-Benz/S-Class-S580-4Matic/678777/W1K6G7GB7PA199192_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Mercedes-Benz/S-Class-S580-4Matic/678777/W1K6G7GB7PA199192_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Mercedes-Benz/S-Class-S580-4Matic/678777/W1K6G7GB7PA199192_5.jpg'
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
        'https://s3.amazonaws.com/dcmcarimages/car-images/BMW/760-i-xDrive/665434/WBA33EJ0XSCV15165_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/BMW/760-i-xDrive/665434/WBA33EJ0XSCV15165_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/BMW/760-i-xDrive/665434/WBA33EJ0XSCV15165_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/BMW/760-i-xDrive/665434/WBA33EJ0XSCV15165_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/BMW/760-i-xDrive/665434/WBA33EJ0XSCV15165_5.jpg'
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
        'https://s3.amazonaws.com/dcmcarimages/car-images/Porsche/Cayenne-Turbo-GT/678997/WP1BK2AY9TDA70210_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Porsche/Cayenne-Turbo-GT/678997/WP1BK2AY9TDA70210_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Porsche/Cayenne-Turbo-GT/678997/WP1BK2AY9TDA70210_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Porsche/Cayenne-Turbo-GT/678997/WP1BK2AY9TDA70210_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Porsche/Cayenne-Turbo-GT/678997/WP1BK2AY9TDA70210_5.jpg'
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
        'https://s3.amazonaws.com/dcmcarimages/car-images/Land-Rover/Range-Rover-Autobiography/676371/SALK19E70PA089307_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Land-Rover/Range-Rover-Autobiography/676371/SALK19E70PA089307_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Land-Rover/Range-Rover-Autobiography/676371/SALK19E70PA089307_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Land-Rover/Range-Rover-Autobiography/676371/SALK19E70PA089307_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Land-Rover/Range-Rover-Autobiography/676371/SALK19E70PA089307_5.jpg'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2023,
      make: 'Audi',
      model: 'R8',
      trim: 'GT RWD',
      vin: 'WUAGBAFX3P' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Tango Red',
      interior_color: 'Black Fine Nappa Leather',
      mileage: 1583,
      price: 289900,
      lease_monthly: 4249,
      rental_daily: 799,
      rental_weekly: 4799,
      rental_monthly: 15999,
      body_type: 'coupe',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '5.2L V10 (602 HP)',
      drivetrain: 'RWD',
      description: 'Breathtaking 2023 Audi R8 GT in stunning Tango Red with Black Fine Nappa leather. Limited to just 333 units worldwide, this is the ultimate expression of Audi\'s legendary V10 supercar. The naturally-aspirated 5.2L V10 delivers an intoxicating 602 HP to the rear wheels through a 7-speed S tronic transmission. With only 1,583 miles, this collector\'s piece is virtually new. Carbon ceramic brakes, laser headlights, and the exclusive GT fixed rear wing complete the most thrilling R8 ever built.',
      features: JSON.stringify(['Limited Edition 1 of 333', '5.2L V10 Naturally Aspirated', 'Carbon Ceramic Brakes', 'Laser Headlights', 'Bang & Olufsen Sound System', 'Carbon Fiber Fixed Rear Wing', 'Sport Exhaust System']),
      images: JSON.stringify([
        'https://s3.amazonaws.com/dcmcarimages/car-images/Audi/R8-GT/680394/WUAGBAFX3P7901127_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Audi/R8-GT/680394/WUAGBAFX3P7901127_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Audi/R8-GT/680394/WUAGBAFX3P7901127_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Audi/R8-GT/680394/WUAGBAFX3P7901127_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Audi/R8-GT/680394/WUAGBAFX3P7901127_5.jpg'
      ]),
      status: 'available',
      featured: 1
    },
    {
      year: 2025,
      make: 'Lamborghini',
      model: 'Urus',
      trim: 'S',
      vin: 'ZPBUD6ZLXS' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Verde Turbine Matt',
      interior_color: 'Nero Ade Sportivo',
      mileage: 864,
      price: 394200,
      lease_monthly: 5799,
      rental_daily: 999,
      rental_weekly: 5999,
      rental_monthly: 19999,
      body_type: 'suv',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '4.0L Twin-Turbo V8 (657 HP)',
      drivetrain: 'AWD',
      description: 'Ferocious 2025 Lamborghini Urus S in exclusive Verde Turbine Matte finish with Nero Ade Sportivo interior. This super SUV delivers an earth-shattering 657 HP from its twin-turbo V8, rocketing from 0-60 in just 3.3 seconds. The aggressive Urus S styling package includes the carbon fiber front splitter, rear diffuser, and massive 23" Taigete wheels. With barely 864 miles, this beast is practically brand new. Tamburo Drive Mode Selector, carbon ceramic brakes, and adaptive air suspension make this the ultimate performance SUV.',
      features: JSON.stringify(['657 HP Twin-Turbo V8', 'Carbon Ceramic Brakes', 'Tamburo Drive Mode Selector', '23" Taigete Forged Wheels', 'Adaptive Air Suspension', 'Carbon Fiber Exterior Package', 'Sensonum Sound System']),
      images: JSON.stringify([
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lamborghini/Urus-S/681753/ZPBUD6ZLXSLA38545_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lamborghini/Urus-S/681753/ZPBUD6ZLXSLA38545_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lamborghini/Urus-S/681753/ZPBUD6ZLXSLA38545_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lamborghini/Urus-S/681753/ZPBUD6ZLXSLA38545_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lamborghini/Urus-S/681753/ZPBUD6ZLXSLA38545_5.jpg'
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
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lexus/LC-500/682095/JTHHP5AY1JA005413_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lexus/LC-500/682095/JTHHP5AY1JA005413_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lexus/LC-500/682095/JTHHP5AY1JA005413_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lexus/LC-500/682095/JTHHP5AY1JA005413_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Lexus/LC-500/682095/JTHHP5AY1JA005413_5.jpg'
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
        'https://s3.amazonaws.com/dcmcarimages/car-images/Tesla/Model-X-Plaid/682527/7SAXCBE61PF430598_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Tesla/Model-X-Plaid/682527/7SAXCBE61PF430598_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Tesla/Model-X-Plaid/682527/7SAXCBE61PF430598_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Tesla/Model-X-Plaid/682527/7SAXCBE61PF430598_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Tesla/Model-X-Plaid/682527/7SAXCBE61PF430598_5.jpg'
      ]),
      status: 'available',
      featured: 0
    },
    {
      year: 2025,
      make: 'Rolls-Royce',
      model: 'Cullinan',
      trim: 'Series II Black Badge',
      vin: 'SLA13HA0XS' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      exterior_color: 'Monteverde',
      interior_color: 'Seashell White Leather',
      mileage: 3151,
      price: 649900,
      lease_monthly: 9499,
      rental_daily: 1499,
      rental_weekly: 8999,
      rental_monthly: 29999,
      body_type: 'suv',
      fuel_type: 'Gasoline',
      transmission: 'Automatic',
      engine: '6.75L Twin-Turbo V12 (591 HP)',
      drivetrain: 'AWD',
      description: 'The pinnacle of luxury motoring — a 2025 Rolls-Royce Cullinan Series II in the bespoke Monteverde exterior with Seashell White leather throughout. This is more than an SUV; it is a statement of absolute success. The hand-crafted 6.75L twin-turbo V12 delivers 591 HP with the effortless grace that only Rolls-Royce can achieve. The Starlight Headliner illuminates 1,344 fiber-optic stars above, while the rear Viewing Suite deploys from the tailgate for the ultimate outdoor experience. Spirit of Ecstasy Illuminated, bespoke clock, and Champagne Cooler complete this rolling palace.',
      features: JSON.stringify(['6.75L Twin-Turbo V12', 'Starlight Headliner', 'Rear Viewing Suite', 'Spirit of Ecstasy Illuminated', 'Bespoke Audio System', 'Champagne Cooler', 'Night Vision with Pedestrian Warning']),
      images: JSON.stringify([
        'https://s3.amazonaws.com/dcmcarimages/car-images/Rolls-Royce/Cullinan-/681385/SLA13HA0XSU230561_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Rolls-Royce/Cullinan-/681385/SLA13HA0XSU230561_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Rolls-Royce/Cullinan-/681385/SLA13HA0XSU230561_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Rolls-Royce/Cullinan-/681385/SLA13HA0XSU230561_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Rolls-Royce/Cullinan-/681385/SLA13HA0XSU230561_5.jpg'
      ]),
      status: 'available',
      featured: 1
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
        'https://s3.amazonaws.com/dcmcarimages/car-images/Maserati/Grecale-Trofeo/668710/ZN6PMDDC5S7461816_1.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Maserati/Grecale-Trofeo/668710/ZN6PMDDC5S7461816_2.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Maserati/Grecale-Trofeo/668710/ZN6PMDDC5S7461816_3.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Maserati/Grecale-Trofeo/668710/ZN6PMDDC5S7461816_4.jpg',
        'https://s3.amazonaws.com/dcmcarimages/car-images/Maserati/Grecale-Trofeo/668710/ZN6PMDDC5S7461816_5.jpg'
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

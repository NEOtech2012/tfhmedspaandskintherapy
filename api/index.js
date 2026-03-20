// Database version 1.0 
const express = require('express');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();

// View Engine Setup
app.set('views', path.join(__dirname, '../views')); 
app.set('view engine', 'ejs');

// Middleware
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- DATABASE CONNECTION & AUTO-TABLE CREATION --- 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// This function creates the tables if they don't exist
const initDb = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT,
      selected_items TEXT,
      total_amount TEXT,
      phone_number TEXT,
      delivery_address TEXT
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      name TEXT,
      service TEXT,
      booking_date TEXT,
      phone TEXT
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      name TEXT,
      rating INTEGER,
      message TEXT
    );
  `;
  try {
    await pool.query(queryText);
    console.log("Database tables initialized successfully.");
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
};

initDb(); // Run this when the server starts

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Successfully connected to Postgres at:', res.rows[0].now);
  }
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROUTES ---

app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY id DESC LIMIT 5');
        res.render('index', { reviews: result.rows }); 
    } catch (err) {
        res.render('index', { reviews: [] });
    }
});

app.post('/submit-review', async (req, res) => {
    const { name, rating, message } = req.body;
    try {
        await pool.query(
            'INSERT INTO reviews (name, rating, message) VALUES ($1, $2, $3)',
            [name, parseInt(rating) || 5, message]
        );
        res.redirect('/');
    } catch (err) {
        console.error("Error saving review:", err);
        res.redirect('/');
    }
});

app.get('/products', (req, res) => res.render('products', { products: [] }));
app.get('/spa', (req, res) => res.render('spa')); 
app.get('/lounge', (req, res) => res.render('lounge')); 
app.get('/about-us', (req, res) => res.render('about')); 

app.post('/book-session', async (req, res) => {
    const { name, date, time, phone, treatments } = req.body;
    try {
        let selectedService = "General Appointment";
        if (treatments) {
            selectedService = Array.isArray(treatments) ? treatments.join(", ") : treatments;
        }
        await pool.query(
            'INSERT INTO bookings (name, service, booking_date, phone) VALUES ($1, $2, $3, $4)',
            [name, selectedService, date, phone]
        );
        const queryString = `?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&service=${encodeURIComponent(selectedService)}&date=${date}&time=${time}`;
        res.redirect('/spa-receipt' + queryString);
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).send("Error processing selection.");
    }
});

app.post('/submit-lounge-order', async (req, res) => {
    const { customer_name, customer_phone, items_list, total_amount, customer_address } = req.body;
    try {
        await pool.query(
            'INSERT INTO orders (customer_name, selected_items, total_amount, phone_number, delivery_address) VALUES ($1, $2, $3, $4, $5)',
            [customer_name, items_list, total_amount, customer_phone, customer_address]
        );
        const queryString = `?name=${encodeURIComponent(customer_name)}&phone=${encodeURIComponent(customer_phone)}&items=${encodeURIComponent(items_list)}&total=${total_amount}`;
        res.redirect('/payment' + queryString);
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/contact', (req, res) => res.render('contact'));

app.get('/tfh-management', async (req, res) => {
    try {
        const orders = await pool.query('SELECT * FROM orders ORDER BY id DESC');
        const bookings = await pool.query('SELECT * FROM bookings ORDER BY id DESC');
        const reviews = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
        res.render('dashboard', { 
            orders: orders.rows, 
            bookings: bookings.rows, 
            reviews: reviews.rows 
        });
    } catch (err) { 
        console.error("Error reading database", err);
        res.render('dashboard', { orders: [], bookings: [], reviews: [] }); 
    }
});

app.post('/delete-item', async (req, res) => {
    const { type, id } = req.body; 
    try {
        const tableName = type === 'orders' ? 'orders' : 'bookings';
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
        res.json({ success: true }); 
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ success: false });
    }
});

// Static Navigation Routes
app.get('/massage', (req, res) => res.render('massage'));
app.get('/consultancy', (req, res) => res.render('consultancy'));
app.get('/pedicure', (req, res) => res.render('pedicure'));
app.get('/steam-bath', (req, res) => res.render('steam-bath'));
app.get('/skin-products', (req, res) => res.render('skin-products'));
app.get('/teeth-whitening', (req, res) => res.render('teeth-whitening'));
app.get('/perfumes', (req, res) => res.render('perfumes'));
app.get('/facials', (req, res) => res.render('facials'));
app.get('/aphrodisiacs', (req, res) => res.render('aphrodisiacs'));
app.get('/training', (req, res) => res.render('training'));
app.get('/faq', (req, res) => res.render('faq')); 
app.get('/payment', (req, res) => res.render('payment')); 
app.get('/paid', (req, res) => res.render('paid'));
app.get('/thank', (req, res) => res.render('thank'));
app.get('/events', (req, res) => res.render('events'));
app.get('/spa-receipt', (req, res) => res.render('spa-receipt'));

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
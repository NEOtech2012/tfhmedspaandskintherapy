const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
// Middleware
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public'));
app.use(express.json());
app.set('view engine', 'ejs');
const multer = require('multer');

// 1. Configure where to store the images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Saves to your existing images folder
    },
    filename: (req, file, cb) => {
        // Keeps the original name but adds a timestamp to avoid duplicates
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Path to your JSON file
const reviewsPath = path.join(__dirname, 'reviews.json');

// Helper function to get reviews from the file
const getReviews = () => {
    try {
        if (!fs.existsSync(reviewsPath)) {
            fs.writeFileSync(reviewsPath, JSON.stringify([]));
        }
        const data = fs.readFileSync(reviewsPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading reviews:", err);
        return [];
    }
};

// --- ROUTES ---

// 1. Home Route (Fixes the "reviews is not defined" error)
app.get('/', (req, res) => {
    const reviewsFromFile = getReviews();
    // This MUST match the variable name in your index.ejs loop
    res.render('index', { reviews: reviewsFromFile }); 
});

// 2. Post Route (Fixes the "Cannot POST /submit-review" error)
app.post('/submit-review', (req, res) => {
    const reviews = getReviews();
    
    const newReview = {
        name: req.body.name,
        rating: parseInt(req.body.rating) || 5,
        message: req.body.message
    };

    reviews.unshift(newReview); // Add newest to the top

    try {
        fs.writeFileSync(reviewsPath, JSON.stringify(reviews, null, 2));
        console.log("Review saved to JSON!");
    } catch (err) {
        console.error("Error saving review:", err);
    }

    res.redirect('/'); // Refresh page to show the new review
});

// --- ROUTES ---

// 1. Home Route (Fixes the "reviews is not defined" error)
// Inside your server.js
// Inside your server.js
app.get('/', (req, res) => {
    const reviewsFromFile = getReviews(); // Or whatever your array is called
    res.render('index', { reviews: reviewsFromFile }); // You MUST include this object
});

// 2. Post Route (Fixes the "Cannot POST /submit-review" error)
// Add this route to your server.js
// Add this below your Home (app.get('/')) route
// Route for the Main Products page

// Route for the Spa sub-page
app.get('/products', (req, res) => {
    // You MUST pass the variable 'products' here
    res.render('products', { products: spaProducts }); 
});


app.get('/spa', (req, res) => {
    // This renders the spa.ejs file you just created
    res.render('spa'); 
});
app.get('/lounge', (req, res) => {
    res.render('lounge'); 
});
app.get('/about-us', (req, res) => {
    res.render('about'); 
});

// 1. Show the Admin Page
// 1. GET Route (The one you sent) - Works perfect!
app.get('/admin/events', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'events.json');
        let events = [];
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            events = JSON.parse(data);
        }
        res.render('admin-events', { events: events }); 
    } catch (err) {
        console.error("Error loading admin page:", err);
        res.render('admin-events', { events: [] });
    }
});

// 2. POST Route - Updated to handle the 'imageFile' from your form
// Make sure 'upload.single' matches the name "imageFile" from your EJS
app.post('/add-event', upload.single('imageFile'), (req, res) => {
    if (!req.body) {
        return res.status(400).send("Form data is missing.");
    }

    const filePath = path.join(__dirname, 'events.json');
    let events = [];

    try {
        // 1. Read existing events from the file
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf8');
            events = JSON.parse(fileData || "[]");
        }

        // 2. Create the new event object
        const newEvent = {
            id: Date.now(),
            title: req.body.title,
            date: req.body.date,
            description: req.body.description,
            image: req.file ? `/images/${req.file.filename}` : '/images/logo.jpeg'
        };

        // 3. Add to the list and SAVE back to the file
        events.unshift(newEvent); 
        fs.writeFileSync(filePath, JSON.stringify(events, null, 2), 'utf8');

        console.log("Event successfully saved!");
        res.redirect('/events'); // Now it will show up here!

    } catch (err) {
        console.error("Error saving event:", err);
        res.status(500).send("Server Error: Could not save event.");
    }
});

app.post('/delete-event', (req, res) => {
    const filePath = path.join(__dirname, 'events.json');
    const eventIndex = req.body.index;

    try {
        // 1. Read the current events
        let events = JSON.parse(fs.readFileSync(filePath, 'utf8') || "[]");

        // 2. Remove the event at the specific index
        events.splice(eventIndex, 1);

        // 3. Save the updated list back to events.json
        fs.writeFileSync(filePath, JSON.stringify(events, null, 2), 'utf8');

        console.log("Event deleted successfully!");
        res.redirect('/admin/events'); // Reload the admin page to show it's gone

    } catch (err) {
        console.error("Error deleting event:", err);
        res.status(500).send("Could not delete the event.");
    }
});

// 3. Update the Events Page Route to show the saved data
app.get('/events', (req, res) => {
    const events = JSON.parse(fs.readFileSync('events.json'));
    res.render('events', { events: events });
});

// This route handles the "Ready to Glow" form submission
app.post('/book-session', (req, res) => {
    const filePath = path.join(__dirname, 'bookings.json');
    const { name, date, time, phone, treatments } = req.body;

    try {
        let bookings = [];
        if (fs.existsSync(filePath)) {
            bookings = JSON.parse(fs.readFileSync(filePath, 'utf8') || "[]");
        }

        // 1. Check Availability (The "Taken" Check)
        const isTaken = bookings.some(b => b.date === date && b.time === time);

        if (isTaken) {
            // Send a response back saying it's taken
            return res.send(`
                <script>
                    alert("This time slot (${time}) on ${date} is already taken. Please pick another time.");
                    window.history.back();
                </script>
            `);
        }

        // 2. Logic to handle multiple services (same as before)
        let selectedService = "General Appointment";
        if (treatments) {
            selectedService = Array.isArray(treatments) ? treatments.join(", ") : treatments;
        }

        // 3. Save the new booking
        const newBooking = {
            name,
            service: selectedService,
            date,
            time,
            phone
        };

        bookings.unshift(newBooking);
        fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2));
        
        // CHANGE THIS PART: Redirect to a receipt page with the data in the URL
          const queryString = `?name=${encodeURIComponent(newBooking.name)}&phone=${encodeURIComponent(newBooking.phone)}&service=${encodeURIComponent(newBooking.service)}&date=${newBooking.date}&time=${newBooking.time}`;
          res.redirect('/spa-receipt' + queryString);

    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).send("Error processing selection.");
    }
});

// Also add a route to show the new page
app.get('/body-treatment', (req, res) => {
    res.render('body-treatment'); // This looks for body-treatment.ejs in your views folder
});

// In your server.js
// New routes to save data for the dashboard
// This route saves the order to JSON then redirects to the Payment UI
// ONE UNIFIED ROUTE FOR LOUNGE ORDERS
app.post('/submit-lounge-order', (req, res) => {
    const filePath = path.join(__dirname, 'orders.json');
    
    const newOrder = {
    id: Date.now(),
    name: req.body.customer_name,
    phone: req.body.customer_phone,
    item: req.body.items_list,
    total: req.body.total_amount,
    location: req.body.customer_address,
    // Change this line to save a clean ISO date
    date: new Date().toISOString().split('T')[0] 
};

    try {
        let orders = [];
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf8');
            orders = JSON.parse(fileData || "[]");
        }

        orders.unshift(newOrder);
        fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), 'utf8');
        
        // Redirect to /payment with the info in the URL
        const queryString = `?name=${encodeURIComponent(newOrder.name)}&phone=${encodeURIComponent(newOrder.phone)}&items=${encodeURIComponent(newOrder.item)}&total=${newOrder.total}`;
        res.redirect('/payment' + queryString);

    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).send("Internal Server Error");
    }
});


app.get('/contact', (req, res) => {
    res.render('contact');
});



// The Dashboard Route
// Change '/admin-dashboard' to '/tfh-management'
app.get('/tfh-management', (req, res) => {
    const getData = (fileName) => {
        try {
            // Use path.join to ensure the server finds the file correctly
            const filePath = path.join(__dirname, fileName);
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8') || "[]");
            }
            return [];
        } catch (err) { 
            console.error("Error reading " + fileName, err);
            return []; 
        }
    };

    res.render('dashboard', { 
        orders: getData('orders.json'), 
        bookings: getData('bookings.json'), 
        reviews: getData('reviews.json') 
    });
});
// This route sends RAW DATA to the dashboard every 10 seconds
app.get('/tfh-management-data', (req, res) => {
    try {
        const orders = JSON.parse(fs.readFileSync('orders.json', 'utf8') || "[]");
        const bookings = JSON.parse(fs.readFileSync('bookings.json', 'utf8') || "[]");
        const reviews = JSON.parse(fs.readFileSync('reviews.json', 'utf8') || "[]");
        
        res.json({ 
            orders, 
            bookings, 
            reviews,
            orderCount: orders.length, 
            bookingCount: bookings.length,
            reviewCount: reviews.length
        });
    } catch (err) {
        res.json({ orders: [], bookings: [], reviews: [], orderCount: 0, bookingCount: 0, reviewCount: 0 });
    }
});

// REPLACE your old /delete-order with this:
app.post('/delete-item', (req, res) => {
    // Now that you added express.json(), this line will work!
    const { type, index } = req.body; 
    
    const filePath = path.join(__dirname, `${type}.json`);

    try {
        let data = JSON.parse(fs.readFileSync(filePath, 'utf8') || "[]");
        data.splice(index, 1);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Return JSON success to the fetch call
        res.json({ success: true }); 
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ success: false });
    }
});
app.get('/massage', (req, res) => {
    res.render('massage');
});

app.get('/consultancy', (req, res) => {
    res.render('consultancy');
});

app.get('/pedicure', (req, res) => {
    res.render('pedicure');
});

app.get('/steam-bath', (req, res) => {
    res.render('steam-bath');
});

app.get('/skin-products', (req, res) => res.render('skin-products'));
app.get('/teeth-whitening', (req, res) => res.render('teeth-whitening'));
app.get('/perfumes', (req, res) => res.render('perfumes'));
app.get('/facials', (req, res) => res.render('facials'));
app.get('/aphrodisiacs', (req, res) => res.render('aphrodisiacs'));
app.get('/training', (req, res) => res.render('training'));

// Route for the dedicated FAQ page
app.get('/faq', (req, res) => {
    res.render('faq'); 
});

app.get('/payment', (req, res) => {
    // This loads your new views/payment.ejs file
    res.render('payment'); 
});

app.get('/paid', (req,res) => {
    // paid button for confiramation
    res.render('paid')
});

app.get('/thank', (req,res) => {
    // paid button for confiramation
    res.render('thank')
});

app.get('/spa-receipt', (req, res) => {
    res.render('spa-receipt');
});

app.post('/clear-all', (req, res) => {
    try {
        const { type } = req.body;
        if (!type) return res.status(400).json({ success: false, message: "No type provided" });

        const filePath = path.join(__dirname, `${type}.json`);
        
        // Write an empty array to the file
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
        
        console.log(`Successfully cleared ${type}.json`);
        res.json({ success: true });
    } catch (err) {
        console.error("Clear All Error:", err);
        res.status(500).json({ success: false });
    }
});

// 2. PASTE THE NEW ROUTE HERE
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`TFH MedSpa running at http://localhost:${PORT}`);
});
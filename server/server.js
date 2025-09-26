const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Set default JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-for-ticket-booking-system-2024';
  console.log('Using default JWT_SECRET. For production, set JWT_SECRET environment variable.');
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect('mongodb://localhost:27017/ticketBookingDB',
{
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

console.log('Registering /api/auth routes from', require.resolve('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/theaters', require('./routes/theaters'));
app.use('/api/cities', require('./routes/cities'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/shows', require('./routes/shows'));

const port = process.env.PORT || 3001;
app.listen(port, () => 
  console.log(`Server is running on http://localhost:${port}`)
);
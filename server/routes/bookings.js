const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('decoded token: ', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
}

// GET booked seats for a show
router.get('/booked-seats', async (req, res) => {
  const { theater, movie, screen, date, time } = req.query;
  if (!theater || !movie || !screen || !date || !time) {
    return res.status(400).json({ msg: 'Missing parameters' });
  }
  try {
    const bookings = await Booking.find({ theater, movie, screen, date, time });
    const seats = bookings.flatMap(b => b.seats);
    res.json({ seats });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET user's current (future) bookings
router.get('/user/current', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const currentBookings = await Booking.find({
      userId: req.user.userId,
      $or: [
        { date: { $gt: todayStr } },
        { 
          date: todayStr,
          time: { $gt: today.toTimeString().slice(0, 5) } // HH:MM format
        }
      ]
    }).sort({ date: 1, time: 1 });
    
    res.json({ bookings: currentBookings });
  } catch (err) {
    console.error('Error fetching current bookings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET user's past bookings
router.get('/user/past', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const pastBookings = await Booking.find({
      userId: req.user.userId,
      $or: [
        { date: { $lt: todayStr } },
        { 
          date: todayStr,
          time: { $lte: today.toTimeString().slice(0, 5) } // HH:MM format
        }
      ]
    }).sort({ date: -1, time: -1 });
    
    res.json({ bookings: pastBookings });
  } catch (err) {
    console.error('Error fetching past bookings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST book seats
router.post('/', verifyToken, async (req, res) => {
  const { theater, movie, screen, date, time, seats } = req.body;
  if (!theater || !movie || !screen || !date || !time || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ msg: 'Missing or invalid parameters' });
  }
  if (seats.length > 6) {
    return res.status(400).json({ msg: 'Cannot book more than 6 seats at once' });
  }
  try {
    // Check if the movie or theater is on hold
    const movieDoc = await Movie.findOne({ title: movie });
    if (movieDoc && movieDoc.onHold) {
        return res.status(403).json({ msg: 'This movie is temporarily on hold and cannot be booked.' });
    }

    const theaterDoc = await Theater.findOne({ name: theater });
    if (theaterDoc && theaterDoc.onHold) {
        return res.status(403).json({ msg: 'This theater is temporarily on hold and cannot be booked.' });
    }

    // Check if any of the requested seats are already booked for this show
    const existing = await Booking.find({ theater, movie, screen, date, time, seats: { $in: seats } });
    if (existing.length > 0) {
      const alreadyBooked = existing.flatMap(b => b.seats).filter(s => seats.includes(s));
      return res.status(409).json({ msg: 'Some seats already booked', seats: alreadyBooked });
    }
    // Check if user already booked any of these seats for this show
    const userExisting = await Booking.findOne({ userId: req.user.userId, theater, movie, screen, date, time, seats: { $in: seats } });
    if (userExisting) {
      return res.status(409).json({ msg: 'You have already booked some of these seats for this show' });
    }
    // Create booking
    const booking = new Booking({ userId: req.user.userId, theater, movie, screen, date, time, seats });
    await booking.save();
    res.json({ msg: 'Booking successful', booking });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
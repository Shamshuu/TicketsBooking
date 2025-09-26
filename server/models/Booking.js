const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  theater: { type: String, required: true },
  movie: { type: String, required: true },
  screen: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, required: true }, // e.g., 18:30
  seats: [{ type: String, required: true }],
  createdAt: { type: Date, default: Date.now }
});

// Prevent double-booking: unique per show+seat
BookingSchema.index({ theater: 1, movie: 1, screen: 1, date: 1, time: 1, seats: 1 }, { unique: false });

module.exports = mongoose.model('Booking', BookingSchema); 
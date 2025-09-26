const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  theaterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: true
  },
  screenName: {
    type: String,
    required: true
  },
  showDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  showTime: {
    type: String, // HH:mm
    required: true
  },
  price: {
    type: Number,
    default: 200
  },
  status: {
    type: String,
    enum: ['active', 'held', 'deleted'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Prevent overlapping shows for the same screen+date+time
showSchema.index({ theaterId: 1, screenName: 1, showDate: 1, showTime: 1 }, { unique: true });

module.exports = mongoose.model('Show', showSchema);

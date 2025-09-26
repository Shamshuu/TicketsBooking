const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema({
    screen_name: String,
    now_playing: String,
    price: {
        type: Number,
        default: 200
    },
    status: {
        type: String,
        enum: ['active', 'held', 'deleted'],
        default: 'active'
    }
}, { _id: false });

const theaterSchema = new mongoose.Schema(
{
    name: String,
    photo_url: String,
    address: String,
    price: {
        type: Number,
        default: 200
    },
    screens: [screenSchema],
    onHold: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'held', 'deleted'],
        default: 'active'
    }
});
module.exports = mongoose.model('Theater', theaterSchema);
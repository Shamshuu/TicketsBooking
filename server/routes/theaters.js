const express = require('express');
const router = express.Router();
const Theater = require('../models/Theater');
const ShowSchedule = require('../models/ShowSchedule');
const Booking = require('../models/Booking');
const upload = require('../middleware/upload');
const verifyAdmin = require('../middleware/adminAuth');
const fs = require('fs');
const path = require('path');

// GET all theaters (public)
router.get('/', async (req, res) => {
    try {
        const theaters = await Theater.find();
        res.json(theaters);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// GET theater by ID (public)
router.get('/:id', async (req, res) => {
    try {
        const theater = await Theater.findById(req.params.id);
        if (!theater) {
            return res.status(404).json({ msg: 'Theater not found' });
        }
        res.json(theater);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// POST new theater (admin only)
router.post('/', verifyAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { name, address, price } = req.body;
        
        if (!name || !address) {
            return res.status(400).json({ msg: 'Name and address are required' });
        }

        let photoUrl = 'posters/fallbacktheater.jpg';
        if (req.file) {
            photoUrl = `uploads/${req.file.filename}`;
        }

        const theater = new Theater({
            name,
            address,
            photo_url: photoUrl,
            price: price || 200,
            screens: []
        });

        await theater.save();
        res.status(201).json(theater);
    } catch (err) {
        console.error('Add theater error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// PUT toggle onHold status for a theater (admin only)
router.put('/:id/hold', verifyAdmin, async (req, res) => {
    try {
        const theater = await Theater.findById(req.params.id);
        if (!theater) {
            return res.status(404).json({ msg: 'Theater not found' });
        }
        theater.onHold = !theater.onHold;
        await theater.save();
        res.json(theater);
    } catch (err) {
        console.error('Toggle theater hold status error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// PUT update theater (admin only)
router.put('/:id', verifyAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { name, address, price } = req.body;
        const theaterId = req.params.id;

        const theater = await Theater.findById(theaterId);
        if (!theater) {
            return res.status(404).json({ msg: 'Theater not found' });
        }

        // Update fields
        if (name) theater.name = name;
        if (address) theater.address = address;
        if (price) theater.price = price;

        // Handle photo upload
        if (req.file) {
            // Delete old photo if it's not the fallback
            if (theater.photo_url && !theater.photo_url.includes('fallbacktheater.jpg')) {
                const oldPhotoPath = path.join(__dirname, '../../public', theater.photo_url);
                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                }
            }
            theater.photo_url = `uploads/${req.file.filename}`;
        }

        await theater.save();
        res.json(theater);
    } catch (err) {
        console.error('Update theater error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// DELETE theater (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const theaterId = req.params.id;

        const theater = await Theater.findById(theaterId);
        if (!theater) {
            return res.status(404).json({ msg: 'Theater not found' });
        }

        // Check if theater has any bookings (safe deletion)
        const bookings = await Booking.find({ theater: theater.name });
        if (bookings.length > 0) {
            return res.status(400).json({ 
                msg: 'Cannot delete theater with existing bookings. Refunds would be required.',
                bookingsCount: bookings.length
            });
        }

        // Delete related show schedules
        await ShowSchedule.deleteMany({ theaterId });

        // Delete photo file if not fallback
        if (theater.photo_url && !theater.photo_url.includes('fallbacktheater.jpg')) {
            const photoPath = path.join(__dirname, '../../public', theater.photo_url);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }

        await Theater.findByIdAndDelete(theaterId);
        res.json({ msg: 'Theater deleted successfully' });
    } catch (err) {
        console.error('Delete theater error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Add a new screen to a theater (admin only)
router.post('/:id/screens', verifyAdmin, async (req, res) => {
    try {
        const { screen_name } = req.body;
        if (!screen_name) return res.status(400).json({ msg: 'screen_name is required' });
        const theater = await Theater.findById(req.params.id);
        if (!theater) return res.status(404).json({ msg: 'Theater not found' });
        if (theater.screens.some(s => s.screen_name === screen_name)) {
            return res.status(400).json({ msg: 'Screen name already exists in this theater' });
        }
        // Always set all properties for consistency
        theater.screens.push({ screen_name, now_playing: '', price: 200, status: 'active' });
        await theater.save();
        res.json(theater);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// Assign a movie to a screen (admin only)
router.put('/:id/screens/:screen_name/assign', verifyAdmin, async (req, res) => {
    try {
        const { movie_title } = req.body;
        if (!movie_title) return res.status(400).json({ msg: 'movie_title is required' });
        const theater = await Theater.findById(req.params.id);
        if (!theater) return res.status(404).json({ msg: 'Theater not found' });
        const screen = theater.screens.find(s => s.screen_name === req.params.screen_name);
        if (!screen) return res.status(404).json({ msg: 'Screen not found' });
        screen.now_playing = movie_title;
        await theater.save();
        res.json(theater);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// Delete a screen from a theater (admin only)
router.delete('/:id/screens/:screen_name', verifyAdmin, async (req, res) => {
    try {
        const { id, screen_name } = req.params;
        const theater = await Theater.findById(id);
        if (!theater) return res.status(404).json({ msg: 'Theater not found' });
        const screenIndex = theater.screens.findIndex(s => s.screen_name === screen_name);
        if (screenIndex === -1) {
            return res.status(404).json({ msg: 'Screen not found in this theater' });
        }
        theater.screens.splice(screenIndex, 1);
        await theater.save();
        // Delete all shows for this screen in this theater
        await ShowSchedule.deleteMany({ theaterId: id, screen: screen_name });
        res.json(theater);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// Remove assigned movie from a screen (admin only)
router.put('/:id/screens/:screen_name/remove-movie', verifyAdmin, async (req, res) => {
    try {
        const theater = await Theater.findById(req.params.id);
        if (!theater) return res.status(404).json({ msg: 'Theater not found' });
        const screen = theater.screens.find(s => s.screen_name === req.params.screen_name);
        if (!screen) return res.status(404).json({ msg: 'Screen not found' });
        screen.now_playing = '';
        await theater.save();
        res.json({ success: true, msg: 'Movie removed from screen.' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
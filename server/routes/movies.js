const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const ShowSchedule = require('../models/ShowSchedule');
const Booking = require('../models/Booking');
const upload = require('../middleware/upload');
const verifyAdmin = require('../middleware/adminAuth');
const fs = require('fs');
const path = require('path');
console.log('Movies routes loaded');

// GET all movies (public)
router.get('/', async (req, res) => {
    try {
        const movies = await Movie.find();
        res.json(movies);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// GET movie by ID (public)
router.get('/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ msg: 'Movie not found' });
        }
        res.json(movie);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// POST new movie (admin only)
router.post('/', verifyAdmin, upload.single('poster'), async (req, res) => {
    try {
        const { title, synopsis, price } = req.body;
        
        if (!title || !synopsis) {
            return res.status(400).json({ msg: 'Title and synopsis are required' });
        }

        let posterUrl = 'posters/fallback.jpg';
        if (req.file) {
            posterUrl = `uploads/${req.file.filename}`;
        }

        const movie = new Movie({
            title,
            synopsis,
            poster_url: posterUrl,
            price: price || 200
        });

        await movie.save();
        res.status(201).json(movie);
    } catch (err) {
        console.error('Add movie error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// PUT toggle onHold status for a movie (admin only)
router.put('/:id/hold', verifyAdmin, async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ msg: 'Movie not found' });
        }
        movie.onHold = !movie.onHold;
        await movie.save();
        res.json(movie);
    } catch (err) {
        console.error('Toggle movie hold status error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// PUT update movie (admin only)
router.put('/:id', verifyAdmin, upload.single('poster'), async (req, res) => {
    try {
        const { title, synopsis, price } = req.body;
        const movieId = req.params.id;

        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ msg: 'Movie not found' });
        }

        // Update fields
        if (title) movie.title = title;
        if (synopsis) movie.synopsis = synopsis;
        if (price) movie.price = price;

        // Handle poster upload
        if (req.file) {
            // Delete old poster if it's not the fallback
            if (movie.poster_url && !movie.poster_url.includes('fallback.jpg')) {
                const oldPosterPath = path.join(__dirname, '../../public', movie.poster_url);
                if (fs.existsSync(oldPosterPath)) {
                    fs.unlinkSync(oldPosterPath);
                }
            }
            movie.poster_url = `uploads/${req.file.filename}`;
        }

        await movie.save();
        res.json(movie);
    } catch (err) {
        console.error('Update movie error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// DELETE movie (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const movieId = req.params.id;

        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ msg: 'Movie not found' });
        }

        // Check if movie has any bookings (safe deletion)
        const bookings = await Booking.find({ movie: movie.title });
        if (bookings.length > 0) {
            return res.status(400).json({ 
                msg: 'Cannot delete movie with existing bookings. Refunds would be required.',
                bookingsCount: bookings.length
            });
        }

        // Delete related show schedules
        await ShowSchedule.deleteMany({ movieId });

        // Clear now_playing from all screens in all theaters (case-insensitive, trimmed)
        const Theater = require('../models/Theater');
        const movieTitleNorm = movie.title.trim().toLowerCase();
        const theaters = await Theater.find({ 'screens.now_playing': { $ne: '' } });

        // Debug: print all now_playing values for all screens in all theaters
        theaters.forEach(theater => {
            theater.screens.forEach(screen => {
                console.log(`[DEBUG] Theater: '${theater.name}', Screen: '${screen.screen_name}', now_playing: '${screen.now_playing}'`);
            });
        });
        for (const theater of theaters) {
            let updated = false;
            theater.screens.forEach(screen => {
                if (screen.now_playing && screen.now_playing.trim().toLowerCase() === movieTitleNorm) {
                    console.log(`Clearing now_playing for screen '${screen.screen_name}' in theater '${theater.name}' (was: '${screen.now_playing}')`);
                    screen.now_playing = '';
                    updated = true;
                }
            });
            if (updated) {
                theater.markModified('screens');
                await theater.save();
                console.log(`Updated theater '${theater.name}' screens after movie delete.`);
            }
        }

        // Delete poster file if not fallback
        if (movie.poster_url && !movie.poster_url.includes('fallback.jpg')) {
            const posterPath = path.join(__dirname, '../../public', movie.poster_url);
            if (fs.existsSync(posterPath)) {
                fs.unlinkSync(posterPath);
            }
        }

        await Movie.findByIdAndDelete(movieId);
        res.json({ msg: 'Movie deleted successfully' });
    } catch (err) {
        console.error('Delete movie error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const ShowSchedule = require('../models/ShowSchedule');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const verifyAdmin = require('../middleware/adminAuth');

// GET all show schedules (public)
router.get('/', async (req, res) => {
    try {
        const shows = await ShowSchedule.find()
            .populate('movieId', 'title poster_url synopsis')
            .populate('theaterId', 'name address photo_url');
        res.json(shows);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// GET shows by movie-theater combination (public)
router.get('/movie-theater/:movieId/:theaterId', async (req, res) => {
    try {
        const { movieId, theaterId } = req.params;
        const shows = await ShowSchedule.find({ movieId, theaterId })
            .populate('movieId', 'title poster_url synopsis')
            .populate('theaterId', 'name address photo_url')
            .sort({ date: 1, time: 1 });
        res.json(shows);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// POST new show schedule (admin only)
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { movieId, theaterId, screen, times, dates, price, status, tags } = req.body;
        const adminId = req.user && req.user._id;
        
        if (!movieId || !theaterId || !screen || !times || !dates || !price) {
            return res.status(400).json({ msg: 'All fields are required' });
        }

        // Validate movie and theater exist
        const movie = await Movie.findById(movieId);
        const theater = await Theater.findById(theaterId);
        
        if (!movie || !theater) {
            return res.status(404).json({ msg: 'Movie or theater not found' });
        }

        const createdShows = [];
        const errors = [];

        // Create shows for each date and time combination
        for (const dateStr of dates) {
            const date = new Date(dateStr);
            for (const time of times) {
                try {
                    const show = new ShowSchedule({
                        movieId,
                        theaterId,
                        screen,
                        time,
                        date,
                        price,
                        status: status || 'active',
                        tags: tags || [],
                        modifiedBy: adminId
                    });
                    await show.save();
                    createdShows.push(show);
                } catch (err) {
                    if (err.code === 11000) {
                        errors.push(`Show already exists for ${dateStr} at ${time}`);
                    } else {
                        errors.push(`Error creating show for ${dateStr} at ${time}`);
                    }
                }
            }
        }

        if (createdShows.length === 0) {
            return res.status(400).json({ 
                msg: 'No shows were created',
                errors 
            });
        }

        res.status(201).json({
            msg: `Created ${createdShows.length} shows successfully`,
            shows: createdShows,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error('Add show error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// GET shows by movie (admin)
router.get('/admin', verifyAdmin, async (req, res) => {
    try {
        const { movieId } = req.query;
        if (!movieId) return res.status(400).json({ msg: 'movieId is required' });
        const shows = await ShowSchedule.find({ movieId })
            .populate('movieId', 'title poster_url synopsis')
            .populate('theaterId', 'name address photo_url');
        res.json(shows);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// PUT update show schedule (admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const { time, date, price, status, tags, screen } = req.body;
        const showId = req.params.id;
        const adminId = req.user && req.user._id;

        const show = await ShowSchedule.findById(showId);
        if (!show) {
            return res.status(404).json({ msg: 'Show not found' });
        }

        // Update fields
        if (time) show.time = time;
        if (date) show.date = new Date(date);
        if (price) show.price = price;
        if (typeof status === 'string') show.status = status;
        if (Array.isArray(tags)) show.tags = tags;
        if (screen) show.screen = screen;
        if (adminId) show.modifiedBy = adminId;

        await show.save();
        res.json(show);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Show already exists for this screen, date, and time.' });
        }
        console.error('Update show error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// DELETE show schedule (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const showId = req.params.id;

        const show = await ShowSchedule.findById(showId);
        if (!show) {
            return res.status(404).json({ msg: 'Show not found' });
        }

        await ShowSchedule.findByIdAndDelete(showId);
        res.json({ msg: 'Show deleted successfully' });
    } catch (err) {
        console.error('Delete show error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// DELETE all shows for a movie-theater combination (admin only)
router.delete('/movie-theater/:movieId/:theaterId', verifyAdmin, async (req, res) => {
    try {
        const { movieId, theaterId } = req.params;

        const deletedShows = await ShowSchedule.deleteMany({ movieId, theaterId });
        res.json({ 
            msg: `Deleted ${deletedShows.deletedCount} shows successfully` 
        });
    } catch (err) {
        console.error('Delete shows error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// GET available screens for a theater, date, and time (admin only)
router.get('/admin/screens/available', verifyAdmin, async (req, res) => {
    try {
        const { theaterId, date, time } = req.query;
        if (!theaterId || !date || !time) {
            return res.status(400).json({ msg: 'theaterId, date, and time are required' });
        }
        const theater = await Theater.findById(theaterId);
        if (!theater) return res.status(404).json({ msg: 'Theater not found' });
        // Find all shows for this theater, date, and time
        const bookedShows = await ShowSchedule.find({
            theaterId,
            date: new Date(date),
            time
        });
        const bookedScreens = bookedShows.map(s => s.screen);
        // Only return screens not already booked
        const availableScreens = theater.screens.filter(screenObj => !bookedScreens.includes(screenObj.screen_name));
        res.json(availableScreens);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router; 
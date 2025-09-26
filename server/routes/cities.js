const express = require('express');
const router = express.Router();
const cities = require('../models/City');
const City = require('../models/City');

router.get('/', async (req, res) => 
{
    const cities = await City.find();
    res.json(cities);
});
module.exports = router;
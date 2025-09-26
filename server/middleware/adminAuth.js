const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ msg: 'No token, authorization denied' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if user exists and is admin
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ msg: 'User not found' });
        }
        
        if (!user.isAdmin) {
            return res.status(403).json({ msg: 'Admin access required' });
        }
        
        req.user = decoded;
        req.adminUser = user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = verifyAdmin; 
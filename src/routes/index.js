const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const friendRoutes = require('./friendRoutes');
const groupRoutes = require('./groupRoutes');
const gasRoutes = require('./gasSponsor');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Mount route modules
router.use('/users', userRoutes);
router.use('/friends', friendRoutes);
router.use('/groups', groupRoutes);
router.use('/gasSponsor', gasRoutes);

module.exports = router;
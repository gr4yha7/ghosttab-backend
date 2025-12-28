const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const friendRoutes = require('./friendRoutes');
const groupRoutes = require('./groupRoutes');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Mount route modules
router.use('/users', userRoutes);
router.use('/friends', friendRoutes);
router.use('/groups', groupRoutes);

module.exports = router;
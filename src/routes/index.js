const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const friendRoutes = require('./friendRoutes');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Mount route modules
router.use('/users', userRoutes);
router.use('/friends', friendRoutes);

module.exports = router;
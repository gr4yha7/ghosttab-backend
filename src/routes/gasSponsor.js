const express = require('express');
const router = express.Router();
const gasSponsorController = require('../controllers/gasSponsorController');

router.post('/sponsorAndSubmitTx', gasSponsorController.sponsorGasTransaction);

module.exports = router;
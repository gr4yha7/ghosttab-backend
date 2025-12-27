const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authRequest,  validateUser} = require('../middleware/validateRequest');

router.get('/get-user-friends', [authRequest, validateUser], friendController.getUserFriends);
router.get('/get-pending-requests', [authRequest, validateUser], friendController.getPendingRequests);
router.post('/cancel-request', [authRequest, validateUser], friendController.cancelRequest);
router.put('/accept-request', [authRequest, validateUser], friendController.acceptRequest);

module.exports = router;
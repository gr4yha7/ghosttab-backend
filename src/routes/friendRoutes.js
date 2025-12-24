const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { validateRequest } = require('../middleware/validateRequest');

router.get('/get-user-friends', friendController.getUserFriends);
router.get('/get-pending-requests', friendController.getPendingRequests);
router.post('/cancel-request', validateRequest, friendController.cancelRequest);
router.put('/accept-request', validateRequest, friendController.acceptRequest);
router.delete('/remove-friend', validateRequest, friendController.removeFriend);

module.exports = router;
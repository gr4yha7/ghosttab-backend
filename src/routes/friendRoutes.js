const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authRequest} = require('../middleware/validateRequest');

router.get('/get-user-friends', authRequest, friendController.getUserFriends);
router.get('/get-pending-requests', authRequest, friendController.getPendingRequests);
router.delete('/cancel-request', authRequest, friendController.cancelRequest);
router.put('/accept-request', authRequest, friendController.acceptRequest);
router.post('/send-request', authRequest, friendController.sendRequest);

module.exports = router;
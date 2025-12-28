const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authRequest } = require('../middleware/validateRequest');

// Get all groups where the user is a member
router.get('/get-user-groups', authRequest, groupController.getUserGroups);

// Create a new group
router.post('/create', authRequest, groupController.createGroup);

// Add a member to a group
router.post('/add-member', authRequest, groupController.addGroupMember);

// Remove a member from a group
router.delete('/remove-member', authRequest, groupController.removeGroupMember);

// Add or remove group admin status
router.put('/update-admin', authRequest, groupController.addOrRemoveGroupAdmin);

module.exports = router;

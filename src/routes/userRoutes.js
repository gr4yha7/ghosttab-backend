const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authRequest,  validateUser } = require('../middleware/validateRequest');

router.get('/', userController.getAllUsers);
router.get('/get_user', userController.getUserById);
router.put('/update', [authRequest, validateUser], userController.updateUser);

module.exports = router;
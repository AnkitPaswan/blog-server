const express = require('express');
const router = express.Router();
const { login, register, getProfile, verifyToken } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/profile', verifyToken, getProfile);

module.exports = router;


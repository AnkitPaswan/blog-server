const express = require('express');
const router = express.Router();
const { login, register, getProfile, logout, verifyToken } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.post('/logout', verifyToken, logout);
router.get('/profile', verifyToken, getProfile);

module.exports = router;


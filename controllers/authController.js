const bcrypt = require('bcryptjs');
const User = require('../models/UserSchema');
const sessionService = require("../services/sessionService");

// Login with session management
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate token using session service
    const token = sessionService.generateToken({ 
      id: user._id, 
      username: user.username, 
      role: user.role 
    });

    // Create session in Redis
    await sessionService.createSession(user._id.toString(), {
      username: user.username,
      role: user.role,
      loginTime: new Date().toISOString()
    });

    res.json({ 
      token, 
      user: { id: user._id, username: user.username, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Register with session management
const register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || 'user'
    });

    const savedUser = await newUser.save();

    // Generate token using session service
    const token = sessionService.generateToken({ 
      id: savedUser._id, 
      username: savedUser.username, 
      role: savedUser.role 
    });

    // Create session in Redis
    await sessionService.createSession(savedUser._id.toString(), {
      username: savedUser.username,
      role: savedUser.role,
      loginTime: new Date().toISOString()
    });

    res.status(201).json({
      token,
      user: { id: savedUser._id, username: savedUser.username, role: savedUser.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get profile
const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

// Logout with token blacklisting
const logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      // Blacklist the token
      await sessionService.blacklistToken(token);
    }

    // Optionally delete session
    if (req.user && req.user.id) {
      await sessionService.deleteSession(req.user.id);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify token middleware with session and blacklist check
const verifyToken = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    // Check if token is blacklisted
    const isBlacklisted = await sessionService.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    // Verify token using session service
    const verified = sessionService.verifyToken(token);
    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  logout,
  verifyToken
};


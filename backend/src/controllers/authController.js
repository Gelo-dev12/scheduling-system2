const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT and set cookie
const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('jwt', token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
  });
};

const authController = {
  // Signup
  async signup(req, res) {
    try {
      const { email, fullname, phoneNumber, password, profilePic } = req.body;
      if (!email || !fullname || !phoneNumber || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: 'User already exists' });
      }
      const user = new User({
        email,
        name: fullname,
        phone: phoneNumber,
        password,
        profilePic
      });
      await user.save();
      generateToken(user._id, res);
      res.status(201).json({
        message: 'Signup successful',
        user: user.getPublicProfile()
      });
    } catch (error) {
      res.status(500).json({ error: 'Signup failed', details: error.message });
    }
  },

  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // Generate JWT and set cookie
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('jwt', token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV !== 'development',
      });
      // Return token in response body for mobile clients
      res.json({
        message: 'Login successful',
        user: user.getPublicProfile(),
        token
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed', details: error.message });
    }
  },

  // Logout
  logout(req, res) {
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV !== 'development',
    });
    res.json({ message: 'Logged out successfully' });
  },
};

module.exports = authController;

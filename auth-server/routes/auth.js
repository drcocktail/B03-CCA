const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const uuid = require('uuid');
const User = require('../models/User');
const Session = require('../models/Session');

const router = express.Router();

// Signup Route
router.post('/signup', [
  check('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, password: hashedPassword });
    await user.save();

    const sessionId = uuid.v4();
    const session = new Session({ sessionId, userId: user._id });
    await session.save();

    res.cookie('sessionId', sessionId, { httpOnly: true });
    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Login Route
router.post('/login', [
  check('username').exists().withMessage('Username is required'),
  check('password').exists().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const sessionId = uuid.v4();
    const session = new Session({ sessionId, userId: user._id });
    await session.save();

    res.cookie('sessionId', sessionId, { httpOnly: true });
    res.json({ msg: 'Login successful' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Logout Route
router.post('/logout', async (req, res) => {
  const { sessionId } = req.cookies;

  if (!sessionId) {
    return res.status(400).json({ msg: 'No session found' });
  }

  try {
    await Session.findOneAndDelete({ sessionId });
    res.clearCookie('sessionId');
    res.json({ msg: 'Logout successful' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;

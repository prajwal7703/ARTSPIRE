const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Artist = require('../models/Artist');

router.get('/artists/all', async (req, res) => {
  try {
    const artists = await User.find({ role: 'artist' });
    res.json(artists);
  } catch (err) { res.status(500).json(err); }
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) { res.status(500).json(err); }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json(err); }
});

module.exports = router;

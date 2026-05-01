const User = require('../models/User');

// Get all users except the logged-in user
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get logged-in user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Find user by email (for new chat)
exports.findByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const found = await User.findOne({ email: email.toLowerCase() }).select('-password');
    if (!found) return res.status(404).json({ message: 'not_registered' });
    if (found._id.toString() === req.userId)
      return res.status(400).json({ message: 'self' });

    res.json(found);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update profile — username, tagline, avatar
exports.updateProfile = async (req, res) => {
  try {
    const { username, tagline, avatar } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updates = {};

    if (username && username.trim() !== user.username) {
      const taken = await User.findOne({ username: username.trim(), _id: { $ne: req.userId } });
      if (taken) return res.status(409).json({ message: 'Username already taken' });
      updates.username = username.trim();
    }

    if (tagline !== undefined) updates.tagline = tagline.slice(0, 139);
    if (avatar  !== undefined) updates.avatar  = avatar;

    // Use findByIdAndUpdate to avoid triggering the password pre-save hook
    const updated = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: false }
    ).select('-password');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

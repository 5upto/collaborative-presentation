const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/presentation/:presentationId', async (req, res) => {
  try {
    const users = await User.getActiveUsers(req.params.presentationId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/presentation/:presentationId/:nickname/role', async (req, res) => {
  try {
    const { role } = req.body;
    await User.updateRole(req.params.presentationId, req.params.nickname, role);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
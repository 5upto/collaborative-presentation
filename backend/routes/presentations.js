const express = require('express');
const router = express.Router();
const Presentation = require('../models/Presentation');
const Slide = require('../models/Slide');

router.get('/', async (req, res) => {
  try {
    const presentations = await Presentation.getAll();
    res.json(presentations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, creatorNickname } = req.body;
    const presentationId = await Presentation.create(title, creatorNickname);
    
    await Slide.create(presentationId, 0);
    
    res.json({ id: presentationId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const presentation = await Presentation.getById(req.params.id);
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json(presentation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Presentation.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
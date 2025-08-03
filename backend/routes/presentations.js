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

router.put('/:id', async (req, res) => {
  try {
    const { title, updated_at } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const presentation = await Presentation.getById(req.params.id);
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    
    await Presentation.update(req.params.id, title, updated_at);
    res.json({ success: true, message: 'Presentation updated successfully' });
  } catch (error) {
    console.error('Error updating presentation:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { creatorNickname } = req.body;
    
    // Get presentation to verify creator
    const presentation = await Presentation.getById(req.params.id);
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    
    // Check if the requester is the creator
    if (presentation.creator_nickname !== creatorNickname) {
      return res.status(403).json({ error: 'Only the creator can delete this presentation' });
    }
    
    await Presentation.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
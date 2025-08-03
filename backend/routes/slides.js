const express = require('express');
const router = express.Router();
const Slide = require('../models/Slide');
const Element = require('../models/Element');

router.get('/presentation/:presentationId', async (req, res) => {
  try {
    const slides = await Slide.getByPresentationId(req.params.presentationId);
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { presentationId, order } = req.body;
    const slideId = await Slide.create(presentationId, order);
    res.json({ id: slideId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { elements } = req.body;

    // Update slide timestamp
    await Slide.update(req.params.id);

    // Clear existing elements and save new ones
    await Element.deleteBySlideId(req.params.id);

    if (elements && elements.length > 0) {
      for (const element of elements) {
        // Ensure all required properties are present
        const elementData = {
          type: element.type,
          x: Number(element.x) || 0,
          y: Number(element.y) || 0,
          width: Number(element.width) || 100,
          height: Number(element.height) || 50,
          content: typeof element.content === 'object' ? element.content : {},
          styles: typeof element.styles === 'object' ? element.styles : {},
          zIndex: Number(element.zIndex || element.z_index) || 1
        };

        await Element.create(req.params.id, elementData);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating slide:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Slide.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:slideId/elements', async (req, res) => {
  try {
    const elementId = await Element.create(req.params.slideId, req.body);
    res.json({ id: elementId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/elements/:elementId', async (req, res) => {
  try {
    await Element.update(req.params.elementId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/elements/:elementId', async (req, res) => {
  try {
    await Element.delete(req.params.elementId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
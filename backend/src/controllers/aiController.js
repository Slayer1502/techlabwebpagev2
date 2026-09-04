const aiService = require('../services/aiService');

const generateImage = async (req, res) => {
  const { name, type, description } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and Type are required' });
  }

  try {
    const imageUrl = await aiService.generateProductImage(name, type, description);
    res.json({ imageUrl });
  } catch (err) {
    console.error('AI Image Error:', err.message);
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
};

module.exports = {
  generateImage
};

const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
    cb(null, true);
  },
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Pull valid JSON out of whatever Claude returns — handles markdown fences and extra text
function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  const braces = text.match(/\{[\s\S]*\}/);
  if (braces) { try { return JSON.parse(braces[0]); } catch {} }
  throw new SyntaxError('No valid JSON found in response');
}

// POST /analyze/photo
router.post('/photo', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  if (!router._usage) router._usage = {};
  const key = `${req.user.id}_${new Date().toISOString().slice(0, 10)}`;
  router._usage[key] = (router._usage[key] || 0) + 1;
  if (router._usage[key] > 5) {
    return res.status(429).json({ error: 'Daily photo analysis limit reached (5/day)' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: req.file.mimetype, data: req.file.buffer.toString('base64') } },
          { type: 'text', text: `Analyze this food photo and estimate total nutrition for the entire portion shown.
Return a JSON object only — no markdown, no explanation, just raw JSON:
{"name":"brief food description","calories":number,"protein":number,"carbs":number,"fat":number,"confidence":"high|medium|low"}
All numbers in grams, rounded to 1 decimal place.` },
        ],
      }],
    });

    const json = extractJson(message.content[0].text.trim());
    if (!json.name || json.calories == null) return res.status(500).json({ error: 'Could not identify food in image' });
    res.json(json);
  } catch (err) {
    console.error('Photo analysis error:', err.message);
    res.status(500).json({ error: 'Analysis failed — try again or enter values manually' });
  }
});

// POST /analyze/text — accepts flexible amounts: "150g", "1 cup", "2 tbsp", "1 large piece", etc.
router.post('/text', async (req, res) => {
  const { food, amount } = req.body;
  if (!food) return res.status(400).json({ error: 'food name required' });

  const portion = amount ? `${amount}` : '1 typical serving';

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Estimate nutrition for: ${food}, ${portion}.
If amount is a volume (cup, tbsp, ml) or count (piece, slice, medium), convert to grams then estimate.
Return a JSON object only — no markdown, no explanation, just raw JSON:
{"name":"descriptive food name","grams":number,"calories":number,"protein":number,"carbs":number,"fat":number}
All numbers rounded to 1 decimal place.`,
      }],
    });

    const json = extractJson(message.content[0].text.trim());
    res.json(json);
  } catch (err) {
    console.error('Text analysis error:', err.message);
    res.status(500).json({ error: 'Analysis failed — try again or enter values manually' });
  }
});

module.exports = router;

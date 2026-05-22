const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const db = getDb();
  const targets = db.prepare('SELECT calories, protein, carbs, fat FROM targets WHERE user_id = ?').get(req.user.id);
  res.json(targets || { calories: 2000, protein: 150, carbs: 200, fat: 65 });
});

router.put('/', (req, res) => {
  const { calories, protein, carbs, fat } = req.body;
  if (!calories || !protein || !carbs || !fat) {
    return res.status(400).json({ error: 'All macro targets required' });
  }
  const db = getDb();
  db.prepare(`
    UPDATE targets SET calories = ?, protein = ?, carbs = ?, fat = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(calories, protein, carbs, fat, req.user.id);
  res.json({ calories, protein, carbs, fat });
});

module.exports = router;

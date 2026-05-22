const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /summary?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const db = getDb();

  const targets = db.prepare('SELECT calories, protein, carbs, fat FROM targets WHERE user_id = ?').get(req.user.id)
    || { calories: 2000, protein: 150, carbs: 200, fat: 65 };

  const consumed = db.prepare(`
    SELECT
      COALESCE(SUM(calories), 0) as calories,
      COALESCE(SUM(protein), 0) as protein,
      COALESCE(SUM(carbs), 0) as carbs,
      COALESCE(SUM(fat), 0) as fat
    FROM meals WHERE user_id = ? AND DATE(logged_at) = ?
  `).get(req.user.id, date);

  const streak = db.prepare('SELECT current_streak, longest_streak FROM streaks WHERE user_id = ?').get(req.user.id)
    || { current_streak: 0, longest_streak: 0 };

  res.json({
    date,
    targets,
    consumed,
    remaining: {
      calories: Math.max(0, targets.calories - consumed.calories),
      protein: Math.max(0, targets.protein - consumed.protein),
      carbs: Math.max(0, targets.carbs - consumed.carbs),
      fat: Math.max(0, targets.fat - consumed.fat),
    },
    streak,
  });
});

module.exports = router;

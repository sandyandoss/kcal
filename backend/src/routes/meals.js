const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /meals?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const db = getDb();
  const meals = db.prepare(`
    SELECT id, name, meal_type, grams, calories, protein, carbs, fat, logged_at
    FROM meals
    WHERE user_id = ? AND DATE(logged_at) = ?
    ORDER BY logged_at ASC
  `).all(req.user.id, date);
  res.json(meals);
});

// POST /meals
router.post('/', (req, res) => {
  const { name, meal_type, grams, calories, protein, carbs, fat } = req.body;
  if (!name || !meal_type || calories == null) {
    return res.status(400).json({ error: 'name, meal_type, and calories required' });
  }
  const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (!validTypes.includes(meal_type)) {
    return res.status(400).json({ error: 'meal_type must be breakfast, lunch, dinner, or snack' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO meals (user_id, name, meal_type, grams, calories, protein, carbs, fat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, meal_type, grams || null, calories, protein || 0, carbs || 0, fat || 0);

  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid);

  updateStreak(req.user.id, db);

  res.status(201).json(meal);
});

// PUT /meals/:id — edit an existing meal
router.put('/:id', (req, res) => {
  const { name, meal_type, grams, calories, protein, carbs, fat } = req.body;
  if (!name || !meal_type || calories == null) {
    return res.status(400).json({ error: 'name, meal_type, and calories required' });
  }
  const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (!validTypes.includes(meal_type)) {
    return res.status(400).json({ error: 'Invalid meal type' });
  }
  const db = getDb();
  const meal = db.prepare('SELECT id FROM meals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!meal) return res.status(404).json({ error: 'Meal not found' });

  db.prepare(`
    UPDATE meals SET name = ?, meal_type = ?, grams = ?, calories = ?, protein = ?, carbs = ?, fat = ?
    WHERE id = ?
  `).run(name, meal_type, grams || null, calories, protein || 0, carbs || 0, fat || 0, req.params.id);

  const updated = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
  updateStreak(req.user.id, db);
  res.json(updated);
});

// DELETE /meals/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const meal = db.prepare('SELECT id FROM meals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!meal) return res.status(404).json({ error: 'Meal not found' });
  db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function updateStreak(userId, db) {
  const today = new Date().toISOString().slice(0, 10);
  const targets = db.prepare('SELECT calories FROM targets WHERE user_id = ?').get(userId);
  if (!targets) return;

  const totals = db.prepare(`
    SELECT COALESCE(SUM(calories), 0) as total
    FROM meals WHERE user_id = ? AND DATE(logged_at) = ?
  `).get(userId, today);

  if (totals.total >= targets.calories * 0.9) {
    const streak = db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(userId);
    if (!streak) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newStreak = streak.last_hit_date === yesterday ? streak.current_streak + 1 : 1;
    if (streak.last_hit_date === today) newStreak = streak.current_streak;

    const longest = Math.max(newStreak, streak.longest_streak);
    db.prepare(`
      UPDATE streaks SET current_streak = ?, longest_streak = ?, last_hit_date = ?
      WHERE user_id = ?
    `).run(newStreak, longest, today, userId);
  }
}

module.exports = router;

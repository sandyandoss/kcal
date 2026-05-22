const Meals = (() => {
  const ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
  const ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

  function renderMeals(meals, onDelete, onEdit) {
    const section = document.getElementById('meals-section');
    section.innerHTML = '';

    if (meals.length === 0) {
      section.innerHTML = `
        <div class="empty-day">
          <div class="empty-day-icon">🥗</div>
          <p>Nothing logged yet — tap <b>Log a meal</b> to start.</p>
        </div>`;
      return;
    }

    const grouped = {};
    ORDER.forEach(t => grouped[t] = []);
    meals.forEach(m => (grouped[m.meal_type] || (grouped[m.meal_type] = [])).push(m));

    ORDER.forEach(type => {
      if (!grouped[type] || grouped[type].length === 0) return;
      const group = document.createElement('div');
      group.className = 'meal-group';
      group.innerHTML = `<div class="meal-group-title">${ICONS[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        <div class="meal-cards" id="cards-${type}"></div>`;
      section.appendChild(group);
      const container = group.querySelector('.meal-cards');
      grouped[type].forEach(meal => {
        const card = document.createElement('div');
        card.className = 'meal-card';
        card.innerHTML = `
          <div class="meal-card-info">
            <div class="meal-card-name">${escapeHtml(meal.name)}</div>
            <div class="meal-card-macros">${Math.round(meal.protein)}g protein · ${Math.round(meal.carbs)}g carbs · ${Math.round(meal.fat)}g fat</div>
          </div>
          <span class="meal-card-kcal">${Math.round(meal.calories)} kcal</span>
          <button class="meal-edit-btn" title="Edit">✎</button>
          <button class="meal-delete-btn" title="Remove">✕</button>`;
        card.querySelector('.meal-edit-btn').addEventListener('click', () => onEdit(meal));
        card.querySelector('.meal-delete-btn').addEventListener('click', () => onDelete(meal.id));
        container.appendChild(card);
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function load(date, onDelete, onEdit) {
    try {
      const meals = await API.meals.list(date);
      renderMeals(meals, onDelete, onEdit);
    } catch (err) {
      console.error('meals load failed:', err.message);
    }
  }

  return { load, renderMeals };
})();

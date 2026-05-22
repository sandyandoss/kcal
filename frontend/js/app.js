const App = (() => {
  let currentDate = new Date();
  let pendingMacros = null;
  let selectedMealType = 'breakfast';
  let editMealType = 'breakfast';

  function dateStr(d) {
    return d.toISOString().slice(0, 10);
  }

  function formatDateLabel(d) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (dateStr(d) === dateStr(today)) return 'Today';
    if (dateStr(d) === dateStr(yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function setDateLabel() {
    document.getElementById('current-date-label').textContent = formatDateLabel(currentDate);
    const isToday = dateStr(currentDate) === dateStr(new Date());
    document.getElementById('next-day').style.opacity = isToday ? '0.3' : '1';
    document.getElementById('next-day').disabled = isToday;
  }

  function refreshDay() {
    const d = dateStr(currentDate);
    Dashboard.load(d);
    Meals.load(d, deleteMeal, openEditModal);
  }

  async function deleteMeal(id) {
    try {
      await API.meals.remove(id);
      refreshDay();
    } catch (err) {
      alert(err.message);
    }
  }

  // ── LOG MODAL ──────────────────────────────────────────
  function openLogModal() {
    pendingMacros = null;
    document.getElementById('log-modal').classList.remove('hidden');
    document.getElementById('food-name').value = '';
    document.getElementById('food-amount').value = '';
    document.getElementById('ai-result').classList.add('hidden');
    document.getElementById('confirm-section').classList.add('hidden');
    document.getElementById('modal-status').textContent = '';
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('analyze-photo-btn').classList.add('hidden');
    document.getElementById('photo-drop-text').textContent = 'Tap to choose a photo';
    document.getElementById('photo-input').value = '';
    document.getElementById('edit-kcal').value = '';
    document.getElementById('edit-protein').value = '';
    document.getElementById('edit-carbs').value = '';
    document.getElementById('edit-fat').value = '';
    selectedMealType = 'breakfast';
    document.querySelectorAll('.meal-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'breakfast'));
    switchMethod('text');
  }

  function closeLogModal() {
    document.getElementById('log-modal').classList.add('hidden');
  }

  function switchMethod(method) {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.toggle('active', b.dataset.method === method));
    document.getElementById('text-input-section').classList.toggle('hidden', method !== 'text');
    document.getElementById('photo-input-section').classList.toggle('hidden', method !== 'photo');
  }

  function setStatus(msg, color = 'var(--text-muted)') {
    const el = document.getElementById('modal-status');
    el.textContent = msg;
    el.style.color = color;
  }

  function showMacroFields(name, data = {}) {
    const nameEl = document.getElementById('result-name');
    nameEl.textContent = name || '';
    nameEl.style.display = name ? 'block' : 'none';
    document.getElementById('edit-kcal').value    = data.calories != null ? Math.round(data.calories) : '';
    document.getElementById('edit-protein').value = data.protein  != null ? Math.round(data.protein)  : '';
    document.getElementById('edit-carbs').value   = data.carbs    != null ? Math.round(data.carbs)    : '';
    document.getElementById('edit-fat').value     = data.fat      != null ? Math.round(data.fat)      : '';
    document.getElementById('ai-result').classList.remove('hidden');
    document.getElementById('confirm-section').classList.remove('hidden');
    pendingMacros = { name: name || 'Meal', ...data };
  }

  async function analyzeText() {
    const food   = document.getElementById('food-name').value.trim();
    const amount = document.getElementById('food-amount').value.trim();
    if (!food) return setStatus('Enter a food name first.', 'var(--fat)');
    setStatus('Analyzing…');
    document.getElementById('analyze-text-btn').disabled = true;
    try {
      const data = await API.analyze.text({ food, amount: amount || undefined });
      showMacroFields(data.name, data);
      setStatus('');
    } catch (err) {
      setStatus(err.message + ' — or enter values manually below.', 'var(--fat)');
      showMacroFields(food, {});
    } finally {
      document.getElementById('analyze-text-btn').disabled = false;
    }
  }

  async function analyzePhoto() {
    const file = document.getElementById('photo-input').files[0];
    if (!file) return setStatus('No photo selected.', 'var(--fat)');
    const fd = new FormData();
    fd.append('image', file);
    setStatus('Analyzing photo…');
    document.getElementById('analyze-photo-btn').disabled = true;
    try {
      const data = await API.analyze.photo(fd);
      showMacroFields(data.name, data);
      setStatus('');
    } catch (err) {
      setStatus(err.message + ' — enter values manually below.', 'var(--fat)');
      showMacroFields('', {});
    } finally {
      document.getElementById('analyze-photo-btn').disabled = false;
    }
  }

  function enterManually() {
    const food = document.getElementById('food-name').value.trim() || 'Meal';
    showMacroFields(food, {});
    setStatus('');
  }

  async function saveMeal() {
    const calories = parseFloat(document.getElementById('edit-kcal').value);
    if (!calories || isNaN(calories)) return setStatus('Enter calories first.', 'var(--fat)');

    const name     = document.getElementById('result-name').textContent ||
                     document.getElementById('food-name').value.trim() || 'Meal';
    const protein  = parseFloat(document.getElementById('edit-protein').value) || 0;
    const carbs    = parseFloat(document.getElementById('edit-carbs').value)   || 0;
    const fat      = parseFloat(document.getElementById('edit-fat').value)     || 0;

    try {
      await API.meals.add({ name, meal_type: selectedMealType, calories, protein, carbs, fat });
      closeLogModal();
      refreshDay();
    } catch (err) {
      setStatus(err.message, 'var(--fat)');
    }
  }

  // ── EDIT MODAL ────────────────────────────────────────
  function openEditModal(meal) {
    editMealType = meal.meal_type;
    document.getElementById('edit-meal-id').value      = meal.id;
    document.getElementById('edit-meal-name').value    = meal.name;
    document.getElementById('edit-meal-kcal').value    = Math.round(meal.calories);
    document.getElementById('edit-meal-protein').value = Math.round(meal.protein);
    document.getElementById('edit-meal-carbs').value   = Math.round(meal.carbs);
    document.getElementById('edit-meal-fat').value     = Math.round(meal.fat);
    document.getElementById('edit-meal-status').textContent = '';

    document.querySelectorAll('#edit-meal-type-row .meal-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === meal.meal_type);
    });

    document.getElementById('edit-modal').classList.remove('hidden');
  }

  function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
  }

  async function saveEditMeal(e) {
    e.preventDefault();
    const id       = document.getElementById('edit-meal-id').value;
    const name     = document.getElementById('edit-meal-name').value.trim();
    const calories = parseFloat(document.getElementById('edit-meal-kcal').value);
    const protein  = parseFloat(document.getElementById('edit-meal-protein').value) || 0;
    const carbs    = parseFloat(document.getElementById('edit-meal-carbs').value)   || 0;
    const fat      = parseFloat(document.getElementById('edit-meal-fat').value)     || 0;

    if (!name || !calories) {
      document.getElementById('edit-meal-status').textContent = 'Name and calories are required.';
      return;
    }
    try {
      await API.meals.update(id, { name, meal_type: editMealType, calories, protein, carbs, fat });
      closeEditModal();
      refreshDay();
    } catch (err) {
      document.getElementById('edit-meal-status').textContent = err.message;
    }
  }

  // ── TARGETS MODAL ──────────────────────────────────────
  async function openTargetsModal() {
    document.getElementById('targets-modal').classList.remove('hidden');
    try {
      const t = await API.targets.get();
      document.getElementById('t-calories').value = t.calories;
      document.getElementById('t-protein').value  = t.protein;
      document.getElementById('t-carbs').value    = t.carbs;
      document.getElementById('t-fat').value      = t.fat;
    } catch {}
  }

  // ── SHOW/HIDE SCREENS ──────────────────────────────────
  function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    const user = Auth.getUser();
    if (user) {
      document.getElementById('user-greeting').textContent = `Hi, ${user.name.split(' ')[0]}`;
    }
    currentDate = new Date();
    setDateLabel();
    refreshDay();
  }

  function showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
  }

  // ── BOOT ──────────────────────────────────────────────
  function init() {
    Auth.init();
    if (Auth.isLoggedIn()) showApp();

    // date nav
    document.getElementById('prev-day').addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() - 1);
      setDateLabel();
      refreshDay();
    });
    document.getElementById('next-day').addEventListener('click', () => {
      if (dateStr(currentDate) < dateStr(new Date())) {
        currentDate.setDate(currentDate.getDate() + 1);
        setDateLabel();
        refreshDay();
      }
    });

    // log modal
    document.getElementById('open-log-btn').addEventListener('click', openLogModal);
    document.getElementById('close-modal').addEventListener('click', closeLogModal);
    document.getElementById('log-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeLogModal();
    });

    document.querySelectorAll('.method-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMethod(btn.dataset.method));
    });

    document.getElementById('analyze-text-btn').addEventListener('click', analyzeText);
    document.getElementById('manual-entry-btn').addEventListener('click', enterManually);
    document.getElementById('food-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') analyzeText();
    });

    // photo
    document.getElementById('photo-drop').addEventListener('click', () => {
      document.getElementById('photo-input').click();
    });
    document.getElementById('photo-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      document.getElementById('photo-drop-text').textContent = file.name;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.getElementById('photo-preview');
        img.src = ev.target.result;
        img.classList.remove('hidden');
        document.getElementById('analyze-photo-btn').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('analyze-photo-btn').addEventListener('click', analyzePhoto);

    // meal type selector (log modal)
    document.querySelectorAll('#confirm-section .meal-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#confirm-section .meal-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMealType = btn.dataset.type;
      });
    });

    document.getElementById('save-meal-btn').addEventListener('click', saveMeal);

    // edit modal
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeEditModal();
    });
    document.querySelectorAll('#edit-meal-type-row .meal-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#edit-meal-type-row .meal-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        editMealType = btn.dataset.type;
      });
    });
    document.getElementById('edit-meal-form').addEventListener('submit', saveEditMeal);

    // settings
    document.getElementById('settings-btn').addEventListener('click', openTargetsModal);
    document.getElementById('close-targets-modal').addEventListener('click', () => {
      document.getElementById('targets-modal').classList.add('hidden');
    });
    document.getElementById('targets-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) document.getElementById('targets-modal').classList.add('hidden');
    });
    document.getElementById('targets-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        calories: Number(document.getElementById('t-calories').value),
        protein:  Number(document.getElementById('t-protein').value),
        carbs:    Number(document.getElementById('t-carbs').value),
        fat:      Number(document.getElementById('t-fat').value),
      };
      try {
        await API.targets.save(body);
        document.getElementById('targets-modal').classList.add('hidden');
        refreshDay();
      } catch (err) {
        document.getElementById('targets-status').textContent = err.message;
      }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      Auth.clearSession ? Auth.clearSession() : (localStorage.clear());
      showAuth();
    });
  }

  return { init, showApp, showAuth };
})();

document.addEventListener('DOMContentLoaded', App.init);

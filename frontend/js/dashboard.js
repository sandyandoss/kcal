const Dashboard = (() => {
  const RING_CIRCUMFERENCE = 326.7;

  function animateNumber(el, to) {
    const from = parseFloat(el.textContent) || 0;
    const duration = 600;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setRing(consumed, target) {
    const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
    const offset = RING_CIRCUMFERENCE * (1 - pct);
    document.getElementById('ring-progress').style.strokeDashoffset = offset;
    animateNumber(document.getElementById('ring-consumed'), Math.round(consumed));
    const remaining = Math.max(0, target - consumed);
    document.getElementById('ring-remaining').textContent = `of ${target} left: ${Math.round(remaining)}`;
  }

  function setBar(id, consumed, target) {
    const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
    document.getElementById(`bar-${id}`).style.width = `${pct}%`;
  }

  function render(summary) {
    const { targets, consumed, streak } = summary;

    setRing(consumed.calories, targets.calories);
    setBar('protein', consumed.protein, targets.protein);
    setBar('carbs',   consumed.carbs,   targets.carbs);
    setBar('fat',     consumed.fat,     targets.fat);

    document.getElementById('label-protein').textContent = `${Math.round(consumed.protein)}g`;
    document.getElementById('label-carbs').textContent   = `${Math.round(consumed.carbs)}g`;
    document.getElementById('label-fat').textContent     = `${Math.round(consumed.fat)}g`;

    const badge = document.getElementById('streak-badge');
    const count = document.getElementById('streak-count');
    if (streak.current_streak > 0) {
      count.textContent = streak.current_streak;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  async function load(date) {
    try {
      const summary = await API.summary.get(date);
      render(summary);
    } catch (err) {
      console.error('dashboard load failed:', err.message);
    }
  }

  return { load, render };
})();

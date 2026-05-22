const Auth = (() => {
  function saveSession(token, user) {
    localStorage.setItem('kcal_token', token);
    localStorage.setItem('kcal_user', JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem('kcal_token');
    localStorage.removeItem('kcal_user');
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('kcal_user')); } catch { return null; }
  }

  function isLoggedIn() {
    return !!localStorage.getItem('kcal_token');
  }

  function init() {
    // tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        document.getElementById('login-form').classList.toggle('hidden', which !== 'login');
        document.getElementById('register-form').classList.toggle('hidden', which !== 'register');
      });
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('login-error');
      errEl.textContent = '';
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      try {
        const { token, user } = await API.auth.login({ email, password });
        saveSession(token, user);
        App.showApp();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('register-error');
      errEl.textContent = '';
      const name     = document.getElementById('reg-name').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      try {
        const { token, user } = await API.auth.register({ name, email, password });
        saveSession(token, user);
        App.showApp();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      clearSession();
      App.showAuth();
    });
  }

  return { init, isLoggedIn, getUser, clearSession };
})();

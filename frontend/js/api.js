const API = (() => {
  // Local dev: frontend on :5500, backend on :3001
  // Production: same server handles both, so use relative URLs
  const BASE = (window.location.hostname === 'localhost' && window.location.port === '5500')
    ? 'http://localhost:3001'
    : '';

  function getToken() {
    return localStorage.getItem('kcal_token');
  }

  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function upload(path, formData) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    return data;
  }

  return {
    auth: {
      register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
      login:    (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
    },
    targets: {
      get: ()     => request('/targets'),
      save: (body) => request('/targets', { method: 'PUT', body: JSON.stringify(body) }),
    },
    meals: {
      list:   (date) => request(`/meals?date=${date}`),
      add:    (body) => request('/meals', { method: 'POST', body: JSON.stringify(body) }),
      update: (id, body) => request(`/meals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      remove: (id)   => request(`/meals/${id}`, { method: 'DELETE' }),
    },
    summary: {
      get: (date) => request(`/summary?date=${date}`),
    },
    analyze: {
      text:  (body)     => request('/analyze/text', { method: 'POST', body: JSON.stringify(body) }),
      photo: (formData) => upload('/analyze/photo', formData),
    },
  };
})();

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function apiFetch(path, options = {}) {
  if (import.meta.env.DEV) {
    console.debug('[apiFetch] URL:', `${BASE_URL}${path}`, 'options:', options);
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new Error(response.statusText || 'API request failed');
    }
    return null;
  }

  if (!response.ok) {
    const errorMessage = payload?.message || response.statusText || 'API request failed';
    throw new Error(`${response.status} ${errorMessage}`);
  }

  return payload;
}

export const authApi = {
  signup(name, email, password, role = 'member') {
    return apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  },
  login(email, password) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  logout() {
    return apiFetch('/auth/logout', { method: 'POST' });
  },
  me() {
    return apiFetch('/auth/me');
  },
};

export const projectApi = {
  list() {
    return apiFetch('/projects');
  },
  create(payload) {
    return apiFetch('/projects', { method: 'POST', body: JSON.stringify(payload) });
  },
  update(id, payload) {
    return apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  remove(id) {
    return apiFetch(`/projects/${id}`, { method: 'DELETE' });
  },
  addMember(projectId, userId) {
    return apiFetch(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId }) });
  },
  removeMember(projectId, userId) {
    return apiFetch(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
  },
};

export const taskApi = {
  list() {
    return apiFetch('/tasks');
  },
  create(payload) {
    return apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });
  },
  update(id, payload) {
    return apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  remove(id) {
    return apiFetch(`/tasks/${id}`, { method: 'DELETE' });
  },
};

export const userApi = {
  list() {
    return apiFetch('/users');
  },
};

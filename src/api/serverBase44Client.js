import { runtimeConfig } from '@/lib/runtime-config';

const trimTrailingSlash = (value = '') => String(value || '').replace(/\/+$/, '');

const getApiBaseUrl = () => {
  const explicitBase = trimTrailingSlash(runtimeConfig.serverApiUrl || import.meta.env.VITE_SERVER_API_URL || '');
  return explicitBase || 'http://127.0.0.1:4000/api';
};

async function request(path, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload?.error || `Owned runtime request failed: ${response.status}`);
  }

  return payload;
}

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    search.set(key, String(value));
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}

function buildEntityApi(entityName) {
  return {
    async list(sort = '-created_date', limit = 100, skip = 0) {
      return request(`/entities/${entityName}${toQueryString({ sort, limit, skip })}`);
    },
    async filter(filter = {}, sort = '-created_date', limit = 100, skip = 0) {
      return request(`/entities/${entityName}/filter`, {
        method: 'POST',
        body: JSON.stringify({ filter, sort, limit, skip }),
      });
    },
    async get(id) {
      return request(`/entities/${entityName}/${id}`);
    },
    async create(data = {}) {
      return request(`/entities/${entityName}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async update(id, data = {}) {
      return request(`/entities/${entityName}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    async delete(id) {
      return request(`/entities/${entityName}/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

export function createServerBase44Client() {
  return {
    auth: {
      async me() {
        return request('/auth/me');
      },
      async updateMe(data = {}) {
        return request('/auth/me', {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      redirectToLogin(returnUrl) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexuserp:owned-login-requested', { detail: { returnUrl } }));
        }
      },
    },
    users: {
      async inviteUser(email, role = 'user') {
        return request('/users/invite', {
          method: 'POST',
          body: JSON.stringify({ email, role }),
        });
      },
    },
    entities: new Proxy({}, {
      get(_, entityName) {
        return buildEntityApi(String(entityName));
      },
    }),
    functions: {
      async invoke(name, payload = {}) {
        return request(`/functions/${name}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },
    },
    integrations: {
      Core: {
        async InvokeLLM(payload = {}) {
          const response = await request('/integrations/core/invoke-llm', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          return response?.data ?? response;
        },
      },
    },
    __ownedRuntime: {
      apiBaseUrl: getApiBaseUrl(),
    },
  };
}

// ─── API Client para NogueraRRHH ────────────────
const API = {
  base: '/api',

  getToken() {
    return localStorage.getItem('nrrhh_token');
  },

  async request(path, options = {}) {
    const url = `${this.base}${path}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    const token = this.getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const res  = await fetch(url, config);
      const data = await res.json();

      if (res.status === 401) {
        // Token expirado o inválido → forzar logout
        localStorage.removeItem('nrrhh_token');
        localStorage.removeItem('nrrhh_user');
        if (typeof App !== 'undefined') App.navigate('login');
        throw new Error('Sesión expirada. Inicie sesión nuevamente.');
      }

      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      return data;
    } catch (err) {
      console.error(`API Error [${path}]:`, err);
      throw err;
    }
  },

  // ─── Auth ─────────────────────────────────────
  auth: {
    login: (data)      => API.request('/auth/login', { method: 'POST', body: data }),
    me:    ()          => API.request('/auth/me'),
    usuarios: {
      list:   ()           => API.request('/auth/usuarios'),
      create: (data)       => API.request('/auth/usuarios', { method: 'POST', body: data }),
      update: (id, data)   => API.request(`/auth/usuarios/${id}`, { method: 'PUT', body: data }),
      delete: (id)         => API.request(`/auth/usuarios/${id}`, { method: 'DELETE' }),
    },
  },

  // ─── Empresa ──────────────────────────────────
  empresa: {
    list: ()          => API.request('/empresa'),
    get: (id)         => API.request(`/empresa/${id}`),
    create: (data)    => API.request('/empresa', { method: 'POST', body: data }),
    update: (id, data)=> API.request(`/empresa/${id}`, { method: 'PUT', body: data }),
    delete: (id)      => API.request(`/empresa/${id}`, { method: 'DELETE' }),
  },

  // ─── Personal ─────────────────────────────────
  personal: {
    list: (empresaId) => API.request(`/personal?empresa_id=${empresaId || ''}`),
    get: (id)         => API.request(`/personal/${id}`),
    create: (data)    => API.request('/personal', { method: 'POST', body: data }),
    update: (id, data)=> API.request(`/personal/${id}`, { method: 'PUT', body: data }),
    delete: (id)      => API.request(`/personal/${id}`, { method: 'DELETE' }),
  },

  // ─── Gestión Laboral ──────────────────────────
  gestion: {
    get: (personalId)        => API.request(`/gestion/laboral/${personalId}`),
    update: (personalId, submodulo, data) =>
      API.request(`/gestion/laboral/${personalId}/${submodulo}`, { method: 'PUT', body: data }),
    resumen: (personalId)    => API.request(`/gestion/resumen/${personalId}`),
    alertas: (empresaId)     => API.request(`/gestion/alertas/${empresaId}`),
    leerAlerta: (id)         => API.request(`/gestion/alertas/${id}/leer`, { method: 'PUT' }),
  },

  // ─── Herramientas ─────────────────────────────
  herramientas: {
    calcularLiquidacion: (data) =>
      API.request('/herramientas/liquidacion', { method: 'POST', body: data }),
    getLiquidaciones: (personalId) =>
      API.request(`/herramientas/liquidacion/${personalId}`),
    calcularAhorro: (data) =>
      API.request('/herramientas/ahorro-aguinaldo', { method: 'POST', body: data }),
    getAhorro: (empresaId, anio) =>
      API.request(`/herramientas/ahorro-aguinaldo/${empresaId}/${anio}`),
  },

  // ─── Schemas ──────────────────────────────────
  schemas: {
    get: (nombre) => API.request(`/schemas/${nombre}`),
  },

  // ─── Health ───────────────────────────────────
  health: () => API.request('/health'),
};

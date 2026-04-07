// ─── DEMO MODE (GitHub Pages — sin backend) ──────
const DEMO_MODE = window.location.hostname.endsWith('github.io') ||
                  window.location.protocol === 'file:';

const DEMO = (() => {
  const DEMO_TOKEN = 'demo-token-noguerarrhh';

  // ── Estado en memoria ──────────────────────────
  let usuarios = [
    { id: 1, username: 'admin', email: 'admin@demo.com', rol: 'admin' },
    { id: 2, username: 'editor', email: 'editor@demo.com', rol: 'editor' },
  ];
  let empresas = [
    {
      id: 1, ruc: '80012345-6', razon_social: 'Empresa Demo S.A.',
      nombre_fantasia: 'Demo Empresa', tipo_sociedad: 'S.A.',
      actividad_principal: 'Servicios de Software', unipersonal_juridica: 'Jurídica',
      ciudad: 'Asunción', depto: 'Central', correo: 'demo@empresa.com',
      rep_nombre: 'Juan Pérez', rep_ci: '3.456.789', rep_celular: '0981-123456',
      n_patronal_ips: '123456', n_mtess_matriz: '654321', categoria_dnit: 'Pequeña',
    },
  ];
  let empleados = [
    { id: 1, empresa_id: 1, nombre_apellido: 'María García López', cedula: '4.567.890', cargo: 'Gerente RRHH', fecha_ingreso: '2020-03-15', activo: 1 },
    { id: 2, empresa_id: 1, nombre_apellido: 'Carlos López Martínez', cedula: '3.456.789', cargo: 'Contador', fecha_ingreso: '2019-07-01', activo: 1 },
    { id: 3, empresa_id: 1, nombre_apellido: 'Ana Martínez Ruiz', cedula: '5.678.901', cargo: 'Asistente Administrativo', fecha_ingreso: '2022-01-10', activo: 1 },
  ];
  let alertas = [
    { id: 1, empresa_id: 1, personal_id: 2, tipo: 'contrato', mensaje: 'Carlos López: Contrato próximo a vencer (30 días)', nivel: 'warning', leida: 0, created_at: '2026-04-01' },
    { id: 2, empresa_id: 1, personal_id: 1, tipo: 'vacaciones', mensaje: 'María García: Vacaciones pendientes de tomar (15 días)', nivel: 'warning', leida: 0, created_at: '2026-04-02' },
    { id: 3, empresa_id: 1, personal_id: 3, tipo: 'ips', mensaje: 'Ana Martínez: Verificar aportes IPS del mes anterior', nivel: 'danger', leida: 0, created_at: '2026-04-05' },
  ];
  let nextId = { usuarios: 3, empleados: 4, alertas: 4 };

  const mockGestion = (personalId) => ({
    contrato:         { relacion_juridica: 'Individual', clase_contrato: 'Escrito', condicion_contrato: 'Superior al SMLV', redactado: 'Sí', copia_entregada: 'Sí', duracion: 'Indefinido', modalidad: 'Presencial' },
    seguridad_social: { inscripto_ips: 'Sí', monto_aporte: 'Correcto', al_dia: 'Sí' },
    horario:          { tipo_jornada: 'Diurna', horas_dia: '8', horas_semana: '40', descanso_intermedio: 'Sí' },
    salario:          { salario_actual: '3500000', por_encima_smlv: 'Sí', forma_pago: 'Transferencia', periodo_pago: 'Mensual' },
    vacaciones:       { dias_corresponden: '12', dias_tomados: '6', dias_pendientes: '6', ultimo_periodo: '2025' },
    aguinaldo:        { pagado_anio_anterior: 'Sí', monto_pagado: '3500000', fecha_pago: '2025-12-01' },
  });

  const mockResumen = () => ({
    total_general: 78,
    modulos: {
      contrato:         { nombre: 'Contrato',          cumplimiento: 90 },
      seguridad_social: { nombre: 'IPS',               cumplimiento: 85 },
      horario:          { nombre: 'Horario',            cumplimiento: 75 },
      salario:          { nombre: 'Salario',            cumplimiento: 70 },
      vacaciones:       { nombre: 'Vacaciones',         cumplimiento: 60 },
      aguinaldo:        { nombre: 'Aguinaldo',          cumplimiento: 88 },
    },
  });

  // ── Ruteo de paths mock ────────────────────────
  async function handle(method, path, body) {
    await new Promise(r => setTimeout(r, 120)); // simular latencia

    // ─ Auth ─
    if (method === 'POST' && path === '/auth/login') {
      if (body.username === 'admin' && body.password === 'admin123') {
        return { token: DEMO_TOKEN, user: usuarios[0] };
      }
      if (body.username === 'editor' && body.password === 'editor123') {
        return { token: DEMO_TOKEN + '-editor', user: usuarios[1] };
      }
      throw new Error('Usuario o contraseña incorrectos');
    }
    if (method === 'GET' && path === '/auth/me') {
      const token = localStorage.getItem('nrrhh_token');
      const u = token?.includes('editor') ? usuarios[1] : usuarios[0];
      return u || (() => { throw new Error('No autenticado'); })();
    }
    if (method === 'GET'    && path === '/auth/usuarios') return [...usuarios];
    if (method === 'POST'   && path === '/auth/usuarios') {
      const u = { id: nextId.usuarios++, ...body };
      usuarios.push(u); return u;
    }
    if (method === 'PUT'    && path.startsWith('/auth/usuarios/')) {
      const id = parseInt(path.split('/')[3]);
      const idx = usuarios.findIndex(u => u.id === id);
      if (idx >= 0) usuarios[idx] = { ...usuarios[idx], ...body };
      return usuarios[idx];
    }
    if (method === 'DELETE' && path.startsWith('/auth/usuarios/')) {
      const id = parseInt(path.split('/')[3]);
      usuarios = usuarios.filter(u => u.id !== id);
      return { ok: true };
    }

    // ─ Empresa ─
    if (method === 'GET'    && path === '/empresa') return [...empresas];
    if (method === 'GET'    && path.startsWith('/empresa/')) return empresas[0] || {};
    if (method === 'POST'   && path === '/empresa') {
      const e = { id: 1, ...body }; empresas = [e]; return e;
    }
    if (method === 'PUT'    && path.startsWith('/empresa/')) {
      empresas[0] = { ...empresas[0], ...body }; return empresas[0];
    }
    if (method === 'DELETE' && path.startsWith('/empresa/')) {
      empresas = []; return { ok: true };
    }

    // ─ Personal ─
    if (method === 'GET' && path.startsWith('/personal?')) {
      return [...empleados];
    }
    if (method === 'GET' && path.startsWith('/personal/')) {
      const id = parseInt(path.split('/')[2]);
      return empleados.find(e => e.id === id) || {};
    }
    if (method === 'POST' && path === '/personal') {
      const emp = { id: nextId.empleados++, empresa_id: 1, activo: 1, ...body };
      empleados.push(emp); return emp;
    }
    if (method === 'PUT' && path.startsWith('/personal/')) {
      const id = parseInt(path.split('/')[2]);
      const idx = empleados.findIndex(e => e.id === id);
      if (idx >= 0) empleados[idx] = { ...empleados[idx], ...body };
      return empleados[idx];
    }
    if (method === 'DELETE' && path.startsWith('/personal/')) {
      const id = parseInt(path.split('/')[2]);
      empleados = empleados.filter(e => e.id !== id);
      return { ok: true };
    }

    // ─ Gestión ─
    if (method === 'GET' && path.startsWith('/gestion/laboral/')) return mockGestion(path.split('/')[3]);
    if (method === 'PUT' && path.startsWith('/gestion/laboral/')) return { ok: true };
    if (method === 'GET' && path.startsWith('/gestion/resumen/')) return mockResumen();
    if (method === 'GET' && path.startsWith('/gestion/alertas/') && !path.includes('/leer')) return [...alertas];
    if (method === 'PUT' && path.includes('/leer')) {
      const id = parseInt(path.split('/')[3]);
      const a = alertas.find(a => a.id === id);
      if (a) a.leida = 1; return { ok: true };
    }

    // ─ Herramientas (liquidación simple) ─
    if (method === 'POST' && path === '/herramientas/liquidacion') {
      const salario = body.salario_percibido || 0;
      const subtotal = salario + (body.salario_mes_pendiente || 0);
      return { preaviso: 0, antiguedad: 0, vacacion_causada: 0, vacacion_proporcional: 0, aguinaldo_proporcional: Math.round(salario / 12), salario_mes: body.salario_mes_pendiente || 0, otros_haberes: 0, subtotal, descuento_ips_9: Math.round(subtotal * 0.09), total_cobrar: Math.round(subtotal * 0.91) };
    }
    if (method === 'GET'  && path.startsWith('/herramientas/liquidacion/')) return [];
    if (method === 'POST' && path === '/herramientas/ahorro-aguinaldo') return { total: Math.round((body.salario_bruto || 0) / 12), meses: 12 };
    if (method === 'GET'  && path.startsWith('/herramientas/ahorro-aguinaldo/')) return [];

    // ─ Schemas (fetch del JSON local) ─
    if (method === 'GET' && path.startsWith('/schemas/')) {
      const nombre = path.replace('/schemas/', '');
      const res = await fetch(`schemas/${nombre}`);
      if (!res.ok) return {};
      return res.json();
    }

    // ─ Health ─
    if (path === '/health') return { status: 'demo', mode: 'GitHub Pages' };

    throw new Error(`Demo: endpoint no implementado [${method} ${path}]`);
  }

  return { handle, get DEMO_TOKEN() { return DEMO_TOKEN; } };
})();

// ─── API Client para NogueraRRHH ────────────────
const API = {
  base: '/api',

  getToken() {
    return localStorage.getItem('nrrhh_token');
  },

  async request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const body   = options.body && typeof options.body === 'object' ? options.body
                 : options.body ? JSON.parse(options.body) : undefined;

    // ── En modo demo, no hacer fetch real ─────────
    if (DEMO_MODE) {
      return DEMO.handle(method, path, body || {});
    }

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

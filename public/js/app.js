// ─── NogueraRRHH SPA App ────────────────────────

// Iconos SVG reutilizables (sin emojis, heredan currentColor)
const SVG = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ICON = {
  sun:   SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon:  SVG('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  bell:  SVG('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  empty: SVG('<path d="M3 8l2.5-4h13L21 8"/><path d="M3 8h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 12h5l1.5 2.5h5L21 12"/>'),
};

const App = {
  currentView: 'dashboard',
  user: null,
  empresa: null,
  empleados: [],
  alertas: [],
  charts: {},
  _selectedGestionPersonalId: null,
  _currentPersonalId: null,
  _currentGestion: null,
  _gestionSchema: null,

  async init() {
    this.bindTheme();
    await this.checkAuth();
  },

  // ─── Auth ─────────────────────────────────────
  async checkAuth() {
    const token = localStorage.getItem('nrrhh_token');
    if (!token) { this.showLoginPage(); return; }
    try {
      this.user = await API.auth.me();
      this.showApp();
      await this.loadEmpresa();
      this.navigate('dashboard');
    } catch {
      this.showLoginPage();
    }
  },

  showLoginPage() {
    document.getElementById('loginPage').classList.add('show');
    document.getElementById('loginError').textContent = '';
  },

  showApp() {
    document.getElementById('loginPage').classList.remove('show');
    this.bindNav();
    if (this.user?.rol === 'admin') {
      document.getElementById('sectionAdmin').style.display = '';
    }
    const info = document.getElementById('userInfo');
    if (info) {
      info.innerHTML = `<strong>${this.user.username}</strong><br><span style="opacity:0.6;font-size:11px">${this.user.rol}</span>`;
    }
  },

  async doLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
      const result = await API.auth.login({ username, password });
      localStorage.setItem('nrrhh_token', result.token);
      this.user = result.user;
      this.showApp();
      await this.loadEmpresa();
      this.navigate('dashboard');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  },

  logout() {
    localStorage.removeItem('nrrhh_token');
    this.user = null;
    this.empresa = null;
    this.empleados = [];
    this.alertas = [];
    this._selectedGestionPersonalId = null;
    this._currentPersonalId = null;
    this._currentGestion = null;
    document.getElementById('sectionAdmin').style.display = 'none';
    this.showLoginPage();
  },

  // Retorna true si el usuario puede realizar la acción
  userCan(action) {
    const rol = this.user?.rol;
    if (action === 'delete') return rol === 'admin';
    if (action === 'write')  return ['admin', 'editor'].includes(rol);
    return !!rol;
  },

  // ─── Navegación ───────────────────────────────
  bindNav() {
    document.querySelectorAll('.sidebar-item[data-view]').forEach(el => {
      el.addEventListener('click', () => {
        this.navigate(el.dataset.view);
      });
    });
  },

  navigate(view, options = {}) {
    if (view === 'gestion' && Object.prototype.hasOwnProperty.call(options, 'personalId')) {
      this._selectedGestionPersonalId = options.personalId ? String(options.personalId) : null;
    }
    this.currentView = view;
    // Update active sidebar
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`.sidebar-item[data-view="${view}"]`);
    if (active) active.classList.add('active');
    // Render
    this.render(view);
  },

  // ─── Theme toggle ────────────────────────────
  bindTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      this.updateThemeIcon();
    });
    this.updateThemeIcon();
  },

  updateThemeIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = `<span class="icon">${isDark ? ICON.sun : ICON.moon}</span> ${isDark ? 'Tema Claro' : 'Tema Oscuro'}`;
  },

  // ─── Data loading ─────────────────────────────
  async loadEmpresa() {
    try {
      const empresas = await API.empresa.list();
      this.empresa = empresas[0] || null;
      if (this.empresa) {
        this.empleados = await API.personal.list(this.empresa.id);
        this.alertas = await API.gestion.alertas(this.empresa.id);
      }
    } catch (e) {
      console.log('Sin empresa cargada aún');
    }
    this.updateAlertBadge();
  },

  updateAlertBadge() {
    const badge = document.getElementById('alertCount');
    if (!badge) return;
    const noLeidas = this.alertas.filter(a => !a.leida).length;
    badge.textContent = noLeidas;
    badge.style.display = noLeidas > 0 ? 'flex' : 'none';
  },

  // ─── Render router ────────────────────────────
  render(view) {
    const main = document.getElementById('mainContent');
    if (!main) return;

    // Destroy existing charts
    Object.values(this.charts).forEach(c => Charts.destroy(c));
    this.charts = {};

    switch (view) {
      case 'dashboard':     main.innerHTML = this.viewDashboard(); break;
      case 'empresa':       main.innerHTML = this.viewEmpresa(); break;
      case 'personal':      main.innerHTML = this.viewPersonal(); break;
      case 'gestion':       main.innerHTML = this.viewGestion(); break;
      case 'sso':           main.innerHTML = this.viewProximamente('Gestión SSO', 'Salud y Seguridad Ocupacional'); break;
      case 'herramientas':  main.innerHTML = this.viewHerramientas(); break;
      case 'anexos':        main.innerHTML = this.viewProximamente('Anexos', 'Guardería, Trabajo Nocturno, RIT, Sala de Lactancia'); break;
      case 'alertas':       main.innerHTML = this.viewAlertas(); break;
      case 'usuarios':      main.innerHTML = this.viewUsuarios(); requestAnimationFrame(() => this.loadUsuarios()); break;
      default:              main.innerHTML = this.viewDashboard();
    }

    // Initialize view-specific behaviors after DOM render
    requestAnimationFrame(() => {
      if (view === 'gestion') this.initGestionView();
      this.initChartsForView(view);
    });
  },

  // ─── DASHBOARD ────────────────────────────────
  viewDashboard() {
    const emp = this.empresa;
    const total = this.empleados.length;
    const activos = this.empleados.filter(e => e.activo).length;
    const alertasPend = this.alertas.filter(a => !a.leida).length;

    return `
      <div class="topbar">
        <h2>Dashboard</h2>
        <div class="badge-alert" onclick="App.navigate('alertas')">
          ${ICON.bell}<span class="count" id="dashAlertCount" ${alertasPend > 0 ? '' : 'style="display:none"'}>${alertasPend}</span>
        </div>
      </div>

      ${!emp ? `
        <div class="empty-state">
          <div class="icon">${ICON.empty}</div>
          <h3>Bienvenido a NogueraRRHH</h3>
          <p>Comience registrando los datos de su empresa</p>
          <br>
          <button class="btn btn-primary" onclick="App.navigate('empresa')">Registrar Empresa</button>
        </div>
      ` : `
        <div class="grid-4">
          <div class="card kpi" data-cat="personal">
            <div class="value">${total}</div>
            <div class="label">Empleados</div>
          </div>
          <div class="card kpi" data-cat="dashboard">
            <div class="value">${activos}</div>
            <div class="label">Activos</div>
          </div>
          <div class="card kpi" data-cat="alerta">
            <div class="value">${alertasPend}</div>
            <div class="label">Alertas</div>
          </div>
          <div class="card kpi" data-cat="carga">
            <div class="value">${emp.categoria_dnit || '—'}</div>
            <div class="label">Categoría</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card" data-cat="dashboard">
            <div class="card-header">
              <h3>Cumplimiento General</h3>
              <span class="tag tag-dashboard">Panorama</span>
            </div>
            <div class="chart-container">
              <canvas id="chartDonut"></canvas>
            </div>
          </div>
          <div class="card" data-cat="dashboard">
            <div class="card-header">
              <h3>Cumplimiento por Módulo</h3>
              <span class="tag tag-dashboard">Panorama</span>
            </div>
            <div class="chart-container">
              <canvas id="chartRadar"></canvas>
            </div>
          </div>
        </div>

        <div class="card" data-cat="dashboard">
          <div class="card-header">
            <h3>Detalle por Módulo</h3>
          </div>
          <div class="chart-container" style="height:320px">
            <canvas id="chartBarras"></canvas>
          </div>
        </div>

        ${this.alertas.length > 0 ? `
          <div class="card" data-cat="alerta">
            <div class="card-header">
              <h3>Últimas Alertas</h3>
              <button class="btn btn-sm btn-outline" onclick="App.navigate('alertas')">Ver todas</button>
            </div>
            ${this.alertas.slice(0, 5).map(a => `
              <div class="alert-item ${a.nivel}">
                <div>
                  <div>${a.mensaje}</div>
                  <div class="time">${a.created_at}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `}
    `;
  },

  // ─── EMPRESA ──────────────────────────────────
  viewEmpresa() {
    const emp = this.empresa || {};
    return `
      <div class="topbar">
        <h2>Datos de la Empresa</h2>
        <span class="tag tag-carga">Carga de datos</span>
      </div>
      <div class="card" data-cat="carga">
        <form id="formEmpresa" onsubmit="App.saveEmpresa(event)">
          <div class="grid-3">
            <div class="form-group">
              <label>RUC</label>
              <input class="form-control" name="ruc" value="${emp.ruc || ''}" required>
            </div>
            <div class="form-group">
              <label>Razón Social</label>
              <input class="form-control" name="razon_social" value="${emp.razon_social || ''}" required>
            </div>
            <div class="form-group">
              <label>Nombre Fantasía</label>
              <input class="form-control" name="nombre_fantasia" value="${emp.nombre_fantasia || ''}">
            </div>
          </div>
          <div class="grid-3">
            <div class="form-group">
              <label>Tipo Sociedad</label>
              <input class="form-control" name="tipo_sociedad" value="${emp.tipo_sociedad || ''}">
            </div>
            <div class="form-group">
              <label>Actividad Principal</label>
              <input class="form-control" name="actividad_principal" value="${emp.actividad_principal || ''}">
            </div>
            <div class="form-group">
              <label>Unipersonal / Jurídica</label>
              <select class="form-control" name="unipersonal_juridica">
                <option value="">Seleccionar</option>
                <option ${emp.unipersonal_juridica === 'Unipersonal' ? 'selected' : ''}>Unipersonal</option>
                <option ${emp.unipersonal_juridica === 'Jurídica' ? 'selected' : ''}>Jurídica</option>
              </select>
            </div>
          </div>
          <div class="grid-3">
            <div class="form-group">
              <label>Ciudad</label>
              <input class="form-control" name="ciudad" value="${emp.ciudad || ''}">
            </div>
            <div class="form-group">
              <label>Departamento</label>
              <input class="form-control" name="depto" value="${emp.depto || ''}">
            </div>
            <div class="form-group">
              <label>Correo Electrónico</label>
              <input class="form-control" name="correo" type="email" value="${emp.correo || ''}">
            </div>
          </div>

          <h4 style="margin:20px 0 12px;font-size:15px">Representante Legal</h4>
          <div class="grid-3">
            <div class="form-group">
              <label>Nombre y Apellido</label>
              <input class="form-control" name="rep_nombre" value="${emp.rep_nombre || ''}">
            </div>
            <div class="form-group">
              <label>Cédula</label>
              <input class="form-control" name="rep_ci" value="${emp.rep_ci || ''}">
            </div>
            <div class="form-group">
              <label>Celular</label>
              <input class="form-control" name="rep_celular" value="${emp.rep_celular || ''}">
            </div>
          </div>

          <h4 style="margin:20px 0 12px;font-size:15px">Registro Patronal</h4>
          <div class="grid-3">
            <div class="form-group">
              <label>N° Patronal IPS</label>
              <input class="form-control" name="n_patronal_ips" value="${emp.n_patronal_ips || ''}">
            </div>
            <div class="form-group">
              <label>N° MTESS Matriz</label>
              <input class="form-control" name="n_mtess_matriz" value="${emp.n_mtess_matriz || ''}">
            </div>
            <div class="form-group">
              <label>Categoría DNIT</label>
              <select class="form-control" name="categoria_dnit">
                <option value="">Seleccionar</option>
                ${['Micro','Pequeña','Mediana','Grande'].map(c =>
                  `<option ${emp.categoria_dnit === c ? 'selected' : ''}>${c}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          ${this.userCan('write') ? `
          <div style="margin-top:24px;display:flex;gap:12px">
            <button type="submit" class="btn btn-success">${this.empresa ? 'Actualizar' : 'Registrar'} Empresa</button>
          </div>` : `<p style="margin-top:20px;font-size:13px;color:var(--text-secondary)">Solo lectura — sin permisos de edición</p>`}
        </form>
      </div>
    `;
  },

  async saveEmpresa(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    try {
      if (this.empresa) {
        await API.empresa.update(this.empresa.id, data);
      } else {
        await API.empresa.create(data);
      }
      await this.loadEmpresa();
      this.navigate('empresa');
      this.showToast('Empresa guardada correctamente');
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  // ─── PERSONAL ─────────────────────────────────
  viewPersonal() {
    return `
      <div class="topbar">
        <h2>Datos del Personal</h2>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="tag tag-personal">Personal</span>
          ${this.userCan('write') ? `<button class="btn btn-primary" onclick="App.showAddEmpleado()">+ Agregar Empleado</button>` : ''}
        </div>
      </div>
      ${this.empleados.length === 0 ? `
        <div class="empty-state">
          <div class="icon">${ICON.empty}</div>
          <h3>Sin empleados registrados</h3>
          <p>Agregue empleados para comenzar la gestión</p>
        </div>
      ` : `
        <div class="card" data-cat="personal">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th><th>Cédula</th><th>Cargo</th>
                  <th>Ingreso</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${this.empleados.map(emp => `
                  <tr>
                    <td><strong>${emp.nombre_apellido}</strong></td>
                    <td style="font-family:'JetBrains Mono',monospace;font-size:13px">${emp.cedula}</td>
                    <td>${emp.cargo || '—'}</td>
                    <td>${emp.fecha_ingreso || '—'}</td>
                    <td><span class="status ${emp.activo ? 'status-ok' : 'status-danger'}">${emp.activo ? '● Activo' : '● Inactivo'}</span></td>
                    <td style="display:flex;gap:6px;flex-wrap:wrap">
                      <button class="btn btn-sm btn-outline" onclick="App.openGestionEmpleado(${emp.id})">Gestión</button>
                      ${this.userCan('delete') ? `<button class="btn btn-sm btn-danger" onclick="App.deleteEmpleado(${emp.id},'${emp.nombre_apellido}')">Eliminar</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
      <div class="modal-overlay" id="modalEmpleado">
        <div class="modal">
          <h3>Agregar Empleado</h3>
          <form onsubmit="App.saveEmpleado(event)">
            <div class="grid-2">
              <div class="form-group">
                <label>Nombre y Apellido</label>
                <input class="form-control" name="nombre_apellido" required>
              </div>
              <div class="form-group">
                <label>Cédula</label>
                <input class="form-control" name="cedula" required>
              </div>
            </div>
            <div class="grid-3">
              <div class="form-group">
                <label>Cargo</label>
                <input class="form-control" name="cargo">
              </div>
              <div class="form-group">
                <label>Fecha Ingreso</label>
                <input class="form-control" name="fecha_ingreso" type="date">
              </div>
              <div class="form-group">
                <label>Condición</label>
                <select class="form-control" name="condicion_tipo">
                  <option>Ingreso</option>
                  <option>Pre ingreso</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label>Nacionalidad</label>
                <input class="form-control" name="nacionalidad" value="Paraguaya">
              </div>
              <div class="form-group">
                <label>Estado Civil</label>
                <select class="form-control" name="estado_civil">
                  <option value="">Seleccionar</option>
                  <option>Soltero</option><option>Casado</option>
                  <option>Viudo</option><option>Divorciado</option>
                </select>
              </div>
            </div>
            <div style="margin-top:20px;display:flex;gap:12px">
              <button type="submit" class="btn btn-success">Guardar</button>
              <button type="button" class="btn btn-outline" onclick="App.closeModal('modalEmpleado')">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  showAddEmpleado() {
    if (!this.empresa) {
      this.showToast('Primero registre una empresa', 'warning');
      return;
    }
    document.getElementById('modalEmpleado')?.classList.add('show');
  },

  closeModal(id) {
    document.getElementById(id)?.classList.remove('show');
  },

  async saveEmpleado(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.empresa_id = this.empresa.id;
    try {
      await API.personal.create(data);
      await this.loadEmpresa();
      this.closeModal('modalEmpleado');
      this.navigate('personal');
      this.showToast('Empleado registrado');
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  // ─── GESTIÓN LABORAL ──────────────────────────
  openGestionEmpleado(personalId) {
    this.navigate('gestion', { personalId });
  },

  gestionEmptyState(
    title = 'Seleccione un empleado',
    description = 'Elija un empleado del selector para ver y editar su gestión laboral'
  ) {
    return `
      <div class="empty-state">
        <div class="icon">${ICON.empty}</div>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
    `;
  },

  viewGestion() {
    if (this.empleados.length === 0) {
      return `
        <div class="topbar"><h2>Gestión Laboral</h2></div>
        <div class="empty-state">
          <div class="icon">${ICON.empty}</div>
          <h3>Sin empleados</h3>
          <p>Registre empleados primero para gestionar su situación laboral</p>
        </div>
      `;
    }

    const submodulos = [
      { key: 'contrato', label: 'Contrato' },
      { key: 'seguridad_social', label: 'Seg. Social' },
      { key: 'horario', label: 'Horario' },
      { key: 'salario', label: 'Salario' },
      { key: 'vacaciones', label: 'Vacaciones' },
      { key: 'aguinaldo', label: 'Aguinaldo' },
    ];
    const selectedGestionId = String(this._selectedGestionPersonalId || this._currentPersonalId || '');

    return `
      <div class="topbar">
        <h2>Gestión Laboral</h2>
        <span class="tag tag-contrato">Contratos</span>
      </div>

      <div class="card" data-cat="contrato" style="margin-bottom:20px">
        <label style="font-size:13px;font-weight:600;color:var(--text-secondary)">Seleccionar Empleado:</label>
        <select class="form-control" id="selEmpleado" onchange="App.loadGestionEmpleado(this.value)" style="max-width:400px;margin-top:8px">
          <option value="">— Elegir empleado —</option>
          ${this.empleados.map(e => `<option value="${e.id}" ${selectedGestionId === String(e.id) ? 'selected' : ''}>${e.nombre_apellido} (${e.cedula})</option>`).join('')}
        </select>
      </div>

      <div class="tabs">
        ${submodulos.map((s, i) => `
          <div class="tab ${i === 0 ? 'active' : ''}" data-cat="contrato" data-tab="${s.key}" onclick="App.switchGestionTab('${s.key}')">
            ${s.label}
          </div>
        `).join('')}
      </div>

      <div id="gestionContent">
        ${this.gestionEmptyState()}
      </div>
    `;
  },

  initGestionView() {
    const select = document.getElementById('selEmpleado');
    const personalId = this._selectedGestionPersonalId || this._currentPersonalId;
    if (!select) return;

    if (!personalId) {
      select.value = '';
      return;
    }

    const existeEmpleado = this.empleados.some(emp => String(emp.id) === String(personalId));
    if (!existeEmpleado) {
      this._selectedGestionPersonalId = null;
      this._currentPersonalId = null;
      this._currentGestion = null;
      select.value = '';
      const container = document.getElementById('gestionContent');
      if (container) container.innerHTML = this.gestionEmptyState();
      return;
    }

    select.value = String(personalId);
    this.loadGestionEmpleado(String(personalId));
  },

  async loadGestionEmpleado(personalId) {
    if (!personalId) {
      this._selectedGestionPersonalId = null;
      this._currentPersonalId = null;
      this._currentGestion = null;
      const container = document.getElementById('gestionContent');
      if (container) container.innerHTML = this.gestionEmptyState();
      return;
    }

    const normalizedPersonalId = String(personalId);
    try {
      if (!this._gestionSchema) {
        this._gestionSchema = await API.schemas.get('C_gestion_laboral.json');
      }
      const data = await API.gestion.get(normalizedPersonalId);
      this._currentGestion = data;
      this._currentPersonalId = normalizedPersonalId;
      this._selectedGestionPersonalId = normalizedPersonalId;
      const select = document.getElementById('selEmpleado');
      if (select) select.value = normalizedPersonalId;
      this.switchGestionTab('contrato');
    } catch (err) {
      this.showToast('Error cargando gestión', 'danger');
    }
  },

  switchGestionTab(tab) {
    document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');

    const container = document.getElementById('gestionContent');
    if (!this._currentGestion) return;

    const SCHEMA_MAP = {
      contrato:         'C1_contrato',
      seguridad_social: 'C2_seguridad_social',
      horario:          'C3_horario_efectivo',
      salario:          'C4_salario_minimo',
      vacaciones:       'C5_vacaciones',
      aguinaldo:        'C6_aguinaldo',
    };

    const TAB_NOMBRES = {
      contrato:         'Contrato Laboral',
      seguridad_social: 'Seguridad Social (IPS)',
      horario:          'Horario Efectivo',
      salario:          'Salario Mínimo Legal Vigente',
      vacaciones:       'Vacaciones',
      aguinaldo:        'Aguinaldo',
    };

    const data    = this._currentGestion[tab] || {};
    const pasos   = this._gestionSchema?.submodulos?.[SCHEMA_MAP[tab]]?.pasos || {};
    const fields  = Object.values(pasos).map(cfg => this._renderGestionField(cfg, data[cfg.campo])).join('');

    container.innerHTML = `
      <div class="card" data-cat="contrato">
        <div class="card-header">
          <h3>${TAB_NOMBRES[tab]}</h3>
          ${this.userCan('write') ? `<button class="btn btn-sm btn-success" onclick="App.saveGestionTab('${tab}')">Guardar</button>` : ''}
        </div>
        <div id="gestionFields">
          <div class="grid-2" style="align-items:start">
            ${fields || '<p style="color:var(--text-secondary);font-size:13px">Sin campos configurados.</p>'}
          </div>
        </div>
      </div>
    `;
  },

  _renderGestionField(cfg, valor) {
    const { campo, etiqueta, tipo, opciones, items } = cfg;
    let input = '';

    if (tipo === 'si_no') {
      input = `<select class="form-control" name="${campo}">
        <option value="">—</option>
        <option value="Sí"  ${valor === 'Sí'  ? 'selected' : ''}>Sí</option>
        <option value="No"  ${valor === 'No'  ? 'selected' : ''}>No</option>
      </select>`;

    } else if (tipo === 'si_no_na') {
      input = `<select class="form-control" name="${campo}">
        <option value="">—</option>
        <option value="Sí"       ${valor === 'Sí'       ? 'selected' : ''}>Sí</option>
        <option value="No"       ${valor === 'No'       ? 'selected' : ''}>No</option>
        <option value="No aplica"${valor === 'No aplica'? 'selected' : ''}>No aplica</option>
      </select>`;

    } else if (tipo === 'select') {
      const opts = (opciones || []).map(o =>
        `<option value="${o}" ${valor === o ? 'selected' : ''}>${o}</option>`
      ).join('');
      input = `<select class="form-control" name="${campo}"><option value="">—</option>${opts}</select>`;

    } else if (tipo === 'multi_select') {
      const vals = Array.isArray(valor) ? valor : [];
      const checks = (opciones || []).map(o => `
        <label style="display:flex;align-items:center;gap:8px;font-weight:normal;cursor:pointer;margin-bottom:4px">
          <input type="checkbox" name="${campo}[]" value="${o}" ${vals.includes(o) ? 'checked' : ''}> ${o}
        </label>`).join('');
      return `<div class="form-group" style="grid-column:1/-1">
        <label>${etiqueta}</label>
        <div style="padding:4px 0">${checks}</div>
      </div>`;

    } else if (tipo === 'checklist') {
      const vals = Array.isArray(valor) ? valor : [];
      const checks = (items || []).map(item => `
        <label style="display:flex;align-items:center;gap:8px;font-weight:normal;cursor:pointer;margin-bottom:6px">
          <input type="checkbox" name="${campo}[]" value="${item}" ${vals.includes(item) ? 'checked' : ''}> ${item}
        </label>`).join('');
      return `<div class="form-group" style="grid-column:1/-1">
        <label>${etiqueta}</label>
        <div style="padding:8px 0;border:1px solid var(--border-color);border-radius:8px;padding:12px">${checks}</div>
      </div>`;

    } else if (tipo === 'date') {
      input = `<input class="form-control" type="date" name="${campo}" value="${valor || ''}">`;

    } else if (tipo === 'number') {
      input = `<input class="form-control" type="number" name="${campo}" value="${valor || ''}">`;

    } else {
      input = `<input class="form-control" type="text" name="${campo}" value="${valor || ''}">`;
    }

    return `<div class="form-group"><label>${etiqueta}</label>${input}</div>`;
  },

  async saveGestionTab(tab) {
    const container = document.getElementById('gestionFields');
    const data = {};

    container.querySelectorAll('select[name], input[type="text"][name], input[type="date"][name], input[type="number"][name]')
      .forEach(f => { data[f.name] = f.value; });

    // Checkboxes: agrupar por nombre de campo
    const cbGroups = {};
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      const name = cb.name.replace('[]', '');
      if (!cbGroups[name]) cbGroups[name] = [];
      if (cb.checked) cbGroups[name].push(cb.value);
    });
    Object.assign(data, cbGroups);

    try {
      await API.gestion.update(this._currentPersonalId, tab, data);
      this._currentGestion[tab] = data;
      this.showToast(`${tab} guardado correctamente`);
      await this.loadEmpresa();
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  // ─── HERRAMIENTAS ─────────────────────────────
  viewHerramientas() {
    return `
      <div class="topbar">
        <h2>Herramientas</h2>
        <span class="tag tag-carga">Carga de datos</span>
      </div>

      <div class="tabs">
        <div class="tab active" data-cat="carga" onclick="App.showHerramienta('liquidacion')">Calculadora Liquidación</div>
        <div class="tab" data-cat="carga" onclick="App.showHerramienta('cuantificacion')">Cuantificación</div>
        <div class="tab" data-cat="carga" onclick="App.showHerramienta('ahorro')">Ahorro Aguinaldo</div>
      </div>

      <div id="herramientaContent">
        ${this.viewLiquidacion()}
      </div>
    `;
  },

  showHerramienta(tipo) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    const container = document.getElementById('herramientaContent');
    switch (tipo) {
      case 'liquidacion':    container.innerHTML = this.viewLiquidacion(); break;
      case 'cuantificacion': container.innerHTML = this.viewCuantificacion(); break;
      case 'ahorro':         container.innerHTML = this.viewAhorro(); break;
    }
  },

  viewLiquidacion() {
    return `
      <div class="card" data-cat="carga">
        <h3 style="margin-bottom:16px">Planilla de Liquidación Final</h3>
        <form onsubmit="App.calcularLiquidacion(event)">
          <div class="grid-3">
            <div class="form-group">
              <label>Empleado</label>
              <select class="form-control" name="personal_id" required>
                <option value="">Seleccionar</option>
                ${this.empleados.map(e => `<option value="${e.id}">${e.nombre_apellido}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Salario Percibido (Gs.)</label>
              <input class="form-control" name="salario_percibido" type="number" value="2899048">
            </div>
            <div class="form-group">
              <label>Promedio últimos 6 meses (Gs.)</label>
              <input class="form-control" name="promedio_6_meses" type="number" value="2899048">
            </div>
          </div>
          <div class="grid-3">
            <div class="form-group">
              <label>Antigüedad (años)</label>
              <input class="form-control" name="antiguedad_anios" type="number" value="1">
            </div>
            <div class="form-group">
              <label>Meses trabajados</label>
              <input class="form-control" name="meses_trabajados" type="number" value="12">
            </div>
            <div class="form-group">
              <label>Motivo de Desvinculación</label>
              <select class="form-control" name="motivo_desvinculacion">
                <option>Despido injustificado</option>
                <option>Renuncia</option>
                <option>Mutuo acuerdo</option>
                <option>Fin de contrato</option>
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Días vacaciones pendientes</label>
              <input class="form-control" name="dias_vacaciones_pendientes" type="number" value="0">
            </div>
            <div class="form-group">
              <label>Salario del mes pendiente (Gs.)</label>
              <input class="form-control" name="salario_mes_pendiente" type="number" value="0">
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:12px">Calcular Liquidación</button>
        </form>
        <div id="resultadoLiquidacion"></div>
      </div>
    `;
  },

  async calcularLiquidacion(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    // Convert numeric fields
    ['salario_percibido','promedio_6_meses','antiguedad_anios','meses_trabajados','dias_vacaciones_pendientes','salario_mes_pendiente']
      .forEach(k => data[k] = Number(data[k]) || 0);
    try {
      const result = await API.herramientas.calcularLiquidacion(data);
      const r = result.resumen;
      document.getElementById('resultadoLiquidacion').innerHTML = `
        <div style="margin-top:24px;padding:20px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border-color)">
          <h4 style="margin-bottom:16px">Resultado de la Liquidación</h4>
          <table>
            <tr><td>Preaviso</td><td style="text-align:right;font-family:'JetBrains Mono',monospace">${fmt(r.preaviso)}</td></tr>
            <tr><td>Antigüedad</td><td style="text-align:right;font-family:'JetBrains Mono',monospace">${fmt(r.antiguedad)}</td></tr>
            <tr><td>Vacación causada</td><td style="text-align:right;font-family:'JetBrains Mono',monospace">${fmt(r.vacacion_causada)}</td></tr>
            <tr><td>Vacación proporcional</td><td style="text-align:right;font-family:'JetBrains Mono',monospace">${fmt(r.vacacion_proporcional)}</td></tr>
            <tr><td>Aguinaldo proporcional</td><td style="text-align:right;font-family:'JetBrains Mono',monospace">${fmt(r.aguinaldo_proporcional)}</td></tr>
            <tr><td>Salario del mes</td><td style="text-align:right;font-family:'JetBrains Mono',monospace">${fmt(r.salario_mes)}</td></tr>
            <tr><td>Otros haberes</td><td style="text-align:right;font-family:'JetBrains Mono',monospace">${fmt(r.otros_haberes)}</td></tr>
            <tr style="border-top:2px solid var(--border-color)"><td><strong>Subtotal</strong></td><td style="text-align:right;font-family:'JetBrains Mono',monospace"><strong>${fmt(r.subtotal)}</strong></td></tr>
            <tr><td>Descuento IPS (9%)</td><td style="text-align:right;font-family:'JetBrains Mono',monospace;color:var(--danger)">-${fmt(r.descuento_ips_9)}</td></tr>
            <tr style="font-size:18px"><td><strong>TOTAL A COBRAR</strong></td><td style="text-align:right;font-family:'JetBrains Mono',monospace;color:var(--success)"><strong>${fmt(r.total_cobrar)}</strong></td></tr>
          </table>
        </div>
      `;
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  viewCuantificacion() {
    return `
      <div class="card" data-cat="carga">
        <h3 style="margin-bottom:12px">Cuantificación de Incumplimientos</h3>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">
          Seleccione un empleado para ver el resumen de cumplimiento de su gestión laboral.
        </p>
        <select class="form-control" style="max-width:400px" onchange="App.loadCuantificacion(this.value)">
          <option value="">— Elegir empleado —</option>
          ${this.empleados.map(e => `<option value="${e.id}">${e.nombre_apellido}</option>`).join('')}
        </select>
        <div id="cuantResult"></div>
      </div>
    `;
  },

  async loadCuantificacion(personalId) {
    if (!personalId) return;
    try {
      const resumen = await API.gestion.resumen(personalId);
      const container = document.getElementById('cuantResult');
      if (!resumen || !resumen.total_general) {
        container.innerHTML = '<p style="margin-top:16px;color:var(--text-secondary)">Sin datos de gestión. Complete la gestión laboral primero.</p>';
        return;
      }
      const modulos = ['contrato','seguridad_social','horario','salario','vacaciones','aguinaldo'];
      container.innerHTML = `
        <div style="margin-top:20px">
          ${modulos.map(m => {
            const d = resumen[m] || { pasos_completados: 0, pasos_faltantes: 0, porcentaje: 0 };
            const pct = d.porcentaje;
            const barClass = pct >= 80 ? 'fill-success' : pct >= 50 ? 'fill-warning' : 'fill-danger';
            return `
              <div style="margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-weight:600;font-size:13px">${m.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:13px">${pct}% (${d.pasos_completados}/${d.pasos_completados+d.pasos_faltantes})</span>
                </div>
                <div class="progress-bar"><div class="fill ${barClass}" style="width:${pct}%"></div></div>
              </div>
            `;
          }).join('')}
          <div style="margin-top:24px;padding:16px;background:var(--bg-primary);border-radius:8px;text-align:center">
            <div style="font-size:14px;color:var(--text-secondary)">TOTAL GENERAL</div>
            <div style="font-size:36px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${resumen.total_general.porcentaje >= 80 ? 'var(--success)' : 'var(--danger)'}">
              ${resumen.total_general.porcentaje}%
            </div>
            <div style="font-size:13px;color:var(--text-secondary)">${resumen.total_general.total_incumplimientos} incumplimientos detectados</div>
          </div>
        </div>
      `;
    } catch (err) {
      this.showToast('Error cargando resumen', 'danger');
    }
  },

  viewAhorro() {
    return `
      <div class="card" data-cat="carga">
        <h3 style="margin-bottom:12px">Ahorro Programado para Aguinaldo</h3>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">
          Planifique el ahorro mensual para cubrir el aguinaldo de fin de año de cada empleado.
        </p>
        <form onsubmit="App.calcularAhorro(event)">
          <div class="grid-3">
            <div class="form-group">
              <label>Empleado</label>
              <select class="form-control" name="personal_id" required>
                <option value="">Seleccionar</option>
                ${this.empleados.map(e => `<option value="${e.id}">${e.nombre_apellido}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Ingreso Mensual (Gs.)</label>
              <input class="form-control" name="ingreso_mensual" type="number" value="2899048">
            </div>
            <div class="form-group">
              <label>Meses a trabajar este año</label>
              <input class="form-control" name="meses_trabajados" type="number" value="12" min="1" max="12">
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Calcular Ahorro</button>
        </form>
        <div id="resultadoAhorro"></div>
      </div>
    `;
  },

  async calcularAhorro(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.ingreso_mensual = Number(data.ingreso_mensual);
    data.meses_trabajados = Number(data.meses_trabajados);
    try {
      const result = await API.herramientas.calcularAhorro(data);
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const keys = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      document.getElementById('resultadoAhorro').innerHTML = `
        <div style="margin-top:24px;padding:20px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border-color)">
          <h4 style="margin-bottom:16px">Plan de Ahorro Mensual</h4>
          <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap">
            <div><span style="color:var(--text-secondary);font-size:12px">AHORRO MENSUAL</span><br><strong style="font-family:'JetBrains Mono',monospace;font-size:18px">${fmt(result.ahorro_mensual)}</strong></div>
            <div><span style="color:var(--text-secondary);font-size:12px">ACUMULADO</span><br><strong style="font-family:'JetBrains Mono',monospace;font-size:18px">${fmt(result.ahorro_acumulado)}</strong></div>
            <div><span style="color:var(--text-secondary);font-size:12px">AGUINALDO TOTAL</span><br><strong style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--success)">${fmt(result.aguinaldo_total)}</strong></div>
          </div>
          <table>
            <thead><tr>${meses.map(m => `<th style="text-align:center;font-size:10px">${m}</th>`).join('')}</tr></thead>
            <tbody><tr>${keys.map(k => `<td style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px">${result.ahorros[k] > 0 ? fmt(result.ahorros[k]) : '—'}</td>`).join('')}</tr></tbody>
          </table>
        </div>
      `;
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  // ─── ALERTAS ──────────────────────────────────
  viewAlertas() {
    return `
      <div class="topbar">
        <h2>Notificaciones y Alertas</h2>
        <span class="tag tag-alerta">Alertas</span>
      </div>
      ${this.alertas.length === 0 ? `
        <div class="empty-state">
          <div class="icon">${ICON.empty}</div>
          <h3>Sin alertas</h3>
          <p>No hay incumplimientos detectados. ¡Excelente!</p>
        </div>
      ` : `
        <div class="card" data-cat="alerta">
          ${this.alertas.map(a => `
            <div class="alert-item ${a.nivel}" style="opacity:${a.leida ? '0.5' : '1'}">
              <div style="flex:1">
                <div><strong>${a.mensaje}</strong></div>
                <div class="time">Módulo: ${a.modulo || '—'} · ${a.created_at}</div>
              </div>
              ${!a.leida ? `<button class="btn btn-sm btn-outline" onclick="App.marcarLeida(${a.id})">Marcar leída</button>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    `;
  },

  async marcarLeida(id) {
    try {
      await API.gestion.leerAlerta(id);
      await this.loadEmpresa();
      this.navigate('alertas');
    } catch (err) {
      this.showToast('Error', 'danger');
    }
  },

  // ─── PRÓXIMAMENTE ─────────────────────────────
  viewProximamente(titulo, descripcion) {
    return `
      <div class="topbar"><h2>${titulo}</h2></div>
      <div class="empty-state">
        <div class="icon">${ICON.empty}</div>
        <h3>Próximamente</h3>
        <p>${descripcion}</p>
        <div class="proximamente" style="margin-top:16px">En desarrollo</div>
      </div>
    `;
  },

  // ─── CHARTS INIT ──────────────────────────────
  async initChartsForView(view) {
    if (view === 'dashboard' && this.empresa && this.empleados.length > 0) {
      // Try to build a combined resumen from first employee
      try {
        const resumen = await API.gestion.resumen(this.empleados[0].id);
        if (resumen && resumen.total_general) {
          this.charts.donut = Charts.cumplimientoDonut('chartDonut', resumen);
          this.charts.radar = Charts.cumplimientoRadar('chartRadar', resumen);
          this.charts.barras = Charts.cumplimientoBarras('chartBarras', resumen);
        }
      } catch (e) {
        // No data yet — charts will be empty
      }
    }
  },

  // ─── DELETE EMPLEADO ──────────────────────────
  async deleteEmpleado(id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await API.personal.delete(id);
      await this.loadEmpresa();
      this.navigate('personal');
      this.showToast(`${nombre} eliminado`);
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  // ─── USUARIOS (admin) ──────────────────────────
  viewUsuarios() {
    const ROL_BADGE = {
      admin:  '<span class="status status-ok">Admin</span>',
      editor: '<span class="status" style="background:rgba(52,152,219,0.15);color:#3498db">Editor</span>',
      viewer: '<span class="status" style="background:rgba(90,96,112,0.12);color:#5a6070">Viewer</span>',
    };

    return `
      <div class="topbar">
        <h2>Usuarios del Sistema</h2>
        <button class="btn btn-primary" onclick="App.showModalUsuario()">+ Nuevo Usuario</button>
      </div>
      <div class="card" data-cat="admin">
        <div id="tablaUsuarios" class="table-wrap">
          <p style="color:var(--text-secondary);font-size:13px">Cargando...</p>
        </div>
      </div>

      <div class="modal-overlay" id="modalUsuario">
        <div class="modal">
          <h3 id="modalUsuarioTitulo">Nuevo Usuario</h3>
          <form id="formUsuario" onsubmit="App.saveUsuario(event)">
            <input type="hidden" id="usuarioId">
            <div class="grid-2">
              <div class="form-group">
                <label>Usuario</label>
                <input class="form-control" id="usuarioUsername" name="username" required>
              </div>
              <div class="form-group">
                <label>Email</label>
                <input class="form-control" id="usuarioEmail" name="email" type="email">
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label>Contraseña <span id="passHint" style="font-weight:normal;color:var(--text-secondary);font-size:11px"></span></label>
                <input class="form-control" id="usuarioPassword" name="password" type="password" placeholder="••••••••">
              </div>
              <div class="form-group">
                <label>Rol</label>
                <select class="form-control" id="usuarioRol" name="rol" required>
                  <option value="viewer">Viewer — Solo lectura</option>
                  <option value="editor">Editor — Crear y editar</option>
                  <option value="admin">Admin — Acceso total</option>
                </select>
              </div>
            </div>
            <div style="margin-top:20px;display:flex;gap:12px">
              <button type="submit" class="btn btn-success">Guardar</button>
              <button type="button" class="btn btn-outline" onclick="App.closeModal('modalUsuario')">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async loadUsuarios() {
    try {
      const usuarios = await API.auth.usuarios.list();
      const ROL_BADGE = {
        admin:  '<span class="status status-ok" style="font-size:11px">Admin</span>',
        editor: '<span class="status" style="background:rgba(52,152,219,0.15);color:#3498db;font-size:11px">Editor</span>',
        viewer: '<span class="status" style="background:rgba(90,96,112,0.12);color:#5a6070;font-size:11px">Viewer</span>',
      };
      document.getElementById('tablaUsuarios').innerHTML = `
        <table>
          <thead>
            <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${usuarios.map(u => `
              <tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.email || '—'}</td>
                <td>${ROL_BADGE[u.rol] || u.rol}</td>
                <td><span class="status ${u.activo ? 'status-ok' : 'status-danger'}">${u.activo ? '● Activo' : '● Inactivo'}</span></td>
                <td style="font-size:12px;color:var(--text-secondary)">${u.created_at?.split(' ')[0] || '—'}</td>
                <td style="display:flex;gap:6px">
                  <button class="btn btn-sm btn-outline" onclick="App.showModalUsuario(${JSON.stringify(u).replace(/"/g,'&quot;')})">Editar</button>
                  ${u.id !== App.user.id ? `<button class="btn btn-sm btn-danger" onclick="App.deleteUsuario(${u.id},'${u.username}')">Eliminar</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      this.showToast('Error cargando usuarios: ' + err.message, 'danger');
    }
  },

  showModalUsuario(u = null) {
    document.getElementById('usuarioId').value       = u?.id || '';
    document.getElementById('usuarioUsername').value = u?.username || '';
    document.getElementById('usuarioEmail').value    = u?.email || '';
    document.getElementById('usuarioRol').value      = u?.rol || 'viewer';
    document.getElementById('usuarioPassword').value = '';
    document.getElementById('modalUsuarioTitulo').textContent = u ? 'Editar Usuario' : 'Nuevo Usuario';
    document.getElementById('passHint').textContent  = u ? '(dejar vacío para no cambiar)' : '';
    document.getElementById('usuarioUsername').disabled = !!u;
    document.getElementById('modalUsuario').classList.add('show');
  },

  async saveUsuario(e) {
    e.preventDefault();
    const id       = document.getElementById('usuarioId').value;
    const username = document.getElementById('usuarioUsername').value;
    const email    = document.getElementById('usuarioEmail').value;
    const password = document.getElementById('usuarioPassword').value;
    const rol      = document.getElementById('usuarioRol').value;

    const payload = { email, rol };
    if (!id) payload.username = username;
    if (password) payload.password = password;

    try {
      if (id) {
        await API.auth.usuarios.update(id, payload);
        this.showToast('Usuario actualizado');
      } else {
        payload.username = username;
        payload.password = password;
        await API.auth.usuarios.create(payload);
        this.showToast('Usuario creado');
      }
      this.closeModal('modalUsuario');
      await this.loadUsuarios();
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  async deleteUsuario(id, username) {
    if (!confirm(`¿Eliminar usuario "${username}"?`)) return;
    try {
      await API.auth.usuarios.delete(id);
      this.showToast(`Usuario ${username} eliminado`);
      await this.loadUsuarios();
    } catch (err) {
      this.showToast('Error: ' + err.message, 'danger');
    }
  },

  // ─── TOAST ────────────────────────────────────
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;padding:14px 24px;border-radius:10px;
      font-size:14px;font-weight:600;z-index:9999;
      color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
      background:${type === 'danger' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--success)'};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  },
};

// ─── Helper format Guaranies ────────────────────
function fmt(n) {
  return Math.round(n || 0).toLocaleString('es-PY') + ' Gs.';
}

// ─── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (DEMO_MODE) {
    const hint = document.getElementById('demoHint');
    if (hint) hint.style.display = 'block';
  }
  App.init();
});

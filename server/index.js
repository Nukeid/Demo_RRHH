const express = require('express');
const cors = require('cors');
const path = require('path');
const { initTables } = require('./models/init-tables');
const { authMiddleware, methodAuthMiddleware } = require('./middleware/auth');

// Rutas
const authRoutes        = require('./routes/auth');
const empresaRoutes     = require('./routes/empresa');
const personalRoutes    = require('./routes/personal');
const gestionRoutes     = require('./routes/gestion');
const herramientasRoutes = require('./routes/herramientas');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware global ─────────────────────────
app.use(cors());
app.use(express.json());

// ─── Servir frontend estático ──────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Rutas de auth (login es pública, el resto requiere token) ──
app.use('/api/auth', authMiddleware, authRoutes);

// ─── Resto de la API: requiere token + control por rol ──
app.use(authMiddleware);
app.use(methodAuthMiddleware);

// ─── Servir schemas ───────────────────────────
app.use('/api/schemas', express.static(path.join(__dirname, '..', 'schemas')));

// ─── API Routes ────────────────────────────────
app.use('/api/empresa', empresaRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/gestion', gestionRoutes);
app.use('/api/herramientas', herramientasRoutes);

// ─── Health check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    nombre: 'NogueraRRHH',
    modulos: ['A_empresa', 'B_personal', 'C_gestion_laboral', 'D_gestion_sso', 'E_herramientas', 'F_anexos'],
    modulos_activos: ['A_empresa', 'B_personal', 'C_gestion_laboral', 'E_herramientas'],
    modulos_proximamente: ['D_gestion_sso', 'F_anexos']
  });
});

// ─── Catch-all → index.html (SPA) ──────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

// ─── Inicializar BD y arrancar ─────────────────
initTables();

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🏢  NogueraRRHH — Demo Server         ║
  ║   📍  http://localhost:${PORT}              ║
  ║   📂  BD: ./data/noguera.db             ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;

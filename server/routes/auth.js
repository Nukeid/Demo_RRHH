const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const { getDb }    = require('../database');
const { signToken } = require('../middleware/auth');

// ─── LOGIN ───────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE username = ? AND activo = 1').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username, rol: user.rol, email: user.email } });
});

// ─── PERFIL ACTUAL ───────────────────────────────
router.get('/me', (req, res) => {
  res.json(req.user);
});

// ─── USUARIOS (solo admin) ───────────────────────

function soloAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}

// GET — listar
router.get('/usuarios', soloAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, username, email, rol, activo, created_at FROM usuarios ORDER BY id').all();
  res.json(rows);
});

// POST — crear
router.post('/usuarios', soloAdmin, (req, res) => {
  const { username, email, password, rol } = req.body;
  if (!username || !password || !rol) {
    return res.status(400).json({ error: 'username, password y rol son requeridos' });
  }
  const rolesValidos = ['admin', 'editor', 'viewer'];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  try {
    const hash = bcrypt.hashSync(password, 10);
    const db   = getDb();
    const result = db.prepare(
      'INSERT INTO usuarios (username, email, password, rol) VALUES (?, ?, ?, ?)'
    ).run(username, email || '', hash, rol);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Usuario creado' });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'El usuario ya existe' : err.message });
  }
});

// PUT — editar (puede cambiar rol, email, password)
router.put('/usuarios/:id', soloAdmin, (req, res) => {
  const { email, rol, password, activo } = req.body;
  const db = getDb();

  // No permitir eliminar el único admin
  if (rol && rol !== 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as n FROM usuarios WHERE rol = 'admin' AND activo = 1").get();
    const esAdmin    = db.prepare("SELECT rol FROM usuarios WHERE id = ?").get(req.params.id);
    if (esAdmin?.rol === 'admin' && adminCount.n <= 1) {
      return res.status(400).json({ error: 'No se puede cambiar el rol del único administrador' });
    }
  }

  const updates = [];
  const params  = [];

  if (email    !== undefined) { updates.push('email = ?');  params.push(email); }
  if (rol      !== undefined) { updates.push('rol = ?');    params.push(rol); }
  if (activo   !== undefined) { updates.push('activo = ?'); params.push(activo ? 1 : 0); }
  if (password)               { updates.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }

  if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });

  params.push(req.params.id);
  db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Usuario actualizado' });
});

// DELETE — eliminar
router.delete('/usuarios/:id', soloAdmin, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Proteger último admin
  if (user.rol === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as n FROM usuarios WHERE rol = 'admin' AND activo = 1").get();
    if (adminCount.n <= 1) {
      return res.status(400).json({ error: 'No se puede eliminar el único administrador' });
    }
  }

  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  res.json({ message: 'Usuario eliminado' });
});

module.exports = router;

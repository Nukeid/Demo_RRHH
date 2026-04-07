const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// ─── GESTIÓN LABORAL ────────────────────────────

// GET — Gestión laboral de un empleado
router.get('/laboral/:personal_id', (req, res) => {
  const db = getDb();
  let row = db.prepare('SELECT * FROM gestion_laboral WHERE personal_id = ?').get(req.params.personal_id);
  if (!row) {
    // Crear registro vacío si no existe
    db.prepare('INSERT OR IGNORE INTO gestion_laboral (personal_id) VALUES (?)').run(req.params.personal_id);
    row = db.prepare('SELECT * FROM gestion_laboral WHERE personal_id = ?').get(req.params.personal_id);
  }
  // Parsear JSONs
  ['contrato', 'seguridad_social', 'horario', 'salario', 'vacaciones', 'aguinaldo', 'resumen'].forEach(field => {
    try { row[field] = JSON.parse(row[field]); } catch { row[field] = {}; }
  });
  res.json(row);
});

// PUT — Actualizar un submódulo de gestión laboral
router.put('/laboral/:personal_id/:submodulo', (req, res) => {
  const db = getDb();
  const { personal_id, submodulo } = req.params;
  const validos = ['contrato', 'seguridad_social', 'horario', 'salario', 'vacaciones', 'aguinaldo'];
  if (!validos.includes(submodulo)) {
    return res.status(400).json({ error: `Submódulo inválido. Usar: ${validos.join(', ')}` });
  }

  try {
    const json = JSON.stringify(req.body);
    db.prepare(`UPDATE gestion_laboral SET ${submodulo} = ?, updated_at = datetime('now') WHERE personal_id = ?`)
      .run(json, personal_id);

    // Recalcular resumen
    recalcularResumen(db, personal_id);

    // Generar alertas
    generarAlertas(db, personal_id, submodulo, req.body);

    res.json({ message: `${submodulo} actualizado` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET — Resumen de cumplimiento de un empleado
router.get('/resumen/:personal_id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT resumen FROM gestion_laboral WHERE personal_id = ?').get(req.params.personal_id);
  if (!row) return res.status(404).json({ error: 'No encontrado' });
  try { res.json(JSON.parse(row.resumen)); } catch { res.json({}); }
});

// ─── ALERTAS ────────────────────────────────────

// GET — Alertas de una empresa
router.get('/alertas/:empresa_id', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM alertas WHERE empresa_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.empresa_id);
  res.json(rows);
});

// PUT — Marcar alerta como leída
router.put('/alertas/:id/leer', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE alertas SET leida = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Alerta marcada como leída' });
});

// ─── HELPERS ────────────────────────────────────

function contarPasos(obj) {
  let completados = 0, faltantes = 0;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'object' && val !== null) {
      const sub = contarPasos(val);
      completados += sub.completados;
      faltantes += sub.faltantes;
    } else if (typeof val === 'string') {
      if (val === '' || val === 'No') faltantes++;
      else completados++;
    }
  }
  return { completados, faltantes };
}

function recalcularResumen(db, personalId) {
  const row = db.prepare('SELECT * FROM gestion_laboral WHERE personal_id = ?').get(personalId);
  if (!row) return;

  const modulos = ['contrato', 'seguridad_social', 'horario', 'salario', 'vacaciones', 'aguinaldo'];
  const resumen = {};
  let totalComp = 0, totalFalt = 0;

  for (const mod of modulos) {
    let data;
    try { data = JSON.parse(row[mod]); } catch { data = {}; }
    const { completados, faltantes } = contarPasos(data);
    const total = completados + faltantes;
    resumen[mod] = {
      pasos_completados: completados,
      pasos_faltantes: faltantes,
      porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0
    };
    totalComp += completados;
    totalFalt += faltantes;
  }

  const totalGeneral = totalComp + totalFalt;
  resumen.total_general = {
    pasos_completados: totalComp,
    pasos_faltantes: totalFalt,
    porcentaje: totalGeneral > 0 ? Math.round((totalComp / totalGeneral) * 100) : 0,
    total_incumplimientos: totalFalt
  };

  db.prepare("UPDATE gestion_laboral SET resumen = ?, updated_at = datetime('now') WHERE personal_id = ?")
    .run(JSON.stringify(resumen), personalId);
}

function generarAlertas(db, personalId, submodulo, data) {
  const personal = db.prepare('SELECT empresa_id, nombre_apellido FROM personal WHERE id = ?').get(personalId);
  if (!personal) return;

  const alertas = [];

  // Verificar incumplimientos críticos según submódulo
  if (submodulo === 'contrato') {
    if (data.redactado === 'No') alertas.push({ nivel: 'danger', mensaje: `Contrato NO redactado para ${personal.nombre_apellido}` });
    if (data.copia_entregada === 'No') alertas.push({ nivel: 'warning', mensaje: `Copia de contrato NO entregada a ${personal.nombre_apellido}` });
  }
  if (submodulo === 'seguridad_social') {
    if (data.afiliacion_ips === 'No') alertas.push({ nivel: 'danger', mensaje: `${personal.nombre_apellido} NO está afiliado al IPS` });
  }
  if (submodulo === 'salario') {
    if (data.cumple_smlv === 'No') alertas.push({ nivel: 'danger', mensaje: `Salario de ${personal.nombre_apellido} MENOR al SMLV` });
  }
  if (submodulo === 'aguinaldo') {
    if (data.antes_31_diciembre === 'No') alertas.push({ nivel: 'danger', mensaje: `Aguinaldo de ${personal.nombre_apellido} NO pagado antes del 31/12` });
  }

  for (const a of alertas) {
    db.prepare(`
      INSERT INTO alertas (empresa_id, personal_id, tipo, nivel, mensaje, modulo)
      VALUES (?, ?, 'incumplimiento', ?, ?, ?)
    `).run(personal.empresa_id, personalId, a.nivel, a.mensaje, submodulo);
  }
}

module.exports = router;

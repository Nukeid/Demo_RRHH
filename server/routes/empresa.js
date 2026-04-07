const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET — Obtener empresa(s)
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM empresa ORDER BY id DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM empresa WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Empresa no encontrada' });
  res.json(row);
});

// POST — Crear empresa
router.post('/', (req, res) => {
  const db = getDb();
  const b = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO empresa (
        ruc, razon_social, nombre_fantasia, tipo_sociedad, segun_dnit,
        unipersonal_juridica, actividad_principal, cod_dnit_principal,
        actividad_secundaria, cod_dnit_secundario,
        calle, barrio, ciudad, depto, correo,
        rep_nombre, rep_ci, rep_telefono, rep_celular, rep_correo,
        n_patronal_ips, n_mtess_matriz, n_mtess_sucursal,
        facturacion_anterior, categoria_dnit, cantidad_trabajadores, categoria_mtess,
        mipymes_cedula, mipymes_grande, mipymes_fecha_exp
      ) VALUES (
        @ruc, @razon_social, @nombre_fantasia, @tipo_sociedad, @segun_dnit,
        @unipersonal_juridica, @actividad_principal, @cod_dnit_principal,
        @actividad_secundaria, @cod_dnit_secundario,
        @calle, @barrio, @ciudad, @depto, @correo,
        @rep_nombre, @rep_ci, @rep_telefono, @rep_celular, @rep_correo,
        @n_patronal_ips, @n_mtess_matriz, @n_mtess_sucursal,
        @facturacion_anterior, @categoria_dnit, @cantidad_trabajadores, @categoria_mtess,
        @mipymes_cedula, @mipymes_grande, @mipymes_fecha_exp
      )
    `);
    const result = stmt.run({
      ruc: b.ruc || '',
      razon_social: b.razon_social || '',
      nombre_fantasia: b.nombre_fantasia || '',
      tipo_sociedad: b.tipo_sociedad || '',
      segun_dnit: b.segun_dnit || '',
      unipersonal_juridica: b.unipersonal_juridica || '',
      actividad_principal: b.actividad_principal || '',
      cod_dnit_principal: b.cod_dnit_principal || '',
      actividad_secundaria: b.actividad_secundaria || '',
      cod_dnit_secundario: b.cod_dnit_secundario || '',
      calle: b.calle || '',
      barrio: b.barrio || '',
      ciudad: b.ciudad || '',
      depto: b.depto || '',
      correo: b.correo || '',
      rep_nombre: b.rep_nombre || '',
      rep_ci: b.rep_ci || '',
      rep_telefono: b.rep_telefono || '',
      rep_celular: b.rep_celular || '',
      rep_correo: b.rep_correo || '',
      n_patronal_ips: b.n_patronal_ips || '',
      n_mtess_matriz: b.n_mtess_matriz || '',
      n_mtess_sucursal: b.n_mtess_sucursal || '',
      facturacion_anterior: b.facturacion_anterior || 0,
      categoria_dnit: b.categoria_dnit || '',
      cantidad_trabajadores: b.cantidad_trabajadores || 0,
      categoria_mtess: b.categoria_mtess || '',
      mipymes_cedula: b.mipymes_cedula || '',
      mipymes_grande: b.mipymes_grande ? 1 : 0,
      mipymes_fecha_exp: b.mipymes_fecha_exp || ''
    });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Empresa creada' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT — Actualizar empresa
router.put('/:id', (req, res) => {
  const db = getDb();
  const b = req.body;
  const fields = Object.keys(b).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return res.status(400).json({ error: 'Sin campos para actualizar' });

  try {
    const stmt = db.prepare(`UPDATE empresa SET ${fields}, updated_at = datetime('now') WHERE id = @id`);
    stmt.run({ ...b, id: req.params.id });
    res.json({ message: 'Empresa actualizada' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM empresa WHERE id = ?').run(req.params.id);
  res.json({ message: 'Empresa eliminada' });
});

module.exports = router;

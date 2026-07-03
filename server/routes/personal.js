const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET — Listar empleados (opcional: filtrar por empresa_id)
router.get('/', (req, res) => {
  const db = getDb();
  const { empresa_id } = req.query;
  let rows;
  if (empresa_id) {
    rows = db.prepare('SELECT * FROM personal WHERE empresa_id = ? ORDER BY nombre_apellido').all(empresa_id);
  } else {
    rows = db.prepare('SELECT * FROM personal ORDER BY nombre_apellido').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM personal WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Empleado no encontrado' });
  res.json(row);
});

// POST — Crear empleado
router.post('/', (req, res) => {
  const db = getDb();
  const b = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO personal (
        empresa_id, condicion_tipo, cedula, nombre_apellido, nacionalidad,
        estado_civil, hijos_menores, cant_hijos, cargo,
        modulo, subgrupo_unico, sector,
        dom_calle, dom_barrio, dom_dpto,
        ciudad, telefono, tipo_contacto, correo,
        fecha_ingreso, antiguedad_actual, fecha_salida
      ) VALUES (
        @empresa_id, @condicion_tipo, @cedula, @nombre_apellido, @nacionalidad,
        @estado_civil, @hijos_menores, @cant_hijos, @cargo,
        @modulo, @subgrupo_unico, @sector,
        @dom_calle, @dom_barrio, @dom_dpto,
        @ciudad, @telefono, @tipo_contacto, @correo,
        @fecha_ingreso, @antiguedad_actual, @fecha_salida
      )
    `);
    const result = stmt.run({
      empresa_id: b.empresa_id,
      condicion_tipo: b.condicion_tipo || 'Ingreso',
      cedula: b.cedula || '',
      nombre_apellido: b.nombre_apellido || '',
      nacionalidad: b.nacionalidad || 'Paraguaya',
      estado_civil: b.estado_civil || '',
      hijos_menores: b.hijos_menores ? 1 : 0,
      cant_hijos: b.cant_hijos || 0,
      cargo: b.cargo || '',
      modulo: b.modulo || 0,
      subgrupo_unico: b.subgrupo_unico || '',
      sector: b.sector || '',
      dom_calle: b.dom_calle || '',
      dom_barrio: b.dom_barrio || '',
      dom_dpto: b.dom_dpto || '',
      ciudad: b.ciudad || '',
      telefono: b.telefono || '',
      tipo_contacto: b.tipo_contacto || '',
      correo: b.correo || '',
      fecha_ingreso: b.fecha_ingreso || '',
      antiguedad_actual: b.antiguedad_actual || '',
      fecha_salida: b.fecha_salida || ''
    });

    // Crear registro de gestión laboral vacío para el nuevo empleado
    db.prepare('INSERT OR IGNORE INTO gestion_laboral (personal_id) VALUES (?)').run(result.lastInsertRowid);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Empleado creado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT — Actualizar empleado
router.put('/:id', (req, res) => {
  const db = getDb();
  const b = req.body;
  const fields = Object.keys(b).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return res.status(400).json({ error: 'Sin campos para actualizar' });

  try {
    const stmt = db.prepare(`UPDATE personal SET ${fields}, updated_at = datetime('now') WHERE id = @id`);
    stmt.run({ ...b, id: req.params.id });
    res.json({ message: 'Empleado actualizado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    const deleteCascade = db.transaction((id) => {
      // liquidaciones y ahorro_aguinaldo no tienen ON DELETE CASCADE en su FK
      db.prepare('DELETE FROM liquidaciones WHERE personal_id = ?').run(id);
      db.prepare('DELETE FROM ahorro_aguinaldo WHERE personal_id = ?').run(id);
      db.prepare('DELETE FROM alertas WHERE personal_id = ?').run(id);
      db.prepare('DELETE FROM personal WHERE id = ?').run(id);
    });
    deleteCascade(req.params.id);
    res.json({ message: 'Empleado eliminado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

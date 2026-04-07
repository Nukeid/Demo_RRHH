const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// ─── CALCULADORA LIQUIDACIÓN ─────────────────────

// POST — Calcular y guardar liquidación
router.post('/liquidacion', (req, res) => {
  const db = getDb();
  const b = req.body;

  try {
    const salario = b.salario_percibido || 0;
    const prom6 = b.promedio_6_meses || salario;
    const smlv = b.smlv || 2899048;
    const antiguedadAnios = b.antiguedad_anios || 0;
    const mesesTrabajados = b.meses_trabajados || 0;
    const diasVacPendientes = b.dias_vacaciones_pendientes || 0;
    const motivo = b.motivo_desvinculacion || '';

    // Cálculos según legislación paraguaya
    const salarioDiario = salario / 30;
    const salarioHora = salario / 240;

    // Preaviso: 30 días de salario (solo despido injustificado)
    const preaviso = motivo === 'Despido injustificado' ? salario : 0;

    // Antigüedad: 15 días por año sobre promedio últimos 6 meses
    const antiguedad = motivo === 'Despido injustificado'
      ? (prom6 / 30) * 15 * antiguedadAnios
      : 0;

    // Vacaciones causadas (días pendientes)
    const vacCausada = salarioDiario * diasVacPendientes;

    // Vacaciones proporcionales
    const vacProporcional = (salario / 12) * (mesesTrabajados % 12) / 30 * diasVacPendientes;

    // Aguinaldo proporcional
    const aguinaldoProp = (salario / 12) * (mesesTrabajados % 12 || mesesTrabajados);

    // Salario del mes
    const salarioMes = b.salario_mes_pendiente || 0;

    // Otros haberes
    const otros = (b.reajuste_salarial || 0) + (b.horas_extras || 0) +
                  (b.horas_nocturnas || 0) + (b.feriados || 0);

    const subtotal = preaviso + antiguedad + vacCausada + vacProporcional +
                     aguinaldoProp + salarioMes + otros;
    const descuentoIps = subtotal * 0.09;
    const total = subtotal - descuentoIps;

    const result = db.prepare(`
      INSERT INTO liquidaciones (
        personal_id, salario_percibido, promedio_6_meses, smlv,
        motivo_desvinculacion, preaviso, antiguedad,
        vacacion_causada, vacacion_proporcional,
        aguinaldo, aguinaldo_proporcional, salario_mes,
        otros_haberes, subtotal, descuento_ips_9, total_cobrar,
        fecha_elaboracion, datos_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.personal_id, salario, prom6, smlv, motivo,
      preaviso, antiguedad, vacCausada, vacProporcional,
      aguinaldoProp, salarioMes, otros, subtotal, descuentoIps, total,
      new Date().toISOString().split('T')[0],
      JSON.stringify(b)
    );

    res.json({
      id: result.lastInsertRowid,
      resumen: {
        preaviso, antiguedad, vacacion_causada: vacCausada,
        vacacion_proporcional: vacProporcional,
        aguinaldo_proporcional: aguinaldoProp,
        salario_mes: salarioMes, otros_haberes: otros,
        subtotal, descuento_ips_9: descuentoIps, total_cobrar: total
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET — Listar liquidaciones de un empleado
router.get('/liquidacion/:personal_id', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM liquidaciones WHERE personal_id = ? ORDER BY created_at DESC')
    .all(req.params.personal_id);
  res.json(rows);
});

// ─── AHORRO AGUINALDO ──────────────────────────

// POST — Crear/actualizar tabla de ahorro
router.post('/ahorro-aguinaldo', (req, res) => {
  const db = getDb();
  const b = req.body;

  try {
    const ingreso = b.ingreso_mensual || 0;
    const meses = b.meses_trabajados || 12;
    const ahorroMensual = ingreso / 12;

    // Generar ahorros por mes
    const ahorros = {};
    const mesesNombres = ['enero','febrero','marzo','abril','mayo','junio',
                          'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    let acumulado = 0;
    for (let i = 0; i < 12; i++) {
      if (i < meses) {
        ahorros[mesesNombres[i]] = Math.round(ahorroMensual);
        acumulado += ahorroMensual;
      } else {
        ahorros[mesesNombres[i]] = 0;
      }
    }

    const aguinaldoTotal = Math.round((ingreso / 12) * meses);

    const stmt = db.prepare(`
      INSERT INTO ahorro_aguinaldo (personal_id, anio, ingreso_mensual, meses_trabajados, tipo_aguinaldo, ahorros_json, ahorro_acumulado, aguinaldo_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(personal_id, anio) DO UPDATE SET
        ingreso_mensual = excluded.ingreso_mensual,
        meses_trabajados = excluded.meses_trabajados,
        tipo_aguinaldo = excluded.tipo_aguinaldo,
        ahorros_json = excluded.ahorros_json,
        ahorro_acumulado = excluded.ahorro_acumulado,
        aguinaldo_total = excluded.aguinaldo_total
    `);
    stmt.run(
      b.personal_id, b.anio || new Date().getFullYear(),
      ingreso, meses,
      meses >= 12 ? 'Completo' : 'Proporcional',
      JSON.stringify(ahorros),
      Math.round(acumulado), aguinaldoTotal
    );

    res.json({
      ahorros, ahorro_acumulado: Math.round(acumulado),
      aguinaldo_total: aguinaldoTotal,
      ahorro_mensual: Math.round(ahorroMensual)
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET — Tabla de ahorro de una empresa para un año
router.get('/ahorro-aguinaldo/:empresa_id/:anio', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT aa.*, p.nombre_apellido, p.cargo
    FROM ahorro_aguinaldo aa
    JOIN personal p ON p.id = aa.personal_id
    WHERE p.empresa_id = ? AND aa.anio = ?
    ORDER BY p.nombre_apellido
  `).all(req.params.empresa_id, req.params.anio);

  rows.forEach(r => {
    try { r.ahorros = JSON.parse(r.ahorros_json); } catch { r.ahorros = {}; }
  });

  res.json(rows);
});

module.exports = router;

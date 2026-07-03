const { getDb } = require('../database');
const bcrypt = require('bcryptjs');

function initTables() {
  const db = getDb();

  // ──────────────────────────────────────────────
  // A — DATOS DE LA EMPRESA
  // ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS empresa (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      ruc                   TEXT NOT NULL UNIQUE,
      razon_social          TEXT NOT NULL,
      nombre_fantasia       TEXT,
      tipo_sociedad         TEXT,
      segun_dnit            TEXT,
      unipersonal_juridica  TEXT,
      actividad_principal   TEXT,
      cod_dnit_principal    TEXT,
      actividad_secundaria  TEXT,
      cod_dnit_secundario   TEXT,
      calle                 TEXT,
      barrio                TEXT,
      ciudad                TEXT,
      depto                 TEXT,
      correo                TEXT,
      rep_nombre            TEXT,
      rep_ci                TEXT,
      rep_telefono          TEXT,
      rep_celular           TEXT,
      rep_correo            TEXT,
      n_patronal_ips        TEXT,
      n_mtess_matriz        TEXT,
      n_mtess_sucursal      TEXT,
      facturacion_anterior  REAL,
      categoria_dnit        TEXT,
      cantidad_trabajadores INTEGER,
      categoria_mtess       TEXT,
      mipymes_cedula        TEXT,
      mipymes_grande        INTEGER DEFAULT 0,
      mipymes_fecha_exp     TEXT,
      created_at            TEXT DEFAULT (datetime('now')),
      updated_at            TEXT DEFAULT (datetime('now'))
    );
  `);

  // ──────────────────────────────────────────────
  // B — DATOS DEL PERSONAL
  // ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS personal (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id        INTEGER NOT NULL,
      condicion_tipo    TEXT,
      cedula            TEXT NOT NULL,
      nombre_apellido   TEXT NOT NULL,
      nacionalidad      TEXT,
      estado_civil      TEXT,
      hijos_menores     INTEGER DEFAULT 0,
      cant_hijos        INTEGER DEFAULT 0,
      cargo             TEXT,
      modulo            INTEGER,
      subgrupo_unico    TEXT,
      sector            TEXT,
      dom_calle         TEXT,
      dom_barrio        TEXT,
      dom_dpto          TEXT,
      ciudad            TEXT,
      telefono          TEXT,
      tipo_contacto     TEXT,
      correo            TEXT,
      fecha_ingreso     TEXT,
      antiguedad_actual TEXT,
      fecha_salida      TEXT,
      activo            INTEGER DEFAULT 1,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE
    );
  `);

  // ──────────────────────────────────────────────
  // C — GESTIÓN LABORAL (datos por empleado)
  //     Se guarda como JSON para flexibilidad demo
  // ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS gestion_laboral (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      personal_id     INTEGER NOT NULL UNIQUE,
      contrato        TEXT DEFAULT '{}',
      seguridad_social TEXT DEFAULT '{}',
      horario         TEXT DEFAULT '{}',
      salario         TEXT DEFAULT '{}',
      vacaciones      TEXT DEFAULT '{}',
      aguinaldo       TEXT DEFAULT '{}',
      resumen         TEXT DEFAULT '{}',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE CASCADE
    );
  `);

  // ──────────────────────────────────────────────
  // E1 — LIQUIDACIONES
  // ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS liquidaciones (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      personal_id           INTEGER NOT NULL,
      salario_percibido     REAL DEFAULT 0,
      promedio_6_meses      REAL DEFAULT 0,
      smlv                  REAL DEFAULT 2899048,
      motivo_desvinculacion TEXT,
      preaviso              REAL DEFAULT 0,
      antiguedad            REAL DEFAULT 0,
      vacacion_causada      REAL DEFAULT 0,
      vacacion_proporcional REAL DEFAULT 0,
      aguinaldo             REAL DEFAULT 0,
      aguinaldo_proporcional REAL DEFAULT 0,
      salario_mes           REAL DEFAULT 0,
      otros_haberes         REAL DEFAULT 0,
      subtotal              REAL DEFAULT 0,
      descuento_ips_9       REAL DEFAULT 0,
      total_cobrar          REAL DEFAULT 0,
      fecha_elaboracion     TEXT,
      datos_json            TEXT DEFAULT '{}',
      created_at            TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE CASCADE
    );
  `);

  // ──────────────────────────────────────────────
  // E3 — AHORRO AGUINALDO
  // ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS ahorro_aguinaldo (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      personal_id       INTEGER NOT NULL,
      anio              INTEGER NOT NULL,
      ingreso_mensual   REAL DEFAULT 0,
      meses_trabajados  INTEGER DEFAULT 12,
      tipo_aguinaldo    TEXT DEFAULT 'Completo',
      ahorros_json      TEXT DEFAULT '{}',
      ahorro_acumulado  REAL DEFAULT 0,
      aguinaldo_total   REAL DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE CASCADE,
      UNIQUE(personal_id, anio)
    );
  `);

  // ──────────────────────────────────────────────
  // NOTIFICACIONES / ALERTAS
  // ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS alertas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id  INTEGER NOT NULL,
      personal_id INTEGER,
      tipo        TEXT NOT NULL,
      nivel       TEXT DEFAULT 'warning',
      mensaje     TEXT NOT NULL,
      modulo      TEXT,
      leida       INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (empresa_id) REFERENCES empresa(id)
    );
  `);

  // ──────────────────────────────────────────────
  // USUARIOS
  // ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      email      TEXT,
      password   TEXT NOT NULL,
      rol        TEXT NOT NULL DEFAULT 'viewer' CHECK(rol IN ('admin','editor','viewer')),
      activo     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrar usuario admin existente con credenciales por defecto
  const adminDefault = db.prepare("SELECT id FROM usuarios WHERE username = 'admin'").get();
  if (adminDefault) {
    const hash = bcrypt.hashSync('554558Kaiser+', 10);
    db.prepare("UPDATE usuarios SET username = 'adminJG81', password = ? WHERE username = 'admin'").run(hash);
    console.log('👤 Credenciales de admin actualizadas');
  }

  // Seed: crear adminJG81 si no existe ningún admin
  const adminExiste = db.prepare("SELECT id FROM usuarios WHERE username = 'adminJG81'").get();
  if (!adminExiste) {
    const hash = bcrypt.hashSync('554558Kaiser+', 10);
    db.prepare("INSERT INTO usuarios (username, email, password, rol) VALUES ('adminJG81', 'admin@noguera.com', ?, 'admin')").run(hash);
    console.log('👤 Usuario adminJG81 creado');
  }

  console.log('✅ Tablas inicializadas correctamente');
}

module.exports = { initTables };

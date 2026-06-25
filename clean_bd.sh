#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="$ROOT_DIR/data/noguera.db"
FORCE="${CLEAN_BD_FORCE:-0}"

if [[ "${1:-}" == "--force" || "${1:-}" == "-f" ]]; then
  FORCE=1
  DB_PATH="${2:-$DB_PATH}"
elif [[ -n "${1:-}" ]]; then
  DB_PATH="$1"
fi

if [[ ! -f "$DB_PATH" ]]; then
  echo "Base de datos no encontrada: $DB_PATH" >&2
  exit 1
fi

if [[ "$FORCE" != "1" ]]; then
  echo "Esto borrará el contenido de los datos de empresa y dejará la fila en blanco:"
  echo "  $DB_PATH"
  read -r -p "Escriba 'SI' para continuar: " CONFIRM
  CONFIRM="$(printf '%s' "$CONFIRM" | tr '[:lower:]' '[:upper:]')"
  if [[ "$CONFIRM" != "SI" ]]; then
    echo "Operación cancelada."
    exit 0
  fi
fi

export ROOT_DIR DB_PATH

node <<'NODE'
const path = require('path');
const Database = require(path.join(process.env.ROOT_DIR, 'node_modules', 'better-sqlite3'));

const dbPath = process.env.DB_PATH;
const db = new Database(dbPath);

try {
  const tableExists = db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = 'empresa'
  `).get();

  if (!tableExists) {
    console.log(`La tabla empresa no existe en ${dbPath}.`);
  } else {
    const empresas = db.prepare('SELECT id FROM empresa ORDER BY id').all();
    if (empresas.length === 0) {
      console.log(`No hay registros en empresa para limpiar en ${dbPath}.`);
    } else {
      const clearEmpresa = db.prepare(`
        UPDATE empresa
        SET
          ruc = ?,
          razon_social = '',
          nombre_fantasia = '',
          tipo_sociedad = '',
          segun_dnit = '',
          unipersonal_juridica = '',
          actividad_principal = '',
          cod_dnit_principal = '',
          actividad_secundaria = '',
          cod_dnit_secundario = '',
          calle = '',
          barrio = '',
          ciudad = '',
          depto = '',
          correo = '',
          rep_nombre = '',
          rep_ci = '',
          rep_telefono = '',
          rep_celular = '',
          rep_correo = '',
          n_patronal_ips = '',
          n_mtess_matriz = '',
          n_mtess_sucursal = '',
          facturacion_anterior = NULL,
          categoria_dnit = '',
          cantidad_trabajadores = NULL,
          categoria_mtess = '',
          mipymes_cedula = '',
          mipymes_grande = 0,
          mipymes_fecha_exp = '',
          updated_at = datetime('now')
        WHERE id = ?
      `);

      const run = db.transaction(() => {
        empresas.forEach(({ id }, index) => {
          const uniqueBlankRuc = ' '.repeat(index);
          clearEmpresa.run(uniqueBlankRuc, id);
        });
      });

      run();
      db.pragma('wal_checkpoint(TRUNCATE)');
      console.log(`Datos de empresa limpiados correctamente: ${dbPath}`);
      console.log(`Filas actualizadas: ${empresas.length}`);
    }
  }
} finally {
  db.close();
}
NODE

# 📘 Guía de Despliegue — NogueraRRHH

## 1. Requisitos Previos

- **Node.js** v18+ → [nodejs.org](https://nodejs.org)
- **npm** (viene con Node.js)
- Git (opcional)

Verificar instalación:
```bash
node -v   # debe mostrar v18.x o superior
npm -v    # debe mostrar 9.x o superior
```

---

## 2. Instalación Local

```bash
# Clonar o copiar el proyecto
cd noguera-rrhh

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

El servidor arranca en **http://localhost:3000** y crea automáticamente la base de datos SQLite en `./data/noguera.db`.

---

## 3. Estructura de la Base de Datos (SQLite)

La BD se crea automáticamente al primer arranque. Las tablas son:

| Tabla              | Descripción                                    |
|--------------------|------------------------------------------------|
| `empresa`          | Datos de la empresa (RUC, razón social, etc.)  |
| `personal`         | Empleados vinculados a una empresa             |
| `gestion_laboral`  | JSON por empleado con cada submódulo           |
| `liquidaciones`    | Historial de planillas de liquidación          |
| `ahorro_aguinaldo` | Plan de ahorro mensual para aguinaldo          |
| `alertas`          | Notificaciones de incumplimientos              |

### Diagrama de relaciones:

```
empresa (1) ──────< personal (N)
                      │
                      ├──< gestion_laboral (1:1)
                      ├──< liquidaciones (1:N)
                      ├──< ahorro_aguinaldo (1:N por año)
                      │
empresa (1) ──────< alertas (N)
```

### Acceder a la BD directamente (opcional):

```bash
# Instalar herramienta CLI de SQLite
sudo apt install sqlite3   # Linux
brew install sqlite3        # Mac

# Abrir la base de datos
sqlite3 data/noguera.db

# Consultas útiles
.tables                         -- ver tablas
.schema empresa                 -- ver estructura
SELECT * FROM empresa;          -- ver empresas
SELECT * FROM personal;         -- ver empleados
SELECT * FROM alertas WHERE leida = 0;  -- alertas pendientes
```

---

## 4. API Endpoints Disponibles

Base URL: `http://localhost:3000/api`

### Empresa
| Método | Ruta              | Descripción        |
|--------|-------------------|--------------------|
| GET    | `/api/empresa`    | Listar empresas    |
| GET    | `/api/empresa/:id`| Obtener una        |
| POST   | `/api/empresa`    | Crear empresa      |
| PUT    | `/api/empresa/:id`| Actualizar empresa |
| DELETE | `/api/empresa/:id`| Eliminar empresa   |

### Personal
| Método | Ruta                           | Descripción          |
|--------|--------------------------------|----------------------|
| GET    | `/api/personal?empresa_id=X`   | Listar empleados     |
| POST   | `/api/personal`                | Crear empleado       |
| PUT    | `/api/personal/:id`            | Actualizar empleado  |

### Gestión Laboral
| Método | Ruta                                    | Descripción              |
|--------|-----------------------------------------|--------------------------|
| GET    | `/api/gestion/laboral/:personal_id`     | Ver gestión del empleado |
| PUT    | `/api/gestion/laboral/:id/:submodulo`   | Actualizar submódulo     |
| GET    | `/api/gestion/resumen/:personal_id`     | Resumen de cumplimiento  |
| GET    | `/api/gestion/alertas/:empresa_id`      | Listar alertas           |

### Herramientas
| Método | Ruta                                          | Descripción           |
|--------|-----------------------------------------------|-----------------------|
| POST   | `/api/herramientas/liquidacion`               | Calcular liquidación  |
| POST   | `/api/herramientas/ahorro-aguinaldo`          | Calcular ahorro       |
| GET    | `/api/herramientas/ahorro-aguinaldo/:emp/:año`| Ver tabla de ahorro   |

### Schemas (para agentes)
| Método | Ruta                         | Descripción             |
|--------|------------------------------|-------------------------|
| GET    | `/api/schemas/A_empresa.json`| Schema datos empresa    |
| GET    | `/api/schemas/B_personal.json`| Schema datos personal  |
| GET    | `/api/schemas/C_gestion_laboral.json`| Schema gestión  |
| GET    | `/api/schemas/E_herramientas.json`| Schema herramientas |

---

## 5. Cómo Conectar con Agentes de IA

Los agentes pueden consumir la API REST directamente. El flujo sugerido:

### Paso 1: El agente lee el schema
```
GET /api/schemas/C_gestion_laboral.json
```
Esto le da al agente la estructura completa de campos, opciones válidas y etiquetas.

### Paso 2: El agente consulta datos
```
GET /api/personal?empresa_id=1
GET /api/gestion/laboral/3
```

### Paso 3: El agente actualiza datos
```
PUT /api/gestion/laboral/3/contrato
Body: { "relacion_juridica": "Individual", "clase_contrato": "Escrito", ... }
```

### Paso 4: El agente consulta alertas
```
GET /api/gestion/alertas/1
```

### Ejemplo con Claude (MCP o API):
```javascript
// El agente puede hacer fetch a cualquier endpoint
const response = await fetch("http://localhost:3000/api/gestion/resumen/3");
const resumen = await response.json();
// El agente analiza el resumen y sugiere correcciones
```

---

## 6. Despliegue en Producción (Demo Rápido)

### Opción A: Railway.app (gratis tier)
```bash
# 1. Crear cuenta en railway.app
# 2. Conectar repo de GitHub
# 3. Railway detecta Node.js automáticamente
# 4. Variables: PORT=3000
# 5. Deploy automático
```

### Opción B: Render.com (gratis tier)
```bash
# 1. Crear cuenta en render.com
# 2. New → Web Service → conectar repo
# 3. Build Command: npm install
# 4. Start Command: npm start
# 5. Deploy
```

### Opción C: VPS propio (DigitalOcean, Hetzner, etc.)
```bash
# En el servidor:
git clone <tu-repo> && cd noguera-rrhh
npm install

# Instalar PM2 para mantener el proceso vivo
npm install -g pm2
pm2 start server/index.js --name noguera-rrhh
pm2 save
pm2 startup

# Configurar Nginx como reverse proxy
sudo nano /etc/nginx/sites-available/noguera
```

Configuración Nginx:
```nginx
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 7. Para Escalar a Producción (Futuro)

Cuando el demo sea aprobado, estos serían los pasos de escalado:

| Aspecto           | Demo (actual)       | Producción              |
|-------------------|---------------------|------------------------|
| Base de datos     | SQLite (archivo)    | PostgreSQL             |
| Autenticación     | Sin auth            | JWT + roles            |
| Frontend          | HTML/CSS/JS puro    | React/Next.js          |
| Hosting           | Railway/Render      | AWS/GCP/Azure          |
| Backups           | Manual              | Automáticos diarios    |
| SSL               | No                  | Let's Encrypt          |
| Multi-tenant      | No (1 empresa)      | Sí (N empresas)        |
| Logs              | Console             | Winston + monitoring   |

### Migrar de SQLite a PostgreSQL:
1. Instalar `pg` en lugar de `better-sqlite3`
2. Cambiar `database.js` para usar `pg.Pool`
3. Adaptar queries (mínimos cambios de sintaxis)
4. Los schemas JSON no cambian

---

## 8. Datos de Prueba Rápidos

Para cargar datos de demo vía terminal:

```bash
# Crear empresa
curl -X POST http://localhost:3000/api/empresa \
  -H "Content-Type: application/json" \
  -d '{
    "ruc": "80012345-6",
    "razon_social": "Noguera Construcciones S.A.",
    "ciudad": "Asunción",
    "depto": "Central",
    "categoria_dnit": "Mediana",
    "cantidad_trabajadores": 25,
    "n_patronal_ips": "123456"
  }'

# Crear empleado
curl -X POST http://localhost:3000/api/personal \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": 1,
    "nombre_apellido": "María González",
    "cedula": "4.567.890",
    "cargo": "Administradora",
    "fecha_ingreso": "2023-03-15",
    "condicion_tipo": "Ingreso"
  }'

# Registrar gestión laboral (contrato)
curl -X PUT http://localhost:3000/api/gestion/laboral/1/contrato \
  -H "Content-Type: application/json" \
  -d '{
    "relacion_juridica": "Individual",
    "clase_contrato": "Escrito",
    "condicion_contrato": "Superior al SMLV",
    "redactado": "Sí",
    "copia_entregada": "Sí",
    "duracion": "Indefinido",
    "modalidad": "General",
    "homologado": "No aplica",
    "documentacion_adjunta": "Sí"
  }'
```

---

## 9. Solución de Problemas

| Problema | Solución |
|----------|----------|
| `Error: Cannot find module 'better-sqlite3'` | Ejecutar `npm install` de nuevo |
| Puerto 3000 ocupado | Cambiar: `PORT=4000 npm start` |
| BD corrupta | Eliminar `data/noguera.db` y reiniciar |
| Error CORS | Ya está habilitado con `cors()` middleware |
| Charts no cargan | Verificar que Chart.js CDN sea accesible |

---

**¿Dudas?** La API tiene un health check en `GET /api/health` que muestra el estado del sistema y los módulos disponibles.

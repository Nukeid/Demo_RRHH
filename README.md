# SaaS de Gestión de RRHH (Paraguay)

## Arquitectura del Proyecto

```
noguera-rrhh/
├── schemas/                    # Esquemas JSON por módulo
│   ├── A_empresa.json          # Datos de la Empresa
│   ├── B_personal.json         # Datos del Personal
│   ├── C_gestion_laboral.json  # Gestión Laboral (contrato, IPS, horario, salario, vacaciones, aguinaldo)
│   ├── D_gestion_sso.json      # Gestión SSO (placeholder)
│   ├── E_herramientas.json     # Calculadora liquidación + Cuantificación + Ahorro aguinaldo
│   └── F_anexos.json           # Guardería, Trabajo Nocturno, RIT, Lactancia
│
├── server/                     # Backend Node.js + Express + SQLite
│   ├── index.js                # Punto de entrada del servidor
│   ├── database.js             # Inicialización SQLite
│   ├── routes/
│   │   ├── empresa.js          # CRUD Datos Empresa
│   │   ├── personal.js         # CRUD Datos Personal
│   │   ├── gestion.js          # CRUD Gestión Laboral
│   │   └── herramientas.js     # Calculadora + Cuantificación
│   ├── models/
│   │   └── init-tables.js      # Creación de tablas SQL
│   └── middleware/
│       └── auth.js             # Auth básico (placeholder)
│
├── public/                     # Frontend estático
│   ├── index.html              # SPA principal
│   ├── css/
│   │   └── styles.css          # Estilos con variables de color por categoría
│   ├── js/
│   │   ├── app.js              # Router SPA + lógica principal
│   │   ├── api.js              # Cliente HTTP para el backend
│   │   └── charts.js           # Gráficos con Chart.js
│   └── assets/
│       └── logo.svg            # Logo placeholder
│
├── docs/
│   └── GUIA_DESPLIEGUE.md      # Guía paso a paso para vincular BD y desplegar
│
├── package.json
└── README.md
```

## Stack Tecnológico (Demo)

| Capa       | Tecnología         | Por qué                          |
|------------|--------------------|---------------------------------|
| Frontend   | HTML + CSS + JS    | Sin framework, máxima sencillez |
| Backend    | Express.js         | Rápido de armar, bien documentado |
| Base Datos | SQLite (better-sqlite3) | Sin servidor externo, archivo único |
| Gráficos   | Chart.js (CDN)     | Fácil, bonito, cero config      |

## Inicio Rápido

```bash
cd noguera-rrhh
npm install
npm start
# Abrir http://localhost:8080
```

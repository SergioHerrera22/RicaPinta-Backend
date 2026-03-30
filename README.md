# RicaPinta Backend

Backend Node.js/Express profesional para la aplicación de gestión de pinturería.

## Características

- ✅ Autenticación JWT con roles (admin, ventas)
- ✅ PostgreSQL con migraciones automáticas
- ✅ Endpoints sincronizados con frontend
- ✅ Rate limiting y CORS configurado
- ✅ Proxy seguro de IA (OpenRouter gratis + fallback Gemini)
- ✅ Logging estructurado con Pino
- ✅ Validaciones en todos los endpoints
- ✅ Manejo de errores centralizado
- ✅ Seeds de demo para pruebas rápidas

## Instalación

```bash
# Instalar dependencias
npm install

# Crear archivo .env con credenciales
cp .env.example .env

# Ejecutar migraciones de BD
npm run migrate

# Cargar datos demo (opcional)
npm run seed

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de entorno

Ver [.env.example](.env.example)

## Estructura de carpetas

```
src/
├── config/          # Configuración (DB, JWT, etc.)
├── controllers/     # Lógica de negocio
├── middleware/      # CORS, auth, error handling
├── models/          # Schemas de BD
├── routes/          # Rutas API
├── utils/           # Helpers
└── server.js        # Entry point

scripts/
├── migrate.js       # Migraciones
└── seed.js          # Datos iniciales
```

## Endpoints

### Auth

- `POST /api/auth/login` - Autenticación por usuario/contraseña

### Products

- `GET /api/products` - Listar productos
- `PATCH /api/products/:id/stock` - Ajustar stock
- `PATCH /api/products/prices/bulk` - Actualizar precios masivo

### Sales

- `POST /api/sales` - Crear venta (descuenta stock automáticamente)
- `GET /api/sales/:id` - Detalle de venta

### AI

- `POST /api/ai/product-brief` - Análisis inteligente de producto vía OpenRouter gratis (con fallback)

### Sync

- `POST /api/sync/pending` - Procesar operaciones offline pendientes

## Seguridad

- Contraseñas hasheadas con bcryptjs
- JWT con expiración configurable
- CORS restringido a orígenes permitidos
- Rate limiting por IP
- Helmet para headers de seguridad
- Variables de entorno para secretos
- Proxy IA en backend (API keys no expuestas en cliente)

## Deployment

Usar Docker o servicio como Railway, Render, Heroku.

Ver [Dockerfile](./Dockerfile) para deployment containerizado.

## Ambiente de desarrollo

```bash
npm run dev          # Hot reload con --watch
npm run lint         # Validar con ESLint
npm run migrate      # Ejecutar migraciones
npm run seed         # Cargar datos demo
```

## Base de datos

PostgreSQL 13+. Usar Supabase para quickstart sin infraestructura propia.

Migraciones automáticas: ejecutar `npm run migrate` antes de iniciar.

## Credenciales para setup

Se necesita:

1. PostgreSQL connection string (local o Supabase)
2. OpenRouter API key (recomendado para modelos gratuitos)
3. JWT secret (generar random)
4. Orígenes permitidos CORS

Pideme todas éstas después de revisar este backend inicial.

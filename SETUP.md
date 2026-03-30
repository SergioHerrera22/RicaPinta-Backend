# Setup Guía RicaPinta Backend

## 1. Requisitos

- Node.js 18+
- PostgreSQL 13+ (o Supabase)
- npm o yarn

## 2. Instalación

```bash
# Navegar a carpeta backend
cd RicaPinta-Backend

# Instalar dependencias
npm install
```

## 3. Configurar Variables de Entorno

Copiar `.env.example` a `.env`:

```bash
cp .env.example .env
```

Completar con tus credenciales (pide abajo):

```env
DATABASE_URL=postgresql://user:password@host:5432/ricapinta
JWT_SECRET=<generar_con_crypto>
OPENROUTER_API_KEY=<tu_clave_openrouter>
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
AI_PROVIDER=auto
# Opcional fallback
GEMINI_API_KEY=<tu_clave_gemini>
CORS_ORIGINS=http://localhost:5173,https://ricapinta.netlify.app
```

### Generar JWT_SECRET seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Crear Schema en Base de Datos

```bash
npm run migrate
```

Esto crea tablas y carga usuarios demo:

- Usuario: `admin` | Contraseña: `admin123`
- Usuario: `ventas` | Contraseña: `ventas123`

## 5. Cargar Productos Demo

```bash
npm run seed
```

Carga 9 productos de ejemplo de diferentes categorías.

## 6. Iniciar Servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

Servidor escuchará en `http://localhost:4000`

## 7. Probar Endpoints

### Health check:

```bash
curl http://localhost:4000/health
```

### Login:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Listar productos:

```bash
curl http://localhost:4000/api/products
```

(Ver API.md para documentación completa)

## 8. Frontend Integration

El frontend debe usar:

- `VITE_API_BASE_URL=http://localhost:4000/api` en local
- `VITE_API_BASE_URL=https://ricapinta-backend.onrender.com/api` en Netlify
- `VITE_DATA_MODE=api` (para usar backend)

En producción:

- Render debe tener `CORS_ORIGINS=https://ricapinta.netlify.app`
- Netlify debe tener `VITE_API_BASE_URL=https://ricapinta-backend.onrender.com/api`

## Solucionar Problemas

### "Connection rejected"

- Verificar que PostgreSQL/Supabase está disponible
- Revisar DATABASE_URL en .env

### "JWT_SECRET no configurado"

- Generar nuevo JWT_SECRET
- Copiar a .env

### "Gemini/OpenRouter error"

- Verificar OPENROUTER_API_KEY en .env
- Si usas fallback, verificar GEMINI_API_KEY
- Cambiar AI_PROVIDER=openrouter para forzar proveedor gratuito
- Revisar cuota/limite del proveedor configurado

## Deployment a Producción

Ver [Dockerfile](./Dockerfile) para containerizar.

Proveedores recomendados:

- **Backend**: Railway, Render, Heroku
- **BD**: Supabase (PostgreSQL manejado)
- **OpenRouter**: API key en backend (modelos free recomendados)

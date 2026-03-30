# Integración Frontend-Backend RicaPinta

Instrucciones para conectar el frontend React con este backend.

## 1. Variables de Entorno Frontend

Actualizar `.env` en carpeta frontend:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_DATA_MODE=api
```

⚠️ **Importante**: El frontend NO debe enviar API keys de IA directamente. Usar proxy en backend.

## 2. Actualizar Frontend apiClient.js

El cliente está listo pero verifica que use:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

Los endpoints deben coincidir:

```
POST   /api/auth/login          → loginUser()
GET    /api/products            → fetchProducts()
PATCH  /api/products/:id/stock  → adjustProductStock()
PATCH  /api/products/prices/bulk → bulkUpdatePrices()
POST   /api/sales               → createSale()
GET    /api/sales/:id           → getSaleDetails()    [NUEVO]
POST   /api/ai/product-brief    → requestProductBrief()
POST   /api/sync/pending        → syncPendingOperations()
```

## 3. Flujo de Autenticación

1. Usuario ingresa credenciales en login
2. Frontend hace POST a `/api/auth/login`
3. Backend devuelve JWT + session info
4. Frontend guarda token en Zustand + localStorage
5. Todos los requests incluyen `Authorization: Bearer <token>`

## 4. Manejo de Errores

El backend devuelve siempre:

```json
{
  "ok": true/false,
  "message": "...",
  "data": {...}
}
```

Frontend debe:

- Mostrar mensaje de error si `ok: false`
- Refrescar login si error 401 (token expirado)
- Mostrar toast de éxito si `ok: true`

## 5. Proxy Seguro para IA

**Importante**: El frontend no debe tener claves de IA.

Flujo:

1. Frontend envia: POST `/api/ai/product-brief` con datos del producto
2. Backend recibe request autenticado
3. Backend usa OPENROUTER_API_KEY (y fallback opcional GEMINI_API_KEY)
4. Backend devuelve análisis al frontend
5. Frontend muestra en ProductTechLookupPanel

Esto evita que las claves de IA se expongan en el navegador cliente.

## 6. Sincronización Offline

Frontend mantiene cola de operaciones offline:

```javascript
// Mientras offline:
// - Acumular operaciones en Zustand
// - No enviar al backend

// Cuando vuelve online:
POST /api/sync/pending
{
  "operations": [
    { "id": "op-1", "type": "adjustStock", "productId": "P-001", "delta": -3 },
    { "id": "op-2", "type": "createSale", "customerName": "...", ... }
  ]
}
```

Backend procesa todas y devuelve resultados:

```json
{
  "ok": true,
  "processed": 2,
  "failed": 0
}
```

## 7. Desarrollo Local

```bash
# Terminal 1: Backend
cd RicaPinta-Backend
npm run dev
# Escucha en http://localhost:4000

# Terminal 2: Frontend
cd RicaPinta-App
npm run dev
# Escucha en http://localhost:5173
```

CORS permitirá requests del frontend al backend.

## 8. Testing de API

Usar Postman/Insomnia:

1. POST `/api/auth/login` con credenciales demo
2. Copiar token de response
3. Usar en Authorization header: `Bearer <token>`
4. Probar endpoints de productos, ventas, etc.

Ver [API.md](./API.md) para documentación completa.

## 9. Deployment

Cuando publique:

1. **Frontend**: Variables apuntarán a backend en producción
2. **Backend**: Usar Supabase + Railway/Render
3. **IA**: API keys solo en backend
4. **CORS**: Actualizar orígenes permitidos

```env
# Backend en producción
DATABASE_URL=postgresql://...supabase...
CORS_ORIGINS=https://ricapinta.app,https://app.ricapinta.app
```

## 10. Troubleshooting

### "Cannot POST /api/auth/login"

- Verificar que backend está corriendo en puerto 4000
- Verificar VITE_API_BASE_URL en frontend

### "CORS error"

- Verificar CORS_ORIGINS en .env backend
- Incluir http://localhost:5173 para desarrollo

### "Token inválido"

- Token expirado (12-24 horas)
- Solicitar nuevo login
- Frontend debe refrescar session automáticamente

### "AI error"

- Verificar OPENROUTER_API_KEY en backend .env
- Si usas fallback, verificar GEMINI_API_KEY
- Revisar cuotas y limites del proveedor configurado

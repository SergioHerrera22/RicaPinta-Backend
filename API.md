# API de RicaPinta Backend

Documentación completa de endpoints.

## Autenticación

Todos los endpoints excepto `/auth/login` requieren token JWT en el header:

```
Authorization: Bearer <token>
```

### POST /api/auth/login

Autenticar usuario y obtener token JWT.

**Request:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**

```json
{
  "ok": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "session": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Administrador",
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Productos

### GET /api/products

Listar todos los productos disponibles.

**Query Params (opcional):**

- `category`: Filtrar por categoría
- `search`: Búsqueda en nombre/sku

**Response (200):**

```json
[
  {
    "id": "P-001",
    "sku": "PIN-LAT-20-BLAN",
    "name": "Latex Interior Blanco 20L",
    "category": "Pinturas",
    "brand": "ColorMax",
    "stock": 34,
    "min_stock": 8,
    "cost": 34500,
    "price": 48200,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### PATCH /api/products/:id/stock

Ajustar stock de un producto (aumentar o disminuir).

**Headers:**

- `Authorization: Bearer <token>` ✓ Requerido

**Request:**

```json
{
  "delta": 10
}
```

- `delta > 0`: suma al stock
- `delta < 0`: resta del stock

**Response (200):**

```json
{
  "ok": true,
  "productId": "P-001",
  "newStock": 44
}
```

---

### PATCH /api/products/prices/bulk

Actualizar precios masivamente.

**Headers:**

- `Authorization: Bearer <token>` ✓ Requerido (solo ADMIN)

**Request:**

```json
{
  "scope": "all",
  "percent": 10,
  "category": null
}
```

- `scope`: "all" o "category"
- `percent`: porcentaje de aumento/disminución (positivo o negativo)
- `category`: si scope="category", especificar categoría

**Response (200):**

```json
{
  "ok": true,
  "rowsAffected": 12
}
```

---

## Ventas

### POST /api/sales

Crear una venta (descuenta stock automáticamente).

**Headers:**

- `Authorization: Bearer <token>` ✓ Requerido

**Request:**

```json
{
  "customerName": "Juan Pérez",
  "paymentMethod": "Efectivo",
  "items": [
    {
      "productId": "P-001",
      "quantity": 2,
      "unitPrice": 48200
    },
    {
      "productId": "P-003",
      "quantity": 5,
      "unitPrice": 4300
    }
  ]
}
```

**Response (201):**

```json
{
  "ok": true,
  "saleId": "550e8400-e29b-41d4-a716-446655440000",
  "total": 117400,
  "saleNumber": 523847,
  "ticketNumber": "BOL-523847",
  "createdAt": "2024-01-15T14:30:00Z"
}
```

---

### GET /api/sales/:id

Obtener detalle de una venta.

**Headers:**

- `Authorization: Bearer <token>` ✓ Requerido

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "customer_name": "Juan Pérez",
  "payment_method": "Efectivo",
  "total": 117400,
  "sale_number": 523847,
  "created_at": "2024-01-15T14:30:00Z",
  "items": [
    {
      "product_id": "P-001",
      "quantity": 2,
      "unit_price": 48200,
      "subtotal": 96400
    }
  ]
}
```

---

## IA (Gemini - Proxy Seguro)

### POST /api/ai/product-brief

Obtener análisis técnico de producto (asesor inteligente).

**Headers:**

- `Authorization: Bearer <token>` ✓ Requerido
- `Content-Type: application/json`

**Request:**

```json
{
  "productName": "Latex Interior Blanco 20L",
  "brand": "ColorMax",
  "category": "Pinturas",
  "sku": "PIN-LAT-20-BLAN"
}
```

**Response (200):**

```json
{
  "ok": true,
  "brief": {
    "resumen": "Pintura látex interior de alto rendimiento para interiores.",
    "usos": ["Paredes interiores", "Techos", "Áreas de alto tráfico"],
    "rendimiento": "10-13 m²/litro",
    "secado": "30-60 minutos al tacto",
    "superficies": ["Yeso", "Mampostería", "Madera"],
    "precauciones": [
      "Aplicar en ambiente ventilado",
      "Evitar contacto con ojos"
    ],
    "preguntasVenta": [
      "¿Es para interior o exterior?",
      "¿Qué superficie va a pintar?",
      "¿Tiene mucho tráfico el área?"
    ]
  }
}
```

---

## Sincronización Offline

### POST /api/sync/pending

Sincronizar operaciones que quedaron pendientes offline.

**Headers:**

- `Authorization: Bearer <token>` ✓ Requerido

**Request:**

```json
{
  "operations": [
    {
      "id": "op-1",
      "type": "adjustStock",
      "productId": "P-001",
      "delta": -3
    },
    {
      "id": "op-2",
      "type": "createSale",
      "customerName": "Cliente",
      "paymentMethod": "Tarjeta",
      "total": 15000
    }
  ]
}
```

**Response (200):**

```json
{
  "ok": true,
  "processed": 2,
  "failed": 0,
  "results": [
    {
      "id": "op-1",
      "type": "adjustStock",
      "status": "success"
    },
    {
      "id": "op-2",
      "type": "createSale",
      "status": "success",
      "saleId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "errors": []
}
```

---

## Errores

Todos los errores devuelven:

```json
{
  "ok": false,
  "message": "Descripción del error"
}
```

**Códigos comunes:**

- `400` - Solicitud inválida
- `401` - No autenticado o token inválido
- `403` - Permiso insuficiente
- `404` - Recurso no encontrado
- `500` - Error del servidor

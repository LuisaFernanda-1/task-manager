# Task Manager API

API RESTful para gestionar tareas personales. Los usuarios se registran, inician sesión con JWT y administran **solo sus propias tareas**.

Construida con **Node.js, Express 5, TypeScript y PostgreSQL**, organizada en capas, con validación por JSON Schema (AJV), manejo de errores centralizado, documentación Swagger y pruebas automatizadas (61 pruebas unitarias y de integración).

---

## Tabla de contenido

- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación local](#instalación-local)
- [Configuración del archivo .env](#configuración-del-archivo-env)
- [Comandos](#comandos)
- [Endpoints](#endpoints)
- [Ejemplo de uso](#ejemplo-de-uso)
- [Formato de errores](#formato-de-errores)
- [Pruebas](#pruebas)
- [Decisiones de diseño](#decisiones-de-diseño)

---

## Tecnologías

| Área | Herramienta |
| --- | --- |
| Lenguaje | TypeScript (modo `strict`) |
| Servidor | Node.js 20+ y Express 5 |
| Base de datos | PostgreSQL 16 con `pg` (consultas SQL parametrizadas) |
| Autenticación | `bcrypt` para contraseñas y `jsonwebtoken` (HS256) |
| Validación | AJV + `ajv-formats` con JSON Schema |
| Documentación | OpenAPI 3 + Swagger UI |
| Seguridad HTTP | `helmet` y `cors` |
| Pruebas | Vitest + Supertest |
| CI | GitHub Actions |

---

## Arquitectura

Cada capa tiene una sola responsabilidad y solo conoce a la capa de abajo:

```
Petición HTTP
     │
     ▼
┌───────────────────────────────────────────────┐
│ src/api  (rutas y middlewares)                │  authenticate → validate → controlador
└───────────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────────┐
│ src/controllers                               │  Traduce HTTP ⇄ servicio. Sin lógica de negocio.
└───────────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────────┐
│ src/services                                  │  Reglas de negocio: hash, JWT, dueño de la tarea.
└───────────────────────────────────────────────┘
     │  (depende de interfaces, no de PostgreSQL)
     ▼
┌───────────────────────────────────────────────┐
│ src/persistence                               │  SQL parametrizado contra PostgreSQL.
└───────────────────────────────────────────────┘

Cualquier error lanzado en cualquier capa ──► middleware errorHandler ──► respuesta JSON uniforme
```

- **Inyección de dependencias por constructor.** Los servicios reciben repositorios que cumplen una interfaz (`UserRepository`, `TaskRepository`). Por eso las pruebas unitarias usan repositorios en memoria sin base de datos.
- **Raíz de composición.** `src/app.ts` es el único lugar donde se crean las implementaciones concretas y se conectan las capas.
- **Configuración centralizada (Singleton).** `Config.getInstance()` lee y valida las variables de entorno una sola vez. Si falta una variable obligatoria, la app no arranca.

---

## Estructura del proyecto

```
task-manager-api/
├── db/migrations/                 # Migraciones SQL versionadas
├── docker/init-test-db.sql        # Crea la base de pruebas en Docker
├── src/
│   ├── api/
│   │   ├── middlewares/           # authenticate, validate, error-handler
│   │   ├── routes/                # auth.routes, task.routes
│   │   └── schemas/               # JSON Schemas de AJV
│   ├── config/env.ts              # Configuración (Singleton)
│   ├── controllers/               # auth.controller, task.controller
│   ├── docs/openapi.ts            # Especificación OpenAPI (Swagger)
│   ├── errors/                    # AppError y errores personalizados
│   ├── models/                    # Tipos de dominio (User, Task)
│   ├── persistence/               # Pool, migrador y repositorios
│   ├── services/                  # auth, task, token, password
│   ├── types/express.d.ts         # Tipado de req.user
│   ├── app.ts                     # Construcción de la app (composición)
│   └── server.ts                  # Punto de entrada
├── tests/
│   ├── unit/                      # Servicios y configuración, sin BD
│   ├── integration/               # Endpoints reales con Supertest + PostgreSQL
│   └── helpers/
├── .env.example
├── .env.test.example
├── docker-compose.yml
├── DEVELOPMENT_LOG.md
└── README.md
```

---

## Instalación local

### Requisitos

- Node.js 20 o superior
- PostgreSQL 13 o superior (o Docker)

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/LuisaFernanda-1/task-manager-api.git
cd task-manager-api
npm install
```

### 2. Levantar PostgreSQL

**Opción A — Docker (recomendada):** crea las bases `task_manager` y `task_manager_test` automáticamente.

```bash
docker compose up -d
```

**Opción B — PostgreSQL instalado localmente:**

```sql
CREATE USER taskapp WITH PASSWORD 'taskapp';
CREATE DATABASE task_manager OWNER taskapp;
CREATE DATABASE task_manager_test OWNER taskapp;
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
cp .env.test.example .env.test   # solo si vas a correr las pruebas
```

Genera un `JWT_SECRET` seguro y pégalo en `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Crear las tablas

```bash
npm run db:migrate
```

### 5. Ejecutar

```bash
npm run dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/docs

---

## Configuración del archivo .env

| Variable | Obligatoria | Por defecto | Descripción |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `production` o `test` |
| `PORT` | No | `3000` | Puerto HTTP |
| `DATABASE_URL` | **Sí** | — | `postgresql://usuario:clave@host:5432/base` |
| `DB_SSL` | No | `false` | `true` para bases en la nube (Neon, Supabase, Render) |
| `JWT_SECRET` | **Sí** | — | Secreto de firma, **mínimo 32 caracteres** |
| `JWT_EXPIRES_IN` | No | `1h` | Duración del token (`15m`, `1h`, `1d`) |
| `BCRYPT_SALT_ROUNDS` | No | `10` | Costo de bcrypt (entre 4 y 15) |

La configuración se valida al arrancar: un `JWT_SECRET` corto, un puerto no numérico o una variable obligatoria faltante detienen la app con un mensaje claro.

---

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor en modo desarrollo con recarga automática |
| `npm run db:migrate` | Aplica las migraciones pendientes (se puede repetir sin riesgo) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada |
| `npm run db:migrate:prod` | Migraciones usando la versión compilada |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm test` | Ejecuta todas las pruebas |
| `npm run test:unit` | Solo pruebas unitarias (no requieren BD) |
| `npm run test:integration` | Solo pruebas de integración |
| `npm run test:coverage` | Pruebas con reporte de cobertura |

---

## Endpoints

| Método | Ruta | Auth | Descripción | Éxito |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | — | Registra un usuario | `201` |
| `POST` | `/auth/login` | — | Devuelve un JWT | `200` |
| `POST` | `/tasks` | Bearer | Crea una tarea | `201` |
| `GET` | `/tasks` | Bearer | Lista las tareas propias (`?estado=` opcional) | `200` |
| `GET` | `/tasks/:id` | Bearer | Consulta una tarea propia | `200` |
| `PUT` | `/tasks/:id` | Bearer | Reemplaza una tarea propia | `200` |
| `DELETE` | `/tasks/:id` | Bearer | Elimina una tarea propia | `204` |
| `GET` | `/health` | — | Estado de la API y la base de datos | `200` |
| `GET` | `/docs` | — | Swagger UI | `200` |

### Modelo de tarea

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | UUID | Generado por la base de datos |
| `titulo` | string | Obligatorio, 1 a 150 caracteres, no puede ser solo espacios |
| `descripcion` | string \| null | Opcional, máximo 2000 caracteres |
| `fecha_vencimiento` | `YYYY-MM-DD` \| null | Opcional, debe ser una fecha real (se rechaza `2026-02-30`) |
| `estado` | enum | `pendiente` (por defecto), `en curso`, `completada` |
| `usuario_id` | UUID | Siempre se toma del token, nunca del cuerpo |

---

## Ejemplo de uso

```bash
# 1. Registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Luisa Ovallos","email":"luisa@example.com","password":"MiClave123"}'

# 2. Login (copia el token de la respuesta)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"luisa@example.com","password":"MiClave123"}'

# 3. Crear una tarea
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Entregar prueba técnica","fecha_vencimiento":"2026-10-23"}'

# 4. Listar mis tareas pendientes
curl "http://localhost:3000/tasks?estado=pendiente" -H "Authorization: Bearer <TOKEN>"
```

En Swagger (`/docs`) se puede hacer lo mismo: después del login, pulsa **Authorize** y pega el token.

---

## Formato de errores

Todas las respuestas de error tienen la misma forma:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [
      { "field": "body.email", "message": "Debe ser un email válido" },
      { "field": "body.password", "message": "Debe tener al menos 8 caracteres" }
    ]
  }
}
```

| HTTP | `code` | Clase | Cuándo |
| --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | `ValidationError` | El cuerpo, la URL o la query no cumplen el esquema |
| 400 | `INVALID_JSON` | — | El cuerpo no es JSON válido |
| 401 | `AUTHENTICATION_ERROR` | `AuthenticationError` | Sin token, token inválido o expirado, credenciales incorrectas |
| 404 | `NOT_FOUND` | `NotFoundError` | La tarea no existe o es de otro usuario; ruta inexistente |
| 409 | `CONFLICT` | `ConflictError` | Email ya registrado |
| 413 | `PAYLOAD_TOO_LARGE` | — | Cuerpo mayor a 100 KB |
| 500 | `INTERNAL_ERROR` | — | Error no previsto (se registra en el log; el cliente no ve detalles internos) |

---

## Pruebas

```bash
npm test
```

- **Unitarias** (`tests/unit`): configuración, `TokenService`, `AuthService` y `TaskService` con repositorios falsos. No necesitan base de datos.
- **Integración** (`tests/integration`): levantan la app real contra `task_manager_test` y prueban cada endpoint, incluidos los casos de error y el **aislamiento entre usuarios** (un usuario no puede leer, editar ni borrar tareas ajenas).

Por seguridad, las pruebas se niegan a correr si `DATABASE_URL` de `.env.test` no apunta a una base cuyo nombre contenga `test`, porque vacían las tablas en cada caso.

---

## Decisiones de diseño

- **Tareas ajenas devuelven 404, no 403.** Un 403 confirmaría que la tarea existe. Con 404, un usuario no puede descubrir qué ids pertenecen a otros.
- **El dueño se valida en la misma consulta SQL** (`WHERE id = $1 AND usuario_id = $2`), no en dos pasos "buscar y luego comparar". Es una sola consulta y no hay forma de olvidar la verificación en un endpoint.
- **`usuario_id` sale solo del token.** Los esquemas usan `additionalProperties: false`, así que enviar `usuario_id` en el cuerpo responde 400.
- **PUT reemplaza el recurso completo**, como define HTTP. Los campos opcionales que no se envían vuelven a su valor por defecto.
- **Mismo mensaje para email inexistente y contraseña incorrecta**, y bcrypt se ejecuta en ambos casos para que el tiempo de respuesta tampoco revele qué emails están registrados.
- **Contraseñas de 8 a 72 caracteres.** bcrypt ignora en silencio todo lo que pase de 72 bytes.
- **Las fechas de vencimiento se leen como texto `YYYY-MM-DD`.** Por defecto `pg` las convierte en `Date` a medianoche local, lo que corre la fecha según la zona horaria.
- **El algoritmo del JWT es fijo (`HS256`) también al verificar**, para rechazar tokens con `alg: none` u otro algoritmo.
- **Migraciones SQL versionadas** en lugar de crear tablas al arrancar: cada cambio de esquema queda registrado en `schema_migrations`.

---

Desarrollado por **Luisa Fernanda Ovallos Carrascal** · [GitHub](https://github.com/LuisaFernanda-1) · [LinkedIn](https://linkedin.com/in/luisa-fernanda-ovallos-carrascal-237155357)

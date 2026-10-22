# Bitácora de desarrollo

## Resumen del proceso

| Etapa | Qué se hizo |
| --- | --- |
| 1. Lectura de requisitos | Se listaron los requisitos obligatorios, los deseables y los criterios de evaluación de la prueba. |
| 2. Base del proyecto | TypeScript estricto, Express 5, estructura en capas y configuración con Singleton. |
| 3. Persistencia | Migraciones SQL versionadas, pool de conexiones y repositorios con consultas limitadas al dueño. |
| 4. Lógica de negocio | Servicios de autenticación (bcrypt + JWT) y de tareas. |
| 5. Capa HTTP | Middlewares de autenticación, validación (AJV) y errores; controladores y rutas. |
| 6. Documentación | OpenAPI/Swagger, JSDoc y README. |
| 7. Verificación | Pruebas manuales con `curl` de todos los endpoints, 80 pruebas automatizadas y build de producción. |
| 8. CI | GitHub Actions ejecuta typecheck, build y pruebas en cada push. |
| 9. Decisiones propias | Vencimiento con fecha, hora y zona horaria, filtro de tareas vencidas y endpoint PATCH. |

---

## Uso de asistentes de IA

**Herramienta usada:** Claude (Anthropic), como asistente de programación. La usé en tres momentos puntuales:

| # | Para qué | Prompt (resumido) |
| --- | --- | --- |
| 1 | Generar la base del proyecto | Le pasé el PDF de la prueba técnica y le pedí ayuda para comenzar a realizar el proyecto. |
| 2 | Tema visual de Swagger UI | Un tema propio para `/docs` (verde, con modo claro y oscuro) sin cambiar el comportamiento de la API. |
| 3 | Implementar mis decisiones de diseño | Vencimiento con fecha, hora y zona horaria, filtro de vencidas y endpoint PATCH. Las decisiones y su razonamiento son míos (ver "Decisiones sin asistencia de IA"). |

**Qué acepté y por qué:**

- **Estructura en capas** `api / controllers / services / persistence`: cumple exactamente lo que pide la prueba y deja cada responsabilidad separada.
- **Repositorios detrás de interfaces** (`UserRepository`, `TaskRepository`): permiten probar los servicios con repositorios en memoria, sin base de datos.
- **Consultas con el dueño en el `WHERE`** (`WHERE id = $1 AND usuario_id = $2`): la regla "solo el dueño accede" queda garantizada por la base de datos en una sola consulta.
- **Consultas parametrizadas (`$1`, `$2`)** en todo el acceso a datos: evitan inyección SQL.

**Lo que entendí al revisar el código:**

- **`authenticate.ts`** funciona como un portero: revisa que la petición traiga la cabecera `Authorization: Bearer <token>`, verifica la firma y la expiración del token, y guarda el usuario en `req.user`. Si algo falla, responde 401 y la petición no llega al controlador.
- **`WHERE id = $1 AND usuario_id = $2`**: la base de datos no busca solo "la tarea con este id", sino "la tarea con este id que pertenezca a este usuario". Como el `usuario_id` sale del token y no de lo que envía el cliente, nadie puede acceder a una tarea ajena aunque conozca su id; en ese caso responde 404.
- **Singleton en `Config`**: la configuración se lee y se valida una sola vez al arrancar, y toda la aplicación usa esa misma instancia. Si falta una variable obligatoria, la aplicación no arranca y dice qué falta, en vez de fallar después con usuarios conectados.
- **Capas**: el controlador solo traduce HTTP, el servicio aplica las reglas de negocio y el repositorio es el único que habla con PostgreSQL. Por eso los servicios se pueden probar con repositorios falsos, sin base de datos.

**Qué se rechazó o corrigió:**

| # | Problema | Cómo se detectó | Corrección |
| --- | --- | --- | --- |
| 1 | La configuración dependía de archivos ocultos: `getInstance()` cargaba `.env.test` y la prueba de valores por defecto recibía el puerto `3001` en vez de `3000`. | Prueba unitaria fallida | `Config.fromEnvForTesting(env)` construye una configuración solo con las variables dadas. |
| 2 | `afterAll(closePool)` dentro del primer `describe` cerraba la conexión antes de que corrieran los demás bloques (`Cannot use a pool after calling end on the pool`). | 30+ pruebas fallidas | Se movió `afterAll(closePool)` al nivel del archivo. |
| 3 | Código muerto: una clase `ForbiddenError` (403) y un getter `isProduction` que nunca se usaban. | Revisión manual y `grep` | Se eliminaron. |
| 4 | En el `UPDATE` de PATCH los marcadores de parámetros quedaron sin `$` (`estado = 2`) y PostgreSQL respondió `el operador no existe: character varying = integer`. | Prueba de `GET /tasks?estado=` con 500 | Se corrigieron los marcadores. |
| 5 | El tipo `JSONSchemaType` de AJV obliga a marcar como `nullable` los campos opcionales, lo que habría permitido `titulo: null` en PATCH. | Revisión del esquema | El esquema de PATCH se tipó como `Schema` para que `titulo` y `estado` rechacen `null`. |

**Verificación:**

- `npm run typecheck` sin errores, con TypeScript en modo `strict` y `noUncheckedIndexedAccess`.
- 80 pruebas automatizadas en verde (27 unitarias y 53 de integración) y `npm run build` sin errores.
- Instalé y ejecuté el proyecto en mi computador (Windows + PostgreSQL 15) siguiendo el README.
- Probé el flujo completo en Swagger: registro (201), email repetido (409), datos inválidos (400), login incorrecto (401), login correcto, CRUD de tareas y borrado (204).
- Comprobé el aislamiento con un segundo usuario: al consultar o borrar la tarea del primero, la API responde 404.
- Revisé en pgAdmin la tabla `usuarios`: la columna `password_hash` muestra el hash de bcrypt y no la contraseña.

---

## Decisiones sin asistencia de IA

Las siguientes decisiones y su razonamiento son míos. Después de tomarlas, usé Claude para implementarlas y verifiqué el resultado con pruebas.

### Decisión 1 — El vencimiento es un momento exacto (fecha, hora y zona horaria), y "vencida" significa atrasada

**Decisión:**
- `fecha_vencimiento` pasa de ser solo una fecha (`DATE`) a ser fecha y hora con zona horaria (`TIMESTAMPTZ`). El cliente la envía en formato ISO 8601 con su desfase, por ejemplo `2026-10-21T16:00:00-05:00`.
- Agregué el filtro `GET /tasks?vencidas=true`: devuelve las tareas cuyo momento de vencimiento ya pasó y que **no** están completadas.

**Alternativas que consideré:**
- Dejar solo la fecha y considerar vencida una tarea a partir del día siguiente.
- Calcular "hoy" con la hora del servidor o fijar siempre la hora de Colombia.
- Incluir en las vencidas también las tareas completadas.

**Por qué elegí esta:**
- En la vida real las entregas tienen hora: si algo vence hoy a las 4:00 p. m., a las 4:01 ya está vencido. Con solo la fecha, la API diría que no está vencida hasta el día siguiente.
- La aplicación debe funcionar igual para un usuario en Colombia, en México o en cualquier país. Si se usara la hora del servidor (que en la nube suele estar en UTC, 5 horas adelante de Colombia), a las 8:00 p. m. en Colombia una tarea que vence ese mismo día aparecería vencida antes de tiempo. Al guardar el momento con su zona horaria, PostgreSQL lo convierte en un instante único y la comparación con la hora actual es correcta en cualquier país.
- Una tarea completada ya se entregó, así que no tiene sentido que aparezca como atrasada. Cuando el usuario pide "ver vencidas", espera ver lo que todavía le falta y ya se le pasó.

### Decisión 2 — Agregar PATCH y mantener PUT

**Decisión:** agregué `PATCH /tasks/:id` para actualizar solo los campos enviados, y mantuve `PUT /tasks/:id` para reemplazar la tarea completa.

**Alternativas que consideré:**
- Dejar solo PUT, que es lo mínimo que pedía la prueba.
- Cambiar PUT para que se comportara como una actualización parcial.

**Por qué elegí esta:**
- Con solo PUT, para marcar una tarea como completada hay que reenviar todos sus datos, y si se olvida un campo (por ejemplo, la descripción), se borra sin querer. Prioricé la seguridad de los datos: con PATCH, un botón de "completar" envía solo `{ "estado": "completada" }` y nada más cambia.
- No cambié el comportamiento de PUT porque HTTP define que PUT reemplaza el recurso completo; cambiarlo confundiría a quien use la API. Cada método hace lo que su nombre promete.
- Esto evita la pérdida accidental de información. Como mejora futura, para una trazabilidad completa se podría guardar un historial de cambios de cada tarea (quién cambió qué y cuándo).

---

## Retos y soluciones

| Reto | Solución |
| --- | --- |
| **Fechas corridas por zona horaria.** El driver `pg` convierte las columnas `DATE` en objetos `Date` a medianoche local; en Colombia (UTC-5) `2026-11-01` se serializaba como `2026-11-01T05:00:00.000Z`, y en otras zonas podía mostrar el día anterior. | Se registró un parser para el tipo `DATE` (OID 1082) que lo devuelve como texto `YYYY-MM-DD`. Más adelante el campo se migró a `TIMESTAMPTZ` (Decisión 1), con lo que este parser dejó de ser necesario y se eliminó. |
| **Carrera al registrar el mismo email dos veces a la vez.** La verificación previa del servicio no basta si dos peticiones llegan juntas. | La restricción `UNIQUE` de la base de datos es la garantía final, y el repositorio convierte el error `23505` de PostgreSQL en un `ConflictError` (409). |
| **Límite oculto de bcrypt.** bcrypt solo usa los primeros 72 bytes; dos contraseñas largas con el mismo inicio darían el mismo hash. | Se limitó la contraseña a 72 caracteres en el esquema de validación. |
| **Enumeración de usuarios en el login.** Si "email no existe" respondiera más rápido que "contraseña incorrecta", se podría averiguar qué emails están registrados. | Mismo mensaje en ambos casos y comparación contra un hash de referencia cuando el email no existe. |
| **Pruebas que borran datos.** Las pruebas vacían las tablas y podrían apuntar por error a la base real. | Las pruebas usan `.env.test` y se niegan a correr si el nombre de la base no contiene `test`. |
| **Error al crear las bases de datos en pgAdmin.** Al ejecutar juntas las tres sentencias (`CREATE USER` y dos `CREATE DATABASE`) apareció `CREATE DATABASE cannot run inside a transaction block` y no se creó nada. pgAdmin ejecuta todo lo seleccionado como una sola transacción, y PostgreSQL no permite crear bases de datos dentro de una. | Ejecuté cada sentencia por separado, seleccionando una línea a la vez. |

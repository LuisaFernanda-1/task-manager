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

**Herramienta usada:** Claude (Anthropic), como asistente de programación.

### Uso 1 — Generación de la base del proyecto

**Prompt utilizado:**

> Le pasé el PDF de la prueba técnica y le pedí ayuda para comenzar a realizar el proyecto.

**Qué se aceptó y por qué:**

- **Estructura en capas** `api / controllers / services / persistence`: cumple exactamente lo que pide la prueba y deja cada responsabilidad separada.
- **Repositorios detrás de interfaces** (`UserRepository`, `TaskRepository`): permiten probar los servicios con repositorios en memoria, sin base de datos.
- **Consultas con el dueño en el `WHERE`** (`WHERE id = $1 AND usuario_id = $2`): la regla "solo el dueño accede" queda garantizada por la base de datos en una sola consulta.
- **Consultas parametrizadas (`$1`, `$2`)** en todo el acceso a datos: evitan inyección SQL.

**Lo que entendí al revisar el código:**

- **`authenticate.ts`** funciona como un portero: revisa que la petición traiga la cabecera `Authorization: Bearer <token>`, verifica la firma y la expiración del token, y guarda el usuario en `req.user`. Si algo falla, responde 401 y la petición no llega al controlador.
- **`WHERE id = $1 AND usuario_id = $2`**: la base de datos no busca solo "la tarea con este id", sino "la tarea con este id que pertenezca a este usuario". Como el `usuario_id` sale del token y no de lo que envía el cliente, nadie puede acceder a una tarea ajena aunque conozca su id; en ese caso responde 404.
- **Singleton en `Config`**: la configuración se lee y se valida una sola vez al arrancar, y toda la aplicación usa esa misma instancia. Si falta una variable obligatoria, la aplicación no arranca y dice qué falta, en vez de fallar después con usuarios conectados.
- **Capas**: el controlador solo traduce HTTP, el servicio aplica las reglas de negocio y el repositorio es el único que habla con PostgreSQL. Por eso los servicios se pueden probar con repositorios falsos, sin base de datos.

**Qué se rechazó o modificó (errores reales detectados en la primera versión):**

| # | Problema en el código generado | Tipo | Cómo se detectó | Corrección |
| --- | --- | --- | --- | --- |
| 1 | La prueba de valores por defecto de `Config` esperaba el puerto `3000` y recibía `3001`. `getInstance()` cargaba `.env.test` y rellenaba variables que la prueba había borrado: la configuración dependía de archivos ocultos. | Diseño / pruebas | Prueba unitaria fallida | Se separó la lectura del archivo de la construcción: `Config.fromEnvForTesting(env)` construye una configuración solo con las variables dadas. |
| 2 | Las pruebas de integración fallaban con `Cannot use a pool after calling end on the pool`. El `afterAll(closePool)` estaba dentro del primer `describe` y cerraba la conexión antes de que corrieran los demás bloques del archivo. | Lógica | 30+ pruebas fallidas | Se movió `afterAll(closePool)` al nivel del archivo. |
| 3 | Se definió una clase `ForbiddenError` (403) que nunca se usaba, porque se decidió responder 404 a tareas ajenas. | Código muerto | Revisión manual | Se eliminó y se documentó en `NotFoundError` por qué se usa 404. |
| 4 | Un getter `isProduction` en `Config` no se usaba en ninguna parte. | Código muerto | Búsqueda con `grep` | Se eliminó. |

**Cambios propios al revisar:** al revisar el diseño de `fecha_vencimiento` y de la actualización de tareas tomé las dos decisiones descritas en "Decisiones sin asistencia de IA", que cambian el modelo de datos y agregan el endpoint PATCH.

**Verificación realizada:**

1. `npm run typecheck` sin errores, con TypeScript en modo `strict` y `noUncheckedIndexedAccess`.
2. Prueba manual con `curl` de cada endpoint, incluidos los casos de error (JSON mal formado, token manipulado, UUID inválido, fecha imposible como `2026-02-30`, campos no permitidos).
3. Prueba de aislamiento con dos usuarios: el segundo recibe 404 al leer, editar o borrar la tarea del primero, y su listado sale vacío.
4. Revisión directa en PostgreSQL de que la columna `password_hash` contiene un hash bcrypt (`$2b$10$...`) y no la contraseña.
5. 61 pruebas automatizadas en verde (25 unitarias y 36 de integración), con cobertura cercana al 88 %.
6. `npm run build` y arranque de la versión compilada (`node dist/server.js`) para confirmar que las migraciones y Swagger funcionan fuera del modo desarrollo.

**Verificaciones propias en mi computador (Windows + PostgreSQL 15):**

- Instalé y ejecuté el proyecto siguiendo el README: migraciones, `npm run dev` y `npm test` con todas las pruebas en verde.
- Probé el flujo completo en Swagger: registro (201), email repetido (409), datos inválidos (400), login incorrecto (401), login correcto, CRUD de tareas y borrado (204).
- Comprobé el aislamiento con un segundo usuario: al consultar o borrar la tarea del primero, la API responde 404.
- Revisé en pgAdmin la tabla `usuarios`: la columna `password_hash` muestra el hash de bcrypt y no la contraseña.

### Uso 2 — Tema visual y usabilidad de Swagger UI

**Prompt utilizado:**

> Quiero mejorar la estética de la documentación Swagger UI que se sirve en /docs, sin cambiar nada del comportamiento de la API. (1) Un tema visual personalizado, moderno y limpio: paleta en tonos morado/lavanda (luego pedí volver al verde de Swagger), tipografía legible, bordes redondeados, buen espaciado y colores distintos y suaves para cada método HTTP. (2) Ocultar la barra superior verde de Swagger y mostrar un encabezado propio con el nombre "Task Manager API" y una línea corta de descripción. (3) Que se vea bien en modo claro y oscuro (prefers-color-scheme). (4) Título de la pestaña: "Task Manager API · Docs". (5) swaggerOptions: persistAuthorization, displayRequestDuration, docExpansion: "list", filter y tryItOutEnabled. Restricciones: no modificar rutas, controladores, servicios, repositorios, validaciones ni respuestas; CSS y opciones en un archivo nuevo `src/docs/swagger-ui.ts` documentado con JSDoc; nada cargado de internet; ejecutar typecheck y tests; commit atómico y entrada en esta bitácora.

**Qué se cambió:**

- **Nuevo `src/docs/swagger-ui.ts`** con dos exportaciones documentadas: `swaggerCustomCss` (el tema) y `swaggerUiOptions` (título de la pestaña, CSS y `swaggerOptions`).
- **Tema en verde, basado en el logo de Swagger** (`#85ea2d` y `#173647`). La primera versión era lavanda, pero preferí el verde original porque combina con el logo. Los colores son variables CSS en `:root`, redefinidas dentro de `@media (prefers-color-scheme: dark)`: así el modo oscuro solo cambia valores, no reglas. Colores suaves por método: GET azul, POST verde, PUT ámbar, PATCH violeta, DELETE rosa.
- **Fuentes del sistema** (`system-ui`, `Segoe UI`, `Roboto`…) en lugar de fuentes web: no hay peticiones externas y la página no depende de internet.
- **Encabezado propio solo con CSS:** se oculta `.topbar` y el título y la descripción se dibujan con pseudo-elementos `::before`. Se descartó inyectar JavaScript (`customJsStr`) porque no hacía falta.
- **`src/app.ts`:** el único cambio es pasar `swaggerUiOptions` a `swaggerUi.setup(...)`. Rutas, controladores, servicios y respuestas no se tocaron.

**Verificación realizada:**

1. `npm run typecheck` sin errores.
2. `npm test`: 61 pruebas en verde (6 archivos).
3. Petición a `/docs/` con supertest: responde 200, el `<title>` es "Task Manager API · Docs", el CSS va en línea y no hay URLs externas (solo los namespaces SVG que trae Swagger). En `/docs/swagger-ui-init.js` aparecen las cinco opciones con sus valores.

### Uso 3 — Implementación de mis decisiones de diseño

**Prompt utilizado (resumido):**

> Implementar dos decisiones de diseño que tomé yo. (1) `fecha_vencimiento` pasa de `DATE` a `TIMESTAMPTZ` con una migración que convierte los datos existentes al final de ese día en hora de Colombia; el esquema exige `date-time` con zona horaria y rechaza fechas sin ella con un mensaje en español; se elimina el parser del tipo `DATE`; y se agrega el filtro `GET /tasks?vencidas=true|false`, combinable con `?estado=`, comparando con `NOW()` en PostgreSQL. (2) Agregar `PATCH /tasks/:id` para actualizar solo los campos enviados (`minProperties: 1`, `descripcion` y `fecha_vencimiento` aceptan `null`, `titulo` y `estado` no), con un `UPDATE` armado desde una lista blanca de columnas y consultas parametrizadas, sin cambiar PUT. Actualizar OpenAPI, README y pruebas, ejecutar typecheck y tests, y hacer commits atómicos.

**Aclaración:** las decisiones y su razonamiento son míos (están en "Decisiones sin asistencia de IA"). Claude hizo la implementación a partir de esas decisiones.

**Qué se cambió:**

- **Migración `002_fecha_vencimiento_timestamptz.sql`:** convierte la columna con `USING ((fecha_vencimiento + TIME '23:59:59') AT TIME ZONE 'America/Bogota')` y agrega el índice `idx_tareas_usuario_vencimiento` sobre `(usuario_id, fecha_vencimiento)`.
- **Validación:** `fecha_vencimiento` usa `format: 'date-time'`, que exige `Z` o un desfase. Sin zona horaria responde 400 con "Debe ser una fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-10-23T16:00:00-05:00".
- **`database.ts`:** se eliminó el parser del tipo `DATE`. `pg` devuelve `TIMESTAMPTZ` como `Date` y la respuesta JSON sale en ISO 8601 (UTC).
- **Filtro `vencidas`:** la condición vive en el repositorio (`fecha_vencimiento IS NOT NULL AND fecha_vencimiento < NOW() AND estado <> 'completada'`); `vencidas=false` usa su negación. El controlador convierte el texto `"true"`/`"false"` de la query a booleano.
- **PATCH:** nuevo esquema `taskPatchSchema`, método `update` en el servicio (recorta el título igual que `create`) y `updateForUser` en el repositorio, que solo agrega al `SET` las columnas de la lista blanca que llegaron y siempre filtra por `id` y `usuario_id`.
- **Documentación:** OpenAPI con el nuevo formato de fecha, el parámetro `vencidas` y el endpoint PATCH (200, 400, 401, 404); README con la tabla de endpoints, el modelo de tarea, ejemplos con `curl` y las decisiones de diseño.

**Errores y ajustes reales durante la implementación:**

- Al insertar el código con un script, los marcadores de parámetros `$${params.length}` perdieron un `$` (en `String.replace`, `$$` significa un solo `$`). La consulta quedó como `estado = 2` y PostgreSQL respondió `el operador no existe: character varying = integer`. Lo detectó la prueba existente de `GET /tasks?estado=`, que respondió 500; se corrigieron los dos marcadores.
- Por el mismo motivo, el patrón `\\S` del título en el esquema de PATCH quedó como `\S` (que en JavaScript es solo la letra `S`). Se detectó al revisar el archivo y se corrigió antes de escribir las pruebas.
- El tipo `JSONSchemaType` de AJV obliga a marcar como `nullable` los campos opcionales, lo que habría permitido `titulo: null` en PATCH. El esquema de PATCH se tipó como `Schema` para que `titulo` y `estado` sigan rechazando `null`.
- Se actualizaron las pruebas que usaban fechas `YYYY-MM-DD`. La prueba "conserva la fecha exacta sin desfase" se reemplazó por una que verifica que la fecha se devuelve en UTC.

**Verificación realizada:**

1. `npm run typecheck` sin errores.
2. `npm test`: 80 pruebas en verde (27 unitarias y 53 de integración). Las nuevas cubren: fecha sin zona horaria (400), el mismo instante con distinto desfase se guarda igual, `vencidas=true` y `vencidas=false` (incluida la combinación con `estado`), PATCH que conserva los demás campos, cuerpo vacío (400), `titulo: null` (400), `descripcion: null` que la borra y PATCH a una tarea ajena (404 sin modificarla).
3. Se aplicó la migración en la base de desarrollo y se probó con `curl` contra el servidor en ejecución: una tarea con fecha pasada aparece en `?vencidas=true`, deja de aparecer después de un PATCH a `completada`, y una fecha sin zona horaria responde 400.
4. Se comprobó en PostgreSQL que la conversión de la migración deja `2026-11-01` como `2026-11-02T04:59:59Z` (23:59:59 en Colombia).
5. `npm run build` sin errores.

---

## Decisiones sin asistencia de IA

Las siguientes decisiones y su razonamiento son míos. Después de tomarlas, usé Claude para implementarlas (ver "Uso 3") y verifiqué el resultado con pruebas.

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
| **Fechas corridas por zona horaria.** El driver `pg` convierte las columnas `DATE` en objetos `Date` a medianoche local; en Colombia (UTC-5) `2026-11-01` se serializaba como `2026-11-01T05:00:00.000Z`, y en otras zonas podía mostrar el día anterior. | Se registró un parser para el tipo `DATE` (OID 1082) que lo devuelve como texto `YYYY-MM-DD`. Una prueba de integración verifica que `2026-12-31` vuelva idéntico. Más adelante el campo se migró a `TIMESTAMPTZ` (Decisión 1), con lo que este parser dejó de ser necesario y se eliminó. |
| **Carrera al registrar el mismo email dos veces a la vez.** La verificación previa del servicio no basta si dos peticiones llegan juntas. | La restricción `UNIQUE` de la base de datos es la garantía final, y el repositorio convierte el error `23505` de PostgreSQL en un `ConflictError` (409). |
| **Límite oculto de bcrypt.** bcrypt solo usa los primeros 72 bytes; dos contraseñas largas con el mismo inicio darían el mismo hash. | Se limitó la contraseña a 72 caracteres en el esquema de validación. |
| **Enumeración de usuarios en el login.** Si "email no existe" respondiera más rápido que "contraseña incorrecta", se podría averiguar qué emails están registrados. | Mismo mensaje en ambos casos y comparación contra un hash de referencia cuando el email no existe. |
| **Pruebas que borran datos.** Las pruebas vacían las tablas y podrían apuntar por error a la base real. | Las pruebas usan `.env.test` y se niegan a correr si el nombre de la base no contiene `test`. |
| **Error al crear las bases de datos en pgAdmin.** Al ejecutar juntas las tres sentencias (`CREATE USER` y dos `CREATE DATABASE`) apareció `CREATE DATABASE cannot run inside a transaction block` y no se creó nada. pgAdmin ejecuta todo lo seleccionado como una sola transacción, y PostgreSQL no permite crear bases de datos dentro de una. | Ejecuté cada sentencia por separado, seleccionando una línea a la vez. |

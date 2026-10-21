# Bitácora de desarrollo

## Resumen del proceso

| Etapa | Qué se hizo |
| --- | --- |
| 1. Lectura de requisitos | Se listaron los requisitos obligatorios, los deseables y los criterios de evaluación de la prueba. |
| 2. Base del proyecto | TypeScript estricto, Express 5, estructura en capas y configuración con Singleton. |
| 3. Persistencia | Migraciones SQL versionadas, pool de conexiones y repositorios con consultas limitadas al dueño. |
| 4. Lógica de negocio | Servicios de autenticación (bcrypt + JWT) y de tareas. |
| 5. Capa HTTP | Middlewares de autenticación, validación (AJV) y errores; controladores y rutas. |
| 6. Documentación | OpenAPI/Swagger y README. |
| 7. Verificación | Pruebas manuales con `curl` de todos los endpoints, 61 pruebas automatizadas y build de producción. |
| 8. CI | GitHub Actions ejecuta typecheck, build y pruebas en cada push. |

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

✍️ **COMPLETAR:** revisa cada archivo de `src/` y agrega aquí qué entendiste de él y por qué te parece correcto. Lo que no entiendas, pregúntalo antes de entregarlo.

**Qué se rechazó o modificó (errores reales detectados en la primera versión):**

| # | Problema en el código generado | Tipo | Cómo se detectó | Corrección |
| --- | --- | --- | --- | --- |
| 1 | La prueba de valores por defecto de `Config` esperaba el puerto `3000` y recibía `3001`. `getInstance()` cargaba `.env.test` y rellenaba variables que la prueba había borrado: la configuración dependía de archivos ocultos. | Diseño / pruebas | Prueba unitaria fallida | Se separó la lectura del archivo de la construcción: `Config.fromEnvForTesting(env)` construye una configuración solo con las variables dadas. |
| 2 | Las pruebas de integración fallaban con `Cannot use a pool after calling end on the pool`. El `afterAll(closePool)` estaba dentro del primer `describe` y cerraba la conexión antes de que corrieran los demás bloques del archivo. | Lógica | 30+ pruebas fallidas | Se movió `afterAll(closePool)` al nivel del archivo. |
| 3 | Se definió una clase `ForbiddenError` (403) que nunca se usaba, porque se decidió responder 404 a tareas ajenas. | Código muerto | Revisión manual | Se eliminó y se documentó en `NotFoundError` por qué se usa 404. |
| 4 | Un getter `isProduction` en `Config` no se usaba en ninguna parte. | Código muerto | Búsqueda con `grep` | Se eliminó. |

✍️ **COMPLETAR:** agrega lo que tú misma cambies o rechaces al revisar el código. Es la parte que más pesa en la evaluación.

**Verificación realizada:**

1. `npm run typecheck` sin errores, con TypeScript en modo `strict` y `noUncheckedIndexedAccess`.
2. Prueba manual con `curl` de cada endpoint, incluidos los casos de error (JSON mal formado, token manipulado, UUID inválido, fecha imposible como `2026-02-30`, campos no permitidos).
3. Prueba de aislamiento con dos usuarios: el segundo recibe 404 al leer, editar o borrar la tarea del primero, y su listado sale vacío.
4. Revisión directa en PostgreSQL de que la columna `password_hash` contiene un hash bcrypt (`$2b$10$...`) y no la contraseña.
5. 61 pruebas automatizadas en verde (25 unitarias y 36 de integración), con cobertura cercana al 88 %.
6. `npm run build` y arranque de la versión compilada (`node dist/server.js`) para confirmar que las migraciones y Swagger funcionan fuera del modo desarrollo.

✍️ **COMPLETAR:** describe las verificaciones que hagas tú (por ejemplo, probar el flujo completo en Swagger o en Postman).

### Uso 2 — Tema visual y usabilidad de Swagger UI

**Prompt utilizado:**

> Quiero mejorar la estética de la documentación Swagger UI que se sirve en /docs, sin cambiar nada del comportamiento de la API. (1) Un tema visual personalizado, moderno y limpio: paleta en tonos morado/lavanda (luego pedí volver al verde de Swagger), tipografía legible, bordes redondeados, buen espaciado y colores distintos y suaves para cada método HTTP. (2) Ocultar la barra superior verde de Swagger y mostrar un encabezado propio con el nombre "Task Manager API" y una línea corta de descripción. (3) Que se vea bien en modo claro y oscuro (prefers-color-scheme). (4) Título de la pestaña: "Task Manager API · Docs". (5) swaggerOptions: persistAuthorization, displayRequestDuration, docExpansion: "list", filter y tryItOutEnabled. Restricciones: no modificar rutas, controladores, servicios, repositorios, validaciones ni respuestas; CSS y opciones en un archivo nuevo `src/docs/swagger-ui.ts`; nada cargado de internet; ejecutar typecheck y tests; commit atómico y entrada en esta bitácora.

**Qué se cambió:**

- **Nuevo `src/docs/swagger-ui.ts`** con dos exportaciones: `swaggerCustomCss` (el tema) y `swaggerUiOptions` (título de la pestaña, CSS y `swaggerOptions`).
- **Tema en verde, basado en el logo de Swagger** (`#85ea2d` y `#173647`). La primera versión era lavanda, pero preferí el verde original porque combina con el logo. Los colores son variables CSS en `:root`, redefinidas dentro de `@media (prefers-color-scheme: dark)`: así el modo oscuro solo cambia valores, no reglas. Colores suaves por método: GET azul, POST verde, PUT ámbar, PATCH violeta, DELETE rosa.
- **Fuentes del sistema** (`system-ui`, `Segoe UI`, `Roboto`…) en lugar de fuentes web: no hay peticiones externas y la página no depende de internet.
- **Encabezado propio solo con CSS:** se oculta `.topbar` y el título y la descripción se dibujan con pseudo-elementos `::before`. Se descartó inyectar JavaScript (`customJsStr`) porque no hacía falta.
- **`src/app.ts`:** el único cambio es pasar `swaggerUiOptions` a `swaggerUi.setup(...)`. Rutas, controladores, servicios y respuestas no se tocaron.

**Verificación realizada:**

1. `npm run typecheck` sin errores.
2. `npm test`: 61 pruebas en verde (6 archivos).
3. Petición a `/docs/` con supertest: responde 200, el `<title>` es "Task Manager API · Docs", el CSS va en línea y no hay URLs externas (solo los namespaces SVG que trae Swagger). En `/docs/swagger-ui-init.js` aparecen las cinco opciones con sus valores.

✍️ **COMPLETAR:** abre `/docs` en el navegador en modo claro y oscuro y anota aquí lo que ajustes del tema.

---

## Decisiones sin asistencia de IA

✍️ **COMPLETAR (obligatorio, mínimo dos):** la prueba exige al menos dos decisiones de arquitectura o implementación que hayas tomado **tú**, con tu razonamiento. No copies ejemplos: escoge decisiones reales. Algunas ideas de dónde puedes tomarlas al revisar el proyecto:

- Cambiar o confirmar una regla de validación (longitudes, formato de fecha, qué hacer con un email con espacios al inicio).
- Agregar un endpoint o un filtro (por ejemplo, filtrar por fecha de vencimiento o paginar el listado).
- Elegir dónde desplegar la API y por qué.
- Cambiar el orden del listado o el formato de alguna respuesta.

Formato sugerido:

> **Decisión:** …
> **Alternativas que consideré:** …
> **Por qué elegí esta:** …

---

## Retos y soluciones

| Reto | Solución |
| --- | --- |
| **Fechas corridas por zona horaria.** El driver `pg` convierte las columnas `DATE` en objetos `Date` a medianoche local; en Colombia (UTC-5) `2026-11-01` se serializaba como `2026-11-01T05:00:00.000Z`, y en otras zonas podía mostrar el día anterior. | Se registró un parser para el tipo `DATE` (OID 1082) que lo devuelve como texto `YYYY-MM-DD`. Una prueba de integración verifica que `2026-12-31` vuelva idéntico. |
| **Carrera al registrar el mismo email dos veces a la vez.** La verificación previa del servicio no basta si dos peticiones llegan juntas. | La restricción `UNIQUE` de la base de datos es la garantía final, y el repositorio convierte el error `23505` de PostgreSQL en un `ConflictError` (409). |
| **Límite oculto de bcrypt.** bcrypt solo usa los primeros 72 bytes; dos contraseñas largas con el mismo inicio darían el mismo hash. | Se limitó la contraseña a 72 caracteres en el esquema de validación. |
| **Enumeración de usuarios en el login.** Si "email no existe" respondiera más rápido que "contraseña incorrecta", se podría averiguar qué emails están registrados. | Mismo mensaje en ambos casos y comparación contra un hash de referencia cuando el email no existe. |
| **Pruebas que borran datos.** Las pruebas vacían las tablas y podrían apuntar por error a la base real. | Las pruebas usan `.env.test` y se niegan a correr si el nombre de la base no contiene `test`. |

✍️ **COMPLETAR:** agrega los bloqueos que encuentres tú al instalar, ejecutar o desplegar el proyecto en tu computador (por ejemplo, errores de conexión a PostgreSQL o de variables de entorno) y cómo los resolviste.

-- 001: tablas de usuarios y tareas.
-- gen_random_uuid() viene incluido en PostgreSQL 13+, no requiere extensiones.

CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT         NOT NULL,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_email_unico UNIQUE (email),
  -- El servicio normaliza el email; la base de datos lo garantiza.
  CONSTRAINT usuarios_email_minusculas CHECK (email = LOWER(email))
);

CREATE TABLE IF NOT EXISTS tareas (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo            VARCHAR(150) NOT NULL,
  descripcion       TEXT,
  fecha_vencimiento DATE,
  estado            VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT tareas_estado_valido CHECK (estado IN ('pendiente', 'en curso', 'completada'))
);

-- Casi todas las consultas filtran por dueño: GET /tasks lista por usuario_id
-- y el resto busca por (id, usuario_id).
CREATE INDEX IF NOT EXISTS idx_tareas_usuario_id ON tareas (usuario_id);

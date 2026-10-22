-- 002: fecha_vencimiento pasa de DATE a TIMESTAMPTZ.
-- Las fechas existentes quedan al final de ese día en hora de Colombia.

ALTER TABLE tareas
  ALTER COLUMN fecha_vencimiento TYPE TIMESTAMPTZ
  USING ((fecha_vencimiento + TIME '23:59:59') AT TIME ZONE 'America/Bogota');

-- Para el filtro de vencidas: siempre se consulta por dueño y fecha.
CREATE INDEX IF NOT EXISTS idx_tareas_usuario_vencimiento ON tareas (usuario_id, fecha_vencimiento);

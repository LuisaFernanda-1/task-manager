-- 002: fecha_vencimiento pasa de DATE a TIMESTAMPTZ.
--
-- Por qué: una entrega tiene hora, no solo día. Con TIMESTAMPTZ el cliente envía
-- el momento con su zona horaria y PostgreSQL lo guarda como un instante único,
-- así "vencida" (fecha_vencimiento < NOW()) es correcta en cualquier país.
--
-- Las fechas existentes no tenían hora: se conservan como el final de ese día
-- (23:59:59) en hora de Colombia, para que ninguna tarea quede vencida antes de tiempo.

ALTER TABLE tareas
  ALTER COLUMN fecha_vencimiento TYPE TIMESTAMPTZ
  USING ((fecha_vencimiento + TIME '23:59:59') AT TIME ZONE 'America/Bogota');

-- Para el filtro de vencidas: siempre se consulta por dueño y fecha.
CREATE INDEX IF NOT EXISTS idx_tareas_usuario_vencimiento ON tareas (usuario_id, fecha_vencimiento);

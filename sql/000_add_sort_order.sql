-- 1) Añadir columna (nullable inicialmente)
ALTER TABLE rutinas_usuario
  ADD COLUMN IF NOT EXISTS sort_order integer;

-- 2) Poblar sort_order basado en orden de inserción; usa 'id' como proxy de inserción.
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, day_id ORDER BY id) - 1 AS rn
  FROM rutinas_usuario
)
UPDATE rutinas_usuario r
SET sort_order = n.rn
FROM numbered n
WHERE r.id = n.id;

-- 3) Asegurar no-null si lo deseas
ALTER TABLE rutinas_usuario
  ALTER COLUMN sort_order SET NOT NULL;

-- 4) Crear función + trigger para asignar sort_order por defecto en nuevos inserts
CREATE OR REPLACE FUNCTION set_default_sort_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    NEW.sort_order := COALESCE(
      (SELECT MAX(sort_order) FROM rutinas_usuario WHERE user_id = NEW.user_id AND day_id = NEW.day_id),
      -1
    ) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_set_default_sort_order
BEFORE INSERT ON rutinas_usuario
FOR EACH ROW
EXECUTE FUNCTION set_default_sort_order();

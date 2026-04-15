-- Vincula cada reservation_item con la tienda desde la cual se separa inventario.
-- Se deja nullable para compatibilidad con datos historicos y despliegues parciales.
ALTER TABLE "reservation_item"
ADD COLUMN IF NOT EXISTS "storeId" INTEGER;

ALTER TABLE "reservation_item"
DROP CONSTRAINT IF EXISTS "reservation_item_storeId_fkey";

ALTER TABLE "reservation_item"
ADD CONSTRAINT "reservation_item_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "store"("storeId")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "reservation_item_storeId_idx"
ON "reservation_item"("storeId");

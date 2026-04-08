-- Add updatedAt fields to cart tables
ALTER TABLE "cart"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "cart_item"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Enforce cart uniqueness per client and item uniqueness per cart/book pair
CREATE UNIQUE INDEX "cart_clientId_key" ON "cart"("clientId");
CREATE UNIQUE INDEX "cart_item_cartId_bookId_key" ON "cart_item"("cartId", "bookId");

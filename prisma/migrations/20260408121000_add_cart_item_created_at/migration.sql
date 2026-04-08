-- Add createdAt to cart_item table
ALTER TABLE "cart_item"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

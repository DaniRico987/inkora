-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_clientId_fkey";

-- DropForeignKey
ALTER TABLE "cart_item" DROP CONSTRAINT "cart_item_cartId_fkey";

-- AlterTable
ALTER TABLE "cart" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cart_item" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("cartId") ON DELETE CASCADE ON UPDATE CASCADE;

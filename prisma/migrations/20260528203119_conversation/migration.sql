-- DropForeignKey
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_adminId_fkey";

-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "lastAdminId" INTEGER,
ALTER COLUMN "adminId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "conversation_lastAdminId_status_idx" ON "conversation"("lastAdminId", "status");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("adminId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_lastAdminId_fkey" FOREIGN KEY ("lastAdminId") REFERENCES "admin"("adminId") ON DELETE SET NULL ON UPDATE CASCADE;

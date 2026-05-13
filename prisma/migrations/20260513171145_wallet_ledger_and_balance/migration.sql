-- AlterTable
ALTER TABLE "client" ADD COLUMN     "walletBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "balanceAfter" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "idx_transaction_client_date" ON "transaction"("clientId", "transactionDate");

-- CreateIndex
CREATE INDEX "idx_transaction_client_type_date" ON "transaction"("clientId", "transactionType", "transactionDate");

-- CreateIndex
CREATE INDEX "idx_transaction_purchase" ON "transaction"("purchaseId");

-- CreateIndex
CREATE INDEX "idx_transaction_refund" ON "transaction"("refundId");

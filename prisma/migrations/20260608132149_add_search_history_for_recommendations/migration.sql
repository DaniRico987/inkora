-- CreateTable
CREATE TABLE "search_history" (
    "searchHistoryId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "query" VARCHAR(255) NOT NULL,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("searchHistoryId")
);

-- CreateIndex
CREATE INDEX "idx_search_history_client_created_at" ON "search_history"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_search_history_category_created_at" ON "search_history"("categoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("categoryId") ON DELETE SET NULL ON UPDATE CASCADE;

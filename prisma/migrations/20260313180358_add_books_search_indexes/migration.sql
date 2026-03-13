-- CreateIndex
CREATE INDEX "idx_book_available_price" ON "book"("isAvailable", "price");

-- CreateIndex
CREATE INDEX "idx_book_available_publication_year" ON "book"("isAvailable", "publicationYear");

-- CreateIndex
CREATE INDEX "idx_book_available_language" ON "book"("isAvailable", "language");

-- CreateIndex
CREATE INDEX "idx_book_available_condition" ON "book"("isAvailable", "condition");

-- CreateIndex
CREATE INDEX "idx_book_available_author" ON "book"("isAvailable", "author");

-- CreateIndex
CREATE INDEX "idx_book_available_title" ON "book"("isAvailable", "title");

-- CreateIndex
CREATE INDEX "idx_book_category_category_book" ON "book_category"("categoryId", "bookId");

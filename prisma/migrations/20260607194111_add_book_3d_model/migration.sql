-- CreateTable
CREATE TABLE "book_3d_model" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "modelGlb" TEXT NOT NULL,
    "fileName" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_3d_model_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_3d_model_bookId_key" ON "book_3d_model"("bookId");

-- AddForeignKey
ALTER TABLE "book_3d_model" ADD CONSTRAINT "book_3d_model_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE CASCADE ON UPDATE CASCADE;

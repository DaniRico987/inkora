-- AlterTable
ALTER TABLE "birthday_voucher" ALTER COLUMN "voucherPdfUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "book" ALTER COLUMN "coverUrl" SET DATA TYPE TEXT,
ALTER COLUMN "previewUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "book_image" ALTER COLUMN "imageUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "news" ALTER COLUMN "mediaUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "return_book" ALTER COLUMN "qrCodeUrl" SET DATA TYPE TEXT;

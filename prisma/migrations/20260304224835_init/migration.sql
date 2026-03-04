-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('client', 'admin', 'root');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'blocked');

-- CreateEnum
CREATE TYPE "BookCondition" AS ENUM ('new', 'used');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('homeDelivery', 'storePickup');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('inPreparation', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('active', 'cancelled', 'expired', 'converted');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('badCondition', 'didNotMeetExpectations', 'lateDelivery');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'processed', 'rejected');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('payment', 'refund');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('active', 'processed');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('newBook', 'birthday', 'message', 'orderStatus');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'push');

-- CreateEnum
CREATE TYPE "NotificationLogStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "user" (
    "userId" SERIAL NOT NULL,
    "dni" VARCHAR(20) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "birthDate" DATE NOT NULL,
    "birthPlace" VARCHAR(100),
    "address" VARCHAR(255),
    "gender" VARCHAR(20),
    "userType" "UserType" NOT NULL,
    "status" "UserStatus" NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "client" (
    "clientId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "admin" (
    "adminId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdByRootId" INTEGER,
    "isTemporaryPassword" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("adminId")
);

-- CreateTable
CREATE TABLE "user_preference" (
    "userPreferenceId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("userPreferenceId")
);

-- CreateTable
CREATE TABLE "book" (
    "bookId" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "author" VARCHAR(150) NOT NULL,
    "publicationYear" INTEGER,
    "publisher" VARCHAR(150),
    "isbn" VARCHAR(20),
    "language" VARCHAR(50),
    "pageCount" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "condition" "BookCondition",
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "coverUrl" VARCHAR(500),
    "previewUrl" VARCHAR(500),

    CONSTRAINT "book_pkey" PRIMARY KEY ("bookId")
);

-- CreateTable
CREATE TABLE "category" (
    "categoryId" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "category_pkey" PRIMARY KEY ("categoryId")
);

-- CreateTable
CREATE TABLE "book_category" (
    "bookCategoryId" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "book_category_pkey" PRIMARY KEY ("bookCategoryId")
);

-- CreateTable
CREATE TABLE "book_image" (
    "imageId" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "imageUrl" VARCHAR(500) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "book_image_pkey" PRIMARY KEY ("imageId")
);

-- CreateTable
CREATE TABLE "store" (
    "storeId" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "capacity" INTEGER,
    "status" "StoreStatus" NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "inventory" (
    "inventoryId" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("inventoryId")
);

-- CreateTable
CREATE TABLE "cart" (
    "cartId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CartStatus" NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("cartId")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "cartItemId" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("cartItemId")
);

-- CreateTable
CREATE TABLE "purchase" (
    "purchaseId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" VARCHAR(50),
    "shippingAddress" VARCHAR(255),
    "deliveryMode" "DeliveryMode",
    "pickupStoreId" INTEGER,
    "estimatedDeliveryTime" VARCHAR(100),
    "dispatchDate" TIMESTAMP(3),
    "status" "PurchaseStatus" NOT NULL,

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("purchaseId")
);

-- CreateTable
CREATE TABLE "purchase_item" (
    "purchaseItemId" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "purchase_item_pkey" PRIMARY KEY ("purchaseItemId")
);

-- CreateTable
CREATE TABLE "reservation" (
    "reservationId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL,

    CONSTRAINT "reservation_pkey" PRIMARY KEY ("reservationId")
);

-- CreateTable
CREATE TABLE "reservation_item" (
    "reservationItemId" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "reservation_item_pkey" PRIMARY KEY ("reservationItemId")
);

-- CreateTable
CREATE TABLE "return_book" (
    "returnBookId" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "reason" "ReturnReason",
    "additionalDescription" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReturnStatus" NOT NULL,
    "qrCodeUrl" VARCHAR(500),
    "approvalDate" TIMESTAMP(3),

    CONSTRAINT "return_book_pkey" PRIMARY KEY ("returnBookId")
);

-- CreateTable
CREATE TABLE "refund" (
    "refundId" SERIAL NOT NULL,
    "returnId" INTEGER NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "refundMethod" VARCHAR(50),
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RefundStatus" NOT NULL,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("refundId")
);

-- CreateTable
CREATE TABLE "payment_card" (
    "cardId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "maskedNumber" VARCHAR(20) NOT NULL,
    "cardType" "CardType" NOT NULL,
    "expirationDate" DATE NOT NULL,
    "cardHolder" VARCHAR(150) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payment_card_pkey" PRIMARY KEY ("cardId")
);

-- CreateTable
CREATE TABLE "transaction" (
    "transactionId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "purchaseId" INTEGER,
    "refundId" INTEGER,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gatewayReference" VARCHAR(255),

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE "news" (
    "newsId" SERIAL NOT NULL,
    "adminId" INTEGER,
    "bookId" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" VARCHAR(500),
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "news_pkey" PRIMARY KEY ("newsId")
);

-- CreateTable
CREATE TABLE "news_category" (
    "newsCategoryId" SERIAL NOT NULL,
    "newsId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "news_category_pkey" PRIMARY KEY ("newsCategoryId")
);

-- CreateTable
CREATE TABLE "subscription" (
    "subscriptionId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("subscriptionId")
);

-- CreateTable
CREATE TABLE "notification" (
    "notificationId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "newsId" INTEGER,
    "bookId" INTEGER,
    "notificationType" "NotificationType" NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notificationId")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "notificationLogId" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationLogStatus" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "errorMessage" VARCHAR(500),
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("notificationLogId")
);

-- CreateTable
CREATE TABLE "conversation" (
    "conversationId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ConversationStatus" NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("conversationId")
);

-- CreateTable
CREATE TABLE "message" (
    "messageId" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "message_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "birthday_voucher" (
    "voucherId" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discountPercentage" DECIMAL(5,2) NOT NULL,
    "voucherPdfUrl" VARCHAR(500),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "birthday_voucher_pkey" PRIMARY KEY ("voucherId")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "logId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "affectedEntity" VARCHAR(100),
    "affectedEntityId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("logId")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_dni_key" ON "user"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "client_userId_key" ON "client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_userId_key" ON "admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_clientId_categoryId_key" ON "user_preference"("clientId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "book_isbn_key" ON "book"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "book_category_bookId_categoryId_key" ON "book_category"("bookId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_bookId_storeId_key" ON "inventory"("bookId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "return_book_purchaseId_key" ON "return_book"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_returnId_key" ON "refund"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "news_category_newsId_categoryId_key" ON "news_category"("newsId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_clientId_categoryId_key" ON "subscription"("clientId", "categoryId");

-- CreateIndex
CREATE INDEX "notification_log_notificationId_idx" ON "notification_log"("notificationId");

-- CreateIndex
CREATE INDEX "notification_log_status_idx" ON "notification_log"("status");

-- CreateIndex
CREATE UNIQUE INDEX "birthday_voucher_code_key" ON "birthday_voucher"("code");

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_createdByRootId_fkey" FOREIGN KEY ("createdByRootId") REFERENCES "user"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_category" ADD CONSTRAINT "book_category_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_category" ADD CONSTRAINT "book_category_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_image" ADD CONSTRAINT "book_image_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("storeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("cartId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_pickupStoreId_fkey" FOREIGN KEY ("pickupStoreId") REFERENCES "store"("storeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase"("purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_item" ADD CONSTRAINT "reservation_item_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("reservationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_item" ADD CONSTRAINT "reservation_item_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_book" ADD CONSTRAINT "return_book_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase"("purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_book" ADD CONSTRAINT "return_book_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "return_book"("returnBookId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase"("purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_card" ADD CONSTRAINT "payment_card_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase"("purchaseId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refund"("refundId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("adminId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_category" ADD CONSTRAINT "news_category_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "news"("newsId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_category" ADD CONSTRAINT "news_category_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "news"("newsId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("bookId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("notificationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("adminId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("conversationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birthday_voucher" ADD CONSTRAINT "birthday_voucher_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

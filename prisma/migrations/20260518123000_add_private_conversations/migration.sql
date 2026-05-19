-- Add private conversations support
ALTER TABLE "conversation"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "message"
ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "conversation_clientId_status_idx" ON "conversation"("clientId", "status");
CREATE INDEX "conversation_adminId_status_idx" ON "conversation"("adminId", "status");
CREATE INDEX "conversation_updatedAt_idx" ON "conversation"("updatedAt");
CREATE INDEX "message_conversationId_sentAt_idx" ON "message"("conversationId", "sentAt");
CREATE INDEX "message_senderId_idx" ON "message"("senderId");

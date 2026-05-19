import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';
import { ConversationsService } from './conversations.service';

@Module({
    controllers: [ConversationsController, MessagesController],
    providers: [ConversationsService],
    exports: [ConversationsService],
})
export class ConversationsModule { }
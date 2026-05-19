import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParticipantDto } from './participant.dto';
import { MessageDto } from './message.dto';

export class ConversationDto {
    @ApiProperty({ example: 8 })
    conversationId: number;

    @ApiProperty({ example: 'active' })
    status: 'active' | 'closed';

    @ApiProperty({ example: '2026-05-18T10:00:00.000Z' })
    startedAt: Date;

    @ApiProperty({ example: '2026-05-18T10:10:00.000Z' })
    updatedAt: Date;

    @ApiProperty({ example: 2 })
    unreadCount: number;

    @ApiProperty({ type: ParticipantDto })
    client: ParticipantDto;

    @ApiProperty({ type: ParticipantDto })
    admin: ParticipantDto;

    @ApiPropertyOptional({ type: MessageDto })
    lastMessage?: MessageDto | null;
}

export class ConversationListResponseDto {
    @ApiProperty({ type: [ConversationDto] })
    conversations: ConversationDto[];
}

export class ConversationMessagesResponseDto {
    @ApiProperty({ type: ConversationDto })
    conversation: ConversationDto;

    @ApiProperty({ type: [MessageDto] })
    messages: MessageDto[];
}
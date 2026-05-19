import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ParticipantDto } from './participant.dto';

export class MessageDto {
    @ApiProperty({ example: 101 })
    messageId: number;

    @ApiProperty({ example: 8 })
    conversationId: number;

    @ApiProperty({ example: 22 })
    senderId: number;

    @ApiProperty({ example: 'Necesito ayuda con mi pedido.' })
    content: string;

    @ApiProperty({ example: '2026-05-18T10:10:00.000Z' })
    sentAt: Date;

    @ApiPropertyOptional({ example: '2026-05-18T10:10:02.000Z', nullable: true })
    readAt?: Date | null;

    @ApiProperty({ example: false })
    isRead: boolean;

    @ApiProperty({ type: ParticipantDto })
    sender: ParticipantDto;
}

export class CreateMessageRequestDto {
    @ApiProperty({
        example: 'Hola, necesito ayuda con el estado de mi suscripción.',
    })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(4000)
    content: string;
}
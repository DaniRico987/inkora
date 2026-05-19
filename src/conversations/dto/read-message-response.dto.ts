import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReadMessageResponseDto {
    @ApiProperty({ example: 101 })
    messageId: number;

    @ApiProperty({ example: true })
    isRead: boolean;

    @ApiPropertyOptional({ example: '2026-05-18T10:12:00.000Z', nullable: true })
    readAt?: Date | null;
}
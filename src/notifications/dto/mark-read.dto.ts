import { ApiProperty } from '@nestjs/swagger';

export class MarkReadResponseDto {
  @ApiProperty()
  notificationId: number;

  @ApiProperty()
  isRead: boolean;
}

import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty()
  notificationId: number;

  @ApiProperty()
  newsId: number;

  @ApiProperty({ required: false })
  bookId?: number;

  @ApiProperty()
  notificationType: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  news?: {
    title: string;
    content: string;
    publishedAt: Date;
  };

  @ApiProperty({ required: false })
  book?: {
    title: string;
    author: string;
    coverUrl?: string;
  };
}

export class GetNotificationsResponseDto {
  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];
}
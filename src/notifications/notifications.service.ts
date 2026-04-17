import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async sendNewBookNotification(userId: number, bookId: number): Promise<void> {
    // Get book details
    const book = await this.prisma.book.findUnique({
      where: { bookId },
      include: { bookCategories: { include: { category: true } } },
    });
    if (!book) return;

    // Get user email
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { email: true, firstName: true },
    });
    if (!user) return;

    // Create notification
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        bookId,
        notificationType: 'newBook',
        content: `Nuevo libro disponible: "${book.title}" de ${book.author}. Categorías: ${book.bookCategories.map(bc => bc.category.name).join(', ')}`,
        isRead: false,
      },
    });

    // Send email
    try {
      await this.mailService.sendNewBookNotification(
        user.email,
        user.firstName || 'Cliente',
        book.title,
        book.author,
        book.bookCategories.map(bc => bc.category.name),
        notification.notificationId,
      );

      // Log success
      await this.prisma.notificationLog.create({
        data: {
          notificationId: notification.notificationId,
          channel: 'email',
          status: 'sent',
          sentAt: new Date(),
        },
      });
    } catch (error) {
      // Log failure
      await this.prisma.notificationLog.create({
        data: {
          notificationId: notification.notificationId,
          channel: 'email',
          status: 'failed',
          errorMessage: error.message,
        },
      });
    }
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

  async sendNewBookNotification(userId: number, newsId: number): Promise<void> {
    // Get news details with book
    const news = await this.prisma.news.findUnique({
      where: { newsId },
      include: {
        book: { include: { bookCategories: { include: { category: true } } } },
      },
    });
    if (!news || !news.book) return;

    const book = news.book;

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
        newsId,
        bookId: book.bookId,
        notificationType: 'newBook',
        content: `Nuevo libro disponible: "${book.title}" de ${book.author}. Categorías: ${book.bookCategories.map((bc) => bc.category.name).join(', ')}`,
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
        book.bookCategories.map((bc) => bc.category.name),
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

  async getUserNotifications(userId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        news: {
          select: {
            title: true,
            content: true,
            publishedAt: true,
          },
        },
        book: {
          select: {
            title: true,
            author: true,
            coverUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notifications;
  }

  async markAsRead(notificationId: number, userId: number) {
    // Verify the notification belongs to the user
    const notification = await this.prisma.notification.findFirst({
      where: {
        notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException(
        'Notification not found or does not belong to user',
      );
    }

    return await this.prisma.notification.update({
      where: { notificationId },
      data: { isRead: true },
      select: {
        notificationId: true,
        isRead: true,
      },
    });
  }
}

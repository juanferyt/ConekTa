import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly push: PushService) {}
  list(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  async read(userId: string, id: string) { const result = await this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } }); if (!result.count) throw new NotFoundException('Notificación no encontrada'); }
  readAll(userId: string) { return this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } }); }
  async create(userId: string, type: NotificationType, title: string, message: string, link?: string, email = true) {
    const notification = await this.prisma.notification.create({ data: { userId, type, title, message, link } });
    if (email && this.mail.enabled) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user) await this.mail.send(user.email, `ConekTa: ${title}`, `${message}${link ? `\n${link}` : ''}`).catch(() => undefined);
    }
    await this.push.send(userId, { title, body: message, link });
    return notification;
  }
}

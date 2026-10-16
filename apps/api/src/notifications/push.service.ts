import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  readonly enabled: boolean;
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.enabled = config.get<boolean>('PUSH_ENABLED', false);
    if (this.enabled) webpush.setVapidDetails(config.getOrThrow<string>('VAPID_SUBJECT'), config.getOrThrow<string>('VAPID_PUBLIC_KEY'), config.getOrThrow<string>('VAPID_PRIVATE_KEY'));
  }
  publicKey() { return { enabled: this.enabled, publicKey: this.enabled ? this.config.getOrThrow<string>('VAPID_PUBLIC_KEY') : null }; }
  subscribe(userId: string, endpoint: string, p256dh: string, auth: string, userAgent?: string) { return this.prisma.pushSubscription.upsert({ where: { endpoint }, update: { userId, p256dh, auth, userAgent }, create: { userId, endpoint, p256dh, auth, userAgent } }); }
  unsubscribe(userId: string, endpoint: string) { return this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } }); }
  async send(userId: string, payload: { title: string; body: string; link?: string }) {
    if (!this.enabled) return;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(subscriptions.map(async (item) => {
      try { await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, JSON.stringify(payload), { TTL: 60 * 60 }); }
      catch (error) { const status = (error as { statusCode?: number }).statusCode; if (status === 404 || status === 410) await this.prisma.pushSubscription.delete({ where: { id: item.id } }); }
    }));
  }
}

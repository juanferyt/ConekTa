import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter | null;
  constructor(private readonly config: ConfigService) {
    this.transporter = config.get<boolean>('MAIL_ENABLED', false)
      ? nodemailer.createTransport({
          host: config.getOrThrow<string>('SMTP_HOST'),
          port: config.getOrThrow<number>('SMTP_PORT'),
          secure: config.get<boolean>('SMTP_SECURE', false),
          auth: config.get<string>('SMTP_USER')
            ? { user: config.getOrThrow<string>('SMTP_USER'), pass: config.getOrThrow<string>('SMTP_PASSWORD') }
            : undefined,
        })
      : null;
  }

  get enabled(): boolean { return Boolean(this.transporter); }

  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    if (!this.transporter) throw new ServiceUnavailableException('El servicio de correo no está configurado');
    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('MAIL_FROM'), to, subject, text, html,
    });
  }
}

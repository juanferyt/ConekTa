import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, FilePurpose, InterviewStatus, NotificationType, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { InterviewDto, MessageDto } from './dto/communications.dto';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async conversations(user: AuthUser) {
    const where = this.applicationWhere(user);
    const applications = await this.prisma.application.findMany({ where, select: { id: true } });
    if (applications.length) await this.prisma.conversation.createMany({ data: applications.map(({ id }) => ({ applicationId: id })), skipDuplicates: true });
    return this.prisma.conversation.findMany({ where: { application: where }, include: this.conversationInclude, orderBy: { updatedAt: 'desc' } });
  }
  async assertConversationAccess(user: AuthUser, conversationId: string): Promise<void> { await this.accessConversation(user, conversationId); }
  async openConversation(user: AuthUser, applicationId: string) {
    await this.accessApplication(user, applicationId);
    return this.prisma.conversation.upsert({ where: { applicationId }, update: {}, create: { applicationId }, include: this.conversationInclude });
  }
  async messages(user: AuthUser, conversationId: string) {
    await this.accessConversation(user, conversationId);
    await this.prisma.message.updateMany({ where: { conversationId, senderId: { not: user.id }, readAt: null }, data: { readAt: new Date() } });
    return this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, take: 100, select: { id: true, senderId: true, body: true, attachmentUrl: true, readAt: true, createdAt: true } });
  }
  async send(user: AuthUser, conversationId: string, dto: MessageDto) {
    const conversation = await this.accessConversation(user, conversationId);
    if (conversation.application.status === ApplicationStatus.WITHDRAWN || conversation.application.status === ApplicationStatus.REJECTED) throw new BadRequestException('El chat está cerrado para esta postulación');
    if (dto.attachmentUrl) {
      const attachment = await this.prisma.fileAsset.findFirst({ where: { ownerId: user.id, purpose: FilePurpose.CHAT_ATTACHMENT, publicUrl: dto.attachmentUrl }, select: { id: true } });
      if (!attachment) throw new BadRequestException('El adjunto no pertenece al remitente');
    }
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({ data: { conversationId, senderId: user.id, body: dto.body.trim(), attachmentUrl: dto.attachmentUrl } });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });
    const recipientId = user.role === UserRole.CANDIDATE ? conversation.application.company.userId : conversation.application.candidate.userId;
    await this.notifications.create(recipientId, NotificationType.MESSAGE, 'Nuevo mensaje', `Tienes un mensaje sobre ${conversation.application.vacancy.title}`, user.role === UserRole.CANDIDATE ? '/company/messages' : '/candidate/messages');
    return message;
  }
  async interviews(user: AuthUser) {
    const where = this.applicationWhere(user);
    return this.prisma.interview.findMany({ where: { application: where }, include: { application: { include: { vacancy: { select: { title: true } }, candidate: { select: { firstName: true, lastName: true } }, company: { select: { name: true } } } } }, orderBy: { startsAt: 'asc' } });
  }
  async schedule(user: AuthUser, dto: InterviewDto) {
    if (user.role !== UserRole.COMPANY) throw new ForbiddenException('Solo la empresa puede agendar entrevistas');
    const application = await this.accessApplication(user, dto.applicationId);
    if (application.status !== ApplicationStatus.INTERVIEW) throw new BadRequestException('La postulación debe estar en estado entrevista');
    this.validateDates(dto.startsAt, dto.endsAt);
    const interview = await this.prisma.interview.create({ data: { ...dto, scheduledById: user.id } });
    await this.notifications.create(application.candidate.userId, NotificationType.INTERVIEW, 'Entrevista agendada', `La empresa agendó una entrevista para ${application.vacancy.title}`, '/candidate/interviews');
    return interview;
  }
  async updateInterview(user: AuthUser, id: string, dto: InterviewDto) {
    if (user.role !== UserRole.COMPANY) throw new ForbiddenException('Solo la empresa puede modificar entrevistas');
    const current = await this.ownedInterview(user, id);
    if (current.status !== InterviewStatus.SCHEDULED) throw new BadRequestException('La entrevista ya no puede editarse');
    if (dto.applicationId !== current.applicationId) throw new BadRequestException('No se puede cambiar la postulación');
    this.validateDates(dto.startsAt, dto.endsAt);
    return this.prisma.interview.update({ where: { id }, data: { startsAt: dto.startsAt, endsAt: dto.endsAt, timezone: dto.timezone, location: dto.location, meetingUrl: dto.meetingUrl, notes: dto.notes } });
  }
  async interviewStatus(user: AuthUser, id: string, status: InterviewStatus) {
    if (user.role !== UserRole.COMPANY) throw new ForbiddenException('Solo la empresa puede cambiar la entrevista');
    const current = await this.ownedInterview(user, id);
    if (current.status !== InterviewStatus.SCHEDULED || status === InterviewStatus.SCHEDULED) throw new BadRequestException('Transición de entrevista inválida');
    return this.prisma.interview.update({ where: { id }, data: { status } });
  }
  private validateDates(start: Date, end: Date) { if (start <= new Date() || end <= start) throw new BadRequestException('La entrevista debe iniciar en el futuro y terminar después de iniciar'); }
  private async ownedInterview(user: AuthUser, id: string) { const interview = await this.prisma.interview.findFirst({ where: { id, application: this.applicationWhere(user) } }); if (!interview) throw new NotFoundException('Entrevista no encontrada'); return interview; }
  private async accessConversation(user: AuthUser, id: string) { const conversation = await this.prisma.conversation.findFirst({ where: { id, application: this.applicationWhere(user) }, include: { application: { include: { vacancy: { select: { title: true } }, candidate: { select: { userId: true } }, company: { select: { userId: true } } } } } }); if (!conversation) throw new NotFoundException('Conversación no encontrada'); return conversation; }
  private async accessApplication(user: AuthUser, id: string) { const application = await this.prisma.application.findFirst({ where: { id, ...this.applicationWhere(user) }, include: { candidate: { select: { userId: true } }, company: { select: { userId: true } }, vacancy: { select: { title: true } } } }); if (!application) throw new NotFoundException('Postulación no encontrada'); return application; }
  private applicationWhere(user: AuthUser) { return user.role === UserRole.CANDIDATE ? { candidate: { userId: user.id } } : { company: { userId: user.id } }; }
  private readonly conversationInclude = { application: { include: { vacancy: { select: { id: true, title: true } }, candidate: { select: { firstName: true, lastName: true } }, company: { select: { name: true } } } }, messages: { orderBy: { createdAt: 'desc' as const }, take: 1 } } as const;
}

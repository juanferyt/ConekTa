import * as assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { io, type Socket } from 'socket.io-client';
import { createHash } from 'node:crypto';

interface Session {
  accessToken: string;
  user: { id: string };
}
let app: INestApplication;
let baseUrl = '';
const prisma = new PrismaClient();
const stamp = Date.now();
const emails = [
  `e2e-candidate-${stamp}@conekta.test`,
  `e2e-company-${stamp}@conekta.test`,
  `e2e-other-company-${stamp}@conekta.test`,
  `e2e-admin-${stamp}@conekta.test`,
];
const createdSkillIds: string[] = [];
const createdExperienceIds: string[] = [];
const password = 'E2e-Conekta-2026!';
async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<{ status: number; body: T }> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body: unknown = response.status === 204 ? undefined : ((await response.json()) as unknown);
  return { status: response.status, body: body as T };
}
const post = <T>(path: string, body: object, token?: string) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);
const patch = <T>(path: string, body: object, token?: string) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token);

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});
after(async () => {
  const verified = await prisma.verifiedExperience.findMany({
    where: { application: { experienceId: { in: createdExperienceIds } } },
    select: { id: true },
  });
  await prisma.experienceCertificate.deleteMany({
    where: { verifiedExperienceId: { in: verified.map((item) => item.id) } },
  });
  await prisma.verifiedExperience.deleteMany({
    where: { id: { in: verified.map((item) => item.id) } },
  });
  await prisma.experienceOpportunity.deleteMany({ where: { id: { in: createdExperienceIds } } });
  await prisma.interview.deleteMany({ where: { scheduledBy: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: createdSkillIds } } });
  await prisma.skill.deleteMany({ where: { id: { in: createdSkillIds } } });
  await prisma.$disconnect();
  await app.close();
});

void describe('flujo esencial ConekTa', () => {
  void it('completa registro, matching, postulación y selección con controles de seguridad', async () => {
    const adminPasswordHash = await new PasswordService().hash(password);
    await prisma.user.create({
      data: {
        email: emails[3],
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        active: true,
        emailVerified: true,
      },
    });
    const adminLogin = await post<Session>('/auth/login', { email: emails[3], password });
    assert.equal(adminLogin.status, 200);
    const skill = await post<{ id: string }>(
      '/admin/skills',
      {
        name: `React E2E ${stamp}`,
        category: 'Frontend',
        type: 'TECHNICAL',
        active: true,
      },
      adminLogin.body.accessToken,
    );
    assert.equal(skill.status, 201);
    createdSkillIds.push(skill.body.id);

    const candidateRegistration = await post<Session>('/auth/register', {
      email: emails[0],
      password,
      role: 'CANDIDATE',
      termsAccepted: true, privacyAccepted: true, majorityAgeConfirmed: true, marketingConsent: false,
    });
    assert.equal(candidateRegistration.status, 201);
    const candidateLogin = await post<Session>('/auth/login', { email: emails[0], password });
    assert.equal(candidateLogin.status, 200);
    const candidateToken = candidateLogin.body.accessToken;
    const profile = await patch<{ id: string; firstName: string }>(
      '/candidate/profile',
      { firstName: 'E2E', lastName: 'Candidate', availableNow: true, modalities: ['REMOTO'] },
      candidateToken,
    );
    assert.equal(profile.status, 200);
    const education = await post(
      '/candidate/educations',
      {
        institution: 'Universidad E2E',
        program: 'Ingenieria de Sistemas',
        academicLevel: 'Pregrado',
        semester: 9,
        status: 'ESTUDIANDO',
        expectedGraduationDate: '2027-06-30T00:00:00.000Z',
      },
      candidateToken,
    );
    assert.equal(education.status, 201);
    const candidateSkill = await post(
      '/candidate/skills',
      { skillId: skill.body.id, level: 'ADVANCED' },
      candidateToken,
    );
    assert.equal(candidateSkill.status, 201);
    const project = await post<{ id: string }>(
      '/candidate/projects',
      {
        title: 'Proyecto universitario E2E',
        description:
          'Proyecto academico real para validar habilidades y compatibilidad del candidato.',
        role: 'Desarrollador frontend',
        technologies: [`React E2E ${stamp}`],
        projectDate: '2026-05-15T00:00:00.000Z',
        projectType: 'Universitario',
        universityProject: true,
      },
      candidateToken,
    );
    assert.equal(project.status, 201);
    const contributionToken = `e2e-${randomToken(stamp)}`;
    await prisma.projectContribution.create({
      data: {
        projectId: project.body.id,
        candidateId: profile.body.id,
        validatorName: 'Validador E2E',
        validatorEmail: `validator-${stamp}@conekta.test`,
        contributionRole: 'Revisor académico',
        contributionSummary:
          'Validación controlada de la contribución técnica realizada en el proyecto universitario.',
        skillIds: [skill.body.id],
        tokenHash: createHash('sha256').update(contributionToken).digest('hex'),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const contributionPreview = await request<{ project: string }>(
      `/contributions/validate/${contributionToken}`,
    );
    assert.equal(contributionPreview.body.project, 'Proyecto universitario E2E');
    const contributionDecision = await post<{ status: string }>(
      `/contributions/validate/${contributionToken}`,
      { approved: true },
    );
    assert.equal(contributionDecision.body.status, 'VERIFIED');
    const companyRegistration = await post<Session>('/auth/register', {
      email: emails[1],
      password,
      role: 'COMPANY',
      termsAccepted: true, privacyAccepted: true, majorityAgeConfirmed: true, marketingConsent: false,
    });
    assert.equal(companyRegistration.status, 201);
    const companyLogin = await post<Session>('/auth/login', { email: emails[1], password });
    assert.equal(companyLogin.status, 200);
    const companyToken = companyLogin.body.accessToken;
    await patch(
      '/company/profile',
      {
        name: 'E2E Company',
        sector: 'Technology',
        country: 'Colombia',
        city: 'Bogota',
        contactEmail: emails[1],
      },
      companyToken,
    );
    const vacancyInput = {
      title: 'E2E Junior Developer',
      description:
        'Oportunidad de entrada utilizada para validar el flujo esencial completo de ConekTa.',
      responsibilities: ['Construir funcionalidades'],
      requirements: ['Fundamentos de programación'],
      city: 'Bogota',
      modality: 'REMOTO',
      opportunityType: 'FIRST_JOB',
      contractType: 'Indefinido',
      department: 'Cundinamarca',
      workSchedule: 'FULL_TIME',
      weeklyHours: 42,
      benefits: ['Trabajo remoto'],
      requiresUniversityAgreement: false,
      currency: 'COP',
      showSalary: false,
      relatedCareers: ['Ingenieria de Sistemas'],
      maxExperienceMonths: 0,
      experienceRequired: false,
      skills: [{ skillId: skill.body.id, priority: 'REQUIRED', weight: 5 }],
    };
    const vacancy = await post<{ id: string }>('/company/vacancies', vacancyInput, companyToken);
    assert.equal(vacancy.status, 201);
    const published = await post<{ status: string }>(
      `/company/vacancies/${vacancy.body.id}/publish`,
      {},
      companyToken,
    );
    assert.equal(published.body.status, 'PUBLISHED');
    const match = await request<{ score: number }>(
      `/candidate/matches/${vacancy.body.id}`,
      {},
      candidateToken,
    );
    assert.equal(match.status, 200);
    assert.ok(match.body.score >= 80);
    const application = await post<{ id: string }>(
      `/candidate/applications/${vacancy.body.id}`,
      {},
      candidateToken,
    );
    assert.equal(application.status, 201);
    const duplicate = await post(`/candidate/applications/${vacancy.body.id}`, {}, candidateToken);
    assert.equal(duplicate.status, 409);
    const missing = await request(
      '/candidate/matches/00000000-0000-0000-0000-000000000000',
      {},
      candidateToken,
    );
    assert.equal(missing.status, 404);
    const review = await request<{ items?: unknown[] } | unknown[]>(
      `/company/applications?vacancyId=${vacancy.body.id}`,
      {},
      companyToken,
    );
    assert.equal(review.status, 200);
    assert.ok(Array.isArray(review.body));
    const reviewed = await patch<{ status: string }>(
      `/company/applications/${application.body.id}/status`,
      { status: 'UNDER_REVIEW' },
      companyToken,
    );
    assert.equal(reviewed.body.status, 'UNDER_REVIEW');
    const changed = await patch<{ status: string }>(
      `/company/applications/${application.body.id}/status`,
      { status: 'INTERVIEW' },
      companyToken,
    );
    assert.equal(changed.body.status, 'INTERVIEW');
    const conversation = await post<{ id: string }>(
      '/communications/conversations',
      { applicationId: application.body.id },
      candidateToken,
    );
    assert.equal(conversation.status, 201);
    const candidateSocket = io(`${baseUrl}/realtime`, {
      auth: { token: candidateToken },
      transports: ['websocket'],
      reconnection: false,
    });
    const companySocket = io(`${baseUrl}/realtime`, {
      auth: { token: companyToken },
      transports: ['websocket'],
      reconnection: false,
    });
    await Promise.all([socketConnected(candidateSocket), socketConnected(companySocket)]);
    await Promise.all([
      socketAck(candidateSocket, 'conversation:join', { conversationId: conversation.body.id }),
      socketAck(companySocket, 'conversation:join', { conversationId: conversation.body.id }),
    ]);
    const realtimeMessage = new Promise<{ body: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Mensaje WebSocket no recibido')), 10000);
      companySocket.once('message:new', (message: { body: string }) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
    await socketAck(candidateSocket, 'message:send', {
      conversationId: conversation.body.id,
      body: 'Mensaje en tiempo real',
    });
    assert.equal((await realtimeMessage).body, 'Mensaje en tiempo real');
    const callSignal = new Promise<{ type: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Señal WebRTC no recibida')), 10000);
      companySocket.once('call:signal', (signal: { type: string }) => {
        clearTimeout(timer);
        resolve(signal);
      });
    });
    candidateSocket.emit('call:signal', {
      conversationId: conversation.body.id,
      type: 'offer',
      data: { type: 'offer', sdp: 'e2e' },
    });
    assert.equal((await callSignal).type, 'offer');
    candidateSocket.disconnect();
    companySocket.disconnect();
    const candidateMessage = await post<{ body: string }>(
      `/communications/conversations/${conversation.body.id}/messages`,
      { body: 'Hola, confirmo mi disponibilidad para la entrevista.' },
      candidateToken,
    );
    assert.equal(
      candidateMessage.body.body,
      'Hola, confirmo mi disponibilidad para la entrevista.',
    );
    const companyMessages = await request<Array<{ body: string }>>(
      `/communications/conversations/${conversation.body.id}/messages`,
      {},
      companyToken,
    );
    assert.equal(companyMessages.body.length, 2);
    assert.ok(companyMessages.body.some((item) => item.body === 'Mensaje en tiempo real'));
    const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000);
    const interview = await post<{ id: string }>(
      '/communications/interviews',
      {
        applicationId: application.body.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezone: 'America/Bogota',
        meetingUrl: 'https://meet.example.test/e2e',
      },
      companyToken,
    );
    assert.equal(interview.status, 201);
    const candidateInterviews = await request<Array<{ id: string }>>(
      '/communications/interviews',
      {},
      candidateToken,
    );
    assert.equal(candidateInterviews.body[0]?.id, interview.body.id);
    const candidateNotifications = await request<Array<{ type: string }>>(
      '/notifications',
      {},
      candidateToken,
    );
    assert.ok(candidateNotifications.body.some((item) => item.type === 'INTERVIEW'));
    const selected = await patch<{ status: string }>(`/company/applications/${application.body.id}/status`, { status: 'SELECTED' }, companyToken);
    assert.equal(selected.body.status, 'SELECTED');
    const offered = await post<{ status: string }>(`/company/applications/${application.body.id}/offer`, { salary: 2500000, currency: 'COP', startDate: '2026-10-01', notes: 'Oferta E2E' }, companyToken);
    assert.equal(offered.body.status, 'OFFER_SENT');
    const accepted = await patch<unknown[]>(`/candidate/applications/${application.body.id}/offer-response`, { status: 'OFFER_ACCEPTED' }, candidateToken);
    assert.equal(accepted.status, 200);
    const hired = await patch<{ status: string }>(`/company/applications/${application.body.id}/status`, { status: 'HIRED' }, companyToken);
    assert.equal(hired.body.status, 'HIRED');
    const candidateApplications = await request<{ id: string; status: string }[]>(
      '/candidate/applications',
      {},
      candidateToken,
    );
    assert.equal(
      candidateApplications.body.find((item) => item.id === application.body.id)?.status,
      'HIRED',
    );
    const other = await post<Session>('/auth/register', {
      email: emails[2],
      password,
      role: 'COMPANY',
      termsAccepted: true, privacyAccepted: true, majorityAgeConfirmed: true, marketingConsent: false,
    });
    const foreignUpdate = await patch(
      `/company/vacancies/${vacancy.body.id}`,
      vacancyInput,
      other.body.accessToken,
    );
    assert.equal(foreignUpdate.status, 404);
    const foreignChat = await request(
      `/communications/conversations/${conversation.body.id}/messages`,
      {},
      other.body.accessToken,
    );
    assert.equal(foreignChat.status, 404);
    const candidateAdminAccess = await request('/admin/dashboard', {}, candidateToken);
    assert.equal(candidateAdminAccess.status, 403);
    const companyAdminAccess = await request('/admin/dashboard', {}, companyToken);
    assert.equal(companyAdminAccess.status, 403);
    const experienceInput = {
      title: 'Dashboard social E2E',
      description:
        'Reto empresarial real para construir un tablero de indicadores de impacto social.',
      objective: 'Entregar un tablero funcional y documentado para la organización.',
      activities: ['Diseñar interfaz', 'Implementar indicadores'],
      professionalArea: 'Ingenieria de Sistemas',
      modality: 'REMOTO',
      city: 'Bogota',
      estimatedDurationWeeks: 4,
      startsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      participantLimit: 1,
      expectedDeliverables: ['Aplicación publicada', 'Repositorio documentado'],
      skills: [{ skillId: skill.body.id, priority: 'REQUIRED', weight: 5 }],
    };
    const experience = await post<{ id: string }>(
      '/experiences/company',
      experienceInput,
      companyToken,
    );
    assert.equal(experience.status, 201);
    createdExperienceIds.push(experience.body.id);
    const foreignExperience = await request(
      `/experiences/company/${experience.body.id}`,
      {},
      other.body.accessToken,
    );
    assert.equal(foreignExperience.status, 404);
    const experiencePublished = await post<{ status: string }>(
      `/experiences/company/${experience.body.id}/publish`,
      {},
      companyToken,
    );
    assert.equal(experiencePublished.body.status, 'PUBLISHED');
    const recommendedExperiences = await request<
      Array<{ id: string; compatibility: { score: number } }>
    >('/experiences/candidate', {}, candidateToken);
    const recommendation = recommendedExperiences.body.find(
      (item) => item.id === experience.body.id,
    );
    assert.ok(recommendation && recommendation.compatibility.score >= 80);
    const experienceApplication = await post<{ id: string }>(
      `/experiences/candidate/${experience.body.id}/apply`,
      { motivation: 'Quiero demostrar mis habilidades construyendo una solución real.' },
      candidateToken,
    );
    assert.equal(experienceApplication.status, 201);
    const duplicateExperienceApplication = await post(
      `/experiences/candidate/${experience.body.id}/apply`,
      {},
      candidateToken,
    );
    assert.equal(duplicateExperienceApplication.status, 409);
    const unauthorizedEvaluation = await post(
      `/experiences/company/applications/${experienceApplication.body.id}/evaluation`,
      { compliance: 5 },
      candidateToken,
    );
    assert.equal(unauthorizedEvaluation.status, 403);
    const acceptedExperience = await patch<{ status: string }>(
      `/experiences/company/applications/${experienceApplication.body.id}/status`,
      { status: 'ACCEPTED' },
      companyToken,
    );
    assert.equal(acceptedExperience.body.status, 'ACCEPTED');
    const startedExperience = await patch<{ status: string }>(
      `/experiences/company/applications/${experienceApplication.body.id}/status`,
      { status: 'IN_PROGRESS' },
      companyToken,
    );
    assert.equal(startedExperience.body.status, 'IN_PROGRESS');
    const submission = await post(
      `/experiences/candidate/applications/${experienceApplication.body.id}/submission`,
      {
        workDescription:
          'Construí el dashboard solicitado, documenté sus componentes y validé todos los indicadores.',
        projectUrl: 'https://example.test/dashboard',
        githubUrl: 'https://github.com/example/dashboard',
        additionalLinks: ['https://example.test/docs'],
        comments: 'Entrega final lista para revisión.',
      },
      candidateToken,
    );
    assert.equal(submission.status, 201);
    const evaluationBody = {
      compliance: 5,
      quality: 4,
      responsibility: 5,
      communication: 4,
      teamwork: 4,
      technicalSkills: 5,
      finalResult: 5,
      companyComment: 'Excelente trabajo, entrega completa y bien documentada.',
      recommendation: 'Recomendado para proyectos frontend.',
      verifiedSkillIds: [skill.body.id],
    };
    const evaluation = await post(
      `/experiences/company/applications/${experienceApplication.body.id}/evaluation`,
      evaluationBody,
      companyToken,
    );
    assert.equal(evaluation.status, 201);
    const completedExperience = await post<{ certificate: { code: string } }>(
      `/experiences/company/applications/${experienceApplication.body.id}/complete`,
      {},
      companyToken,
    );
    assert.equal(completedExperience.status, 201);
    assert.match(completedExperience.body.certificate.code, /^CNK-EXP-[A-F0-9]{16}$/);
    const verifiedCertificate = await request<{
      status: string;
      candidate: string;
      skills: Array<{ name: string }>;
    }>(`/verify/${completedExperience.body.certificate.code}`);
    assert.equal(verifiedCertificate.status, 200);
    assert.equal(verifiedCertificate.body.status, 'ACTIVE');
    assert.equal(verifiedCertificate.body.candidate, 'E2E Candidate');
    assert.ok(verifiedCertificate.body.skills.some((item) => item.name === `React E2E ${stamp}`));
    const completedMine = await request<{
      stats: { completed: number; certificates: number; verifiedSkills: number };
      verifiedExperiences: unknown[];
    }>('/experiences/candidate/mine', {}, candidateToken);
    assert.equal(completedMine.body.stats.completed, 1);
    assert.equal(completedMine.body.stats.certificates, 1);
    assert.equal(completedMine.body.stats.verifiedSkills, 1);
    assert.equal(completedMine.body.verifiedExperiences.length, 1);
    const skillEvidence = await request<
      Array<{ skillId: string; totalScore: number; verifiedCount: number }>
    >('/talent/candidate/evidence', {}, candidateToken);
    const reactEvidence = skillEvidence.body.find((item) => item.skillId === skill.body.id);
    assert.ok(reactEvidence && reactEvidence.totalScore >= 60 && reactEvidence.verifiedCount === 1);
    const improvementRoute = await request<{
      current: { score: number };
      targetScore: number;
      steps: unknown[];
    }>(`/talent/candidate/improvement-route/${vacancy.body.id}`, {}, candidateToken);
    assert.equal(improvementRoute.status, 200);
    assert.ok(improvementRoute.body.targetScore >= improvementRoute.body.current.score);
    const passport = await request<{
      passport: { publicCode: string };
      skillEvidence: unknown[];
      projects: Array<{ id: string }>;
    }>('/talent/candidate/passport', {}, candidateToken);
    assert.match(passport.body.passport.publicCode, /^CNK-PASS-[A-F0-9]{16}$/);
    assert.ok(passport.body.projects.some((item) => item.id === project.body.id));
    const publicPassport = await request<{ candidate: { name: string } }>(
      `/passport/${passport.body.passport.publicCode}`,
    );
    assert.equal(publicPassport.body.candidate.name, 'E2E Candidate');
    const openBadge = await request<{
      type: string[];
      credentialSubject: { achievement: { alignment: unknown[] } };
    }>(`/passport/${passport.body.passport.publicCode}/open-badge`);
    assert.ok(openBadge.body.type.includes('OpenBadgeCredential'));
    assert.ok(openBadge.body.credentialSubject.achievement.alignment.length > 0);
    const opportunityIndex = await request<{ score: number; confidence: string }>(
      '/talent/company/opportunity-index',
      {},
      companyToken,
    );
    assert.ok(opportunityIndex.body.score >= 0 && opportunityIndex.body.score <= 100);
    const adminAudit = await request<{ items: Array<{ id: string }> }>(
      `/admin/applications?vacancyId=${vacancy.body.id}`,
      {},
      adminLogin.body.accessToken,
    );
    assert.equal(adminAudit.status, 200);
    assert.equal(adminAudit.body.items[0]?.id, application.body.id);
    await prisma.user.update({ where: { email: emails[0] }, data: { active: false } });
    const inactive = await request('/auth/me', {}, candidateToken);
    assert.equal(inactive.status, 401);
    await prisma.user.update({ where: { email: emails[0] }, data: { active: true } });
  });
});

function socketConnected(socket: Socket): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket no conectado'));
    }, 10000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });
}
function socketAck(socket: Socket, event: string, payload: object): Promise<unknown> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(10000)
      .emit(event, payload, (error: Error | null, response: unknown) =>
        error ? reject(new Error(`${event}: ${error.message}`)) : resolve(response),
      ),
  );
}
function randomToken(seed: number) {
  return createHash('sha256').update(String(seed)).digest('base64url').slice(0, 43);
}

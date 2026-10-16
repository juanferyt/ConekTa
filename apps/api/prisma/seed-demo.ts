import {
  CompanySize,
  EducationStatus,
  OpportunityType,
  PrismaClient,
  SkillLevel,
  SkillType,
  UserRole,
  VacancySkillPriority,
  VacancyStatus,
  VerificationStatus,
  WorkModality,
  WorkSchedule,
} from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function hashPassword(value: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(value, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configura ${name} para ejecutar el seed demo`);
  return value;
}

async function main(): Promise<void> {
  if (process.env.DEMO_SEED_ENABLED !== 'true') {
    throw new Error('Seed demo deshabilitado. Define DEMO_SEED_ENABLED=true de forma explícita');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed demo no puede ejecutarse con NODE_ENV=production');
  }

  const adminEmail = required('DEMO_ADMIN_EMAIL').toLowerCase();
  const companyEmail = required('DEMO_COMPANY_EMAIL').toLowerCase();
  const candidateEmails = required('DEMO_CANDIDATE_EMAILS').split(',').map((email) => email.trim().toLowerCase());
  const password = required('DEMO_PASSWORD');
  if (candidateEmails.length !== 3 || candidateEmails.some((email) => !email)) {
    throw new Error('DEMO_CANDIDATE_EMAILS debe contener exactamente tres correos separados por coma');
  }
  if (password.length < 12 || password.length > 72) {
    throw new Error('DEMO_PASSWORD debe tener entre 12 y 72 caracteres');
  }
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: UserRole.ADMIN, active: true, emailVerified: true },
    create: { email: adminEmail, passwordHash, role: UserRole.ADMIN, active: true, emailVerified: true },
  });
  const companyUser = await prisma.user.upsert({
    where: { email: companyEmail },
    update: { passwordHash, role: UserRole.COMPANY, active: true, emailVerified: true },
    create: { email: companyEmail, passwordHash, role: UserRole.COMPANY, active: true, emailVerified: true },
  });
  const company = await prisma.companyProfile.upsert({
    where: { userId: companyUser.id },
    update: {
      name: 'Nodo Digital SAS', sector: 'Tecnología', description: 'Empresa demostrativa que crea oportunidades de entrada para talento joven.',
      size: CompanySize.SMALL, country: 'Colombia', city: 'Bogotá', contactEmail: companyEmail,
      verificationStatus: VerificationStatus.VERIFIED,
    },
    create: {
      userId: companyUser.id, name: 'Nodo Digital SAS', sector: 'Tecnología', description: 'Empresa demostrativa que crea oportunidades de entrada para talento joven.',
      size: CompanySize.SMALL, country: 'Colombia', city: 'Bogotá', contactEmail: companyEmail,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });

  const skillDefinitions = [
    ['React', 'Frontend', SkillType.TECHNICAL], ['TypeScript', 'Frontend', SkillType.TECHNICAL],
    ['Git', 'Herramientas', SkillType.TECHNICAL], ['SQL', 'Datos', SkillType.TECHNICAL],
    ['Docker', 'DevOps', SkillType.TECHNICAL], ['Trabajo en equipo', 'Interpersonales', SkillType.SOFT],
    ['Comunicación', 'Interpersonales', SkillType.SOFT],
  ] as const;
  const skills = new Map<string, string>();
  for (const [name, category, type] of skillDefinitions) {
    const skill = await prisma.skill.upsert({
      where: { slug: name.toLowerCase().replaceAll(' ', '-') },
      update: { name, category, type, active: true },
      create: { name, slug: name.toLowerCase().replaceAll(' ', '-'), category, type, active: true },
    });
    skills.set(name, skill.id);
  }

  const candidateData = [
    { firstName: 'Laura', lastName: 'Martínez', program: 'Ingeniería de Sistemas', city: 'Bogotá', skillNames: ['React', 'TypeScript', 'Git', 'Trabajo en equipo'] },
    { firstName: 'Mateo', lastName: 'Rojas', program: 'Tecnología en Desarrollo de Software', city: 'Medellín', skillNames: ['SQL', 'Git', 'Docker', 'Comunicación'] },
    { firstName: 'Sofía', lastName: 'Gómez', program: 'Ingeniería de Software', city: 'Cali', skillNames: ['React', 'SQL', 'Comunicación', 'Trabajo en equipo'] },
  ];
  for (const [index, data] of candidateData.entries()) {
    const user = await prisma.user.upsert({
      where: { email: candidateEmails[index] },
      update: { passwordHash, role: UserRole.CANDIDATE, active: true, emailVerified: true },
      create: { email: candidateEmails[index], passwordHash, role: UserRole.CANDIDATE, active: true, emailVerified: true },
    });
    const candidate = await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: { firstName: data.firstName, lastName: data.lastName, headline: `Estudiante de ${data.program}`, city: data.city, region: 'Demo', country: 'Colombia', availableNow: true, workSchedule: WorkSchedule.FULL_TIME, modalities: [WorkModality.REMOTO, WorkModality.HIBRIDO], professionalInterests: ['Desarrollo de software'] },
      create: { userId: user.id, firstName: data.firstName, lastName: data.lastName, headline: `Estudiante de ${data.program}`, city: data.city, region: 'Demo', country: 'Colombia', availableNow: true, workSchedule: WorkSchedule.FULL_TIME, modalities: [WorkModality.REMOTO, WorkModality.HIBRIDO], professionalInterests: ['Desarrollo de software'] },
    });
    await prisma.education.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.project.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.candidateSkill.deleteMany({ where: { candidateId: candidate.id } });
    await prisma.education.create({ data: { candidateId: candidate.id, institution: 'Universidad ConekTa Demo', program: data.program, academicLevel: 'Pregrado', semester: 9, status: EducationStatus.ESTUDIANDO, expectedGraduationDate: new Date('2027-06-30') } });
    await prisma.project.create({ data: { candidateId: candidate.id, title: `Proyecto universitario de ${data.firstName}`, description: 'Aplicación académica construida para resolver una necesidad real y demostrar competencias técnicas.', role: 'Desarrollador full-stack', technologies: data.skillNames.filter((name) => skills.has(name)), projectDate: new Date('2026-05-15'), projectType: 'Universitario', universityProject: true } });
    await prisma.candidateSkill.createMany({ data: data.skillNames.map((name) => ({ candidateId: candidate.id, skillId: skills.get(name)!, level: SkillLevel.INTERMEDIATE })) });
  }

  await prisma.vacancy.deleteMany({ where: { companyId: company.id } });
  const vacancies = [
    { title: 'Desarrollador Frontend Junior', city: 'Bogotá', modality: WorkModality.HIBRIDO, type: OpportunityType.FIRST_JOB, careers: ['Ingeniería de Sistemas', 'Ingeniería de Software'], required: ['React', 'TypeScript', 'Git'], desired: ['Trabajo en equipo'] },
    { title: 'Practicante de Datos', city: 'Medellín', modality: WorkModality.REMOTO, type: OpportunityType.INTERNSHIP, careers: ['Ingeniería de Sistemas', 'Tecnología en Desarrollo de Software'], required: ['SQL', 'Git'], desired: ['Docker', 'Comunicación'] },
    { title: 'Trainee Full-stack', city: 'Cali', modality: WorkModality.REMOTO, type: OpportunityType.TRAINEE, careers: ['Ingeniería de Software', 'Ingeniería de Sistemas'], required: ['React', 'SQL', 'Git'], desired: ['Docker', 'Trabajo en equipo'] },
  ];
  for (const item of vacancies) {
    await prisma.vacancy.create({ data: {
      companyId: company.id, title: item.title, description: 'Oportunidad junior demostrativa enfocada en conocimientos, proyectos académicos y potencial de aprendizaje.',
      responsibilities: ['Participar en el desarrollo del producto', 'Aprender con acompañamiento del equipo'], requirements: ['Fundamentos técnicos y disposición para aprender'], city: item.city,
      modality: item.modality, opportunityType: item.type, contractType: 'Contrato laboral', currency: 'COP', showSalary: false,
      relatedCareers: item.careers, maxExperienceMonths: 0, experienceRequired: false, status: VacancyStatus.PUBLISHED, publishedAt: new Date(),
      skills: { create: [
        ...item.required.map((name) => ({ skillId: skills.get(name)!, priority: VacancySkillPriority.REQUIRED, required: true, weight: 5 })),
        ...item.desired.map((name) => ({ skillId: skills.get(name)!, priority: VacancySkillPriority.DESIRED, required: false, weight: 2 })),
      ] },
    } });
  }

  process.stdout.write(`Demo preparado para ${adminEmail}, ${companyEmail} y ${candidateEmails.join(', ')}\n`);
}

main()
  .catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Error al ejecutar el seed demo'}\n`); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());

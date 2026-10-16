import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VacancyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CandidateSkillDto, CertificationDto, EducationDto, ProjectDto, UpdateCandidateProfileDto, UpdateCandidateSkillDto } from './dto/candidate.dto';
import { MatchingService } from '../matching/matching.service';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService, private readonly matching: MatchingService) {}

  async dashboard(userId: string) {
    const profile = await this.profile(userId);
    const completion = this.completion(profile);
    const [applications, recommendations] = await Promise.all([
      this.prisma.application.findMany({ where: { candidateId: profile.id }, select: { status: true } }),
      this.matching.recommendations(userId),
    ]);
    const compatible = recommendations.filter((item) => item.compatibility.score >= 60);
    const missing = new Map<string, number>();
    for (const item of compatible) for (const skill of item.compatibility.missingSkills) missing.set(skill, (missing.get(skill) ?? 0) + 1);
    return {
      profile, completion,
      applicationSummary: {
        applications: applications.length,
        activeProcesses: applications.filter(({ status }) => ['APPLIED', 'UNDER_REVIEW', 'INTERVIEW'].includes(status)).length,
        underReview: applications.filter(({ status }) => status === 'UNDER_REVIEW').length,
        interviews: applications.filter(({ status }) => status === 'INTERVIEW').length,
      },
      compatibleVacancies: compatible.length,
      topOpportunities: recommendations.slice(0, 5),
      skillsToStrengthen: [...missing.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([name, vacancies]) => ({ name, vacancies })),
    };
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    const profile = await this.profile(userId);
    return this.prisma.candidateProfile.update({ where: { id: profile.id }, data: dto });
  }

  async addEducation(userId: string, dto: EducationDto) { const profile = await this.profile(userId); return this.prisma.education.create({ data: { ...dto, candidateId: profile.id } }); }
  async updateEducation(userId: string, id: string, dto: EducationDto) { await this.owned('education', userId, id); return this.prisma.education.update({ where: { id }, data: dto }); }
  async deleteEducation(userId: string, id: string) { await this.owned('education', userId, id); return this.prisma.education.delete({ where: { id } }); }

  async addSkill(userId: string, dto: CandidateSkillDto) {
    const profile = await this.profile(userId);
    try { return await this.prisma.candidateSkill.create({ data: { candidateId: profile.id, ...dto }, include: { skill: true } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('La habilidad ya está agregada'); throw error; }
  }
  async updateSkill(userId: string, skillId: string, dto: UpdateCandidateSkillDto) { const profile = await this.profile(userId); await this.ensureCandidateSkill(profile.id, skillId); return this.prisma.candidateSkill.update({ where: { candidateId_skillId: { candidateId: profile.id, skillId } }, data: dto, include: { skill: true } }); }
  async deleteSkill(userId: string, skillId: string) { const profile = await this.profile(userId); await this.ensureCandidateSkill(profile.id, skillId); return this.prisma.candidateSkill.delete({ where: { candidateId_skillId: { candidateId: profile.id, skillId } } }); }

  async addProject(userId: string, dto: ProjectDto) { const profile = await this.profile(userId); return this.prisma.project.create({ data: { ...dto, candidateId: profile.id } }); }
  async updateProject(userId: string, id: string, dto: ProjectDto) { await this.owned('project', userId, id); return this.prisma.project.update({ where: { id }, data: dto }); }
  async deleteProject(userId: string, id: string) { await this.owned('project', userId, id); return this.prisma.project.delete({ where: { id } }); }

  async addCertification(userId: string, dto: CertificationDto) { const profile = await this.profile(userId); return this.prisma.certification.create({ data: { ...dto, candidateId: profile.id } }); }
  async updateCertification(userId: string, id: string, dto: CertificationDto) { await this.owned('certification', userId, id); return this.prisma.certification.update({ where: { id }, data: dto }); }
  async deleteCertification(userId: string, id: string) { await this.owned('certification', userId, id); return this.prisma.certification.delete({ where: { id } }); }

  async opportunities() { return this.prisma.vacancy.findMany({ where: { status: VacancyStatus.PUBLISHED, adminHidden: false }, include: { company: { select: { name: true, city: true } }, skills: { include: { skill: true } } }, orderBy: { publishedAt: 'desc' } }); }

  private async profile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { userId }, include: { educations: { orderBy: { createdAt: 'desc' } }, skills: { include: { skill: true }, orderBy: { skill: { name: 'asc' } } }, projects: { orderBy: { projectDate: 'desc' } }, certifications: { orderBy: { issuedAt: 'desc' } } } });
    if (!profile) throw new NotFoundException('Perfil de candidato no encontrado');
    return profile;
  }

  private async owned(resource: 'education' | 'project' | 'certification', userId: string, id: string) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    const record = resource === 'education' ? await this.prisma.education.findFirst({ where: { id, candidateId: profile.id } }) : resource === 'project' ? await this.prisma.project.findFirst({ where: { id, candidateId: profile.id } }) : await this.prisma.certification.findFirst({ where: { id, candidateId: profile.id } });
    if (!record) throw new NotFoundException('Registro no encontrado');
  }

  private async ensureCandidateSkill(candidateId: string, skillId: string) { if (!await this.prisma.candidateSkill.findUnique({ where: { candidateId_skillId: { candidateId, skillId } } })) throw new NotFoundException('Habilidad no encontrada en tu perfil'); }

  private completion(profile: Awaited<ReturnType<CandidateService['profile']>>) {
    const personalFields = ['firstName', 'lastName', 'headline', 'bio', 'city', 'region', 'country', 'linkedinUrl'] as const;
    const personal = personalFields.filter((key) => Boolean(profile[key])).length / personalFields.length;
    const availability = [profile.workSchedule, profile.modalities.length > 0, profile.professionalInterests.length > 0].filter(Boolean).length / 3;
    const percentage = Math.round(personal * 50 + (profile.educations.length ? 15 : 0) + Math.min(profile.skills.length / 3, 1) * 15 + (profile.projects.length ? 10 : 0) + (profile.certifications.length ? 5 : 0) + availability * 5);
    return { percentage, sections: { personal: Math.round(personal * 100), education: profile.educations.length > 0, skills: profile.skills.length, projects: profile.projects.length, certifications: profile.certifications.length, availability: Math.round(availability * 100) } };
  }
}

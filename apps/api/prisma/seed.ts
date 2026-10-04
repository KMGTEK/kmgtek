/**
 * Idempotent database seed. Safe to run repeatedly: every write is an upsert or a
 * guarded insert, so re-running never duplicates rows or overwrites admin edits.
 *
 *   pnpm --filter @kmg/api prisma:seed
 *   SEED_DEMO_DATA=true pnpm --filter @kmg/api prisma:seed
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

loadEnv({ path: join(__dirname, '..', '.env'), quiet: true });
loadEnv({ path: join(__dirname, '..', '..', '..', '.env'), quiet: true });

import { PrismaClient, type Prisma } from '@prisma/client';
import {
  COMPANY,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  SERVICES,
  TECHNOLOGY_CATEGORIES,
  slugify,
  type RoleName,
} from '@kmg/shared';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, isAbsolute, resolve } from 'node:path';
import { hashPassword } from '../src/common/utils/password.util';
import { defaultSettings } from '../src/modules/settings/settings.defaults';
import {
  CASE_STUDIES,
  EMAIL_TEMPLATES,
  JOBS,
  JOB_CATEGORIES,
  LEADS,
  TEAM_MEMBERS,
  TESTIMONIALS,
} from './seed-data';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@12345';
const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000);
const log = (message: string): void => console.log(`  ${message}`);

/* ────────────────────────────── RBAC ────────────────────────────── */

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Full access to every part of the platform.',
  HR: 'Manages hiring, users and the full recruitment lifecycle.',
  RECRUITER: 'Manages jobs, applications and interviews.',
  HIRING_MANAGER: 'Reviews candidates and gives interview feedback.',
  CONTENT_EDITOR: 'Manages website content, blog posts and case studies.',
  SALES: 'Manages inbound leads and the sales pipeline.',
  CANDIDATE: 'Job seeker with access to the candidate portal.',
};

async function seedRbac(): Promise<void> {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: `Allows ${key.replace(':', ' ')}` },
      update: {},
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const [name, granted] of Object.entries(ROLE_PERMISSIONS) as [RoleName, string[]][]) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name, description: ROLE_DESCRIPTIONS[name], isSystem: true },
      update: { description: ROLE_DESCRIPTIONS[name] },
    });
    await prisma.rolePermission.createMany({
      data: granted
        .map((key) => permissionByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  log(`roles: ${Object.keys(ROLE_PERMISSIONS).length}, permissions: ${PERMISSIONS.length}`);
}

/* ───────────────────────────── Users ───────────────────────────── */

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  roles: RoleName[];
  candidate?: boolean;
}): Promise<string> {
  const email = input.email.toLowerCase();
  const roles = await prisma.role.findMany({ where: { name: { in: input.roles } } });

  const existing = await prisma.user.findUnique({ where: { email } });
  const user = existing
    ? existing
    : await prisma.user.create({
        data: {
          email,
          name: input.name,
          passwordHash: await hashPassword(input.password),
          passwordChangedAt: new Date(),
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

  await prisma.userRole.createMany({
    data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
    skipDuplicates: true,
  });

  if (input.candidate) {
    await prisma.candidate.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  }
  return user.id;
}

async function seedSuperAdmin(): Promise<string> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@kmgtek.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const id = await upsertUser({
    email,
    name: 'KMG Administrator',
    password,
    roles: [ROLES.SUPER_ADMIN],
  });
  log(`super admin: ${email}`);
  return id;
}

/* ─────────────────────── Settings & templates ─────────────────────── */

async function seedSettings(): Promise<void> {
  const defaults = defaultSettings({
    mailFromName: process.env.MAIL_FROM_NAME,
    mailFromAddress: process.env.MAIL_FROM_ADDRESS,
    notifyAddresses: process.env.MAIL_NOTIFY_ADDRESSES?.split(',').map((v) => v.trim()).filter(Boolean),
  });

  for (const [group, value] of Object.entries(defaults)) {
    await prisma.websiteSetting.upsert({
      where: { group },
      create: { group, value: value as Prisma.InputJsonValue, isPublic: group !== 'email' },
      update: {}, // never clobber admin edits
    });
  }
  log(`settings groups: ${Object.keys(defaults).length}`);
}

/** Seeds every editable marketing-copy block with its shipped default — never overwrites an admin edit on rerun. */
async function seedEmailTemplates(): Promise<void> {
  for (const template of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: template.key },
      create: {
        key: template.key,
        name: template.name,
        subject: template.subject,
        html: template.html,
        variables: template.variables,
      },
      // Subject/html are admin-editable; only refresh metadata.
      update: { name: template.name, variables: template.variables },
    });
  }
  log(`email templates: ${EMAIL_TEMPLATES.length}`);
}

/* ─────────────────────── Technologies & services ─────────────────────── */

async function seedTechnologies(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();

  // Remove technologies/categories that were dropped from the content source (e.g. a
  // repositioning of the practice) — upserts below only create/update, they never delete.
  const keepTechSlugs = TECHNOLOGY_CATEGORIES.flatMap((c) => c.technologies.map((t) => t.slug));
  const keepCategorySlugs = TECHNOLOGY_CATEGORIES.map((c) => c.slug);
  await prisma.technology.deleteMany({ where: { slug: { notIn: keepTechSlugs } } });
  await prisma.technologyCategory.deleteMany({ where: { slug: { notIn: keepCategorySlugs } } });

  for (const [index, category] of TECHNOLOGY_CATEGORIES.entries()) {
    const categoryRow = await prisma.technologyCategory.upsert({
      where: { slug: category.slug },
      create: { name: category.name, slug: category.slug, order: index },
      update: { name: category.name, order: index },
    });

    for (const [techIndex, technology] of category.technologies.entries()) {
      const row = await prisma.technology.upsert({
        where: { slug: technology.slug },
        create: {
          name: technology.name,
          slug: technology.slug,
          description: technology.description,
          websiteUrl: technology.websiteUrl,
          icon: technology.icon,
          // `logoUrl` (not `icon`) is what the API/admin UI actually reads and lets admins
          // override — seed it here so a fresh install shows real logos out of the box, but
          // never touch it on `update` below, or a reseed would clobber an admin's edit.
          logoUrl: technology.icon,
          categoryId: categoryRow.id,
          order: techIndex,
        },
        update: {
          name: technology.name,
          description: technology.description,
          websiteUrl: technology.websiteUrl,
          icon: technology.icon,
          categoryId: categoryRow.id,
          order: techIndex,
        },
      });
      bySlug.set(technology.slug, row.id);
    }
  }
  log(`technology categories: ${TECHNOLOGY_CATEGORIES.length}, technologies: ${bySlug.size}`);
  return bySlug;
}

async function seedServices(technologyIds: Map<string, string>): Promise<void> {
  // Same as seedTechnologies: drop services no longer in the content source.
  await prisma.service.deleteMany({ where: { slug: { notIn: SERVICES.map((s) => s.slug) } } });

  for (const [index, service] of SERVICES.entries()) {
    const row = await prisma.service.upsert({
      where: { slug: service.slug },
      create: {
        slug: service.slug,
        title: service.title,
        shortDescription: service.shortDescription,
        overview: service.overview,
        icon: service.icon,
        benefits: service.benefits as unknown as Prisma.InputJsonValue,
        process: service.process as unknown as Prisma.InputJsonValue,
        faqs: service.faqs as unknown as Prisma.InputJsonValue,
        order: index,
        published: true,
        seoTitle: `${service.title} | ${COMPANY.displayName}`,
        seoDescription: service.shortDescription.slice(0, 170),
      },
      update: {
        title: service.title,
        shortDescription: service.shortDescription,
        overview: service.overview,
        icon: service.icon,
        benefits: service.benefits as unknown as Prisma.InputJsonValue,
        process: service.process as unknown as Prisma.InputJsonValue,
        faqs: service.faqs as unknown as Prisma.InputJsonValue,
        order: index,
      },
    });

    await prisma.serviceTechnology.createMany({
      data: service.technologies
        .map((slug) => technologyIds.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((technologyId) => ({ serviceId: row.id, technologyId })),
      skipDuplicates: true,
    });
  }
  log(`services: ${SERVICES.length}`);
}

/* ───────────────────────────── Demo data ───────────────────────────── */

interface DemoStaff {
  adminId: string;
  hrId: string;
  recruiterId: string;
  managerId: string;
  editorId: string;
  salesId: string;
  candidateUserId: string;
  candidateId: string;
}

async function seedDemoUsers(adminId: string): Promise<DemoStaff> {
  const [hrId, recruiterId, managerId, editorId, salesId] = await Promise.all([
    upsertUser({ email: 'hr@kmgtek.com', name: 'Priya Desai', password: DEMO_PASSWORD, roles: [ROLES.HR] }),
    upsertUser({ email: 'recruiter@kmgtek.com', name: 'Marcus Lee', password: DEMO_PASSWORD, roles: [ROLES.RECRUITER] }),
    upsertUser({ email: 'manager@kmgtek.com', name: 'Daniel Okafor', password: DEMO_PASSWORD, roles: [ROLES.HIRING_MANAGER] }),
    upsertUser({ email: 'editor@kmgtek.com', name: 'Sanjana Iyer', password: DEMO_PASSWORD, roles: [ROLES.CONTENT_EDITOR] }),
    upsertUser({ email: 'sales@kmgtek.com', name: 'Alex Whitfield', password: DEMO_PASSWORD, roles: [ROLES.SALES] }),
  ]);

  const candidateUserId = await upsertUser({
    email: 'candidate@example.com',
    name: 'Arjun Patel',
    password: DEMO_PASSWORD,
    roles: [ROLES.CANDIDATE],
    candidate: true,
  });

  const candidate = await prisma.candidate.update({
    where: { userId: candidateUserId },
    data: {
      phone: '(732) 555-0148',
      location: 'Jersey City, NJ',
      headline: 'Senior DevOps Engineer · Kubernetes · AWS · Terraform',
      summary:
        'Seven years building and running container platforms for regulated industries. I enjoy removing toil, mentoring engineers and making releases boring.',
      currentCompany: 'Vertex Health Systems',
      experienceYears: 7,
      currentCtc: '$138,000',
      expectedCtc: '$160,000',
      noticePeriod: '4 weeks',
      linkedinUrl: 'https://www.linkedin.com/in/arjun-patel-demo',
      githubUrl: 'https://github.com/arjun-patel-demo',
    },
  });

  const skills = [
    { name: 'Kubernetes', level: 'EXPERT' as const, years: 5 },
    { name: 'Terraform', level: 'ADVANCED' as const, years: 5 },
    { name: 'AWS', level: 'ADVANCED' as const, years: 6 },
    { name: 'Python', level: 'INTERMEDIATE' as const, years: 4 },
    { name: 'Prometheus', level: 'ADVANCED' as const, years: 4 },
    { name: 'ArgoCD', level: 'INTERMEDIATE' as const, years: 3 },
  ];
  for (const skill of skills) {
    await prisma.candidateSkill.upsert({
      where: { candidateId_name: { candidateId: candidate.id, name: skill.name } },
      create: { candidateId: candidate.id, ...skill },
      update: { level: skill.level, years: skill.years },
    });
  }

  log('demo users: 5 staff + 1 candidate');
  return {
    adminId,
    hrId,
    recruiterId,
    managerId,
    editorId,
    salesId,
    candidateUserId,
    candidateId: candidate.id,
  };
}

/** Writes a small real PDF to local storage so the demo resume actually downloads. */
async function seedDemoResume(staff: DemoStaff): Promise<string | null> {
  const existing = await prisma.resume.findFirst({ where: { candidateId: staff.candidateId } });
  if (existing) return existing.fileId;

  const pdf = Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 92>>stream\nBT /F1 18 Tf 72 700 Td (Arjun Patel - Senior DevOps Engineer) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`,
    'utf8',
  );

  const dir = process.env.STORAGE_LOCAL_DIR ?? './uploads';
  const root = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  const now = new Date();
  const key = `resumes/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomBytes(16).toString('hex')}.pdf`;
  const target = resolve(root, 'private', key);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, pdf);

  const file = await prisma.fileObject.create({
    data: {
      key,
      bucket: 'local-private',
      originalName: 'arjun-patel-devops-resume.pdf',
      mimeType: 'application/pdf',
      size: pdf.byteLength,
      checksum: createHash('sha256').update(pdf).digest('hex'),
      purpose: 'RESUME',
      visibility: 'PRIVATE',
      uploadedById: staff.candidateUserId,
    },
  });
  await prisma.resume.create({
    data: { candidateId: staff.candidateId, fileId: file.id, isPrimary: true },
  });
  log('demo resume: 1 file');
  return file.id;
}

async function seedJobs(staff: DemoStaff): Promise<Map<string, string>> {
  const categoryIds = new Map<string, string>();
  for (const name of JOB_CATEGORIES) {
    const row = await prisma.jobCategory.upsert({
      where: { name },
      create: { name, slug: slugify(name) },
      update: {},
    });
    categoryIds.set(name, row.id);
  }

  const jobIds = new Map<string, string>();
  for (const [index, job] of JOBS.entries()) {
    const data = {
      title: job.title,
      summary: job.summary,
      description: job.description,
      skills: job.skills,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      preferredSkills: job.preferredSkills,
      benefits: job.benefits,
      hiringProcess: job.hiringProcess as unknown as Prisma.InputJsonValue,
      screeningQuestions: job.screeningQuestions as unknown as Prisma.InputJsonValue,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax ?? null,
      employmentType: job.employmentType,
      workMode: job.workMode,
      location: job.location,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      salaryCurrency: 'USD',
      salaryPeriod: job.salaryPeriod ?? ('YEAR' as const),
      showSalary: job.showSalary ?? false,
      openings: job.openings ?? 1,
      status: 'PUBLISHED' as const,
      publishedAt: daysAgo(60 - index * 5),
      closingDate: daysAgo(-45),
      departmentId: categoryIds.get(job.department) ?? null,
      hiringManagerId: staff.managerId,
      createdById: staff.hrId,
      seoTitle: `${job.title} — ${job.location} | ${COMPANY.displayName}`,
      seoDescription: job.summary.slice(0, 170),
      views: 120 + index * 37,
    };

    const row = await prisma.job.upsert({
      where: { slug: job.slug },
      create: { slug: job.slug, ...data },
      update: data,
    });
    jobIds.set(job.slug, row.id);
  }
  log(`job categories: ${JOB_CATEGORIES.length}, jobs: ${JOBS.length}`);
  return jobIds;
}

async function seedTeamAndTestimonials(): Promise<void> {
  for (const member of TEAM_MEMBERS) {
    const existing = await prisma.teamMember.findFirst({ where: { name: member.name } });
    const data = {
      name: member.name,
      title: member.title,
      bio: member.bio,
      linkedinUrl: member.linkedinUrl ?? null,
      isLeadership: member.isLeadership,
      published: true,
      order: member.order,
    };
    if (existing) await prisma.teamMember.update({ where: { id: existing.id }, data });
    else await prisma.teamMember.create({ data });
  }

  for (const testimonial of TESTIMONIALS) {
    const existing = await prisma.testimonial.findFirst({
      where: { authorName: testimonial.authorName, company: testimonial.company },
    });
    const data = {
      authorName: testimonial.authorName,
      authorTitle: testimonial.authorTitle,
      company: testimonial.company,
      quote: testimonial.quote,
      rating: testimonial.rating,
      featured: testimonial.featured,
      published: true,
      order: testimonial.order,
    };
    if (existing) await prisma.testimonial.update({ where: { id: existing.id }, data });
    else await prisma.testimonial.create({ data });
  }
  log(`team members: ${TEAM_MEMBERS.length}, testimonials: ${TESTIMONIALS.length}`);
}

async function seedCaseStudies(technologyIds: Map<string, string>): Promise<void> {
  for (const study of CASE_STUDIES) {
    const data = {
      title: study.title,
      clientName: study.clientName,
      industry: study.industry,
      summary: study.summary,
      challenge: study.challenge,
      solution: study.solution,
      architecture: study.architecture,
      results: study.results,
      metrics: study.metrics as unknown as Prisma.InputJsonValue,
      featured: study.featured,
      published: true,
      publishedAt: daysAgo(study.publishedDaysAgo),
      seoTitle: `${study.title} | ${COMPANY.displayName}`,
      seoDescription: study.summary.slice(0, 170),
    };
    const row = await prisma.caseStudy.upsert({
      where: { slug: study.slug },
      create: { slug: study.slug, ...data },
      update: data,
    });

    await prisma.caseStudyTechnology.createMany({
      data: study.technologies
        .map((slug) => technologyIds.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((technologyId) => ({ caseStudyId: row.id, technologyId })),
      skipDuplicates: true,
    });
  }
  log(`case studies: ${CASE_STUDIES.length}`);
}

async function seedLeads(staff: DemoStaff): Promise<void> {
  const services = await prisma.service.findMany({ select: { id: true, slug: true } });
  const serviceIds = new Map(services.map((service) => [service.slug, service.id]));

  for (const lead of LEADS) {
    const existing = await prisma.contactLead.findFirst({ where: { email: lead.email } });
    if (existing) continue;
    const assigned = ['CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON'].includes(lead.status);
    const row = await prisma.contactLead.create({
      data: {
        name: lead.name,
        email: lead.email,
        company: lead.company,
        phone: lead.phone ?? null,
        country: lead.country,
        serviceId: lead.serviceSlug ? (serviceIds.get(lead.serviceSlug) ?? null) : null,
        serviceInterest: lead.serviceInterest ?? null,
        message: lead.message,
        status: lead.status,
        source: lead.source,
        assignedToId: assigned ? staff.salesId : null,
        readAt: lead.status === 'NEW' ? null : daysAgo(lead.daysAgo - 1),
        createdAt: daysAgo(lead.daysAgo),
      },
    });
    if (assigned) {
      await prisma.leadNote.create({
        data: {
          leadId: row.id,
          authorId: staff.salesId,
          content:
            lead.status === 'WON'
              ? 'Statement of work signed. Handing over to delivery for kickoff scheduling.'
              : 'Intro call completed. Scoping requirements and preparing an estimate.',
        },
      });
    }
  }
  log(`leads: ${LEADS.length}`);
}

async function seedApplications(staff: DemoStaff, jobIds: Map<string, string>, resumeFileId: string | null): Promise<void> {
  const plan = [
    { slug: 'senior-kubernetes-engineer', status: 'TECHNICAL_ROUND' as const, rating: 4, daysAgo: 12 },
    { slug: 'site-reliability-engineer', status: 'UNDER_REVIEW' as const, rating: null, daysAgo: 6 },
    { slug: 'platform-engineer', status: 'OFFER' as const, rating: 5, daysAgo: 30 },
    { slug: 'devops-engineer', status: 'REJECTED' as const, rating: 2, daysAgo: 55 },
  ];

  const pipeline: Record<string, string[]> = {
    TECHNICAL_ROUND: ['APPLIED', 'UNDER_REVIEW', 'TECHNICAL_ROUND'],
    UNDER_REVIEW: ['APPLIED', 'UNDER_REVIEW'],
    OFFER: ['APPLIED', 'UNDER_REVIEW', 'TECHNICAL_ROUND', 'HR_ROUND', 'OFFER'],
    REJECTED: ['APPLIED', 'UNDER_REVIEW', 'REJECTED'],
  };

  for (const entry of plan) {
    const jobId = jobIds.get(entry.slug);
    if (!jobId) continue;

    const existing = await prisma.jobApplication.findUnique({
      where: { jobId_candidateId: { jobId, candidateId: staff.candidateId } },
    });
    if (existing) continue;

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        candidateId: staff.candidateId,
        status: entry.status,
        rating: entry.rating,
        source: 'website',
        fullName: 'Arjun Patel',
        email: 'candidate@example.com',
        phone: '(732) 555-0148',
        currentLocation: 'Jersey City, NJ',
        currentCompany: 'Vertex Health Systems',
        experienceYears: 7,
        currentCtc: '$138,000',
        expectedCtc: '$160,000',
        noticePeriod: '4 weeks',
        linkedinUrl: 'https://www.linkedin.com/in/arjun-patel-demo',
        githubUrl: 'https://github.com/arjun-patel-demo',
        answers: [
          { questionId: 'work-auth', question: 'Are you authorized to work in the United States without sponsorship?', answer: 'Yes' },
          { questionId: 'notice', question: 'What is your notice period (in weeks)?', answer: '4' },
        ] as unknown as Prisma.InputJsonValue,
        consentAt: daysAgo(entry.daysAgo),
        resumeFileId,
        createdAt: daysAgo(entry.daysAgo),
      },
    });

    const stages = pipeline[entry.status];
    for (const [index, stage] of stages.entries()) {
      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: index === 0 ? null : (stages[index - 1] as never),
          toStatus: stage as never,
          note: index === 0 ? 'Application submitted through the website.' : null,
          changedById: index === 0 ? null : staff.recruiterId,
          createdAt: daysAgo(entry.daysAgo - index * 2),
        },
      });
    }

    await prisma.applicationNote.create({
      data: {
        applicationId: application.id,
        authorId: staff.recruiterId,
        content:
          entry.status === 'REJECTED'
            ? 'Strong operationally but limited exposure to the IaC tooling this team uses daily. Keeping on file for platform roles.'
            : 'Good depth on Kubernetes networking and upgrade strategy. Communicates trade-offs clearly.',
        createdAt: daysAgo(Math.max(1, entry.daysAgo - 3)),
      },
    });

    // One scheduled interview with feedback, on the technical-round application.
    if (entry.status === 'TECHNICAL_ROUND') {
      const interview = await prisma.interview.create({
        data: {
          applicationId: application.id,
          title: 'Technical deep dive — Kubernetes platform',
          round: 'TECHNICAL',
          status: 'COMPLETED',
          scheduledAt: daysAgo(4),
          durationMinutes: 60,
          timezone: 'America/New_York',
          meetingUrl: 'https://meet.jit.si/kmg-demo-technical-round',
          notes: 'Focus on multi-tenancy, upgrade strategy and incident response.',
          createdById: staff.recruiterId,
          interviewers: { create: [{ userId: staff.recruiterId }, { userId: staff.managerId }] },
        },
      });
      await prisma.interviewFeedback.create({
        data: {
          interviewId: interview.id,
          interviewerId: staff.managerId,
          rating: 4,
          decision: 'HIRE',
          strengths:
            'Excellent grasp of cluster upgrade strategy and blast-radius thinking. Walked through a real incident with clear reasoning and no blame.',
          weaknesses: 'Limited hands-on service mesh experience; would need ramp-up time on Istio.',
          comments:
            'Strong hire for the platform team. Recommend proceeding to the final round with a focus on cross-team collaboration.',
        },
      });
    }
  }
  log(`applications: ${plan.length} (with history, notes and 1 interview)`);
}

async function seedNotifications(staff: DemoStaff): Promise<void> {
  const existing = await prisma.notification.count();
  if (existing > 0) return;

  await prisma.notification.createMany({
    data: [
      {
        userId: staff.recruiterId,
        type: 'APPLICATION_RECEIVED',
        title: 'New application: Senior Kubernetes Engineer',
        body: 'Arjun Patel applied with 7 years of experience.',
        link: '/admin/applications',
        createdAt: daysAgo(12),
      },
      {
        userId: staff.salesId,
        type: 'NEW_LEAD',
        title: 'New enquiry from Atlas Manufacturing',
        body: 'Jonathan Pierce is asking about a data-centre exit to AWS.',
        link: '/admin/leads',
        createdAt: daysAgo(2),
      },
      {
        userId: staff.candidateUserId,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Your technical interview is scheduled',
        body: 'Technical deep dive — Kubernetes platform.',
        link: '/portal/applications',
        readAt: null,
        createdAt: daysAgo(6),
      },
    ],
  });
  log('notifications: 3');
}

async function seedPageViews(): Promise<void> {
  const existing = await prisma.pageView.count();
  if (existing > 0) {
    log(`page views: ${existing} already present, skipping`);
    return;
  }

  const paths = [
    '/', '/', '/', '/services', '/services/devops-consulting', '/services/cloud-migration',
    '/services/kubernetes-consulting', '/careers', '/careers', '/careers/devops-engineer',
    '/careers/senior-kubernetes-engineer', '/careers/site-reliability-engineer', '/about',
    '/contact', '/case-studies', '/case-studies/healthcare-kubernetes-platform',
    '/technologies',
  ];
  const referrers = [
    null, null, null, 'https://www.google.com/', 'https://www.google.com/', 'https://www.linkedin.com/',
    'https://news.ycombinator.com/', 'https://www.bing.com/', 'https://x.com/',
  ];
  const devices: Array<[string, string, string]> = [
    ['desktop', 'Chrome', 'macOS'], ['desktop', 'Chrome', 'Windows'], ['desktop', 'Safari', 'macOS'],
    ['desktop', 'Firefox', 'Linux'], ['mobile', 'Safari', 'iOS'], ['mobile', 'Chrome', 'Android'],
    ['tablet', 'Safari', 'iPadOS'],
  ];
  const countries = ['United States', 'United States', 'United States', 'India', 'Canada', 'United Kingdom'];
  const campaigns: Array<[string | null, string | null, string | null]> = [
    [null, null, null], [null, null, null], [null, null, null],
    ['linkedin', 'social', 'devops-hiring-q1'],
    ['google', 'cpc', 'cloud-migration'],
    ['newsletter', 'email', 'monthly-digest'],
  ];

  const pick = <T>(items: T[], seed: number): T => items[Math.floor(Math.abs(Math.sin(seed) * 10_000)) % items.length];
  const rows: Prisma.PageViewCreateManyInput[] = [];
  let seed = 1;

  for (let day = 89; day >= 0; day -= 1) {
    const date = daysAgo(day);
    const weekday = date.getUTCDay();
    const base = weekday === 0 || weekday === 6 ? 18 : 42;
    // Gentle upward trend over the 90-day window.
    const count = Math.round(base * (1 + (89 - day) / 260) + (pick([0, 3, 6, 9, 12], seed++) as number));

    for (let i = 0; i < count; i += 1) {
      seed += 1;
      const [device, browser, os] = pick(devices, seed);
      const [utmSource, utmMedium, utmCampaign] = pick(campaigns, seed + 7);
      const timestamp = new Date(date);
      timestamp.setUTCHours(6 + (seed % 15), seed % 60, seed % 60, 0);
      rows.push({
        sessionId: `seed-${day}-${Math.floor(i / 3)}`,
        path: pick(paths, seed),
        title: null,
        referrer: pick(referrers, seed + 3),
        utmSource,
        utmMedium,
        utmCampaign,
        device,
        browser,
        os,
        country: pick(countries, seed + 11),
        createdAt: timestamp,
      });
    }
  }

  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.pageView.createMany({ data: rows.slice(i, i + 1000) });
  }
  log(`page views: ${rows.length} across 90 days`);
}

/* ────────────────────────────── Runner ────────────────────────────── */

async function main(): Promise<void> {
  const demo = String(process.env.SEED_DEMO_DATA ?? '').toLowerCase() === 'true';
  console.log(`\n▸ Seeding ${COMPANY.displayName} database (demo data: ${demo ? 'on' : 'off'})\n`);

  await seedRbac();
  const adminId = await seedSuperAdmin();
  await seedSettings();
  // Content blocks are deliberately NOT pre-seeded: `content_blocks` has no row for a key
  // until an admin actually saves it (see ContentBlocksService) — the API falls back to
  // `DEFAULT_CONTENT_BLOCKS` for any missing row, both in reads and in the admin "Default"
  // vs "Customized" badge. Pre-creating rows here would make every block show as
  // "Customized" immediately after seeding, which is wrong.
  await seedEmailTemplates();
  const technologyIds = await seedTechnologies();
  await seedServices(technologyIds);

  if (demo) {
    const staff = await seedDemoUsers(adminId);
    const resumeFileId = await seedDemoResume(staff);
    const jobIds = await seedJobs(staff);
    await seedTeamAndTestimonials();
    await seedCaseStudies(technologyIds);
    await seedLeads(staff);
    await seedApplications(staff, jobIds, resumeFileId);
    await seedNotifications(staff);
    await seedPageViews();
  }

  console.log('\n✔ Seed complete\n');
}

main()
  .catch((error) => {
    console.error('\n✖ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

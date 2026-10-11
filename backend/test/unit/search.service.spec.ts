import { SearchService } from '../../src/modules/search/search.service';

function buildFakePrisma() {
  const allJobs = [
    { id: 'job-1', slug: 'senior-cloud-engineer', title: 'Senior Cloud Engineer', location: 'Remote', workMode: 'REMOTE' },
    { id: 'job-2', slug: 'cloud-architect', title: 'Cloud Architect', location: 'NYC', workMode: 'HYBRID' },
    { id: 'job-3', slug: 'cloud-consultant', title: 'Cloud Consultant', location: 'SF', workMode: 'ONSITE' },
  ];
  const allServices = [
    { id: 'svc-1', slug: 'cloud-migration', title: 'Cloud Migration', shortDescription: 'We migrate you to the cloud' },
  ];
  const allTechnologies = [
    { id: 'tech-1', slug: 'aws', name: 'AWS', category: { name: 'Cloud' } },
    { id: 'tech-2', slug: 'azure', name: 'Azure', category: { name: 'Cloud' } },
  ];

  const job = { findMany: jest.fn().mockImplementation(({ take }: { take: number }) => Promise.resolve(allJobs.slice(0, take))) };
  const service = {
    findMany: jest.fn().mockImplementation(({ take }: { take: number }) => Promise.resolve(allServices.slice(0, take))),
  };
  const technology = {
    findMany: jest.fn().mockImplementation(({ take }: { take: number }) => Promise.resolve(allTechnologies.slice(0, take))),
  };

  return { job, service, technology };
}

describe('SearchService.search', () => {
  it('queries every entity type and caps each section at the given limit', async () => {
    const prisma = buildFakePrisma();
    const search = new SearchService(prisma as never);

    const results = await search.search('cloud', 2);

    expect(results.jobs).toHaveLength(2);
    expect(results.services).toHaveLength(1); // fewer matches than the limit
    expect(results.technologies).toHaveLength(2);

    expect(prisma.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
  });

  it('defaults to a limit of 5 when none is given', async () => {
    const prisma = buildFakePrisma();
    const search = new SearchService(prisma as never);

    await search.search('cloud');

    expect(prisma.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it('only queries published jobs and services', async () => {
    const prisma = buildFakePrisma();
    const search = new SearchService(prisma as never);

    await search.search('cloud', 5);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED', deletedAt: null }) }),
    );
    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ published: true }) }),
    );
  });

  it('flattens the technology category name onto each result', async () => {
    const prisma = buildFakePrisma();
    const search = new SearchService(prisma as never);

    const results = await search.search('a', 5);

    expect(results.technologies[0]).toMatchObject({ categoryName: 'Cloud' });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DEFAULT_CONTENT_BLOCKS } from '@kmg/shared';
import { ContentBlocksService, isContentBlockKey } from '../../src/modules/content-blocks/content-blocks.service';

function buildService(rows: Array<{ key: string; data: unknown; updatedAt: Date }> = []) {
  const contentBlock = {
    findMany: jest.fn().mockResolvedValue(rows),
    findUnique: jest.fn().mockImplementation(({ where: { key } }: { where: { key: string } }) =>
      Promise.resolve(rows.find((row) => row.key === key) ?? null),
    ),
    upsert: jest.fn().mockImplementation(({ where: { key }, create, update }: any) => {
      const existing = rows.find((row) => row.key === key);
      const data = existing ? update.data : create.data;
      const row = { key, data, updatedAt: new Date('2026-01-01T00:00:00.000Z') };
      return Promise.resolve(row);
    }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = { contentBlock } as any;
  return { service: new ContentBlocksService(prisma), prisma };
}

describe('isContentBlockKey', () => {
  it('accepts a registered key and rejects an unknown one', () => {
    expect(isContentBlockKey('home.hero')).toBe(true);
    expect(isContentBlockKey('nope.not-real')).toBe(false);
  });
});

describe('ContentBlocksService.getAll / getOne (default-merge)', () => {
  it('falls back to defaults for every key when the DB is empty', async () => {
    const { service } = buildService([]);
    const all = await service.getAll();
    expect(Object.keys(all)).toHaveLength(16);
    expect(all['home.hero']).toEqual(DEFAULT_CONTENT_BLOCKS['home.hero']);
    expect(all['contact.hero']).toEqual(DEFAULT_CONTENT_BLOCKS['contact.hero']);
  });

  it('merges a customized row over the default for that key only', async () => {
    const custom = { ...DEFAULT_CONTENT_BLOCKS['home.hero'], headline: 'Custom headline' };
    const { service } = buildService([{ key: 'home.hero', data: custom, updatedAt: new Date() }]);
    const all = await service.getAll();
    expect(all['home.hero']).toEqual(custom);
    expect(all['contact.hero']).toEqual(DEFAULT_CONTENT_BLOCKS['contact.hero']);
  });

  it('getOne returns the default when the row is missing', async () => {
    const { service } = buildService([]);
    await expect(service.getOne('footer.cta')).resolves.toEqual(DEFAULT_CONTENT_BLOCKS['footer.cta']);
  });

  it('getOne throws NotFoundException for an unregistered key', async () => {
    const { service } = buildService([]);
    await expect(service.getOne('not.a.real.key')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ContentBlocksService.adminList / adminGet', () => {
  it('returns all 16 keys with label/group metadata and a null updatedAt when uncustomized', async () => {
    const { service } = buildService([]);
    const list = await service.adminList();
    expect(list).toHaveLength(16);
    const hero = list.find((b) => b.key === 'home.hero')!;
    expect(hero.label).toBe('Hero');
    expect(hero.group).toBe('Home page');
    expect(hero.updatedAt).toBeNull();
    expect(hero.data).toEqual(DEFAULT_CONTENT_BLOCKS['home.hero']);
  });

  it('reports a non-null updatedAt for a customized row', async () => {
    const updatedAt = new Date('2026-02-01T00:00:00.000Z');
    const { service } = buildService([{ key: 'home.hero', data: DEFAULT_CONTENT_BLOCKS['home.hero'], updatedAt }]);
    const list = await service.adminList();
    expect(list.find((b) => b.key === 'home.hero')!.updatedAt).toBe(updatedAt.toISOString());
  });

  it('adminGet 404s for an unknown key', async () => {
    const { service } = buildService([]);
    await expect(service.adminGet('bogus')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ContentBlocksService.update (per-key schema dispatch)', () => {
  it('parses a valid body against the key-specific schema and upserts', async () => {
    const { service, prisma } = buildService([]);
    const body = { ...DEFAULT_CONTENT_BLOCKS['footer.cta'], title: 'New title' };
    const result = await service.update('footer.cta', body, 'user-1');
    expect(result.data).toEqual(body);
    expect(prisma.contentBlock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'footer.cta' },
        create: expect.objectContaining({ key: 'footer.cta', updatedBy: 'user-1' }),
      }),
    );
  });

  it('throws BadRequestException with field-level details on an invalid body', async () => {
    const { service } = buildService([]);
    try {
      await service.update('footer.cta', { title: 'Missing other required fields' }, 'user-1');
      throw new Error('expected update() to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as { message: string; details: unknown[] };
      expect(response.message).toBe('Validation failed');
      expect(Array.isArray(response.details)).toBe(true);
      expect(response.details.length).toBeGreaterThan(0);
    }
  });

  it('throws NotFoundException for an unregistered key before validating', async () => {
    const { service } = buildService([]);
    await expect(service.update('not.a.real.key', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ContentBlocksService.reset', () => {
  it('deletes the row for a known key', async () => {
    const { service, prisma } = buildService([{ key: 'home.hero', data: {}, updatedAt: new Date() }]);
    await service.reset('home.hero');
    expect(prisma.contentBlock.deleteMany).toHaveBeenCalledWith({ where: { key: 'home.hero' } });
  });

  it('404s for an unregistered key', async () => {
    const { service } = buildService([]);
    await expect(service.reset('bogus')).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { slugify, uniqueSlug } from '../../src/common/utils/slug.util';

describe('slugify', () => {
  it('lowercases, trims and hyphenates', () => {
    expect(slugify('  Cloud & DevOps Services  ')).toBe('cloud-devops-services');
  });

  it('strips accents and punctuation', () => {
    expect(slugify('Café Déjà Vu!!!')).toBe('cafe-deja-vu');
  });

  it('collapses repeated hyphens/spaces into one', () => {
    expect(slugify('a---b   c')).toBe('a-b-c');
  });

  it('strips underscores rather than treating them as separators', () => {
    expect(slugify('a_b__c')).toBe('abc');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it does not collide', async () => {
    const exists = jest.fn().mockResolvedValue(false);
    const slug = await uniqueSlug('Cloud Migration', exists);
    expect(slug).toBe('cloud-migration');
    expect(exists).toHaveBeenCalledTimes(1);
  });

  it('appends an incrementing suffix until a free slug is found', async () => {
    const taken = new Set(['cloud-migration', 'cloud-migration-2', 'cloud-migration-3']);
    const exists = jest.fn().mockImplementation((s: string) => Promise.resolve(taken.has(s)));

    const slug = await uniqueSlug('Cloud Migration', exists);

    expect(slug).toBe('cloud-migration-4');
    expect(exists).toHaveBeenCalledTimes(4);
  });

  it('falls back to a timestamped slug after exhausting maxAttempts', async () => {
    const exists = jest.fn().mockResolvedValue(true);
    const slug = await uniqueSlug('Popular Title', exists, 3);
    expect(slug).toMatch(/^popular-title-\d+$/);
  });

  it('defaults to "item" for input that slugifies to nothing', async () => {
    const exists = jest.fn().mockResolvedValue(false);
    const slug = await uniqueSlug('!!!', exists);
    expect(slug).toBe('item');
  });
});

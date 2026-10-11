import {
  MAX_PAGE_SIZE,
  buildMeta,
  paginate,
  parsePagination,
  parseSort,
} from '../../src/common/utils/pagination.util';

describe('parsePagination', () => {
  it('applies defaults when the query is empty', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it('accepts string query values and computes skip/take', () => {
    expect(parsePagination({ page: '3', pageSize: '25' })).toEqual({
      page: 3,
      pageSize: 25,
      skip: 50,
      take: 25,
    });
  });

  it('clamps out-of-range values instead of failing', () => {
    expect(parsePagination({ page: '0', pageSize: '5000' })).toMatchObject({
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
    expect(parsePagination({ page: '-4', pageSize: '0' })).toMatchObject({ page: 1, pageSize: 1 });
    expect(parsePagination({ page: 'abc', pageSize: 'xyz' })).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('honours a custom default page size', () => {
    expect(parsePagination({}, 12)).toMatchObject({ pageSize: 12, take: 12 });
  });
});

describe('buildMeta', () => {
  it('computes the total page count', () => {
    expect(buildMeta(45, 2, 20)).toEqual({ page: 2, pageSize: 20, total: 45, totalPages: 3 });
  });

  it('reports zero pages for an empty result set', () => {
    expect(buildMeta(0, 1, 20)).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });
});

describe('paginate', () => {
  it('builds the { data, meta } envelope', () => {
    const result = paginate([{ id: 'a' }], 1, { page: 1, pageSize: 20 });
    expect(result).toEqual({ data: [{ id: 'a' }], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
  });
});

describe('parseSort', () => {
  const allowed = ['createdAt', 'title'] as const;

  it('parses field:direction', () => {
    expect(parseSort('title:asc', allowed)).toEqual({ title: 'asc' });
    expect(parseSort('title:desc', allowed)).toEqual({ title: 'desc' });
  });

  it('defaults to descending for an unknown direction', () => {
    expect(parseSort('title:sideways', allowed)).toEqual({ title: 'desc' });
  });

  it('ignores fields that are not allow-listed', () => {
    expect(parseSort('passwordHash:asc', allowed)).toEqual({ createdAt: 'desc' });
    expect(parseSort(undefined, allowed)).toEqual({ createdAt: 'desc' });
  });

  it('accepts a custom fallback', () => {
    expect(parseSort(undefined, allowed, { title: 'asc' })).toEqual({ title: 'asc' });
  });
});

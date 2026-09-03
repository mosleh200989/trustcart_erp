import { countRecords, summariseFilters } from './count-records';

describe('countRecords', () => {
  it('counts a bare array', () => {
    expect(countRecords([1, 2, 3])).toBe(3);
  });

  it('counts the paginated envelope this codebase returns', () => {
    expect(countRecords({ items: [{}, {}], total: 95004, page: 1 })).toBe(2);
    expect(countRecords({ rows: [{}], total: 1 })).toBe(1);
    expect(countRecords({ data: [{}, {}, {}] })).toBe(3);
  });

  it('counts a single record as one', () => {
    expect(countRecords({ id: 7, name: 'A customer' })).toBe(1);
  });

  it('counts CSV data lines, not the header', () => {
    expect(countRecords('id,name\n1,A\n2,B\n')).toBe(2);
    expect(countRecords({ csv: 'id,name\n1,A\n' })).toBe(1);
  });

  it('reports nothing for an empty read', () => {
    expect(countRecords([])).toBe(0);
    expect(countRecords(null)).toBe(0);
    expect(countRecords(undefined)).toBe(0);
  });
});

describe('summariseFilters', () => {
  it('keeps the filters that describe intent', () => {
    expect(summariseFilters({ search: '01712345678', tier: 'gold' })).toEqual({
      search: '01712345678',
      tier: 'gold',
    });
  });

  it('drops paging noise', () => {
    expect(summariseFilters({ page: '3', limit: '500', sortBy: 'name', tier: 'gold' })).toEqual({
      tier: 'gold',
    });
  });

  it('drops empty values', () => {
    expect(summariseFilters({ search: '', tier: undefined, agentId: '4' })).toEqual({ agentId: '4' });
  });

  it('truncates long values rather than storing them whole', () => {
    const summary = summariseFilters({ search: 'x'.repeat(500) });
    expect(summary.search.length).toBe(120);
  });

  it('survives a missing query', () => {
    expect(summariseFilters(undefined)).toEqual({});
  });
});

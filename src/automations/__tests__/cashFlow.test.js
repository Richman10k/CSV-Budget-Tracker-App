import {projectCashFlow} from '../cashFlow';

// Local-time constructors (avoid UTC string parsing so month buckets are
// timezone-independent in CI).
const from = new Date(2026, 5, 1).getTime(); // Jun 1, 2026 local

describe('projectCashFlow', () => {
  test('projects a monthly subscription into each month', () => {
    const subs = [
      {name: 'Netflix', amount: 15, interval: 'monthly', status: 'active', nextDue: new Date(2026, 5, 10).getTime()},
    ];
    const buckets = projectCashFlow(subs, {months: 3, from});
    expect(buckets).toHaveLength(3);
    expect(buckets.map(b => b.total)).toEqual([15, 15, 15]);
    expect(buckets[0].items[0]).toMatchObject({name: 'Netflix', amount: 15});
  });

  test('ignores cancelled subscriptions and sums multiple', () => {
    const subs = [
      {name: 'A', amount: 10, interval: 'monthly', status: 'active', nextDue: new Date(2026, 5, 5).getTime()},
      {name: 'B', amount: 5, interval: 'monthly', status: 'active', nextDue: new Date(2026, 5, 6).getTime()},
      {name: 'C', amount: 99, interval: 'monthly', status: 'cancelled', nextDue: new Date(2026, 5, 7).getTime()},
    ];
    const buckets = projectCashFlow(subs, {months: 1, from});
    expect(buckets[0].total).toBe(15);
  });

  test('weekly subscription hits a month multiple times', () => {
    const subs = [
      {name: 'Gym', amount: 10, interval: 'weekly', status: 'active', nextDue: new Date(2026, 5, 2).getTime()},
    ];
    const buckets = projectCashFlow(subs, {months: 1, from});
    expect(buckets[0].total).toBeGreaterThanOrEqual(40); // ~4-5 weekly charges
  });
});

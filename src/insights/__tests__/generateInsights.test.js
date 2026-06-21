import {generateInsights, monthlySpendingSeries} from '../generateInsights';

const tx = (date, category, amount, type = 'expense') => ({date, category, amount, type});

describe('generateInsights', () => {
  const selectedMonth = {year: 2026, month: 4}; // May; prev = April

  test('detects a spending spike and top category', () => {
    const transactions = [
      tx('2026-04-10', 'Dining', 100),
      tx('2026-05-10', 'Dining', 200), // +100% spike
      tx('2026-05-12', 'Rent', 50),
    ];
    const insights = generateInsights(transactions, [], {selectedMonth});
    const ids = insights.map(i => i.id);
    expect(ids).toContain('spike');
    expect(ids).toContain('top');
    const spike = insights.find(i => i.id === 'spike');
    expect(spike.title).toContain('Dining');
  });

  test('flags subscription creep from price-raised active subs', () => {
    const transactions = [tx('2026-05-10', 'Dining', 50)];
    const subs = [
      {status: 'active', priceChange: {previous: 10, current: 16}},
      {status: 'cancelled', priceChange: {previous: 5, current: 20}}, // ignored
    ];
    const insights = generateInsights(transactions, subs, {selectedMonth});
    const creep = insights.find(i => i.id === 'creep');
    expect(creep).toBeTruthy();
    expect(creep.detail).toContain('6'); // +$6
  });

  test('reports over-budget categories', () => {
    const transactions = [tx('2026-05-10', 'Food', 500)];
    const insights = generateInsights(transactions, [], {
      selectedMonth,
      budgets: {Food: 300},
    });
    expect(insights.find(i => i.id === 'overbudget')).toBeTruthy();
  });

  test('empty data yields no insights', () => {
    expect(generateInsights([], [])).toEqual([]);
  });
});

describe('monthlySpendingSeries', () => {
  test('buckets the last N months oldest-first', () => {
    const transactions = [
      tx('2026-03-01', 'A', 30),
      tx('2026-04-01', 'A', 40),
      tx('2026-05-01', 'A', 50),
    ];
    const series = monthlySpendingSeries(transactions, 3);
    expect(series).toEqual([30, 40, 50]);
  });
});

import {suggestBudgets} from '../budgetSuggestions';

const tx = (date, category, amount, type = 'expense') => ({date, category, amount, type});

describe('suggestBudgets', () => {
  test('averages the lookback window and rounds up to a nice limit', () => {
    const transactions = [
      tx('2026-01-15', 'Food', 400),
      tx('2026-02-15', 'Food', 420),
      tx('2026-03-15', 'Food', 440), // latest month anchors the window
      tx('2025-10-01', 'Food', 9999), // outside the 3-month window -> ignored
      tx('2026-03-10', 'Salary', 3000, 'income'), // income -> ignored
    ];
    const {months, suggestions} = suggestBudgets(transactions, {}, {lookbackMonths: 3});
    expect(months).toBe(3);
    const food = suggestions.find(s => s.category === 'Food');
    expect(food.avgMonthly).toBeCloseTo(420); // (400+420+440)/3
    expect(food.suggested).toBe(450); // 420 * 1.05 = 441 -> round up to 450
    expect(food.hasLimit).toBe(false);
    expect(food.current).toBeNull();
  });

  test('reports existing limits and sorts by spend descending', () => {
    const transactions = [
      tx('2026-03-15', 'Food', 600),
      tx('2026-03-16', 'Transport', 100),
    ];
    const {suggestions} = suggestBudgets(
      transactions,
      {Food: 500},
      {lookbackMonths: 1},
    );
    expect(suggestions.map(s => s.category)).toEqual(['Food', 'Transport']);
    expect(suggestions[0]).toMatchObject({hasLimit: true, current: 500});
  });

  test('returns nothing when there is no spending history', () => {
    expect(suggestBudgets([], {})).toEqual({months: 0, suggestions: []});
    expect(
      suggestBudgets([tx('2026-03-01', 'Salary', 1000, 'income')], {}),
    ).toEqual({months: 0, suggestions: []});
  });
});

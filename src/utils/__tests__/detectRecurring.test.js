import {detectRecurring} from '../detectRecurring';

const DAY = 24 * 60 * 60 * 1000;
const base = new Date('2026-01-05').getTime();

// Build N monthly charges (~30 days apart) for a merchant with given amounts.
function monthly(merchant, amounts) {
  return amounts.map((amount, i) => ({
    type: 'expense',
    merchant,
    description: merchant,
    amount,
    date: base + i * 30 * DAY,
    category: 'Subscriptions',
  }));
}

describe('detectRecurring price changes', () => {
  test('flags an increase above 10% with details', () => {
    const [sub] = detectRecurring(monthly('Netflix', [10, 10, 10, 15]));
    expect(sub.flags).toContain('price_increase');
    expect(sub.priceChange).toEqual({previous: 10, current: 15, pct: 50});
    expect(sub.amount).toBe(15); // current price
  });

  test('does NOT flag an increase under 10%', () => {
    const [sub] = detectRecurring(monthly('Spotify', [10, 10, 10, 10.5]));
    expect(sub.flags).not.toContain('price_increase');
    expect(sub.priceChange).toBeNull();
  });

  test('excludes merchants in ignoredKeys', () => {
    const txns = monthly('Netflix', [10, 10, 10]);
    const all = detectRecurring(txns);
    expect(all.length).toBe(1);
    const ignored = detectRecurring(txns, {ignoredKeys: new Set(['netflix'])});
    expect(ignored.length).toBe(0);
  });
});

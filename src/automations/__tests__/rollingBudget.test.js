import {computeCarryIn} from '../rollingBudget';

const tx = (date, category, amount, type = 'expense') => ({date, category, amount, type});

describe('computeCarryIn', () => {
  const may = {year: 2026, month: 4}; // carry-in comes from April (month 3)

  test('carries unused previous-month budget forward', () => {
    const transactions = [
      tx('2026-04-10', 'Food', 300), // spent 300 of 450 in April
      tx('2026-05-02', 'Food', 50), // current month, ignored for carry-in
    ];
    const carry = computeCarryIn(transactions, {Food: 450}, may);
    expect(carry.Food).toBe(150);
  });

  test('overspending the previous month carries nothing (clamped at 0)', () => {
    const carry = computeCarryIn([tx('2026-04-10', 'Food', 600)], {Food: 450}, may);
    expect(carry.Food).toBe(0);
  });

  test('TOTAL uses all previous-month expenses', () => {
    const transactions = [
      tx('2026-04-10', 'Food', 200),
      tx('2026-04-12', 'Gas', 100),
    ];
    const carry = computeCarryIn(transactions, {TOTAL: 1000}, may);
    expect(carry.TOTAL).toBe(700);
  });
});

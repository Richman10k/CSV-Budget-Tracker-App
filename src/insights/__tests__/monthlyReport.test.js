import {buildReportHtml} from '../monthlyReport';

describe('buildReportHtml', () => {
  const base = {
    monthLabel: 'June 2026',
    fmt: n => `$${n.toFixed(2)}`,
    spending: 1200,
    income: 3000,
    categories: [{name: 'Food', amount: 400}],
    transactions: [{date: '2026-06-01', description: 'Coffee', amount: 5, type: 'expense'}],
    insights: [{title: 'Top category', detail: 'Food $400'}],
  };

  test('includes the month, totals and net', () => {
    const html = buildReportHtml(base);
    expect(html).toContain('June 2026');
    expect(html).toContain('$1200.00'); // spending
    expect(html).toContain('+$1800.00'); // net = 3000 - 1200
  });

  test('escapes HTML in user-supplied text', () => {
    const html = buildReportHtml({
      ...base,
      transactions: [{date: 'd', description: '<script>x</script>', amount: 1, type: 'expense'}],
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

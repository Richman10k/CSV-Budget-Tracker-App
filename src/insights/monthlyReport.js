/**
 * monthlyReport.js — builds a self-contained HTML monthly report.
 *
 * Pure string builder (no I/O) so it's easy to test. The caller writes the
 * result to a file and shares it. HTML (not a native PDF lib) keeps the build
 * dependency-free and offline; the file opens in any browser and can be
 * "Printed to PDF" on-device. All user-supplied text is HTML-escaped.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Object} data
 * @param {string} data.monthLabel  e.g. "June 2026"
 * @param {Function} data.fmt       currency formatter (number -> string)
 * @param {number} data.spending
 * @param {number} data.income
 * @param {Array} data.categories   [{name, amount}] (desc)
 * @param {Array} data.transactions [{date, description, amount, type}] excerpt
 * @param {Array} data.insights     [{title, detail}]
 * @returns {string} full HTML document
 */
export function buildReportHtml(data = {}) {
  const fmt = data.fmt || (n => `$${Math.round(n)}`);
  const spending = data.spending || 0;
  const income = data.income || 0;
  const net = income - spending;
  const categories = data.categories || [];
  const transactions = data.transactions || [];
  const insights = data.insights || [];
  const maxCat = categories.reduce((m, c) => Math.max(m, c.amount), 0) || 1;

  const catRows = categories
    .map(
      c => `
      <div class="bar-row">
        <div class="bar-head"><span>${esc(c.name)}</span><span>${esc(fmt(c.amount))}</span></div>
        <div class="track"><div class="fill" style="width:${Math.max(
          (c.amount / maxCat) * 100,
          2,
        ).toFixed(1)}%"></div></div>
      </div>`,
    )
    .join('');

  const insightRows = insights
    .map(i => `<li><strong>${esc(i.title)}</strong> — ${esc(i.detail)}</li>`)
    .join('');

  const txRows = transactions
    .map(
      t => `
      <tr>
        <td>${esc(t.date)}</td>
        <td>${esc(t.description)}</td>
        <td class="amt ${t.type === 'income' ? 'pos' : 'neg'}">${
        t.type === 'income' ? '+' : '-'
      }${esc(fmt(Math.abs(t.amount)))}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Budget Report — ${esc(data.monthLabel)}</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: -apple-system, Roboto, system-ui, sans-serif; background:#0A0B0D; color:#fff; margin:0; padding:24px; }
  h1 { font-size:22px; margin:0 0 2px; }
  .sub { color:#A2A8B4; font-size:13px; margin-bottom:20px; }
  .cards { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
  .card { background:#1A1D24; border:1px solid #262A33; border-radius:14px; padding:16px; flex:1; min-width:120px; }
  .card .label { color:#A2A8B4; font-size:12px; }
  .card .value { font-size:22px; font-weight:800; margin-top:4px; }
  .pos { color:#00C853; } .neg { color:#FF5252; }
  h2 { font-size:15px; margin:24px 0 12px; }
  .bar-row { margin-bottom:12px; }
  .bar-head { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; }
  .track { background:#22262F; border-radius:999px; height:8px; overflow:hidden; }
  .fill { background:#00C853; height:8px; border-radius:999px; }
  ul { padding-left:18px; } li { margin-bottom:6px; font-size:13px; color:#cfd3da; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  td { padding:8px 4px; border-bottom:1px solid #262A33; }
  td.amt { text-align:right; font-weight:700; white-space:nowrap; }
  .foot { color:#6B7280; font-size:11px; margin-top:28px; text-align:center; }
</style></head>
<body>
  <h1>Budget Report</h1>
  <div class="sub">${esc(data.monthLabel)} · generated on-device, private</div>

  <div class="cards">
    <div class="card"><div class="label">Spent</div><div class="value neg">${esc(fmt(spending))}</div></div>
    <div class="card"><div class="label">Income</div><div class="value pos">${esc(fmt(income))}</div></div>
    <div class="card"><div class="label">Net</div><div class="value ${
      net >= 0 ? 'pos' : 'neg'
    }">${net >= 0 ? '+' : '-'}${esc(fmt(Math.abs(net)))}</div></div>
  </div>

  ${insights.length ? `<h2>Insights</h2><ul>${insightRows}</ul>` : ''}
  ${categories.length ? `<h2>Spending by category</h2>${catRows}` : ''}
  ${transactions.length ? `<h2>Transactions</h2><table>${txRows}</table>` : ''}

  <div class="foot">CSV Budget Tracker — offline & encrypted. This export is decrypted; store it safely.</div>
</body></html>`;
}

export default {buildReportHtml};

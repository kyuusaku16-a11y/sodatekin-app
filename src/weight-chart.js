import { dayNumber, shiftDate } from './model.js';
import { weightTrend } from './diet-summary.js';

export function weightChartSVG(weights, date, range) {
  const from = range === 'all' ? '' : shiftDate(date, 1 - range);
  const rows = weights.filter(row => row.date >= from && row.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) return '<p class="chart-empty">体重を記録すると、ここにグラフが出ます。</p>';

  const start = from || rows[0].date;
  const firstDay = dayNumber(start), span = dayNumber(date) - firstDay;
  // 体重は1日1件。表示開始日の平均にも、その直前6暦日の実測値を使う。
  const priorStart = shiftDate(start, -6);
  const history = weights.filter(row => row.date < start && row.date >= priorStart)
    .sort((a, b) => a.date.localeCompare(b.date));
  let min = Infinity, max = -Infinity;
  const samples = rows.map(row => {
    history.push(row);
    if (history.length > 7) history.shift();
    const average = weightTrend(history, row.date).average;
    min = Math.min(min, row.kg, average);
    max = Math.max(max, row.kg, average);
    return { ...row, average };
  });
  if (min === max) { min -= 0.5; max += 0.5; }
  const x = day => span ? (44 + 278 * (dayNumber(day) - firstDay) / span).toFixed(2) : '183';
  const y = kg => (104 - 86 * (kg - min) / (max - min)).toFixed(2);
  const latest = samples.at(-1);
  const period = range === 'all' ? '全期間' : `${range}日`;
  const description = `${period}（${start}〜${date}）。最新 ${latest.date}、${latest.kg.toFixed(1)}kg。最新記録日の7日平均 ${latest.average.toFixed(1)}kg。`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="weight-chart" viewBox="0 0 330 154" role="img" aria-label="${description}">
    <title>${description}</title>
    <path class="chart-axis" d="M44 18H322 M44 104H322" fill="none" stroke="currentColor"/>
    <g class="chart-label" fill="currentColor"><text x="0" y="22">${max.toFixed(1)}</text><text x="0" y="108">${min.toFixed(1)}</text>
    <text x="44" y="127">${start.replaceAll('-','/')}</text><text x="322" y="127" text-anchor="end">${date.replaceAll('-','/')}</text></g>
    <polyline points="${samples.map(row => `${x(row.date)},${y(row.average)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>
    <g class="weight-points" fill="currentColor">${samples.map(row => `<circle cx="${x(row.date)}" cy="${y(row.kg)}" r="3"><title>${row.date} · ${row.kg.toFixed(1)}kg</title></circle>`).join('')}</g>
  <text class="chart-key" x="44" y="149" fill="currentColor">点：実測（kg）　線：7日平均</text>
  </svg>`;
}

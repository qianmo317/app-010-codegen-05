import { router } from '../router';
import { createElement, clearElement } from '../utils/dom';
import { getDayInfo } from '../almanac/lunar';
import { getDayHours } from '../almanac/hourly';
import { WEEK_DAYS } from '../almanac/constants';
import { addDays, formatDate } from '../utils/date';

export function renderHours(app: HTMLElement, dateStr: string) {
  clearElement(app);
  app.className = 'page hours-page';

  const [year, month, day] = dateStr.split('-').map(Number);
  const info = getDayInfo(year, month, day);
  const table = getDayHours(year, month, day);
  const lunar = info.lunar;

  // 头部（打印时隐藏）
  const header = createElement('div', 'page-header no-print');
  const backBtn = createElement('button', 'back-btn', '◀ 返回');
  backBtn.addEventListener('click', () => router.navigate(`/day/${dateStr}`));
  const title = createElement('h1', 'page-title', '时辰吉凶表');
  const printBtn = createElement('button', 'nav-btn print-btn', '打印');
  printBtn.addEventListener('click', () => window.print());
  header.append(backBtn, title, printBtn);

  // 日期导航（打印时隐藏）
  const dateNav = createElement('div', 'date-nav no-print');
  const prevBtn = createElement('button', 'nav-btn', '◀ 前一天');
  prevBtn.addEventListener('click', () => {
    const [y, m, d] = addDays(year, month, day, -1);
    router.navigate(`/hours/${formatDate(y, m, d)}`);
  });
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = dateStr;
  dateInput.addEventListener('change', () => {
    if (dateInput.value) router.navigate(`/hours/${dateInput.value}`);
  });
  const nextBtn = createElement('button', 'nav-btn', '后一天 ▶');
  nextBtn.addEventListener('click', () => {
    const [y, m, d] = addDays(year, month, day, 1);
    router.navigate(`/hours/${formatDate(y, m, d)}`);
  });
  dateNav.append(prevBtn, dateInput, nextBtn);

  // 日期信息行（打印可见）
  const dayInfoLine = createElement('div', 'hours-day-info');
  dayInfoLine.innerHTML =
    `<strong>${year}年${month}月${day}日 时辰吉凶表</strong>` +
    `<span>星期${WEEK_DAYS[info.weekDay]} · 农历${lunar.monthName}${lunar.dayName} · ` +
    `${lunar.yearGanZhi}年 ${lunar.monthGanZhi}月 ${table.dayGanZhi}日</span>`;

  // 最吉 / 最凶（写在表前）
  const summary = createElement('div', 'hours-summary');
  const bestBox = createElement('div', 'summary-box best');
  bestBox.innerHTML =
    `<span class="summary-title">最吉</span>` +
    table.best.map(h => `${h.name} ${h.range}（${h.god}）`).join('　');
  const worstBox = createElement('div', 'summary-box worst');
  worstBox.innerHTML =
    `<span class="summary-title">最凶</span>` +
    table.worst.map(h => `${h.name} ${h.range}（${h.god}）`).join('　');
  summary.append(bestBox, worstBox);

  // 早晚子时归属说明
  const ziNote = createElement('div', 'zi-note');
  ziNote.textContent = table.lateZiNextDay
    ? `早晚子时分开排：早子时 00:00-01:00 属当日（${table.dayGanZhi}日）；` +
      `晚子时 23:00-24:00 归次日，时柱与值神按次日（${table.nextDayGanZhi}日）推算。`
    : `早晚子时分开排：早子时 00:00-01:00 与晚子时 23:00-24:00 均按当日（${table.dayGanZhi}日）推算。`;

  // 时辰表
  const tableCard = createElement('div', 'card hours-table-card');
  tableCard.innerHTML = '<h3>十二时辰吉凶（早晚子时分列）</h3>';
  const tableEl = document.createElement('table');
  tableEl.className = 'hours-table';
  tableEl.innerHTML = `
    <thead>
      <tr>
        <th>时辰</th><th>时间</th><th>干支</th><th>值神</th><th>吉凶</th>
        <th>宜</th><th>忌</th><th>冲</th><th>煞</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  table.hours.forEach(h => {
    const tr = document.createElement('tr');
    tr.className = `luck-${h.luck}${h.belongsToNextDay ? ' next-day-row' : ''}`;
    const badge = h.belongsToNextDay ? '<span class="next-day-badge">次日</span>' : '';
    tr.innerHTML = `
      <td class="cell-name">${h.name}${badge}</td>
      <td class="cell-range">${h.range}</td>
      <td class="cell-ganzhi">${h.ganZhi}</td>
      <td class="cell-god">${h.god}</td>
      <td class="cell-luck">${h.luck}</td>
      <td class="cell-yi">${h.yi.join('、')}</td>
      <td class="cell-ji">${h.ji.join('、')}</td>
      <td class="cell-chong">冲${h.chongShengxiao}</td>
      <td class="cell-sha">煞${h.sha}</td>
    `;
    tbody.appendChild(tr);
  });
  tableEl.appendChild(tbody);
  tableCard.appendChild(tableEl);

  // 宜忌合并（撞车的时辰合在一起）
  const mergeCard = createElement('div', 'card merge-card');
  mergeCard.innerHTML = '<h3>宜忌合并（相同宜忌的时辰）</h3>';
  if (table.merged.length > 0) {
    table.merged.forEach(g => {
      const group = createElement('div', 'merge-group');
      group.innerHTML = `
        <div class="merge-hours">${g.hours.map(h => `${h.name} ${h.range}`).join('　')}</div>
        <div class="merge-yiji">
          <span class="yi-text">宜：${g.yi.join('、')}</span>
          <span class="ji-text">忌：${g.ji.join('、')}</span>
        </div>
      `;
      mergeCard.appendChild(group);
    });
  } else {
    mergeCard.appendChild(createElement('div', 'merge-empty', '今日各时辰宜忌均不相同，无需合并'));
  }

  app.append(header, dateNav, dayInfoLine, summary, ziNote, tableCard, mergeCard);
}

import { router } from '../router';
import { createElement, clearElement } from '../utils/dom';
import { getDayInfo } from '../almanac/lunar';
import { WEEK_DAYS } from '../almanac/constants';
import { getDayShichen, type DayShichen } from '../almanac/shichen';
import {
  HUANG_HEI_GODS,
  GOD_YIJI_DEFAULT,
  type GodName,
  type GodYiJi,
} from '../almanac/shichen-data';

let styleInjected = false;

function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .sc-page { max-width: 1080px; }

    /* 查询条 */
    .sc-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .sc-toolbar input[type=date] {
      padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;
    }
    .sc-toolbar .spacer { flex: 1; }
    .sc-btn {
      padding: 8px 14px; border: 1px solid var(--primary); background: transparent;
      color: var(--primary); border-radius: 6px; cursor: pointer; font-size: 13px;
    }
    .sc-btn:hover { background: var(--primary); color: #fff; }
    .sc-btn.secondary { border-color: var(--secondary); color: var(--secondary); }
    .sc-btn.secondary:hover { background: var(--secondary); color: #fff; }

    /* 概要 */
    .sc-summary { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .sc-pillars { font-size: 15px; }
    .sc-pillars b { color: var(--primary); font-size: 18px; }
    .sc-note {
      width: 100%; font-size: 12px; color: var(--text-light);
      border-top: 1px dashed var(--border); padding-top: 8px;
    }
    .sc-note em { color: var(--accent); font-style: normal; font-weight: bold; }

    /* 最吉 / 最凶 */
    .sc-extreme { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .sc-ext-card { border-radius: 10px; padding: 14px 16px; border: 2px solid; }
    .sc-ext-card.best { background: #f0f8f0; border-color: var(--secondary); }
    .sc-ext-card.worst { background: #fff1f1; border-color: var(--accent); }
    .sc-ext-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
    .sc-ext-tag { font-size: 15px; font-weight: bold; }
    .sc-ext-card.best .sc-ext-tag { color: var(--secondary); }
    .sc-ext-card.worst .sc-ext-tag { color: var(--accent); }
    .sc-ext-name { font-size: 20px; font-weight: bold; }
    .sc-ext-meta { font-size: 13px; color: var(--text-light); }
    .sc-ext-tags { margin-top: 6px; display: flex; gap: 5px; flex-wrap: wrap; }
    .sc-ext-tags .mini { padding: 1px 8px; border-radius: 10px; font-size: 12px; }
    .sc-ext-tags .mini.yi { background: #dff0e0; color: var(--secondary); }
    .sc-ext-tags .mini.ji { background: #fbe0e3; color: var(--accent); }

    /* 时辰表 */
    .sc-table-wrap { overflow-x: auto; }
    table.sc-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .sc-table th, .sc-table td {
      border: 1px solid var(--border); padding: 5px 8px; vertical-align: top; line-height: 1.45;
    }
    .sc-table th {
      background: #efe6d6; color: var(--primary); font-size: 12.5px;
      padding: 7px 8px; white-space: nowrap;
    }
    .sc-table tbody tr:nth-child(odd) td { background: #fbf8f2; }
    .sc-table tbody tr:nth-child(even) td { background: #f6f0e6; }
    .sc-table tbody tr.sc-luck-吉 td:first-child { box-shadow: inset 4px 0 0 var(--secondary); }
    .sc-table tbody tr.sc-luck-凶 td:first-child { box-shadow: inset 4px 0 0 var(--accent); }
    .sc-name { font-weight: bold; white-space: nowrap; }
    .sc-name small { display: block; font-weight: normal; color: var(--text-light); font-size: 11px; }
    .sc-gz { font-weight: bold; white-space: nowrap; }
    .sc-god { white-space: nowrap; }
    .sc-god .luck { font-weight: bold; margin-left: 4px; }
    .sc-god .luck.吉 { color: var(--secondary); }
    .sc-god .luck.凶 { color: var(--accent); }
    .sc-yiji span {
      display: inline-block; padding: 0 6px; margin: 1px 2px 1px 0; border-radius: 8px;
      font-size: 11.5px; white-space: nowrap;
    }
    .sc-yiji.yi span { background: #e4f2e5; color: #2c5f2d; }
    .sc-yiji.ji span { background: #fbe4e7; color: #b22234; }
    .sc-yiji .none { color: #aaa; font-size: 11.5px; }
    .sc-chong { white-space: nowrap; font-size: 12px; }
    .sc-chong b { color: var(--accent); }
    .sc-chong .sha { color: #7a4a00; }
    tr.sc-wanzi td { background: #fdf3e7 !important; }
    .sc-wan-flag { color: var(--primary); font-size: 10.5px; font-weight: bold; }

    /* 宜忌合并对照 */
    .sc-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .sc-group-col h4 { margin-bottom: 8px; font-size: 14px; }
    .sc-group-col.yi h4 { color: var(--secondary); }
    .sc-group-col.ji h4 { color: var(--accent); }
    .sc-gitem {
      display: flex; gap: 8px; align-items: baseline; padding: 5px 0;
      border-bottom: 1px dashed var(--border); font-size: 12.5px;
    }
    .sc-gitem .gname { font-weight: bold; min-width: 44px; }
    .sc-gitem .gslots { color: var(--text-light); }

    /* 基础数据编辑器 */
    details.sc-editor { border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; background: var(--card-bg); }
    details.sc-editor summary { cursor: pointer; font-weight: bold; color: var(--primary); }
    .sc-editor-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
    .sc-god-edit { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
    .sc-god-edit label { display: block; font-size: 12px; font-weight: bold; margin: 6px 0 3px; }
    .sc-god-edit label.yi { color: var(--secondary); }
    .sc-god-edit label.ji { color: var(--accent); }
    .sc-god-edit input { width: 100%; padding: 5px 7px; border: 1px solid var(--border); border-radius: 5px; font-size: 12px; }
    .sc-editor-actions { margin-top: 10px; display: flex; gap: 10px; }

    /* 打印：A4 横向一页放下。可用区约 283mm × 196mm。
       屏幕纵向堆叠；打印时表格(13行)与宜忌对照左右双栏，避免第二页。 */
    @media print {
      @page { size: A4 landscape; margin: 7mm; }
      body { background: #fff !important; }
      .sc-page { max-width: none; padding: 0; }
      .sc-no-print { display: none !important; }
      .card {
        box-shadow: none; border: 1px solid #bbb; padding: 6px 9px; margin-bottom: 5px;
        page-break-inside: avoid;
      }
      .card h3 { font-size: 11px; margin-bottom: 4px; padding-left: 7px; }
      .page-header { margin-bottom: 6px; padding-bottom: 4px; border-bottom-width: 1px; }
      .page-title { font-size: 15px; }
      .sc-pillars { font-size: 11.5px; }
      .sc-note { font-size: 9.5px; padding-top: 3px; margin-top: 2px; }

      .sc-extreme { gap: 6px; }
      .sc-ext-card { padding: 5px 8px; border-width: 1px; }
      .sc-ext-name { font-size: 13px; }
      .sc-ext-meta { font-size: 9.5px; }
      .sc-ext-tags { margin-top: 2px; }
      .sc-ext-tags .mini { font-size: 9px; padding: 0 5px; }

      /* 表格 + 宜忌对照双栏并排在一页内 */
      .sc-body { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; }
      .sc-body > div { margin-bottom: 0; }
      .sc-body > .card:nth-child(1) { flex: 1 1 100%; }
      .sc-body > div:nth-child(2) { flex: 1 1 100%; }
      .sc-body > .card:nth-child(3) { flex: 1 1 61%; width: 61%; margin-bottom: 0; }
      .sc-body > .card:nth-child(4) { flex: 1 1 36%; width: 36%; margin-bottom: 0; }

      .sc-table th, .sc-table td { padding: 1px 4px; font-size: 9px; line-height: 1.25; }
      .sc-table th { padding: 2px 4px; font-size: 9px; }
      .sc-yiji span { font-size: 8.5px; padding: 0 3px; margin: 0 1px; }
      .sc-yiji .none { font-size: 9px; }
      .sc-name small { font-size: 8px; }
      .sc-god { font-size: 9px; }
      .sc-chong { font-size: 9px; }

      .sc-groups { display: block; column-count: 1; }
      .sc-group-col { margin-bottom: 4px; }
      .sc-group-col h4 { font-size: 10px; margin-bottom: 2px; }
      .sc-gitem { padding: 0; font-size: 8.8px; line-height: 1.4; }
      .sc-gitem .gname { min-width: 34px; }
    }
  `;
  document.head.appendChild(style);
}

function tagsHtml(items: string[], _kind: 'yi' | 'ji'): string {
  if (items.length === 0) return '<span class="none">—</span>';
  return items.map((t) => `<span>${t}</span>`).join('');
}

function renderExtremeCard(data: DayShichen) {
  const b = data.best;
  const w = data.worst;
  const card = (slot: typeof b, cls: string, tag: string) => `
    <div class="sc-ext-card ${cls}">
      <div class="sc-ext-head">
        <span class="sc-ext-tag">${tag}</span>
        <span class="sc-ext-name">${slot.label} · ${slot.god}</span>
      </div>
      <div class="sc-ext-meta">${slot.clockRange}｜时柱 ${slot.ganZhi}｜冲${slot.chongShengxiao} 煞${slot.sha}
        ${slot.dayOffset === 1 ? '｜按次日' + data.nextDayGanZhi + '日柱' : ''}</div>
      <div class="sc-ext-tags">
        ${slot.yi.slice(0, 6).map((t) => `<span class="mini yi">宜 ${t}</span>`).join('')}
        ${slot.ji.slice(0, 4).map((t) => `<span class="mini ji">忌 ${t}</span>`).join('')}
      </div>
    </div>`;
  return `<div class="sc-extreme">${card(b, 'best', '🔺 最吉')}${card(w, 'worst', '🔻 最凶')}</div>`;
}

export function renderShichen(app: HTMLElement, dateStr?: string) {
  injectStyles();
  clearElement(app);
  app.className = 'page sc-page';

  const initial = dateStr || toDateStr(new Date());
  const [y, m, d] = parseDate(initial);

  // 头部
  const header = createElement('div', 'page-header');
  const backBtn = createElement('button', 'back-btn sc-no-print', '◀ 返回');
  backBtn.addEventListener('click', () => router.navigate(`/day/${toDateStr(new Date(y, m - 1, d))}`));
  const title = createElement('h2', 'page-title', '时辰吉凶通胜');
  header.append(backBtn, title);

  // 编辑器状态（基础数据可改，改完整表重算）
  let godYiJi: Record<GodName, GodYiJi> = cloneData(GOD_YIJI_DEFAULT);

  // 工具栏
  const toolbar = createElement('div', 'card sc-toolbar sc-no-print');
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = toDateStr(new Date(y, m - 1, d));
  const prevBtn = createElement('button', 'sc-btn', '‹ 前一天');
  const nextBtn = createElement('button', 'sc-btn', '后一天 ›');
  const spacer = createElement('div', 'spacer');
  const printBtn = createElement('button', 'sc-btn secondary', '🖨 打印（一页）');
  printBtn.addEventListener('click', () => window.print());
  toolbar.append(prevBtn, dateInput, nextBtn, spacer, printBtn);

  // 主体容器（每次重算时重建）
  const body = createElement('div', 'sc-body');

  function curDate(): [number, number, number] {
    return parseDate(dateInput.value);
  }

  function rerender() {
    const [cy, cm, cd] = curDate();
    const data = getDayShichen(cy, cm, cd, godYiJi);
    const info = getDayInfo(cy, cm, cd);
    clearElement(body);

    // 概要
    const summary = createElement('div', 'card');
    summary.innerHTML = `
      <div class="sc-summary">
        <div class="sc-pillars">
          ${cy}年${cm}月${cd}日　星期${WEEK_DAYS[info.weekDay]}
          农历${info.lunar.monthName}${info.lunar.dayName}
          日柱 <b>${data.dayGanZhi}</b> 日
          ${info.lunar.solarTerm ? `　<span class="solar-term-badge">${info.lunar.solarTerm}</span>` : ''}
        </div>
        <div class="sc-note">
          子时横跨午夜，已拆为<em>早子时（00:00–01:00）</em>与<em>晚子时（23:00–24:00）</em>两段：
          早子时算<em>当天</em>（日柱 ${data.dayGanZhi}）；晚子时虽挂在当天夜里，但时干支、黄黑道神煞按
          <em>次日 ${data.nextDayGanZhi} 日柱</em>推算，即“子时朝夜”派的排法。
        </div>
      </div>`;
    body.appendChild(summary);

    // 最吉 / 最凶（前置）
    const extremeWrap = document.createElement('div');
    extremeWrap.innerHTML = renderExtremeCard(data);
    body.appendChild(extremeWrap.firstElementChild as HTMLElement);

    // 时辰表
    const tableCard = createElement('div', 'card');
    const h3 = createElement('h3', '', '全天十二时辰（子时拆分，共 13 段）');
    const wrap = createElement('div', 'sc-table-wrap');
    const table = document.createElement('table');
    table.className = 'sc-table';
    table.innerHTML = `
      <thead><tr>
        <th>时辰</th><th>钟头</th><th>时干支</th><th>值神 / 吉凶</th>
        <th>宜</th><th>忌</th><th>冲生肖</th><th>煞方</th>
      </tr></thead>
      <tbody>
        ${data.slots.map((s) => `
          <tr class="sc-luck-${s.luck}${s.id === 'wan-zi' ? ' sc-wanzi' : ''}">
            <td class="sc-name">${s.label}
              ${s.dayOffset === 1 ? '<small class="sc-wan-flag">归次日</small>' : ''}
            </td>
            <td>${s.clockRange}</td>
            <td class="sc-gz">${s.ganZhi}</td>
            <td class="sc-god">${s.god}<span class="luck ${s.luck}">${s.luck}</span></td>
            <td class="sc-yiji yi">${tagsHtml(s.yi, 'yi')}</td>
            <td class="sc-yiji ji">${tagsHtml(s.ji, 'ji')}</td>
            <td class="sc-chong">冲<b>${s.chongShengxiao}</b>（${s.chongZhi}）</td>
            <td class="sc-chong">煞<span class="sha">${s.sha}</span></td>
          </tr>`).join('')}
      </tbody>`;
    wrap.appendChild(table);
    tableCard.append(h3, wrap);
    body.appendChild(tableCard);

    // 宜忌合并对照
    const groupCard = createElement('div', 'card');
    groupCard.appendChild(createElement('h3', '', '宜忌时辰对照（多时辰撞同一事项已合并）'));
    const yiGroups = data.yiJiGroups.filter((g) => g.kind === 'yi');
    const jiGroups = data.yiJiGroups.filter((g) => g.kind === 'ji');
    const groupHtml = (groups: typeof yiGroups, cls: string, title: string) => `
      <div class="sc-group-col ${cls}">
        <h4>${title}</h4>
        ${groups.map((g) => `
          <div class="sc-gitem"><span class="gname">${g.item}</span>
          <span class="gslots">${g.slots.join('、')}</span></div>`).join('')}
      </div>`;
    const groupsBox = createElement('div', 'sc-groups');
    groupsBox.innerHTML = groupHtml(yiGroups, 'yi', '宜（事项 → 可行时辰）')
      + groupHtml(jiGroups, 'ji', '忌（事项 → 当避时辰）');
    groupCard.appendChild(groupsBox);
    body.appendChild(groupCard);
  }

  // 基础数据编辑器
  const editor = createElement('details', 'sc-no-print');
  const editorSummary = document.createElement('summary');
  editorSummary.textContent = '⚙ 基础数据编辑（改神煞宜忌后整表重算）';
  const editorGrid = createElement('div', 'sc-editor-grid');
  for (const god of HUANG_HEI_GODS) {
    const item = createElement('div', 'sc-god-edit');
    item.innerHTML = `
      <div><b>${god}</b></div>
      <label class="yi">宜（逗号分隔）</label>
      <input data-god="${god}" data-kind="yi" value="${godYiJi[god].yi.join('，')}">
      <label class="ji">忌（逗号分隔）</label>
      <input data-god="${god}" data-kind="ji" value="${godYiJi[god].ji.join('，')}">
    `;
    editorGrid.appendChild(item);
  }
  const actions = createElement('div', 'sc-editor-actions');
  const applyBtn = createElement('button', 'sc-btn', '应用并重算');
  const resetBtn = createElement('button', 'sc-btn secondary', '恢复默认数据');
  actions.append(applyBtn, resetBtn);
  editor.append(editorSummary, editorGrid, actions);

  applyBtn.addEventListener('click', () => {
    editorGrid.querySelectorAll('input').forEach((input) => {
      const el = input as HTMLInputElement;
      const god = el.dataset.god as GodName;
      const kind = el.dataset.kind as 'yi' | 'ji';
      const list = el.value.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
      godYiJi[god][kind] = [...new Set(list)];
    });
    rerender();
  });
  resetBtn.addEventListener('click', () => {
    godYiJi = cloneData(GOD_YIJI_DEFAULT);
    editorGrid.querySelectorAll('input').forEach((input) => {
      const el = input as HTMLInputElement;
      const god = el.dataset.god as GodName;
      const kind = el.dataset.kind as 'yi' | 'ji';
      el.value = godYiJi[god][kind].join('，');
    });
    rerender();
  });

  prevBtn.addEventListener('click', () => shiftDate(-1));
  nextBtn.addEventListener('click', () => shiftDate(1));
  dateInput.addEventListener('change', () => rerender());

  function shiftDate(delta: number) {
    const [cy, cm, cd] = curDate();
    const dt = new Date(cy, cm - 1, cd + delta);
    dateInput.value = toDateStr(dt);
    rerender();
  }

  app.append(header, toolbar, body, editor);
  rerender();
}

function cloneData(src: Record<GodName, GodYiJi>): Record<GodName, GodYiJi> {
  return JSON.parse(JSON.stringify(src));
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m, d];
}

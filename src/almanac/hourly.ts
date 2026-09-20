import { TIAN_GAN, DI_ZHI, SHENG_XIAO, CHONG_SHA } from './constants';
import { getDayGanZhi } from './lunar';
import { gregorianToJDN } from '../utils/date';

/* ==================== 基础数据 ====================
 * 以下几张表是时辰吉凶表的全部基础数据。
 * getDayHours 每次调用都实时读取这些表重算整张表，
 * 改动任意一张表（值神、宜忌、起时规则等）后整张表跟着重算。
 */

// 十二值神（黄道吉神 / 黑道凶神），按时辰顺序循环排列
export interface HourGod {
  name: string;
  luck: '吉' | '凶';
  weight: number; // 吉凶力度，用于评选当日最吉 / 最凶时辰
}

export const HOUR_GODS: HourGod[] = [
  { name: '青龙', luck: '吉', weight: 5 },
  { name: '明堂', luck: '吉', weight: 4 },
  { name: '天刑', luck: '凶', weight: -3 },
  { name: '朱雀', luck: '凶', weight: -3 },
  { name: '金匮', luck: '吉', weight: 4 },
  { name: '天德', luck: '吉', weight: 5 },
  { name: '白虎', luck: '凶', weight: -5 },
  { name: '玉堂', luck: '吉', weight: 4 },
  { name: '天牢', luck: '凶', weight: -3 },
  { name: '玄武', luck: '凶', weight: -4 },
  { name: '司命', luck: '吉', weight: 4 },
  { name: '勾陈', luck: '凶', weight: -4 },
];

// 青龙起时表：日支 -> 青龙所临时辰的地支序号
// 子午日起申，丑未日起戌，寅申日起子，卯酉日起寅，辰戌日起辰，巳亥日起午
export const QING_LONG_START: Record<string, number> = {
  '子': 8, '午': 8,
  '丑': 10, '未': 10,
  '寅': 0, '申': 0,
  '卯': 2, '酉': 2,
  '辰': 4, '戌': 4,
  '巳': 6, '亥': 6,
};

// 值神宜忌表：性质相近的值神共用同一份宜忌；
// 宜忌完全相同的时辰会被 mergeSameYiJi 合并展示
export const HOUR_GOD_YIJI: Record<string, { yi: string[]; ji: string[] }> = {
  '青龙': { yi: ['祈福', '求嗣', '订婚', '嫁娶', '求财'], ji: ['词讼', '动土'] },
  '明堂': { yi: ['会友', '入学', '修造', '上书'], ji: ['安葬', '破土'] },
  '天刑': { yi: ['破屋', '坏垣', '解除'], ji: ['嫁娶', '出行', '词讼'] },
  '朱雀': { yi: ['祭祀', '沐浴', '扫舍'], ji: ['词讼', '安门', '宴客'] },
  '金匮': { yi: ['求财', '开市', '交易', '立券'], ji: ['开仓', '出货'] },
  '天德': { yi: ['祈福', '求嗣', '订婚', '嫁娶', '求财'], ji: ['词讼', '动土'] },
  '白虎': { yi: ['破屋', '坏垣', '解除'], ji: ['嫁娶', '出行', '词讼'] },
  '玉堂': { yi: ['会友', '入学', '修造', '上书'], ji: ['安葬', '破土'] },
  '天牢': { yi: ['捕捉', '畋猎', '祭祀'], ji: ['开市', '入宅', '嫁娶'] },
  '玄武': { yi: ['祭祀', '沐浴', '扫舍'], ji: ['词讼', '安门', '宴客'] },
  '司命': { yi: ['求财', '开市', '交易', '立券'], ji: ['开仓', '出货'] },
  '勾陈': { yi: ['捕捉', '畋猎', '祭祀'], ji: ['开市', '入宅', '嫁娶'] },
};

// 晚子时归属规则：true = 晚子时（23:00-24:00）归次日，
// 时柱干支与值神都按次日的日干、日支推算（传统"夜子时属明日"）
export const LATE_ZI_BELONGS_TO_NEXT_DAY = true;

/* ==================== 类型 ==================== */

export interface HourInfo {
  name: string;            // 时辰名：早子时 / 丑时 / … / 晚子时
  zhi: string;             // 时支
  range: string;           // 时段，如 01:00-03:00
  startHour: number;       // 起始钟点（0-23）
  ganZhi: string;          // 时柱干支
  god: string;             // 值神
  luck: '吉' | '凶';       // 黄道吉 / 黑道凶
  weight: number;          // 吉凶力度
  yi: string[];            // 宜
  ji: string[];            // 忌
  chongZhi: string;        // 相冲地支
  chongShengxiao: string;  // 相冲生肖
  sha: string;             // 煞方
  belongsToNextDay: boolean; // 是否归次日（晚子时）
  dayGanZhi: string;       // 本时辰所属日的日柱（晚子时为次日日柱）
}

export interface YiJiGroup {
  yi: string[];
  ji: string[];
  hours: HourInfo[];
}

export interface DayHours {
  year: number;
  month: number;
  day: number;
  dayGanZhi: string;       // 当日日柱
  nextDayGanZhi: string;   // 次日日柱（晚子时归属说明用）
  lateZiNextDay: boolean;  // 晚子时是否归次日
  hours: HourInfo[];       // 13 行：早子时 + 丑~亥 + 晚子时
  best: HourInfo[];        // 最吉时辰（可能并列）
  worst: HourInfo[];       // 最凶时辰（可能并列）
  merged: YiJiGroup[];     // 宜忌相同的合并组（≥2 个时辰）
}

/* ==================== 计算 ==================== */

const pad2 = (n: number) => String(n).padStart(2, '0');

// 单个时辰：dayGanZhi 为该时辰所属日的日柱（晚子时传次日日柱）
function buildHour(
  dayGanZhi: string,
  zhiIndex: number,
  name: string,
  range: string,
  startHour: number,
  belongsToNextDay: boolean
): HourInfo {
  const dayGanIndex = TIAN_GAN.indexOf(dayGanZhi[0]);
  const dayZhi = dayGanZhi[1];

  // 时柱：五鼠遁，日干起时干（甲己还加甲，乙庚丙作初……）
  const hourGan = TIAN_GAN[((dayGanIndex % 5) * 2 + zhiIndex) % 10];
  const zhi = DI_ZHI[zhiIndex];

  // 值神：青龙起时表定位后按十二值神顺排
  const start = QING_LONG_START[dayZhi] ?? 0;
  const god = HOUR_GODS[(zhiIndex - start + 12) % 12];

  // 宜忌
  const yiji = HOUR_GOD_YIJI[god.name] || { yi: [], ji: [] };

  // 冲煞：时支相冲的生肖与煞方
  const chongSha = CHONG_SHA[zhi] || { chong: '', sha: '' };
  const chongShengxiao = SHENG_XIAO[DI_ZHI.indexOf(chongSha.chong)] || '';

  return {
    name,
    zhi,
    range,
    startHour,
    ganZhi: hourGan + zhi,
    god: god.name,
    luck: god.luck,
    weight: god.weight,
    yi: [...yiji.yi],
    ji: [...yiji.ji],
    chongZhi: chongSha.chong,
    chongShengxiao,
    sha: chongSha.sha,
    belongsToNextDay,
    dayGanZhi
  };
}

// 按公历日期算出一整天的时辰吉凶表（早晚子时分开，共 13 行）
export function getDayHours(year: number, month: number, day: number): DayHours {
  const jdn = gregorianToJDN(year, month, day);
  const dayGanZhi = getDayGanZhi(jdn);
  const nextDayGanZhi = getDayGanZhi(jdn + 1);

  const hours: HourInfo[] = [];

  // 早子时 00:00-01:00，属当日
  hours.push(buildHour(dayGanZhi, 0, '早子时', '00:00-01:00', 0, false));
  // 丑时 ~ 亥时，属当日
  for (let z = 1; z < 12; z++) {
    const start = z * 2 - 1;
    hours.push(buildHour(
      dayGanZhi, z, `${DI_ZHI[z]}时`,
      `${pad2(start)}:00-${pad2(start + 2)}:00`, start, false
    ));
  }
  // 晚子时 23:00-24:00：归次日还是当日由 LATE_ZI_BELONGS_TO_NEXT_DAY 决定
  const lateZiDayGanZhi = LATE_ZI_BELONGS_TO_NEXT_DAY ? nextDayGanZhi : dayGanZhi;
  hours.push(buildHour(
    lateZiDayGanZhi, 0, '晚子时', '23:00-24:00', 23, LATE_ZI_BELONGS_TO_NEXT_DAY
  ));

  // 最吉 / 最凶时辰（按值神力度，允许并列）
  const weights = hours.map(h => h.weight);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const best = hours.filter(h => h.weight === maxWeight);
  const worst = hours.filter(h => h.weight === minWeight);

  // 宜忌撞车的时辰合并
  const merged = mergeSameYiJi(hours);

  return {
    year, month, day,
    dayGanZhi, nextDayGanZhi,
    lateZiNextDay: LATE_ZI_BELONGS_TO_NEXT_DAY,
    hours, best, worst, merged
  };
}

// 宜忌完全相同的时辰合并成组（只返回含 2 个及以上时辰的组）
export function mergeSameYiJi(hours: HourInfo[]): YiJiGroup[] {
  const groups = new Map<string, YiJiGroup>();
  for (const h of hours) {
    const key = `${h.yi.join('、')}|${h.ji.join('、')}`;
    let group = groups.get(key);
    if (!group) {
      group = { yi: h.yi, ji: h.ji, hours: [] };
      groups.set(key, group);
    }
    group.hours.push(h);
  }
  return [...groups.values()].filter(g => g.hours.length > 1);
}

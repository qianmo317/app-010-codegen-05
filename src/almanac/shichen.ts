import { TIAN_GAN, DI_ZHI, SHENG_XIAO } from './constants';
import { gregorianToJDN, jdnToGregorian } from '../utils/date';
import { getDayGanZhi } from './lunar';
import {
  SHICHEN_SLOTS,
  HUANG_HEI_GODS,
  HUANG_GODS,
  GOD_RANK,
  QINGLONG_START,
  GOD_YIJI_DEFAULT,
  CHONG_SHA,
  type GodName,
  type GodYiJi,
} from './shichen-data';

export interface ShichenSlot {
  id: string;
  label: string;       // 时辰名（早子时/丑时/…/晚子时）
  clockRange: string;  // 管的钟头
  ganZhi: string;      // 时干支
  god: GodName;        // 值日星神（黄黑道十二神）
  luck: '吉' | '凶';   // 黄道 / 黑道
  rank: number;        // 神煞位次（越大越吉）
  yi: string[];
  ji: string[];
  chongZhi: string;    // 相冲地支
  chongShengxiao: string; // 冲的生肖
  sha: string;         // 煞方
  dayOffset: 0 | 1;    // 依哪天日柱推算
}

export interface YiJiGroup {
  item: string;
  kind: 'yi' | 'ji';
  slots: string[]; // 撞上同一宜忌的时辰名（已合并）
}

export interface DayShichen {
  year: number;
  month: number;
  day: number;
  dayGanZhi: string;   // 当日日柱
  nextDayGanZhi: string; // 次日日柱（晚子时用）
  slots: ShichenSlot[];
  best: ShichenSlot;   // 最吉时辰
  worst: ShichenSlot;  // 最凶时辰
  yiJiGroups: YiJiGroup[]; // 合并后的宜忌对照
}

// 五鼠遁：日干 → 子时（含晚子时）起时干
// 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
const ZI_HOUR_GAN_START: Record<string, number> = {
  甲: 0, 己: 0,
  乙: 2, 庚: 2,
  丙: 4, 辛: 4,
  丁: 6, 壬: 6,
  戊: 8, 癸: 8,
};

/** 由日柱和时辰地支序号推时干支 */
export function getHourPillar(dayGanZhi: string, zhiIndex: number): string {
  const dayGan = dayGanZhi[0];
  const start = ZI_HOUR_GAN_START[dayGan];
  const ganIndex = (start + zhiIndex) % 10;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/** 由日支与时支查黄黑道神煞（青龙歌诀起法） */
export function getGodAtHour(dayZhi: string, zhiIndex: number): GodName {
  const qinglongAt = QINGLONG_START[dayZhi];
  const godIndex = (zhiIndex - qinglongAt + 12) % 12;
  return HUANG_HEI_GODS[godIndex];
}

/**
 * 计算公历某一天全部 13 个时辰段（早晚子时拆开）。
 * @param godYiJi 神煞宜忌基础数据，默认取 GOD_YIJI_DEFAULT，可传入编辑后的数据触发整表重算
 */
export function getDayShichen(
  year: number,
  month: number,
  day: number,
  godYiJi: Record<GodName, GodYiJi> = GOD_YIJI_DEFAULT,
): DayShichen {
  const jdn = gregorianToJDN(year, month, day);
  const dayGanZhi = getDayGanZhi(jdn);
  const [ny, nm, nd] = jdnToGregorian(jdn + 1);
  const nextDayGanZhi = getDayGanZhi(gregorianToJDN(ny, nm, nd));

  const slots: ShichenSlot[] = SHICHEN_SLOTS.map((def) => {
    const pillarDay = def.dayOffset === 1 ? nextDayGanZhi : dayGanZhi;
    const ganZhi = getHourPillar(pillarDay, def.zhiIndex);
    const god = getGodAtHour(pillarDay[1], def.zhiIndex);
    const luck: '吉' | '凶' = HUANG_GODS.includes(god) ? '吉' : '凶';
    const { yi, ji } = godYiJi[god];
    const chongSha = CHONG_SHA[DI_ZHI[def.zhiIndex]];
    const chongShengxiao = SHENG_XIAO[DI_ZHI.indexOf(chongSha.chong)];

    return {
      id: def.id,
      label: def.label,
      clockRange: def.clockRange,
      ganZhi,
      god,
      luck,
      rank: GOD_RANK[god],
      yi: [...yi],
      ji: [...ji],
      chongZhi: chongSha.chong,
      chongShengxiao,
      sha: chongSha.sha,
      dayOffset: def.dayOffset,
    };
  });

  let best = slots[0];
  let worst = slots[0];
  for (const slot of slots) {
    if (slot.rank > best.rank) best = slot;
    if (slot.rank < worst.rank) worst = slot;
  }

  return {
    year,
    month,
    day,
    dayGanZhi,
    nextDayGanZhi,
    slots,
    best,
    worst,
    yiJiGroups: mergeYiJi(slots),
  };
}

/** 把多个时辰撞上的同一条宜/忌合并：事项 → 时辰列表 */
export function mergeYiJi(slots: ShichenSlot[]): YiJiGroup[] {
  const map = new Map<string, YiJiGroup>();
  for (const slot of slots) {
    for (const item of slot.yi) {
      const key = `yi:${item}`;
      if (!map.has(key)) map.set(key, { item, kind: 'yi', slots: [] });
      map.get(key)!.slots.push(slot.label);
    }
    for (const item of slot.ji) {
      const key = `ji:${item}`;
      if (!map.has(key)) map.set(key, { item, kind: 'ji', slots: [] });
      map.get(key)!.slots.push(slot.label);
    }
  }
  // 宜在前、忌在后；同组内按时辰出现的时辰段多的排前
  return [...map.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'yi' ? -1 : 1;
    if (b.slots.length !== a.slots.length) return b.slots.length - a.slots.length;
    return a.item.localeCompare(b.item, 'zh-Hans-CN');
  });
}

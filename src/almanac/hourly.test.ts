import { describe, it, expect } from 'vitest';
import {
  getDayHours, mergeSameYiJi,
  HOUR_GODS, HOUR_GOD_YIJI, QING_LONG_START
} from './hourly';

// 2024-01-01 为甲子日（见 lunar.test.ts），次日为乙丑日
describe('时辰吉凶表', () => {
  it('应返回13行（早晚子时分开）', () => {
    const t = getDayHours(2024, 1, 1);
    expect(t.hours).toHaveLength(13);
    expect(t.hours[0].name).toBe('早子时');
    expect(t.hours[0].range).toBe('00:00-01:00');
    expect(t.hours[12].name).toBe('晚子时');
    expect(t.hours[12].range).toBe('23:00-24:00');
    // 中间 11 个时辰各管两个钟头
    expect(t.hours[1].name).toBe('丑时');
    expect(t.hours[1].range).toBe('01:00-03:00');
    expect(t.hours[11].name).toBe('亥时');
    expect(t.hours[11].range).toBe('21:00-23:00');
  });

  it('早晚子时应分别挂当天和第二天', () => {
    const t = getDayHours(2024, 1, 1); // 甲子日，次日乙丑日
    const earlyZi = t.hours[0];
    const lateZi = t.hours[12];

    // 早子时属当日：甲己日起甲子
    expect(earlyZi.ganZhi).toBe('甲子');
    expect(earlyZi.belongsToNextDay).toBe(false);
    expect(earlyZi.dayGanZhi).toBe('甲子');

    // 晚子时归次日：按次日乙丑日的日干起时柱（乙庚日起丙子）
    expect(lateZi.ganZhi).toBe('丙子');
    expect(lateZi.belongsToNextDay).toBe(true);
    expect(lateZi.dayGanZhi).toBe('乙丑');
    expect(t.lateZiNextDay).toBe(true);
  });

  it('应按日柱排值神（甲子日青龙起申）', () => {
    const t = getDayHours(2024, 1, 1);
    const godOf = (name: string) => t.hours.find(h => h.name === name)!.god;
    expect(godOf('申时')).toBe('青龙');
    expect(godOf('早子时')).toBe('金匮');
    expect(godOf('丑时')).toBe('天德');
    // 晚子时随次日乙丑日：丑日青龙起戌，子时为天刑
    expect(godOf('晚子时')).toBe('天刑');
  });

  it('应标出冲生肖和煞方', () => {
    const t = getDayHours(2024, 1, 1);
    const zi = t.hours[0];
    expect(zi.chongShengxiao).toBe('马');
    expect(zi.chongZhi).toBe('午');
    expect(zi.sha).toBe('南');
    const wu = t.hours.find(h => h.name === '午时')!;
    expect(wu.chongShengxiao).toBe('鼠');
    expect(wu.sha).toBe('北');
  });

  it('相邻两个时辰的行不能完全一样', () => {
    const dates: [number, number, number][] = [
      [2024, 1, 1], [2025, 6, 15], [2026, 9, 20], [2024, 12, 31]
    ];
    for (const [y, m, d] of dates) {
      const t = getDayHours(y, m, d);
      for (let i = 0; i < t.hours.length - 1; i++) {
        const a = t.hours[i];
        const b = t.hours[i + 1];
        const sigA = `${a.ganZhi}|${a.god}|${a.yi}|${a.ji}|${a.chongZhi}|${a.sha}`;
        const sigB = `${b.ganZhi}|${b.god}|${b.yi}|${b.ji}|${b.chongZhi}|${b.sha}`;
        expect(sigA).not.toBe(sigB);
      }
    }
  });

  it('应挑出最吉和最凶的时辰', () => {
    const t = getDayHours(2024, 1, 1);
    // 甲子日：青龙(申时)、天德(丑时)力度最大，白虎(寅时)最凶
    expect(t.best.map(h => h.name).sort()).toEqual(['丑时', '申时']);
    expect(t.worst.map(h => h.name)).toEqual(['寅时']);
    t.best.forEach(h => expect(h.luck).toBe('吉'));
    t.worst.forEach(h => expect(h.luck).toBe('凶'));
    expect(t.best[0].weight).toBeGreaterThan(0);
    expect(t.worst[0].weight).toBeLessThan(0);
  });

  it('宜忌撞车的时辰应合并成组', () => {
    const t = getDayHours(2024, 1, 1);
    expect(t.merged.length).toBeGreaterThanOrEqual(2);
    for (const g of t.merged) {
      expect(g.hours.length).toBeGreaterThanOrEqual(2);
      // 组内每个时辰的宜忌与组一致
      for (const h of g.hours) {
        expect(h.yi).toEqual(g.yi);
        expect(h.ji).toEqual(g.ji);
      }
    }
    // 每个时辰最多出现在一个组里
    const all = t.merged.flatMap(g => g.hours.map(h => h.name));
    expect(new Set(all).size).toBe(all.length);
    // 早晚子时分开算，不应被合并到同一组
    for (const g of t.merged) {
      const names = g.hours.map(h => h.name);
      expect(names.includes('早子时') && names.includes('晚子时')).toBe(false);
    }
  });

  it('mergeSameYiJi 只保留撞车的组', () => {
    const t = getDayHours(2026, 9, 20);
    const groups = mergeSameYiJi(t.hours);
    expect(groups.every(g => g.hours.length >= 2)).toBe(true);
  });

  it('改动基础数据后整张表应跟着重算', () => {
    const before = getDayHours(2024, 1, 1);
    const shen = before.hours.find(h => h.name === '申时')!;
    expect(shen.god).toBe('青龙');
    const oldYi = shen.yi.join('、');

    // 改值神宜忌表 -> 重算后申时宜忌跟着变
    const backupYiJi = HOUR_GOD_YIJI['青龙'];
    HOUR_GOD_YIJI['青龙'] = { yi: ['测试宜'], ji: ['测试忌'] };
    try {
      const after = getDayHours(2024, 1, 1);
      const shen2 = after.hours.find(h => h.name === '申时')!;
      expect(shen2.yi.join('、')).toBe('测试宜');
      expect(shen2.yi.join('、')).not.toBe(oldYi);
    } finally {
      HOUR_GOD_YIJI['青龙'] = backupYiJi;
    }

    // 改值神力度 -> 最吉时辰跟着变
    const qinglong = HOUR_GODS.find(g => g.name === '青龙')!;
    const backupWeight = qinglong.weight;
    qinglong.weight = 99;
    try {
      const after = getDayHours(2024, 1, 1);
      expect(after.best.map(h => h.name)).toEqual(['申时']);
    } finally {
      qinglong.weight = backupWeight;
    }

    // 改青龙起时表 -> 值神分布跟着变
    const backupStart = QING_LONG_START['子'];
    QING_LONG_START['子'] = 0;
    try {
      const after = getDayHours(2024, 1, 1);
      expect(after.hours[0].god).toBe('青龙');
    } finally {
      QING_LONG_START['子'] = backupStart;
    }

    // 恢复后应与最初一致
    const restored = getDayHours(2024, 1, 1);
    expect(restored.hours.find(h => h.name === '申时')!.yi.join('、')).toBe(oldYi);
  });
});

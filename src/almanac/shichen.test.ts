import { describe, it, expect } from 'vitest';
import { getDayShichen, getHourPillar, getGodAtHour } from './shichen';
import { getDayGanZhi } from './lunar';
import { gregorianToJDN } from '../utils/date';
import { GOD_YIJI_DEFAULT } from './shichen-data';

describe('日柱推算', () => {
  it('已知锚点日柱正确', () => {
    // 2024-01-01 = 甲子日；1949-10-01 = 甲子日
    expect(getDayGanZhi(gregorianToJDN(2024, 1, 1))).toBe('甲子');
    expect(getDayGanZhi(gregorianToJDN(1949, 10, 1))).toBe('甲子');
  });
});

describe('五鼠遁时柱', () => {
  it('甲日子时起甲子、丑时乙丑', () => {
    expect(getHourPillar('甲子', 0)).toBe('甲子');
    expect(getHourPillar('甲子', 1)).toBe('乙丑');
    expect(getHourPillar('甲子', 6)).toBe('庚午');
  });
  it('乙日丙子起', () => {
    expect(getHourPillar('乙丑', 0)).toBe('丙子');
  });
  it('癸日壬子起', () => {
    expect(getHourPillar('癸亥', 0)).toBe('壬子');
  });
});

describe('黄黑道起法', () => {
  it('子日青龙在申时', () => {
    expect(getGodAtHour('子', 8)).toBe('青龙');
    expect(getGodAtHour('子', 9)).toBe('明堂');
    expect(getGodAtHour('子', 0)).toBe('金匮');
  });
  it('子日十二时辰恰轮完十二神', () => {
    const gods = [...Array(12).keys()].map((z) => getGodAtHour('子', z));
    expect(new Set(gods).size).toBe(12);
  });
});

describe('整日时辰表', () => {
  const day = getDayShichen(2024, 1, 1); // 甲子日

  it('返回 13 段（早晚子时拆开）', () => {
    expect(day.slots).toHaveLength(13);
    expect(day.slots[0].label).toBe('早子时');
    expect(day.slots[12].label).toBe('晚子时');
  });

  it('覆盖完整 24 小时', () => {
    expect(day.slots[0].clockRange).toBe('00:00–01:00');
    expect(day.slots[12].clockRange).toBe('23:00–24:00');
  });

  it('甲子日各时干支正确', () => {
    expect(day.slots[0].ganZhi).toBe('甲子');
    expect(day.slots[1].ganZhi).toBe('乙丑');
    expect(day.slots[6].ganZhi).toBe('庚午');
    expect(day.slots[11].ganZhi).toBe('乙亥');
  });

  it('晚子时归属次日：用乙丑日柱推时柱，神煞也按次日日支', () => {
    const wan = day.slots[12];
    expect(wan.dayOffset).toBe(1);
    expect(day.nextDayGanZhi).toBe('乙丑');
    // 乙日子时起丙子
    expect(wan.ganZhi).toBe('丙子');
    // 丑日青龙在戌（序号10），子时序号0：godIndex=(0-10+12)%12=2 → 天刑
    expect(wan.god).toBe('天刑');
  });

  it('早子时归属当天', () => {
    expect(day.slots[0].dayOffset).toBe(0);
    expect(day.slots[0].ganZhi).toBe('甲子');
  });

  it('冲煞按时支：子时冲马煞南，午时冲鼠煞北', () => {
    expect(day.slots[0].chongShengxiao).toBe('马');
    expect(day.slots[0].chongZhi).toBe('午');
    expect(day.slots[0].sha).toBe('南');
    expect(day.slots[6].chongShengxiao).toBe('鼠');
    expect(day.slots[6].sha).toBe('北');
  });

  it('丑时冲羊煞东', () => {
    expect(day.slots[1].chongShengxiao).toBe('羊');
    expect(day.slots[1].sha).toBe('东');
  });

  it('每段都有神煞、宜忌、吉凶', () => {
    for (const s of day.slots) {
      expect(s.god).toBeTruthy();
      expect(['吉', '凶']).toContain(s.luck);
      expect(s.yi.length + s.ji.length).toBeGreaterThan(0);
    }
  });

  it('黄道六神为吉、黑道六神为凶', () => {
    for (const s of day.slots) {
      const isHuang = ['青龙', '明堂', '金匮', '天德', '玉堂', '司命'].includes(s.god);
      expect(s.luck).toBe(isHuang ? '吉' : '凶');
    }
  });

  it('相邻时辰表内容不一样（干支、神煞至少一项不同，且神煞沿顺序轮替）', () => {
    for (let i = 1; i < day.slots.length; i++) {
      const a = day.slots[i - 1];
      const b = day.slots[i];
      const different = a.ganZhi !== b.ganZhi || a.god !== b.god || a.clockRange !== b.clockRange;
      expect(different).toBe(true);
    }
    // 前 12 段（早子→亥）十二神应各不相同
    const gods = day.slots.slice(0, 12).map((s) => s.god);
    expect(new Set(gods).size).toBe(12);
  });

  it('最吉为青龙、最凶为勾陈（十二神一天一轮）', () => {
    expect(day.best.god).toBe('青龙');
    expect(day.best.luck).toBe('吉');
    expect(day.worst.god).toBe('勾陈');
    expect(day.worst.luck).toBe('凶');
  });
});

describe('宜忌合并', () => {
  it('同一事项命中多个时辰时合并为一条并列出时辰', () => {
    const day = getDayShichen(2024, 1, 1);
    const jiaqu = day.yiJiGroups.find((g) => g.kind === 'yi' && g.item === '嫁娶');
    expect(jiaqu).toBeTruthy();
    // 青龙、金匮、天德、玉堂皆宜嫁娶（>1 个时辰）
    expect(jiaqu!.slots.length).toBeGreaterThan(1);
  });

  it('宜组排在忌组前', () => {
    const day = getDayShichen(2024, 1, 1);
    const firstJi = day.yiJiGroups.findIndex((g) => g.kind === 'ji');
    const lastYi = day.yiJiGroups.map((g) => g.kind).lastIndexOf('yi');
    expect(lastYi).toBeLessThan(firstJi);
  });

  it('合并结果与各时辰宜忌总量一致', () => {
    const day = getDayShichen(2024, 1, 1);
    let yiCount = 0;
    let jiCount = 0;
    for (const s of day.slots) {
      yiCount += s.yi.length;
      jiCount += s.ji.length;
    }
    const groupYi = day.yiJiGroups.filter((g) => g.kind === 'yi').reduce((n, g) => n + g.slots.length, 0);
    const groupJi = day.yiJiGroups.filter((g) => g.kind === 'ji').reduce((n, g) => n + g.slots.length, 0);
    expect(groupYi).toBe(yiCount);
    expect(groupJi).toBe(jiCount);
  });
});

describe('基础数据改动后整表重算', () => {
  it('修改神煞宜忌数据后重新计算即生效', () => {
    const custom = JSON.parse(JSON.stringify(GOD_YIJI_DEFAULT));
    custom.青龙.yi = ['自定义事项'];
    const day = getDayShichen(2024, 1, 1, custom);
    // 甲子日青龙在申时（slots[8]）
    expect(day.slots[8].god).toBe('青龙');
    expect(day.slots[8].yi).toEqual(['自定义事项']);
    // 合并组也应同步更新
    expect(day.yiJiGroups.some((g) => g.item === '自定义事项')).toBe(true);
    expect(day.yiJiGroups.some((g) => g.item === '嫁娶' && g.slots.includes('申时'))).toBe(false);
  });
});

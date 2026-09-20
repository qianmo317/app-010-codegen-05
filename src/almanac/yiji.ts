import { DI_ZHI, CHONG_SHA } from './constants';
import { getDayGanZhi, solarToLunar } from './lunar';
import { gregorianToJDN } from '../utils/date';

// 十二建星
const JIAN_XING = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];

// 建除十二神对应月份
const JIAN_XING_MONTH_START: Record<string, number> = {
  '寅': 0, '卯': 1, '辰': 2, '巳': 3, '午': 4, '未': 5,
  '申': 6, '酉': 7, '戌': 8, '亥': 9, '子': 10, '丑': 11
};

// 十二值日星神
const ZHI_SHEN_CYCLE = ['青龙', '明堂', '天刑', '朱雀', '金匮', '天德', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陈'];

// 宜忌数据库（基于日柱和十二建星）
const YI_JI_DB: Record<string, { yi: string[]; ji: string[] }> = {
  '建': {
    yi: ['出行', '上任', '会友', '上书', '见工'],
    ji: ['动土', '开仓', '嫁娶', '纳采']
  },
  '除': {
    yi: ['除服', '疗病', '出行', '拆卸', '入宅'],
    ji: ['求官', '上任', '开张', '搬家', '探访']
  },
  '满': {
    yi: ['修造', '破土', '安葬', '祈福', '嫁娶'],
    ji: ['造庙', '安床']
  },
  '平': {
    yi: ['修造', '破土', '安葬', '嫁娶', '立券'],
    ji: ['祈福', '求嗣']
  },
  '定': {
    yi: ['嫁娶', '祭祀', '祈福', '求嗣', '开光'],
    ji: ['词讼', '出行', '谈判']
  },
  '执': {
    yi: ['祭祀', '祈福', '酬神', '上书', '订婚'],
    ji: ['嫁娶', '安葬', '开市']
  },
  '破': {
    yi: ['祭祀', '祈福', '求嗣', '斋醮', '沐浴'],
    ji: ['嫁娶', '签约', '开市', '出行', '入宅']
  },
  '危': {
    yi: ['安床', '祭祀', '祈福', '入殓', '移柩'],
    ji: ['嫁娶', '开市', '安葬']
  },
  '成': {
    yi: ['开市', '嫁娶', '祭祀', '祈福', '入学'],
    ji: ['词讼', '安门', '作灶']
  },
  '收': {
    yi: ['祭祀', '求财', '签约', '嫁娶', '订盟'],
    ji: ['安葬', '开市', '动土', '出行']
  },
  '开': {
    yi: ['祭祀', '祈福', '入学', '上任', '修造'],
    ji: ['安葬', '动土', '嫁娶']
  },
  '闭': {
    yi: ['祭祀', '祈福', '求嗣', '斋醮', '订盟'],
    ji: ['开市', '出行', '安葬', '破土']
  }
};

// 扩展宜忌（基于日柱天干地支）
const GAN_YI_JI: Record<string, { yi: string[]; ji: string[] }> = {
  '甲': { yi: ['祭祀', '祈福', '求嗣', '开光'], ji: ['开仓', '出货'] },
  '乙': { yi: ['祭祀', '祈福', '求嗣', '斋醮'], ji: ['栽种', '伐木'] },
  '丙': { yi: ['修造', '动土', '竖柱', '上梁'], ji: ['修灶', '作灶'] },
  '丁': { yi: ['嫁娶', '祭祀', '祈福', '入学'], ji: ['剃头', '剪发'] },
  '戊': { yi: ['祭祀', '祈福', '求嗣', '开光'], ji: ['受田', '纳畜'] },
  '己': { yi: ['祭祀', '祈福', '求嗣', '斋醮'], ji: ['破券', '交易'] },
  '庚': { yi: ['祭祀', '祈福', '求嗣', '开光'], ji: ['经络', '织机'] },
  '辛': { yi: ['祭祀', '祈福', '求嗣', '斋醮'], ji: ['合酱', '酿酒'] },
  '壬': { yi: ['祭祀', '祈福', '求嗣', '开光'], ji: ['泱水', '开渠'] },
  '癸': { yi: ['祭祀', '祈福', '求嗣', '斋醮'], ji: ['词讼', '争讼'] }
};

const ZHI_YI_JI: Record<string, { yi: string[]; ji: string[] }> = {
  '子': { yi: ['祭祀', '祈福', '求嗣'], ji: ['问卜', '占卦'] },
  '丑': { yi: ['祭祀', '祈福', '求嗣'], ji: ['冠带', '更衣'] },
  '寅': { yi: ['祭祀', '祈福', '求嗣'], ji: ['祭祀', '祈神'] },
  '卯': { yi: ['祭祀', '祈福', '求嗣'], ji: ['穿井', '开渠'] },
  '辰': { yi: ['祭祀', '祈福', '求嗣'], ji: ['哭泣', '哀伤'] },
  '巳': { yi: ['祭祀', '祈福', '求嗣'], ji: ['远行', '出游'] },
  '午': { yi: ['祭祀', '祈福', '求嗣'], ji: ['苫盖', '盖屋'] },
  '未': { yi: ['祭祀', '祈福', '求嗣'], ji: ['服药', '进药'] },
  '申': { yi: ['祭祀', '祈福', '求嗣'], ji: ['安床', '移床'] },
  '酉': { yi: ['祭祀', '祈福', '求嗣'], ji: ['宴客', '会饮'] },
  '戌': { yi: ['祭祀', '祈福', '求嗣'], ji: ['食犬', '屠狗'] },
  '亥': { yi: ['祭祀', '祈福', '求嗣'], ji: ['嫁娶', '纳采'] }
};

// 事项权重（用于择日评分）
export const EVENT_WEIGHTS: Record<string, { yi: number; ji: number }> = {
  '嫁娶': { yi: 10, ji: -10 },
  '搬家': { yi: 8, ji: -8 },
  '动土': { yi: 9, ji: -9 },
  '开业': { yi: 9, ji: -9 },
  '出行': { yi: 7, ji: -7 },
  '安葬': { yi: 10, ji: -10 },
  '祭祀': { yi: 6, ji: -6 }
};

// 冲煞表已移至 constants.ts 统一维护

export interface DayYiJi {
  yi: string[];
  ji: string[];
  jianXing: string;
  zhiShen: string;
  chong: string;
  sha: string;
  chongShengxiao: string;
  pengZuTian: string;
  pengZuDi: string;
}

export function getDayYiJi(year: number, month: number, day: number): DayYiJi {
  const jdn = gregorianToJDN(year, month, day);
  const dayGanZhi = getDayGanZhi(jdn);
  const gan = dayGanZhi[0];
  const zhi = dayGanZhi[1];

  // 计算十二建星
  const lunar = solarToLunar(year, month, day);
  const monthZhi = DI_ZHI[(lunar.year - 4) % 12];
  const monthStart = JIAN_XING_MONTH_START[monthZhi] || 0;
  const jianXingIndex = (monthStart + lunar.day - 1) % 12;
  const jianXing = JIAN_XING[jianXingIndex];

  // 计算值日星神（按日柱循环）
  const zhiShenIndex = (jdn + 1) % 12;
  const zhiShen = ZHI_SHEN_CYCLE[zhiShenIndex];

  // 获取宜忌
  const baseYiJi = YI_JI_DB[jianXing] || { yi: [], ji: [] };
  const ganYiJi = GAN_YI_JI[gan] || { yi: [], ji: [] };
  const zhiYiJi = ZHI_YI_JI[zhi] || { yi: [], ji: [] };

  // 合并宜忌
  const yi = [...new Set([...baseYiJi.yi, ...ganYiJi.yi, ...zhiYiJi.yi])];
  const ji = [...new Set([...baseYiJi.ji, ...ganYiJi.ji, ...zhiYiJi.ji])];

  // 冲煞
  const chongSha = CHONG_SHA[zhi] || { chong: '', sha: '' };
  const chongShengxiaoIndex = DI_ZHI.indexOf(chongSha.chong);
  const chongShengxiao = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'][chongShengxiaoIndex];

  // 彭祖百忌
  const pengZuTian = `戊不受田田主不祥`.replace('戊', gan); // 简化版
  const pengZuDi = `辰不哭泣必主重丧`.replace('辰', zhi); // 简化版

  return {
    yi,
    ji,
    jianXing,
    zhiShen,
    chong: chongSha.chong,
    sha: chongSha.sha,
    chongShengxiao: chongShengxiao || '',
    pengZuTian,
    pengZuDi
  };
}

// 择日评分
export function scoreDay(year: number, month: number, day: number, events: string[], avoidShengxiao: string[] = []): number {
  const yiJi = getDayYiJi(year, month, day);
  const jdn = gregorianToJDN(year, month, day);
  const dayGanZhi = getDayGanZhi(jdn);

  let score = 50; // 基础分

  // 根据宜忌计算分数
  for (const event of events) {
    const weight = EVENT_WEIGHTS[event];
    if (weight) {
      if (yiJi.yi.includes(event) || yiJi.yi.some(y => event.includes(y) || y.includes(event))) {
        score += weight.yi;
      }
      if (yiJi.ji.includes(event) || yiJi.ji.some(j => event.includes(j) || j.includes(event))) {
        score += weight.ji;
      }
    }
  }

  // 冲煞惩罚
  if (avoidShengxiao.length > 0) {
    const dayZhi = dayGanZhi[1];
    const chongSha = CHONG_SHA[dayZhi];
    if (chongSha) {
      const chongIndex = DI_ZHI.indexOf(chongSha.chong);
      const chongShengxiao = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'][chongIndex];
      if (avoidShengxiao.includes(chongShengxiao)) {
        score -= 30;
      }
    }
  }

  // 建星影响
  if (yiJi.jianXing === '破' || yiJi.jianXing === '危') {
    score -= 10;
  } else if (yiJi.jianXing === '成' || yiJi.jianXing === '开') {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================
// 时辰吉凶 · 基础数据（唯一数据源，改动后整表自动重算）
// ============================================================

// 十二时辰分段（早晚子时拆分后共 13 段，按当日 00:00 → 24:00 排序）
// dayOffset: 该时辰的干支/神煞依哪天的日柱推算（0=当日，1=次日）
export interface ShichenSlotDef {
  id: string;
  label: string;      // 时辰名称
  zhiIndex: number;   // 对应地支序号（子=0 … 亥=11）
  clockRange: string; // 管的钟头
  dayOffset: 0 | 1;
}

export const SHICHEN_SLOTS: ShichenSlotDef[] = [
  { id: 'zao-zi', label: '早子时', zhiIndex: 0, clockRange: '00:00–01:00', dayOffset: 0 },
  { id: 'chou', label: '丑时', zhiIndex: 1, clockRange: '01:00–03:00', dayOffset: 0 },
  { id: 'yin', label: '寅时', zhiIndex: 2, clockRange: '03:00–05:00', dayOffset: 0 },
  { id: 'mao', label: '卯时', zhiIndex: 3, clockRange: '05:00–07:00', dayOffset: 0 },
  { id: 'chen', label: '辰时', zhiIndex: 4, clockRange: '07:00–09:00', dayOffset: 0 },
  { id: 'si', label: '巳时', zhiIndex: 5, clockRange: '09:00–11:00', dayOffset: 0 },
  { id: 'wu', label: '午时', zhiIndex: 6, clockRange: '11:00–13:00', dayOffset: 0 },
  { id: 'wei', label: '未时', zhiIndex: 7, clockRange: '13:00–15:00', dayOffset: 0 },
  { id: 'shen', label: '申时', zhiIndex: 8, clockRange: '15:00–17:00', dayOffset: 0 },
  { id: 'you', label: '酉时', zhiIndex: 9, clockRange: '17:00–19:00', dayOffset: 0 },
  { id: 'xu', label: '戌时', zhiIndex: 10, clockRange: '19:00–21:00', dayOffset: 0 },
  { id: 'hai', label: '亥时', zhiIndex: 11, clockRange: '21:00–23:00', dayOffset: 0 },
  // 夜子时（23:00–24:00）：民俗“子时朝夜”派，时柱与神煞均归次日
  { id: 'wan-zi', label: '晚子时', zhiIndex: 0, clockRange: '23:00–24:00', dayOffset: 1 },
];

// 黄道黑道十二神（按时辰顺轮的歌诀顺序，黄道黑道在其中交替出现）
// 歌诀：青龙明堂与天刑，朱雀金匮天德神，白虎玉堂天牢黑，玄武司命共勾陈
// 黄道吉神：青龙、明堂、金匮、天德、玉堂、司命
// 黑道凶神：天刑、朱雀、白虎、天牢、玄武、勾陈
export const HUANG_HEI_GODS = [
  '青龙', '明堂', '天刑', '朱雀', '金匮', '天德',
  '白虎', '玉堂', '天牢', '玄武', '司命', '勾陈',
] as const;

export type GodName = (typeof HUANG_HEI_GODS)[number];

export const HUANG_GODS: GodName[] = ['青龙', '明堂', '金匮', '天德', '玉堂', '司命'];

// 神煞吉凶位次：数值越大越吉，用于挑“最吉 / 最凶”（六黄道在前、六黑道在后）
export const GOD_RANK: Record<GodName, number> = {
  青龙: 12, 明堂: 11, 金匮: 10, 天德: 9, 玉堂: 8, 司命: 7,
  天刑: 6, 朱雀: 5, 白虎: 4, 天牢: 3, 玄武: 2, 勾陈: 1,
};

// 黄黑道起法（青龙起时），“子午申宫起，丑未戌宫居，寅申子上立，卯酉寅上求，
// 辰戌龙位上，巳亥午上寻”——键为日支，值为青龙所落时辰的地支序号
export const QINGLONG_START: Record<string, number> = {
  子: 8, 午: 8,   // 申
  丑: 10, 未: 10, // 戌
  寅: 0, 申: 0,   // 子
  卯: 2, 酉: 2,   // 寅
  辰: 4, 戌: 4,   // 辰
  巳: 6, 亥: 6,   // 午
};

// 各神煞的宜、忌（基础数据，可在页面上编辑，编辑后整表重算）
export interface GodYiJi {
  yi: string[];
  ji: string[];
}

export const GOD_YIJI_DEFAULT: Record<GodName, GodYiJi> = {
  青龙: {
    yi: ['祈福', '订婚', '嫁娶', '开市', '安床', '赴任', '出行', '求财'],
    ji: [],
  },
  明堂: {
    yi: ['祭祀', '祈福', '修造', '动土', '上梁', '入宅', '见贵', '上书'],
    ji: ['安葬', '掘井'],
  },
  天刑: {
    yi: ['狩猎', '征伐', '行刑', '讨贼'],
    ji: ['嫁娶', '开市', '出行', '修造', '祈福', '交易'],
  },
  朱雀: {
    yi: ['投书', '上书'],
    ji: ['嫁娶', '远行', '造屋', '安葬', '口舌', '争讼', '宴会'],
  },
  金匮: {
    yi: ['开市', '立券', '交易', '纳财', '嫁娶', '订婚', '祈福'],
    ji: ['诉讼', '争斗'],
  },
  天德: {
    yi: ['祭祀', '祈福', '酬神', '斋醮', '造庙', '开光', '嫁娶', '入学'],
    ji: ['争讼', '处刑'],
  },
  白虎: {
    yi: ['狩猎', '驱邪'],
    ji: ['嫁娶', '安葬', '祭祀', '出行', '移徙', '入宅', '赴任'],
  },
  玉堂: {
    yi: ['祭祀', '祈福', '嫁娶', '入宅', '安床', '修造', '开光', '见贵'],
    ji: ['诉讼', '伐木'],
  },
  天牢: {
    yi: ['筑堤', '设防'],
    ji: ['嫁娶', '开市', '出行', '入宅', '安葬', '祈福', '兴讼'],
  },
  玄武: {
    yi: ['捕捉'],
    ji: ['嫁娶', '开市', '交易', '出行', '祭祀', '祈福', '安床'],
  },
  司命: {
    yi: ['祭祀', '祈福', '作灶', '安床', '入宅', '修造'],
    ji: ['行刑', '劫盗'],
  },
  勾陈: {
    yi: ['捕猎', '勾捕'],
    ji: ['嫁娶', '出行', '开市', '移徙', '栽种', '建造', '赴任'],
  },
};

// 六冲与三煞方位（按时支查；三煞由三合局对冲而来）
// 子辰申→煞南，丑巳酉→煞东，寅午戌→煞北，卯未亥→煞西
export interface ChongSha {
  chong: string;     // 相冲地支
  sha: string;       // 煞方
}

export const CHONG_SHA: Record<string, ChongSha> = {
  子: { chong: '午', sha: '南' },
  丑: { chong: '未', sha: '东' },
  寅: { chong: '申', sha: '北' },
  卯: { chong: '酉', sha: '西' },
  辰: { chong: '戌', sha: '南' },
  巳: { chong: '亥', sha: '东' },
  午: { chong: '子', sha: '北' },
  未: { chong: '丑', sha: '西' },
  申: { chong: '寅', sha: '南' },
  酉: { chong: '卯', sha: '东' },
  戌: { chong: '辰', sha: '北' },
  亥: { chong: '巳', sha: '西' },
};

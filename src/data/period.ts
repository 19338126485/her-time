export interface IPeriodSettings {
  /** 经期持续天数，范围 2-14 */
  periodDays: number;
  /** 月经周期长度（两次开始日间隔），范围 15-100，单位天 */
  cycleLength: number;
  /** 上次月经开始日期，ISO 格式字符串 YYYY-MM-DD */
  lastPeriodDate: string;
}

export interface IPeriodRecord {
  /** 记录唯一标识 */
  id: string;
  /** 月经开始日期，ISO 格式 YYYY-MM-DD */
  startDate: string;
  /** 月经结束日期，ISO 格式 YYYY-MM-DD；若仅标记开始尚未结束则为 null */
  endDate: string | null;
}

export const DEFAULT_SETTINGS: IPeriodSettings = {
  periodDays: 5,
  cycleLength: 28,
  lastPeriodDate: '', // 首次进入为空
};

export const STORAGE_KEY_SETTINGS = 'period-tracker-settings';
export const STORAGE_KEY_RECORDS = 'period-tracker-records';
export const STORAGE_KEY_ONBOARDING = 'period-tracker-onboarding';
export const STORAGE_KEY_DAILY_LOG = 'period-tracker-daily-log';

/** 月经周期规律度 */
export type CycleRegularity = 'regular' | 'irregular' | 'unsure';

/** 痛经程度 */
export type DysmenorrheaLevel = 'none' | 'mild' | 'moderate' | 'severe';

/** 首次进入问卷数据 */
export interface IOnboardingSurvey {
  /** 最近一次月经开始日，YYYY-MM-DD */
  lastPeriodDate: string;
  /** 历史月经开始日列表（不含最近一次），YYYY-MM-DD */
  historyDates: string[];
  /** 周期是否规律 */
  cycleRegularity: CycleRegularity | '';
  /** 痛经情况 */
  dysmenorrhea: DysmenorrheaLevel | '';
  /** 其他补充信息 */
  otherInfo: string;
  /** 是否已完成问卷 */
  completed: boolean;
}

/** 月经周期阶段 */
export type PeriodPhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** 周期阶段显示名称 */
export const PHASE_LABELS: Record<PeriodPhase, string> = {
  menstrual: '月经期',
  follicular: '卵泡期',
  ovulation: '排卵日',
  luteal: '黄体期',
};

/** 周期阶段对应圆点颜色（Tailwind class） */
export const PHASE_DOT_COLORS: Record<PeriodPhase, string> = {
  menstrual: 'bg-pink-300',
  follicular: 'bg-cyan-300',
  ovulation: 'bg-purple-300',
  luteal: 'bg-amber-300',
};

/** 每日健康记录字段 */
export interface IDailyLogRecord {
  /** 痛经程度：none/mild/moderate/severe */
  dysmenorrhea?: string;
  /** 血块：none/little/medium/large */
  clot?: string;
  /** 流量：little/normal/much/heavy */
  flow?: string;
  /** 颜色：bright/dark/brown/pink */
  color?: string;
  /** 非经期整体感受：fine / unwell */
  overall?: string;
  /** 非经期不适选项（多选，逗号分隔的 value 列表） */
  discomforts?: string;
  /** 白带状态（非经期）：clear/white/yellow/curd/greenish/fishy */
  discharge?: string;
  /** 每日日记内容 */
  diary?: string;
}

/** 每日健康记录选项配置 */
export const DAILY_LOG_OPTIONS = {
  dysmenorrhea: {
    label: '痛经',
    options: [
      { value: 'none', label: '不痛', tip: '尽情享受美好的一天吧！' },
      { value: 'mild', label: '轻微疼痛', tip: '小腹在轻轻提醒你，记得喝温水，照顾好自己~' },
      { value: 'moderate', label: '中等疼痛', tip: '疼痛是身体在呼唤你慢下来，热敷一下好好休息吧，如果实在难受，可以咨询医生或按照说明书服用止痛药。' },
      { value: 'severe', label: '严重疼痛', tip: '这不是忍一忍就能好的事。请一定要及时休息，必要时去医院看看，你的身体值得被认真对待。' },
    ],
  },
  clot: {
    label: '血块',
    options: [
      { value: 'none', label: '无', tip: '今天一切平稳~' },
      { value: 'little', label: '少量', tip: '少量血块是正常现象，别担心' },
      { value: 'medium', label: '中等', tip: '血块偏多，记得多喝温水，身体在努力工作哦~' },
      { value: 'large', label: '大量', tip: '如果长期出现大量血块，建议记录下来，咨询专业的医生' },
    ],
  },
  flow: {
    label: '流量',
    options: [
      { value: 'little', label: '很少', tip: '今天量不多，注意保暖，让身体慢慢来~' },
      { value: 'normal', label: '一般', tip: '一切正常，安心啦~' },
      { value: 'much', label: '较多', tip: '量有些大，记得及时更换卫生巾，别忘了补充水分好好吃饭哦~' },
      { value: 'heavy', label: '很多', tip: '流量比较大，别硬撑，必要时去看医生哦。' },
    ],
  },
  color: {
    label: '颜色',
    options: [
      { value: 'bright', label: '鲜红色', tip: '鲜红色是新鲜血液，通常说明状态不错~' },
      { value: 'dark', label: '暗红色', tip: '暗红色是正常经血颜色，放轻松~' },
      { value: 'brown', label: '褐色/咖啡色', tip: '褐色通常是末期经血，身体在收尾啦~' },
      { value: 'pink', label: '粉色/稀薄', tip: '颜色偏淡可能是激素水平波动，偶尔出现不用太担心，长期出现最好去看看医生哦~' },
    ],
  },
} as const;

/** 非经期不适选项 */
export const NON_PERIOD_DISCOMFORT_OPTIONS = [
  { value: 'bloating', label: '小腹坠胀', tip: '可能是经前或肠胃在闹情绪啦，喝杯温水观察一下~' },
  { value: 'breast', label: '乳房胀痛', tip: '激素波动常常会影响到胸部，别担心。' },
  { value: 'backache', label: '腰酸背疼', tip: '是不是坐太久了啦？起来活动一下或者用热敷袋暖暖腰吧。' },
  { value: 'dizzy', label: '头晕乏力', tip: '可能是没休息好或有点贫血，好好休息别勉强自己哦。' },
  { value: 'mood', label: '情绪低落/烦躁', tip: '激素在悄悄变化，这种感受是真实的，今天对自己宽容一点吧！' },
  { value: 'insomnia', label: '失眠/睡不好', tip: '睡前放下手机，你的身体需要好好休息。' },
  { value: 'nausea', label: '恶心/没胃口', tip: '消化系统有时候会敏感，喝点清淡的粥会舒服些。' },
  { value: 'headache', label: '头疼', tip: '偏头痛在非经期也可能出现，试试关掉灯光安静休息一会。' },
  { value: 'unknown', label: '我说不清哪里不舒服', tip: '有时候身体就是闷闷的，没关系，记录下来，给自己一点时间~' },
];

/** 白带状态选项 */
export const DISCHARGE_OPTIONS = [
  { value: 'clear', label: '透明/拉丝', tip: '这是排卵日前后的信号，说明你的身体在正常运转呢' },
  { value: 'white', label: '白色/乳状', tip: '一切都是刚刚好的状态，享受美好的一天吧！' },
  { value: 'yellow', label: '淡黄/微稠', tip: '身体在提醒你多喝水啦，别太紧张。' },
  { value: 'curd', label: '豆腐渣/凝乳状', tip: '如果伴随痒和不舒服的感觉，最好去医院检查一下哦，这不是你的错。' },
  { value: 'greenish', label: '黄绿色/泡沫状', tip: '身体在给你发信号啦，去医院检查一下让自己和身体都放心！' },
  { value: 'fishy', label: '有鱼腥味', tip: '身体在给你发信号啦，抽个时间去看看医生吧。' },
];

/** 需要额外温柔提示的白带选项值 */
export const DISCHARGE_WARNING_VALUES = new Set(['curd', 'greenish', 'fishy']);

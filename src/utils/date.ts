/**
 * 日期工具函数
 */

/** 将 Date 转为 YYYY-MM-DD 字符串 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 将 YYYY-MM-DD 字符串转为 Date（本地时间，避免时区偏移） */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 计算两个日期之间的天数差（b - a） */
export function diffDays(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  const ms = db.getTime() - da.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** 在日期上增加 n 天 */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

/** 判断日期是否为今天 */
export function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

/** 判断日期是否为未来（明天及以后） */
export function isFuture(dateStr: string): boolean {
  return diffDays(formatDate(new Date()), dateStr) > 0;
}

/** 获取某月第一天是周几（0=周日，1=周一，...，6=周六） */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** 获取某月的天数 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 获取月份的显示文本 */
export function getMonthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

/** 生成指定月份的日历格子数据（包含上月/下月填充） */
export interface ICalendarCell {
  date: string;
  day: number;
  isCurrentMonth: boolean;
}

export function generateCalendarCells(year: number, month: number): ICalendarCell[] {
  const cells: ICalendarCell[] = [];
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  // 上月填充
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({
      date: formatDate(new Date(prevYear, prevMonth, day)),
      day,
      isCurrentMonth: false,
    });
  }

  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: formatDate(new Date(year, month, d)),
      day: d,
      isCurrentMonth: true,
    });
  }

  // 下月填充（补齐 42 格 = 6 行）
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({
      date: formatDate(new Date(nextYear, nextMonth, d)),
      day: d,
      isCurrentMonth: false,
    });
  }

  return cells;
}

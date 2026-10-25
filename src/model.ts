export type Kind =
  'sight' | 'food' | 'transport' | 'shopping' | 'hotel' | 'activity';
export type Status = 'pdf' | 'verified' | 'conflict' | 'unknown';
export interface Stop {
  id: string;
  kind: Kind;
  name: string;
  time: string;
  timeLabel?: string;
  summary: string;
  pages: number[];
  status: Status;
  address?: string;
  duration?: string;
  hours?: string;
  budget?: string;
  menu?: string[];
  note?: string;
  from?: string;
  to?: string;
  mode?: 'walking' | 'transit';
  navigation?: 'place';
  sourceIds?: string[];
  urgent?: boolean;
  optional?: boolean;
}
export interface Day {
  id: number;
  date: string;
  city: '京都' | '大阪';
  title: string;
  subtitle: string;
  pages: number[];
  stops: Stop[];
  alerts: string[];
}
export interface Source {
  id: string;
  title: string;
  url: string;
  checked: string;
  confidence: '官方' | '觀光機構' | '未核實';
  facts: string[];
}
export interface Guide {
  id: string;
  title: string;
  pages: number[];
  sourceIds: string[];
  category:
    '故事' | '必吃美食' | '必點菜單' | '必買伴手禮' | '重要預約' | '交通提醒';
  text: string;
  tip: string;
  confidence: Status;
}
export interface Expense {
  id: string;
  date: string;
  title: string;
  category: string;
  jpy: number;
  rate: number;
  updated: string;
}
export interface Settings {
  id: 'settings';
  rate: number;
  budget: number;
  dailyBudget: number;
}
export interface Edit {
  id: string;
  time: string;
  note: string;
}
export interface Order {
  id: string;
  ids: string[];
}
export interface PrivateInfo {
  id: string;
  label: string;
  value: string;
}
export const categories = ['餐飲', '交通', '購物', '門票', '住宿', '其他'];

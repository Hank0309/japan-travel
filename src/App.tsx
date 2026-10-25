import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type FormEvent,
} from 'react';
import { NavLink, Routes, Route, useLocation } from 'react-router-dom';
import { liveQuery, type Subscription } from 'dexie';
import {
  Sun,
  CalendarDays,
  MapPin,
  Wallet,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  TrainFront,
  Utensils,
  Landmark,
  ShoppingBag,
  BedDouble,
  Ticket,
  WifiOff,
  Plus,
  Download,
  Upload,
  Settings2,
  ChevronDown,
  Copy,
  Phone,
  Check,
  CloudRain,
  RefreshCw,
  PenLine,
  X,
  AlertTriangle,
  Compass,
  Clock,
  Search,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { days, sources, guides, conflicts } from './data';
import type {
  Day,
  Stop,
  Expense,
  Settings,
  Edit,
  Order,
  PrivateInfo,
  Kind,
} from './model';
import { categories } from './model';
import {
  db,
  defaults,
  saveExpense,
  deleteExpense,
  savePrivateInfo,
  writeLocal,
  serializeBackup,
  backup,
  importBackup,
  parseBackup,
  toCSV,
  download,
  validateSettings,
} from './db';
import {
  fmt,
  japanDate,
  japanTime,
  weekday,
  maps,
  nextStop,
  inForecast,
} from './utils';
import {
  getWeather,
  description,
  currentAllowed,
  type Weather,
} from './weather';

const kindNames: Record<Kind, string> = {
  sight: '景點',
  food: '美食',
  transport: '交通',
  shopping: '購物',
  hotel: '住宿',
  activity: '體驗',
};
const icons = {
  sight: Landmark,
  food: Utensils,
  transport: TrainFront,
  shopping: ShoppingBag,
  hotel: BedDouble,
  activity: Ticket,
};
const nav = [
  ['/', '今日', Sun],
  ['/itinerary', '行程', CalendarDays],
  ['/map', '地圖', MapPin],
  ['/expenses', '記帳', Wallet],
  ['/info', '旅遊資訊', BookOpen],
] as const;
const statusNames = {
  pdf: 'PDF 行程',
  verified: '官方已核對',
  conflict: '待確認',
  unknown: '尚未核實',
};

function Landscape() {
  return (
    <svg className="landscape" viewBox="0 0 700 300" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#e6e9db" />
          <stop offset="1" stopColor="#f5eddb" />
        </linearGradient>
      </defs>
      <rect width="700" height="300" fill="url(#sky)" />
      <circle cx="523" cy="78" r="38" fill="#bc6955" opacity=".8" />
      <path
        d="M0 212 100 100 236 219 360 111 590 263 700 173V300H0Z"
        fill="#b6c0ac"
      />
      <path d="m0 248 169-92 150 100 116-71 186 95 79-51v71H0" fill="#8fa18a" />
      <path d="M0 272 Q190 210 343 285T700 249V300H0" fill="#526454" />
      <g fill="#394c42">
        <path d="m290 110 91-35 95 35-26 8H319z" />
        <path d="M325 116h118v19H325z" />
        <path d="m287 147 95-32 99 32-20 9H307z" />
        <path d="M317 152h134v28H317z" />
        <path d="m267 193 115-36 118 36-20 10H287z" />
        <path d="M298 197h171v63H298z" />
      </g>
      <g fill="#d6c6a5">
        <path d="M335 119h7v16h-7zm25 0h7v16h-7zm27 0h7v16h-7zm27 0h7v16h-7zm-82 38h8v23h-8zm31 0h8v23h-8zm32 0h8v23h-8zm32 0h8v23h-8z" />
        <path d="M315 210h8v48h-8zm32 0h8v48h-8zm33 0h8v48h-8zm33 0h8v48h-8zm32 0h8v48h-8z" />
      </g>
      <path
        d="M238 276h276M220 286h312M248 265h256"
        stroke="#e0d6bd"
        strokeWidth="5"
      />
      <g stroke="#6e6755" fill="none" strokeWidth="5">
        <path d="m55 300 8-92 7-61m-7 79 32-37m-30 22-25-42" />
        <path d="m630 300-8-105-3-50m3 72-27-35m29 53 31-49" />
      </g>
      <g fill="#a45e44">
        <ellipse cx="48" cy="170" rx="32" ry="18" />
        <ellipse cx="77" cy="150" rx="27" ry="22" />
        <ellipse cx="97" cy="190" rx="30" ry="20" />
        <ellipse cx="621" cy="154" rx="35" ry="24" />
        <ellipse cx="596" cy="184" rx="27" ry="18" />
        <ellipse cx="650" cy="196" rx="28" ry="23" />
      </g>
      <g fill="#d4a96f">
        <ellipse cx="32" cy="191" rx="26" ry="16" />
        <ellipse cx="88" cy="172" rx="27" ry="18" />
        <ellipse cx="641" cy="166" rx="25" ry="20" />
      </g>
    </svg>
  );
}
function Modal({
  title,
  onClose,
  children,
  notice,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  notice?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="關閉" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {notice && (
        <p className="form-notice" role="alert">
          {notice}
        </p>
      )}
      {children}
    </dialog>
  );
}
function SourceLinks({ ids = [] }: { ids?: string[] }) {
  return (
    <div className="source-links">
      {ids.map((id) => {
        const s = sources.find((s) => s.id === id);
        return s ? (
          <a key={id} href={s.url} target="_blank" rel="noreferrer">
            {s.title}
            <ArrowUpRight size={13} />
            <small>
              {s.confidence} · {s.checked}
            </small>
          </a>
        ) : null;
      })}
    </div>
  );
}
function Navigation({ stop }: { stop: Stop }) {
  if (stop.id === 'd1-flight' || stop.id === 'd7-flight')
    return (
      <NavLink to="/info" className="navigate">
        航班資料
        <ArrowUpRight size={14} />
      </NavLink>
    );
  if (
    stop.id === 'd4-meeting' ||
    stop.id === 'd4-snacks' ||
    stop.id === 'd6-dinner' ||
    stop.id === 'd6-snack'
  )
    return <span className="muted small">地點有疑義，確認後再導航</span>;
  return (
    <a
      className="navigate"
      href={maps(stop)}
      target="_blank"
      rel="noreferrer"
      aria-label={`導航至${stop.name}`}
    >
      <Compass size={16} />
      {stop.navigation === 'place'
        ? '查看地點'
        : stop.mode === 'transit'
          ? '交通導航'
          : '導航'}
      <ArrowUpRight size={14} />
    </a>
  );
}
function WeatherCard({
  day,
  online,
  now,
}: {
  day: Day;
  online: boolean;
  now: Date;
}) {
  const [data, setData] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setLoading(true);
    void getWeather(day.city, day.date)
      .then((w) => {
        if (active) setData(w);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [day.city, day.date, online, Math.floor(now.getTime() / 300000)]);
  const index = data?.daily.time.indexOf(day.date) ?? -1;
  const valid =
    data &&
    index >= 0 &&
    inForecast(day.date) &&
    now.getTime() - data.fetched < 86400000;
  const stale =
    data && (data.stale || !online || now.getTime() - data.fetched >= 1800000);
  const current =
    valid &&
    !stale &&
    currentAllowed(data, day.date) &&
    Number.isFinite(data.current?.temperature_2m);
  const code = valid ? data.daily.weather_code[index] : undefined;
  return (
    <section className="weather" aria-label="天氣資訊">
      <div className="weather-main">
        {code !== undefined && code >= 51 ? (
          <CloudRain size={28} />
        ) : (
          <Sun size={28} />
        )}
        <div>
          <strong>
            {valid
              ? current
                ? `${data.current!.temperature_2m}°`
                : `${data.daily.temperature_2m_min[index] ?? '—'}° / ${data.daily.temperature_2m_max[index] ?? '—'}°`
              : '—°'}
          </strong>
          <span>
            {loading
              ? '查詢天氣中'
              : valid
                ? code === null
                  ? '天氣未知'
                  : description(code!)
                : inForecast(day.date)
                  ? '暫無可用天氣資料'
                  : '尚無天氣預報'}
          </span>
        </div>
      </div>
      <div className="weather-meta">
        {valid ? (
          <>
            <span>
              {current ? '目前氣溫' : '當日預報'} · 降雨{' '}
              {data.daily.precipitation_probability_max[index] ?? '—'}%
            </span>
            {current && (
              <span>
                高 {data.daily.temperature_2m_max[index] ?? '—'}° / 低{' '}
                {data.daily.temperature_2m_min[index] ?? '—'}°
              </span>
            )}
            <small>
              {stale ? '離線／上次資料' : '預報資料'} ·{' '}
              {new Date(data.fetched).toLocaleString('zh-TW', {
                timeZone: 'Asia/Tokyo',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              JST
            </small>
            {(data.daily.precipitation_probability_max[index] ?? 0) >= 50 && (
              <strong className="rain">☂ 降雨機率高，記得帶傘</strong>
            )}
          </>
        ) : (
          <small>
            Open-Meteo · 日本時間
            <br />
            {inForecast(day.date)
              ? '連線後自動查詢，失敗時保留最後資料'
              : '日期超出目前預報範圍'}
          </small>
        )}
      </div>
    </section>
  );
}
function DayPicker({
  day,
  onChange,
}: {
  day: Day;
  onChange: (id: number) => void;
}) {
  return (
    <div className="day-picker" aria-label="選擇旅行日期">
      {days.map((d) => (
        <button
          key={d.id}
          aria-pressed={d.id === day.id}
          className={d.id === day.id ? 'active' : ''}
          onClick={() => onChange(d.id)}
        >
          <small>DAY {d.id}</small>
          <strong>{d.date.slice(5).replace('-', '/')}</strong>
          <span>{weekday(d.date).replace('週', '')}</span>
        </button>
      ))}
    </div>
  );
}
function StopCard({
  stop,
  edit,
  onEdit,
  onMove,
  index,
  total,
  canEdit,
}: {
  stop: Stop;
  edit?: Edit;
  onEdit: (s: Stop) => void;
  onMove: (id: string, direction: number) => void;
  index: number;
  total: number;
  canEdit: boolean;
}) {
  const Icon = icons[stop.kind];
  return (
    <article className={`stop-card ${stop.kind}`}>
      <div className="time-col">
        <strong>{(edit?.time ?? stop.time) || '—'}</strong>
        <span className={'kind-icon ' + stop.kind}>
          <Icon size={18} />
        </span>
        <span className="time-line" />
      </div>
      <div className="stop-content">
        <div className="card-kicker">
          <span>
            {kindNames[stop.kind]} {stop.optional ? '· 選配' : ''}
          </span>
          {stop.urgent && (
            <span className="urgent">
              <AlertTriangle size={12} />
              時間／預約
            </span>
          )}
        </div>
        <h3>{stop.name}</h3>
        {stop.timeLabel && (
          <p className="time-label">
            {edit ? '自訂時間；原書：' : ''}
            {stop.timeLabel}
          </p>
        )}
        <p>{stop.summary}</p>
        {stop.duration && (
          <div className="duration">
            <Clock size={13} />
            {stop.duration}
          </div>
        )}
        {edit?.note && <p className="user-note">我的備註：{edit.note}</p>}
        <div className="card-actions">
          <details>
            <summary>
              詳細攻略
              <ChevronDown size={14} />
            </summary>
            <div className="details-body">
              {stop.address && (
                <p>
                  <MapPin size={14} />
                  {stop.address}
                </p>
              )}
              {stop.hours && <p>營業資訊：{stop.hours}</p>}
              {stop.budget && <p>預算／價格：{stop.budget}</p>}
              {stop.menu && (
                <p className="menu-tag">必點菜單 · {stop.menu.join('、')}</p>
              )}
              {stop.note && <p className="note">{stop.note}</p>}
              <p className="provenance">
                {statusNames[stop.status]} · PDF p.{stop.pages.join('、')}
                <br />
                未明列的停留時間、票價與班次皆為未知。
              </p>
              <SourceLinks ids={stop.sourceIds} />
            </div>
          </details>
          <Navigation stop={stop} />
          {canEdit && (
            <button
              className="icon-button"
              aria-label={`編輯${stop.name}`}
              onClick={() => onEdit(stop)}
            >
              <PenLine size={16} />
            </button>
          )}
        </div>
        {canEdit && (
          <div className="reorder">
            <button
              aria-label={`上移${stop.name}`}
              disabled={index === 0}
              onClick={() => onMove(stop.id, -1)}
            >
              <ArrowUp size={13} />
              上移
            </button>
            <button
              aria-label={`下移${stop.name}`}
              disabled={index === total - 1}
              onClick={() => onMove(stop.id, 1)}
            >
              <ArrowDown size={13} />
              下移
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [dayId, setDayId] = useState(
    () => days.find((d) => d.date === japanDate())?.id ?? 1,
  );
  const day = days[dayId - 1];
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(defaults);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [privateInfo, setPrivateInfo] = useState<PrivateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [message, setMessage] = useState('');
  const [expenseModal, setExpenseModal] = useState<Expense | 'new' | null>(
    null,
  );
  const [editStop, setEditStop] = useState<Stop | null>(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const [privateModal, setPrivateModal] = useState(false);
  const [installModal, setInstallModal] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updater = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [infoTab, setInfoTab] = useState('出行資料');
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  async function readLocal() {
    const [e, s, ed, o, p] = await Promise.all([
      db.expenses.orderBy('date').toArray(),
      db.settings.get('settings'),
      db.edits.toArray(),
      db.orders.toArray(),
      db.privateInfo.toArray(),
    ]);
    return { e, s, ed, o, p };
  }
  useEffect(() => {
    let subscription: Subscription | undefined;
    let disposed = false;
    const unavailable = () => {
      if (disposed) return;
      setFatal(
        '本機儲存暫不可用，已切換唯讀。行程、飯店與緊急電話仍可查看；無法記帳或儲存修改。請勿清除網站資料。',
      );
      setLoading(false);
    };
    const storageTimeout = setTimeout(unavailable, 5000);
    void db
      .open()
      .then(() => {
        if (disposed) return;
        subscription = liveQuery(readLocal).subscribe({
          next: ({ e, s, ed, o, p }) => {
            clearTimeout(storageTimeout);
            setExpenses(e);
            setSettings(s ?? defaults);
            setEdits(ed);
            setOrders(o);
            setPrivateInfo(p);
            setFatal('');
            setLoading(false);
          },
          error: unavailable,
        });
      })
      .catch(unavailable);
    const foreground = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', foreground);
    window.addEventListener('pageshow', foreground);
    window.addEventListener('focus', foreground);
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const timer = setInterval(() => setNow(new Date()), 30000);
    updater.current = registerSW({
      onNeedRefresh: () => setUpdateReady(true),
      onOfflineReady: () => setOfflineReady(true),
      onRegisterError: () =>
        setMessage('離線資源尚未下載成功，請保持連線再重新開啟。'),
    });
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(timer);
      disposed = true;
      clearTimeout(storageTimeout);
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', foreground);
      window.removeEventListener('pageshow', foreground);
      window.removeEventListener('focus', foreground);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  const localToday = japanDate(now);
  useEffect(() => {
    const actual = days.find((d) => d.date === localToday);
    if (actual) setDayId(actual.id);
  }, [localToday]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const order = orders.find((o) => o.id === String(day.id));
  const stops = [...day.stops]
    .sort((a, b) =>
      order ? order.ids.indexOf(a.id) - order.ids.indexOf(b.id) : 0,
    )
    .map((s) => {
      const e = edits.find((e) => e.id === s.id);
      return e ? { ...s, time: e.time } : s;
    });
  const upcoming = nextStop(stops, day.date, now);
  const phase =
    japanDate(now) < days[0].date
      ? '出發前預覽'
      : japanDate(now) > days[6].date
        ? '旅程回顧'
        : day.date === japanDate(now)
          ? '今日行程'
          : '行程預覽';
  async function run(action: () => Promise<unknown>, success?: string) {
    if (busy) return;
    if (fatal) {
      setMessage('唯讀模式無法儲存或匯出本機資料，請恢復儲存權限後重新開啟。');
      return;
    }
    setBusy(true);
    try {
      await action();
      if (success) setMessage(success);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '儲存失敗，請稍後重試');
    } finally {
      setBusy(false);
    }
  }
  async function move(id: string, direction: number) {
    const ids = stops.map((s) => s.id);
    const i = ids.indexOf(id);
    if (i + direction < 0 || i + direction >= ids.length) return;
    [ids[i], ids[i + direction]] = [ids[i + direction], ids[i]];
    await run(
      () => writeLocal(() => db.orders.put({ id: String(day.id), ids })),
      '行程順序已儲存',
    );
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('已複製');
    } catch {
      setMessage('無法使用剪貼簿，請長按文字複製。');
    }
  }
  const shownStops = stops.filter(
    (s) =>
      (filter === 'all' || s.kind === filter) &&
      (!query ||
        [s.name, s.summary, s.address, s.note]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const total = expenses.reduce((n, e) => n + e.jpy, 0);
  const todayTotal = expenses
    .filter((e) => e.date === day.date)
    .reduce((n, e) => n + e.jpy, 0);
  const totalTwd = expenses.reduce((n, e) => n + e.jpy * e.rate, 0);
  const todayPath = location.pathname === '/';
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <a className="brand" href="/">
          旅日<span>手帖</span>
          <small>KYOTO & OSAKA</small>
        </a>
        <p>
          把旅程，
          <br />
          收進日常。
        </p>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span>2026.10.31 — 11.06</span>
          <small>七日・六夜・兩座城市</small>
          <button onClick={() => setInstallModal(true)}>
            加入 iPhone 主畫面
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand">
            旅日手帖 <span>KYOTO & OSAKA</span>
          </div>
          <span className="desktop-eyebrow">A LITTLE JOURNAL OF JAPAN</span>
          <div className="topbar-actions">
            <span className={online ? 'connection' : 'connection offline'}>
              {online ? <span className="dot" /> : <WifiOff size={13} />}{' '}
              {online ? '已連線' : '離線中'}
            </span>
            <button
              className="icon-button"
              aria-label="安裝與離線說明"
              onClick={() => setInstallModal(true)}
            >
              <Info size={19} />
            </button>
          </div>
        </header>
        {!online && (
          <div className="network-banner">
            <WifiOff size={16} />
            行程與記帳可離線使用；導航與新天氣需要網路。
          </div>
        )}
        {updateReady && (
          <div className="update-banner">
            <span>新版本已備妥，更新前請先儲存編輯。</span>
            <button
              onClick={() => {
                void updater.current?.(true);
              }}
            >
              更新 App
              <RefreshCw size={14} />
            </button>
          </div>
        )}
        {fatal && (
          <section className="storage-warning" role="alert">
            <strong>唯讀模式</strong>
            <p>{fatal}</p>
            <button
              className="outline"
              onClick={() => window.location.reload()}
            >
              重新嘗試儲存空間
            </button>
          </section>
        )}
        {loading ? (
          <main className="loading">正在打開你的旅日手帖…</main>
        ) : (
          <main>
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <section className="page-heading">
                      <div>
                        <p className="eyebrow">
                          {phase} · DAY {day.id} / 7
                        </p>
                        <h1>今天，去{day.city}走走。</h1>
                        <p className="subheading">
                          {day.date.replaceAll('-', '.')} {weekday(day.date)}{' '}
                          <span>·</span> {japanTime(now)} JST
                        </p>
                      </div>
                      <button
                        className="outline small-button"
                        onClick={() => {
                          setDayId(
                            days.find((d) => d.date === japanDate())?.id ?? 1,
                          );
                          setMessage('已切換至日本今日；旅程外顯示第 1 天預覽');
                        }}
                      >
                        <CalendarDays size={16} />
                        日本今日
                      </button>
                    </section>
                    <section className="hero">
                      <div className="hero-copy">
                        <span className="hero-number">0{day.id}</span>
                        <p>京都、大阪。七天的好時光</p>
                        <h2>{day.title}</h2>
                        <span>{day.subtitle}</span>
                        <a href="#timeline" className="hero-link">
                          翻開今天的行程
                          <ArrowRight size={17} />
                        </a>
                      </div>
                      <Landscape />
                      <span className="hero-stamp">
                        旅<br />の<br />記<br />録
                      </span>
                    </section>
                    <div className="overview-grid">
                      <WeatherCard day={day} online={online} now={now} />
                      <section className="next-card">
                        <span className="eyebrow">
                          {upcoming
                            ? 'UP NEXT · 接下來'
                            : phase === '旅程回顧'
                              ? 'GOOD MEMORIES'
                              : 'YOUR JOURNEY'}
                        </span>
                        <h3>
                          {upcoming?.name ??
                            (day.date === japanDate(now)
                              ? '已無後續定時行程'
                              : day.title)}
                        </h3>
                        <p>
                          {upcoming
                            ? `${upcoming.time} · ${upcoming.timeLabel ?? kindNames[upcoming.kind]}`
                            : '此為行程預覽；當天依日本時間顯示下一個定時項目。'}
                        </p>
                        {upcoming ? (
                          <Navigation stop={upcoming} />
                        ) : (
                          <NavLink to="/itinerary" className="text-link">
                            查看七日安排
                            <ArrowRight size={15} />
                          </NavLink>
                        )}
                      </section>
                    </div>
                    <section className="reminders">
                      <span className="reminder-icon">
                        <AlertTriangle size={19} />
                      </span>
                      <div>
                        <strong>出發前，多留意一點</strong>
                        {day.alerts.map((a) => (
                          <p key={a}>{a}</p>
                        ))}
                      </div>
                    </section>
                    <div className="section-title" id="timeline">
                      <div>
                        <p className="eyebrow">TODAY'S CHAPTER</p>
                        <h2>今日路線</h2>
                      </div>
                      <NavLink to="/itinerary" className="text-link">
                        編輯行程
                        <ArrowUpRight size={16} />
                      </NavLink>
                    </div>
                    <div className="timeline">
                      {stops.map((s, i) => (
                        <StopCard
                          key={s.id}
                          stop={s}
                          edit={edits.find((e) => e.id === s.id)}
                          onEdit={setEditStop}
                          onMove={move}
                          index={i}
                          total={stops.length}
                          canEdit={false}
                        />
                      ))}
                    </div>
                    <div className="day-footer">
                      <span>下一段風景，已經在路上。</span>
                      <NavLink to="/itinerary">
                        翻閱七日行程
                        <ArrowRight size={16} />
                      </NavLink>
                    </div>
                  </>
                }
              />
              <Route
                path="/itinerary"
                element={
                  <>
                    <PageTitle
                      eyebrow="SEVEN DAYS, TWO CITIES"
                      title="七日，慢慢旅行"
                      text="跟著原書，也留一點自己的步調。"
                    />
                    <DayPicker day={day} onChange={setDayId} />
                    <div className="chapter">
                      <div>
                        <span>
                          DAY 0{day.id} · {day.city}
                        </span>
                        <h2>{day.title}</h2>
                        <p>{day.subtitle}</p>
                      </div>
                      <span className="chapter-date">
                        {weekday(day.date)}
                        <small>{day.date}</small>
                      </span>
                    </div>
                    <details className="alert-details">
                      <summary>
                        <AlertTriangle size={17} />
                        當日提醒與待確認事項
                        <ChevronDown size={15} />
                      </summary>
                      {day.alerts.map((a) => (
                        <p key={a}>{a}</p>
                      ))}
                    </details>
                    <div className="filter-toolbar">
                      <label className="search">
                        <Search size={17} />
                        <input
                          aria-label="搜尋當日行程"
                          placeholder="搜尋景點、餐廳或地址"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <select
                        aria-label="行程分類"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">全部類型</option>
                        {Object.entries(kindNames).map(([v, n]) => (
                          <option key={v} value={v}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="muted small">
                      時間軸統一使用日本時間（去程出發另附台灣時間）。上移／下移調整順序；時間與備註儲存在此裝置。衝突時段仍需核對憑證。
                    </p>
                    <div className="timeline">
                      {shownStops.map((s) => (
                        <StopCard
                          key={s.id}
                          stop={s}
                          edit={edits.find((e) => e.id === s.id)}
                          onEdit={setEditStop}
                          onMove={move}
                          index={stops.indexOf(s)}
                          total={stops.length}
                          canEdit={!fatal && !query && filter === 'all'}
                        />
                      ))}
                      {!shownStops.length && (
                        <Empty text="沒有符合的行程，試試其他關鍵字。" />
                      )}
                    </div>
                  </>
                }
              />
              <Route
                path="/map"
                element={
                  <>
                    <PageTitle
                      eyebrow="FIND YOUR WAY"
                      title="下一站，這裡見"
                      text="把地址帶在身上，路線交給當日導航。"
                    />
                    <DayPicker day={day} onChange={setDayId} />
                    <section className="map-intro">
                      <div className="map-symbol">
                        <MapPin size={36} />
                        <span />
                        <span />
                      </div>
                      <div>
                        <h2>
                          {day.city}・Day {day.id}
                        </h2>
                        <p>
                          依行程順序排列的地點清單。Google Maps
                          將另開視窗，以當日路況與營運規劃路線。
                        </p>
                        <small>離線可讀地址；此頁不提供離線地圖圖磚。</small>
                      </div>
                    </section>
                    <div className="map-list">
                      {stops.map((s, i) => {
                        const Icon = icons[s.kind];
                        return (
                          <article key={s.id}>
                            <span className="map-index">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div>
                              <span className="card-kicker">
                                <Icon size={13} />
                                {kindNames[s.kind]} ·{' '}
                                {s.time || s.timeLabel || '自由安排'}
                              </span>
                              <h3>{s.name}</h3>
                              <p>
                                {s.from && s.to
                                  ? `${s.from} → ${s.to}`
                                  : s.address || s.to || '位置須先確認'}
                              </p>
                              <small>PDF p.{s.pages.join('、')}</small>
                            </div>
                            <Navigation stop={s} />
                          </article>
                        );
                      })}
                    </div>
                  </>
                }
              />
              <Route
                path="/expenses"
                element={
                  <>
                    <PageTitle
                      eyebrow="COLLECT MOMENTS, KEEP A RECORD"
                      title="把花費，記得剛剛好"
                      text="日幣記帳，本機保存。離線也能安心記一筆。"
                    />
                    <section className="budget-card">
                      <div>
                        <span>全程已支出</span>
                        <h2>
                          <small>¥</small>
                          {fmt(total)}
                        </h2>
                        <p>
                          NT$ {fmt(totalTwd)} <small>依每筆儲存匯率</small>
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="設定預算與匯率"
                        disabled={!!fatal}
                        onClick={() => setSettingsModal(true)}
                      >
                        <Settings2 size={20} />
                      </button>
                      <div className="budget-bottom">
                        <div>
                          <span>全程預算</span>
                          <strong>
                            {settings.budget
                              ? `¥${fmt(settings.budget)}`
                              : '尚未設定'}
                          </strong>
                        </div>
                        <div>
                          <span>
                            {settings.budget && total > settings.budget
                              ? '超出預算'
                              : '剩餘預算'}
                          </span>
                          <strong>
                            {settings.budget
                              ? `¥${fmt(Math.abs(settings.budget - total))}`
                              : '—'}
                          </strong>
                        </div>
                      </div>
                      {settings.budget > 0 && (
                        <div className="progress">
                          <span
                            style={{
                              width:
                                Math.min(100, (total / settings.budget) * 100) +
                                '%',
                            }}
                          />
                        </div>
                      )}
                    </section>
                    <div className="account-toolbar">
                      <button
                        className="primary"
                        disabled={!!fatal}
                        onClick={() => {
                          if (!settings.rate) {
                            setSettingsModal(true);
                            setMessage('先設定手動匯率，即可開始記帳。');
                          } else setExpenseModal('new');
                        }}
                      >
                        <Plus size={18} />
                        記一筆
                      </button>
                      <button
                        className="outline"
                        disabled={!!fatal}
                        onClick={() => setSettingsModal(true)}
                      >
                        <Settings2 size={16} />
                        匯率 {settings.rate ? settings.rate : '未設定'}
                      </button>
                    </div>
                    <DayPicker day={day} onChange={setDayId} />
                    <div className="daily-summary">
                      <div>
                        <span>{day.date} · 當日支出</span>
                        <strong>¥{fmt(todayTotal)}</strong>
                      </div>
                      <p>
                        {settings.dailyBudget
                          ? `每日預算 ¥${fmt(settings.dailyBudget)} · ${todayTotal > settings.dailyBudget ? '超支' : '剩餘'} ¥${fmt(Math.abs(settings.dailyBudget - todayTotal))}`
                          : '每日預算尚未設定'}
                      </p>
                    </div>
                    <div className="expense-list">
                      {expenses
                        .filter((e) => e.date === day.date)
                        .map((e) => (
                          <article key={e.id}>
                            <span className="expense-symbol">
                              <Wallet size={18} />
                            </span>
                            <div>
                              <h3>{e.title}</h3>
                              <p>
                                {e.category} · 匯率 {e.rate}
                              </p>
                            </div>
                            <div className="expense-amount">
                              <strong>¥{fmt(e.jpy)}</strong>
                              <small>NT${fmt(e.jpy * e.rate)}</small>
                            </div>
                            <button
                              className="icon-button"
                              aria-label={`修改消費${e.title}`}
                              onClick={() => setExpenseModal(e)}
                            >
                              <PenLine size={16} />
                            </button>
                          </article>
                        ))}
                      {!expenses.some((e) => e.date === day.date) && (
                        <Empty text="今天還沒有消費紀錄。第一筆，從一杯茶開始。" />
                      )}
                    </div>
                    <div className="section-title">
                      <h2>全程花費分布</h2>
                      <span className="muted small">JPY</span>
                    </div>
                    <section className="category-stats">
                      {categories.map((c) => {
                        const n = expenses
                          .filter((e) => e.category === c)
                          .reduce((n, e) => n + e.jpy, 0);
                        return (
                          <div key={c}>
                            <div>
                              <span>{c}</span>
                              <strong>¥{fmt(n)}</strong>
                            </div>
                            <div className="stat-bar">
                              <span
                                style={{
                                  width: (total ? (n / total) * 100 : 0) + '%',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </section>
                    <section className="backup-panel">
                      <h3>
                        <ShieldCheck size={18} />
                        為回憶，留一份備份
                      </h3>
                      <p>
                        清除瀏覽器資料或更換裝置時，未備份資料可能遺失。JSON
                        包含私人資料，請妥善保存；CSV 只包含消費。
                      </p>
                      <div className="backup-actions">
                        <button
                          className="outline"
                          disabled={busy || !!fatal}
                          onClick={() => {
                            void run(async () =>
                              download(
                                '旅日消費.csv',
                                toCSV(
                                  await db.expenses.orderBy('date').toArray(),
                                ),
                                'text/csv;charset=utf-8',
                              ),
                            );
                          }}
                        >
                          <Download size={16} />
                          CSV
                        </button>
                        <button
                          className="outline"
                          disabled={busy || !!fatal}
                          onClick={() => {
                            void run(async () => {
                              download(
                                '旅日手帖備份.json',
                                serializeBackup(await backup()),
                                'application/json',
                              );
                            }, '備份已產生，請保存至檔案 App');
                          }}
                        >
                          <Download size={16} />
                          JSON 備份
                        </button>
                        <label className="outline upload">
                          <Upload size={16} />
                          匯入備份
                          <input
                            type="file"
                            accept=".json,application/json"
                            disabled={busy || !!fatal}
                            aria-label="匯入 JSON 備份"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file)
                                void run(async () => {
                                  if (file.size > 5_000_000)
                                    throw new Error('備份上限 5 MB');
                                  const text = await file.text();
                                  const b = parseBackup(text);
                                  if (
                                    !window.confirm(
                                      `匯入 ${b.expenses.length} 筆消費與 ${b.privateInfo.length} 筆私人資料？同 ID 會覆寫；預算與匯率也會更新。其他資料保留。請先匯出現有備份。`,
                                    )
                                  )
                                    return;
                                  await importBackup(text);
                                  setMessage('匯入完成');
                                });
                            }}
                          />
                        </label>
                        <button
                          className="outline"
                          onClick={() => {
                            void navigator.storage
                              ?.persist?.()
                              .then((ok) =>
                                setMessage(
                                  ok
                                    ? '已取得持續儲存許可；仍建議定期備份'
                                    : '瀏覽器未提供持續儲存許可，請定期備份。',
                                ),
                              )
                              .catch(() =>
                                setMessage(
                                  '無法取得持續儲存許可，請使用 JSON 備份。',
                                ),
                              );
                          }}
                        >
                          保留本機資料
                        </button>
                      </div>
                    </section>
                  </>
                }
              />
              <Route
                path="/info"
                element={
                  <>
                    <PageTitle
                      eyebrow="EVERYTHING WITHIN REACH"
                      title="出發之前，安心一點"
                      text="重要資訊、旅途靈感，都放在這一頁。"
                    />
                    <div className="info-tabs">
                      {['出行資料', '在地攻略', '來源與待確認'].map((t) => (
                        <button
                          className={infoTab === t ? 'active' : ''}
                          aria-pressed={infoTab === t}
                          key={t}
                          onClick={() => setInfoTab(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {infoTab === '出行資料' ? (
                      <>
                        <section className="info-section">
                          <div className="section-title">
                            <h2>航班手帖</h2>
                            <span className="muted small">
                              PDF p.2 · 未查證航況
                            </span>
                          </div>
                          <Flight
                            name="去程 · 10 月 31 日"
                            flight="BR182"
                            from="高雄 KHH"
                            to="關西 KIX T1"
                            depart="15:25 台灣"
                            arrive="19:15 日本"
                            note="原書行程頁另記 19:00。請以電子機票確認；KHH 航廈未提供。"
                          />
                          <Flight
                            name="回程 · 11 月 6 日"
                            flight="BR181"
                            from="關西 KIX T1"
                            to="高雄 KHH"
                            depart="11:55 日本"
                            arrive="14:30 台灣"
                            note="原書另標飛行約 2 小時 35 分，與上述台日當地時間換算不符，需核對電子機票。櫃檯、登機口與截止時間依航空公司。"
                          />
                          <a
                            className="text-link"
                            href="https://www.evaair.com/zh-tw/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            長榮航空・重新查證
                            <ArrowUpRight size={15} />
                          </a>
                        </section>
                        <section className="info-section">
                          <div className="section-title">
                            <h2>住在這裡</h2>
                          </div>
                          <Hotel
                            name="都ホテル 京都八条"
                            address="京都市南区西九条院町17"
                            phone="+81756617111"
                            dates="10/31 入住 → 11/4 退房 · 4 晚"
                            note="官方標準入住 14:00／退房 11:00；實際訂單優先。PDF p.4–5、12、17。"
                            sourceId="miyako"
                            copy={copy}
                          />
                          <Hotel
                            name="ヴィアイン心斎橋"
                            address="大阪市中央区西心斎橋1丁目10番15号"
                            phone="+81661215489"
                            dates="11/4 入住 → 11/6 退房 · 2 晚"
                            note="PDF p.4 把回程日也列住宿，依 p.17 兩晚理解，仍需核對訂單。官方標準入住 15:00／退房 10:00，實際預約方案優先。"
                            sourceId="viainn"
                            copy={copy}
                          />
                        </section>
                        <section className="private-panel">
                          <div className="section-title">
                            <h2>我的私人資料</h2>
                            <button
                              className="outline"
                              disabled={!!fatal}
                              onClick={() => setPrivateModal(true)}
                            >
                              <Plus size={16} />
                              新增
                            </button>
                          </div>
                          <p>
                            訂位代碼、保險與聯絡備註只存此裝置，不會傳送到伺服器。此處並非加密保險箱，請勿輸入信用卡或護照完整號碼。
                          </p>
                          {privateInfo
                            .filter((p) => p.id !== 'packing')
                            .map((p) => (
                              <article className="private-row" key={p.id}>
                                <div>
                                  <strong>{p.label}</strong>
                                  <p className="selectable">{p.value}</p>
                                </div>
                                <button
                                  className="icon-button"
                                  aria-label={`複製${p.label}`}
                                  onClick={() => {
                                    void copy(p.value);
                                  }}
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={`刪除私人資料${p.label}`}
                                  disabled={busy || !!fatal}
                                  onClick={() => {
                                    if (window.confirm('刪除此筆私人資料？'))
                                      void run(
                                        () => db.privateInfo.delete(p.id),
                                        '私人資料已刪除',
                                      );
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </article>
                            ))}
                          {!privateInfo.filter((p) => p.id !== 'packing')
                            .length && (
                            <p className="muted">
                              尚未輸入。可新增：弘燒肉訂位、KKday 集合憑證、USJ
                              確約券、遊船訂單與保險電話。
                            </p>
                          )}
                        </section>
                        <section className="emergency-panel">
                          <h2>需要協助時</h2>
                          <div className="emergency-grid">
                            <a href="tel:110">
                              <span>日本警察</span>
                              <strong>110</strong>
                              <Phone size={18} />
                            </a>
                            <a href="tel:119">
                              <span>消防・救護</span>
                              <strong>119</strong>
                              <Phone size={18} />
                            </a>
                          </div>
                          <a
                            className="emergency-taiwan"
                            href="tel:+819087944568"
                          >
                            <Phone size={18} />
                            <div>
                              駐大阪辦事處・急難協助
                              <strong>+81-90-8794-4568</strong>
                            </div>
                          </a>
                          <p className="small">
                            2026/10/25
                            查證外交部駐館頁。電話可能異動，出國前請點來源重新確認。保險公司與保單電話未提供，請自行補入私人資料。
                          </p>
                          <SourceLinks ids={['emergency', 'japanemergency']} />
                        </section>
                        <Packing
                          readOnly={!!fatal}
                          values={privateInfo}
                          save={(p) =>
                            run(() => savePrivateInfo(p), '清單已儲存')
                          }
                        />
                        <section className="install-panel">
                          <h2>帶著手帖出發</h2>
                          <p>
                            iPhone Safari：開啟正式 HTTPS 網址 → 分享 →
                            加入主畫面。首次請保持連線，等待離線資源下載完成。
                          </p>
                          <p>
                            {offlineReady
                              ? '本次工作階段已收到離線資源就緒通知。'
                              : '離線可用性請用飛航模式開啟行程與記帳實測。'}
                            外部導航與官方連結需要網路。
                          </p>
                          <button
                            className="outline"
                            onClick={() => setInstallModal(true)}
                          >
                            安裝與更新說明
                            <ArrowUpRight size={15} />
                          </button>
                        </section>
                      </>
                    ) : infoTab === '在地攻略' ? (
                      <div className="guide-grid">
                        {guides.map((g) => (
                          <article key={g.id} className="guide-card">
                            <span
                              className={
                                'guide-tag ' +
                                (g.category === '必點菜單'
                                  ? 'green'
                                  : g.category === '必買伴手禮'
                                    ? 'purple'
                                    : g.category === '重要預約'
                                      ? 'red'
                                      : g.category === '交通提醒'
                                        ? 'blue'
                                        : 'orange')
                              }
                            >
                              {g.category}
                            </span>
                            <h2>{g.title}</h2>
                            <p>{g.text}</p>
                            <div className="guide-tip">
                              <Compass size={17} />
                              <p>{g.tip}</p>
                            </div>
                            <small className="muted">
                              {statusNames[g.confidence]} · PDF p.
                              {g.pages.join('、')} · 編輯建議非即時資訊
                            </small>
                            <SourceLinks ids={g.sourceIds} />
                          </article>
                        ))}
                      </div>
                    ) : (
                      <>
                        <section className="conflict-section">
                          <h2>原書待確認清單</h2>
                          <p>
                            原書並非所有內容都能當作已確認訂單。以下差異保留原文意義，請以原始機票、住宿與票券憑證補正。
                          </p>
                          {conflicts.map((c) => (
                            <details key={c.title}>
                              <summary>
                                <AlertTriangle size={16} />
                                {c.title}
                                <span>p.{c.pages.join('、')}</span>
                                <ChevronDown size={15} />
                              </summary>
                              <p>{c.detail}</p>
                            </details>
                          ))}
                        </section>
                        <div className="section-title">
                          <h2>旅遊資訊來源索引</h2>
                          <span className="muted small">查證日 2026.10.25</span>
                        </div>
                        <p className="muted small">
                          來源可支持所列事實；靜態研究不能保證旅行日營運。未確認班次、月台、店休與私人預約。所有資料離線儲存於
                          App 資源，外部來源連線開啟。
                        </p>
                        <div className="source-index">
                          {sources.map((s) => (
                            <details key={s.id}>
                              <summary>
                                {s.title}
                                <small>{s.confidence}</small>
                                <ChevronDown size={14} />
                              </summary>
                              {s.facts.map((f) => (
                                <p key={f}>{f}</p>
                              ))}
                              <a href={s.url} target="_blank" rel="noreferrer">
                                開啟來源
                                <ArrowUpRight size={14} />
                              </a>
                              <small>查證／查詢日 {s.checked}</small>
                            </details>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                }
              />
              <Route
                path="*"
                element={
                  <>
                    <PageTitle
                      eyebrow="A SMALL DETOUR"
                      title="這一頁，還沒在旅程裡"
                    />
                    <NavLink to="/" className="primary">
                      回到今日
                    </NavLink>
                  </>
                }
              />
            </Routes>
            <footer className="page-footer">
              <span>旅日手帖</span>
              <p>京都與大阪，留給自己的七天。</p>
              <small>v1.0 · PDF 行程與官方靜態研究 · 不含即時交通</small>
            </footer>
          </main>
        )}
      </div>
      <nav className="bottom-nav" aria-label="主要分頁">
        {nav.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="關閉訊息" onClick={() => setMessage('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {expenseModal && (
        <Modal
          title={expenseModal === 'new' ? '記下這一筆' : '修改消費'}
          notice={message}
          onClose={() => setExpenseModal(null)}
        >
          <ExpenseForm
            expense={expenseModal === 'new' ? undefined : expenseModal}
            day={day}
            rate={settings.rate}
            busy={busy || !!fatal}
            onSave={async (e) => {
              await run(async () => {
                await saveExpense(
                  e,
                  expenseModal === 'new' ? undefined : expenseModal,
                );
                setExpenseModal(null);
              }, '消費已儲存在此裝置');
            }}
            onDelete={
              expenseModal === 'new'
                ? undefined
                : () => {
                    if (window.confirm('刪除此筆消費？'))
                      void run(async () => {
                        await deleteExpense(expenseModal);
                        setExpenseModal(null);
                      }, '消費已刪除');
                  }
            }
          />
        </Modal>
      )}
      {settingsModal && (
        <Modal
          title="預算與手動匯率"
          notice={message}
          onClose={() => setSettingsModal(false)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const s: Settings = {
                id: 'settings',
                rate: Number(f.get('rate')),
                budget: Number(f.get('budget')),
                dailyBudget: Number(f.get('dailyBudget')),
              };
              void run(async () => {
                await writeLocal(() => db.settings.put(validateSettings(s)));
                setSettingsModal(false);
              }, '設定已儲存；舊消費保留原匯率');
            }}
          >
            <label>
              1 日幣 = 多少台幣
              <input
                name="rate"
                type="number"
                inputMode="decimal"
                min="0.000001"
                max="10"
                step="0.000001"
                required
                defaultValue={settings.rate || ''}
                placeholder="輸入自行確認的匯率"
              />
            </label>
            <p className="muted small">
              採手動匯率，並非銀行即時報價。只影響新消費；每筆舊紀錄保留當時匯率。
            </p>
            <label>
              全程預算（JPY）
              <input
                name="budget"
                type="number"
                inputMode="numeric"
                min="0"
                max="10000000000"
                step="1"
                required
                defaultValue={settings.budget}
              />
            </label>
            <label>
              每日預算（JPY，每天相同）
              <input
                name="dailyBudget"
                type="number"
                inputMode="numeric"
                min="0"
                max="10000000000"
                step="1"
                required
                defaultValue={settings.dailyBudget}
              />
            </label>
            <p className="muted small">
              0 表示未設定；原書固定成本未自動寫入實際消費。
            </p>
            <button className="primary" disabled={busy || !!fatal}>
              儲存設定
            </button>
          </form>
        </Modal>
      )}
      {editStop && (
        <Modal
          title="調整自己的步調"
          notice={message}
          onClose={() => setEditStop(null)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await writeLocal(() =>
                  db.edits.put({
                    id: editStop.id,
                    time: String(f.get('time')),
                    note: String(f.get('note')),
                  }),
                );
                setEditStop(null);
              }, '時間與備註已儲存');
            }}
          >
            <h3>{editStop.name}</h3>
            <p className="muted small">
              原書 {editStop.timeLabel || editStop.time || '未定時間'} · PDF p.
              {editStop.pages.join('、')}
              。調整僅改本機時間，不會更改任何外部預約。
            </p>
            <label>
              時間（留空為自由安排）
              <input
                type="time"
                name="time"
                defaultValue={
                  edits.find((e) => e.id === editStop.id)?.time ?? editStop.time
                }
              />
            </label>
            <label>
              我的備註
              <textarea
                name="note"
                rows={4}
                maxLength={3000}
                defaultValue={
                  edits.find((e) => e.id === editStop.id)?.note ?? ''
                }
              />
            </label>
            <button className="primary" disabled={busy || !!fatal}>
              儲存修改
            </button>
            <button
              type="button"
              className="outline"
              disabled={busy || !!fatal}
              onClick={() => {
                void run(async () => {
                  await db.edits.delete(editStop.id);
                  setEditStop(null);
                }, '已恢復原書時間與備註');
              }}
            >
              恢復此卡片原始資料
            </button>
          </form>
        </Modal>
      )}
      {privateModal && (
        <Modal
          title="新增私人資料"
          notice={message}
          onClose={() => setPrivateModal(false)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await savePrivateInfo({
                  id: crypto.randomUUID(),
                  label: String(f.get('label')).trim(),
                  value: String(f.get('value')).trim(),
                });
                setPrivateModal(false);
              }, '私人資料已存於此裝置');
            }}
          >
            <label>
              名稱
              <input
                name="label"
                required
                maxLength={100}
                placeholder="例如：KKday 集合資訊"
              />
            </label>
            <label>
              內容
              <textarea
                name="value"
                required
                maxLength={5000}
                rows={5}
                placeholder="訂位代碼、集合點、保險電話或備註"
              />
            </label>
            <p className="muted small">
              僅保存在本機。JSON 備份會包含此內容，請勿公開分享。
            </p>
            <button className="primary" disabled={busy || !!fatal}>
              儲存私人資料
            </button>
          </form>
        </Modal>
      )}
      {installModal && (
        <Modal
          title="把旅日手帖，帶在身邊"
          onClose={() => setInstallModal(false)}
        >
          <div className="install-content">
            <span className="install-icon">
              <BookOpen size={35} />
            </span>
            <h3>iPhone Safari 加入主畫面</h3>
            <ol>
              <li>使用 Safari 開啟正式 HTTPS 網址。</li>
              <li>點分享按鈕，選擇「加入主畫面」。</li>
              <li>首次連線等待資源下載，再試飛航模式。</li>
            </ol>
            <h3>離線與更新</h3>
            <p>
              行程、在地攻略與記帳可離線；Google
              Maps、電話與天氣更新依網路／裝置能力。天氣最多保留兩座城市 24
              小時快取並標更新時間。
            </p>
            <p>
              新版本就緒時會顯示更新按鈕。先儲存表單；更新只替換 App
              資源，IndexedDB 帳本保留。定期匯出
              JSON，清除網站資料或換機仍會遺失未備份內容。
            </p>
            <p className="small muted">
              iPhone 真機安裝、獨立主畫面儲存與重新啟動須實機確認。Safari
              的分頁與主畫面 App
              可能使用不同儲存環境，請在要長期使用的環境記帳並備份。
            </p>
            {todayPath && (
              <NavLink
                to="/expenses"
                className="text-link"
                onClick={() => setInstallModal(false)}
              >
                前往記帳與備份
                <ArrowRight size={15} />
              </NavLink>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {text && <p className="subheading">{text}</p>}
      </div>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <BookOpen size={27} />
      <p>{text}</p>
    </div>
  );
}
function ExpenseForm({
  expense,
  day,
  rate,
  busy,
  onSave,
  onDelete,
}: {
  expense?: Expense;
  day: Day;
  rate: number;
  busy: boolean;
  onSave: (e: Expense) => Promise<void>;
  onDelete?: () => void;
}) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void onSave({
      id: expense?.id ?? crypto.randomUUID(),
      date: String(f.get('date')),
      title: String(f.get('title')),
      category: String(f.get('category')),
      jpy: Number(f.get('jpy')),
      rate: Number(f.get('rate')),
      updated: new Date().toISOString(),
    });
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        消費名稱
        <input
          name="title"
          autoFocus
          required
          maxLength={200}
          defaultValue={expense?.title}
          placeholder="例如：京都站晚餐"
        />
      </label>
      <div className="form-row">
        <label>
          日幣金額（JPY）
          <input
            name="jpy"
            type="number"
            inputMode="numeric"
            min="1"
            max="1000000000"
            step="1"
            required
            defaultValue={expense?.jpy}
          />
        </label>
        <label>
          分類
          <select name="category" defaultValue={expense?.category ?? '餐飲'}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        日期
        <select name="date" defaultValue={expense?.date ?? day.date}>
          {days.map((d) => (
            <option key={d.date} value={d.date}>
              {d.date} · Day {d.id}
            </option>
          ))}
        </select>
      </label>
      <label>
        此筆匯率（TWD / JPY）
        <input
          name="rate"
          type="number"
          inputMode="decimal"
          min="0.000001"
          max="10"
          step="0.000001"
          required
          defaultValue={expense?.rate ?? rate}
        />
      </label>
      <button className="primary" disabled={busy}>
        <Check size={17} />
        {busy ? '儲存中…' : '儲存消費'}
      </button>
      {onDelete && (
        <button
          className="danger"
          type="button"
          disabled={busy}
          onClick={onDelete}
        >
          刪除此筆消費
        </button>
      )}
    </form>
  );
}
function Flight({
  name,
  flight,
  from,
  to,
  depart,
  arrive,
  note,
}: {
  name: string;
  flight: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  note: string;
}) {
  return (
    <article className="flight-card">
      <div className="flight-label">
        <span>{name}</span>
        <strong>長榮航空 {flight}</strong>
      </div>
      <div className="flight-route">
        <div>
          <strong>{depart}</strong>
          <span>{from}</span>
        </div>
        <ArrowRight size={24} />
        <div>
          <strong>{arrive}</strong>
          <span>{to}</span>
        </div>
      </div>
      <p>{note}</p>
    </article>
  );
}
function Hotel({
  name,
  address,
  phone,
  dates,
  note,
  sourceId,
  copy,
}: {
  name: string;
  address: string;
  phone: string;
  dates: string;
  note: string;
  sourceId: string;
  copy: (v: string) => Promise<void>;
}) {
  return (
    <article className="hotel-card">
      <span className="eyebrow">{dates}</span>
      <h3>{name}</h3>
      <p className="selectable">{address}</p>
      <p className="muted small">{note}</p>
      <div className="hotel-actions">
        <a
          href={maps({ name, address })}
          className="navigate"
          target="_blank"
          rel="noreferrer"
        >
          <Compass size={16} />
          導航
        </a>
        <a href={'tel:' + phone} className="outline">
          <Phone size={15} />
          撥號
        </a>
        <button
          className="outline"
          onClick={() => {
            void copy(address);
          }}
        >
          <Copy size={15} />
          地址
        </button>
      </div>
      <SourceLinks ids={[sourceId]} />
    </article>
  );
}
const packing = [
  '內衣褲、上衣、下身、外套、襪子、睡衣',
  '拖鞋、圍巾、頭枕、墨鏡、口罩',
  '手機、相機、充電線、充電器、行動電源',
  'SIM／旅遊卡、相關線材、支架',
  '卸妝棉、洗面乳、牙膏、牙刷、指甲剪',
  '濕紙巾、面紙、防曬用品、保養品',
  '身分證、護照、機票、信用卡、交通卡',
  '住宿訂單、旅遊手冊、其他證件',
  '個人常備藥、暈車藥、過敏藥、眼藥水、護手霜',
];
function Packing({
  readOnly,
  values,
  save,
}: {
  readOnly: boolean;
  values: PrivateInfo[];
  save: (p: PrivateInfo) => Promise<void>;
}) {
  let checked: string[] = [];
  try {
    const data = JSON.parse(
      values.find((p) => p.id === 'packing')?.value ?? '[]',
    );
    if (Array.isArray(data))
      checked = data.filter((v) => typeof v === 'string');
  } catch {
    /* Invalid optional checklist is shown empty. */
  }
  return (
    <section className="packing">
      <h2>行李，準備好了嗎？</h2>
      <p className="muted small">
        PDF p.3 · 勾選結果保存本機。個人藥物請依原處方與入境規定準備。
      </p>
      {packing.map((p) => (
        <label key={p}>
          <input
            type="checkbox"
            disabled={readOnly}
            checked={checked.includes(p)}
            onChange={(e) => {
              void save({
                id: 'packing',
                label: '行李清單',
                value: JSON.stringify(
                  e.target.checked
                    ? [...checked, p]
                    : checked.filter((x) => x !== p),
                ),
              });
            }}
          />
          <span>{p}</span>
        </label>
      ))}
    </section>
  );
}

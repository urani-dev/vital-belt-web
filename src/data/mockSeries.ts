/**
 * Chuỗi dữ liệu GIẢ cho biểu đồ lịch sử (F8 24 時間, F10 日次/週次) — Firestore chỉ giữ packet mới nhất,
 * chưa có lịch sử. Sinh xác định theo memberId để biểu đồ không nhảy giữa các lần render.
 * Sóng mạch/thở là dữ liệu thật (dopplerHeart / dopplerBreath), không nằm ở đây.
 */

export type Point = [number, number];
/** Điểm sóng: [giây, giá trị]; null = khoảng mất packet. */
export type WavePoint = [number, number | null];
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function seeded(seedText: string): () => number {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** 24 giờ của điểm tổng, mỗi 10 phút, kết thúc đúng giá trị hiện tại. */
export function overall24h(memberId: string, current: number, nowMs: number): Point[] {
  const rand = seeded(`overall-${memberId}`);
  const steps = 24 * 6;
  const points: Point[] = [];
  let value = Math.min(95, current + 25);
  for (let i = 0; i <= steps; i++) {
    const remaining = steps - i;
    value += (current - value) / Math.max(remaining, 1) * 0.6 + (rand() - 0.5) * 4;
    value = Math.max(0, Math.min(100, value));
    points.push([nowMs - remaining * 600_000, Math.round(remaining === 0 ? current : value)]);
  }
  return points;
}

/** Giữ giá trị trong khung trục Y của biểu đồ (design: mạch 50–110, thở 0–60). */
function clamp(value: number, [lo, hi]: [number, number]): number {
  return Math.max(lo, Math.min(hi, value));
}

export interface SeriesShape {
  /** Mức trung bình trong ngày */
  base: number;
  /** Biên độ nhịp ngày đêm: cao nhất khoảng 13 時, thấp nhất khoảng 4 時 */
  swing: number;
  /** Độ nhiễu từng điểm */
  noise: number;
  /** Khung trục Y, điểm vượt khung bị kẹp lại */
  range: [number, number];
}

/** 日次: 6 時 → 翌 6 時, mỗi 15 phút. Dạng giống design: thấp lúc sáng sớm, cao giữa trưa, thấp nhất về khuya. */
export function dailySeries(seed: string, shape: SeriesShape, nowMs: number): Point[] {
  const rand = seeded(seed);
  const start = new Date(nowMs);
  start.setHours(6, 0, 0, 0);
  if (start.getTime() > nowMs) start.setTime(start.getTime() - DAY_MS);
  const points: Point[] = [];
  let drift = 0;
  for (let ts = start.getTime(); ts <= start.getTime() + DAY_MS; ts += 15 * 60_000) {
    const d = new Date(ts);
    const hour = d.getHours() + d.getMinutes() / 60;
    const circadian = Math.cos(((hour - 13) / 24) * 2 * Math.PI);
    drift = drift * 0.7 + (rand() - 0.5) * shape.noise;
    points.push([ts, Math.round(clamp(shape.base + shape.swing * circadian + drift, shape.range))]);
  }
  return points;
}

export interface WeeklyRange {
  /** 0 = 日 ... 6 = 土 */
  day: number;
  min: number;
  max: number;
}

/** 週次: min–max theo từng ngày trong tuần, mỗi thanh dài khoảng `span` (design: mạch ~35 bpm, thở ~20 rpm). */
export function weeklyRanges(seed: string, base: number, span: number, range: [number, number]): WeeklyRange[] {
  const rand = seeded(seed);
  return Array.from({ length: 7 }, (_, day) => {
    const center = base + (rand() - 0.5) * span * 0.3;
    const half = (span / 2) * (0.85 + rand() * 0.3);
    return { day, min: Math.round(clamp(center - half, range)), max: Math.round(clamp(center + half, range)) };
  });
}

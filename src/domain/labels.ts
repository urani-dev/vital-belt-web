import type { Category, LocationSource, MemberLocation, ResponseStatus } from "./types";
import type { Reason } from "./classify";
import { STATUS_MOVING, STATUS_NO_PERSON, UNKNOWN_SCORE } from "./classify";

/** Label hiển thị trên UI (tiếng Nhật) — nghĩa tiếng Việt ở comment. */

export const CATEGORY_LABEL: Record<Category, string> = {
  priority: "優先確認", // Ưu tiên kiểm tra
  caution: "要注意", // Cần chú ý
  normal: "安定", // Ổn định
};

/** KPI dùng bộ label riêng theo design (ADMIN-SPEC F2). */
export const KPI_LABEL: Record<Category, { title: string; note: string }> = {
  priority: { title: "優先確認", note: "状態を先に確認" },
  caution: { title: "要確認", note: "変化を確認" },
  normal: { title: "通常", note: "確認対象外" },
};

export const RESPONSE_LABEL: Record<ResponseStatus, string> = {
  unhandled: "未対応", // Chưa xử lý
  inProgress: "対応中", // Đang xử lý
  confirmed: "確認済", // Đã xác nhận
};

/** Mã tư thế packet → label (ADMIN-SPEC §8.1). */
const POSTURE_LABEL: Record<number, string> = {
  0: "未判定", // Chưa xác định
  1: "立位", // Đứng
  2: "仰向け", // Nằm ngửa
  3: "うつ伏せ", // Nằm sấp
  4: "左向き", // Nghiêng trái
  5: "右向き", // Nghiêng phải
  6: "逆さま", // Đảo ngược
};

export const EMPTY_VALUE = "—";

/** Nhãn trạng thái sensor (packet `status`) — label JP là đề xuất, cần khách hàng duyệt. */
const SENSOR_STATE_LABEL: Record<number, string> = {
  [STATUS_NO_PERSON]: "未装着", // Chưa đeo đai
  [STATUS_MOVING]: "体動中", // Đang cử động
};

/** null khi đang đeo bình thường (status 0) — không cần nhãn. */
export function sensorStateLabel(status: number): string | null {
  return SENSOR_STATE_LABEL[status] ?? null;
}

export function postureLabel(code: number): string {
  return POSTURE_LABEL[code] ?? EMPTY_VALUE;
}

/** Điểm 0–100; 255 (packet) hoặc null (displayScores) = không xác định → "—". */
export function scoreText(value: number | null): string {
  return value === null || value === UNKNOWN_SCORE ? EMPTY_VALUE : String(value);
}

/** Nhịp mạch/thở; 0 = không đo được → "—". */
export function rateText(value: number): string {
  return value > 0 ? String(value) : EMPTY_VALUE;
}

const REASON_TEXT: Record<Reason["key"], { high: string; low: string }> = {
  signalLost: { high: "センサーデータが途絶", low: "センサーデータが途絶" }, // Mất dữ liệu cảm biến
  notWorn: { high: "ベルト未装着", low: "ベルト未装着" }, // Đai chưa được đeo
  heatRisk: { high: "暑熱リスク指標が上昇", low: "暑熱リスク指標が上昇" }, // Rủi ro nắng nóng tăng
  envRisk: { high: "環境リスクが上昇", low: "環境リスクが上昇" }, // Rủi ro môi trường tăng
  heartBeat: { high: "脈拍が上昇", low: "脈拍が低下" }, // Mạch tăng / giảm
  breath: { high: "呼吸数が上昇", low: "呼吸数が低下" }, // Nhịp thở tăng / giảm
  fatigue: { high: "疲労度が上昇", low: "疲労度が上昇" }, // Mệt mỏi tăng
  drowsiness: { high: "眠気度が上昇", low: "眠気度が上昇" }, // Buồn ngủ tăng
  stress: { high: "ストレス度が上昇", low: "ストレス度が上昇" }, // Căng thẳng tăng
  overall: { high: "総合コンディションが低下", low: "総合コンディションが低下" }, // Điểm tổng giảm
};

export function reasonText(reason: Reason): string {
  return REASON_TEXT[reason.key][reason.side];
}

/** Level 1..5 của packet → câu nhận xét. 3 trở lên = ổn định. */
export function pulseComment(level: number): string {
  return level >= 3 ? "脈拍は安定してます。" : "脈拍が乱れてます。";
}

export function breathComment(level: number): string {
  return level >= 3 ? "呼吸は安定してます。" : "呼吸が乱れてます。";
}

/** "20 秒前" / "5 分前" / "2 時間前". */
export function relativeTime(from: number, now: number): string {
  const sec = Math.max(0, Math.floor((now - from) / 1000));
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分前`;
  return `${Math.floor(min / 60)} 時間前`;
}

export const LOCATION_SOURCE_LABEL: Record<LocationSource, string> = {
  udp: "ベルト GPS", // GPS trong packet của đai
  device: "端末 GPS", // GPS của điện thoại chạy app
};

/** "GPS 更新 20 秒前・端末 GPS" (GPS cập nhật 20 giây trước, nguồn điện thoại); không có tọa độ → "GPS 位置なし". */
export function gpsText(location: MemberLocation, now: number): string {
  if (location.lat === null) return "GPS 位置なし"; // Không có vị trí GPS
  const source = location.source ? `・${LOCATION_SOURCE_LABEL[location.source]}` : "";
  return `GPS 更新 ${relativeTime(location.updatedAt, now)}${source}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日（${WEEKDAYS[d.getDay()]}）`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${formatTime(ts)}`;
}

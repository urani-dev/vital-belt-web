import type { Category, LocationState, Member } from "./types";
import { breaches, type MetricKey, type MetricRule, type ThresholdConfig } from "./thresholds";

/** Giá trị 255 trong packet = không xác định (vital-belt-firestore-web-spec §3.2). */
export const UNKNOWN_SCORE = 255;
/** packet `status` = 1: không có người đeo. */
export const STATUS_NO_PERSON = 1;
/** packet `status` = 2: đang cử động — số đo có thể không ổn định, không đổi mức. */
export const STATUS_MOVING = 2;
/** packet `heatStress`: 1..5, cao hơn = rủi ro nhiệt cao hơn. */
export const HEAT_STRESS_MIN = 1;
export const HEAT_STRESS_MAX = 5;

export type ReasonKey = MetricKey | "signalLost" | "notWorn";

export interface Reason {
  key: ReasonKey;
  level: Exclude<Category, "normal">;
  /** Chiều vượt ngưỡng, dùng để chọn câu "上昇" hay "低下". */
  side: "high" | "low";
}

export interface Classification {
  category: Category;
  /** Đã sắp theo mức độ nặng: priority trước, sau đó theo REASON_ORDER. */
  reasons: Reason[];
}

/**
 * Thứ tự ưu tiên khi chọn lý do hiển thị cùng mức. Nguyên nhân cụ thể (nắng nóng,
 * sinh hiệu) đứng trước điểm tổng hợp vì cho người quản lý biết phải làm gì.
 */
const REASON_ORDER: ReasonKey[] = [
  "signalLost",
  "notWorn",
  "heatRisk",
  "envRisk",
  "heartBeat",
  "breath",
  "fatigue",
  "drowsiness",
  "stress",
  "overall",
];

const CATEGORY_RANK: Record<Category, number> = { priority: 0, caution: 1, normal: 2 };

function metricValue(member: Member, key: MetricKey): number | null {
  const { vitals, scores } = member;
  const measuring = vitals.status !== STATUS_NO_PERSON;
  switch (key) {
    case "heartBeat":
      return measuring && vitals.heartBeat > 0 ? vitals.heartBeat : null;
    case "breath":
      return measuring && vitals.breath > 0 ? vitals.breath : null;
    case "overall":
    case "fatigue":
    case "drowsiness":
    case "stress": {
      const value = vitals[key];
      return measuring && value !== UNKNOWN_SCORE ? value : null;
    }
    case "envRisk":
      return scores.environmentRisk;
    case "heatRisk":
      // packet.vital.heatStress thang 1–5 (spec §8); ngoài miền = không xác định.
      return vitals.heatStress >= HEAT_STRESS_MIN && vitals.heatStress <= HEAT_STRESS_MAX ? vitals.heatStress : null;
  }
}

function sideOf(rule: MetricRule, value: number): "high" | "low" {
  if (rule.direction === "low") return "low";
  if (rule.direction === "high") return "high";
  const mid = ((rule.caution.low ?? value) + (rule.caution.high ?? value)) / 2;
  return value < mid ? "low" : "high";
}

/** Phân loại tức thời theo bộ ngưỡng (chưa áp dụng thời gian duy trì). */
export function classify(member: Member, config: ThresholdConfig, now: number): Classification {
  const reasons: Reason[] = [];

  const silentSec = (now - member.vitalsUpdatedAt) / 1000;
  if (silentSec > config.signalLostPrioritySec) {
    reasons.push({ key: "signalLost", level: "priority", side: "high" });
  } else if (silentSec > config.signalLostCautionSec) {
    reasons.push({ key: "signalLost", level: "caution", side: "high" });
  }

  // Không đeo đai: không còn ai được theo dõi → 要確認, không đánh đồng với 安定 (firestore-web-spec §8).
  if (member.vitals.status === STATUS_NO_PERSON) {
    reasons.push({ key: "notWorn", level: "caution", side: "high" });
  }

  for (const rule of config.rules) {
    const value = metricValue(member, rule.key);
    if (value === null) continue;
    if (breaches(rule, rule.priority, value)) {
      reasons.push({ key: rule.key, level: "priority", side: sideOf(rule, value) });
    } else if (breaches(rule, rule.caution, value)) {
      reasons.push({ key: rule.key, level: "caution", side: sideOf(rule, value) });
    }
  }

  reasons.sort(
    (a, b) =>
      CATEGORY_RANK[a.level] - CATEGORY_RANK[b.level] ||
      REASON_ORDER.indexOf(a.key) - REASON_ORDER.indexOf(b.key),
  );
  const category: Category = reasons[0]?.level ?? "normal";
  return { category, reasons };
}

export interface SustainState {
  current: Category;
  /** Lý do của mức đang hiển thị — luôn khớp `current`, không phải kết quả tức thời. */
  reasons: Reason[];
  pending: { category: Category; since: number } | null;
}

/** Mức do mất tín hiệu quyết định: ngưỡng signalLost đã là thời gian, không chờ thêm sustainSec. */
function signalDriven(reasons: Reason[]): boolean {
  return reasons[0]?.key === "signalLost";
}

/**
 * Chỉ đổi mức khi mức mới giữ liên tục ≥ sustainSec (F13).
 * Lần quan sát đầu tiên được nhận ngay vì chưa có lịch sử để đối chiếu.
 * Vào hoặc ra khỏi trạng thái mất tín hiệu thì đổi ngay.
 */
export function applySustain(
  prev: SustainState | undefined,
  raw: Classification,
  now: number,
  sustainSec: number,
): SustainState {
  const accept: SustainState = { current: raw.category, reasons: raw.reasons, pending: null };
  if (!prev || raw.category === prev.current) return accept;
  if (signalDriven(raw.reasons) || signalDriven(prev.reasons)) return accept;
  if (prev.pending?.category === raw.category) {
    return now - prev.pending.since >= sustainSec * 1000 ? accept : prev;
  }
  return { current: prev.current, reasons: prev.reasons, pending: { category: raw.category, since: now } };
}

export function locationState(member: Member, config: ThresholdConfig, now: number): LocationState {
  const ageMin = (now - member.location.updatedAt) / 60000;
  const { lat, areaId } = member.location;
  if (lat === null || areaId === null || ageMin > config.locationUnknownMin) return "unknown";
  if (ageMin > config.locationStaleMin) return "stale";
  return "fresh";
}

/** 確認優先順: mức ưu tiên → số thứ tự (khớp thứ tự 01, 02, 04, 08, 03… trong mockup). */
export function compareByPriority(
  a: { category: Category; member: Member },
  b: { category: Category; member: Member },
): number {
  return CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] || a.member.no.localeCompare(b.member.no);
}

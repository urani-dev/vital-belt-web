/**
 * Ngưỡng cảnh báo F13 (ADMIN-SPEC §4b).
 * Giá trị mặc định là tạm thời, chưa có căn cứ y tế.
 */

export type MetricKey =
  | "overall"
  | "heartBeat"
  | "breath"
  | "fatigue"
  | "drowsiness"
  | "stress"
  | "envRisk"
  | "heatRisk";

/** high = cao là xấu, low = thấp là xấu, both = lệch hai phía là xấu. */
export type Direction = "high" | "low" | "both";

export interface Bound {
  low?: number;
  high?: number;
}

export interface MetricRule {
  key: MetricKey;
  direction: Direction;
  caution: Bound;
  priority: Bound;
}

export interface ThresholdConfig {
  rules: MetricRule[];
  /** Số giây vượt ngưỡng liên tục mới đổi mức. */
  sustainSec: number;
  /** Phút — quá ngưỡng thì hiện nhãn thời gian cạnh pin. */
  locationStaleMin: number;
  /** Phút — quá ngưỡng thì coi là 現在地不明. */
  locationUnknownMin: number;
  /** Giây mất dữ liệu cảm biến → 要確認. */
  signalLostCautionSec: number;
  /** Giây mất dữ liệu cảm biến → 優先確認. */
  signalLostPrioritySec: number;
}

export interface MetricMeta {
  label: string;
  unit: string;
  min: number;
  max: number;
}

export const METRIC_META: Record<MetricKey, MetricMeta> = {
  overall: { label: "総合コンディション", unit: "/100", min: 0, max: 100 },
  heartBeat: { label: "脈拍", unit: "bpm", min: 20, max: 250 },
  breath: { label: "呼吸", unit: "rpm", min: 0, max: 60 },
  fatigue: { label: "疲労度", unit: "/100", min: 0, max: 100 },
  drowsiness: { label: "眠気度", unit: "/100", min: 0, max: 100 },
  stress: { label: "ストレス度", unit: "/100", min: 0, max: 100 },
  envRisk: { label: "環境リスク", unit: "/100", min: 0, max: 100 },
  // packet.vital.heatStress — thang 1–5 (firestore-web-spec §8), không phải 0–100.
  heatRisk: { label: "熱中危険度", unit: "/5", min: 1, max: 5 },
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  rules: [
    { key: "overall", direction: "low", caution: { low: 70 }, priority: { low: 50 } },
    { key: "heartBeat", direction: "both", caution: { low: 50, high: 100 }, priority: { low: 40, high: 120 } },
    { key: "breath", direction: "both", caution: { low: 10, high: 24 }, priority: { low: 8, high: 30 } },
    { key: "fatigue", direction: "high", caution: { high: 70 }, priority: { high: 85 } },
    { key: "drowsiness", direction: "high", caution: { high: 70 }, priority: { high: 85 } },
    { key: "stress", direction: "high", caution: { high: 70 }, priority: { high: 85 } },
    { key: "envRisk", direction: "high", caution: { high: 60 }, priority: { high: 80 } },
    { key: "heatRisk", direction: "high", caution: { high: 4 }, priority: { high: 5 } },
  ],
  sustainSec: 60,
  locationStaleMin: 3,
  locationUnknownMin: 10,
  signalLostCautionSec: 60,
  signalLostPrioritySec: 300,
};

/**
 * Vượt ngưỡng hay chưa. Chiều "low": giá trị <= ngưỡng là vượt (vd 総合 ≤ 70).
 * Chiều "high" với điểm 0–100: giá trị >= ngưỡng là vượt (vd 疲労度 ≥ 70).
 * Riêng mạch/thở: dùng so sánh chặt (> 100, < 50) theo bảng F13.
 */
export function breaches(rule: MetricRule, bound: Bound, value: number): boolean {
  const strict = rule.direction === "both";
  if (bound.low !== undefined && (strict ? value < bound.low : value <= bound.low)) return true;
  if (bound.high !== undefined && (strict ? value > bound.high : value >= bound.high)) return true;
  return false;
}

export type ValidationErrors = Partial<Record<string, string>>;

/** Trả về map lỗi theo field; rỗng = hợp lệ. */
export function validateThresholds(config: ThresholdConfig): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const rule of config.rules) {
    const meta = METRIC_META[rule.key];
    const fields: Array<[string, number | undefined]> = [
      [`${rule.key}.caution.low`, rule.caution.low],
      [`${rule.key}.caution.high`, rule.caution.high],
      [`${rule.key}.priority.low`, rule.priority.low],
      [`${rule.key}.priority.high`, rule.priority.high],
    ];
    for (const [field, value] of fields) {
      if (value === undefined) continue;
      if (!Number.isFinite(value) || value < meta.min || value > meta.max) {
        errors[field] = `${meta.min}〜${meta.max} の範囲で入力してください`;
      }
    }
    const { caution, priority } = rule;
    if (caution.high !== undefined && priority.high !== undefined && !(priority.high > caution.high)) {
      errors[`${rule.key}.priority.high`] = "優先確認は要確認より厳しい値にしてください";
    }
    if (caution.low !== undefined && priority.low !== undefined && !(priority.low < caution.low)) {
      errors[`${rule.key}.priority.low`] = "優先確認は要確認より厳しい値にしてください";
    }
    if (caution.low !== undefined && caution.high !== undefined && !(caution.low < caution.high)) {
      errors[`${rule.key}.caution.high`] = "上限は下限より大きい値にしてください";
    }
  }
  const positive: Array<[keyof ThresholdConfig, number]> = [
    ["sustainSec", config.sustainSec],
    ["locationStaleMin", config.locationStaleMin],
    ["locationUnknownMin", config.locationUnknownMin],
    ["signalLostCautionSec", config.signalLostCautionSec],
    ["signalLostPrioritySec", config.signalLostPrioritySec],
  ];
  for (const [field, value] of positive) {
    if (!Number.isFinite(value) || value <= 0) errors[field] = "0 より大きい値を入力してください";
  }
  if (!errors.locationUnknownMin && !(config.locationUnknownMin > config.locationStaleMin)) {
    errors.locationUnknownMin = "「位置が古い」より長い時間にしてください";
  }
  if (!errors.signalLostPrioritySec && !(config.signalLostPrioritySec > config.signalLostCautionSec)) {
    errors.signalLostPrioritySec = "要確認より長い時間にしてください";
  }
  return errors;
}

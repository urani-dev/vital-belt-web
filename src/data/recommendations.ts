import type { ReasonKey } from "../domain/classify";

/**
 * Nội dung 推奨対応 (F7). Mẫu 暑熱 lấy nguyên văn từ design;
 * mẫu chung là đề xuất, cần khách hàng duyệt.
 */
export interface Recommendation {
  title: string;
  /** {area} được thay bằng tên khu vực. */
  summary: string;
  steps: Array<{ title: string; detail: string }>;
  warning: string;
  source: string | null;
}

const HEAT: Recommendation = {
  title: "まず、本人の体調を確認",
  summary: "暑熱リスク指標の上昇を検知。GPS では{area}に位置しています。症状はまだ確認されていません。",
  steps: [
    { title: "本人へ連絡し、現地確認を手配", detail: "めまい・頭痛・吐き気などの有無と、呼びかけへの反応を確認。" },
    { title: "症状があれば作業を中断", detail: "涼しい場所へ移動させ、身体を冷やす。現場担当者が付き添う。" },
    { title: "状態を見ながら次の対応へ", detail: "自力で飲める場合に水分を補給。改善しない場合は医療機関へ。" },
  ],
  warning: "反応がおかしい・自力で飲めない場合は 119 番。水分を無理に飲ませない。",
  source: "対応例の参考：環境省 熱中症予防情報",
};

const GENERAL: Recommendation = {
  title: "まず、本人の体調を確認",
  summary: "状態の変化を検知。GPS では{area}に位置しています。症状はまだ確認されていません。",
  steps: [
    { title: "本人へ連絡し、現地確認を手配", detail: "体調の変化や異常の有無と、呼びかけへの反応を確認。" },
    { title: "症状があれば作業を中断", detail: "安全な場所で休ませる。現場担当者が付き添う。" },
    { title: "状態を見ながら次の対応へ", detail: "改善しない場合は医療機関へ。" },
  ],
  warning: "反応がおかしい場合は 119 番。",
  source: null,
};

const SIGNAL_LOST: Recommendation = {
  title: "まず、本人と連絡を取る",
  summary: "センサーデータが途絶えています。最終位置は{area}です。",
  steps: [
    { title: "本人へ連絡", detail: "デバイスの装着状態と体調を確認。" },
    { title: "連絡が取れなければ現地確認を手配", detail: "最終位置周辺を確認する。" },
    { title: "状態を見ながら次の対応へ", detail: "異常があれば作業を中断し、医療機関へ。" },
  ],
  warning: "倒れている・反応がない場合は 119 番。",
  source: null,
};

/** Mẫu 未装着 là đề xuất, cần khách hàng duyệt. */
const NOT_WORN: Recommendation = {
  title: "まず、ベルトの装着を確認",
  summary: "ベルトが装着されていません。GPS では{area}に位置しています。",
  steps: [
    { title: "本人へ連絡", detail: "ベルトを装着しているか、外した理由と体調を確認。" },
    { title: "連絡が取れなければ現地確認を手配", detail: "現在位置の周辺で本人とベルトの状態を確認する。" },
    { title: "装着を再開", detail: "休憩などで外した場合は、作業再開時に装着してもらう。" },
  ],
  warning: "倒れている・反応がない場合は 119 番。",
  source: null,
};

export function recommendationFor(reason: ReasonKey | undefined): Recommendation {
  if (reason === "heatRisk" || reason === "envRisk") return HEAT;
  if (reason === "signalLost") return SIGNAL_LOST;
  if (reason === "notWorn") return NOT_WORN;
  return GENERAL;
}

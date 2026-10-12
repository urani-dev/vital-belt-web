import type { Area, DisplayScores, Operation, PacketVitals } from "../domain/types";

/**
 * Dữ liệu giả của phase 1 dựng theo mockup (docs/20261009-134657.png): tên công việc, khu vực, danh sách người.
 * Số liệu cảm biến lấy từ Firestore (./liveSource.ts), ghép vào danh sách này ở ./demoRoster.ts.
 */

export const OPERATION: Operation = {
  organization: "株式会社 D.O.N",
  department: "製造 3 部",
  name: "業務 _ 幕張メッセ運用（仮）",
  center: [35.6482, 140.0352],
  centerLabel: "幕張メッセ周辺",
  weather: { temperature: 31.2, humidity: 72, condition: "曇り" },
};

export const AREAS: Area[] = [
  { id: "a1", code: "エリア 1", name: "屋外作業場" },
  { id: "a2", code: "エリア 2", name: "製造エリア" },
  { id: "a3", code: "エリア 3", name: "物流エリア" },
  { id: "a4", code: "エリア 4", name: "管理棟" },
  { id: "a5", code: "エリア 5", name: "屋外通路" },
];

/** Các chỉ số packet được cộng độ lệch cho người giả lập. */
export type ShiftableVital = "heartBeat" | "breath" | "overall" | "fatigue" | "drowsiness" | "stress" | "relaxation" | "concentration";

/**
 * Danh sách 10 người theo mockup. Phase 1 chỉ có một kênh thật (5005):
 * người `real` nhận nguyên dữ liệu kênh, 9 người còn lại là bản sao có độ lệch.
 * Độ lệch chỉ áp lên giá trị hợp lệ; giá trị kênh "chưa đo được" (0 / 255 / null) thì người demo
 * dùng số mock của mình (MOCK_VITALS / MOCK_SCORES + `mock`) để màn hình demo không trống.
 */
export interface DemoMemberSeed {
  id: string;
  no: string;
  name: string;
  /** Tọa độ trong mockup — chỉ dùng để giữ bố cục tương đối quanh người thật. */
  lat: number;
  lng: number;
  areaId: string | null;
  lastKnownAreaId: string;
  real?: true;
  /** Tuổi của vị trí GPS (vị trí đứng yên). null = theo vị trí hiện tại. */
  frozenLocationAgeMs: number | null;
  vitals?: Partial<Record<ShiftableVital, number>>;
  /** Kịch bản demo: rủi ro nhiệt tối thiểu (thang 1–5). */
  heatStressAtLeast?: number;
  scores?: Partial<Record<keyof DisplayScores, number>>;
  /** Số mock riêng của người này, dùng khi kênh thật chưa đo được (theo mockup). */
  mock?: { vitals?: Partial<PacketVitals>; scores?: Partial<Record<keyof DisplayScores, number>> };
}

/** Số mock mặc định của người demo khi kênh thật chưa đo được. */
export const MOCK_VITALS: Pick<
  PacketVitals,
  "heartBeat" | "breath" | "heatStress" | "heartRateLevel" | "respirationLevel" | "posture" | "fatigue" | "concentration" | "drowsiness" | "stress" | "relaxation" | "overall"
> = {
  heartBeat: 74,
  breath: 16,
  heatStress: 2,
  heartRateLevel: 4,
  respirationLevel: 4,
  posture: 1,
  fatigue: 35,
  concentration: 62,
  drowsiness: 28,
  stress: 34,
  relaxation: 58,
  overall: 80,
};

export const MOCK_SCORES: Record<keyof DisplayScores, number> = {
  activityScore: 52,
  bodyStatus: 78,
  mindStatus: 74,
  environmentRisk: 35,
  mindMargin: 60,
  comfortScore: 62,
  discomfortScore: 18,
};

export const DEMO_MEMBERS: DemoMemberSeed[] = [
  {
    id: "m01", no: "01", name: "佐藤 元気", lat: 35.6494, lng: 140.0322, areaId: "a1", lastKnownAreaId: "a1", frozenLocationAgeMs: null,
    vitals: { heartBeat: 6, breath: 5, overall: -35, fatigue: 45, drowsiness: 25, stress: 35 },
    heatStressAtLeast: 5,
    scores: { bodyStatus: -30, mindStatus: -30, environmentRisk: 55, mindMargin: -20, comfortScore: -25, discomfortScore: 30 },
    mock: {
      vitals: { heartBeat: 79, breath: 21, respirationLevel: 2, fatigue: 72, concentration: 54, drowsiness: 46, stress: 58, relaxation: 50, overall: 45 },
      scores: { bodyStatus: 51, mindStatus: 47, environmentRisk: 72, activityScore: 44, mindMargin: 45, comfortScore: 55, discomfortScore: 13 },
    },
  },
  {
    id: "m02", no: "02", name: "鈴木 一郎", lat: 35.6499, lng: 140.0371, areaId: "a2", lastKnownAreaId: "a2", frozenLocationAgeMs: null,
    vitals: { heartBeat: 12, overall: -15, fatigue: 30, stress: 40 },
    heatStressAtLeast: 4,
    scores: { bodyStatus: -15, mindStatus: -15, environmentRisk: 25 },
    mock: { vitals: { heartBeat: 88, fatigue: 64, stress: 61, overall: 65 }, scores: { bodyStatus: 63, mindStatus: 60, environmentRisk: 40 } },
  },
  {
    id: "m03", no: "03", name: "田中 健二", lat: 35.6466, lng: 140.0378, areaId: "a3", lastKnownAreaId: "a3", frozenLocationAgeMs: null,
    real: true,
  },
  {
    id: "m04", no: "04", name: "佐藤 次郎", lat: 35.6487, lng: 140.0332, areaId: "a1", lastKnownAreaId: "a1", frozenLocationAgeMs: null,
    vitals: { heartBeat: 16, breath: 2, overall: -15, fatigue: 35 },
    heatStressAtLeast: 4,
    scores: { bodyStatus: -20, environmentRisk: 40 },
    mock: { vitals: { heartBeat: 92, breath: 19, fatigue: 66, overall: 65 }, scores: { bodyStatus: 60, environmentRisk: 55 } },
  },
  {
    id: "m05", no: "05", name: "伊藤 花子", lat: 35.6457, lng: 140.0346, areaId: "a4", lastKnownAreaId: "a4", frozenLocationAgeMs: null,
    vitals: { heartBeat: -6, breath: -3, overall: 8, stress: -8 },
    scores: { environmentRisk: -5, comfortScore: 5 },
    mock: { vitals: { heartBeat: 68, breath: 14, overall: 85 }, scores: { environmentRisk: 15 } },
  },
  {
    id: "m06", no: "06", name: "高橋 三郎", lat: 35.6504, lng: 140.0388, areaId: "a2", lastKnownAreaId: "a2", frozenLocationAgeMs: null,
    vitals: { heartBeat: 3, overall: 3 },
    scores: { bodyStatus: 4 },
    mock: { vitals: { overall: 80 } },
  },
  {
    id: "m07", no: "07", name: "中村 直樹", lat: 35.6459, lng: 140.0362, areaId: "a3", lastKnownAreaId: "a3", frozenLocationAgeMs: null,
    vitals: { heartBeat: -2, breath: 1, overall: 1 },
    scores: { mindStatus: 3 },
    mock: { vitals: { overall: 78 } },
  },
  {
    id: "m08", no: "08", name: "渡辺 直人", lat: 35.6471, lng: 140.0394, areaId: null, lastKnownAreaId: "a5", frozenLocationAgeMs: 5 * 60_000,
    vitals: { heartBeat: 14, overall: -18 },
    heatStressAtLeast: 4,
    scores: { environmentRisk: 55 },
    mock: { vitals: { heartBeat: 90, overall: 62 }, scores: { environmentRisk: 50 } },
  },
  {
    id: "m09", no: "09", name: "井上 翔", lat: 35.6463, lng: 140.0371, areaId: "a3", lastKnownAreaId: "a3", frozenLocationAgeMs: null,
    vitals: { heartBeat: 4, overall: 4 },
    scores: { comfortScore: -4 },
    mock: { vitals: { overall: 80 } },
  },
  {
    id: "m10", no: "10", name: "山田 太郎", lat: 35.6491, lng: 140.0315, areaId: "a1", lastKnownAreaId: "a1", frozenLocationAgeMs: null,
    vitals: { heartBeat: 2, breath: -1, overall: 8 },
    scores: { environmentRisk: 10 },
    mock: { vitals: { heartBeat: 76, overall: 85 }, scores: { environmentRisk: 45 } },
  },
];

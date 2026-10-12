/** 確認区分 — mức độ cần kiểm tra (ADMIN-SPEC §3.1). */
export type Category = "priority" | "caution" | "normal";

/** 対応ステータス — trạng thái xử lý (ADMIN-SPEC §3.3). */
export type ResponseStatus = "unhandled" | "inProgress" | "confirmed";

/** Trạng thái vị trí (ADMIN-SPEC §3.2). */
export type LocationState = "fresh" | "stale" | "unknown";

/**
 * Chỉ số lấy từ packet 2240 byte (vital-belt-firestore-web-spec §3.1).
 * Giữ nguyên tên field của packet để tích hợp Firestore không phải đổi tên.
 */
export interface PacketVitals {
  /** 0=có người, 1=không có người, 2=cử động. */
  status: number;
  /** BPM; 0 = không đo được. */
  heartBeat: number;
  /** RPM; 0 = không đo được. */
  breath: number;
  stepCounter: number;
  wbgt: number;
  temperature: number;
  humidity: number;
  bodyMoveIndex: number;
  /** 1..5, cao hơn = rủi ro nhiệt cao hơn. */
  heatStress: number;
  /** 1..5, 5 = rất tốt. */
  heartRateLevel: number;
  /** 1..5, 5 = rất tốt. */
  respirationLevel: number;
  /** Mã tư thế 0..6 hoặc 255 (ADMIN-SPEC §8.1). */
  posture: number;
  /** 0..100 hoặc 255 = không xác định. */
  fatigue: number;
  concentration: number;
  drowsiness: number;
  stress: number;
  relaxation: number;
  overall: number;
}

/**
 * Điểm do app tính và publish cùng packet (`displayScores`, firestore-web-spec §4.3).
 * null = app không tính được → hiển thị "—", web không tự tính bù.
 */
export interface DisplayScores {
  activityScore: number | null;
  bodyStatus: number | null;
  mindStatus: number | null;
  environmentRisk: number | null;
  /** 40–80, hiển thị trên thang /100. */
  mindMargin: number | null;
  comfortScore: number | null;
  discomfortScore: number | null;
}

export interface Area {
  id: string;
  code: string;
  name: string;
}

export interface Operation {
  organization: string;
  department: string;
  name: string;
  center: [number, number];
  centerLabel: string;
  weather: { temperature: number; humidity: number; condition: string };
}

/** Nguồn vị trí: GPS trong packet UDP, hoặc GPS của điện thoại chạy app (`location.source`). */
export type LocationSource = "udp" | "device";

export interface MemberLocation {
  /** null khi cả packet lẫn `location` đều không có tọa độ hợp lệ. */
  lat: number | null;
  lng: number | null;
  source: LocationSource | null;
  /** epoch ms — thời điểm lấy tọa độ. */
  updatedAt: number;
  /** null khi không xác định được khu vực hiện tại. Khu vực là dữ liệu giả ở phase 1. */
  areaId: string | null;
  lastKnownAreaId: string;
}

/** Sóng Doppler gần nhất (125 mẫu/giây), cũ → mới; null = khoảng mất packet. */
export interface Waveforms {
  heart: Array<number | null>;
  breath: Array<number | null>;
}

export interface Member {
  id: string;
  no: string;
  name: string;
  /** true = người giả lập từ dữ liệu kênh thật (phase 1 demo). */
  isDemo: boolean;
  vitals: PacketVitals;
  scores: DisplayScores;
  waves: Waveforms;
  location: MemberLocation;
  /** epoch ms — thời điểm nhận dữ liệu cảm biến gần nhất. */
  vitalsUpdatedAt: number;
}

/** Trạng thái kết nối tới kênh dữ liệu (firestore-web-spec §7.3). */
export type FeedState = "connecting" | "live" | "cached" | "noData" | "denied" | "error";

export interface FeedStatus {
  state: FeedState;
  /** epoch ms — lần cuối nhận sequence mới; null khi chưa nhận gì. */
  lastReceivedAt: number | null;
}

export interface DashboardSnapshot {
  feed: FeedStatus;
  operation: Operation;
  areas: Area[];
  members: Member[];
  /** epoch ms */
  updatedAt: number;
}

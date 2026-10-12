import type { DisplayScores, LocationSource, PacketVitals, Waveforms } from "../domain/types";

/**
 * Đọc document `liveChannels/{id}` (firestore-web-spec §4.1, §7).
 * Hàm thuần — không gọi Firebase — để kiểm thử được bằng dữ liệu mẫu.
 */

export const SAMPLES_PER_PACKET = 125;
/** Giữ sóng đủ cho biểu đồ dài nhất (呼吸 18 秒). */
export const WAVE_BUFFER_SECONDS = 18;
const WAVE_BUFFER_SAMPLES = WAVE_BUFFER_SECONDS * SAMPLES_PER_PACKET;

const VITAL_KEYS: Array<keyof PacketVitals> = [
  "status",
  "heartBeat",
  "breath",
  "stepCounter",
  "wbgt",
  "temperature",
  "humidity",
  "bodyMoveIndex",
  "heatStress",
  "heartRateLevel",
  "respirationLevel",
  "posture",
  "fatigue",
  "concentration",
  "drowsiness",
  "stress",
  "relaxation",
  "overall",
];

const SCORE_KEYS: Array<keyof DisplayScores> = [
  "activityScore",
  "bodyStatus",
  "mindStatus",
  "environmentRisk",
  "mindMargin",
  "comfortScore",
  "discomfortScore",
];

export interface Position {
  lat: number;
  lng: number;
}

/** Tọa độ thô trong packet UDP — chưa chắc hợp lệ (spec §8: encoding GPS chưa được xác nhận). */
export interface UdpGps {
  latitude: number;
  longitude: number;
  latitudeNS: string;
  longitudeEW: string;
}

/** Object `location` ngang hàng `meta` do app ghi (ngoài spec, theo ghi chú của mobile dev). */
export interface AppLocation extends Position {
  source: LocationSource | null;
  /** epoch ms; null khi app không ghi. */
  sampledAt: number | null;
}

export interface LiveChannel {
  sessionId: string;
  sequence: number;
  /** epoch ms; null khi server timestamp chưa xác nhận (bản ghi đang chờ trong cache). */
  publishedAt: number | null;
  vitals: PacketVitals;
  udpGps: UdpGps;
  appLocation: AppLocation | null;
  scores: DisplayScores;
  dopplerHeart: number[];
  dopplerBreath: number[];
}

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function samples(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length !== SAMPLES_PER_PACKET) return null;
  return v.every(isFiniteNumber) ? (v as number[]) : null;
}

function timestampMillis(v: unknown): number | null {
  if (isDict(v) && typeof v.toMillis === "function") return (v.toMillis as () => number)();
  return null;
}

function inRange(p: Position): boolean {
  return Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && !(p.lat === 0 && p.lng === 0);
}

function parseAppLocation(v: unknown): AppLocation | null {
  if (!isDict(v) || !isFiniteNumber(v.latitude) || !isFiniteNumber(v.longitude)) return null;
  const position = { lat: v.latitude, lng: v.longitude };
  if (!inRange(position)) return null;
  const source = v.source === "udp" || v.source === "device" ? v.source : null;
  return { ...position, source, sampledAt: isFiniteNumber(v.sampledAtEpochMs) ? v.sampledAtEpochMs : null };
}

/**
 * Kiểm tra field bắt buộc và số phần tử mảng (spec §7.1 bước 5).
 * Trả về null khi document không hợp lệ — người gọi giữ dữ liệu hợp lệ trước đó.
 */
export function parseLiveChannel(data: unknown): LiveChannel | null {
  if (!isDict(data) || !isDict(data.meta) || !isDict(data.packet)) return null;
  const { meta, packet } = data;
  const vital = packet.vital;
  if (!isFiniteNumber(meta.sequence) || typeof meta.publisherSessionId !== "string" || !isDict(vital)) return null;
  if (!VITAL_KEYS.every((key) => isFiniteNumber(vital[key]))) return null;
  const dopplerHeart = samples(packet.dopplerHeart);
  const dopplerBreath = samples(packet.dopplerBreath);
  if (!dopplerHeart || !dopplerBreath) return null;

  const vitals = Object.fromEntries(VITAL_KEYS.map((key) => [key, vital[key]])) as unknown as PacketVitals;
  const rawScores = isDict(data.displayScores) ? data.displayScores : {};
  // Bản app cũ không ghi displayScores → toàn bộ null, hiển thị "—" (spec §4.3.1).
  const scores = Object.fromEntries(
    SCORE_KEYS.map((key) => [key, isFiniteNumber(rawScores[key]) ? rawScores[key] : null]),
  ) as unknown as DisplayScores;

  return {
    sessionId: meta.publisherSessionId,
    sequence: meta.sequence,
    publishedAt: timestampMillis(meta.publishedAt),
    vitals,
    udpGps: {
      latitude: isFiniteNumber(vital.latitude) ? vital.latitude : Number.NaN,
      longitude: isFiniteNumber(vital.longitude) ? vital.longitude : Number.NaN,
      latitudeNS: typeof vital.latitudeNS === "string" ? vital.latitudeNS : "",
      longitudeEW: typeof vital.longitudeEW === "string" ? vital.longitudeEW : "",
    },
    appLocation: parseAppLocation(data.location),
    scores,
    dopplerHeart,
    dopplerBreath,
  };
}

/**
 * GPS trong packet chỉ dùng khi đủ: số hữu hạn, hướng N/S và E/W hợp lệ, trong miền độ, khác (0, 0).
 * Giả định độ thập phân (DOCX chưa chốt — spec §8); dấu lấy theo N/S, E/W.
 */
export function udpPosition(gps: UdpGps): Position | null {
  const { latitude, longitude, latitudeNS, longitudeEW } = gps;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if ((latitudeNS !== "N" && latitudeNS !== "S") || (longitudeEW !== "E" && longitudeEW !== "W")) return null;
  const position = {
    lat: latitudeNS === "S" ? -Math.abs(latitude) : Math.abs(latitude),
    lng: longitudeEW === "W" ? -Math.abs(longitude) : Math.abs(longitude),
  };
  return inRange(position) ? position : null;
}

export interface ResolvedLocation extends Position {
  source: LocationSource | null;
  updatedAt: number;
}

/**
 * Ưu tiên GPS trong packet UDP; không đủ thì lấy `location` cùng hàng `meta` (ghi chú mobile dev).
 * `fallbackAt` dùng khi nguồn không có mốc thời gian riêng.
 */
export function resolveLocation(channel: LiveChannel, fallbackAt: number): ResolvedLocation | null {
  const udp = udpPosition(channel.udpGps);
  if (udp) return { ...udp, source: "udp", updatedAt: channel.publishedAt ?? fallbackAt };
  const app = channel.appLocation;
  if (app) return { lat: app.lat, lng: app.lng, source: app.source, updatedAt: app.sampledAt ?? channel.publishedAt ?? fallbackAt };
  return null;
}

export interface Cursor {
  sessionId: string;
  sequence: number;
}

/** Cùng phiên: chỉ nhận sequence lớn hơn. Phiên mới: nhận và reset lịch sử (spec §7.2). */
export function isNewer(cursor: Cursor | null, next: Cursor): boolean {
  if (!cursor || cursor.sessionId !== next.sessionId) return true;
  return next.sequence > cursor.sequence;
}

/** Số packet bị nhảy qua giữa hai lần nhận cùng phiên; 0 khi liên tục hoặc khác phiên. */
export function missedPackets(cursor: Cursor | null, next: Cursor): number {
  if (!cursor || cursor.sessionId !== next.sessionId) return 0;
  return Math.max(0, next.sequence - cursor.sequence - 1);
}

export const EMPTY_WAVES: Waveforms = { heart: [], breath: [] };

/**
 * Nối 1 giây sóng mới vào bộ đệm. Packet bị bỏ qua được chèn null (ngắt nét),
 * không giả tạo mẫu chưa nhận (spec §7.2, §7.4).
 */
export function appendWaves(buffer: Waveforms, channel: LiveChannel, missed: number): Waveforms {
  const gap: null[] = new Array(Math.min(missed, WAVE_BUFFER_SECONDS) * SAMPLES_PER_PACKET).fill(null);
  const keep = (old: Array<number | null>, next: number[]) => [...old, ...gap, ...next].slice(-WAVE_BUFFER_SAMPLES);
  return { heart: keep(buffer.heart, channel.dopplerHeart), breath: keep(buffer.breath, channel.dopplerBreath) };
}

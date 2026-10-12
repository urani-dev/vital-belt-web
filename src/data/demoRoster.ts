import type { DisplayScores, Member, Operation, PacketVitals, Waveforms } from "../domain/types";
import { HEAT_STRESS_MAX, HEAT_STRESS_MIN, STATUS_NO_PERSON, UNKNOWN_SCORE } from "../domain/classify";
import { EMPTY_WAVES, resolveLocation, type LiveChannel, type ResolvedLocation } from "./liveChannel";
import type { ChannelFeed } from "./liveSource";
import { DEMO_MEMBERS, MOCK_SCORES, MOCK_VITALS, OPERATION, type DemoMemberSeed, type ShiftableVital } from "./mockData";

/** こころの余裕度 nằm trong 40–80 (spec §4.3.1). */
const MIND_MARGIN_RANGE: [number, number] = [40, 80];
const SCORE_RANGE: [number, number] = [0, 100];
/** Mỗi người giả lập trễ sóng thêm chừng này mẫu (0,16 giây) để biểu đồ không trùng nhau. */
const WAVE_SHIFT_SAMPLES = 20;

const RATE_KEYS = ["heartBeat", "breath"] as const;
const SCORE_KEYS = ["overall", "fatigue", "concentration", "drowsiness", "stress", "relaxation"] as const;
const LEVEL_KEYS = ["heartRateLevel", "respirationLevel"] as const;
const VALID_POSTURES = [1, 2, 3, 4, 5, 6];
/** Mạch/thở mock dao động nhẹ (± bpm/rpm) để người demo không đứng im khi kênh chưa đo được. */
const MOCK_RATE_WOBBLE = 2;
const MOCK_WOBBLE_PERIOD_MS = 7_000;

/**
 * Người thật dời xa hơn khoảng này (vd đổi từ simulator sang điện thoại thật) thì coi là đổi hiện trường:
 * vị trí đứng yên được đặt lại, bản đồ canh lại (MemberMap).
 */
export const RELOCATE_DISTANCE_M = 2_000;
const EARTH_RADIUS_M = 6_371_000;

/** Khoảng cách đường tròn lớn (haversine), mét. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

const clamp =(value: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, value));
const inRange = (value: number, lo: number, hi: number) => value >= lo && value <= hi;

/**
 * Số liệu người demo: giá trị kênh hợp lệ → cộng độ lệch; "chưa đo được" (0 / 255 / ngoài miền) → số mock của người đó.
 * Môi trường (nhiệt độ, độ ẩm, WBGT…) luôn lấy theo kênh thật vì cùng một hiện trường.
 */
function demoVitals(vitals: PacketVitals, seed: DemoMemberSeed, index: number, now: number): PacketVitals {
  const mock = { ...MOCK_VITALS, ...seed.mock?.vitals };
  const shift = (key: ShiftableVital) => seed.vitals?.[key] ?? 0;
  const wobble = Math.round(MOCK_RATE_WOBBLE * Math.sin(now / MOCK_WOBBLE_PERIOD_MS + index));
  const next: PacketVitals = { ...vitals, status: vitals.status === STATUS_NO_PERSON ? 0 : vitals.status };
  for (const key of RATE_KEYS) {
    next[key] = vitals[key] > 0 ? Math.max(1, vitals[key] + shift(key)) : mock[key] + wobble;
  }
  for (const key of SCORE_KEYS) {
    next[key] = vitals[key] !== UNKNOWN_SCORE ? clamp(vitals[key] + shift(key), SCORE_RANGE) : mock[key];
  }
  for (const key of LEVEL_KEYS) {
    if (!inRange(vitals[key], 1, 5)) next[key] = mock[key];
  }
  if (!VALID_POSTURES.includes(vitals.posture)) next.posture = mock.posture;
  const heat = inRange(vitals.heatStress, HEAT_STRESS_MIN, HEAT_STRESS_MAX) ? vitals.heatStress : mock.heatStress;
  next.heatStress = Math.max(heat, seed.heatStressAtLeast ?? HEAT_STRESS_MIN);
  return next;
}

function demoScores(scores: DisplayScores, seed: DemoMemberSeed): DisplayScores {
  const mock = { ...MOCK_SCORES, ...seed.mock?.scores };
  const next = { ...scores };
  for (const key of Object.keys(MOCK_SCORES) as Array<keyof DisplayScores>) {
    const value = scores[key];
    const range = key === "mindMargin" ? MIND_MARGIN_RANGE : SCORE_RANGE;
    next[key] = value === null ? clamp(mock[key], range) : clamp(value + (seed.scores?.[key] ?? 0), range);
  }
  return next;
}

/** Trễ sóng `shift` mẫu: bỏ phần đuôi, đầu đệm null — vẫn là dữ liệu thật, chỉ lệch thời điểm. */
function delayWaves(waves: Waveforms, shift: number): Waveforms {
  if (shift === 0) return waves;
  const delay = (samples: Array<number | null>) => [...new Array<null>(shift).fill(null), ...samples.slice(0, -shift)];
  return { heart: delay(waves.heart), breath: delay(waves.breath) };
}

export interface DemoView {
  operation: Operation;
  members: Member[];
}

/**
 * Ghép 10 người của mockup với dữ liệu kênh thật (phase 1).
 * Có trạng thái: người đã ngừng gửi dữ liệu (渡辺 直人) giữ nguyên số liệu và vị trí từ lần dựng đầu.
 */
export function createDemoRoster(seeds: DemoMemberSeed[] = DEMO_MEMBERS) {
  const anchor = seeds.find((s) => s.real);
  if (!anchor) throw new Error("DEMO_MEMBERS cần đúng một người real");
  /**
   * Người đã ngừng gửi dữ liệu: chụp một lần ở lần dựng đầu rồi giữ nguyên (không sinh số liệu mới).
   * `realAt` = vị trí thật lúc chụp, để biết người thật đã đổi hiện trường chưa.
   */
  const inactive = new Map<
    string,
    { vitals: PacketVitals; scores: DisplayScores; lastSeenAt: number; still: ResolvedLocation | null; realAt: ResolvedLocation | null }
  >();

  const area = (seed: DemoMemberSeed) => ({ areaId: seed.areaId, lastKnownAreaId: seed.lastKnownAreaId });

  /** Giữ bố cục tương đối của mockup quanh vị trí thật. */
  const placed = (seed: DemoMemberSeed, real: ResolvedLocation): ResolvedLocation => ({
    ...real,
    lat: real.lat + (seed.lat - anchor.lat),
    lng: real.lng + (seed.lng - anchor.lng),
  });

  const activeMember = (seed: DemoMemberSeed, index: number, feed: ChannelFeed, channel: LiveChannel, real: ResolvedLocation | null, now: number): Member => {
    const where = real ? placed(seed, real) : null;
    return {
      id: seed.id,
      no: seed.no,
      name: seed.name,
      isDemo: !seed.real,
      vitals: seed.real ? channel.vitals : demoVitals(channel.vitals, seed, index, now),
      scores: seed.real ? channel.scores : demoScores(channel.scores, seed),
      waves: seed.real ? feed.waves : delayWaves(feed.waves, (index + 1) * WAVE_SHIFT_SAMPLES),
      location: where
        ? { lat: where.lat, lng: where.lng, source: where.source, updatedAt: where.updatedAt, ...area(seed) }
        : { lat: null, lng: null, source: null, updatedAt: now, ...area(seed) },
      vitalsUpdatedAt: feed.receivedAt ?? now,
    };
  };

  const inactiveMember = (seed: DemoMemberSeed, ageMs: number, index: number, channel: LiveChannel, real: ResolvedLocation | null, now: number): Member => {
    let entry = inactive.get(seed.id);
    if (!entry) {
      entry = {
        vitals: demoVitals(channel.vitals, seed, index, now),
        scores: demoScores(channel.scores, seed),
        lastSeenAt: now - ageMs,
        still: real ? placed(seed, real) : null,
        realAt: real,
      };
      inactive.set(seed.id, entry);
    } else if (real && (!entry.realAt || distanceM(entry.realAt, real) >= RELOCATE_DISTANCE_M)) {
      // Người thật đổi hiện trường: chỉ dời vị trí cuối theo bố cục mới, số liệu và mốc nhận cuối giữ nguyên.
      entry.still = placed(seed, real);
      entry.realAt = real;
    }
    const { still } = entry;
    return {
      id: seed.id,
      no: seed.no,
      name: seed.name,
      isDemo: true,
      vitals: entry.vitals,
      scores: entry.scores,
      waves: EMPTY_WAVES,
      location: still
        ? { lat: still.lat, lng: still.lng, source: still.source, updatedAt: entry.lastSeenAt, ...area(seed) }
        : { lat: null, lng: null, source: null, updatedAt: entry.lastSeenAt, ...area(seed) },
      vitalsUpdatedAt: entry.lastSeenAt,
    };
  };

  return function build(feed: ChannelFeed, now: number): DemoView {
    const { channel } = feed;
    if (!channel) return { operation: OPERATION, members: [] };
    const real = resolveLocation(channel, feed.receivedAt ?? now);
    const operation: Operation = {
      ...OPERATION,
      weather: { ...OPERATION.weather, temperature: channel.vitals.temperature, humidity: channel.vitals.humidity },
    };
    const members = seeds.map((seed, index): Member =>
      seed.inactiveAgeMs !== null && !seed.real
        ? inactiveMember(seed, seed.inactiveAgeMs, index, channel, real, now)
        : activeMember(seed, index, feed, channel, real, now),
    );
    return { operation, members };
  };
}

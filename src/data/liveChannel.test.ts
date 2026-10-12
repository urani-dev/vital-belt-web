import { describe, expect, it } from "vitest";
import {
  EMPTY_WAVES,
  SAMPLES_PER_PACKET,
  WAVE_BUFFER_SECONDS,
  appendWaves,
  isNewer,
  missedPackets,
  parseLiveChannel,
  resolveLocation,
  udpPosition,
  type LiveChannel,
} from "./liveChannel";
import { RELOCATE_DISTANCE_M, createDemoRoster, distanceM } from "./demoRoster";
import type { ChannelFeed } from "./liveSource";

const PUBLISHED_AT = 1_791_781_291_752;
const ts = (ms: number) => ({ toMillis: () => ms });
const wave = (base: number) => Array.from({ length: SAMPLES_PER_PACKET }, (_, i) => base + i);

/** Dựng theo snapshot thật của liveChannels/5005 đọc ngày 2026-10-12 (GPS UDP rác, location từ điện thoại). */
function liveDoc(overrides: Record<string, unknown> = {}) {
  return {
    meta: { sequence: 850, publisherSessionId: "s1", publishedAt: ts(PUBLISHED_AT), sourcePort: 5005 },
    packet: {
      packetCounter: 260,
      vital: {
        status: 0, heartBeat: 0, breath: 0, alarm: 0, stepCounter: 0, wbgt: 24.9, temperature: 30.7, humidity: 64.2,
        latitude: 248.0833282470703, longitude: 0, latitudeNS: "V", longitudeEW: "\u0000",
        bodyMoveIndex: 268, heatStress: 1, heartRateLevel: 1, respirationLevel: 1, posture: 1,
        fatigue: 255, concentration: 255, drowsiness: 255, stress: 18, relaxation: 84, overall: 255,
      },
      dopplerHeart: wave(0),
      dopplerBreath: wave(1000),
    },
    location: { source: "device", latitude: 37.785834, longitude: -122.406417, sampledAtEpochMs: 1_791_781_261_588 },
    displayScores: {
      formulaVersion: "client-temporary-20261011-v2",
      activityScore: 100, bodyStatus: null, mindStatus: null, environmentRisk: 7, mindMargin: 73, comfortScore: 84, discomfortScore: 18,
    },
    ...overrides,
  };
}

function parsed(overrides: Record<string, unknown> = {}): LiveChannel {
  const channel = parseLiveChannel(liveDoc(overrides));
  if (!channel) throw new Error("fixture không hợp lệ");
  return channel;
}

describe("parseLiveChannel", () => {
  it("reads meta, vitals, scores and keeps sentinels as-is", () => {
    const c = parsed();
    expect(c.sequence).toBe(850);
    expect(c.publishedAt).toBe(PUBLISHED_AT);
    expect(c.vitals.overall).toBe(255);
    expect(c.vitals.heartBeat).toBe(0);
    expect(c.scores.bodyStatus).toBeNull();
    expect(c.scores.environmentRisk).toBe(7);
  });

  it("missing displayScores (older app) → all scores null", () => {
    const c = parsed({ displayScores: undefined });
    expect(Object.values(c.scores).every((v) => v === null)).toBe(true);
  });

  it("rejects documents with missing fields or wrong sample count", () => {
    expect(parseLiveChannel(null)).toBeNull();
    expect(parseLiveChannel({ ...liveDoc(), meta: { publisherSessionId: "s1" } })).toBeNull();
    const shortWave = liveDoc();
    shortWave.packet.dopplerHeart = wave(0).slice(1);
    expect(parseLiveChannel(shortWave)).toBeNull();
    const badVital = liveDoc();
    (badVital.packet.vital as Record<string, unknown>).heartBeat = "72";
    expect(parseLiveChannel(badVital)).toBeNull();
  });
});

describe("location", () => {
  it("UDP GPS is used only with valid N/S, E/W and range; sign follows direction", () => {
    expect(udpPosition({ latitude: 35.65, longitude: 140.03, latitudeNS: "N", longitudeEW: "E" })).toEqual({ lat: 35.65, lng: 140.03 });
    expect(udpPosition({ latitude: 33.87, longitude: 151.21, latitudeNS: "S", longitudeEW: "E" })).toEqual({ lat: -33.87, lng: 151.21 });
    expect(udpPosition({ latitude: 248.08, longitude: 0, latitudeNS: "V", longitudeEW: "\u0000" })).toBeNull();
    expect(udpPosition({ latitude: 0, longitude: 0, latitudeNS: "N", longitudeEW: "E" })).toBeNull();
    expect(udpPosition({ latitude: 95, longitude: 10, latitudeNS: "N", longitudeEW: "E" })).toBeNull();
  });

  it("falls back to app `location` when UDP GPS is incomplete", () => {
    expect(resolveLocation(parsed(), 0)).toEqual({ lat: 37.785834, lng: -122.406417, source: "device", updatedAt: 1_791_781_261_588 });
  });

  it("prefers valid UDP GPS over app location", () => {
    const c = parsed();
    c.udpGps = { latitude: 35.65, longitude: 140.03, latitudeNS: "N", longitudeEW: "E" };
    expect(resolveLocation(c, 0)).toEqual({ lat: 35.65, lng: 140.03, source: "udp", updatedAt: PUBLISHED_AT });
  });

  it("no usable coordinates anywhere → null", () => {
    expect(resolveLocation(parsed({ location: { source: "device", latitude: 0, longitude: 0 } }), 0)).toBeNull();
  });
});

describe("sequence handling", () => {
  it("same session accepts only higher sequence; new session always accepted", () => {
    const cur = { sessionId: "s1", sequence: 10 };
    expect(isNewer(null, cur)).toBe(true);
    expect(isNewer(cur, { sessionId: "s1", sequence: 10 })).toBe(false);
    expect(isNewer(cur, { sessionId: "s1", sequence: 9 })).toBe(false);
    expect(isNewer(cur, { sessionId: "s1", sequence: 11 })).toBe(true);
    expect(isNewer(cur, { sessionId: "s2", sequence: 0 })).toBe(true);
  });

  it("counts skipped packets only within a session", () => {
    const cur = { sessionId: "s1", sequence: 10 };
    expect(missedPackets(cur, { sessionId: "s1", sequence: 11 })).toBe(0);
    expect(missedPackets(cur, { sessionId: "s1", sequence: 13 })).toBe(2);
    expect(missedPackets(cur, { sessionId: "s2", sequence: 50 })).toBe(0);
  });

  it("waves: gap inserted as null, buffer capped at 18 s", () => {
    const c = parsed();
    const once = appendWaves(EMPTY_WAVES, c, 0);
    const gapped = appendWaves(once, c, 1);
    expect(gapped.heart).toHaveLength(3 * SAMPLES_PER_PACKET);
    expect(gapped.heart[SAMPLES_PER_PACKET]).toBeNull();
    let full = EMPTY_WAVES;
    for (let i = 0; i < WAVE_BUFFER_SECONDS + 5; i++) full = appendWaves(full, c, 0);
    expect(full.breath).toHaveLength(WAVE_BUFFER_SECONDS * SAMPLES_PER_PACKET);
  });
});

describe("demo roster", () => {
  const feed = (channel: LiveChannel): ChannelFeed => ({
    state: "live",
    channel,
    waves: appendWaves(EMPTY_WAVES, channel, 0),
    receivedAt: PUBLISHED_AT,
  });

  it("10 members; 田中 健二 carries the real channel unchanged", () => {
    const c = parsed();
    const { members } = createDemoRoster()(feed(c), PUBLISHED_AT);
    expect(members).toHaveLength(10);
    const real = members.filter((m) => !m.isDemo);
    expect(real.map((m) => m.name)).toEqual(["田中 健二"]);
    expect(real[0]!.vitals).toEqual(c.vitals);
    expect(real[0]!.scores).toEqual(c.scores);
    expect(real[0]!.location).toMatchObject({ lat: 37.785834, lng: -122.406417, source: "device", areaId: "a3" });
  });

  it("demo members: valid channel values get shifted, 'not measured' values fall back to their mock", () => {
    const { members } = createDemoRoster()(feed(parsed()), PUBLISHED_AT);
    const m01 = members.find((m) => m.id === "m01")!;
    expect(Math.abs(m01.vitals.heartBeat - 79)).toBeLessThanOrEqual(2); // kênh = 0 → mock 79 ± 2
    expect(m01.vitals.overall).toBe(45); // kênh = 255 → mock
    expect(m01.vitals.fatigue).toBe(72); // kênh = 255 → mock
    expect(m01.vitals.stress).toBe(53); // kênh 18 hợp lệ → 18 + 35
    expect(m01.vitals.heatStress).toBe(5); // kịch bản 優先確認
    expect(m01.vitals.temperature).toBe(30.7); // môi trường luôn theo kênh thật
    expect(m01.scores.bodyStatus).toBe(51); // kênh null → mock
    expect(m01.scores.environmentRisk).toBe(62); // kênh 7 hợp lệ → 7 + 55
    expect(m01.scores.mindMargin).toBe(53); // 73 − 20, trong 40–80
  });

  it("the real member still shows 'not measured' values as-is", () => {
    const real = createDemoRoster()(feed(parsed()), PUBLISHED_AT).members.find((m) => !m.isDemo)!;
    expect(real.vitals.overall).toBe(255);
    expect(real.vitals.heartBeat).toBe(0);
    expect(real.scores.bodyStatus).toBeNull();
  });

  it("status 'no person' on the channel does not blank the demo members", () => {
    const c = parsed();
    c.vitals.status = 1;
    const m05 = createDemoRoster()(feed(c), PUBLISHED_AT).members.find((m) => m.id === "m05")!;
    expect(m05.vitals.status).toBe(0);
  });

  it("frozen member keeps its first position and age", () => {
    const build = createDemoRoster();
    const first = build(feed(parsed()), PUBLISHED_AT).members.find((m) => m.id === "m08")!;
    const moved = parsed({ location: { source: "device", latitude: 37.79, longitude: -122.41, sampledAtEpochMs: PUBLISHED_AT } });
    const later = build(feed(moved), PUBLISHED_AT + 60_000).members.find((m) => m.id === "m08")!;
    expect(later.location).toEqual(first.location);
    expect(first.location.updatedAt).toBe(PUBLISHED_AT - 5 * 60_000);
  });

  it("frozen member follows when the real member relocates beyond RELOCATE_DISTANCE_M", () => {
    const build = createDemoRoster();
    const at = (latitude: number, longitude: number, now: number) =>
      build(feed(parsed({ location: { source: "device", latitude, longitude, sampledAtEpochMs: now } })), now);
    const tanaka = (v: ReturnType<typeof at>) => v.members.find((m) => !m.isDemo)!.location;
    const watanabe = (v: ReturnType<typeof at>) => v.members.find((m) => m.id === "m08")!.location;

    const sf = at(37.785834, -122.406417, PUBLISHED_AT); // simulator (San Francisco)
    const chiba = at(35.6466, 140.0378, PUBLISHED_AT + 60_000); // điện thoại thật ở 幕張
    const gap = distanceM({ lat: watanabe(chiba).lat!, lng: watanabe(chiba).lng! }, { lat: tanaka(chiba).lat!, lng: tanaka(chiba).lng! });
    expect(watanabe(chiba).lat).not.toBe(watanabe(sf).lat);
    expect(gap).toBeLessThan(1_000); // vẫn giữ bố cục mockup quanh người thật
    expect(watanabe(chiba).updatedAt).toBe(PUBLISHED_AT + 60_000 - 5 * 60_000); // tuổi vị trí tính lại

    // Đi lại trong cùng hiện trường (< 2 km): vẫn đứng yên.
    const nearby = at(35.65, 140.04, PUBLISHED_AT + 120_000);
    expect(watanabe(nearby)).toEqual(watanabe(chiba));
  });

  it("distanceM: 1° latitude ≈ 111 km; RELOCATE_DISTANCE_M is 2 km", () => {
    expect(distanceM({ lat: 35, lng: 140 }, { lat: 36, lng: 140 })).toBeCloseTo(111_195, -2);
    expect(RELOCATE_DISTANCE_M).toBe(2_000);
  });

  it("no channel data → no members", () => {
    expect(createDemoRoster()({ state: "noData", channel: null, waves: EMPTY_WAVES, receivedAt: null }, 0).members).toEqual([]);
  });
});

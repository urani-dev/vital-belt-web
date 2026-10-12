import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLES_PER_PACKET } from "./liveChannel";
import type { ChannelFeed } from "./liveSource";

/** Giả lập onSnapshot: test tự đẩy snapshot / lỗi vào listener. */
const listener = vi.hoisted(() => ({
  next: null as ((snapshot: unknown) => void) | null,
  error: null as ((error: { code: string }) => void) | null,
  unsubscribe: vi.fn(),
}));

vi.mock("../lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  onSnapshot: (_ref: unknown, _options: unknown, next: (s: unknown) => void, error: (e: { code: string }) => void) => {
    listener.next = next;
    listener.error = error;
    return listener.unsubscribe;
  },
}));

const { subscribeLiveChannel } = await import("./liveSource");

const PUBLISHED_AT = 1_791_781_291_752;
const NOW = PUBLISHED_AT + 3_000;
const wave = () => Array.from({ length: SAMPLES_PER_PACKET }, (_, i) => i);
const vital = {
  status: 0, heartBeat: 72, breath: 16, stepCounter: 0, wbgt: 24, temperature: 30, humidity: 60, bodyMoveIndex: 0,
  heatStress: 2, heartRateLevel: 4, respirationLevel: 4, posture: 1, fatigue: 30, concentration: 60, drowsiness: 30,
  stress: 30, relaxation: 60, overall: 80,
};

function snapshot(data: unknown, { fromCache = false, exists = true } = {}) {
  return { exists: () => exists, data: () => data, metadata: { fromCache, hasPendingWrites: false } };
}

function packet(sequence: number, session = "s1") {
  return {
    meta: { sequence, publisherSessionId: session, publishedAt: { toMillis: () => PUBLISHED_AT } },
    packet: { vital, dopplerHeart: wave(), dopplerBreath: wave() },
  };
}

function subscribe() {
  const feeds: ChannelFeed[] = [];
  const unsubscribe = subscribeLiveChannel("5005", (feed) => feeds.push(feed));
  const last = () => feeds[feeds.length - 1]!;
  return { feeds, last, unsubscribe };
}

describe("subscribeLiveChannel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    listener.unsubscribe.mockClear();
  });

  it("emits connecting first, then live with the packet", () => {
    const { feeds, last } = subscribe();
    expect(feeds[0]).toMatchObject({ state: "connecting", channel: null, receivedAt: null });
    listener.next!(snapshot(packet(1)));
    expect(last()).toMatchObject({ state: "live", channel: { sequence: 1 } });
    expect(last().waves.heart).toHaveLength(SAMPLES_PER_PACKET);
  });

  it("first packet uses publishedAt (may already be old); later packets use arrival time", () => {
    const { last } = subscribe();
    listener.next!(snapshot(packet(1)));
    expect(last().receivedAt).toBe(PUBLISHED_AT);
    vi.setSystemTime(NOW + 1_000);
    listener.next!(snapshot(packet(2)));
    expect(last().receivedAt).toBe(NOW + 1_000);
  });

  it("same or older sequence does not append waves again", () => {
    const { feeds, last } = subscribe();
    listener.next!(snapshot(packet(5)));
    const count = feeds.length;
    listener.next!(snapshot(packet(5)));
    listener.next!(snapshot(packet(4)));
    expect(feeds).toHaveLength(count);
    expect(last().waves.heart).toHaveLength(SAMPLES_PER_PACKET);
  });

  it("skipped packets become null gaps; a new session resets the waves", () => {
    const { last } = subscribe();
    listener.next!(snapshot(packet(1)));
    listener.next!(snapshot(packet(3)));
    expect(last().waves.heart).toHaveLength(3 * SAMPLES_PER_PACKET);
    expect(last().waves.heart[SAMPLES_PER_PACKET]).toBeNull();
    listener.next!(snapshot(packet(1, "s2")));
    expect(last().waves.heart).toHaveLength(SAMPLES_PER_PACKET);
  });

  it("an invalid document never replaces the packet being shown", () => {
    const { last } = subscribe();
    listener.next!(snapshot(packet(1)));
    listener.next!(snapshot({ meta: {}, packet: {} }));
    expect(last()).toMatchObject({ state: "live", channel: { sequence: 1 } });
  });

  it("cache only fills an empty screen and never moves the cursor", () => {
    const { last } = subscribe();
    listener.next!(snapshot(packet(9), { fromCache: true }));
    expect(last()).toMatchObject({ state: "cached", channel: { sequence: 9 }, receivedAt: null });
    listener.next!(snapshot(packet(2)));
    expect(last()).toMatchObject({ state: "live", channel: { sequence: 2 } });
  });

  it("missing document → noData; permission error → denied; other errors → error", () => {
    const a = subscribe();
    listener.next!(snapshot(undefined, { exists: false }));
    expect(a.last().state).toBe("noData");
    listener.error!({ code: "permission-denied" });
    expect(a.last().state).toBe("denied");
    const b = subscribe();
    listener.error!({ code: "unavailable" });
    expect(b.last().state).toBe("error");
  });

  it("returns the Firestore unsubscribe", () => {
    subscribe().unsubscribe();
    expect(listener.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

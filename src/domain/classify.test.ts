import { describe, expect, it } from "vitest";
import {
  applySustain,
  classify,
  compareByPriority,
  locationState,
  type Classification,
  type Reason,
  type SustainState,
} from "./classify";
import { DEFAULT_THRESHOLDS, validateThresholds, type ThresholdConfig } from "./thresholds";
import type { Member } from "./types";
import { reasonText, sensorStateLabel } from "./labels";

const NOW = 1_791_514_800_000;

function member(overrides: Partial<Member["vitals"]> = {}, extra: Partial<Member> = {}): Member {
  return {
    id: "m",
    no: "01",
    name: "テスト",
    vitals: {
      status: 0,
      heartBeat: 75,
      breath: 16,
      stepCounter: 0,
      wbgt: 25,
      temperature: 28,
      humidity: 60,
      bodyMoveIndex: 0,
      heatStress: 2,
      heartRateLevel: 4,
      respirationLevel: 4,
      posture: 1,
      fatigue: 30,
      concentration: 60,
      drowsiness: 30,
      stress: 30,
      relaxation: 60,
      overall: 85,
      ...overrides,
    },
    isDemo: false,
    scores: {
      activityScore: 50,
      bodyStatus: 80,
      mindStatus: 80,
      environmentRisk: 20,
      mindMargin: 60,
      comfortScore: 60,
      discomfortScore: 10,
    },
    waves: { heart: [], breath: [] },
    location: { lat: 35.6, lng: 140, source: "device", updatedAt: NOW - 20_000, areaId: "a1", lastKnownAreaId: "a1" },
    vitalsUpdatedAt: NOW - 5_000,
    ...extra,
  };
}

describe("classify", () => {
  it("normal when nothing breaches", () => {
    expect(classify(member(), DEFAULT_THRESHOLDS, NOW)).toEqual({ category: "normal", reasons: [] });
  });

  it("overall ≤ 70 → caution, ≤ 50 → priority (boundary inclusive)", () => {
    expect(classify(member({ overall: 71 }), DEFAULT_THRESHOLDS, NOW).category).toBe("normal");
    expect(classify(member({ overall: 70 }), DEFAULT_THRESHOLDS, NOW).category).toBe("caution");
    expect(classify(member({ overall: 50 }), DEFAULT_THRESHOLDS, NOW).category).toBe("priority");
  });

  it("heart rate uses strict comparison on both sides", () => {
    expect(classify(member({ heartBeat: 100 }), DEFAULT_THRESHOLDS, NOW).category).toBe("normal");
    expect(classify(member({ heartBeat: 101 }), DEFAULT_THRESHOLDS, NOW).reasons[0]).toEqual({
      key: "heartBeat",
      level: "caution",
      side: "high",
    });
    expect(classify(member({ heartBeat: 39 }), DEFAULT_THRESHOLDS, NOW).reasons[0]).toEqual({
      key: "heartBeat",
      level: "priority",
      side: "low",
    });
  });

  it("ignores sentinel values: score 255, rate 0", () => {
    expect(classify(member({ overall: 255, fatigue: 255 }), DEFAULT_THRESHOLDS, NOW).category).toBe("normal");
    expect(classify(member({ heartBeat: 0, breath: 0 }), DEFAULT_THRESHOLDS, NOW).category).toBe("normal");
  });

  it("status=no person → 要確認 with reason notWorn; body metrics are not evaluated", () => {
    const result = classify(member({ status: 1, heartBeat: 0, breath: 0, overall: 10 }), DEFAULT_THRESHOLDS, NOW);
    expect(result).toEqual({ category: "caution", reasons: [{ key: "notWorn", level: "caution", side: "high" }] });
  });

  it("status=no person: a stronger environment reason still wins", () => {
    const result = classify(member({ status: 1, heatStress: 5 }), DEFAULT_THRESHOLDS, NOW);
    expect(result.category).toBe("priority");
    expect(result.reasons.map((r) => `${r.level}:${r.key}`)).toEqual(["priority:heatRisk", "caution:notWorn"]);
  });

  it("status=moving does not change the category", () => {
    expect(classify(member({ status: 2 }), DEFAULT_THRESHOLDS, NOW)).toEqual({ category: "normal", reasons: [] });
  });

  it("priority reasons come first; specific cause beats overall at the same level", () => {
    const m = member({ overall: 45, fatigue: 72, heatStress: 5 });
    const result = classify(m, DEFAULT_THRESHOLDS, NOW);
    expect(result.category).toBe("priority");
    expect(result.reasons.map((r) => `${r.level}:${r.key}`)).toEqual([
      "priority:heatRisk",
      "priority:overall",
      "caution:fatigue",
    ]);
  });

  it("heat risk uses heatStress level 1–5: ≥4 caution, 5 priority; out of range ignored", () => {
    expect(classify(member({ heatStress: 3 }), DEFAULT_THRESHOLDS, NOW).category).toBe("normal");
    expect(classify(member({ heatStress: 4 }), DEFAULT_THRESHOLDS, NOW).category).toBe("caution");
    expect(classify(member({ heatStress: 5 }), DEFAULT_THRESHOLDS, NOW).category).toBe("priority");
    expect(classify(member({ heatStress: 0 }), DEFAULT_THRESHOLDS, NOW).category).toBe("normal");
  });

  it("environment risk comes from displayScores; null is skipped", () => {
    const risky = member();
    risky.scores.environmentRisk = 62;
    expect(classify(risky, DEFAULT_THRESHOLDS, NOW).reasons[0]?.key).toBe("envRisk");
    const unknown = member();
    unknown.scores.environmentRisk = null;
    expect(classify(unknown, DEFAULT_THRESHOLDS, NOW).category).toBe("normal");
  });

  it("flags lost sensor signal", () => {
    expect(classify(member({}, { vitalsUpdatedAt: NOW - 61_000 }), DEFAULT_THRESHOLDS, NOW).reasons[0]?.key).toBe(
      "signalLost",
    );
    expect(classify(member({}, { vitalsUpdatedAt: NOW - 301_000 }), DEFAULT_THRESHOLDS, NOW).category).toBe(
      "priority",
    );
  });
});

describe("applySustain", () => {
  const raw = (category: Classification["category"], ...reasons: Reason[]): Classification => ({ category, reasons });
  const pulseHigh: Reason = { key: "heartBeat", level: "priority", side: "high" };
  const lost = (level: Reason["level"]): Reason => ({ key: "signalLost", level, side: "high" });

  it("accepts the first observation immediately", () => {
    expect(applySustain(undefined, raw("priority", pulseHigh), NOW, 60)).toEqual({
      current: "priority",
      reasons: [pulseHigh],
      pending: null,
    });
  });

  it("switches only after the new category holds for sustainSec", () => {
    let s = applySustain(undefined, raw("normal"), NOW, 60);
    s = applySustain(s, raw("caution"), NOW, 60);
    expect(s.current).toBe("normal");
    s = applySustain(s, raw("caution"), NOW + 59_000, 60);
    expect(s.current).toBe("normal");
    s = applySustain(s, raw("caution"), NOW + 60_000, 60);
    expect(s).toEqual({ current: "caution", reasons: [], pending: null });
  });

  it("resets the timer when the raw category flips back", () => {
    let s = applySustain(undefined, raw("normal"), NOW, 60);
    s = applySustain(s, raw("caution"), NOW, 60);
    s = applySustain(s, raw("normal"), NOW + 30_000, 60);
    expect(s).toEqual({ current: "normal", reasons: [], pending: null });
    s = applySustain(s, raw("caution"), NOW + 40_000, 60);
    s = applySustain(s, raw("caution"), NOW + 90_000, 60);
    expect(s.current).toBe("normal");
  });

  it("reasons always describe the displayed category, not the raw one", () => {
    // Đang chờ lên mức: vẫn 安定 → không có lý do đỏ.
    let s = applySustain(undefined, raw("normal"), NOW, 60);
    s = applySustain(s, raw("priority", pulseHigh), NOW + 1_000, 60);
    expect(s).toMatchObject({ current: "normal", reasons: [] });
    // Đã lên mức: lý do theo mức mới.
    s = applySustain(s, raw("priority", pulseHigh), NOW + 61_000, 60);
    expect(s).toMatchObject({ current: "priority", reasons: [pulseHigh] });
    // Đang chờ xuống mức: vẫn 優先確認 → giữ lý do đã đưa nó lên.
    s = applySustain(s, raw("normal"), NOW + 62_000, 60);
    expect(s).toMatchObject({ current: "priority", reasons: [pulseHigh] });
  });

  it("signal loss changes category without waiting for sustainSec, in both directions", () => {
    let s = applySustain(undefined, raw("normal"), NOW, 60);
    s = applySustain(s, raw("caution", lost("caution")), NOW + 61_000, 60);
    expect(s).toMatchObject({ current: "caution", reasons: [lost("caution")] });
    s = applySustain(s, raw("priority", lost("priority")), NOW + 301_000, 60);
    expect(s).toMatchObject({ current: "priority", reasons: [lost("priority")] });
    // Có packet mới lại → ra khỏi mất tín hiệu ngay.
    s = applySustain(s, raw("normal"), NOW + 302_000, 60);
    expect(s).toEqual({ current: "normal", reasons: [], pending: null });
  });

  it("taking the belt off waits for sustainSec like any metric (no flicker on a 1–2 s slip)", () => {
    const off = { status: 1, heartBeat: 0, breath: 0 };
    // Packet vẫn tới đều mỗi giây (không mất tín hiệu), chỉ có status đổi.
    const at = (sec: number, vitals: Partial<Member["vitals"]>, prev?: SustainState) => {
      const t = NOW + sec * 1000;
      return applySustain(prev, classify(member(vitals, { vitalsUpdatedAt: t }), DEFAULT_THRESHOLDS, t), t, DEFAULT_THRESHOLDS.sustainSec);
    };
    let s = at(0, {});
    s = at(1, off, s);
    expect(s.current).toBe("normal");
    s = at(61, off, s);
    expect(s).toMatchObject({ current: "caution", reasons: [{ key: "notWorn" }] });
  });

  it("end to end: feed stops → 要確認 just after 60 s, 優先確認 just after 300 s (default config)", () => {
    const stopped = member({}, { vitalsUpdatedAt: NOW });
    const at = (sec: number, prev?: SustainState) =>
      applySustain(prev, classify(stopped, DEFAULT_THRESHOLDS, NOW + sec * 1000), NOW + sec * 1000, DEFAULT_THRESHOLDS.sustainSec);
    let s = at(0);
    s = at(60, s);
    expect(s.current).toBe("normal");
    s = at(61, s);
    expect(s.current).toBe("caution");
    s = at(300, s);
    expect(s.current).toBe("caution");
    s = at(301, s);
    expect(s.current).toBe("priority");
  });
});

describe("sensor state labels", () => {
  it("status 1 → 未装着, 2 → 体動中, otherwise none; notWorn reason text", () => {
    expect(sensorStateLabel(0)).toBeNull();
    expect(sensorStateLabel(1)).toBe("未装着");
    expect(sensorStateLabel(2)).toBe("体動中");
    expect(reasonText({ key: "notWorn", level: "caution", side: "high" })).toBe("ベルト未装着");
  });
});

describe("locationState", () => {
  it("fresh / stale / unknown by age, missing area or missing coordinates", () => {
    const at = (ageMs: number, areaId: string | null = "a1", lat: number | null = 35.6) =>
      locationState(
        member({}, { location: { lat, lng: 140, source: "device", updatedAt: NOW - ageMs, areaId, lastKnownAreaId: "a5" } }),
        DEFAULT_THRESHOLDS,
        NOW,
      );
    expect(at(20_000)).toBe("fresh");
    expect(at(5 * 60_000)).toBe("stale");
    expect(at(11 * 60_000)).toBe("unknown");
    expect(at(20_000, null)).toBe("unknown");
    expect(at(20_000, "a1", null)).toBe("unknown");
  });
});

describe("compareByPriority", () => {
  it("sorts by category, then member number (matches mockup order)", () => {
    const rows = [
      { category: "normal" as const, member: member({}, { no: "03" }) },
      { category: "caution" as const, member: member({}, { no: "08" }) },
      { category: "priority" as const, member: member({}, { no: "01" }) },
      { category: "caution" as const, member: member({}, { no: "02" }) },
    ];
    expect(rows.sort(compareByPriority).map((r) => r.member.no)).toEqual(["01", "02", "08", "03"]);
  });
});

describe("validateThresholds", () => {
  it("defaults are valid", () => {
    expect(validateThresholds(DEFAULT_THRESHOLDS)).toEqual({});
  });

  it("rejects priority that is not stricter than caution", () => {
    const cfg: ThresholdConfig = structuredClone(DEFAULT_THRESHOLDS);
    cfg.rules[0]!.priority.low = 75; // overall: priority ≤75 is looser than caution ≤70
    cfg.rules[1]!.priority.high = 90; // heartBeat: priority >90 is looser than caution >100
    const errors = validateThresholds(cfg);
    expect(errors["overall.priority.low"]).toBeDefined();
    expect(errors["heartBeat.priority.high"]).toBeDefined();
  });

  it("rejects out-of-range and non-positive durations", () => {
    const cfg: ThresholdConfig = structuredClone(DEFAULT_THRESHOLDS);
    cfg.rules[3]!.caution.high = 120;
    cfg.sustainSec = 0;
    cfg.locationUnknownMin = 2;
    const errors = validateThresholds(cfg);
    expect(errors["fatigue.caution.high"]).toBeDefined();
    expect(errors.sustainSec).toBeDefined();
    expect(errors.locationUnknownMin).toBeDefined();
  });
});

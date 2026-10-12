import { useMemo, useState } from "react";
import type { MemberRow } from "../hooks/useDashboard";
import type { Area } from "../domain/types";
import { breaches, type MetricKey } from "../domain/thresholds";
import { HEAT_STRESS_MAX, HEAT_STRESS_MIN, UNKNOWN_SCORE } from "../domain/classify";
import {
  EMPTY_VALUE,
  breathComment,
  postureLabel,
  pulseComment,
  rateText,
  reasonText,
  relativeTime,
  scoreText,
} from "../domain/labels";
import { useThresholds } from "../store/thresholds";
import { DemoTag, MeterBar, Panel, PriorityTag, SensorTag, StatusBadge } from "./ui";
import { CHART_COLOR, DailyChart, Overall24hChart, WaveChart, WeeklyChart } from "./charts";
import { dailySeries, overall24h, weeklyRanges, type WavePoint } from "../data/mockSeries";
import { SAMPLES_PER_PACKET } from "../data/liveChannel";
import { isFeedStale } from "../hooks/useDashboard";

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ScoreRing({ value, color }: { value: number; color: string }) {
  const known = value !== UNKNOWN_SCORE;
  const offset = RING_CIRCUMFERENCE * (1 - (known ? value : 0) / 100);
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="var(--color-line)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <b className="text-lg tabular-nums">{known ? value : EMPTY_VALUE}</b>
        <span className="text-[9px] text-muted">/ 100</span>
      </div>
    </div>
  );
}

interface MetricLine {
  label: string;
  note: string;
  /** null hoặc 255 = không xác định. */
  value: number | null;
  /** Thang tối đa của thanh (mặc định 100). */
  max?: number;
  unit?: string;
  /** Ngưỡng dùng để tô đỏ (ngưỡng 要確認 của F13). */
  ruleKey?: MetricKey;
}

/** Giá trị cho thanh đo: không xác định → thanh rỗng. */
function meterValue(value: number | null): number {
  return value === null || value === UNKNOWN_SCORE ? 0 : value;
}

function heatStressValue(value: number): number | null {
  return value >= HEAT_STRESS_MIN && value <= HEAT_STRESS_MAX ? value : null;
}

/** Sóng Doppler → điểm biểu đồ của `seconds` giây gần nhất (125 mẫu/giây); null giữ nguyên để ngắt nét. */
function waveWindow(samples: Array<number | null>, seconds: number): WavePoint[] {
  const recent = samples.slice(-seconds * SAMPLES_PER_PACKET);
  return recent.map((v, i) => [i / SAMPLES_PER_PACKET, v]);
}

/** F9 — からだ・こころ・環境. */
function BodyMindEnvironment({ row }: { row: MemberRow }) {
  const config = useThresholds((s) => s.config);
  const { vitals, scores } = row.member;
  const groups: Array<{ title: string; items: MetricLine[] }> = [
    {
      title: "からだの状態",
      items: [
        { label: "活動量", note: "動き・体動の量", value: scores.activityScore },
        { label: "疲労度", note: "活動・からだの変化から評価", value: vitals.fatigue, ruleKey: "fatigue" },
      ],
    },
    {
      title: "こころの状態",
      items: [
        { label: "集中度", note: "注意・集中のようす", value: vitals.concentration },
        { label: "眠気度", note: "眠気・ぼんやりする傾向", value: vitals.drowsiness, ruleKey: "drowsiness" },
        { label: "こころの余裕度", note: "落ち着き・いらだちの傾向", value: scores.mindMargin },
        { label: "快適度", note: "気持ちと環境を合わせた指標", value: scores.comfortScore },
        { label: "リラックス度", note: "落ち着き・休まりの傾向", value: vitals.relaxation },
        { label: "ストレス度", note: "緊張・負荷の傾向", value: vitals.stress, ruleKey: "stress" },
      ],
    },
    {
      title: "環境リスク",
      items: [
        // packet.vital.heatStress — thang 1–5 (spec §8), không đổi sang 0–100.
        { label: "熱中危険度", note: "WBGT 等からみる暑さへの注意", value: heatStressValue(vitals.heatStress), max: HEAT_STRESS_MAX, unit: "/5", ruleKey: "heatRisk" },
        { label: "不快度", note: "温湿度などと状態を合わせて表示", value: scores.discomfortScore },
      ],
    },
  ];
  const isAlert = (item: MetricLine) => {
    if (!item.ruleKey || item.value === null || item.value === UNKNOWN_SCORE) return false;
    const rule = config.rules.find((r) => r.key === item.ruleKey);
    return rule ? breaches(rule, rule.caution, item.value) : false;
  };
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-xs font-bold">■{group.title}</p>
          <ul className="mt-1.5 divide-y divide-line">
            {group.items.map((item) => {
              const alert = isAlert(item);
              const color = alert ? "var(--color-alert)" : "var(--color-metric)";
              return (
                <li key={item.label} className="py-2">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-[10px] text-muted">{item.note}</p>
                    </div>
                    <p className="text-base tabular-nums" style={{ color }}>
                      <b>{scoreText(item.value)}</b>
                      {item.unit && <span className="text-[10px] text-muted"> {item.unit}</span>}
                    </p>
                  </div>
                  <div className="mt-1 ml-auto w-16">
                    <MeterBar value={meterValue(item.value)} max={item.max} color={color} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

const PULSE_RANGE: [number, number] = [50, 110];
const BREATH_RANGE: [number, number] = [0, 60];
/** Mức nền của dữ liệu giả 日次/週次, lấy theo design (mạch ~75 bpm, thở ~21 rpm). Chưa có dữ liệu lịch sử thật. */
const PULSE_BASE = 75;
const BREATH_BASE = 21;
const PULSE_SECONDS = 6;
const BREATH_SECONDS = 18;

/** F10 — 脈拍・呼吸. Sóng là Doppler thật của kênh; 日次/週次 vẫn là dữ liệu giả (chưa có lịch sử). */
function PulseBreath({ row, now }: { row: MemberRow; now: number }) {
  const { vitals, waves, id } = row.member;
  const history = useMemo(
    () => ({
      pulseDaily: dailySeries(`pulse-${id}`, { base: PULSE_BASE, swing: 12, noise: 6, range: PULSE_RANGE }, now),
      pulseWeekly: weeklyRanges(`pulse-w-${id}`, PULSE_BASE, 35, PULSE_RANGE),
      breathDaily: dailySeries(`breath-${id}`, { base: BREATH_BASE, swing: 2, noise: 3, range: BREATH_RANGE }, now),
      breathWeekly: weeklyRanges(`breath-w-${id}`, BREATH_BASE + 6, 20, BREATH_RANGE),
    }),
    // Lịch sử chỉ sinh lại khi đổi người, không theo từng giây.
    [id],
  );
  const blocks = [
    {
      icon: "❤", title: "脈拍", value: rateText(vitals.heartBeat), unit: "bpm", comment: pulseComment(vitals.heartRateLevel), ok: vitals.heartRateLevel >= 3,
      color: CHART_COLOR.pulse, seconds: PULSE_SECONDS, wave: waveWindow(waves.heart, PULSE_SECONDS),
      daily: history.pulseDaily, weekly: history.pulseWeekly, range: PULSE_RANGE,
    },
    {
      icon: "🫁", title: "呼吸", value: rateText(vitals.breath), unit: "rpm", comment: breathComment(vitals.respirationLevel), ok: vitals.respirationLevel >= 3,
      color: CHART_COLOR.breath, seconds: BREATH_SECONDS, wave: waveWindow(waves.breath, BREATH_SECONDS),
      daily: history.breathDaily, weekly: history.breathWeekly, range: BREATH_RANGE,
    },
  ];
  return (
    <div className="space-y-5">
      {blocks.map((b) => (
        <div key={b.title}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs">
              <span className="mr-1">{b.icon}</span>
              {b.title} <b className="ml-1 text-xl tabular-nums">{b.value}</b> <span className="text-[11px] text-muted">{b.unit}</span>
            </p>
            <p className={`text-[11px] font-bold ${b.ok ? "text-ink" : "text-priority"}`}>{b.comment}</p>
          </div>
          <WaveChart data={b.wave} color={b.color} seconds={b.seconds} label={`${b.title}の波形`} />
          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <p className="flex justify-between text-[10px] text-muted"><span>日次</span><span>{b.unit}</span></p>
              <DailyChart data={b.daily} color={b.color} unit={b.unit} yRange={b.range} />
            </div>
            <div>
              <p className="flex justify-between text-[10px] text-muted"><span>週次</span><span>{b.unit}</span></p>
              <WeeklyChart data={b.weekly} color={b.color} unit={b.unit} yRange={b.range} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hai khối drill-down mở/đóng độc lập — mở được cả hai cùng lúc. */
type Drill = "bme" | "pulse";

/** F8 — (C) Chi tiết thành viên + drill-down F9, F10. */
export function MemberDetail({ row, areas, now }: { row: MemberRow; areas: Area[]; now: number }) {
  const [open, setOpen] = useState<Record<Drill, boolean>>({ bme: false, pulse: false });
  const { member } = row;
  const area = areas.find((a) => a.id === (member.location.areaId ?? member.location.lastKnownAreaId));
  const reason = row.reasons[0];
  const ringColor = row.category === "priority" ? "var(--color-priority)" : row.category === "caution" ? "var(--color-caution)" : "var(--color-normal)";
  const groups = [
    { label: "からだの状態", value: member.scores.bodyStatus, color: "var(--color-body)" },
    { label: "こころの状態", value: member.scores.mindStatus, color: "var(--color-mind)" },
    { label: "環境リスク", value: member.scores.environmentRisk, color: "var(--color-env)" },
  ];
  const connected = !isFeedStale(member.vitalsUpdatedAt, now);
  const trend = useMemo(
    () => overall24h(member.id, member.vitals.overall === UNKNOWN_SCORE ? 70 : member.vitals.overall, now),
    // 24 giờ sinh lại theo phút là đủ, không cần mỗi giây.
    [member.id, member.vitals.overall, Math.floor(now / 60_000)],
  );
  const toggle = (d: Drill) => setOpen((cur) => ({ ...cur, [d]: !cur[d] }));
  const drillButton = (d: Drill, openLabel: string, closeLabel: string) => (
    <button
      type="button"
      onClick={() => toggle(d)}
      aria-expanded={open[d]}
      className="mt-3 flex items-center gap-1 text-xs font-bold hover:underline"
    >
      <span className="text-muted">{open[d] ? "▾" : "▸"}</span>
      {open[d] ? closeLabel : openLabel}
    </button>
  );

  return (
    <section className="rounded-xl bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          {row.category === "priority" ? <PriorityTag /> : <StatusBadge category={row.category} />}
          <SensorTag status={member.vitals.status} />
          <p className="mt-1.5 text-sm">
            <b className="text-base">{member.name}</b>
            {member.isDemo && <DemoTag />}
            <span className="ml-2 text-[11px] text-muted">{area?.code}</span>
          </p>
        </div>
        {/* 接続中 = đang nhận dữ liệu; 更新停止 = ngừng cập nhật. Pin chưa có trong dữ liệu nên không hiển thị. */}
        <span className={`text-[10px] whitespace-nowrap ${connected ? "text-muted" : "text-caution"}`}>
          {connected ? "接続中" : `更新停止・${relativeTime(member.vitalsUpdatedAt, now)}`}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ScoreRing value={member.vitals.overall} color={ringColor} />
        <div>
          <p className="text-sm font-bold">総合コンディション</p>
          {reason && <p className="text-[11px] font-bold text-priority">{reasonText(reason)}</p>}
        </div>
      </div>

      <div className="mt-4">
        <Panel id="breakdown" title="コンディション内訳" className="!p-0 !shadow-none">
          <p className="flex justify-between text-[11px]"><b>24 時間の変化</b><span className="text-muted">現在</span></p>
          <Overall24hChart data={trend} />
          <div className="mt-3 grid grid-cols-3 gap-3">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="text-[10px] text-muted">{g.label}</p>
                <p className="text-sm">
                  <b className="text-lg tabular-nums">{scoreText(g.value)}</b>
                  <span className="text-[10px] text-muted"> / 100</span>
                </p>
                <MeterBar value={meterValue(g.value)} color={g.color} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {drillButton("bme", "からだ・こころ・環境を見る", "からだ・こころ・環境を閉じる")}
      {open.bme && (
        <div className="mt-2 rounded-lg border border-line p-3">
          <BodyMindEnvironment row={row} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
        <div>
          <p className="text-[10px] text-muted">❤ 脈拍</p>
          <p><b className="text-lg tabular-nums">{rateText(member.vitals.heartBeat)}</b> <span className="text-[10px] text-muted">bpm</span></p>
        </div>
        <div className="border-l border-line pl-2">
          <p className="text-[10px] text-muted">呼吸</p>
          <p><b className="text-lg tabular-nums">{rateText(member.vitals.breath)}</b> <span className="text-[10px] text-muted">rpm</span></p>
        </div>
        <div className="border-l border-line pl-2">
          <p className="text-[10px] text-muted">姿勢</p>
          <p className="mt-1 font-bold">{postureLabel(member.vitals.posture)}</p>
        </div>
      </div>

      {drillButton("pulse", "脈拍・呼吸を見る", "脈拍・呼吸を閉じる")}
      {open.pulse && (
        <div className="mt-2 rounded-lg border border-line p-3">
          <PulseBreath row={row} now={now} />
        </div>
      )}
    </section>
  );
}

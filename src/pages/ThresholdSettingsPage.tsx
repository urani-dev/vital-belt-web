import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DEFAULT_THRESHOLDS,
  METRIC_META,
  validateThresholds,
  type Bound,
  type MetricRule,
  type ThresholdConfig,
} from "../domain/thresholds";
import { formatDateTime } from "../domain/labels";
import { useAuth } from "../store/auth";
import { useThresholds } from "../store/thresholds";

const TOAST_MS = 3_000;

const DIRECTION_LABEL: Record<MetricRule["direction"], string> = {
  high: "高いほど注意",
  low: "低いほど注意",
  both: "上下とも注意",
};

type Level = "caution" | "priority";
type Side = keyof Bound;

function NumberField({
  value,
  onChange,
  error,
  prefix,
  unit,
  label,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  error?: string;
  prefix: string;
  unit: string;
  label: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs">
        <span className="w-8 shrink-0 text-right text-muted">{prefix}</span>
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          aria-invalid={Boolean(error)}
          value={value === undefined || Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
          className={`w-20 rounded-md border px-2 py-1 text-right tabular-nums outline-none focus:border-ink ${
            error ? "border-priority" : "border-line"
          }`}
        />
        <span className="text-[10px] text-muted">{unit}</span>
      </label>
      {error && <p className="mt-0.5 text-[10px] text-priority">{error}</p>}
    </div>
  );
}

/** Ngưỡng hai chiều dùng so sánh chặt (>, <); một chiều dùng (≥, ≤) — khớp domain/thresholds.ts. */
function prefixFor(rule: MetricRule, side: Side): string {
  const strict = rule.direction === "both";
  if (side === "high") return strict ? ">" : "≥";
  return strict ? "<" : "≤";
}

/** F13 — アラート閾値設定. */
export function ThresholdSettingsPage() {
  const saved = useThresholds();
  const user = useAuth((s) => s.user);
  const [draft, setDraft] = useState<ThresholdConfig>(() => structuredClone(saved.config));
  const [toast, setToast] = useState(false);
  const errors = validateThresholds(draft);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.config);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setBound = (index: number, level: Level, side: Side, value: number) =>
    setDraft((d) => {
      const next = structuredClone(d);
      const rule = next.rules[index];
      if (rule) rule[level][side] = value;
      return next;
    });

  const setDuration = (key: Exclude<keyof ThresholdConfig, "rules">, value: number) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    if (hasErrors) return;
    saved.save(draft, user?.email ?? "管理者");
    setToast(true);
  };

  const sides = (rule: MetricRule): Side[] =>
    rule.direction === "both" ? ["low", "high"] : rule.direction === "low" ? ["low"] : ["high"];

  const durations: Array<{ key: Exclude<keyof ThresholdConfig, "rules">; label: string; note: string; unit: string; prefix: string }> = [
    { key: "sustainSec", label: "継続時間", note: "この時間以上続いた場合に区分を変更", unit: "秒", prefix: "≥" },
    { key: "locationStaleMin", label: "位置が古い", note: "更新時刻を表示", unit: "分", prefix: ">" },
    { key: "locationUnknownMin", label: "現在地不明", note: "位置の確認待ちに移動", unit: "分", prefix: ">" },
    { key: "signalLostCautionSec", label: "データ途絶（要確認）", note: "センサーデータが届かない時間", unit: "秒", prefix: ">" },
    { key: "signalLostPrioritySec", label: "データ途絶（優先確認）", note: "センサーデータが届かない時間", unit: "秒", prefix: ">" },
  ];

  return (
    <div className="mx-auto max-w-[960px] px-4 py-5 sm:px-6">
      <nav className="text-xs">
        <Link to="/" className="text-muted hover:underline">← ダッシュボードへ戻る</Link>
      </nav>
      <h1 className="mt-2 text-xl font-bold">アラート閾値設定</h1>
      <p className="mt-1 text-xs text-muted">
        いずれかの指標が「優先確認」の値を超えると優先確認、「要確認」の値を超えると要確認に分類されます。
      </p>
      <p className="mt-1 text-[11px] text-muted">
        最終更新：{saved.updatedAt ? `${formatDateTime(saved.updatedAt)}・${saved.updatedBy}` : "初期値"}
      </p>

      <section className="mt-5 overflow-x-auto rounded-xl bg-panel p-4">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="text-[11px] text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-normal">指標</th>
              <th className="py-2 pr-3 font-normal">方向</th>
              <th className="py-2 pr-3 font-normal"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-caution" />要確認</th>
              <th className="py-2 font-normal"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-priority" />優先確認</th>
            </tr>
          </thead>
          <tbody>
            {draft.rules.map((rule, index) => {
              const meta = METRIC_META[rule.key];
              return (
                <tr key={rule.key} className="border-b border-line/70 last:border-0 align-top">
                  <td className="py-3 pr-3 font-bold">{meta.label}</td>
                  <td className="py-3 pr-3 text-[11px] text-muted">{DIRECTION_LABEL[rule.direction]}</td>
                  {(["caution", "priority"] as const).map((level) => (
                    <td key={level} className="space-y-1.5 py-3 pr-3">
                      {sides(rule).map((side) => (
                        <NumberField
                          key={side}
                          label={`${meta.label} ${level === "caution" ? "要確認" : "優先確認"} ${side === "high" ? "上限" : "下限"}`}
                          prefix={prefixFor(rule, side)}
                          unit={meta.unit}
                          value={rule[level][side]}
                          error={errors[`${rule.key}.${level}.${side}`]}
                          onChange={(v) => setBound(index, level, side, v)}
                        />
                      ))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-4 rounded-xl bg-panel p-4">
        <h2 className="text-sm font-bold">時間の設定</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {durations.map((d) => (
            <div key={d.key}>
              <p className="text-xs font-medium">{d.label}</p>
              <p className="mb-1 text-[10px] text-muted">{d.note}</p>
              <NumberField
                label={d.label}
                prefix={d.prefix}
                unit={d.unit}
                value={draft[d.key]}
                error={errors[d.key]}
                onChange={(v) => setDuration(d.key, v)}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={hasErrors || !dirty}
          className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          保存
        </button>
        <button
          type="button"
          onClick={() => setDraft(structuredClone(saved.config))}
          disabled={!dirty}
          className="rounded-md border border-line bg-panel px-4 py-2 text-sm disabled:opacity-40"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => setDraft(structuredClone(DEFAULT_THRESHOLDS))}
          className="rounded-md border border-line bg-panel px-4 py-2 text-sm"
        >
          初期値に戻す
        </button>
        {hasErrors && <span className="text-xs text-priority">入力内容を確認してください</span>}
      </div>

      {saved.audit.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold">変更履歴</h2>
          <ul className="mt-2 space-y-1 text-[11px] text-muted">
            {saved.audit.slice(0, 10).map((entry) => (
              <li key={entry.changedAt}>
                {formatDateTime(entry.changedAt)}・{entry.changedBy}
              </li>
            ))}
          </ul>
        </section>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          閾値を保存しました
        </div>
      )}
    </div>
  );
}

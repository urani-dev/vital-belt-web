import { useState } from "react";
import type { MemberRow } from "../hooks/useDashboard";
import type { Area, ResponseStatus } from "../domain/types";
import { CATEGORY_LABEL, RESPONSE_LABEL, gpsText, relativeTime } from "../domain/labels";
import { recommendationFor } from "../data/recommendations";
import { useResponses } from "../store/responses";
import { DemoTag, Panel, PriorityTag, SensorTag, StatusBadge } from "./ui";
import { SUPPORT_ANCHOR_ID } from "./PriorityBanner";

const STATUSES: ResponseStatus[] = ["unhandled", "inProgress", "confirmed"];

interface Props {
  row: MemberRow;
  rows: MemberRow[];
  areas: Area[];
  now: number;
}

/** F7 — 対応サポート. */
export function ResponseSupport({ row, rows, areas, now }: Props) {
  const record = useResponses((s) => s.records[row.member.id]);
  const setStatus = useResponses((s) => s.setStatus);
  const reset = useResponses((s) => s.reset);
  const [showContact, setShowContact] = useState(false);

  const { member } = row;
  const areaId = member.location.areaId ?? member.location.lastKnownAreaId;
  const area = areas.find((a) => a.id === areaId);
  const recommendation = recommendationFor(row.reasons[0]?.key);
  // 確認を依頼する候補: cùng khu vực, đang ổn định, không phải người đang chọn.
  const helpers = rows.filter(
    (r) => r.member.id !== member.id && r.category === "normal" && r.member.location.areaId === areaId && r.locationState !== "unknown",
  );
  const current = record?.status ?? "unhandled";

  return (
    <div id={SUPPORT_ANCHOR_ID} className="scroll-mt-4">
      <Panel id="support" title="対応サポート" action={<span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] text-muted">推奨対応</span>}>
        {row.category === "priority" ? <PriorityTag /> : <StatusBadge category={row.category} />}
        <SensorTag status={member.vitals.status} />
        <p className="mt-1.5 text-base font-bold">
          {member.name}
          {member.isDemo && <DemoTag />}
        </p>
        <div className="mt-2 rounded-lg bg-subtle px-3 py-2 text-[11px]">
          <p className="font-medium">
            {row.locationState === "unknown" ? `現在地不明・最終確認 ${area?.code ?? ""}` : `${area?.code ?? ""}・${area?.name ?? ""}`}
          </p>
          <p className="text-muted">
            {gpsText(member.location, now)}
          </p>
        </div>

        {row.category === "normal" ? (
          <p className="mt-3 text-xs text-muted">現在、{CATEGORY_LABEL.normal}表示です。推奨対応はありません。</p>
        ) : (
          <>
            <h3 className="mt-4 text-sm font-bold">{recommendation.title}</h3>
            <p className="mt-1 text-[11px] text-ink/80">{recommendation.summary.replace("{area}", area?.name ?? "不明な場所")}</p>
            <ol className="mt-3 space-y-2.5">
              {recommendation.steps.map((step, i) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[10px]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold">{step.title}</p>
                    <p className="text-[11px] text-ink/70">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-lg bg-priority-soft px-3 py-2 text-[11px] font-medium text-priority">{recommendation.warning}</p>
          </>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-bold">確認を依頼する候補</p>
          {helpers.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted">同じエリアに対応できる候補はいません。</p>
          ) : (
            helpers.map((h) => (
              <p key={h.member.id} className="mt-1 text-[11px]">
                {h.member.name}・同じ{area?.code}
                <span className="block text-muted">状態は安定表示。対応できるかを管理者が確認。</span>
              </p>
            ))
          )}

          <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="対応ステータス">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={current === s}
                onClick={() => setStatus(member.id, s)}
                className={`rounded-md px-3 py-1.5 text-[11px] ${
                  current === s ? "bg-[#cfe0f5] font-medium text-[#1f4f8a]" : "bg-subtle text-muted hover:bg-line"
                }`}
              >
                {RESPONSE_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset(member.id)}
              disabled={!record}
              className="rounded-md bg-ink px-3 py-2 text-[11px] font-medium text-white disabled:opacity-40"
            >
              対応記録をリセット
            </button>
            <button
              type="button"
              onClick={() => setShowContact((v) => !v)}
              aria-expanded={showContact}
              className="rounded-md bg-[#e3ecf8] px-3 py-2 text-[11px] text-[#1f4f8a]"
            >
              連絡内容を確認
            </button>
          </div>

          {showContact && (
            <div className="mt-2 rounded-lg bg-subtle px-3 py-2 text-[11px]">
              <p>
                対象：{member.name}（{area?.code}）
              </p>
              <p>確認事項：{recommendation.steps[0]?.detail}</p>
              <p>ステータス：{RESPONSE_LABEL[current]}</p>
            </div>
          )}

          {record && (
            <p className="mt-3 text-[11px] font-bold text-priority">
              確認を記録しました。リスクの再評価は継続します。
              <span className="ml-1 font-normal text-muted">（{relativeTime(record.updatedAt, now)}）</span>
            </p>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            対応例は推定指標とエリア情報に基づく提案です。現場の手順・本人の状態を優先。
            {recommendation.source && <span className="block">{recommendation.source}</span>}
          </p>
        </div>
      </Panel>
    </div>
  );
}

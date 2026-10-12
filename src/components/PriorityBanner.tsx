import type { MemberRow } from "../hooks/useDashboard";
import type { Area } from "../domain/types";
import { reasonText, relativeTime, scoreText } from "../domain/labels";
import { useUi } from "../store/ui";
import { PriorityTag } from "./ui";

export const SUPPORT_ANCHOR_ID = "response-support";

interface Props {
  rows: MemberRow[];
  areas: Area[];
  now: number;
  /** Thời điểm mỗi người bắt đầu ở mức 優先確認 (để hiện "15 分前 検知"). */
  detectedAt: Record<string, number>;
}

/** F5 — 優先して確認. Mỗi người ở mức ưu tiên một banner. */
export function PriorityBanner({ rows, areas, now, detectedAt }: Props) {
  const select = useUi((s) => s.selectMember);
  const priority = rows.filter((r) => r.category === "priority");
  if (priority.length === 0) return null;

  const openSupport = (id: string) => {
    select(id);
    document.getElementById(SUPPORT_ANCHOR_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-2">
      {priority.map((row) => {
        const area = areas.find((a) => a.id === (row.member.location.areaId ?? row.member.location.lastKnownAreaId));
        const reason = row.reasons[0];
        const since = detectedAt[row.member.id];
        return (
          <article key={row.member.id} className="rounded-xl border-2 border-priority/70 bg-panel p-3.5">
            <div className="flex items-center justify-between gap-2">
              <PriorityTag />
              {since !== undefined && <span className="text-[11px] text-muted">{relativeTime(since, now)} 検知</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <b className="text-base">{row.member.name}</b>
                <span className="text-xs text-muted">{area?.code}</span>
                <span className="text-xs">総合コンディション {scoreText(row.member.vitals.overall)} / 100</span>
              </p>
              <button
                type="button"
                onClick={() => openSupport(row.member.id)}
                className="rounded-md bg-priority px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
              >
                位置確認・対応サポート →
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink/80">
              {reason && `${area ? `${area.name}で` : ""}${reasonText(reason)}。`}
              本人の体調確認と、現地確認を手配してください。
            </p>
          </article>
        );
      })}
    </div>
  );
}

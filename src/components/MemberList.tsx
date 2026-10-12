import type { MemberRow } from "../hooks/useDashboard";
import type { Area, Category } from "../domain/types";
import { CATEGORY_LABEL, postureLabel, relativeTime, scoreText } from "../domain/labels";
import { useUi, type MemberFilter } from "../store/ui";
import { DemoTag, Panel, SensorTag, StatusBadge } from "./ui";

const FILTERS: Array<{ key: MemberFilter; label: string }> = [
  { key: "all", label: "すべて" },
  { key: "priority", label: CATEGORY_LABEL.priority },
  { key: "caution", label: CATEGORY_LABEL.caution },
  { key: "normal", label: CATEGORY_LABEL.normal },
];

function locationText(row: MemberRow, areas: Area[]): string {
  const { areaId, lastKnownAreaId } = row.member.location;
  if (row.locationState === "unknown") {
    return `現在地不明・最終確認 ${areas.find((a) => a.id === lastKnownAreaId)?.code ?? ""}`;
  }
  const area = areas.find((a) => a.id === areaId);
  return area ? `${area.name}・${area.code}` : "";
}

interface Props {
  rows: MemberRow[];
  areas: Area[];
  updatedAt: number;
  now: number;
}

/** F6 — メンバー (確認優先順). */
export function MemberList({ rows, areas, updatedAt, now }: Props) {
  const filter = useUi((s) => s.memberFilter);
  const setFilter = useUi((s) => s.setMemberFilter);
  const selectedId = useUi((s) => s.selectedMemberId);
  const select = useUi((s) => s.selectMember);

  const count = (key: MemberFilter) => (key === "all" ? rows.length : rows.filter((r) => r.category === key).length);
  const visible = filter === "all" ? rows : rows.filter((r) => r.category === (filter as Category));

  return (
    <Panel id="members" title="メンバー" action={<span className="text-[11px] text-muted">確認優先順</span>}>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-2.5 py-1 text-[11px] ${
              filter === f.key ? "bg-ink text-white" : "bg-subtle text-ink hover:bg-line"
            }`}
          >
            {f.label} {count(f.key)}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] text-muted">
            <tr className="border-b border-line">
              <th className="py-1.5 pr-2 font-normal" colSpan={2}>メンバー / 所在地</th>
              <th className="py-1.5 pr-2 font-normal">状態</th>
              <th className="py-1.5 pr-2 font-normal">総合</th>
              <th className="py-1.5 font-normal">姿勢</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const active = row.member.id === selectedId;
              return (
                <tr
                  key={row.member.id}
                  onClick={() => select(row.member.id)}
                  className={`cursor-pointer border-b border-line/70 last:border-0 ${active ? "bg-subtle" : "hover:bg-subtle/60"}`}
                >
                  <td className="w-8 py-2.5 pl-1 text-[10px] text-muted">{row.member.no}</td>
                  <td className="py-2.5 pr-2">
                    <p className="font-bold">
                      {row.member.name}
                      {row.member.isDemo && <DemoTag />}
                    </p>
                    <p className={`text-[10px] ${row.locationState === "unknown" ? "text-caution" : "text-muted"}`}>
                      {locationText(row, areas)}
                    </p>
                  </td>
                  <td className="py-2.5 pr-2">
                    <StatusBadge category={row.category} />
                    <SensorTag status={row.member.vitals.status} />
                  </td>
                  <td className="py-2.5 pr-2 whitespace-nowrap">
                    <b className="text-sm tabular-nums">{scoreText(row.member.vitals.overall)}</b>
                    <span className="text-[10px] text-muted"> /100</span>
                  </td>
                  {/* Không tô màu cảnh báo: tư thế nằm chưa có quy tắc ngã được xác nhận (firestore-web-spec §8). */}
                  <td className="py-2.5 text-[11px]">
                    {postureLabel(row.member.vitals.posture)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-muted">最終更新 {relativeTime(updatedAt, now)}</p>
    </Panel>
  );
}

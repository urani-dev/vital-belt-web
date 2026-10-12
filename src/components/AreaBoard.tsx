import type { MemberRow } from "../hooks/useDashboard";
import type { Area, Category } from "../domain/types";
import { CATEGORY_LABEL } from "../domain/labels";
import { useUi } from "../store/ui";
import { Dot, Panel } from "./ui";

function MemberChip({ row }: { row: MemberRow }) {
  const selectedId = useUi((s) => s.selectedMemberId);
  const select = useUi((s) => s.selectMember);
  const active = row.member.id === selectedId;
  return (
    <button
      type="button"
      onClick={() => select(row.member.id)}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap ${
        active ? "bg-priority-soft ring-1 ring-priority/40" : "hover:bg-white"
      }`}
    >
      <Dot category={row.category} />
      {row.member.name}
    </button>
  );
}

interface CellProps {
  title: string;
  code?: string;
  rows: MemberRow[];
  highlight?: boolean;
}

function AreaCell({ title, code, rows, highlight }: CellProps) {
  return (
    <div className={`rounded-lg p-2.5 ${highlight ? "bg-caution-soft" : "bg-subtle"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold">{title}</span>
        <span className="text-[10px] text-muted whitespace-nowrap">{rows.length} 名を検出</span>
      </div>
      {code && <p className="text-[10px] text-muted">{code}</p>}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {rows.length === 0 ? (
          <span className="text-[11px] text-muted">現在の検出なし</span>
        ) : (
          rows.map((row) => <MemberChip key={row.member.id} row={row} />)
        )}
      </div>
    </div>
  );
}

/** F4 — エリア別の人数. */
export function AreaBoard({ rows, areas }: { rows: MemberRow[]; areas: Area[] }) {
  const located = (areaId: string) => rows.filter((r) => r.locationState !== "unknown" && r.member.location.areaId === areaId);
  const waiting = rows.filter((r) => r.locationState === "unknown");
  const count = (c: Category) => rows.filter((r) => r.category === c).length;
  return (
    <Panel
      id="areas"
      title="エリア別の人数"
      subtitle="現在どのエリアに？ GPS と登録エリアを照合"
      action={
        waiting.length > 0 && (
          <span className="rounded bg-caution-soft px-1.5 py-0.5 text-[10px] text-caution">位置確認待ち {waiting.length} 名</span>
        )
      }
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {areas.map((area) => (
          <AreaCell key={area.id} title={area.name} code={area.code} rows={located(area.id)} />
        ))}
        <AreaCell title="位置の確認待ち" rows={waiting} highlight={waiting.length > 0} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
        <Dot category="priority" />
        {CATEGORY_LABEL.priority} {count("priority")} 名 / {CATEGORY_LABEL.caution} {count("caution")} 名 / {CATEGORY_LABEL.normal}{" "}
        {count("normal")} 名　位置の更新時刻と精度をご確認ください
      </p>
    </Panel>
  );
}

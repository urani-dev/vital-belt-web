import type { Category } from "../domain/types";
import { KPI_LABEL } from "../domain/labels";
import { useUi } from "../store/ui";
import { Dot } from "./ui";

const ORDER: Category[] = ["priority", "caution", "normal"];

/** F2 — 計測中 = 優先確認 + 要確認 + 通常. Bấm ô để lọc danh sách F6. */
export function KpiBar({ counts, total, connected }: { counts: Record<Category, number>; total: number; connected: boolean }) {
  const filter = useUi((s) => s.memberFilter);
  const setFilter = useUi((s) => s.setMemberFilter);
  const tile = "flex flex-col rounded-xl bg-panel px-4 py-3 text-left transition hover:ring-1 hover:ring-line";
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <button type="button" className={`${tile} ${filter === "all" ? "ring-1 ring-ink/20" : ""}`} onClick={() => setFilter("all")}>
        <span className="text-[11px] text-muted">計測中</span>
        <span className="mt-1 flex items-baseline gap-1">
          <b className="text-2xl tabular-nums">{total}</b>
          <span className="text-xs">名</span>
          {/* 全デバイス接続 = mọi thiết bị đang kết nối; 更新停止中 = dữ liệu ngừng cập nhật */}
          <span className={`ml-3 text-[11px] ${connected ? "text-muted" : "text-caution"}`}>{connected ? "全デバイス接続" : "更新停止中"}</span>
        </span>
      </button>
      {ORDER.map((category) => (
        <button
          key={category}
          type="button"
          className={`${tile} ${filter === category ? "ring-1 ring-ink/20" : ""}`}
          onClick={() => setFilter(filter === category ? "all" : category)}
        >
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <Dot category={category} />
            {KPI_LABEL[category].title}
          </span>
          <span className="mt-1 flex items-baseline gap-1">
            <b className="text-2xl tabular-nums">{counts[category]}</b>
            <span className="text-xs">名</span>
            <span className="ml-3 text-[11px] text-muted">{KPI_LABEL[category].note}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

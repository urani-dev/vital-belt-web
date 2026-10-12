import type { ReactNode } from "react";
import type { Category } from "../domain/types";
import { CATEGORY_LABEL, sensorStateLabel } from "../domain/labels";
import { useUi, type PanelId } from "../store/ui";

export const CATEGORY_DOT: Record<Category, string> = {
  priority: "bg-priority",
  caution: "bg-caution",
  normal: "bg-normal",
};

export const CATEGORY_HEX: Record<Category, string> = {
  priority: "#a61e2d",
  caution: "#b9852a",
  normal: "#4e8a5b",
};

const BADGE: Record<Category, string> = {
  priority: "bg-priority-soft text-priority",
  caution: "bg-caution-soft text-caution",
  normal: "bg-normal-soft text-normal",
};

export function StatusBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${BADGE[category]}`}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

export function PriorityTag({ children = "優先して確認" }: { children?: ReactNode }) {
  return (
    <span className="inline-block rounded-sm bg-priority-soft px-1.5 py-0.5 text-[11px] font-medium text-priority">
      {children}
    </span>
  );
}

/** 「デモ」 — người giả lập từ dữ liệu kênh thật (phase 1), để không bị hiểu nhầm là thiết bị thật. */
export function DemoTag() {
  return (
    <span className="ml-1.5 inline-block rounded-sm border border-line px-1 text-[9px] font-normal text-muted align-middle" title="デモ用の表示です">
      デモ
    </span>
  );
}

/** 「未装着」/「体動中」 cạnh badge — trạng thái sensor từ packet `status`; status 0 không hiện gì. */
export function SensorTag({ status }: { status: number }) {
  const label = sensorStateLabel(status);
  if (!label) return null;
  return (
    <span className="ml-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap bg-subtle text-ink align-middle">
      {label}
    </span>
  );
}

export function Dot({ category }: { category: Category }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[category]}`} />;
}

interface PanelProps {
  id?: PanelId;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Khung panel có nút thu gọn 「たためる」 (F11) khi truyền id. */
export function Panel({ id, title, subtitle, action, className = "", children }: PanelProps) {
  const collapsed = useUi((s) => (id ? Boolean(s.collapsed[id]) : false));
  const toggle = useUi((s) => s.togglePanel);
  const heading = (
    <span className="flex items-center gap-1.5 text-sm font-bold">
      {id && <span className="text-xs text-muted">{collapsed ? "▸" : "▾"}</span>}
      {title}
    </span>
  );
  return (
    <section className={`rounded-xl bg-panel p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${className}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {id ? (
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-expanded={!collapsed}
              className="text-left"
              title={collapsed ? "開く" : "たたむ"}
            >
              {heading}
            </button>
          ) : (
            heading
          )}
          {subtitle && !collapsed && <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>}
        </div>
        {action && !collapsed && <div className="shrink-0">{action}</div>}
      </header>
      {!collapsed && <div className="mt-3">{children}</div>}
    </section>
  );
}

/** Thanh ngang nhỏ dưới mỗi chỉ số (F8, F9). */
export function MeterBar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1 w-full rounded-full bg-line">
      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

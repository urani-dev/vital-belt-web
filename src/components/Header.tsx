import { Link } from "react-router-dom";
import type { FeedStatus, Operation } from "../domain/types";
import { formatDate, formatTime, relativeTime } from "../domain/labels";
import { isFeedStale } from "../hooks/useDashboard";
import { useAuth } from "../store/auth";

/** Nhãn trạng thái kết nối dữ liệu cạnh đồng hồ (firestore-web-spec §7.3). */
function FeedBadge({ feed, now }: { feed: FeedStatus; now: number }) {
  const base = "rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap";
  if (feed.state === "denied") return <span className={`${base} bg-priority-soft text-priority`}>閲覧権限なし</span>; // Không có quyền xem
  if (feed.state === "error") return <span className={`${base} bg-priority-soft text-priority`}>接続エラー</span>; // Lỗi kết nối
  if (feed.lastReceivedAt === null) return <span className={`${base} bg-subtle text-muted`}>接続中…</span>; // Đang kết nối
  if (isFeedStale(feed.lastReceivedAt, now)) {
    // Dừng cập nhật: giữ dữ liệu cuối, ghi rõ lần nhận cuối.
    return <span className={`${base} bg-caution-soft text-caution`}>更新停止・{relativeTime(feed.lastReceivedAt, now)}</span>;
  }
  return <span className={`${base} bg-normal-soft text-normal`}>● ライブ</span>; // Đang nhận realtime
}

/** F1 — header ngữ cảnh. */
export function Header({ operation, feed, now }: { operation: Operation; feed: FeedStatus; now: number }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <p className="text-[11px] text-muted">
          {operation.organization} / {operation.department}
        </p>
        <h1 className="truncate text-lg font-bold sm:text-xl">{operation.name}</h1>
      </div>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-3">
            <FeedBadge feed={feed} now={now} />
            <span className="text-xs text-muted">{formatDate(now)}</span>
            <span className="text-lg font-bold tabular-nums">{formatTime(now)}</span>
          </div>
          <p className="text-[11px] text-muted">
            気温 <b className="text-ink">{operation.weather.temperature.toFixed(1)}</b> °C　湿度{" "}
            <b className="text-ink">{Math.round(operation.weather.humidity)}</b> %　天気{" "}
            <b className="text-ink">{operation.weather.condition}</b>
          </p>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <Link to="/settings/thresholds" className="rounded-md border border-line bg-panel px-2.5 py-1.5 hover:bg-subtle">
            設定
          </Link>
          {user && (
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-md border border-line bg-panel px-2.5 py-1.5 hover:bg-subtle"
              title={user.email}
            >
              ログアウト
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

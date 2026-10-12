import { useEffect } from "react";
import { isFeedStale, useDashboard } from "../hooks/useDashboard";
import type { FeedState } from "../domain/types";
import { useUi } from "../store/ui";
import { Header } from "../components/Header";
import { KpiBar } from "../components/KpiBar";
import { MemberMap } from "../components/MemberMap";
import { AreaBoard } from "../components/AreaBoard";
import { PriorityBanner } from "../components/PriorityBanner";
import { MemberList } from "../components/MemberList";
import { ResponseSupport } from "../components/ResponseSupport";
import { MemberDetail } from "../components/MemberDetail";

/** Thông báo khi chưa có ai để hiển thị (firestore-web-spec §7.3). */
const EMPTY_TEXT: Record<FeedState, string> = {
  connecting: "センサーデータに接続しています…", // Đang kết nối dữ liệu cảm biến
  live: "センサーデータがまだありません", // Chưa có dữ liệu cảm biến
  cached: "センサーデータに接続しています…",
  noData: "センサーデータがまだありません",
  denied: "このアカウントにはデータの閲覧権限がありません", // Tài khoản này không có quyền xem dữ liệu
  error: "データに接続できません。ネットワークを確認してください", // Không kết nối được dữ liệu, kiểm tra mạng
};

const DISCLAIMER = "画面・数値・コメントは表示例です。各指数の算出方法はエビデンスを用いた独自の評価となります。";

export function DashboardPage() {
  const data = useDashboard();
  const selectedId = useUi((s) => s.selectedMemberId);
  const select = useUi((s) => s.selectMember);

  // Mặc định chọn người đứng đầu danh sách 確認優先順.
  const firstId = data?.rows[0]?.member.id;
  useEffect(() => {
    if (!selectedId && firstId) select(firstId);
  }, [selectedId, firstId, select]);

  if (!data || (data.snapshot.members.length > 0 && data.rows.length === 0)) {
    return <p className="p-8 text-sm text-muted">データを読み込み中…</p>;
  }

  const { snapshot, rows, counts, categorySince, now } = data;
  const connected = !isFeedStale(snapshot.feed.lastReceivedAt, now);
  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        <Header operation={snapshot.operation} feed={snapshot.feed} now={now} />
        <p role="status" className="mt-8 rounded-xl bg-panel p-8 text-center text-sm text-muted">
          {EMPTY_TEXT[snapshot.feed.state]}
        </p>
      </div>
    );
  }
  const selected = rows.find((r) => r.member.id === selectedId) ?? rows[0];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <Header operation={snapshot.operation} feed={snapshot.feed} now={now} />
      <div className="mt-4">
        <KpiBar counts={counts} total={rows.length} connected={connected} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <MemberMap rows={rows} operation={snapshot.operation} areas={snapshot.areas} now={now} />
          <AreaBoard rows={rows} areas={snapshot.areas} />
          <PriorityBanner rows={rows} areas={snapshot.areas} now={now} detectedAt={categorySince} />
          <MemberList rows={rows} areas={snapshot.areas} updatedAt={snapshot.updatedAt} now={now} />
        </div>
        {selected && (
          <div className="min-w-0 space-y-4">
            <ResponseSupport row={selected} rows={rows} areas={snapshot.areas} now={now} />
            <MemberDetail key={selected.member.id} row={selected} areas={snapshot.areas} now={now} />
          </div>
        )}
      </div>
      <p className="mt-6 text-[10px] text-muted">{DISCLAIMER}</p>
    </div>
  );
}

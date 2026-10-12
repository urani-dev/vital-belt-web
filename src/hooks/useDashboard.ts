import { useEffect, useMemo, useRef, useState } from "react";
import {
  applySustain,
  classify,
  compareByPriority,
  locationState,
  type Reason,
  type SustainState,
} from "../domain/classify";
import type { Category, DashboardSnapshot, LocationState, Member } from "../domain/types";
import { LIVE_CHANNEL_ID, subscribeLiveChannel } from "../data/liveSource";
import { createDemoRoster } from "../data/demoRoster";
import { AREAS } from "../data/mockData";
import { useThresholds } from "../store/thresholds";

export interface MemberRow {
  member: Member;
  category: Category;
  reasons: Reason[];
  locationState: LocationState;
}

export interface DashboardData {
  snapshot: DashboardSnapshot;
  rows: MemberRow[];
  counts: Record<Category, number>;
  /** Thời điểm mỗi người bắt đầu ở mức hiện tại (epoch ms) — dùng cho "N 分前 検知". */
  categorySince: Record<string, number>;
  now: number;
}

const CLOCK_TICK_MS = 1_000;
/** Quá khoảng này không có sequence mới → "更新停止" (firestore-web-spec §7.3, quy ước demo 5 giây). */
export const FEED_STALE_MS = 5_000;

/** Dữ liệu cảm biến đã cũ hơn FEED_STALE_MS chưa. */
export function isFeedStale(lastReceivedAt: number | null, now: number): boolean {
  return lastReceivedAt === null || now - lastReceivedAt > FEED_STALE_MS;
}

/** Giờ hiện tại, cập nhật mỗi giây (đồng hồ header, "N 秒前", mất tín hiệu). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function useDashboard(): DashboardData | null {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const config = useThresholds((s) => s.config);
  const now = useNow();
  const sustain = useRef(new Map<string, SustainState>());
  const [rows, setRows] = useState<MemberRow[]>([]);
  const since = useRef(new Map<string, { category: Category; at: number }>());
  const [categorySince, setCategorySince] = useState<Record<string, number>>({});

  // Một listener cho kênh thật; 10 người trên màn hình đều dựng từ kênh này (phase 1).
  useEffect(() => {
    const build = createDemoRoster();
    return subscribeLiveChannel(LIVE_CHANNEL_ID, (feed) => {
      const now = Date.now();
      const { operation, members } = build(feed, now);
      setSnapshot({
        feed: { state: feed.state, lastReceivedAt: feed.receivedAt },
        operation,
        areas: AREAS,
        members,
        updatedAt: feed.receivedAt ?? now,
      });
    });
  }, []);

  // Đổi ngưỡng → phân loại lại ngay, không chờ thời gian duy trì (F13 "Sau khi lưu").
  useEffect(() => {
    sustain.current.clear();
    since.current.clear();
  }, [config]);

  useEffect(() => {
    if (!snapshot) return;
    const next = snapshot.members.map((member) => {
      const state = applySustain(sustain.current.get(member.id), classify(member, config, now), now, config.sustainSec);
      sustain.current.set(member.id, state);
      return {
        member,
        category: state.current,
        reasons: state.reasons,
        locationState: locationState(member, config, now),
      };
    });
    const sinceRecord: Record<string, number> = {};
    for (const row of next) {
      const prev = since.current.get(row.member.id);
      if (!prev || prev.category !== row.category) since.current.set(row.member.id, { category: row.category, at: now });
      sinceRecord[row.member.id] = since.current.get(row.member.id)?.at ?? now;
    }
    setCategorySince(sinceRecord);
    setRows(next.sort(compareByPriority));
  }, [snapshot, config, now]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { priority: 0, caution: 0, normal: 0 };
    for (const row of rows) c[row.category] += 1;
    return c;
  }, [rows]);

  if (!snapshot) return null;
  return { snapshot, rows, counts, categorySince, now };
}

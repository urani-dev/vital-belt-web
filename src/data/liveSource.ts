import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { FeedState, Waveforms } from "../domain/types";
import { EMPTY_WAVES, appendWaves, isNewer, missedPackets, parseLiveChannel, type Cursor, type LiveChannel } from "./liveChannel";

/** Kênh demo phase 1 — chỉ đọc một kênh (firestore-web-spec §2). */
export const LIVE_CHANNEL_ID = "5005";

export interface ChannelFeed {
  state: FeedState;
  channel: LiveChannel | null;
  waves: Waveforms;
  /** epoch ms — lần cuối nhận sequence mới; null khi chưa nhận gì. */
  receivedAt: number | null;
}

/**
 * Nghe `liveChannels/{id}` (spec §7.1). Bản cache chỉ hiển thị, không nối sóng và không đổi phiên;
 * snapshot chỉ đổi metadata không nối lại cùng packet.
 */
export function subscribeLiveChannel(channelId: string, emit: (feed: ChannelFeed) => void): () => void {
  let feed: ChannelFeed = { state: "connecting", channel: null, waves: EMPTY_WAVES, receivedAt: null };
  let cursor: Cursor | null = null;
  const publish = (next: ChannelFeed) => {
    feed = next;
    emit(feed);
  };

  emit(feed);
  return onSnapshot(
    doc(db, "liveChannels", channelId),
    { includeMetadataChanges: true },
    (snapshot) => {
      const cached = snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites;
      if (!snapshot.exists()) {
        if (!cached) publish({ ...feed, state: "noData" });
        return;
      }
      // Packet lỗi không thay thế packet hợp lệ đang hiển thị (spec §6).
      const channel = parseLiveChannel(snapshot.data());
      if (!channel) {
        if (!feed.channel) publish({ ...feed, state: cached ? "connecting" : "noData" });
        return;
      }
      const next = { sessionId: channel.sessionId, sequence: channel.sequence };
      if (cached) {
        // Chỉ dùng cache khi chưa có gì để hiển thị; không đảo ngược phiên đang xem.
        publish(feed.channel ? { ...feed, state: "cached" } : { ...feed, state: "cached", channel });
        return;
      }
      if (!isNewer(cursor, next)) {
        if (feed.state !== "live") publish({ ...feed, state: "live" });
        return;
      }
      const sameSession = cursor?.sessionId === next.sessionId;
      const missed = missedPackets(cursor, next);
      const first = cursor === null;
      cursor = next;
      publish({
        state: "live",
        channel,
        waves: appendWaves(sameSession ? feed.waves : EMPTY_WAVES, channel, missed),
        // Lần đầu: packet có thể đã cũ (app đã dừng) → lấy mốc publish thay vì giờ nhận.
        receivedAt: first ? (channel.publishedAt ?? Date.now()) : Date.now(),
      });
    },
    (error) => publish({ ...feed, state: error.code === "permission-denied" ? "denied" : "error" }),
  );
}

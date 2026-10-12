import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ResponseStatus } from "../domain/types";

/** F7 — ghi nhận xử lý, lưu trên trình duyệt (chưa ghi Firebase). */
export interface ResponseRecord {
  status: ResponseStatus;
  updatedAt: number;
}

interface ResponseState {
  records: Record<string, ResponseRecord>;
  setStatus: (memberId: string, status: ResponseStatus) => void;
  reset: (memberId: string) => void;
}

export const useResponses = create<ResponseState>()(
  persist(
    (set) => ({
      records: {},
      setStatus: (memberId, status) =>
        set((s) => ({ records: { ...s.records, [memberId]: { status, updatedAt: Date.now() } } })),
      reset: (memberId) =>
        set((s) => {
          const records = { ...s.records };
          delete records[memberId];
          return { records };
        }),
    }),
    { name: "vb-responses" },
  ),
);

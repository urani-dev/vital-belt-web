import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THRESHOLDS, type ThresholdConfig } from "../domain/thresholds";

/**
 * F13 — web chưa ghi lên Firebase (ADMIN-SPEC §8.2 H4), nên ngưỡng và log
 * thay đổi lưu trên trình duyệt. Mỗi máy một bản.
 */
export interface ThresholdAuditEntry {
  changedAt: number;
  changedBy: string;
  before: ThresholdConfig;
  after: ThresholdConfig;
}

const AUDIT_LIMIT = 50;

interface ThresholdState {
  config: ThresholdConfig;
  updatedAt: number | null;
  updatedBy: string | null;
  audit: ThresholdAuditEntry[];
  save: (config: ThresholdConfig, by: string) => void;
}

export const useThresholds = create<ThresholdState>()(
  persist(
    (set) => ({
      config: DEFAULT_THRESHOLDS,
      updatedAt: null,
      updatedBy: null,
      audit: [],
      save: (config, by) =>
        set((s) => {
          const changedAt = Date.now();
          const entry: ThresholdAuditEntry = { changedAt, changedBy: by, before: s.config, after: config };
          return { config, updatedAt: changedAt, updatedBy: by, audit: [entry, ...s.audit].slice(0, AUDIT_LIMIT) };
        }),
    }),
    {
      name: "vb-thresholds",
      version: 2,
      // v2: 熱中危険度 đổi sang thang 1–5 → bộ ngưỡng lưu theo thang cũ không còn dùng được, đưa về mặc định.
      migrate: (persisted, version) => {
        const state = persisted as ThresholdState;
        return version < 2 ? { ...state, config: DEFAULT_THRESHOLDS, updatedAt: null, updatedBy: null } : state;
      },
    },
  ),
);

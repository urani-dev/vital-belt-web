import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "../domain/types";

export type MemberFilter = Category | "all";

/** Panel thu gọn được (F11). */
export type PanelId = "map" | "areas" | "members" | "support" | "breakdown";

interface UiState {
  selectedMemberId: string | null;
  memberFilter: MemberFilter;
  collapsed: Partial<Record<PanelId, boolean>>;
  selectMember: (id: string) => void;
  setMemberFilter: (filter: MemberFilter) => void;
  togglePanel: (id: PanelId) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      selectedMemberId: null,
      memberFilter: "all",
      collapsed: {},
      selectMember: (id) => set({ selectedMemberId: id }),
      setMemberFilter: (memberFilter) => set({ memberFilter }),
      togglePanel: (id) => set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),
    }),
    { name: "vb-ui", partialize: (s) => ({ collapsed: s.collapsed }) },
  ),
);

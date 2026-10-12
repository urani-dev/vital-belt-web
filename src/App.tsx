import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./store/auth";
import { Splash } from "./components/Splash";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ThresholdSettingsPage } from "./pages/ThresholdSettingsPage";

/** Chưa đăng nhập Firebase → về /login, nhớ trang đang mở để quay lại (F12). */
function RequireAuth({ children }: { children: ReactNode }) {
  const ready = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const location = useLocation();
  // Chờ Firebase khôi phục phiên đăng nhập trước khi quyết định chuyển về /login.
  if (!ready) return <p className="p-8 text-sm text-muted">読み込み中…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Splash>{children}</Splash>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/settings/thresholds" element={<RequireAuth><ThresholdSettingsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

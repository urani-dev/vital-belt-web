import { useEffect, useState } from "react";

const SPLASH_KEY = "vb-splash-shown";
const SPLASH_MS = 2_600;
const REDUCED_MOTION_MS = 600;

function alreadyShown(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    sessionStorage.setItem(SPLASH_KEY, "1");
  } catch {
    // sessionStorage bị chặn (chế độ riêng tư): splash sẽ hiện lại lần sau, không ảnh hưởng chức năng.
  }
}

/** F0 — 立ち上がり: màn đen, chữ VITAL BELT hiện ra rồi mờ dần. Chỉ chạy lần đầu mỗi phiên. */
export function Splash({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(() => !alreadyShown());

  useEffect(() => {
    if (!visible) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      markShown();
      setVisible(false);
    }, reduced ? REDUCED_MOTION_MS : SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return <>{children}</>;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black" aria-label="VITAL BELT">
      <span className="vb-splash-text text-2xl font-bold tracking-[0.2em] text-white sm:text-4xl">VITAL BELT</span>
    </div>
  );
}

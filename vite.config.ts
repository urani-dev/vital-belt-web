import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  // Nút login nhanh chỉ có khi chạy dev server: tài khoản lấy từ .env.local (FB_PROBE_*),
  // bản build luôn nhận null nên mật khẩu không bao giờ nằm trong file JS phát hành.
  const env = loadEnv(mode, process.cwd(), "FB_PROBE_");
  const devLogin =
    command === "serve" && env.FB_PROBE_EMAIL && env.FB_PROBE_PASSWORD
      ? { email: env.FB_PROBE_EMAIL, password: env.FB_PROBE_PASSWORD }
      : null;
  return {
    plugins: [react(), tailwindcss()],
    define: { __DEV_LOGIN__: JSON.stringify(devLogin) },
  };
});

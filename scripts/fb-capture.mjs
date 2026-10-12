/**
 * Ghi lại các snapshot liên tiếp của liveChannels/5005 ra file JSON để phân tích sóng Doppler (chỉ đọc).
 * Cách chạy: node scripts/fb-capture.mjs <file-output.json> [số giây, mặc định 30]
 * Đăng nhập bằng FB_PROBE_EMAIL / FB_PROBE_PASSWORD trong .env.local (giống fb-probe.mjs).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";

const [outPath, secondsArg] = process.argv.slice(2);
if (!outPath) {
  console.error("Cách dùng: node scripts/fb-capture.mjs <file-output.json> [số giây]");
  process.exit(1);
}
const seconds = Number(secondsArg ?? 30);

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
await signInWithEmailAndPassword(getAuth(app), env.FB_PROBE_EMAIL, env.FB_PROBE_PASSWORD);

const frames = [];
const unsubscribe = onSnapshot(doc(getFirestore(app), "liveChannels", "5005"), (snapshot) => {
  if (!snapshot.exists() || snapshot.metadata.fromCache) return;
  const { meta, packet } = snapshot.data();
  frames.push({
    receivedAtMs: Date.now(),
    sessionId: meta.publisherSessionId,
    sequence: meta.sequence,
    publishedAtMs: meta.publishedAt?.toMillis?.() ?? null,
    packetCounter: packet.packetCounter,
    epochSeconds: packet.vital.epochSeconds,
    heartBeat: packet.vital.heartBeat,
    breath: packet.vital.breath,
    heartRateLevel: packet.vital.heartRateLevel,
    respirationLevel: packet.vital.respirationLevel,
    status: packet.vital.status,
    dopplerHeart: packet.dopplerHeart,
    dopplerBreath: packet.dopplerBreath,
  });
  process.stdout.write(`\rĐã nhận ${frames.length} snapshot`);
});

setTimeout(() => {
  unsubscribe();
  writeFileSync(outPath, JSON.stringify(frames));
  console.log(`\nĐã ghi ${frames.length} snapshot vào ${outPath}`);
  process.exit(0);
}, seconds * 1000);

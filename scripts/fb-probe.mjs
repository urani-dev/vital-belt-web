/**
 * Đọc thử dữ liệu Firestore để đối chiếu cấu trúc với spec (chỉ đọc, không ghi).
 * Cách chạy: thêm FB_PROBE_EMAIL / FB_PROBE_PASSWORD vào .env.local (file này không commit), rồi `node scripts/fb-probe.mjs`.
 * Biến không có tiền tố VITE_ nên không bị đóng gói vào bản build web.
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, limit, query } from "firebase/firestore";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

for (const key of ["FB_PROBE_EMAIL", "FB_PROBE_PASSWORD"]) {
  if (!env[key]) {
    console.error(`Thiếu ${key} trong .env.local`);
    process.exit(1);
  }
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

/** Mảng dài (Doppler, gia tốc) chỉ in số phần tử + 3 phần tử đầu để output gọn. */
function summarize(value) {
  if (Array.isArray(value)) {
    return value.length > 8 ? `[${value.length} items] ${JSON.stringify(value.slice(0, 3))}…` : value;
  }
  if (value && typeof value === "object") {
    if (typeof value.toDate === "function") return `Timestamp(${value.toDate().toISOString()})`;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, summarize(v)]));
  }
  return value;
}

async function show(label, read) {
  try {
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(summarize(await read()), null, 2));
  } catch (error) {
    console.log(`ERR ${error.code ?? ""} ${error.message}`);
  }
}

const { user } = await signInWithEmailAndPassword(getAuth(app), env.FB_PROBE_EMAIL, env.FB_PROBE_PASSWORD);
console.log(`Đăng nhập OK — UID: ${user.uid} (UID này phải nằm trong channelAccess/5005.readerUids)`);

await show("channelAccess/5005", async () => (await getDoc(doc(db, "channelAccess", "5005"))).data() ?? "(không có document)");
await show("liveChannels/5005", async () => (await getDoc(doc(db, "liveChannels", "5005"))).data() ?? "(không có document)");
await show("members (tối đa 20)", async () => {
  const snap = await getDocs(query(collection(db, "members"), limit(20)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
});

process.exit(0);

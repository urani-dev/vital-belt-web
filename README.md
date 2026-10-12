# vital-belt-web

Web admin (管理者ビュー) cho VITAL BELT. Đặc tả: `docs/ADMIN-SPEC.md`.

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test phân loại / ngưỡng / đọc kênh Firestore
npm run build
```

Cấu hình Firebase: copy `.env.example` → `.env.local` và điền giá trị của project `vital-belt-demo-20261010`.

## Đăng nhập & quyền

- Đăng nhập bằng Firebase Authentication (Email/Password). Tài khoản tạo trong Firebase Console.
- UID của tài khoản phải nằm trong `channelAccess/5005.readerUids`, nếu không web báo 「閲覧権限なし」 (không có quyền xem).

## Dữ liệu (phase 1)

- Web nghe realtime một document `liveChannels/5005` (`src/data/liveSource.ts`), chỉ đọc.
- 10 người theo design (`src/data/mockData.ts`): 田中 健二 nhận nguyên dữ liệu kênh thật; 9 người còn lại gắn nhãn 「デモ」 (`src/data/demoRoster.ts`): giá trị kênh hợp lệ thì cộng độ lệch, giá trị "chưa đo được" (mạch/thở = 0, điểm = 255, displayScores = null) thì dùng số mock theo mockup. 田中 健二 vẫn hiện `—` cho giá trị chưa đo được.
- Vị trí: GPS trong packet UDP nếu hợp lệ, không thì lấy object `location` cùng hàng `meta`.
- Khu vực, tên công việc, biểu đồ 24 giờ / 日次 / 週次 vẫn là dữ liệu giả (chưa có lịch sử, chưa có collection `members`).
- Quá 5 giây không có `sequence` mới → 「更新停止」 (ngừng cập nhật).
- `status` = 1 (không đeo đai) → nhãn 「未装着」 (chưa đeo) và xếp vào 要確認 (cần kiểm tra) sau thời gian duy trì; `status` = 2 → nhãn 「体動中」 (đang cử động), không đổi nhóm. Label JP là đề xuất, cần khách hàng duyệt.
- Ghi nhận xử lý (F7) và ngưỡng cảnh báo (F13) lưu trên trình duyệt (localStorage).

Đọc thử dữ liệu Firestore từ terminal: thêm `FB_PROBE_EMAIL` / `FB_PROBE_PASSWORD` vào `.env.local`, chạy `node scripts/fb-probe.mjs` (chỉ đọc).

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/domain/` | Kiểu dữ liệu, logic phân loại, ngưỡng, label JP (có test) |
| `src/data/` | Đọc Firestore (`liveChannel`, `liveSource`), ghép 10 người demo (`demoRoster`), dữ liệu giả (`mockData`, `mockSeries`) |
| `src/store/` | State: đăng nhập Firebase, UI, ngưỡng, ghi nhận xử lý |
| `src/components/` | Các khối F1–F11 của dashboard |
| `src/pages/` | Login (F12), Dashboard, Cài đặt ngưỡng (F13) |

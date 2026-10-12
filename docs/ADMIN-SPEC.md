# VITAL BELT — Đặc tả Web Admin (管理者ビュー · màn hình người quản lý)

> Nguồn: `docs/VB-GUI ソース_20261006.ai` (trang 2 — PC アプリ · ứng dụng PC), `docs/20261009-134657.png` (bản giải thích các mục A–D và 1–2).
> Ngày lập: 2026-10-09. Trạng thái: **Draft** — các mục ❓ chưa có trong docs, cần chốt.
>
> **Quy ước đọc:** text tiếng Nhật trong 「」 là **label hiển thị nguyên văn trên UI** (code dùng đúng chuỗi này). Phần *(nghiêng trong ngoặc)* đi kèm là nghĩa tiếng Việt, chỉ để đọc hiểu, không đưa lên UI.

---

## 1. Bối cảnh & phạm vi

- **Sản phẩm:** TAION — VITAL BELT. Đai cảm biến đeo trên người công nhân, đo mạch, hô hấp, tư thế và vận động; kết hợp GPS và dữ liệu môi trường.
- **Khẩu hiệu admin:** 「みんなの状態を、ひと目で管理。」 *(Quản lý trạng thái của mọi người chỉ trong một cái nhìn.)*. Người quản lý nắm được tình trạng và vị trí của từng người, rồi chuyển sang kiểm tra hoặc xử lý.
- **Hệ thống gồm 2 phần:**
  - **Mobile app (công nhân):** ❌ **NGOÀI PHẠM VI**, team khác làm (trang 1 file `.ai`).
  - **Web admin (quản lý):** ✅ **PHẠM VI CỦA REPO NÀY.**
- **Thiết bị:** docs ghi 「PC／スマホ 管理者ビュー」 *(màn quản lý trên PC / điện thoại)*, nên web phải **responsive**.
- **Ngôn ngữ UI:** tiếng Nhật (＊日本語).
- **Chú thích pháp lý (bắt buộc hiển thị ở chân trang):** 「画面・数値・コメントは表示例です。各指数の算出方法はエビデンスを用いた独自の評価となります。」 *(Màn hình, số liệu và nhận xét chỉ là ví dụ minh họa. Cách tính các chỉ số là phương pháp đánh giá riêng dựa trên bằng chứng khoa học.)*

---

## 2. Bố cục tổng thể

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [F1] Header: Công ty/Bộ phận · Tên dự án · Ngày · Giờ · Nhiệt độ · Độ ẩm · Thời tiết │
├───────────────────────────────────────────────────────────────────────────┤
│ [F2] KPI: Đang đo | Ưu tiên kiểm tra | Cần kiểm tra | Bình thường           │
├─────────────────────────────────────┬─────────────────────────────────────┤
│ CỘT TRÁI                            │ CỘT PHẢI                            │
│ [F3] (A) Bản đồ vị trí thành viên   │ [F7] (D) Hỗ trợ xử lý               │
│ [F4] (B) Số người theo khu vực      │ [F8] (C) Chi tiết 1 thành viên      │
│ [F5] Banner cảnh báo ưu tiên        │      ├ [F9]  ① Cơ thể·Tinh thần·Môi trường │
│ [F6] Danh sách thành viên           │      └ [F10] ② Mạch·Hô hấp           │
└─────────────────────────────────────┴─────────────────────────────────────┘
```

| Mã | Label JP trên UI | Nghĩa |
|---|---|---|
| F3 | 「メンバーの位置」 | Vị trí thành viên |
| F4 | 「エリア別の人数」 | Số người theo khu vực |
| F5 | 「優先して確認」 | Cần ưu tiên kiểm tra |
| F6 | 「メンバー」 | Thành viên |
| F7 | 「対応サポート」 | Hỗ trợ xử lý |
| F9 | 「からだ・こころ・環境」 | Cơ thể · Tinh thần · Môi trường |
| F10 | 「脈拍・呼吸」 | Mạch · Hô hấp |

- Mỗi panel F3–F8 có nút 「たためる」 *(thu gọn được)*: xem F11.
- **UX: bám đúng thiết kế (đã chốt 2026-10-09).** Không áp dụng các đề xuất U1–U6. Trên mobile xếp 1 cột, giữ nguyên thứ tự của thiết kế: F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8.
- **Luồng chính:** thấy người cần ưu tiên (F2/F5) → chọn người đó (pin trên F3, tên trên F4/F6, hoặc banner F5) → F7 và F8 hiển thị người đó → drill-down vào F9/F10 → ghi nhận xử lý ở F7.

**4 thông điệp giải thích trong docs (ảnh PNG):**

| Mục | JP | Nghĩa | Tương ứng |
|---|---|---|---|
| A | 「全体から、優先確認へ。」 | Từ tổng thể, đi tới người cần ưu tiên | F2, F3, F6 |
| B | 「人と場所や環境が、つながる。」 | Kết nối con người với địa điểm và môi trường | F3, F4 |
| C | 「状態の内訳まで、すぐに把握。」 | Nắm ngay chi tiết từng thành phần trạng thái | F8, F9, F10 |
| D | 「確認してから、最適な対応へ。」 | Kiểm tra trước, rồi xử lý phù hợp nhất | F7 |

---

## 3. Mô hình trạng thái (dùng chung cho mọi màn)

### 3.1 Phân loại người (確認区分 · mức độ cần kiểm tra)

| Key | Label JP | Nghĩa | Ý nghĩa theo docs | Màu |
|---|---|---|---|---|
| `priority` | 優先確認 | Ưu tiên kiểm tra | 「状態を先に確認」 *(kiểm tra trạng thái trước tiên)* | Đỏ / đỏ đô |
| `caution` | 要確認 / 要注意 | Cần kiểm tra / Cần chú ý | 「変化を確認」 *(theo dõi sự thay đổi)* | Cam / vàng nâu |
| `normal` | 通常 / 安定 | Bình thường / Ổn định | 「確認対象外」 *(không thuộc diện cần kiểm tra)* | Xanh lá |

- Docs dùng lẫn 「要確認」 *(cần kiểm tra, ở KPI)* và 「要注意」 *(cần chú ý, ở bản đồ và danh sách)*. ❓ Cần chốt một label.
- Docs dùng lẫn 「通常」 *(bình thường, ở KPI)* và 「安定」 *(ổn định, ở filter và danh sách)*. ❓ Cần chốt.
- **Bất biến:** 計測中 *(đang đo)* = 優先確認 + 要確認 + 通常. Ví dụ mẫu: 10 = 1 + 3 + 6.
- Docs ghi rõ 「総合の評価と、確認の優先度は別の情報です」 *(điểm đánh giá tổng và mức ưu tiên kiểm tra là hai thông tin khác nhau)*. Hai trường này **độc lập**: frontend không được suy ra mức ưu tiên từ điểm tổng, backend trả về sẵn. ❓ Quy tắc phân loại do backend hoặc khách hàng định nghĩa.
- Thứ tự sắp xếp mặc định 「確認優先順」 *(theo thứ tự ưu tiên kiểm tra)*: `priority` → `caution` → `normal`. Trong cùng mức, xếp theo số thứ tự thành viên (đối chiếu lại mockup: 02→04→08 và 03→05→…→10 đều tăng dần theo số, không theo điểm).

### 3.2 Trạng thái vị trí

| Trạng thái | Hiển thị (JP) | Nghĩa |
|---|---|---|
| GPS mới | Pin đặc + 「GPS 更新 20 秒前・推定精度 半径 15m」 | GPS cập nhật 20 giây trước · sai số ước tính bán kính 15m |
| GPS cũ | Nhãn cạnh pin 「5 分前」 | 5 phút trước. Docs: 「位置が古い場合は、更新時刻も一緒に表示」 *(nếu vị trí đã cũ thì hiện kèm thời gian cập nhật)* |
| Mất GPS | 「現在地不明・最終確認 エリア 5」 | Không rõ vị trí hiện tại · lần xác nhận cuối ở khu vực 5 |
| | Bản đồ: 「破線：最終位置」 | Nét đứt = vị trí cuối cùng |
| | F4: ô 「位置の確認待ち」 | Đang chờ xác nhận vị trí |

❓ Ngưỡng thời gian để coi vị trí là "cũ" hoặc "không rõ".

### 3.3 Trạng thái xử lý (対応ステータス)

| JP | Nghĩa |
|---|---|
| 未対応 | Chưa xử lý |
| 対応中 | Đang xử lý |
| 確認済 | Đã xác nhận xong |

Luồng: 未対応 → 対応中 → 確認済. Có thể reset bằng nút 「対応記録をリセット」 *(xóa ghi nhận xử lý)*.

---

## 4. Đặc tả từng tính năng

### F0. Animation khởi động (立ち上がり · khi mở app)

> **Đã bỏ (2026-10-12, theo yêu cầu người dùng):** không hiển thị màn đen sau đăng nhập; vào thẳng dashboard. Mô tả dưới đây chỉ để tham chiếu design.

1. Màn đen.
2. 「VITAL BELT 文字が現れる」 *(chữ VITAL BELT hiện ra)*.
3. 「VITAL BELT 文字が一定時間見えている」 *(chữ hiển thị trong một khoảng thời gian)*.
4. 「VITAL BELT 文字がゆっくりブラックアウト」 *(chữ mờ dần rồi tắt hẳn)*.
5. Vào dashboard.

❓ Tổng thời lượng (bản mobile là 3 giây). ❓ Chạy mỗi lần mở trang hay chỉ lần đầu? Đề xuất: chỉ lần đầu trong phiên, và tôn trọng `prefers-reduced-motion`.

### F1. Header
| Trường | Ví dụ JP | Nghĩa |
|---|---|---|
| Tổ chức / Bộ phận | 株式会社 D.O.N / 製造 3 部 | Công ty cổ phần D.O.N / Phòng sản xuất số 3 |
| Tên nghiệp vụ / dự án | 業務 _ 幕張メッセ運用（仮） | Nghiệp vụ: vận hành Makuhari Messe (tên tạm) |
| Ngày | 2026 年 10 月 4 日（日） | 4/10/2026 (Chủ nhật) |
| Giờ (realtime) | 14:20 | |
| 気温 / 湿度 / 天気 | 31.2 °C / 72 % / 曇り | Nhiệt độ / Độ ẩm / Thời tiết: nhiều mây |

❓ Nguồn dữ liệu thời tiết (API ngoài hay cảm biến tại công trường). ❓ Có cho đổi dự án/công trường không.

### F2. Thanh KPI
| Label JP | Nghĩa | Số | Chú thích phụ (JP) | Nghĩa chú thích |
|---|---|---|---|---|
| 計測中 | Đang đo | 10 名 *(người)* | 全デバイス接続 | Tất cả thiết bị đã kết nối |
| ● 優先確認 | Ưu tiên kiểm tra | 1 名 | 状態を先に確認 | Kiểm tra trạng thái trước |
| ● 要確認 | Cần kiểm tra | 3 名 | 変化を確認 | Theo dõi thay đổi |
| ● 通常 | Bình thường | 6 名 | 確認対象外 | Không cần kiểm tra |

- ❓ Bấm vào ô KPI có lọc danh sách F6 không? Đề xuất: có.
- ❓ Khi có thiết bị mất kết nối, chú thích 「全デバイス接続」 hiển thị thế nào?

### F3. (A) 「メンバーの位置」 *(Vị trí thành viên)*: bản đồ
- Tiêu đề 「メンバーの位置」, phụ đề 「幕張メッセ周辺」 *(khu vực quanh Makuhari Messe)*. Nút 「拡大」 *(phóng to / toàn màn hình)*.
- Nền **OpenStreetMap**, bắt buộc ghi 「© OpenStreetMap contributors」. Có thang tỷ lệ (100m), la bàn (N) và nhãn 「GPS 位置」 *(vị trí GPS)*.
- **Pin:** hình tròn ghi số thứ tự thành viên (01–10), màu theo §3.1. Pin đang chọn có viền nổi.
- **GPS cũ:** nhãn 「5 分前」 *(5 phút trước)* cạnh pin.
- **Mất GPS:** vị trí cuối vẽ nét đứt.
- **Chú giải:** 「● 優先確認 1 ● 要注意 3 ● 安定 6 ┄ 破線：最終位置」 *(Ưu tiên 1 · Cần chú ý 3 · Ổn định 6 · nét đứt = vị trí cuối)*.
- **Dòng chọn ở chân panel:** 「01 佐藤 元気 ・優先確認 エリア 1・GPS 更新 20 秒前・精度半径 15m」 *(01 Sato Genki · ưu tiên kiểm tra · khu vực 1 · GPS cập nhật 20 giây trước · sai số bán kính 15m)*.
- **Tương tác:** docs ghi 「地図のピン、またはメンバー名を選択。選んだ人の状態と最終位置を、同じ画面で確認できます。」 *(Chọn pin trên bản đồ hoặc tên thành viên; xem được trạng thái và vị trí cuối của người đó ngay trên cùng màn hình)*. Bấm pin thì F7 và F8 cập nhật theo.

❓ Có vẽ ranh giới khu vực lên bản đồ không? ❓ Có hiển thị vòng tròn sai số GPS không?

### F4. (B) 「エリア別の人数」 *(Số người theo khu vực)*
- Câu hỏi phụ: 「現在どのエリアに？ GPS と登録エリアを照合」 *(Hiện đang ở khu vực nào? So khớp GPS với khu vực đã đăng ký)*.
- Badge góc: 「位置確認待ち 1 名」 *(1 người đang chờ xác nhận vị trí)*.
- **Lưới các ô khu vực.** Mỗi ô gồm:
  - Tên khu vực + mã khu vực, vd 「屋外作業場 / エリア 1」 *(khu làm việc ngoài trời / khu vực 1)*.
  - 「N 名を検出」 *(phát hiện N người)*.
  - Chip tên từng người, mỗi chip có chấm màu trạng thái. Người đang chọn được tô nổi.
  - Khi trống: 「現在の検出なし」 *(hiện không phát hiện ai)*.
- **Ô đặc biệt 「位置の確認待ち」** *(chờ xác nhận vị trí)*: gom những người không xác định được khu vực.
- **Dòng tổng kết:** 「優先確認 1 名 / 要注意 3 名 / 安定 6 名 位置の更新時刻と精度をご確認ください」 *(Ưu tiên 1 / Cần chú ý 3 / Ổn định 6 — vui lòng kiểm tra thời gian cập nhật và độ chính xác của vị trí)*.
- **Tương tác:** bấm chip tên để chọn thành viên.

Dữ liệu mẫu:

| Khu vực (JP) | Nghĩa | Mã | Thành viên |
|---|---|---|---|
| 屋外作業場 | Khu làm việc ngoài trời | エリア 1 | 佐藤 元気 (ưu tiên), 山田 太郎, 佐藤 次郎 (cần chú ý) |
| 製造エリア | Khu sản xuất | エリア 2 | 鈴木 一郎 (cần chú ý), 高橋 三郎 |
| 物流エリア | Khu logistics | エリア 3 | TANAKA, 井上 翔, 中村 直樹 |
| 管理棟 | Tòa nhà quản lý | エリア 4 | 伊藤 花子 |
| 屋外通路 | Lối đi ngoài trời | エリア 5 | 「現在の検出なし」 *(không có ai)* |
| 位置の確認待ち | Chờ xác nhận vị trí | — | 渡辺 直人 (cần chú ý, lần cuối ở khu vực 5) |

### F5. Banner 「優先して確認」 *(Cần ưu tiên kiểm tra)*
- Chỉ hiện khi có người ở mức `priority`. ❓ Nếu có nhiều người thì hiện nhiều banner hay một danh sách?
- **Nội dung:**
  - Tag 「優先して確認」.
  - Tên + khu vực.
  - 「総合コンディション 45 / 100」 *(tình trạng tổng thể 45/100)*.
  - 「15 分前 検知」 *(phát hiện 15 phút trước)*.
  - Mô tả: 「屋外作業場で暑熱リスク指標が上昇。本人の体調確認と、現地確認を手配してください。」 *(Chỉ số rủi ro nắng nóng tăng ở khu ngoài trời. Hãy hỏi thăm sức khỏe người đó và cử người tới kiểm tra tại chỗ.)*
- **CTA:** 「位置確認・対応サポート →」 *(Xác nhận vị trí · Hỗ trợ xử lý)*. Bấm để chọn người đó và cuộn tới F7.
- Phong cách: viền đỏ, nền nhạt, nút đỏ đô.

### F6. 「メンバー」 *(Danh sách thành viên)*
- Nhãn sắp xếp: 「確認優先順」 *(xếp theo mức ưu tiên kiểm tra)*.
- **Tab lọc:** 「すべて 10」 *(tất cả)* | 「優先確認 1」 *(ưu tiên)* | 「要注意 3」 *(cần chú ý)* | 「安定 6」 *(ổn định)*.
- **Cột:**

| Header JP | Nghĩa | Ví dụ |
|---|---|---|
| (No.) | Số thứ tự | 01 |
| メンバー / 所在地 | Thành viên / Vị trí hiện tại | 佐藤 元気 / 屋外作業場・エリア 1 |
| 状態 | Trạng thái | Badge 優先確認 / 要注意 / 安定 |
| 総合 | Điểm tổng | 45 /100 |
| 姿勢 | Tư thế | Theo mã `posture` của packet, xem §8.1 (design gốc: 立位 *(đứng)* / 座位 *(ngồi)*) |

- Chân bảng: 「最終更新 20 秒前」 *(cập nhật lần cuối 20 giây trước)*.
- Hàng đang chọn có nền nổi. Bấm hàng để chọn thành viên.

Dữ liệu mẫu (đúng thứ tự trong mockup):

| No | Tên | Vị trí (nghĩa) | 状態 | 総合 | 姿勢 |
|---|---|---|---|---|---|
| 01 | 佐藤 元気 | 屋外作業場・エリア 1 *(ngoài trời, KV1)* | 優先確認 | 45 | 立位 |
| 02 | 鈴木 一郎 | 製造エリア・エリア 2 *(sản xuất, KV2)* | 要注意 | 65 | 立位 |
| 04 | 佐藤 次郎 | 屋外作業場・エリア 1 | 要注意 | 65 | 立位 |
| 08 | 渡辺 直人 | 現在地不明・最終確認 エリア 5 *(không rõ vị trí, lần cuối KV5)* | 要注意 | 62 | 立位 |
| 03 | TANAKA | 物流エリア・エリア 3 *(logistics, KV3)* | 安定 | 76 | 立位 |
| 05 | 伊藤 花子 | 管理棟・エリア 4 *(tòa quản lý, KV4)* | 安定 | 85 | 座位 |
| 06 | 高橋 三郎 | 製造エリア・エリア 2 | 安定 | 80 | 立位 |
| 07 | 中村 直樹 | 物流エリア・エリア 3 | 安定 | 78 | 立位 |
| 09 | 井上 翔 | 物流エリア・エリア 3 | 安定 | 80 | 立位 |
| 10 | 山田 太郎 | 屋外作業場・エリア 1 | 安定 | 85 | 立位 |

### F7. (D) 「対応サポート」 *(Hỗ trợ xử lý)*
Header có badge 「推奨対応」 *(cách xử lý được đề xuất)*. Hiển thị cho người đang chọn. Docs: 「確認ポイントと更新時刻を見て、本人への声かけや現地確認に繋げます。」 *(Dựa vào điểm cần kiểm tra và thời gian cập nhật để gọi hỏi người đó hoặc cử người tới tận nơi.)* Gồm 5 phần:

**① Thông tin người:**
- Tag 「優先して確認」 + tên.
- Khung vị trí 「エリア 1・屋外作業場 / GPS 更新 20 秒前・推定精度 半径 15m」 *(khu vực 1 · ngoài trời / GPS cập nhật 20 giây trước · sai số 15m)*.

**② Tóm tắt tình huống:**
- Tiêu đề 「まず、本人の体調を確認」 *(Trước hết, kiểm tra thể trạng của người đó)*.
- Nội dung 「暑熱リスク指標の上昇を検知。GPS では屋外作業場に位置しています。症状はまだ確認されていません。」 *(Phát hiện chỉ số rủi ro nắng nóng tăng. Theo GPS, người này đang ở khu ngoài trời. Chưa xác nhận triệu chứng.)*

**③ Các bước xử lý gợi ý:**

| Bước | Tiêu đề JP | Nghĩa tiêu đề | Chi tiết (nghĩa) |
|---|---|---|---|
| 1 | 本人へ連絡し、現地確認を手配 | Liên lạc với người đó, cử người tới kiểm tra | 「めまい・頭痛・吐き気などの有無と、呼びかけへの反応を確認。」 *(Hỏi có chóng mặt, đau đầu, buồn nôn không; kiểm tra phản ứng khi được gọi)* |
| 2 | 症状があれば作業を中断 | Nếu có triệu chứng thì dừng công việc | 「涼しい場所へ移動させ、身体を冷やす。現場担当者が付き添う。」 *(Đưa tới chỗ mát, làm mát cơ thể; người phụ trách hiện trường đi kèm)* |
| 3 | 状態を見ながら次の対応へ | Theo dõi tình trạng rồi xử lý tiếp | 「自力で飲める場合に水分を補給。改善しない場合は医療機関へ。」 *(Nếu tự uống được thì cho uống nước; không cải thiện thì đưa tới cơ sở y tế)* |

- Hộp cảnh báo đỏ: 「反応がおかしい・自力で飲めない場合は 119 番。水分を無理に飲ませない。」 *(Nếu phản ứng bất thường hoặc không tự uống được thì gọi 119 (cấp cứu). Không ép uống nước.)*

**④ Người có thể hỗ trợ:** 「確認を依頼する候補」 *(ứng viên được nhờ đi kiểm tra)*.
- Ví dụ: 「山田 太郎・同じエリア 1」 *(Yamada Taro · cùng khu vực 1)*.
- Kèm 「状態は安定表示。対応できるかを管理者が確認。」 *(Người này đang ổn định. Quản lý tự xác nhận xem người đó có hỗ trợ được không.)*
- Quy tắc gợi ý: người ở cùng khu vực và đang ổn định.

**⑤ Ghi nhận xử lý:**
- Nút chọn trạng thái: 「未対応」 *(chưa xử lý)* | 「対応中」 *(đang xử lý)* | 「確認済」 *(đã xác nhận)*.
- 「対応記録をリセット」 *(xóa ghi nhận xử lý)* và 「連絡内容を確認」 *(xem nội dung liên lạc)*.
- Thông báo sau khi lưu: 「確認を記録しました。リスクの再評価は継続します。」 *(Đã ghi nhận việc kiểm tra. Hệ thống vẫn tiếp tục đánh giá lại rủi ro.)*
- Chú thích 1: 「対応例は推定指標とエリア情報に基づく提案です。現場の手順・本人の状態を優先。」 *(Cách xử lý chỉ là gợi ý dựa trên chỉ số ước tính và thông tin khu vực. Ưu tiên quy trình tại hiện trường và tình trạng thực tế của người đó.)*
- Chú thích 2: 「対応例の参考：環境省 熱中症予防情報」 *(Tham khảo: thông tin phòng chống say nắng của Bộ Môi trường Nhật Bản)*.

- Nội dung các bước phụ thuộc **loại rủi ro**. Mockup chỉ có loại 暑熱 *(nắng nóng / say nắng)*. ❓ Danh sách đầy đủ các loại rủi ro, và frontend tự giữ template hay backend trả về sẵn?
- ❓ Nút 「連絡内容を確認」 mở ra gì (modal liên hệ? lịch sử?).
- ❓ Có cần lưu người thực hiện và thời gian (audit log) không?

### F8. (C) Chi tiết thành viên
Docs: 「総合値・時間の変化・3 つのカテゴリ。」 *(Giá trị tổng · diễn biến theo thời gian · 3 nhóm chỉ số)*.

- **Header:** tag mức ưu tiên, tên, khu vực, 「接続中・100%」 *(đang kết nối · pin 100%)*.
- **Vòng tròn điểm tổng:** 45 / 100 + 「総合コンディション」 *(tình trạng tổng thể)* + lý do 「暑熱リスク指標が上昇」 *(chỉ số rủi ro nắng nóng tăng)*, chữ đỏ.
- **「コンディション内訳」 *(chi tiết các thành phần tình trạng)*:**
  - Biểu đồ đường 「24 時間の変化」 *(diễn biến 24 giờ)*, trục hoành 「昨日 14:20」 *(14:20 hôm qua)* → 2:20 → 14:20, kèm 「14:20 時点」 *(tính đến 14:20)*.
  - 3 điểm thành phần, mỗi điểm có thanh tiến độ màu riêng:
    - 「からだの状態」 *(trạng thái cơ thể)* 51/100.
    - 「こころの状態」 *(trạng thái tinh thần)* 47/100.
    - 「環境リスク」 *(rủi ro môi trường)* 72/100.
  - Link 「▸ からだ・こころ・環境を見る」 *(xem Cơ thể · Tinh thần · Môi trường)* mở F9.
- **Chỉ số tức thời:**
  - ❤ 「脈拍」 *(mạch)* 79 bpm.
  - 「呼吸」 *(nhịp thở)* 21 rpm.
  - 「姿勢」 *(tư thế)*: design ghi 「座る」 *(ngồi)*, nhưng **đã chốt hiển thị theo mã packet** (§8.1).
  - Link 「▸ 脈拍・呼吸を見る」 *(xem Mạch · Hô hấp)* mở F10.

> 環境リスク *(rủi ro môi trường)* là điểm **rủi ro**, nên cao là xấu, ngược với hai điểm còn lại. ❓ Cần xác nhận hướng thang điểm của từng chỉ số.

### F9. Drill-down ① 「からだ・こころ・環境」 *(Cơ thể · Tinh thần · Môi trường)*
Mở bằng 「タップ後の詳細を表示」 *(bấm vào để hiện chi tiết)*. Đóng bằng 「からだ・こころ・環境を閉じる」 *(đóng phần này)*.

| Nhóm (JP → nghĩa) | Chỉ số JP | Nghĩa | Mô tả phụ JP → nghĩa | Mẫu |
|---|---|---|---|---|
| ■からだの状態 → Cơ thể | 活動量 | Mức vận động | 動き・体動の量 → lượng cử động cơ thể | 44 |
| | 疲労度 | Mức mệt mỏi | 活動・からだの変化から評価 → đánh giá từ hoạt động và thay đổi cơ thể | 72 🔴 |
| ■こころの状態 → Tinh thần | 集中度 | Mức tập trung | 注意・集中のようす → tình trạng chú ý, tập trung | 54 |
| | 眠気度 | Mức buồn ngủ | 眠気・ぼんやりする傾向 → xu hướng buồn ngủ, lơ mơ | 46 🔴 |
| | こころの余裕度 | Độ thư thái tinh thần | 落ち着き・いらだちの傾向 → xu hướng bình tĩnh hay bực bội | 45 |
| | 快適度 | Mức dễ chịu | 気持ちと環境を合わせた指標 → chỉ số kết hợp cảm xúc và môi trường | 55 |
| | リラックス度 | Mức thư giãn | 落ち着き・休まりの傾向 → xu hướng bình tĩnh, được nghỉ ngơi | 50 |
| | ストレス度 | Mức căng thẳng | 緊張・負荷の傾向 → xu hướng căng thẳng, quá tải | 58 🔴 |
| ■環境リスク → Rủi ro môi trường | 熱中危険度 | Nguy cơ say nắng | WBGT 等からみる暑さへの注意 → cảnh báo nóng dựa trên chỉ số WBGT | 18 🔴 |
| | 不快度 | Mức khó chịu | 温湿度などと状態を合わせて表示 → kết hợp nhiệt độ, độ ẩm với tình trạng người | 13 🔴 |

- Mỗi dòng có số bên phải và một thanh ngắn màu xanh dương (bình thường) hoặc đỏ (cảnh báo).
- ❓ Ngưỡng để chuyển màu đỏ cho từng chỉ số.

### F10. Drill-down ② 「脈拍・呼吸」 *(Mạch · Hô hấp)*
Đóng bằng 「脈拍・呼吸を閉じる」 *(đóng phần Mạch · Hô hấp)*.

| Khối | 脈拍 *(mạch)* | 呼吸 *(hô hấp)* |
|---|---|---|
| Giá trị hiện tại | 79 bpm | 21 rpm |
| Nhận xét | 「脈拍は安定してます。」 *(mạch ổn định)* | 「呼吸が乱れてます。」 *(nhịp thở đang rối loạn)*, chữ đỏ |
| Sóng realtime | Trục 0–6 秒 *(giây)*, màu đỏ | Trục 0–18 秒, màu xanh |
| 日次 *(theo ngày)* | Đường, trục 6時 → 18 時 → 翌 6 時 *(6h → 18h → 6h hôm sau)*, Y 50–110 bpm | Đường, Y 0–60 rpm |
| 週次 *(theo tuần)* | Cột, 日 月 火 水 木 金 土 *(CN → T7)*, Y 50–110 bpm | Cột, Y 0–60 rpm |

❓ Tần suất cập nhật sóng realtime và nguồn dữ liệu (stream từ backend?). ❓ Cột 週次 là min–max hay trung bình?

### F11. Thu gọn panel 「たためる」 *(thu gọn được)* / 「たたんだイメージ」 *(hình minh họa khi thu gọn)*
- Các panel 「メンバーの位置」, 「エリア別の人数」, 「メンバー」, 「対応サポート」, 「コンディション内訳」 đều thu gọn được, chỉ giữ thanh tiêu đề (có ▾/▸).
- Khi tất cả thu gọn, banner F5 và phần tóm tắt F8 vẫn hiển thị (theo hình 「たたんだイメージ」).
- Nên nhớ trạng thái thu gọn cho từng người dùng (localStorage).

---

## 4b. Tính năng bổ sung giai đoạn 1 (không có trong design, đã chốt 2026-10-09)

> Design gốc không vẽ 2 màn này. Toàn bộ nội dung dưới đây là **đề xuất ⚠️ chờ user xác nhận**. Label JP là đề xuất mới, cần khách hàng duyệt.

### F12. Đăng nhập 「ログイン」 *(Login)*

- **Cơ chế:** Firebase Authentication, đăng nhập bằng email + mật khẩu. Giai đoạn mock dùng 1–2 tài khoản giả, không gọi Firebase thật.
- **Màn hình:**
  - Logo VITAL BELT.
  - Ô 「メールアドレス」 *(email)* và 「パスワード」 *(mật khẩu)*.
  - Nút 「ログイン」 *(đăng nhập)*.
  - Link 「パスワードをお忘れの方」 *(quên mật khẩu)*, gửi email reset qua Firebase.
- **Lỗi:** 「メールアドレスまたはパスワードが正しくありません」 *(email hoặc mật khẩu không đúng)*. Dùng chung một câu cho cả hai trường hợp để không lộ email nào có tồn tại.
- **Sau khi đăng nhập:** vào thẳng dashboard (F0 đã bỏ). Chưa đăng nhập mà mở bất kỳ URL nào thì bị đẩy về trang login.
- **Đăng xuất:** menu tài khoản trên header F1 → 「ログアウト」 *(đăng xuất)*.
- **Vai trò (đã chốt 2026-10-09): chỉ 1 vai trò `admin`** 「管理者」 *(quản trị)*, có toàn quyền: xem dashboard, ghi nhận xử lý (F7), sửa ngưỡng (F13).

- Giai đoạn 1 **không** có màn đăng ký hay quản lý user. Tài khoản tạo tay trong Firebase Console.
- ⚠️ Phân quyền phải chặn ở **Firestore Security Rules**, không chỉ ẩn nút trên UI.

### F13. Cấu hình ngưỡng cảnh báo 「アラート閾値設定」 *(Cài đặt ngưỡng cảnh báo)*

**Mục đích:** quyết định khi nào một người bị xếp vào 優先確認 *(ưu tiên kiểm tra)* hay 要確認 *(cần kiểm tra)*. Vì vậy F13 đồng thời trả lời Q5 và Q6.

**Phạm vi áp dụng:** theo từng dự án (Operation). Mọi thành viên trong dự án dùng chung một bộ ngưỡng.

**Quy tắc phân loại (đề xuất):**
1. Nếu **bất kỳ** chỉ số nào vượt ngưỡng 「優先確認」 → `priority`.
2. Nếu không, mà có chỉ số vượt ngưỡng 「要確認」 → `caution`.
3. Còn lại → `normal`.
4. Lý do hiển thị (F5, F8) là chỉ số vượt ngưỡng nặng nhất. Ví dụ 熱中危険度 vượt ngưỡng → 「暑熱リスク指標が上昇」 *(chỉ số rủi ro nắng nóng tăng)*.

> Điều này **thay** ghi chú ở §3.1 rằng "backend trả category sẵn". Giai đoạn mock, frontend tự phân loại bằng một hàm thuần đọc bộ ngưỡng. Khi lên Firebase, hàm này chuyển sang Cloud Functions; logic giữ nguyên.

**Danh sách ngưỡng (đã chốt 2026-10-09: dùng các giá trị dưới đây làm mặc định tạm; ⚠️ chưa có căn cứ y tế, thay khi khách hàng cung cấp):**

| Nhóm | Chỉ số | Hướng nguy hiểm | 要確認 *(cần kiểm tra)* | 優先確認 *(ưu tiên)* |
|---|---|---|---|---|
| Tổng | 総合コンディション *(điểm tổng)* | Thấp là xấu | ≤ 70 | ≤ 50 |
| Sinh hiệu | 脈拍 *(mạch, bpm)* | Cao **hoặc** thấp | > 100 hoặc < 50 | > 120 hoặc < 40 |
| | 呼吸 *(nhịp thở, rpm)* | Cao **hoặc** thấp | > 24 hoặc < 10 | > 30 hoặc < 8 |
| Cơ thể | 疲労度 *(mệt mỏi)* | Cao là xấu | ≥ 70 | ≥ 85 |
| Tinh thần | 眠気度 *(buồn ngủ)* | Cao là xấu | ≥ 70 | ≥ 85 |
| | ストレス度 *(căng thẳng)* | Cao là xấu | ≥ 70 | ≥ 85 |
| Môi trường | 環境リスク *(rủi ro môi trường)* | Cao là xấu | ≥ 60 | ≥ 80 |
| | 熱中危険度 *(nguy cơ say nắng)* | Cao là xấu | ≥ 60 | ≥ 80 |
| Vị trí | GPS cũ 「位置が古い」 *(vị trí cũ)* | Lâu là xấu | > 3 phút → hiện nhãn thời gian | > 10 phút → 「現在地不明」 *(không rõ vị trí)* |
| Kết nối | Mất dữ liệu cảm biến | Lâu là xấu | > 60 giây → 要確認 | > 5 phút → 優先確認 |

- ❓ Các chỉ số khác (集中度, こころの余裕度…) có cần ngưỡng không? Đề xuất: không, chỉ dùng để hiển thị.
- ✅ **Thời gian duy trì (đã chốt):** chỉ đổi mức khi vượt ngưỡng liên tục **60 giây** (cấu hình được), để tránh trạng thái nhảy qua lại.
- **Màu đỏ ở F9** dùng chính ngưỡng 要確認 của chỉ số đó. Chỉ số không có ngưỡng thì luôn màu xanh.

**Màn hình:**
- Vào từ menu header → 「設定」 *(cài đặt)* → 「アラート閾値」 *(ngưỡng cảnh báo)*.
- Bảng giống bảng trên. Mỗi ô là ô nhập số kèm đơn vị. Có thanh trượt minh họa vùng xanh / cam / đỏ.
- Nút 「保存」 *(lưu)*, 「キャンセル」 *(hủy)*, 「初期値に戻す」 *(khôi phục mặc định)*.
- Hiển thị 「最終更新：{日時}・{ユーザー名}」 *(cập nhật lần cuối: thời gian · người sửa)*.

**Validate:**
- Ngưỡng 優先確認 phải **nghiêm ngặt hơn** ngưỡng 要確認 theo hướng nguy hiểm. Ví dụ mạch: ngưỡng ưu tiên cao phải lớn hơn ngưỡng cần kiểm tra cao.
- Giá trị nằm trong khoảng hợp lệ: điểm 0–100, mạch 20–250, thở 0–60, phút/giây > 0.
- Lỗi hiện ngay dưới ô. Nút 保存 bị khóa khi còn lỗi.

**Sau khi lưu:**
- Dashboard **phân loại lại ngay** với ngưỡng mới. KPI, bản đồ và danh sách cập nhật không cần tải lại trang.
- Toast 「閾値を保存しました」 *(đã lưu ngưỡng)*.
- Ghi log thay đổi (ai, lúc nào, giá trị cũ → mới) vào collection riêng để truy vết.

---

## 5. Data model (đề xuất, ❓ chờ API thật)

| Entity | Trường chính |
|---|---|
| `Organization` | id, name *(tên công ty, vd 株式会社 D.O.N)*, department *(bộ phận, vd 製造 3 部)* |
| `Operation` *(業務 · dự án/nghiệp vụ)* | id, name, centerLatLng, weather {tempC, humidityPct, condition} |
| `Area` *(エリア · khu vực)* | id, code (エリア 1), name (屋外作業場), geometry (polygon) |
| `Member` *(メンバー · thành viên)* | id, no (01), name, deviceId |
| `Device` *(thiết bị đai)* | id, connected (bool), batteryPct |
| `MemberStatus` (snapshot) | memberId, category (`priority`/`caution`/`normal`), overallScore, reason, detectedAt, posture (`standing`/`sitting`), pulseBpm, respRpm, bodyScore, mindScore, envRiskScore, metrics *(10 chỉ số ở F9)*, pulseComment, respComment |
| `MemberLocation` | memberId, lat, lng, accuracyM, updatedAt, areaId \| null, lastKnownAreaId, state (`fresh`/`stale`/`unknown`) |
| `TimeSeries` | memberId, type (overall/pulse/resp), range (realtime/24h/daily/weekly), points[] |
| `ResponseRecord` *(ghi nhận xử lý)* | memberId, status (`未対応`/`対応中`/`確認済`), updatedBy, updatedAt |
| `Recommendation` *(gợi ý xử lý)* | riskType (暑熱 *(nắng nóng)*…), summary, steps[], warning, helperCandidates[] |
| `User` *(F12)* | uid, email, displayName, role (`admin`), operationIds[] |
| `ThresholdConfig` *(F13)* | operationId, rules[] {metricKey, direction (`high`/`low`/`both`), caution {low?, high?}, priority {low?, high?}}, sustainSec, locationStaleMin, locationUnknownMin, signalLostCautionSec, signalLostPrioritySec, updatedBy, updatedAt |
| `ThresholdAuditLog` *(F13)* | operationId, changedBy, changedAt, before, after |

Key cho 10 chỉ số F9 (đề xuất):

| Key | JP | Nghĩa |
|---|---|---|
| `activity` | 活動量 | Mức vận động |
| `fatigue` | 疲労度 | Mệt mỏi |
| `focus` | 集中度 | Tập trung |
| `drowsiness` | 眠気度 | Buồn ngủ |
| `composure` | こころの余裕度 | Thư thái tinh thần |
| `comfort` | 快適度 | Dễ chịu |
| `relaxation` | リラックス度 | Thư giãn |
| `stress` | ストレス度 | Căng thẳng |
| `heatRisk` | 熱中危険度 | Nguy cơ say nắng |
| `discomfort` | 不快度 | Khó chịu |

**Realtime:** mockup ghi 「最終更新 20 秒前」 *(cập nhật lần cuối 20 giây trước)* và 「GPS 更新 20 秒前」. ❓ Dùng WebSocket/SSE hay polling? Nếu polling thì đề xuất 10–20 giây.

---

## 6. Ngoài docs nhưng có thể cần

1. ✅ **Giai đoạn 1** → F12. Đăng nhập và phân quyền.
2. ⏳ Giai đoạn sau: màn quản lý dữ liệu gốc (thành viên, thiết bị, khu vực, dự án). Giai đoạn 1 dùng mock.
3. ✅ **Giai đoạn 1** → F13. Cấu hình ngưỡng cảnh báo.
4. Thông báo khi có người chuyển sang `priority` (âm thanh, browser notification, email).
5. Lịch sử sự cố, nhật ký xử lý, xuất CSV.
6. Chọn hoặc chuyển giữa nhiều dự án/công trường.

---

## 7. Câu hỏi mở (tổng hợp)

| # | Câu hỏi | Ảnh hưởng |
|---|---|---|
| Q1 | ✅ **Đã chốt (2026-10-09):** giai đoạn 1 dùng mock data, DB dự kiến dùng **Firebase**. Lớp dữ liệu phải tách riêng để sau này thay mock bằng Firebase mà không sửa UI. | Toàn bộ |
| Q2 | ✅ **Đã chốt (2026-10-09):** giai đoạn 1 = dashboard F0–F11 + **F12 đăng nhập** + **F13 cấu hình ngưỡng cảnh báo**. Các mục khác của §6 để sau. | Phạm vi |
| Q3 | ✅ **Đã chốt (2026-10-09):** React + Vite + TypeScript + Apache ECharts + Leaflet/OSM + Tailwind/shadcn + Firebase (Auth, Firestore), deploy Firebase Hosting. UX bám đúng thiết kế. | Toàn bộ |
| Q4 | Chốt label 要確認 *(cần kiểm tra)* / 要注意 *(cần chú ý)* và 通常 *(bình thường)* / 安定 *(ổn định)* | F2, F3, F4, F6 |
| Q5 | Quy tắc phân loại → đã có đề xuất ở F13. ❓ Giá trị ngưỡng mặc định thật do ai cung cấp? | F2, F9, F13 |
| Q6 | Ngưỡng vị trí cũ / không rõ → đã thành cấu hình ở F13, mặc định 3 / 10 phút (placeholder) | F3, F4, F13 |
| Q7 | Danh sách loại rủi ro và nội dung gợi ý xử lý (FE giữ template hay BE trả về) | F7 |
| Q8 | Có cần audit log cho ghi nhận xử lý không? | F7 |
| Q9 | Cơ chế realtime và tần suất cập nhật | Toàn bộ |
| Q10 | Thời lượng animation khởi động, chạy mỗi lần hay chỉ lần đầu | F0 |

---

## 8. Đối chiếu với `vital-belt-firestore-web-spec-20261009.md` (packet 2240 byte)

> Mục này cho biết mỗi thông tin trên design lấy từ field nào của packet. ✅ có sẵn · 🟡 suy ra được · ❌ packet không có.

| Thông tin trên UI | Field packet (`vital.*`) | Trạng thái | Ghi chú |
|---|---|---|---|
| 総合コンディション *(điểm tổng)* | `overall` 0–100 | ✅ | 255 → hiển thị `—` |
| 脈拍 *(mạch)* | `heartBeat` | ✅ | 0 → `—` |
| 呼吸 *(nhịp thở)* | `breath` | ✅ | 0 → `—` |
| 疲労度 / 集中度 / 眠気度 / ストレス度 / リラックス度 | `fatigue` / `concentration` / `drowsiness` / `stress` / `relaxation` | ✅ | 255 → `—` |
| 活動量 *(mức vận động)* | `stepCounter`, `bodyMoveIndex`, `bodyMoveArea`, `stepLevel` | 🟡 | Không có điểm 0–100. ❓ Hiển thị cái nào |
| こころの余裕度 *(thư thái)*, 快適度 *(dễ chịu)* | — | ❌ | |
| 熱中危険度 *(nguy cơ say nắng)* | `heatStress` 1–5, `wbgt`, `wbgtLevel` 1–5 | 🟡 | Design là thang 0–100, packet là thang 1–5 |
| 不快度 *(khó chịu)* | `temperature`, `humidity` | 🟡 | Tính được bằng công thức chỉ số khó chịu (THI) chuẩn. ❓ Có được phép không |
| からだ / こころ / 環境リスク (3 điểm nhóm) | — | ❌ | |
| 姿勢 *(tư thế)* | `posture` 0–6, 255 | ✅ | **Đã chốt: làm theo packet** (§8.1). Packet không có mã "ngồi" |
| Nhận xét mạch / thở 「安定してます」 | `heartRateLevel`, `respirationLevel` 1–5 | 🟡 | Map level → câu nhận xét |
| Sóng realtime mạch / thở | `dopplerHeart`, `dopplerBreath` 125 mẫu/giây | ✅ | Là sóng radar Doppler, không phải ECG; hình dạng có thể khác mockup |
| Đường 24 giờ, 日次 *(theo ngày)*, 週次 *(theo tuần)* | — | ❌ | Spec §7.4 nói rõ dataset demo không chứa lịch sử nhiều ngày/tuần |
| Vị trí GPS | `latitude`, `longitude`, `latitudeNS`, `longitudeEW` | ⚠️ | ❓ Định dạng độ thập phân hay NMEA `ddmm.mmmm` |
| Sai số GPS 「半径 15m」 | — | ❌ | |
| Pin thiết bị 「100%」 | — | ❌ | |
| Trạng thái kết nối | Suy ra từ thời gian của packet cuối | 🟡 | |
| Không đeo thiết bị | `status` = 1 (không có người) | ✅ | Design chưa có trạng thái này |
| 気温 / 湿度 *(nhiệt độ / độ ẩm)* ở header | `temperature`, `humidity` (theo thiết bị) | 🟡 | Header là thời tiết công trường, packet là theo từng người. 天気 *(thời tiết)* ❌ |
| Tên, mã thành viên, khu vực | — | ❌ | Ngoài packet. Dùng mock |
| Cảnh báo từ thiết bị | `alarm` | — | DOCX ghi chưa triển khai, luôn = 0 → phân loại dựa vào F13 |

### 8.1 Bảng mã tư thế (đã chốt 2026-10-09: làm theo packet)

Label JP là đề xuất, cần khách hàng duyệt.

| `posture` | Label JP (đề xuất) | Nghĩa | Ghi chú |
|---|---|---|---|
| 0 | 未判定 | Chưa xác định | |
| 1 | 立位 | Đứng | |
| 2 | 仰向け | Nằm ngửa | ⚠️ Ở công trường có thể là dấu hiệu ngã |
| 3 | うつ伏せ | Nằm sấp | ⚠️ Như trên |
| 4 | 左向き | Nghiêng trái | |
| 5 | 右向き | Nghiêng phải | |
| 6 | 逆さま | Đảo ngược | |
| 255 | — | Không xác định được | Hiển thị `—` |

### 8.2 Quyết định về file Firestore spec (2026-10-09)

| Mã | Vấn đề | Quyết định |
|---|---|---|
| H1 | Chi phí tải toàn bộ packet mỗi lần mở trang | Đang làm demo, **không xử lý** |
| H2 | Tọa độ là độ thập phân hay NMEA `ddmm.mmmm`, cách đổi dấu theo `S`/`W` | **Xác minh khi có dữ liệu thật.** Code đổi tọa độ phải nằm ở một hàm duy nhất để dễ sửa |
| H3 | Tư thế không có mã "ngồi" | **Làm theo packet** (§8.1) |
| H4 | Security rules | **Không cần quan tâm.** Web **chỉ đọc** dữ liệu từ Firebase |


## Phụ lục: Bảng thuật ngữ JP → VN

| JP | Đọc | Nghĩa |
|---|---|---|
| 管理者 | kanrisha | Người quản lý |
| メンバー | menbā | Thành viên (công nhân) |
| 計測中 | keisoku-chū | Đang đo |
| 優先確認 | yūsen kakunin | Ưu tiên kiểm tra |
| 要確認 / 要注意 | yō kakunin / yō chūi | Cần kiểm tra / Cần chú ý |
| 通常 / 安定 | tsūjō / antei | Bình thường / Ổn định |
| エリア | eria | Khu vực |
| 位置 / 所在地 / 現在地 | ichi / shozaichi / genzaichi | Vị trí / Nơi đang ở / Vị trí hiện tại |
| 最終位置 / 最終確認 | saishū ichi / saishū kakunin | Vị trí cuối / Lần xác nhận cuối |
| 更新 | kōshin | Cập nhật |
| 精度 | seido | Độ chính xác |
| 検出 / 検知 | kenshutsu / kenchi | Phát hiện |
| 対応 | taiō | Xử lý, ứng phó |
| 推奨対応 | suishō taiō | Cách xử lý được đề xuất |
| 総合コンディション | sōgō kondishon | Tình trạng tổng thể |
| 内訳 | uchiwake | Chi tiết thành phần |
| からだ / こころ / 環境 | karada / kokoro / kankyō | Cơ thể / Tinh thần / Môi trường |
| 脈拍 / 呼吸 / 姿勢 | myakuhaku / kokyū / shisei | Mạch / Hô hấp / Tư thế |
| 立位 / 座位 / 座る | ritsui / zai / suwaru | Đứng / Ngồi / Ngồi |
| 暑熱 / 熱中症 | shonetsu / necchūshō | Nắng nóng / Say nắng |
| 日次 / 週次 | nichiji / shūji | Theo ngày / Theo tuần |
| 秒前 / 分前 | byō-mae / fun-mae | … giây trước / … phút trước |
| 名 | mei | (đơn vị) người |
| たためる / 閉じる / 見る / 拡大 | tatameru / tojiru / miru / kakudai | Thu gọn / Đóng / Xem / Phóng to |

### 8.3 Giai đoạn UI (2026-10-12)

- Toàn bộ dữ liệu là dummy trên FE. Kết nối Firestore làm sau khi DB sẵn sàng; điểm thay là `DashboardSource` (`src/data/source.ts`).
- Biểu đồ đã vẽ bằng Apache ECharts với **dữ liệu giả** (`src/data/mockSeries.ts`), màu theo design: mạch đỏ, hô hấp xanh. Khi tích hợp: sóng lấy từ `dopplerHeart` / `dopplerBreath`, lịch sử lấy từ dữ liệu tổng hợp.
- F7 ghi nhận xử lý và F13 ngưỡng cảnh báo lưu trên trình duyệt (localStorage) vì web chỉ đọc Firebase.

### 8.4 Tích hợp Firestore phase 1 (2026-10-12)

Thay cho §8.3: dữ liệu cảm biến đã lấy từ Firestore; điểm thay `DashboardSource` cũ đã bỏ.

| Chủ đề | Quyết định |
|---|---|
| Đăng nhập (F12) | Firebase Authentication Email/Password. UID phải nằm trong `channelAccess/5005.readerUids`; thiếu quyền → 「閲覧権限なし」 *(không có quyền xem)* |
| Nguồn dữ liệu | Chỉ nghe `liveChannels/5005`. Collection `members` chưa tồn tại trên Firestore (kiểm tra Console 2026-10-12) |
| 10 người trên màn hình | TANAKA (03, 物流エリア *(khu kho vận)*) = dữ liệu kênh thật, giá trị "chưa đo được" hiện `—`. 9 người còn lại giữ tên/khu vực mock, gắn nhãn 「デモ」 *(demo)*: giá trị kênh hợp lệ → cộng độ lệch; giá trị kênh "chưa đo được" (0 / 255 / null) → dùng số mock của người đó theo mockup |
| Kịch bản phân loại | Người 01 → 優先確認 *(ưu tiên)*, 02/04/08 → 要確認 *(cần xác nhận)* nhờ rủi ro nhiệt tối thiểu và độ lệch; các người khác theo dữ liệu thật |
| Vị trí | GPS UDP nếu đủ (số hữu hạn, N/S + E/W, trong miền, khác 0,0 — giả định độ thập phân); không thì object `location` cùng hàng `meta` (`source`, `latitude`, `longitude`, `sampledAtEpochMs`) — theo ghi chú mobile dev, ngoài spec Firestore. Người demo rải quanh vị trí thật theo bố cục mockup; bản đồ canh vừa đủ các pin |
| Bán kính sai số, pin | Không có trong dữ liệu → bỏ 「精度半径」, vòng nét đứt bán kính cố định 30 m; bỏ % pin |
| Điểm nhóm (F8/F9) | `displayScores` hiển thị trực tiếp; null → `—` |
| 熱中危険度 *(rủi ro say nắng)* | `packet.vital.heatStress` thang 1–5; ngưỡng mặc định 要確認 ≥4, 優先確認 =5 (ngưỡng đã lưu theo thang cũ được reset) |
| Sóng mạch/thở (F10) | Doppler thật, đệm 18 giây; packet bị bỏ qua → ngắt nét |
| Mất dữ liệu | Quá 5 giây không có `sequence` mới → 「更新停止」 *(ngừng cập nhật)*; ngưỡng mất tín hiệu F13 (60/300 giây) giữ nguyên. `vital.epochSeconds` không dùng (lệch ~41 giờ so với `publishedAt`) |
| Vẫn là dữ liệu giả | Khu vực, tên công việc, thời tiết 天気 *(trạng thái trời)*, biểu đồ 24 giờ / 日次 / 週次 |

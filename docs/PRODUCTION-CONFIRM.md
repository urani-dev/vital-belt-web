# VITAL BELT Web Admin — Các vấn đề cần xác nhận với khách hàng trước khi triển khai production

> Ngày lập: 2026-10-12. Phạm vi: web admin (管理者ビュー · màn hình quản lý).
> Hiện tại web đang ở giai đoạn **demo**: dữ liệu giả trên FE, chưa kết nối Firebase.
> Điều kiện giá / gói dịch vụ của bên thứ ba cần kiểm tra lại trên trang chính thức tại thời điểm ký.
> Mỗi mục gồm: vấn đề → ảnh hưởng → đề xuất → **câu hỏi cần KH trả lời**.
> Mức độ: 🔴 bắt buộc xử lý trước production · 🟡 nên xử lý · 🟢 chỉ cần KH biết.

## Tóm tắt nhanh

| # | Chủ đề | Mức | Cần KH quyết định |
|---|---|---|---|
| 1 | Máy chủ ảnh bản đồ (không phải thư viện Leaflet) | 🔴 | Đề xuất Google Maps JavaScript API (mục 1.1); ai đứng tên / trả phí |
| 2 | Ghi nguồn OpenStreetMap trên bản đồ | 🟢 | Đồng ý giữ dòng © OpenStreetMap |
| 3 | Giấy phép thư viện | 🟢 | Đồng ý danh sách thư viện |
| 4 | Dữ liệu sức khỏe là thông tin cá nhân nhạy cảm | 🔴 | Đồng ý của người lao động, vùng lưu trữ, thời hạn lưu |
| 5 | Kiến trúc dữ liệu demo ≠ production | 🔴 | Luồng dữ liệu thiết bị thật |
| 6 | Chi phí Firestore | 🔴 | Ngân sách vận hành, cách lưu dữ liệu |
| 7 | Nhiều thiết bị / nhiều công nhân | 🔴 | Cách gắn thiết bị với công nhân |
| 8 | Ngưỡng cảnh báo chưa có căn cứ y tế | 🔴 | Ai cung cấp ngưỡng chuẩn |
| 9 | Web chỉ đọc → dữ liệu xử lý lưu trên trình duyệt | 🔴 | Cho phép web ghi vào Firebase |
| 10 | Đăng nhập & quản lý tài khoản | 🟡 | Cách cấp tài khoản, số người dùng |
| 11 | Chỉ số trên design không có trong packet | 🟡 | Bổ sung dữ liệu hay bỏ khỏi UI |
| 12 | Lịch sử cho biểu đồ ngày / tuần / 24 giờ | 🟡 | Nguồn dữ liệu lịch sử |
| 13 | Định dạng GPS | 🟡 | Xác minh với dữ liệu thiết bị thật |
| 14 | Dữ liệu thời tiết ở header | 🟡 | Nguồn dữ liệu thời tiết |
| 15 | Hosting, tên miền, trình duyệt hỗ trợ | 🟢 | Tên miền, môi trường |

---

## 1. 🔴 Máy chủ ảnh bản đồ (tile server)

- **Hiện tại:** bản đồ lấy ảnh từ máy chủ miễn phí `tile.openstreetmap.org`.
- **Lưu ý:** vấn đề **không nằm ở thư viện Leaflet** (giấy phép BSD, dùng thương mại miễn phí) và **không nằm ở dữ liệu OSM** (ODbL, dùng thương mại miễn phí, chỉ cần ghi nguồn). Vấn đề chỉ là **máy chủ phát ảnh bản đồ** miễn phí do tổ chức OSM vận hành bằng tiền quyên góp.
- **Vấn đề:** chính sách sử dụng của máy chủ này cấm tải lớn và không có cam kết hoạt động (không SLA). Máy chủ có thể chặn ứng dụng khi lượng truy cập nhiều. Với sản phẩm bán cho nhiều công ty, không nên phụ thuộc vào máy chủ này.
- **Chính sách OSM (kiểm tra 2026-10-12, operations.osmfoundation.org/policies/tiles):** **không công bố con số giới hạn** nào (không có X request/ngày). Chỉ cấm "dùng nặng gây ảnh hưởng người khác", không SLA, có thể chặn **không báo trước**, và với dịch vụ thương mại thì "quyền truy cập có thể bị rút bất cứ lúc nào". Không cấm thương mại tuyệt đối.
- **Đề xuất:** dùng nhà cung cấp có hợp đồng thương mại. Việc đổi chỉ là thay 1 URL trong code.
- **Giá tham khảo (trang giá chính thức, 2026-10-12):**
  - MapTiler: Free 5.000 lượt mở bản đồ/tháng nhưng chỉ cho thử nghiệm / phi thương mại; Flex $30/tháng gồm 25.000 lượt, vượt $2.50 / 1.000 lượt. Bán lại cho bên thứ ba chỉ được ở gói Custom.
  - Stadia Maps: Free 200.000 credit/tháng, không cho thương mại; Starter $20/tháng gồm 1.000.000 credit, vượt 3¢ / 1.000 credit.

| Phương án | Chi phí | Ghi chú |
|---|---|---|
| A. MapTiler | Có gói miễn phí giới hạn, trả phí theo lượng dùng | Có thể tùy chỉnh style (tone xám giống design) |
| B. Stadia Maps | Có gói miễn phí giới hạn, gói trả phí theo lượng dùng | Có style sáng / xám |
| C. Tự host tile server | Chi phí server + công vận hành | Chủ động hoàn toàn, tốn công nhất |

- ❓ **KH cần trả lời:** chọn phương án nào? Ai đứng tên tài khoản và trả phí? Dự kiến bao nhiêu admin, mở dashboard bao lâu mỗi ngày (để ước tính lượng dùng)?

### 1.1 Phương án ưu tiên khi lên production: Google Maps JavaScript API (cách A)

> Chốt sơ bộ 2026-10-12 (chờ KH xác nhận). Demo vẫn dùng Leaflet + OSM; chỉ đổi khi triển khai production.
> Giá / điều khoản đọc từ trang chính thức của Google ngày 2026-10-12 — kiểm tra lại khi ký.

**So sánh các lựa chọn Google**

| | A. Maps JavaScript API (**chọn**) | B. Map Tiles API + Leaflet |
|---|---|---|
| Cách dùng | Thay Leaflet bằng thư viện bản đồ Google | Giữ Leaflet, đổi nguồn ảnh |
| Miễn phí / tháng | 10.000 lượt tạo bản đồ (Dynamic Maps) | 100.000 lượt (2D Map Tiles) |
| Vượt mức | $7 / 1.000 lượt | $0.60 / 1.000 lượt |
| Tone xám như design | Chỉnh style trên Google Cloud qua Map ID — hợp lệ | Bộ lọc CSS có thể vi phạm điều khoản (chưa xác minh) |
| Logo / bản quyền | Google tự hiển thị | Phải tự hiển thị logo + dòng copyright |
| Công sửa | ~1–2 ngày | ~0,5–1 ngày |

**Lý do chọn A:** điều khoản rõ ràng (cách dùng chuẩn của Google), tone xám làm hợp lệ, ghi nguồn tự động. Ở quy mô ước tính ~3.300 lượt mở/tháng vẫn nằm trong mức miễn phí.

**Việc cần làm khi chuyển (ước tính 1–2 ngày)**

| # | Việc | Ghi chú |
|---|---|---|
| 1 | Tạo project Google Cloud, bật **Maps JavaScript API**, tạo tài khoản thanh toán (bắt buộc kể cả khi trong mức miễn phí) | Ai đứng tên / trả phí: hỏi KH |
| 2 | Tạo **API key**, giới hạn theo tên miền web (HTTP referrer) | Key nằm trên trình duyệt là bình thường; giới hạn để chống dùng ké |
| 3 | Tạo **Map ID** + style xám (Cloud-based map styling) | Map ID cũng cần cho pin tùy biến |
| 4 | Nạp thư viện bằng `@googlemaps/js-api-loader` (Apache-2.0); gỡ `leaflet` | Thêm vào danh sách giấy phép ở mục 3 |
| 5 | Viết lại `LeafletMap` trong `src/components/MemberMap.tsx` | Chỉ file này; phần còn lại của dashboard không đổi |
| 6 | Pin tròn đánh số, màu theo trạng thái, viền khi chọn, nhãn 「N 分前」 → dùng pin tùy biến (Advanced Marker, nội dung HTML) | Tái dùng class CSS `.vb-pin` hiện có |
| 7 | Vòng **nét đứt** cho vị trí cũ: `google.maps.Circle` **không hỗ trợ nét đứt** → vẽ bằng Polyline với ký hiệu lặp, hoặc overlay tùy biến | Phần vướng nhất |
| 8 | Bấm pin → chọn thành viên; nút 拡大 *(phóng to khung)*; thang tỷ lệ; nút zoom góc phải | |
| 9 | **Thu gọn panel chỉ ẩn bản đồ, không hủy** | Google tính phí mỗi lần tạo bản đồ; hiện tại thu gọn/mở lại sẽ tạo lại |
| 10 | Bỏ dòng © OpenStreetMap và bộ lọc xám CSS (`.leaflet-tile-pane` trong `src/index.css`) | Google tự ghi nguồn |
| 11 | Kiểm tra: PC + mobile 390px, chọn pin, phóng to, thu gọn/mở lại, không lỗi console | |

**Điều khoản cần tuân thủ:** không tự lưu / tải trước ảnh bản đồ, không dùng offline, không che logo và dòng bản quyền Google. Được phép vẽ dữ liệu của mình (pin) lên nền bản đồ.

**Nguồn:** [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing) · [Map Tiles API policies](https://developers.google.com/maps/documentation/tile/policies)

## 2. 🟢 Ghi nguồn OpenStreetMap trên bản đồ

- Dòng **「© OpenStreetMap contributors」** ở góc bản đồ là **bắt buộc** theo giấy phép dữ liệu ODbL, **không được ẩn**. Bản thiết kế của KH cũng có dòng này.
- Chữ "Leaflet" kèm lá cờ thì không bắt buộc, đã bỏ.
- Nếu dùng nhà cung cấp ở mục 1, có thể phải thêm tên nhà cung cấp vào dòng ghi nguồn.
- ❓ **KH cần xác nhận:** đồng ý giữ dòng ghi nguồn này.

## 3. 🟢 Giấy phép thư viện

Tất cả thư viện chạy trong web đều là giấy phép mở cho phép dùng thương mại miễn phí. Đã kiểm tra toàn bộ cây thư viện: không còn giấy phép hạn chế.

| Thư viện | Dùng cho | Giấy phép |
|---|---|---|
| React, React DOM | Giao diện | MIT |
| React Router | Chuyển trang | MIT |
| Zustand | Quản lý trạng thái | MIT |
| Tailwind CSS | Style | MIT |
| Leaflet | Bản đồ | BSD-2-Clause |
| Apache ECharts | Biểu đồ | Apache-2.0 |
| Firebase SDK (khi tích hợp) | Kết nối dữ liệu | Apache-2.0 |

- Đã **bỏ react-leaflet** vì dùng giấy phép Hippocratic-2.1 (kèm điều khoản đạo đức, thường không được pháp chế doanh nghiệp duyệt). Thay bằng Leaflet thuần, giao diện không đổi.
- Nghĩa vụ duy nhất: kèm thông báo giấy phép (file LICENSE / NOTICE) trong bản giao. Việc tạo file này sẽ làm ở bước chuẩn bị bản production (chưa làm).
- Font Noto Sans JP (Google Fonts): giấy phép SIL OFL, miễn phí.
- ❓ **KH cần xác nhận:** đồng ý danh sách trên. KH có danh sách giấy phép bị cấm nội bộ không?

## 4. 🔴 Dữ liệu sức khỏe là thông tin cá nhân nhạy cảm

- Web hiển thị mạch, nhịp thở, mức mệt mỏi, căng thẳng và vị trí GPS theo **tên từng người lao động**.
- Tại Nhật, thông tin sức khỏe gắn với cá nhân **có thể** thuộc loại 「要配慮個人情報」 *(thông tin cá nhân cần cân nhắc đặc biệt)* theo Luật bảo vệ thông tin cá nhân (APPI). Loại này thường yêu cầu **sự đồng ý trước** của người lao động. Việc đánh giá cụ thể cần pháp chế của KH xác nhận.
- **Đề xuất kỹ thuật:**
  - Đặt Firebase ở vùng Tokyo (`asia-northeast1`).
  - Chỉ admin đã đăng nhập mới đọc được dữ liệu, chặn bằng Firestore Security Rules.
  - Xác định thời hạn lưu dữ liệu và cơ chế xóa.
- ❓ **KH cần trả lời:**
  - Ai chịu trách nhiệm lấy sự đồng ý của người lao động?
  - Dữ liệu được lưu ở vùng nào, trong bao lâu?
  - Có cần hiển thị tên thật hay chỉ mã nhân viên?

## 5. 🔴 Kiến trúc dữ liệu demo khác production

- Spec Firestore hiện tại (`vital-belt-firestore-web-spec-20261009.md`) là cơ chế **phát lại một bộ dữ liệu ghi sẵn** (replay, lặp vòng) cho 1 thiết bị, kênh `5005`.
- Production cần dữ liệu **thời gian thực** từ nhiều thiết bị thật. Luồng dữ liệu (thiết bị → app → Firebase → web) chưa được đặc tả.
- Web đã tách lớp dữ liệu riêng: đổi nguồn không phải sửa giao diện.
- ❓ **KH cần trả lời:**
  - Ở production, dữ liệu từ đai cảm biến lên Firebase bằng đường nào (qua app điện thoại, gateway, hay khác)?
  - Tần suất cập nhật mong muốn trên web là bao nhiêu (packet gốc là 1 giây / lần)?

## 6. 🔴 Chi phí Firestore

- **Theo spec demo:** mỗi lần mở trang, web tải **toàn bộ** packet. Mỗi packet là 1 document, khoảng 6 KB.

| Độ dài dữ liệu | Lượt đọc mỗi lần mở trang | Dung lượng tải |
|---|---|---|
| 10 phút | 600 | ~3.6 MB |
| 1 giờ | 3.600 | ~21 MB |
| 24 giờ | 86.400 | ~512 MB (không khả thi) |

- Gói miễn phí Firestore cho 50.000 lượt đọc / ngày. Nhân thêm số thiết bị và số admin.
- **Chấp nhận được cho demo.** Production cần thiết kế lại: gộp nhiều packet vào một document, lưu file nhị phân trên Cloud Storage, hoặc chỉ đẩy giá trị mới nhất cho dashboard.
- ❓ **KH cần trả lời:** ngân sách vận hành Firebase hằng tháng? Gói Firebase (Spark miễn phí / Blaze trả theo dùng)?

## 7. 🔴 Nhiều thiết bị / nhiều công nhân

- Design có 10 người. Spec Firestore chỉ có 1 thiết bị (kênh `5005`), chưa có danh sách công nhân, chưa có liên kết thiết bị ↔ công nhân.
- Dữ liệu không nằm trong packet và cần nguồn khác: tên, mã nhân viên, phòng ban, dự án / công trường.
- ❓ **KH cần trả lời:**
  - Danh sách công nhân và việc gán thiết bị được quản lý ở đâu (web admin, app, hay hệ thống khác)?
  - Một công nhân có thể đổi thiết bị giữa các ngày không?

## 8. 🔴 Ngưỡng cảnh báo chưa có căn cứ y tế

- Phân loại 優先確認 *(ưu tiên kiểm tra)* / 要確認 *(cần kiểm tra)* / 通常 *(bình thường)* đang dùng **giá trị tạm do bên phát triển đặt**. Ví dụ: mạch > 100 là cần kiểm tra, > 120 là ưu tiên.
- Admin chỉnh được ngưỡng ở màn 「アラート閾値設定」 *(cài đặt ngưỡng cảnh báo)*.
- Gợi ý xử lý (bước 1–3, gọi 119) lấy theo design cho trường hợp nắng nóng. Các trường hợp khác là nội dung đề xuất của bên phát triển.
- ❓ **KH cần trả lời:**
  - Ai cung cấp giá trị ngưỡng mặc định chính thức (KH, TAOS, chuyên gia y tế)?
  - Ai duyệt nội dung gợi ý xử lý cho các loại rủi ro ngoài nắng nóng?

## 9. 🔴 Web chỉ đọc → dữ liệu xử lý chỉ lưu trên trình duyệt

- Theo quyết định hiện tại, web **chỉ đọc** Firebase. Vì vậy hai loại dữ liệu đang lưu trên trình duyệt (localStorage):
  - Ghi nhận xử lý 未対応 / 対応中 / 確認済 *(chưa xử lý / đang xử lý / đã xác nhận)*.
  - Ngưỡng cảnh báo và lịch sử thay đổi.
- **Ảnh hưởng ở production:**
  - Admin A ghi nhận thì admin B **không thấy**.
  - Xóa cache trình duyệt hoặc đổi máy là **mất dữ liệu**.
  - Không có nhật ký xử lý để truy vết khi có sự cố.
- **Đề xuất:** production cho web **ghi** vào 2–3 collection riêng (ghi nhận xử lý, ngưỡng, nhật ký), có phân quyền bằng Security Rules.
- Liên quan: spec Firestore yêu cầu ghi vào `demoClock` để đồng bộ giờ. Khi web chỉ đọc, giờ được lấy theo cách khác, sai số khoảng ±0.5 giây.
- ❓ **KH cần trả lời:** đồng ý cho web ghi dữ liệu vào Firebase ở production không? Có cần lưu nhật ký xử lý để truy vết không?

## 10. 🟡 Đăng nhập & quản lý tài khoản

- **Hiện tại:** đăng nhập giả. Production dùng Firebase Authentication (email + mật khẩu).
- Chỉ có 1 vai trò `admin`. Không có màn đăng ký / quản lý tài khoản; tài khoản tạo tay trên Firebase Console.
- ❓ **KH cần trả lời:**
  - Bao nhiêu tài khoản admin?
  - Ai tạo / xóa tài khoản?
  - Có cần đăng nhập 2 lớp (2FA) hoặc đăng nhập qua hệ thống công ty (SSO) không?
  - Có giới hạn admin chỉ xem công trường của mình không?

## 11. 🟡 Chỉ số trên design không có trong packet thiết bị

Packet 2240 byte **không có** các thông tin sau, nhưng design có hiển thị:

| Trên design | Ghi chú |
|---|---|
| 3 điểm nhóm からだ / こころ / 環境リスク *(cơ thể / tinh thần / rủi ro môi trường)* | Không có công thức |
| こころの余裕度 *(độ thư thái)*, 快適度 *(mức dễ chịu)* | Không có |
| 活動量 *(mức vận động)* thang 0–100 | Packet chỉ có số bước, chỉ số cử động |
| 熱中危険度 *(nguy cơ say nắng)* thang 0–100 | Packet chỉ có thang 1–5 |
| Pin thiết bị, sai số GPS (bán kính m) | Không có |
| Tư thế 「座位」 *(ngồi)* | Packet không có mã "ngồi"; có nằm ngửa / nằm sấp / nghiêng / đảo ngược |

- Hiện các mục này đang hiển thị dữ liệu giả.
- ❓ **KH cần trả lời:** bên TAOS sẽ bổ sung các chỉ số này vào dữ liệu, hay bỏ khỏi giao diện, hay hiển thị 「—」?

## 12. 🟡 Lịch sử cho biểu đồ

- Biểu đồ 24 giờ, 日次 *(theo ngày)*, 週次 *(theo tuần)* cần dữ liệu lịch sử. Spec Firestore ghi rõ dataset demo **không có** lịch sử nhiều ngày.
- Hiện các biểu đồ đang vẽ bằng dữ liệu giả.
- **Đề xuất:** tổng hợp sẵn theo giờ / ngày trên server (Cloud Functions), không để web tự tính từ packet từng giây.
- ❓ **KH cần trả lời:** có cần lưu lịch sử không? Lưu bao lâu (vd 7 ngày, 30 ngày)?

## 13. 🟡 Định dạng tọa độ GPS

- Packet lưu hướng N/S, E/W thành trường riêng. Đây thường là dấu hiệu định dạng NMEA (`3539.1234` = 35°39'), không phải độ thập phân (`35.652`). Nếu hiểu sai, vị trí trên bản đồ lệch rất xa.
- ❓ **KH / TAOS cần xác nhận:** định dạng chính xác của `latitude` / `longitude`. Gửi giúp 1 mẫu dữ liệu thiết bị thật có tọa độ đã biết.

## 14. 🟡 Dữ liệu thời tiết ở header

- Header hiển thị 気温 / 湿度 / 天気 *(nhiệt độ / độ ẩm / thời tiết)* của công trường. Packet chỉ có nhiệt độ và độ ẩm **đo tại thiết bị của từng người**, không có "thời tiết" (nắng / mây…).
- ❓ **KH cần trả lời:** lấy thời tiết từ đâu (API thời tiết bên ngoài, trạm đo tại công trường)? Hay dùng trung bình nhiệt độ / độ ẩm các thiết bị?

## 15. 🟢 Hosting, tên miền, trình duyệt

- Đề xuất deploy lên **Firebase Hosting** (cùng project Firebase, có SSL sẵn).
- Đã kiểm tra hiển thị trên PC và điện thoại (rộng 390px).
- ❓ **KH cần trả lời:**
  - Dùng tên miền riêng không?
  - Có cần tách môi trường thử nghiệm (staging) và chính thức không?
  - Trình duyệt bắt buộc hỗ trợ (Chrome / Edge / Safari, phiên bản)?

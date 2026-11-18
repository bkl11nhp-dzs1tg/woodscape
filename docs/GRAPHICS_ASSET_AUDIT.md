# WOODSCAPE — Audit đồ họa & asset

Ngày audit: 2026-11-16 · Sau khi hoàn thành Phase 0.

## 1. Tình trạng hiện tại

Trước Phase 0 thư mục chỉ có tài liệu và Graphics Kit, chưa có code. Sau Phase 0, game chạy
được trên trình duyệt với React + TypeScript + Three.js + React Three Fiber.

| Hạng mục | Cách làm hiện tại | Chất lượng |
|---|---|---|
| Hình khối xây dựng | Tạo bằng code (`GeometryFactory`), hộp có 6 mặt thật | Dùng lâu dài |
| Texture vật liệu | 10 ảnh PNG lấy từ Graphics Kit | **Tạm thời** — ảnh procedural, mờ, chưa phải tranh vẽ tay |
| Địa hình Coastal Valley | Hàm độ cao trong code + tô màu theo đỉnh | Blockout |
| Nước sông/biển | Một mặt phẳng trong suốt, có vân chuyển động | Blockout |
| Cây, bụi, đá | Khối 3D đơn giản, vẽ bằng instancing | Blockout |
| Núi xa, mây, bầu trời | Khối nón, ảnh mây vẽ bằng code, vòm trời gradient | Blockout |
| Icon giao diện | 18 SVG từ Graphics Kit (đang dùng 11) | Dùng được |

## 2. Thư mục asset

```text
public/assets/textures/{wood,brick,stone,glass,roofing}/   ảnh đang dùng trong game
src/assets/icons/                                          icon SVG của giao diện
WOODSCAPE_Graphics_Kit/                                    bộ gốc, giữ nguyên làm nguồn
```

Mọi texture và vật liệu được khai báo tại `src/data/materials.ts`. Thay ảnh mới chỉ cần chép đè
file cùng tên, hoặc sửa một dòng `url` — không phải sửa chỗ nào khác.

## 3. Mâu thuẫn giữa hai tài liệu

| | GDD v1.2 (mới hơn) | Master prompt đồ họa |
|---|---|---|
| Phong cách | Anime vẽ tay, không PBR | Semi-realistic, PBR |
| Cấu kiện xây dựng | Hình khối tạo bằng code, không cần Blender | Nhắc tới GLB / Blender / AI-3D |

Phase 0 làm theo **GDD v1.2**. Phần quy trình làm việc của master prompt vẫn được áp dụng.

## 4. Asset đã có / còn thiếu

**Đã có và đang dùng:** gỗ thông, sồi, óc chó, tuyết tùng, bạch dương; gạch đỏ; đá xây; bê tông;
ngói; kính màu.

**Có trong kit nhưng chưa dùng:** 4 texture địa hình (cỏ, cát, đất, sỏi), toàn bộ ảnh roughness
(vật liệu kiểu vẽ tay không dùng roughness), 7 icon.

**Còn thiếu so với GDD mục 14.2:**

1. Texture gỗ vẽ tay thật (thay 5 ảnh tạm), kèm mặt cắt đầu gỗ.
2. Gạch nhạt, vữa trắng/kem, ngói đất nung, tôn.
3. Thẻ cây/bụi 2D nền trong suốt cho cảnh xa.
4. Thư mục `04_Models/` của kit đang trống. Theo GDD v1.2 cấu kiện xây dựng không cần model;
   model chỉ cần cho vật tham chiếu (người, mèo, nội thất) ở Phase 3.

## 5. Cách tạo từng loại asset

| Loại | Công cụ | Ai làm |
|---|---|---|
| Texture vật liệu lặp lại | ChatGPT tạo ảnh theo prompt bên dưới | Bạn tạo ảnh, Claude kiểm tra và tích hợp |
| Hình khối, địa hình, nước, cây blockout | Code Three.js | Claude |
| Thẻ cây 2D | ChatGPT tạo ảnh nền trong suốt | Bạn tạo ảnh, Claude tích hợp |
| Vật tham chiếu (mèo, người, bàn ghế) | Ghép từ hình khối bằng code, hoặc model CC0 | Quyết định ở Phase 3 |

### Prompt mẫu cho ChatGPT — texture gỗ thông (dùng làm texture, không phải concept)

```text
Seamless tileable hand-painted texture of pine wood planks, anime background art style,
soft warm light-yellow tones, clear but gentle wood grain running horizontally,
subtle painted highlights and slight color variation, flat even lighting,
no shadows, no perspective, straight-on orthographic view, fills the whole frame,
no text, no watermark, no border, no knots larger than a coin, square 1024x1024.
```

Đổi cụm `pine wood planks ... light-yellow` cho từng loại: oak (medium golden brown),
walnut (dark chocolate brown), cedar (reddish brown), birch (pale cream).
Lưu file theo đúng tên đang có, ví dụ `public/assets/textures/wood/wood_pine_albedo.png`.

## 6. Lộ trình và tiêu chí nghiệm thu

| Phase | Việc đồ họa | Nghiệm thu |
|---|---|---|
| 0 ✅ | Blockout Coastal Valley, bộ texture thử trên hình khối | Chạy được, camera xoay 360°, build qua |
| 1 | Thay texture gỗ bằng tranh vẽ tay; thumbnail vật liệu | Vân gỗ không lộ đường nối khi nhìn gần |
| 3 | Texture kính, đá, gạch, giấy; vật tham chiếu mèo | Cùng palette, cùng mức chi tiết |
| 5 | Thẻ cây 2D, nước, thời tiết, đánh bóng địa hình | Giữ khung hình ổn định khi có ~500 cây |

## 7. Rủi ro

- **Texture tạm:** đang quyết định phần lớn cảm giác "chưa đẹp". Đây là hạng mục cải thiện hình ảnh rẻ nhất.
- **Ảnh AI:** dễ lộ đường nối, có bóng đổ sẵn hoặc sai tỉ lệ; phải xem trong game trước khi nhận.
- **Hiệu năng:** bản đồ bóng đổ 2048 và ~1.900 instance cây/đá chưa được đo trên máy yếu.
- **Dung lượng:** JS build hiện 1,19 MB (327 KB gzip), chưa tách chunk.
- **Bản quyền:** texture trong kit là ảnh procedural tự tạo. Asset tải ngoài phải ghi nguồn và
  giấy phép vào `src/data/materials.ts` (trường `source`).

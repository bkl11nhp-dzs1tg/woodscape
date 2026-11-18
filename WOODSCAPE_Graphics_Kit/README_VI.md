# WOODSCAPE – Graphics Kit (Concept / Prototype)

Bộ này được đóng gói từ GDD WOODSCAPE v1.1 và ảnh tham chiếu người dùng cung cấp.

## Nội dung
- `00_Concept/`: 2 ảnh concept quy trình xây nhà; ảnh chính có góc nhìn gần hơn và ngôi nhà là trọng tâm.
- `01_References/`: ảnh tham chiếu ban đầu.
- `02_Textures/`: texture 2D khởi đầu (albedo + roughness) cho gỗ, đá/gạch, mái/kính và địa hình.
- `03_UI_Icons/`: icon SVG màu vàng ấm, dùng làm điểm khởi đầu cho toolbar/editor.
- `04_Models/`: cấu trúc thư mục chờ asset 3D GLB/GLTF theo nhóm của dự án.
- `05_Documentation/`: GDD nguồn, manifest và hướng dẫn.

## Lưu ý quan trọng
Đây là **concept art + bộ texture 2D khởi đầu + icon SVG + cấu trúc thư mục**. Thư mục `04_Models/` chưa chứa mô hình 3D GLB/GLTF hoàn chỉnh. Các model cần được dựng hoặc lấy từ nguồn asset có giấy phép phù hợp, sau đó đặt đúng nhóm thư mục.

Texture là mẫu hình ảnh procedural để dựng prototype; màu sắc/thông số roughness không phải vật liệu PBR đã hiệu chuẩn và không đại diện cho thông số kỹ thuật xây dựng ngoài đời.

## Gợi ý tích hợp
- Dùng ảnh trong `00_Concept/` làm concept/reference, không dùng trực tiếp làm màn hình game.
- Dùng `*_albedo.png` làm base color; `*_roughness.png` làm roughness map trong Three.js.
- Dùng icon SVG trong `03_UI_Icons/` cho toolbar và các nút thao tác.
- Model khuyến nghị: GLB/GLTF; đơn vị scene là mét, trục up Y theo GDD.

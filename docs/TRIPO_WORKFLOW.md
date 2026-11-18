# Đưa mô hình 3D từ Tripo (hoặc Meshy…) vào WOODSCAPE

Game đã có sẵn đường nhập mô hình: bạn xuất file `.glb` từ Tripo, chạy **một lệnh**, mô hình xuất hiện trong kệ **Tạo hình → Mô hình 3D**, đặt được như mọi vật khác (di chuyển, xoay, đổi chiều cao, sơn, nhóm, lưu).

## 1. Trước khi tạo: ba điều cần biết

**Xuất file.** Trong ảnh bạn gửi, Tripo ghi *"Upgrade to unlock 3D model exports, Multi-View & more"*. Nghĩa là gói miễn phí hiện **chưa cho tải file 3D về**, và **Generate Multi-Views** (tạo từ nhiều ảnh) cũng chỉ dành cho thành viên. Nếu nút Export báo cần nâng cấp thì chưa đưa vào game được.

**Bản quyền.** Spec sản phẩm của bạn có chợ bán thiết kế. Với dịch vụ tạo 3D bằng AI, mô hình tạo bằng gói miễn phí thường có điều khoản riêng (công khai, ghi nguồn, hạn chế dùng thương mại). Tôi không chắc điều khoản hiện tại của Tripo, bạn đọc trang giấy phép của họ **trước khi bán bất cứ thứ gì có dùng mô hình đó**. Dùng thử nội bộ thì không sao.

**Nặng.** Mô hình trong ảnh có **1.010.956 đỉnh, 1,97 triệu tam giác**. Trình duyệt, nhất là điện thoại, không chịu nổi. Công cụ của tôi giảm xuống khoảng 15.000 tam giác (xem bên dưới), nhưng nên cho Tripo ra bản nhẹ ngay từ đầu.

## 2. Cách tạo cho ra kết quả dùng được

1. **Ưu tiên "Smart Mesh"** (ô bên cạnh "HD Model"): lưới gọn, ít tam giác hơn. Nếu có ô giới hạn số mặt, đặt vào khoảng 10.000–30.000. "HD Model" cho nhiều chi tiết hơn nhưng nặng; công cụ vẫn xử lý được.
2. **Dùng ảnh nhân vật của bạn.** Ảnh bạn đang đưa vào là bản vẽ chính diện trên nền hồng. Tripo làm tốt hơn nếu có ảnh thẳng, nền đơn sắc, không bóng đổ, đúng như bộ ảnh đã làm cho game. Nếu có quyền Multi-View, đưa cả ảnh trước, bên, sau.
3. **Tư thế:** người nên đứng thẳng, tay buông hơi rời thân (A-pose). Dễ gắn xương và hoạt ảnh về sau.
4. **Vật dụng, nội thất, công trình nhỏ:** ảnh một góc chếch 3/4, nền trơn.
5. Xem kỹ mô hình xoay đủ mọi hướng trước khi tải: mặt sau và đáy hay bị lỗi.
6. **Export → GLB**, bật kèm **texture**. Bỏ vào thư mục `art_inbox\models\`.

## 3. Đưa vào game (PowerShell, thư mục `D:\WoodBuildGame`)

```powershell
node tools/optimize-model.mjs art_inbox\models\nhan_vat.glb nhan_vat_a "Nhân vật A" --height 1.7
```

| Phần | Ý nghĩa |
|---|---|
| `art_inbox\models\nhan_vat.glb` | file bạn vừa tải |
| `nhan_vat_a` | mã ngắn, chỉ chữ thường, số, dấu gạch dưới |
| `"Nhân vật A"` | tên hiện trong kệ |
| `--height 1.7` | chiều cao thật tính bằng mét (người 1.7, ghế 0.9, nhà 6…) |
| `--tris 15000` | (tuỳ chọn) số tam giác mong muốn; nhiều hơn thì đẹp hơn nhưng nặng hơn |
| `--tex 1024` | (tuỳ chọn) cỡ ảnh bề mặt tối đa |

Lệnh sẽ in ra kiểu `1,973,009 -> 15,000 triangles, 380 KB` rồi thêm mô hình vào danh sách. Mở lại game, vào **Sửa → Tạo hình → Mô hình 3D**.

Chạy lại lệnh với cùng mã là thay mô hình cũ bằng bản mới. Muốn bỏ một mô hình, xoá file trong `public\assets\models\` và dòng của nó trong `src\data\models.json`.

## 4. Trong game

- Mô hình được **đứng trên mặt đất, căn giữa, co giãn đều theo chiều cao** bạn chọn ở bảng thuộc tính.
- Ảnh bề mặt (texture) giữ nguyên, nhưng cách tô sáng-tối được đổi sang kiểu vẽ tay của game để hợp với nhà cửa, cây cối.
- Mô hình có va chạm theo khối hộp bao quanh khi bạn đi lại.
- Nếu mô hình thiếu pháp tuyến (đen thui), game tự tính lại.

## 5. Nên dùng Tripo cho gì

| Rất hợp | Không hợp |
|---|---|
| Người, thú, nội thất, đồ trang trí, cây, đá | Tường, mái, cột, dầm: phần xây dựng cần chỉnh kích thước từng mảnh, phải là khối tham số của game |
| Công trình nổi tiếng làm cảnh nền (tháp Eiffel, đền, kim tự tháp) | Thứ cần cửa mở, cắt, sơn từng phần: mô hình AI là một khối liền |

Người và thú bằng mô hình 3D thật là cách làm thay cho tấm 2D hiện tại; làm xong một con rồi so với tấm 2D để quyết định thay hay không.

## 6. Giới hạn hiện tại

- Chưa có hoạt ảnh (đi, vẫy tay); mô hình đứng yên.
- Chưa có ảnh nhỏ xem trước trong kệ (đang hiện nút "3D" chung).
- Mô hình nhiều vật liệu hoặc nhiều ảnh bề mặt có thể nặng hơn dự kiến; xem dòng kích thước tệp tin mà lệnh in ra, nên dưới 1 MB cho mỗi mô hình.
- Mô hình phức tạp như cả căn nhà từ Tripo sẽ không sửa được từng phần, vì chỉ là một khối.

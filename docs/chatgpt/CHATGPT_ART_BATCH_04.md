# WOODSCAPE — Đợt tạo ảnh số 4 (gửi ChatGPT): ảnh còn thiếu để người và con vật thành khối 3D đẹp

## Vì sao cần đợt này

Game dựng người và con vật thành khối 3D từ ảnh của bạn: ảnh **trước + ảnh bên** cho hình dáng, rồi ảnh **trước / sau / bên** dán lên bề mặt. Hiện còn thiếu, và code không bù được:

| Thiếu | Hậu quả hiện tại |
|---|---|
| Ảnh **nhìn từ trên xuống** | Đỉnh đầu, vai, lưng mèo, lưng chó chỉ là màu đoán, đỉnh đầu người ra màu kem thay vì màu tóc |
| Ảnh **nhìn từ dưới lên** | Bụng, cằm, lòng bàn chân không có màu thật |
| Ảnh **chéo 3/4 trước** và **3/4 sau** | Hình khối chỉ có hai bóng nên đầu, vai, hông bị bẹt; ảnh chéo cho thêm độ tròn |
| **Cận cảnh đầu** (trước, bên) | Mặt chỉ cỡ vài chục pixel nên mờ khi đứng gần |

Gửi theo thứ tự ưu tiên: **người đứng** và **mèo** trước (đang đặt trong khu phố), chó và người ngồi sau.

## Cách làm

1. Cuộc trò chuyện mới. Tin nhắn đầu đính kèm ảnh gốc của đối tượng trong `art_inbox/` (`ref_person_standing.png`, `ref_person_standing_side.png`, `ref_person_standing_back.png` cho người; `ref_cat_standing.png`, `ref_cat_standing_front.png`, `ref_cat_standing_back.png` cho mèo).
2. Gửi Tin nhắn 0, rồi từng tin một. **Mỗi tin một ảnh.**
3. Lưu vào `art_inbox/` đúng tên ghi ở từng mục, báo Claude Code.

---

## Tin nhắn 0 — Thiết lập (đính kèm các ảnh gốc)

```text
The attached images are orthographic views of ONE character (or animal) from my 3D game
WOODSCAPE. The game builds a 3D model out of them, so I need MORE views of exactly the same
subject. I will ask for one image per message. Do not generate anything yet; just confirm.

Rules for every image:
- Exactly the same individual: same face, hair or fur pattern, clothes, colors and body
  proportions, same soft hand-painted anime style, thin dark-brown contour.
- Same standing pose as the attached images. Only the camera moves.
- ORTHOGRAPHIC: no perspective. For top and bottom views the camera looks straight along the
  vertical axis. For the 3/4 views the camera is exactly 45 degrees around the vertical axis at
  eye level.
- The subject keeps the SAME SCALE as in the attached images (same height in the frame for
  eye-level views; for top and bottom views the subject's length and width are drawn at that same scale).
- Whole subject visible with a small even margin, nothing cropped.
- Background: one flat solid color, pure magenta #FF00FF, no ground, no shadow, no scenery.
  The subject must contain no magenta or pink.
- No text, labels, arrows, or extra figures. One subject per image.
- Original generic design, not any existing character.
- Portrait 1024 x 1536 for the person; 1536 x 1024 for the cat.
```

---

## Người đứng

### 1. Nhìn từ trên xuống

Lưu: `art_inbox/ref_person_standing_top.png`

```text
Generate: the same person seen from DIRECTLY ABOVE (top view, camera looking straight down).
The figure's front points toward the BOTTOM of the image. We see the crown of the hair and the
parting, the tops of both shoulders and the rolled sleeves, the top of both shoes poking out in
front. Square image 1024 x 1024, magenta #FF00FF background.
```

### 2. Chéo 3/4 trước (bên phải của người)

Lưu: `art_inbox/ref_person_standing_front34.png`

```text
Generate: the same person at an exact 45-degree FRONT three-quarter view, turned so his
RIGHT shoulder is nearer the camera. Same pose, same height in the frame as the front view.
Portrait 1024 x 1536, magenta #FF00FF background.
```

### 3. Chéo 3/4 sau

Lưu: `art_inbox/ref_person_standing_back34.png`

```text
Generate: the same person at an exact 45-degree REAR three-quarter view, turned so his
RIGHT shoulder is nearer the camera. Portrait 1024 x 1536, magenta #FF00FF background.
```

### 4. Cận mặt, nhìn thẳng

Lưu: `art_inbox/ref_person_head_front.png`

```text
Generate: a close-up of the same person's HEAD and neck, exact front view, orthographic,
filling most of the frame, with the same face, hair, expression and shirt collar. Square
1024 x 1024, magenta #FF00FF background.
```

### 5. Cận mặt, nhìn ngang

Lưu: `art_inbox/ref_person_head_side.png`

```text
Generate: the same head close-up, exact right-facing PROFILE, orthographic, same scale and the
same vertical position of the eyes as the front head close-up. Square 1024 x 1024, magenta #FF00FF background.
```

---

## Mèo

### 6. Nhìn từ trên xuống

Lưu: `art_inbox/ref_cat_standing_top.png`

```text
Generate: the same orange tabby cat seen from DIRECTLY ABOVE (camera looking straight down),
the head pointing toward the BOTTOM of the image. We see the top of the head between the
ears, the striped back, the tail lying along or curving over the back, and the four paws
poking out at the sides. Landscape 1536 x 1024, magenta #FF00FF background.
```

### 7. Chéo 3/4 trước

Lưu: `art_inbox/ref_cat_standing_front34.png`

```text
Generate: the same cat at an exact 45-degree FRONT three-quarter view, its right side nearer
the camera, standing on all four paws, same size in the frame as the side view.
Landscape 1536 x 1024, magenta #FF00FF background.
```

### 8. Chéo 3/4 sau

Lưu: `art_inbox/ref_cat_standing_back34.png`

```text
Generate: the same cat at an exact 45-degree REAR three-quarter view, its right side nearer
the camera. Landscape 1536 x 1024, magenta #FF00FF background.
```

### 9. Cận đầu mèo, nhìn thẳng

Lưu: `art_inbox/ref_cat_head_front.png`

```text
Generate: a close-up of the same cat's HEAD, exact front view, orthographic, filling most of
the frame: both eyes, nose, whiskers, both ears. Square 1024 x 1024, magenta #FF00FF background.
```

---

## Câu sửa khi ảnh chưa đạt

| Lỗi | Câu gửi ChatGPT |
|---|---|
| Vẽ ra người / mèo khác | `This is not the same individual. Match the attached images exactly.` |
| Góc không chuẩn, có phối cảnh | `Make it truly orthographic, exact angle, no perspective.` |
| Tỉ lệ khác ảnh gốc | `Draw the subject at the same scale as the attached eye-level views.` |
| Bị cắt, chạm mép ảnh | `Show the whole subject with a margin. Nothing may touch the edge.` |
| Có bóng hoặc mặt đất | `Remove the ground and shadow. Only the subject on flat magenta #FF00FF.` |
| Nhiều hình trong một ảnh | `One image, one subject only. No turnaround sheet.` |

## Tự kiểm tra trước khi lưu

- [ ] Cùng một nhân vật / con mèo với ảnh gốc.
- [ ] Đúng góc (trên, chéo 45°, cận mặt), không phối cảnh.
- [ ] Cùng tỉ lệ, đủ toàn thân, nền hồng phẳng.
- [ ] Đúng tên file, nằm trong `art_inbox/`.

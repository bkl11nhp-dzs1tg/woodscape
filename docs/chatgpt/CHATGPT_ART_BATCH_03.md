# WOODSCAPE — Đợt tạo ảnh số 3 (gửi ChatGPT): thêm góc nhìn cho hình tham chiếu

Hiện mỗi hình người / con vật chỉ có **một** góc vẽ, nên trong game nó đứng yên như tấm biển, đi vòng ra bên cạnh là thấy mỏng dính. Khi có đủ **3 góc (trước, ngang, sau)**, game sẽ tự đổi hình theo chỗ bạn đứng, nhìn như một nhân vật có mặt trước mặt sau.

Đợt này chỉ làm **2 đối tượng: người đứng và mèo**, tổng cộng **4 ảnh mới**. Chó và người ngồi làm sau khi hai cái này ổn.

| Đối tượng | Đã có | Cần tạo thêm |
|---|---|---|
| Người đứng | mặt trước | **ngang**, **sau** |
| Mèo | ngang | **trước**, **sau** |

## Cách làm

1. Mở cuộc trò chuyện mới (hoặc dùng tiếp cuộc đợt 2). Ở tin nhắn đầu, **đính kèm ảnh gốc của đối tượng** lấy trong `art_inbox/`:
   `ref_person_standing.png` khi làm người, `ref_cat_standing.png` khi làm mèo.
2. Gửi Tin nhắn 0, rồi từng tin nhắn. **Mỗi tin một ảnh.**
3. Lưu vào `art_inbox/` đúng tên ghi ở từng mục rồi báo Claude Code.

Điều quan trọng nhất: **cùng một nhân vật, cùng quần áo, cùng tỉ lệ, cùng cỡ trong khung hình**. Nếu ChatGPT vẽ ra người khác, dùng câu sửa ở cuối file.

---

## Tin nhắn 0 — Thiết lập (đính kèm ảnh gốc)

```text
The attached image is a character cut-out from my 3D building game WOODSCAPE. In the
game it stands in the world as a flat upright card so players can judge sizes. I now
need the SAME subject drawn from other directions, so the game can swap the picture
depending on where the player stands.

I will ask for ONE image per message. Do not generate anything yet; confirm you understand.

Rules for every image:
- It must be exactly the same individual as in the attached image: same face and hair
  (or fur pattern and colors), same clothes, same body proportions, same painting style
  (soft hand-painted anime look, thin dark-brown contour, gentle shading).
- Same pose: standing still, relaxed, weight evenly on the feet (all four paws for the
  animal). Only the viewing direction changes. Do not make it walk, turn its head, wave,
  or sit.
- A true orthographic view from eye level: no perspective, no tilt, no three-quarter angle.
- Whole body visible, nothing cropped, a small even margin all around.
- The subject must be the same height in the frame as in the attached image, with the
  feet on the same baseline.
- Background: one flat solid color, pure magenta #FF00FF, edge to edge. No ground, no
  shadow, no scenery. The subject must contain no magenta or pink.
- No text, no logos, no labels, no arrows, no extra figures. One figure only.
- Original generic design, not a character from any existing anime, manga, game or film.
```

---

## Người đứng

### Tin nhắn 1 — Nhìn ngang

Lưu thành: `art_inbox/ref_person_standing_side.png`

```text
Generate: the same person, exact SIDE VIEW (profile), facing RIGHT.

- Standing straight, arms hanging at the sides (the near arm overlaps the body),
  feet together, looking straight ahead to the right.
- We see only the right-hand profile: one eye, the side of the nose, one ear.
- Same cream shirt with rolled sleeves, belt, grey-blue trousers, pale shoes.
- Portrait image, 1024 x 1536. Solid magenta #FF00FF background.
```

### Tin nhắn 2 — Nhìn từ sau

Lưu thành: `art_inbox/ref_person_standing_back.png`

```text
Generate: the same person, exact BACK VIEW.

- Standing straight seen from directly behind: back of the head and hair, back of the
  shirt and collar, belt, back of the trousers, heels of the shoes. No face visible.
- Arms relaxed at the sides, feet together, the same stance as the front view.
- Portrait image, 1024 x 1536. Solid magenta #FF00FF background.
```

---

## Mèo

### Tin nhắn 3 — Nhìn từ trước

Lưu thành: `art_inbox/ref_cat_standing_front.png`

```text
Generate: the same orange tabby cat, exact FRONT VIEW.

- Standing on all four legs, facing straight toward the viewer, head level, both eyes
  and both ears visible, cream chest and cream front paws.
- The body goes straight back behind the head, so we mainly see the face, chest and the
  two front legs, with the back legs just visible outside them. The raised tail shows
  above the back as in the side view.
- All four paws on the same baseline, fully visible, not cropped.
- Portrait image, 1024 x 1536. Solid magenta #FF00FF background.
```

### Tin nhắn 4 — Nhìn từ sau

Lưu thành: `art_inbox/ref_cat_standing_back.png`

```text
Generate: the same orange tabby cat, exact BACK VIEW.

- Standing on all four legs seen from directly behind: the rump, the two back legs and
  cream back paws, the raised striped tail curving up, the back of the head and both
  ears above the shoulders. No face visible.
- All four paws on the same baseline, fully visible, not cropped.
- Portrait image, 1024 x 1536. Solid magenta #FF00FF background.
```

---

## Câu sửa khi ảnh chưa đạt

| Lỗi | Câu gửi ChatGPT |
|---|---|
| Vẽ ra người / mèo khác | `This is not the same individual. Match the attached image exactly: same face, hair, clothes and colors (same fur pattern for the cat).` |
| Góc chéo 3/4 | `This is a three-quarter view. Redo it as an exact flat side view (or front / back view), no perspective.` |
| Đổi tư thế, đang bước đi | `Keep the same still standing pose as the reference. Only the viewing direction may change.` |
| Nhân vật to hoặc nhỏ hơn ảnh gốc | `Draw the subject at the same height in the frame as the reference image, feet on the same baseline.` |
| Mất bàn chân, bị cắt | `Show the whole body including all feet / paws, with a margin. Nothing may touch the image edge.` |
| Có bóng, mặt đất | `Remove the ground and the shadow. Only the subject on flat magenta #FF00FF.` |
| Vẽ nhiều hình trong một ảnh | `One figure only in this image. No turnaround sheet, no extra views.` |
| Nhìn ngang quay sang trái | `Flip it: the subject must face RIGHT.` |

## Tự kiểm tra trước khi lưu

- [ ] Đúng là cùng một nhân vật với ảnh gốc.
- [ ] Đúng góc: ngang (quay phải), trước, hoặc sau; không chéo.
- [ ] Đủ toàn thân, đủ bàn chân, cao bằng ảnh gốc.
- [ ] Nền hồng cánh sen phẳng, không bóng.
- [ ] Đúng tên file (`..._front.png`, `..._side.png`, `..._back.png`), nằm trong `art_inbox/`.

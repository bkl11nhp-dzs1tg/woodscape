# WOODSCAPE - Đợt tạo ảnh số 5 (gửi ChatGPT): đá, bê tông, vữa trắng, sàn gạch, mặt kính

## Vì sao cần đợt này

Các ảnh này đang là ảnh tạm nên nhà trông xám và phẳng. Biệt thự trắng cần vữa trắng đẹp, tường rào cần đá hoặc bê tông, sàn nhà cần gạch lát.

| Ảnh | Đang thay | Lưu thành |
|---|---|---|
| Đá xây | `stone_masonry_albedo.png` | `art_inbox/stone_masonry_albedo.png` |
| Bê tông | `concrete_albedo.png` | `art_inbox/concrete_albedo.png` |
| Vữa trắng | chưa có (đang dùng sơn trắng trơn) | `art_inbox/plaster_white_albedo.png` |
| Gạch lát nền | chưa có | `art_inbox/floor_tile_albedo.png` |
| Mặt kính | đang là màu trơn | `art_inbox/glass_albedo.png` |

## Cách làm

Làm đúng như đợt 1: **một cuộc trò chuyện mới**, gửi Tin nhắn 0 (đính kèm 3 ảnh trong `docs/chatgpt/images/` như đợt 1), rồi gửi từng tin một, **mỗi tin một ảnh**. Tải ảnh về, đổi tên đúng như bảng, bỏ vào `art_inbox/`, rồi báo Claude Code "đã có ảnh trong art_inbox". Claude sẽ làm ảnh lặp liền mạch và đưa vào game, không cần bạn sửa gì.

---

## Tin nhắn 0 - Thiết lập (đính kèm 3 ảnh như đợt 1)

```text
I am making a 3D building game called WOODSCAPE. I need flat material textures that
will be wrapped onto 3D boxes, beams and walls. I will ask for ONE image per message.
Do not generate anything yet; just confirm you understand the rules.

Rules for every image in this conversation:
- Art style: hand-painted background art from a bright Japanese slice-of-life anime.
  Visible soft brush strokes, gentle gradients, slightly simplified detail, warm and clean.
  Not photorealistic. Not a 3D render. Not pixel art. No thick black outlines.
- It is a flat material swatch, not a scene: straight-on orthographic view, no
  perspective, no camera angle, no depth of field.
- The material fills the entire image edge to edge. No border, no frame, no background,
  no objects, no tools, no hands.
- Lighting is flat and even. No cast shadows, no light direction, no vignette, no glare.
- Seamless and tileable: the left edge must match the right edge and the top edge must
  match the bottom edge. Avoid any unique feature (a single big crack, a single stain)
  that would look repeated when tiled.
- No text, no letters, no logo, no watermark, no signature.
- Square image, 1024 x 1024.
- All images must look like they were painted by the same artist with the same brushes
  as the wood and brick textures from the earlier batch.
```

---

## Tin nhắn 1 - Đá xây

Lưu thành: `art_inbox/stone_masonry_albedo.png`

```text
Image 1: STONE MASONRY wall. Rough-cut blocks of warm grey and sand-colored stone laid in
irregular courses, about 4 rows across the image, each block a different size and shade.
Thin recessed mortar joints in a lighter cream grey. Soft painted chips and tiny moss-free
weathering, no dirt streaks. Colors: warm greys, a little ochre and light brown. Calm,
clean, readable from far away.
```

## Tin nhắn 2 - Bê tông

Lưu thành: `art_inbox/concrete_albedo.png`

```text
Image 2: SMOOTH CONCRETE. A light neutral grey poured-concrete wall with very soft, large
cloudy brush variations, a few faint horizontal formwork seams about one third and two
thirds down the image, and tiny scattered pinholes. No cracks, no stains, no rebar.
Colors: light grey with a very slight warm tint. Quiet and even, it must not draw attention.
```

## Tin nhắn 3 - Vữa trắng

Lưu thành: `art_inbox/plaster_white_albedo.png`

```text
Image 3: WHITE PLASTER (stucco) for a classical villa wall. Off-white cream plaster with
very gentle hand-troweled brush strokes in soft arcs, a barely visible warm tint, and
extremely subtle light grey shading in the hollows of the strokes. Almost flat but clearly
hand-painted, not pure white and not grey. No cracks, no seams, no stains.
```

## Tin nhắn 4 - Gạch lát nền

Lưu thành: `art_inbox/floor_tile_albedo.png`

```text
Image 4: FLOOR TILES. Large square ceramic tiles in a warm light beige with a faint soft
marbled swirl, 3 tiles by 3 tiles across the image, thin grout lines in a slightly darker
cream, each tile a very slightly different shade. Seen straight from above. Clean and
bright, hand-painted look, no reflections, no glare.
```

## Tin nhắn 5 - Mặt kính

Lưu thành: `art_inbox/glass_albedo.png`

```text
Image 5: WINDOW GLASS. A soft pale sky-blue glass surface with a very gentle diagonal
gradient from lighter at the top left to slightly deeper blue at the bottom right, and two
or three faint soft white diagonal streaks of reflection, painted, not photographic. No
frame, no objects reflected, no dirt. It must stay simple so it looks good when the glass
is see-through.
```

---

## Câu sửa nhanh (dùng khi ảnh chưa đạt, đừng viết lại cả prompt)

- Nếu có viền hoặc khung: `Remove the border completely. The texture must fill the whole image edge to edge.`
- Nếu có bóng đổ hoặc ánh sáng một phía: `Make the lighting completely flat and even, no shadows, no light direction.`
- Nếu quá giống ảnh chụp: `Make it more hand-painted with visible soft brush strokes, like anime background art. Not photorealistic.`
- Nếu có một chi tiết nổi bật (vết nứt, vết bẩn): `Remove the single prominent feature so the image tiles invisibly.`

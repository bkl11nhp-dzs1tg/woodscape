# Asset Manifest – WOODSCAPE

| Nhóm | Asset | Định dạng | Trạng thái | Mục đích |
|---|---|---|---|---|
| Concept | House building concept main | PNG | Có | Hình concept tổng thể, camera gần hơn |
| Concept | Building workflow concept | PNG | Có | Minh hoạ 8 bước xây dựng và asset folders |
| Texture | Pine / Oak / Walnut / Cedar / Birch | PNG albedo + roughness | Có | Vật liệu gỗ ban đầu |
| Texture | Stone masonry / Red brick / Concrete | PNG albedo + roughness | Có | Móng, tường, chân trụ |
| Texture | Roof shingles / Tinted glass | PNG albedo + roughness | Có | Mái và kính |
| Terrain | Grassland / Sand / Soil / Gravel | PNG albedo + roughness | Có | Bề mặt môi trường Coastal Valley |
| UI | Select, Shape, Wood, Cut, Join, Measure, Decorate, Craft | SVG | Có | Toolbar editor |
| UI | Save, Undo, Redo, Weather, Settings, Folder, Home, Window, Roof, Plant | SVG | Có | Top bar, thư viện và thành phần |
| 3D Models | Environment, wood, glass, stone, furniture, animals, cat-items, references, building-parts, props | GLB/GLTF dự kiến | Chưa có | Model 3D cần dựng / bổ sung |

## Model 3D nên chuẩn bị cho MVP
1. Coastal Valley: terrain, river, shore, trees, shrubs, rocks, distant mountains.
2. Building parts: beam, plank, post, panel, floor tile, wall panel, roof segment, stair, door, window frame.
3. Reference props: mannequin, dog/cat scale references, chair, table, lamp, plants and rocks.
4. Material library: pine, oak, walnut, cedar, birch; clear/frosted/tinted glass; stone, brick and roof.

## Quy chuẩn đề xuất theo GDD
- Model: `.glb` / `.gltf`.
- Texture: PNG; dùng base color, roughness, normal, AO khi có.
- Đơn vị: mét; world up: Y.
- Geometry nên giữ parametric metadata ở data layer; không chỉ dựa vào scale mesh để đo kích thước.
- Tên file: `category_asset_variant_lod##.glb` khi có nhiều LOD.

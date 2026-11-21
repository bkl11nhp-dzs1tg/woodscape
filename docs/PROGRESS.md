# WOODSCAPE - Đã làm / chưa làm so với yêu cầu ban đầu

Cập nhật: 2026-11-19 (ngày gốc 2026-11-16). Đối chiếu với `WOODSCAPE_GDD_Architecture_v1.2.md` và các yêu cầu bạn nhắn thêm trong ngày.

Ký hiệu: ✅ xong và đã chạy thử · 🟡 có nhưng còn đơn giản · ❌ chưa làm.

## 1. Mười bốn hạng mục bắt buộc của MVP (GDD mục 12)

| # | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Một bản đồ 3D đẹp kiểu anime vẽ tay | 🟡 | Coastal Valley có sông, biển, đồi, dãy núi, cây có cành và tán chia nhỏ, cỏ, hoa. Vẫn là hình dựng bằng code, chưa có tranh vẽ tay cho cảnh |
| 2 | Camera tự do 360° | ✅ | Hai chế độ: **Đi lại** (nhân vật, mặc định) và **Bay quanh** |
| 3 | Tạo hình cơ bản: hộp, cầu, trụ, nón, tấm | ✅ | Thêm cả khối tam giác |
| 4 | Dầm, ván gỗ tạo bằng hình học tham số | ✅ | |
| 5 | Ít nhất một bộ texture gỗ vẽ tay | ✅ | Thông, sồi, óc chó từ ảnh ChatGPT; tuyết tùng, bạch dương đổi màu từ đó |
| 6 | Hộp 6 mặt thật, gán vật liệu từng mặt | ✅ | |
| 7 | Đặt, chọn, di chuyển, xoay, đổi kích thước | ✅ | Đổi kích thước bằng số; chưa có tay kéo đổi kích thước |
| 8 | Kích thước bằng số và nhãn đo | ✅ | Nhãn hiện trên vật đang chọn; vạch dấu trên nền có số đo |
| 9 | Cắt dầm và tấm | ✅ | Ba kiểu: chia đôi theo số, cắt theo đường kẻ (xiên tuỳ ý), khoét hình chữ nhật / tròn / tam giác. Chưa cắt được hình cầu, trụ, nón |
| 10 | Ghép và bắt dính | 🟡 | Bắt dính lưới, mặt, cạnh, góc. **Chưa có** quan hệ "ghép" (keo, đinh) lưu riêng |
| 11 | Gom nhóm và dời cả cụm | ✅ | Ctrl/Shift+bấm chọn thêm, Ctrl+G gom nhóm; kéo mũi tên hoặc phím mũi tên dời cả cụm. Mỗi công trình mẫu đã là một nhóm |
| 12 | Hoàn tác / làm lại | ✅ | Mọi thao tác sửa đều hoàn tác được |
| 13 | Lưu và tải thế giới | 🟡 | Tự lưu vào trình duyệt + mốc lưu để quay về. Chưa xuất/nhập file JSON |
| 14 | Giao diện editor mạch lạc | ✅ | Tiếng Việt, có bản điện thoại xoay ngang |

## 2. Mười lăm tiêu chí nghiệm thu (GDD mục 13)

| # | Người chơi có thể… | Trạng thái |
|---|---|---|
| 1 | Mở game, vào Coastal Valley | ✅ |
| 2 | Di chuyển camera tự do | ✅ |
| 3 | Tạo hộp, cầu, trụ | ✅ |
| 4 | Thêm dầm và tấm gỗ | ✅ |
| 5 | Đặt kích thước chính xác | ✅ |
| 6 | Di chuyển, xoay, nhân bản, gom nhóm | ✅ |
| 7 | Cắt một dầm làm hai | ✅ |
| 8 | Ghép các phần mà vẫn sửa riêng được | 🟡 đặt sát nhau được, chưa có quan hệ ghép |
| 9 | Dời cả công trình sang chỗ khác | ✅ |
| 10 | Đo kích thước và **khoảng cách** | 🟡 đo khoảng cách bằng Vạch dấu trên nền |
| 11 | Hoàn tác và làm lại | ✅ |
| 12 | Lưu, đóng, mở lại, còn nguyên công trình | ✅ (trong cùng trình duyệt) |
| 13 | Hộp có 6 mặt thật, vật liệu riêng từng mặt | ✅ |
| 14 | Xoay camera xem mặt sau, mặt bên | ✅ |
| 15 | Vật xây vẫn là hình học sửa được | ✅ |

## 3. Các phần khác của GDD

| Mục GDD | Nội dung | Trạng thái |
|---|---|---|
| 3.3 | Phím WASD, Q/E, F, Esc; góc nhìn trên/trước/bên; tốc độ camera | ✅ |
| 4.2 | Kính: màu, độ trong suốt | 🟡 chỉnh độ đục được; chưa có kính mờ, kính hoa văn |
| 4.3 – 4.5 | Đá, gạch, giấy | 🟡 có gạch, đá xây, bê tông; texture đá/bê tông còn là ảnh tạm |
| 4.6 | Keo, đinh, ốc, bản lề | ❌ (cửa có bản lề riêng của nó) |
| 4.7 – 4.8 | Cách nhiệt, pin mặt trời, quạt | ❌ theo GDD là giai đoạn sau |
| 5.3 | Hình tuỳ biến: đùn, vòm, bo cạnh | ❌ |
| 5.4 | Thành phần tái sử dụng (lưu một cụm thành mẫu) | ❌ |
| 7 | Vật tham chiếu: người, mèo, chó, nội thất | ❌ đã có file prompt để tạo ảnh |
| 8.4 | Thời gian trong ngày | ✅ 5 mốc |
| 8.4 | Thời tiết | 🟡 quang, nhiều mây, mưa, sương mù. Chưa có gió, âm thanh |
| 9 | Vật lý Rapier, thử độ vững | ❌ |
| 10 | Thanh trên, thanh công cụ, bảng thuộc tính, kệ vật liệu, minimap | ✅ |
| 11 | IndexedDB, xuất/nhập JSON, `schemaVersion` | 🟡 đang dùng localStorage có `schemaVersion` |
| 14.8 | Lịch sử dạng lệnh | ✅ |

## 4. Yêu cầu bạn nhắn thêm hôm nay

| Yêu cầu | Trạng thái | Cách dùng |
|---|---|---|
| Coi mình là nhân vật, rê chuột chỉ quay đầu | ✅ | Chế độ **Đi lại** là mặc định. Phím `C` hoặc nút cuối thanh trái để đổi sang **Bay quanh** |
| Phím tắt lên / xuống | ✅ | `E` hoặc `Space` lên, `Q` hoặc `X` xuống, `Shift` đi nhanh |
| Không đi xuyên khối | ✅ | Bật sẵn trong chế độ Đi lại; tắt được trong Cài đặt |
| Bản điện thoại xoay ngang, phím ảo mờ | 🟡 | Cần ảo bên trái, nút ▲▼ bên phải, vuốt màn hình để quay đầu. Mới thử bằng giả lập, chưa thử trên máy thật |
| Cửa chính, cửa sổ mở được | ✅ | Kệ **Tạo hình → Cửa**. Bấm lên tường là tường tự mở ô. Bấm đúp để mở/đóng |
| Đục một khoảng trên tường | ✅ | **Tạo hình → Ô trống**, bấm lên tường. Dời hay xoá ô thì lỗ đi theo |
| Cắt theo ý muốn | 🟡 | Công cụ **Cắt**: chọn khối, bấm lên khối để đặt vạch đỏ, bấm "Cắt tại vạch đỏ" |
| Sơn nhiều lớp màu có độ trong | ✅ | Công cụ **Sơn**: chọn màu, độ phủ 10–100%, bấm vào vật. Vân gỗ/gạch vẫn hiện qua lớp sơn mỏng |
| Chỉnh độ trong suốt của cửa sổ | ✅ | Chọn cửa sổ → thanh "Độ đục của kính" |
| Vạch dấu trên nền như thi công | ✅ | Công cụ **Vạch dấu**: bấm các điểm, mỗi đoạn có số đo |
| Minimap kiểu atlas địa lí | ✅ | Góc dưới phải: màu theo độ cao, đường đồng mức, sông biển, công trình. Bấm để tới điểm đó |
| Toast nhỏ khi lỡ xoá | ✅ | Có nút Hoàn tác ngay trên toast |
| Lưu mốc để quay về | ✅ | Biểu tượng đĩa trên thanh trên → "Lưu mốc hiện tại" / "Quay về" |
| Phím mũi tên dịch chuyển vật | ✅ | `← ↑ ↓ →` dịch một bước lưới theo hướng đang nhìn; `Shift + ↑ ↓` lên xuống |
| Vật đang đặt biến mất khi bấm công cụ khác | ✅ | Đó là hình xem trước bị huỷ; giờ có toast báo rõ |
| Núi xa trông như kim tự tháp | ✅ | Đổi thành dãy núi liền có đỉnh, yên ngựa, đỉnh xa phủ trắng |
| Mây đẹp hơn | ✅ | Mây tích có đáy phẳng, đổ bóng dưới, trôi chậm |
| Cây có cành, tán chia nhỏ | ✅ | Thân + 4–5 cành + khoảng 15 cụm lá, sáng ở trên, tối ở dưới |
| Bắt dính thông minh theo cạnh, góc | 🟡 | Khi thả vật gần vật khác (dưới 15 cm), mặt tự khít hoặc bằng mặt. Chưa có đường gióng hiển thị trong lúc kéo |
| Nhà mẫu theo tông màu ảnh gửi | ✅ | Tường ốp ván sơn kem, mái cam, khung cửa xanh, cánh chớp cam, tường rào xám. Thiết kế riêng, không chép căn nhà trong ảnh |
| Tự dựng khu phố và công trình để thử | ✅ | 5 nhà, đường, cầu gỗ 36 m qua sông, chòi nghỉ, tháp quan sát: 301 vật thể |
| Prompt tạo NPC và con vật | ✅ | `docs/chatgpt/CHATGPT_ART_BATCH_02.md` |

## 4b. Bổ sung cuối ngày

| Yêu cầu | Trạng thái | Cách dùng |
|---|---|---|
| Nhìn xa như hộp trơn | 🟡 | Mọi khối có viền nét mảnh; nhà có chân đá, nẹp góc, bệ cửa sổ, nẹp mái, ống khói. Texture ngói, đá, vữa vẫn cần ảnh vẽ (đợt 2) |
| Sơn bằng chổi quét | ✅ | Công cụ Sơn: giữ chuột và quét qua các vật; con trỏ là chổi tròn mang màu đang chọn |
| Sơn cả vùng | ✅ | Bật **Cả vùng** trên thanh sơn: một lần chạm sơn mọi phần cùng loại dính liền nhau |
| Bản đồ đồng màu, thu phóng, đánh dấu | ✅ | Nút + - ⤢; bấm lên bản đồ để cắm điểm dấu (có cột sáng ngoài cảnh và đường chỉ hướng); "Tới đó" để nhảy tới |
| Đường nối liền | ✅ | Phố chính, đường ra cầu, đường mòn tới tháp, lối vào công viên, lối từ cổng mỗi nhà ra phố; đường bám theo mặt đất |
| Chọn nhiều, gom nhóm, dời cùng lúc | ✅ | Xem mục 1, hàng 11. Alt+bấm để chọn riêng một phần trong nhóm |
| Hiện trục X Y Z khi chọn | ✅ | Chọn vật là hiện mũi tên ngay, không cần đổi công cụ |
| Cắt theo đường kẻ, khoét theo hình | ✅ | Công cụ Cắt → chọn "Đường kẻ" (bấm hai điểm trên một mặt) hoặc "Khoét hình" (chọn hình, kích thước, bấm đặt tâm). Miếng cắt ra không còn gán vật liệu riêng từng mặt và không tự mở ô cho cửa |
| Tăng tương phản, chiều sâu | ✅ | Nắng mạnh hơn, vùng bóng tối hơn, nét viền đậm hơn, thêm sương xa |
| Giao diện điện thoại gọn hơn | 🟡 | Thanh và nút nhỏ lại, thanh công cụ 2 cột, góc nhìn rộng hơn, ẩn bảng gợi ý khi chưa chọn gì. Mới thử bằng giả lập |
| Toàn màn hình trên điện thoại | 🟡 | Nút ⛶ trên thanh trên (Android). iPhone: Chia sẻ → Thêm vào MH chính. Chưa thử trên máy thật |

## 4c. Ngày 17/11

| Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|
| Mái ngói từ ảnh ChatGPT | ✅ | Cắt đúng một chu kỳ lặp; mọi mái nhà dùng ngói, nhà khác màu thì nhuộm ngói theo bảng màu |
| Kính không còn hoa văn | ✅ | Kính dùng nền trơn; chỉnh độ đục ở bảng thuộc tính |
| Tốc độ xoay góc nhìn | ✅ | Cài đặt → "Tốc độ xoay góc nhìn" 30–250% |
| Góc nhìn điện thoại như cũ, tách thanh trên và thanh bên | ✅ | |
| Căn lại nút bản đồ | ✅ | Một dòng chữ, một dòng nút |
| Đường không còn cụt | ✅ | Phố chính + đường vòng sau dãy nhà phía nam + đường ra cầu + đường mòn tới đền và tháp |
| Công trình thế giới, kích thước thật | 🟡 | Kim tự tháp Giza 230 × 146,6 m (trên đảo cát ngoài biển vì đất liền không đủ chỗ), đền Parthenon 69,5 × 30,9 m với 46 cột, tháp Eiffel 330 m, cổng torii Itsukushima 16,6 m, tháp Elizabeth (Big Ben) 96 m. Kích thước tổng thể đúng; chi tiết bị giới hạn bởi hình khối hiện có (không có vòm, không có giàn mắt cáo) |
| Phân vùng cảnh quan | ✅ | Đồng bằng: cây lá rộng thưa, nhiều hoa. Rừng (đai chân đồi): cây rậm, thông lẫn lá rộng, bụi dương xỉ, nền sẫm. Vùng cao: cỏ khô, thông thưa, đá tảng. Bãi biển: dừa, cỏ cồn cát. Ven sông: lau sậy, liễu nhỏ, đá. Bản đồ tô rừng màu sẫm |
| Người và con vật dựng từ chính ảnh đủ góc | ✅ | Hình dáng lấy từ giao của ảnh trước và ảnh bên (mặt cắt bo tròn), rồi ảnh trước / sau / bên chiếu lên bề mặt nên mặt, áo, vằn lông là tranh thật nhìn từ mọi hướng. Dựng lại bằng `node tools/build-figures.mjs` khi đổi ảnh. Mặt trên đầu và lưng chỉ lấy màu từ mép ảnh nên đơn sắc |
| (cũ) Mô hình ghép khối trụ | - | Người đứng, người ngồi ghế, mèo, chó là mô hình 3D dựng từ các khối (đầu, thân, tay chân, tai, đuôi, vằn lông…) tô theo màu bản vẽ; xoay quanh được, đổi chiều cao được. Tấm phẳng nhiều góc cũ chỉ còn để mở được thế giới cũ |
| (cũ) Hình tham chiếu phẳng nhiều góc | - | Người đứng, mèo, chó có đủ trước / ngang / sau; người ngồi có trước / ngang (phía sau dùng hình ngang). Hình tự đổi theo chỗ bạn đứng, đứng yên không quay theo. Mọi góc cùng một tỉ lệ nên chân luôn chạm đất. Chó và người ngồi lấy từ ảnh ghép `fulldog.png`, `fullhuman.png` nên mờ hơn khi nhìn sát; nên tạo ảnh riêng cho chúng |
| Chế độ Xem và chế độ Sửa | ✅ | Mở game là chế độ **Xem**: đi lại như một người, bấm vào cửa để mở, không sửa được gì (không có bảng thuộc tính, công cụ, hoàn tác). Bấm nút **Sửa** góc trên trái để vào chế độ sửa: bấm vào đồ vật mới chọn và chỉnh được. Bấm **Xem** để quay lại |
| Tháp Eiffel xa hơn | ✅ | Dời ra một đảo cát riêng ở vịnh phía đông bắc, cách khu phố khoảng 380 m |

| Cây làm lại toàn bộ | ✅ | Thân cong có chân loe, cành chia nhánh, lá là các cụm lá vẽ tay chồng lớp (sáng trên, tối trong); thông nhiều tầng kim rủ xuống; dừa có tàu lá cong. Cây hoang và cây trong khu phố dùng chung một cách dựng; kệ Tạo hình có nhóm "Cây" (lá rộng, thông, dừa), mỗi cây mọc một dáng riêng |

| Người và thú dựng từ ảnh nhiều góc (cập nhật 17/11) | 🟡 | Dùng thêm: ảnh 3/4 trước và sau của người đứng và người ngồi để khối tròn hơn; ảnh nhìn từ trên xuống thật của mèo và chó dán lên lưng; màu tóc thật cho đỉnh đầu; bộ ảnh người ngồi mới (300×500) thay bản cũ. Sửa lỗi hai bên mặt bị lật ngược và lỗi dải màu mặt-hướng-lên bị lộn đầu xuống chân. Chưa dùng: 10 ảnh `ref_person_standing_view_01…10` (nhỏ 161×386, kém bản đang dùng), ảnh cận mặt, ảnh nhìn từ dưới, ảnh nhìn từ trên của người (phối cảnh, đầu quá to nên chỉ lấy màu tóc), ảnh 3/4 và cận mặt của mèo/chó. Ảnh mèo/chó trong thư mục `animal/` chỉ ~300px nên mới dùng cho mặt lưng |

| Người và thú: tấm 2D đổi hình theo góc nhìn | ✅ | Bỏ hướng khối 3D (nhìn xấu). Mỗi nhân vật là một tấm luôn quay mặt về phía bạn, hình trên tấm đổi theo chỗ bạn đứng quanh nó trong 8 hướng; hướng chưa có ảnh thì lấy ảnh đối xứng hoặc ảnh gần nhất. Người đứng: trước, 3/4 trước, bên, 3/4 sau, sau. Người ngồi: trước, 3/4 trước, hai bên, 3/4 sau, sau. Mèo: trước, 3/4 trước, bên, sau. Chó: trước, bên, sau. Còn thiếu ảnh 3/4 của chó, 3/4 sau của mèo, và ảnh phía bên trái của người đứng/mèo/chó (đang lật ảnh bên phải); ảnh cận mặt, nhìn từ trên/dưới không dùng cho tấm 2D |

| Chỉnh sửa trên điện thoại / máy tính bảng (18/11) | ✅ | Nhấn giữ một đồ vật (~0,5 giây) để vào chế độ Sửa với đúng món đó (kéo hay chạm hai ngón thì huỷ, nên nhìn quanh không chọn nhầm). Nút "Chọn nhiều" thay phím Ctrl. Kéo mũi tên xong, vật nằm yên ở chỗ thả cho tới khi bấm "Đặt ✓" hoặc "Huỷ". Mũi tên to hơn cho ngón tay. Chọn nhiều vật chỉ vẽ một khung chung thay vì khung cho từng mảnh |
| Đặt vật hai bước, xoay được trước khi đặt | ✅ | Chạm lần 1 chọn chỗ; nút ⟲ ⟳ xoay 45°; chạm lại đúng chỗ đó hoặc bấm "Đặt ✓" để xác nhận. Máy tính: bấm là đặt, phím R (Shift+R ngược lại) xoay trước khi bấm |
| Đặt vật tạm cố định trên mặt đất | 🟡 | Tạm thời mọi vật đặt trên mặt đất (không chồng lên vật khác, không đào xuống). Cửa, cửa sổ, ô trống vẫn gắn vào tường. Việc chồng vật, dưới mặt đất và vật lý rơi xuống để làm sau |
| Người ngồi không lọt vào ghế | ✅ | Dời về trước mép băng ghế |

| Nhập mô hình 3D từ Tripo / Meshy (18/11) | ✅ | `tools/optimize-model.mjs` giảm 1–2 triệu tam giác xuống ~15.000, nén ảnh bề mặt, đăng ký vào kệ "Mô hình 3D". Thử bằng một mô hình giả: 119.600 tam giác 2,6 MB → 15.000 tam giác 75 KB, đặt đúng kích thước, ảnh bề mặt hiện đúng. Chưa thử với file Tripo thật (gói miễn phí chưa cho xuất). Hướng dẫn: `docs/TRIPO_WORKFLOW.md` |

| Mèo, chó là mô hình 3D thật từ Tripo; người giữ 2D (18/11) | ✅ | 3 file `.glb` (khoảng 190.000 tam giác, 7 MB mỗi file) được nén còn 20.000 / 15.000 / 30.000 tam giác, 0,6–0,8 MB. Kích thước theo ảnh 2D: người 1,70 m, mèo cao 0,53 m (dài 0,65 m kể cả đuôi), chó cao 0,74 m. Mèo và chó thay tấm 2D. **Người dùng thấy mô hình 3D của người xấu nên đã trả về tấm 2D** (người đứng và người ngồi); file gốc vẫn ở `art_inbox/models/ref_person_standing.glb` |

| Công cụ Vẽ kiểu Tiny Glade (18/11) | ✅ | Nút **Vẽ** (phím T): bấm các điểm trên đất để dựng **tường**, **hàng rào** hoặc **lối đi**; điểm tự bắt lưới và tự nắn thẳng theo hướng ngang / dọc / chéo 45°; xem trước tường thật kèm số đo từng đoạn; bấm lại điểm cuối để xong, bấm điểm đầu để khép phòng. Tường cao theo độ dốc đất, góc tường khít nhau không chồng mặt. Mỗi lần vẽ là một nhóm, hoàn tác một lần. **Thêm mái tự động** ở bảng bên phải: đo khung tường đang chọn rồi dựng mái ngói hai dốc + nóc + hai đầu hồi, ngói chạy theo chiều dốc. Cũng có: **kiểu mái** (hai dốc, mái hông, mái bằng); **Tự thêm cửa** (một cửa chính trên bức tường dài nhất, cửa sổ cách đều các tường, tất cả quay ra ngoài và tự khoét tường); trụ tròn bịt khe ở góc tường không vuông; đặt cửa lên tường thì tự bám giữa tường, né mép, cửa sổ tự về độ cao bệ 0,9 m. Phòng chữ L / T / U: tự cắt khung thành các hình chữ nhật, mỗi khối một mái riêng (chỗ giao nhau chồng lên nhau, không hở). Bảng chọn nhiều vật thể đã dàn lại theo từng mục. Kệ hình: Ô trống có biểu tượng SVG, Mèo/Chó hiện ảnh vẽ từ chính model. Cây vườn của nhà mẫu dời ra lề đường để tán lá không xuyên tường/mái hiên |

## 5. Bài thử khu phố cho thấy game còn thiếu gì

1. **Số vật thể tăng nhanh.** Khu phố mẫu hiện 545 vật; một căn nhà chi tiết là khoảng 130. Cần gộp lần vẽ trước khi lên vài nghìn vật.
2. **Mái chỉ là tấm phẳng.** Chưa có mái hông (4 mái), chưa có ngói. Chỗ hai mái giao nhau phải chấp nhận tấm đâm xuyên nhau.
3. **Không có khối tam giác vuông / nêm.** Phải giấu nửa khối tam giác cân vào trong tường để bịt đầu mái hiên.
4. **Cầu thang phải đặt từng bậc.** Nên có mẫu "cầu thang" nhập số bậc, chiều cao.
5. **Tường là ván phẳng sơn màu.** Texture đá, bê tông, kính vẫn là ảnh tạm.
6. **Chưa có người, con vật, nội thất** để so tỉ lệ.
7. **Hiệu năng chưa đo trên máy thật.** Mỗi vật là một lần vẽ riêng; vài nghìn vật sẽ cần gộp.

| Lắp thông minh: lát đầy một vùng + đặt tên nhóm (19/11) | ✅ | Chọn **một** viên (hộp hoặc tấm, chưa thuộc nhóm) → bảng bên phải có mục **Lát đầy một vùng**: nhập kích thước vùng (hai chiều dài của viên), khe giữa các viên (mm), kiểu xếp **Thẳng hàng** hoặc **So le** (ván sàn, gạch xây), tùy chọn cắt viên ngoài cùng cho vừa mép, tên nhóm. Bấm **Lát đầy vùng**: viên gốc là góc đầu tiên, các viên còn lại tự xếp theo hướng xoay của nó, tất cả thành một nhóm có tên, hoàn tác một lần là gỡ hết (tối đa 2000 viên). Gom nhóm nhiều vật cũng đặt tên được (ô Tên nhóm), nhóm đã có thì đổi tên ngay trong bảng; tên hiện thành tiêu đề bảng. Mã: `tiling.ts`, `tilingActions.ts` |
| Lát trên đất dốc (19/11) | ✅ | Viên lát bằng công cụ kéo khung hoặc lát sàn theo tường nghiêng theo mặt đất và được nâng lên vừa đủ để không góc nào chìm xuống đất (chỗ cao thì kênh lên, không thụt xuống). Vật đặt thường cũng đứng trên điểm đất cao nhất dưới chân nó |
| Kéo khung trên mặt đất để lát (19/11) | ✅ | Chọn một viên → **Lát đầy một vùng** → **Kéo khung trên mặt đất**; bấm hai góc đối nhau, thấy trước vùng và số đo. Viên tự xoay về góc vuông gần nhất để khớp mép |
| Lát sàn theo khung tường (19/11) | ✅ | Chọn các bức tường của phòng → **Lát sàn trong phòng** (ván gỗ so le hoặc gạch lát nền). Sàn nằm trong lòng tường, ngang chân tường |
| Ốp lên một mặt (19/11) | ✅ | Chọn tường, tấm mái hoặc tấm sàn → **Ốp lên một mặt**: chọn mặt (tự nhận mặt hướng lên cho mái), loại viên (gạch xây so le, ngói so le, ván ốp, gạch vuông). Trên tường, viên nào che cửa hoặc cửa sổ được bỏ ra |
| Lặp theo hàng và theo vòng (19/11) | ✅ | Chọn một vật hoặc cả cụm → **Lặp lại**: theo hàng (hướng X / Z / Y, khoảng cách mặc định bằng chiều dài cụm) hoặc theo vòng tròn (bán kính, mỗi bản xoay theo vị trí). Một lần hoàn tác là gỡ hết |
| Lưu nhóm thành mẫu (19/11) | ✅ | Chọn cụm → **Lưu thành mẫu**. Mẫu nằm ở kệ Tạo hình, mục **Mẫu của tôi** (có nút x để xoá), đặt lại như một vật và xoay được bằng R. Lưu trong trình duyệt (localStorage), chưa xuất ra file |
| Bảng thuộc tính dàn lại (19/11) | ✅ | Đầu bảng ghim tên và loại, nút Lấy nét / Nhân bản / Xoá ngay dưới. Các mục gập được (Kích thước, Vị trí và xoay mở sẵn; Sơn, Lát, Ốp, Lặp, Mẫu gập lại). Ô số gọn, ba ô trên một hàng, đơn vị nằm trong ô |
| Nhà mẫu xây từng bước (19/11) | ✅ | Kệ Tạo hình, tab **Nhà mẫu**: nhà gỗ nhỏ, nhà gạch chữ L, nhà vườn mái bằng (có hàng rào, lối vào), chòi mái hông. Chọn một kiểu, bấm lên đất (R xoay theo góc vuông): căn nhà không thả vào luôn mà được xây lần lượt bằng chính các công cụ: lát nền bằng công cụ Lát đầy (viên mọc dần), dựng từng bức tường như công cụ Vẽ (tường trồi lên từ đất), lắp cửa và cửa sổ tự động, lợp mái, rồi hàng rào và lối đi. Mỗi bước là vật thể thường, sửa được. Thanh dưới hiện "Bước x/y" và nút **Hủy** để dừng và giữ phần đã xây. Cả căn gộp thành một nhóm có tên và hoàn tác một lần là gỡ hết. Mã: `housePlans.ts`, `houseBuilder.ts`, `growth.ts`. Có nhà **nhiều tầng**: Nhà phố hai tầng và Biệt thự ba tầng (tầng trên thu nhỏ để chừa sân thượng): đổ móng nếu đất dốc, đổ sàn từng tầng, dựng tường từng tầng, cửa chính chỉ ở tầng trệt, mái ở tầng trên cùng. Mỗi kiểu nhà có tranh minh hoạ riêng trên kệ. Chưa có cầu thang trong nhà và lỗ sàn; cửa sổ tự thêm hơi dày trên nhà nhỏ |
| Nút bằng biểu tượng (19/11) | ✅ | Nút trên thanh Sơn, Vẽ, Vạch dấu, bảng thuộc tính, thanh đặt vật và thanh gợi ý đổi sang biểu tượng (chữ chỉ hiện khi rê chuột); các nút có chữ ngắn gọn như Thêm mái, Bắt đầu xây vẫn giữ chữ cạnh biểu tượng. Sửa thanh Sơn nút dính nhau |
| Nút có biểu tượng kèm chữ, thanh Cắt (19/11) | ✅ | Mọi nút trên các thanh có biểu tượng và chữ ngắn cạnh nhau. Thanh Cắt khi chưa chọn gì vẫn hiện sẵn ba kiểu cắt (mờ đi) để chọn trước; bỏ dấu gạch dọc thừa sau tiêu đề thanh |
| Hàng cây xén thật (19/11) | ✅ | Bờ rào cây của biệt thự không còn là khối xanh phẳng mà là các cụm lá tròn xếp hai hàng, ba sắc xanh, nhấp nhô; cụm lá nhỏ dùng ít mặt hơn nên không nặng máy |
| Nút ảo kiểu game (19/11) | ✅ | Cần điều khiển bên trái có vòng khắc và viên ngọc giữa; bên phải một nút **Chạm** to (tương tác với thứ chấm giữa màn hình chỉ vào: mở cửa ở chế độ xem, chọn vật ở chế độ sửa) và bốn nút tròn nhỏ bằng nhau: **Lên**, **Xuống**, **Chạy** (giữ để chạy nhanh), **Bay / Đi bộ**. Không có nền màu, chỉ viền vàng phát sáng và biểu tượng. Mới thử bằng giả lập màn hình cảm ứng, chưa thử trên điện thoại thật |
| Cài đặt đồ họa cho máy yếu (19/11) | ✅ | Bốn mức: **Cao, Vừa, Thấp, Tối thiểu (máy yếu)** và **Tự động** (mặc định). Mức thấp bỏ bóng đổ và nét viền, giảm độ phân giải, bớt cỏ và cây, bớt mây, tắt mưa tuyết và bụi. Tự động đoán theo máy (điện thoại, ít nhân CPU, ít RAM) rồi tự hạ một mức nếu khung hình dưới khoảng 26 hình mỗi giây trong hai lần đo liền, và báo cho người chơi; không tự nâng lại. Chọn trên trang chủ (trước khi nạp thế giới) hoặc trong Cài đặt. Chưa đo trên máy Honor nên các số này là ước lượng |
| Trang chủ (19/11) | ✅ | Nền là ảnh chụp từ chính game, **đổi theo giờ trong ngày mỗi 20 giây** (bình minh, trưa, hoàng hôn, đêm, chuyển mờ dần): kéo chuột hoặc ngón tay để xoay ngang quanh ảnh (thả ra ảnh còn trượt tiếp), rê chuột thì ảnh trôi nhẹ theo, chạm hoặc bấm thì sáng một vòng và tia lửa; chấm chọn giờ ở dưới. Khẩu hiệu "Kiến tạo không gian mơ ước chân thực, sống động". Menu bên trái: **Tiếp tục** to, rồi **Thế giới mới**, **Mở từ tệp**, **Mốc lưu** (huy hiệu số mốc), **Đồ họa** (huy hiệu mức đang dùng), **Chơi cùng bạn bè** (huy hiệu Sắp có, khoá). Ô tên người chơi ở góc trên phải hiện hai dòng (tên, và "Khách, lưu trong máy này") kèm nút bút để sửa. Bấm Tiếp tục thì địa chỉ đổi sang `#/play`. Ảnh nền đóng gói bằng `tools/pack-home.mjs` |
| Trang chủ trên điện thoại + chế độ bay (19/11) | ✅ | Điện thoại nằm ngang: menu chia 2 cột, chấm chọn giờ xuống góc phải, không còn đè nhau. Chấm chọn giờ dùng biểu tượng (mặt trời mọc, trưa, lặn, trăng) thay chữ trên màn nhỏ. Ảnh nền chụp lại góc thấp hơn, thấy đủ biệt thự, tháp Eiffel, tháp đồng hồ, núi. Chế độ bay quanh xoay lên trời được (`maxPolarAngle` 0.97π) |
| Điện thoại: chân nhà đen + thanh bị đè (19/11) | ✅ | Ảnh vân đá/bê tông/vữa/gạch lát nặng 1-2,4 MB nên mạng điện thoại chưa tải xong thì hiện **đen**: giảm còn 0,1-0,6 MB (`tools/shrink-textures.mjs`) và vân đang tải hiện màu be tạm thay vì đen (`TextureRegistry.ts`). Cột công cụ bên trái trên điện thoại bắt đầu thấp hơn nên không còn đè thanh trên. Cần thử lại trên máy thật |
| Xây nhiều căn + thanh tiến độ (19/11) | ✅ | Đang xây một căn mà đặt căn khác thì căn mới **xếp hàng** và tự xây sau (trước đây bị từ chối/dừng). Sửa hay đặt vật khác giữa chừng không còn làm căn đang xây dừng; chỉ hoàn tác chính căn đó mới dừng. Mỗi căn vẫn hoàn tác một lần (`mergeCommands` trong `history.ts`). Thanh dưới màn hình có thanh tiến độ % và "Còn N căn chờ"; Hủy dừng căn đang xây và bỏ hàng chờ |
| Ảnh đợt 5 đã vào game (19/11) | ✅ | Cắt từ ảnh ghép bằng `tools/cut-batch-05.mjs`: đá xây (lật gương 2 x 2 để ghép liền, không bị bóng ma), bê tông, **vữa trắng** (mới), **gạch lát nền** (mới, có đường mạch giữa các lần lặp), kính trong có vệt phản chiếu. Biệt thự và nhà ống dùng vữa trắng, sàn gạch dùng ảnh gạch lát |
| Hàng cây xén vuông vắn (19/11) | ✅ | Bờ rào cây là khối vuông cắt gọn, phủ ảnh lá dày (vẽ bằng code, có vật liệu "Hàng cây xén" dùng được cho mọi khối) thay cho các cụm lá tròn |
| Khung công cụ không tràn màn hình (19/11) | ✅ | Cột công cụ tự thu nhỏ khi cửa sổ thấp và cuộn được nếu vẫn thiếu chỗ; thanh trên bỏ ô Góc nhìn và tên thế giới khi cửa sổ hẹp; thanh gợi ý phím không rộng hơn màn hình |
| Nút ảo gọn góc (19/11) | ✅ | Cụm nút nằm sát góc phải dưới, bản đồ nhỏ nằm ngay trên cụm; nền nút mờ trong suốt nhẹ |
| Cầu thang trong nhà và lỗ sàn (19/11) | ✅ | Nhà phố, nhà ống và biệt thự có cầu thang trong nhà nối từng tầng; sàn tầng trên chừa lỗ đúng chỗ cầu thang |
| Chia phòng trong nhà (19/11) | ✅ | Mọi kiểu nhà có tường ngăn phòng, mỗi tường có một cửa đi. Đã kiểm tra bằng test: một điểm cao ngang mắt đi thẳng và lệch 25 cm hai bên đều qua được mọi cửa của cả 8 kiểu nhà. Lỗi cũ là tường ngăn đè lên chỗ cửa chính (nhà phố, nhà mái Thái) nên chặn cửa; nay cửa chính đặt ở giữa tường mặt tiền. Không có cửa tự mở |
| Đi bộ như người thật (19/11) | ✅ | Khi bật "Chặn đi xuyên vật thể", mắt luôn cách chân 1,7 m: có trọng lực, tự bước lên bậc thang và sàn thấp (tới 0,7 m), rơi khi hết sàn, **Space hoặc E để nhảy**; Q, X không còn hạ thấp. Tường thấp và hàng rào cũng chặn chân. Tắt chặn xuyên vật thể thì vẫn bay tự do như cũ |
| Cầu thang làm lại (19/11) | ✅ | Bậc ván, cổ bậc và hai má cầu thang hình nêm, hở phía dưới (không còn là khối gỗ đặc). Nhà nhiều tầng có **một vế cầu thang riêng cho mỗi tầng** (biệt thự và nhà ống đặt vế sau lệch sang bên để có chỗ đứng ở chiếu nghỉ); lỗ sàn rộng hơn cầu thang 0,3 m mỗi bên. Test mô phỏng đi bộ lên từng vế của cả ba nhà cao tầng đều tới đúng sàn trên |
| Sửa lỗi cửa biệt thự (19/11) | ✅ | Khung vòm trang trí bị tính là vật cản chặn cả ô cửa; nay khung trang trí không chặn, và vòm cửa hạ thấp để không đâm lên ban công. Test cửa giờ kiểm tra đi qua hẳn sang bên kia (trước chỉ kiểm tra không lệch ngang) |
| Hàng cây phía sau (19/11) | ✅ | Thêm hàng cây xén dọc tường rào phía sau biệt thự |
| Sàn biệt thự bị cỏ trồi lên (19/11) | ✅ | Mặt sàn nay tính theo chỗ đất cao nhất trong cả nền nhà, không chỉ ở mép tường |
| Thêm nhà mẫu và đổi màu (19/11) | ✅ | Thêm Nhà ống ba tầng và Nhà mái Thái (tổng 8 kiểu). Chọn cả căn xong có mục **Màu nhà** để đổi màu tường và mái bằng một chạm. Cửa sổ tự thêm thưa hơn (khoảng 3 m một ô) |
| Thanh Sơn, Cắt, Vẽ, Vạch dấu thống nhất (19/11) | ✅ | Cùng tiêu đề vàng nhỏ, cùng chiều cao nút, cùng viền |
| Chọn khung (19/11) | ✅ | Giữ **Shift** và kéo trên màn hình để chọn mọi vật có tâm nằm trong khung (cả nhóm); cộng dồn với phần đã chọn |
| Đường gióng và tay kéo đổi cỡ (19/11) | ✅ | Khi kéo vật, hiện đường nối mặt hoặc tâm khi thẳng hàng với vật khác (đỏ X, xanh Y, lam Z). Chọn một hộp hoặc tấm thì có chấm vàng giữa mỗi mặt: kéo để đẩy mặt đó, mặt đối diện đứng yên, hoàn tác một lần |
| Công cụ Đo (19/11) | ✅ | Nút **Đo** (phím N): bấm hai điểm bất kỳ (đất, tường, mái) ra khoảng cách thẳng, phần ngang và phần cao; điểm thứ ba ra góc |
| Ốp quanh trụ và nón (19/11) | ✅ | Chọn khối trụ hoặc nón, mục **Ốp quanh thân**: các viên xếp thành vòng, trên nón vòng nhỏ dần và nghiêng theo dốc |
| Bút vẽ trong Vạch dấu (19/11) | ✅ | Thanh Vạch dấu có **Đường thẳng** và **Bút vẽ**. Giữ chuột kéo để vẽ tự do, thả ra thì nét được làm thẳng gọn, phấn xuống đất và hiện độ dài; nét khép kín hiện thêm chu vi và diện tích |
| Xuất / nhập tệp và IndexedDB (19/11) | ✅ | Menu Mốc lưu có **Xuất ra tệp** và **Mở từ tệp** (.json, kèm các mẫu đã lưu; kiểm tra tệp trước khi mở, mở xong vẫn có mốc để quay lại). Thế giới tự lưu thêm vào IndexedDB nên không còn mất khi quá dung lượng localStorage |
| Bụi thi công đậm hơn (19/11) | 🟡 | Tăng số hạt, độ đậm và độ lớn; vẫn cần xem trên máy thật |
| Nhà mẫu: số đo và xem trước (19/11) | ✅ | Mỗi nhà trên kệ ghi kích thước (dài × rộng, số tầng, chiều cao). Chọn một nhà rồi bấm lên đất: hiện mô hình bản thiết kế trong suốt (tường, mái, ban công, cổng rào) kèm số đo dài, rộng, cao; xoay 90° bằng nút hoặc R; bấm **Bắt đầu xây** (hoặc Enter) mới dựng |
| Bụi thi công (19/11) | 🟡 | Khi xây, bụi bốc lên đúng chỗ từng tường, sàn, mái đang mọc và một lớp bụi mỏng quanh khu đất, bay lên, loang ra rồi tan. Đã kiểm tra số hạt hoạt động; chưa xem được độ đậm trên máy thật (máy kiểm tra không có GPU) nên có thể cần chỉnh |
| Biệt thự tân cổ điển (19/11) | ✅ | Làm lại biệt thự theo ảnh mẫu: tháp ba tầng mái đầu hồi xám đen, cánh trái hai tầng có sân thượng và giàn che, hiên có hai cột và vòm cửa, ban công lan can con tiện, phào chỉ và trụ ốp, cổng rào có hàng cây xén và cây dừa. Chưa có phù điêu hoa văn, đèn tường và ô tròn trên đầu hồi |
| Một kiểu bảng chung (19/11) | ✅ | Bảng thuộc tính, bảng nhiều vật, kệ Tạo hình và Cài đặt dùng cùng ngôn ngữ: tiêu đề mục vàng in hoa nhỏ, đường kẻ mảnh, nhãn bên trái và ô nhập bên phải, công tắc kiểu Cài đặt. Thanh Sơn, Cắt, Vẽ, Vạch dấu chưa dàn lại theo kiểu này |
| Chữ gợi ý tự ẩn (19/11) | ✅ | Ô nhắc khi chưa chọn gì và thanh gợi ý phím dưới màn hình chỉ hiện vài giây khi đổi chế độ hoặc công cụ, và hiện lại khi rê chuột tới gần |
| Kệ Tạo hình gọn (19/11) | ✅ | Một hàng hình dưới các tab nhóm, thay cho bảng rộng. **Nhấp đúp** một hình để đặt liên tục (chấm vàng trên hình), Esc để dừng; nhấp một lần vẫn như cũ (đặt xong chuyển sang di chuyển) |
| Thời tiết tự đổi, không chỉnh tay (19/11) | ✅ | Thời tiết do thế giới quyết định: cứ 180 đến 300 giây lại trôi sang kiểu khác theo xác suất (quang sang nhiều mây hay sương, nhiều mây sang mưa, mưa lại về nhiều mây). Ô chọn thời tiết đã bỏ, chỉ còn nhãn hiển thị |
| Chuyển buổi và thời tiết mượt (19/11) | ✅ | Đổi buổi: mặt trời, màu trời, sương, ánh sáng trượt trong 3,4 giây. Đổi thời tiết: mây hiện dần, mưa nhạt dần, sương dày dần trong 9 giây (trước đây nhảy ngay). Mã: `atmosphere.ts` |
| Đi tới điểm trên bản đồ mượt (19/11) | ✅ | Thời gian bay tỉ lệ với quãng đường (0,9 đến 3 giây), mượt hai đầu, và nâng lên cao dần giữa chuyến đi như quay flycam |
| HUD trời kiểu game (19/11) | ✅ | Năm nút biểu tượng cho buổi trong ngày với đốm sáng trượt theo, kèm nhãn thời tiết hiện hiệu ứng khi đổi. Thay cho hai ô chọn kiểu web |
| Xoay quanh bị giật (19/11) | 🟡 | Nguyên nhân chính: bản đồ bóng 2048 vẽ lại mọi khung hình dù cảnh đứng yên. Giờ chỉ vẽ lại khi thế giới, mặt trời hoặc vùng bóng đổi (vùng bóng dời theo bước 2 m, hết nhấp nháy), cộng một lần mỗi giây để an toàn. Giảm độ phân giải tối đa 2 xuống 1,75 và quán tính xoay nhẹ hơn. Chưa đo số khung hình trên máy thật |
| Cài về máy (21/11) | 🟡 | Hàng **Cài về máy** cuối menu trang chủ: Chrome thì bấm là hiện hộp cài đặt, Safari hoặc trình duyệt khác thì hiện hướng dẫn ngắn, ẩn khi đã cài. File khai báo sửa: `standalone` thay `fullscreen`, thêm biểu tượng PNG (192, 512, maskable), đường dẫn tương đối. Chưa thử trên điện thoại thật (`useInstallPrompt.ts`) |
| Khung 3D trắng trên một số máy (21/11) | 🟡 | Máy không có WebGL hoặc bị ngắt khung 3D thì hiện thông báo và nút **Thử lại ở chế độ máy yếu** thay vì trắng. Chưa biết nguyên nhân thật trên máy bị lỗi, cần tên máy và thông báo hiện ra |
| Bay trên điện thoại hết quay vòng (21/11) | 🟡 | Ở chế độ Bay, khi ngón tay đang giữ cần điều khiển hoặc nút Lên/Xuống thì kéo màn hình là **quay đầu tại chỗ** (trước đây xoay quanh điểm phía trước nên camera quay vòng). Lúc đó OrbitControls tạm tắt. Chưa thử trên máy thật |
| Nút Chạy (21/11) | 🟡 | Chạy tăng tốc nhanh hơn và dừng ngắn hơn (hệ số làm mượt 16 thay vì 9) nên không còn lướt thêm một đoạn sau khi thả. Nếu vẫn lướt thì nghi cần điều khiển bị trình duyệt hủy cảm ứng khi chạm thêm nút thứ hai, cần thử trên máy thật |
| Leo cầu thang khi đi bộ (21/11) | 🟡 | Chân (kiểm tra ở ngang thắt lưng) không còn bị vật cao đến 0,7 m chặn lại, bậc nào bước lên được thì không đẩy lùi; nâng người lên bậc nhanh hơn. Kiểm tra mô phỏng cầu thang kệ Tạo hình và nhà mẫu đi được ở tốc độ chạy. Cầu thang dựng bằng nêm hay tấm nghiêng vẫn không đi lên được (chỉ khối hộp mới là mặt đứng) |
| Bay không xuyên vật, có giới hạn (21/11) | ✅ | Khi bật "không đi xuyên khối", chế độ Bay cũng bị vật thể chặn (bấm Xuống không còn chui qua sàn gây lỗi). Giới hạn: cao tối đa 80 m so với mặt đất (và không quá 120 m), đi không quá mép bản đồ (12 m trong mép), khoảng cách xoay quanh tối đa 160 m. Đi tới điểm trên bản đồ cũng theo giới hạn |
| Chặn bôi đen chữ, nút ảo mờ hơn (21/11) | ✅ | Bấm liên tục lên nút hay màn hình không còn bôi đen chữ (ô nhập vẫn chọn được chữ). Cần điều khiển và các nút tròn trên điện thoại mờ còn khoảng 55%, sáng lên khi chạm, nền nút gần trong suốt |
| Cọ sơn bôi tới đâu sơn tới đó (21/11) | 🟡 | Công cụ Sơn có hai kiểu: **Cọ** (mặc định) và **Cả vật** (kiểu cũ, kèm Cả vùng). Cọ có **độ đậm** (mỗi nét tô là một lớp có độ đậm đồng đều, quệt lại trong cùng một nét không đậm thêm) và **cỡ cọ** 5–100 cm, mép mềm. Nét lưu trong dữ liệu vật (`brush`) theo tọa độ 0–1 trên sáu mặt nên đổi kích thước vật thì nét sơn giãn theo. Vẽ vào ảnh nhỏ riêng của mỗi vật, shader tra theo vị trí và pháp tuyến nên chạy cho hộp, tường có lỗ, tấm mái, nêm, hình ép; chưa cho trụ, nón, cầu, cửa, cửa sổ. Một lần quét là một bước hoàn tác. Gỡ sơn ở kiểu Cọ là tẩy nét. Giới hạn 6000 chấm mỗi vật. Mã: `materials/brushPaint.ts`, `ToolHelpers.tsx` |


Tình trạng sau lượt làm ngày 19/11:

1. **Số vật thể tăng nhanh:** ✅ phần lớn. Các viên giống hệt nhau (ván sàn, gạch, viên gạch, bậc thang; từ 8 viên trở lên, chưa chọn, không bị khoét cửa) giờ vẽ bằng một lần vẽ gộp (instancing), kể cả nét viền. Vật đang chọn vẫn là vật riêng. Chưa đo trên máy thật.
2. **Mái chỉ là tấm phẳng:** ✅ đã có mái hai dốc, mái hông, mái bằng, ngói (mục 4c).
3. **Không có khối tam giác vuông / nêm:** ✅ khối **Khối nêm** ở kệ Hình cơ bản; khối tam giác nào cũng đổi được giữa cân / nêm vuông trái / nêm vuông phải ở bảng thuộc tính. Vẫn dùng công cụ Cắt để tạo hình lạ khác. (Mái hiên của nhà mẫu vẫn giấu nửa khối cân; chưa đổi sang nêm.)
4. **Cầu thang đặt từng bậc:** ✅ kệ Tạo hình có ô **Cầu thang**: số bậc, rộng, cao và sâu mỗi bậc, rồi đặt như một nhóm có tên.
5. **Texture đá, bê tông, kính là ảnh tạm:** ❌ cần ảnh vẽ mới (đợt ChatGPT 2), không làm bằng code được.
6. **Chưa có người, con vật, nội thất:** 🟡 đã có người, mèo, chó; chưa có nội thất.
7. **Hiệu năng chưa đo trên máy thật:** 🟡 đã giảm số lần vẽ (mục 1), vẫn cần thử trên điện thoại.

## 6. Việc làm tiếp (đề xuất theo thứ tự)

Đã xong ngày 19/11: toàn bộ danh sách trước (cầu thang trong nhà, chia phòng, đổi màu nhà, thanh công cụ thống nhất, chọn khung, đường gióng, tay kéo đổi cỡ, công cụ Đo, ốp tròn, bút vẽ, xuất / nhập tệp).

1. **Ảnh đợt 5** (đá, bê tông, vữa trắng, gạch lát, kính): bạn gửi ChatGPT theo `docs/chatgpt/CHATGPT_ART_BATCH_05.md`, rồi báo "đã có ảnh trong art_inbox" để đưa vào game.
2. **Thử trên máy thật:** độ giật khi xoay quanh, độ đậm của bụi thi công, điện thoại (bảng mới, kéo khung, hai bước đặt nhà).
3. Nhà mẫu: thêm phù điêu, đèn tường, ô tròn trên đầu hồi cho biệt thự; thêm nội thất để mỗi phòng có đồ.
4. Tay kéo đổi cỡ cho hình trụ, nón, cầu; đường gióng khi kéo bằng ngón tay.
5. Chế độ khó: xây từng viên (đã có nền: lát đầy, lặp, gộp lần vẽ). Cần thử hiệu năng khi lên vài nghìn viên.
6. Vật lý thử độ vững, âm thanh môi trường.

Game tham khảo bạn nêu, *Architect Life: A House Design Simulator*, đi theo hướng vẽ mặt bằng rồi dựng tường tự động. Nếu muốn theo hướng đó, bước hợp lý là cho công cụ Vạch dấu "dựng tường theo vạch".
| Dễ chịu cho mắt + kẻ thẳng (18/11) | ✅ | Cài đặt → **Dễ chịu cho mắt**: góc nhìn 50–100° (mặc định 70°), quay đầu và đi mượt, tối viền khi di chuyển nhanh, chấm giữa màn hình. Đổi góc nhìn (bay quanh, hướng nhìn, đi tới điểm trên bản đồ) trượt mượt 0,45 giây thay vì nhảy. Vẽ và Vạch dấu: giữ **Shift** hoặc bấm nút **Thẳng** (cho điện thoại) để đường luôn ngang / dọc / chéo 45°. Thanh Vẽ dàn lại 2 hàng gọn. |
| Sửa công cụ Cắt (18/11) | ✅ | Tường đã khoét hình vẫn giữ lỗ của cửa và cửa sổ (trước đây lỗ biến mất, cửa lơ lửng trên tường). Bảng Cắt dàn lại: chữ nhỏ, một dòng, các bước 1-2-3 cho Đường kẻ, ba nút hình khoét. |

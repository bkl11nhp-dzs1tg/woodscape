# WOODSCAPE — Đã làm / chưa làm so với yêu cầu ban đầu

Cập nhật: 2026-11-16. Đối chiếu với `WOODSCAPE_GDD_Architecture_v1.2.md` và các yêu cầu bạn nhắn thêm trong ngày.

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
| Bản đồ đồng màu, thu phóng, đánh dấu | ✅ | Nút + − ⤢; bấm lên bản đồ để cắm điểm dấu (có cột sáng ngoài cảnh và đường chỉ hướng); "Tới đó" để nhảy tới |
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
| (cũ) Mô hình ghép khối trụ | — | Người đứng, người ngồi ghế, mèo, chó là mô hình 3D dựng từ các khối (đầu, thân, tay chân, tai, đuôi, vằn lông…) tô theo màu bản vẽ; xoay quanh được, đổi chiều cao được. Tấm phẳng nhiều góc cũ chỉ còn để mở được thế giới cũ |
| (cũ) Hình tham chiếu phẳng nhiều góc | — | Người đứng, mèo, chó có đủ trước / ngang / sau; người ngồi có trước / ngang (phía sau dùng hình ngang). Hình tự đổi theo chỗ bạn đứng, đứng yên không quay theo. Mọi góc cùng một tỉ lệ nên chân luôn chạm đất. Chó và người ngồi lấy từ ảnh ghép `fulldog.png`, `fullhuman.png` nên mờ hơn khi nhìn sát; nên tạo ảnh riêng cho chúng |
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

## 6. Việc làm tiếp (đề xuất theo thứ tự)

1. Lưu một nhóm thành mẫu dùng lại; chọn nhiều bằng cách kéo khung.
2. Đường gióng hiển thị khi kéo (bắt cạnh, tâm, góc) và tay kéo đổi kích thước ngay trên vật.
3. Mẫu tham số: cầu thang, mái hông, khối nêm, hàng rào lặp.
4. **Chế độ khó:** xây bằng từng viên gạch, viên đá, mảnh gỗ, có công cụ xếp hàng lặp. Chế độ hiện tại (tấm, khối lớn) là **chế độ dễ**.
5. Xuất / nhập thế giới ra file JSON; chuyển lưu trữ sang IndexedDB.
6. Đưa ảnh đợt 2 vào game: ngói, người và con vật tham chiếu.
7. Công cụ Đo riêng (khoảng cách giữa hai điểm bất kỳ, góc).
8. Vật lý thử độ vững, âm thanh môi trường.

Game tham khảo bạn nêu, *Architect Life: A House Design Simulator*, đi theo hướng vẽ mặt bằng rồi dựng tường tự động. Nếu muốn theo hướng đó, bước hợp lý là cho công cụ Vạch dấu "dựng tường theo vạch".
| Dễ chịu cho mắt + kẻ thẳng (18/11) | ✅ | Cài đặt → **Dễ chịu cho mắt**: góc nhìn 50–100° (mặc định 70°), quay đầu và đi mượt, tối viền khi di chuyển nhanh, chấm giữa màn hình. Đổi góc nhìn (bay quanh, hướng nhìn, đi tới điểm trên bản đồ) trượt mượt 0,45 giây thay vì nhảy. Vẽ và Vạch dấu: giữ **Shift** hoặc bấm nút **Thẳng** (cho điện thoại) để đường luôn ngang / dọc / chéo 45°. Thanh Vẽ dàn lại 2 hàng gọn. |

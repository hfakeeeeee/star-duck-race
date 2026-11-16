# STAR Duck Race

Phương án A đã duyệt: phòng chờ chia danh sách và PIN/QR; cuộc đua toàn màn hình.
Màu từ https://star-education.net/: navy #172b63, gold #d2aa61, white.
Font Be Vietnam Pro; fallback system sans. Bề mặt phẳng, viền nhẹ; home/phòng chờ theo hướng Bến sông STAR với mảng màu giấy ấm, xanh nước và navy. Glass dành cho bảng hạng/kết quả.
UI tiếng Việt. Admin desktop; người chơi điện thoại responsive. Chế độ thử nghiệm, chưa tích hợp STAR.
Tối đa 200 người. Kết quả và thời gian do máy chủ quyết định.

## Nâng cấp trò chơi được duyệt 15/11/2026

Đường đua 3D gốc dựng bằng Three.js, không sử dụng tài sản của Random Duck Race.
4 cảnh: Công viên STAR, Sân vận động, Hoàng hôn, Giáng sinh. 12 kiểu vịt có phụ kiện riêng.
Giao diện quản trị/phòng chờ giữ nhận diện navy/gold. HUD trong game dùng navy với tên dẫn đầu màu vàng.
Camera theo dẫn đầu / toàn cảnh / vịt của tôi; bảng hạng trực tiếp, minimap và nhãn top 5 + người chơi.
Vịt đầu chạm vạch đúng timer; mọi vịt khác cán đích trong tối đa 8 giây tiếp theo.
Mô phỏng tốc độ luôn dương, cùng dữ liệu trên mọi thiết bị; thứ hạng suy từ quỹ đạo, không kéo về thứ hạng trong 3 giây cuối.
Nhạc gốc tổng hợp Web Audio, cổ vũ có giới hạn tần suất, pháo giấy, xem lại cục bộ, CSV/PNG.
Giữ bản admin thử nghiệm và phạm vi riêng tư, chưa tích hợp tài khoản STAR.

## Chỉnh chuyển động theo phản hồi 15/11/2026

Thẻ bảng hạng trượt 450 ms giữa các ô cố định; có chỉ báo lên/xuống và giữ khóa theo người chơi.
Vạch xuất phát đặt giữa lòng sông, trải đủ chiều ngang 26 đơn vị.
Âm thanh mặc định bật; thử phát ngay và mở lại AudioContext ở thao tác đầu tiên nếu autoplay bị trình duyệt chặn.
Thêm cảnh Đêm ánh sao (night) với ánh trăng, đèn bờ sông và bảng tên tương phản.
Đồng hồ WebGL chạy bằng performance.now, điều chỉnh sai số đồng bộ từ từ, không đặt lại theo render React.
Camera làm mượt cả vị trí và hướng nhìn, đáp ứng nhất quán theo thời gian ở các tần số frame khác nhau.

## Xuất phát, dòng sông và nhạc nền

Tất cả mỏ vịt ở cùng tọa độ xuất phát trong suốt đếm ngược; không còn khoảng lùi ngẫu nhiên.
Làn được chia đối xứng theo số người, camera bám đua thấp hơn và gần hơn, nhìn gần ngang.
Camera bám kết hợp vịt dẫn đầu với nhóm đầu để chuyển người dẫn đầu không kéo góc nhìn đột ngột.
Quỹ đạo phiên bản 3 khởi động êm trong 0,35 giây, biên độ tốc độ hành trình 66,5–133,5% trước chuẩn hóa.
Các cuộc đua đã lưu dùng quỹ đạo cũ và giữ nguyên kết quả/thời gian; mọi phiên bản đều đứng chung vạch lúc bắt đầu.
Nước dùng nhiều lớp sóng, pháp tuyến theo sóng, gợn nhỏ, phản sáng theo góc nhìn và bọt nước gần bờ.
Vịt nổi theo cùng cao độ sóng; vệt nước phía sau thay đổi theo vận tốc. Chế độ nhẹ giảm số đỉnh mặt nước.
Hai bản nhạc gốc Ngày hội STAR / Groove bên dòng sông có trống, bass, hợp âm, giai điệu và biến tấu.
Nhịp nhạc được lên lịch theo AudioContext, độc lập với tốc độ khung hình; âm lượng và tạm dừng có chuyển êm.

## Căn góc máy và bố trí HUD

Mỏ vịt ở x = -3,25 khi chuẩn bị, cách mép sau toàn bộ dải xuất phát 0,7 đơn vị; thân không đè lên vạch.
Tọa độ hiển thị được ánh xạ lại để vịt vẫn chạm đích x = 160 đúng thời gian mô phỏng.
Toàn cảnh dùng camera trực giao nhìn thẳng xuống: bốn góc đường đua là góc vuông, không co hẹp theo phối cảnh.
Trên màn hình dọc, toàn cảnh quay đường đua theo trục dọc và chừa khoảng trống cho HUD ở hai đầu.
Camera bám đua chỉ nghiêng xuống theo trục ngang sông, vị trí máy và điểm nhìn cùng X, bờ sông nằm ngang.
HUD được tách: đồng hồ nhỏ nền navy ở trên trái, thẻ người dẫn đầu ở trên phải, minimap cân giữa phía dưới.
Minimap gộp cự ly, số vịt và số đã cán đích; chấm vịt giữ làn ổn định khi đổi hạng. Bỏ dòng credit rời ở đáy.
Giữ màu navy/gold, thêm biến thể nền tối, bố cục gọn cho điện thoại; nhãn vịt tránh vùng HUD trên và dưới.

## Giao diện một khung nhìn và vịt thử nghiệm

Mỗi bước tham gia, tạo phòng, phòng chờ và cuộc đua nằm trong 100dvh; không cuộn cả trang.
Danh sách người/phòng dài cuộn bên trong khung; bộ chọn vịt, cài đặt và kết quả dùng dialog có chiều cao giới hạn.
Trang đua bỏ header/footer quảng bá, dành phần lớn màn hình cho đường đua; bảng hạng mở theo yêu cầu.
Chế độ trình chiếu ẩn thanh công cụ, dùng trọn khung nhìn; nút Thoát trình chiếu hoặc Esc quay lại.
Tạo phòng có trường Vịt thử nghiệm 0–200. Cài đặt phòng chờ cho đổi số vịt thử mà giữ người thật và giới hạn tổng 200.
Vịt thử có nhãn riêng, không có quyền điều khiển; dùng cùng quỹ đạo công bằng như người thật.
QR thu gọn vẫn vuông, bấm để phóng to; thao tác bắt đầu và các nút chính luôn nằm trong khung nhìn.

## Vào đường đua trước, xuất phát sau

Nút phòng chờ là Vào đường đua, chỉ khóa danh sách và chuyển cả phòng sang trạng thái ready.
Trạng thái này giữ vịt đứng yên, chưa đếm ngược, không tự xuất phát dù chờ lâu hoặc tải lại trang.
Admin có thể chỉnh camera, bật trình chiếu rồi bấm Bắt đầu cuộc đua ngay trong màn game để đếm ngược 4 giây.
Giữ nguyên ID cuộc đua khi xuất phát để camera, trình chiếu và lựa chọn bảng hạng không bị đặt lại.
Admin có nút Về phòng chờ trước khi xuất phát; mọi người được giữ và phòng được mở khóa lại.
Bảng hạng mặc định ẩn khi vào đường đua, kể cả trình chiếu; người xem chủ động mở bằng nút Bảng hạng.
Desktop dành cột riêng cho bảng hạng, điện thoại dùng dải gọn ở dưới; HUD co theo chiều cao mặt sông thực tế.

## Âm thanh và trao giải

Dùng một AudioContext chung qua các bước để giữ âm lượng, nút tắt tiếng và tránh phát hai nền nhạc chồng nhau.
Phòng chờ có nhạc lobby; màn chưa xuất phát có nhạc ready khác; cuộc đua dùng track đã chọn, trao giải dùng nền podium nhẹ.
Có âm báo người mới vào và phản hồi bấm nút. Ba bản quack CC0 được lưu tại public/audio, ghi nguồn ở CREDITS.md.
Mỗi lần HUD đổi người dẫn đầu khi đang đua phát một quack ngẫu nhiên; không lặp mẫu ngay liền nhau, không phát bù khi bật tiếng lại.
Quán quân bật lên 1,3 giây sau khi mỏ chạm vạch, chỉ là hiệu ứng hiển thị, không đổi quỹ đạo hoặc thời gian cán đích.
Âm chạm đích tách khỏi fanfare và tiếng vỗ tay khi bảng top 3 xuất hiện.
Bảng xuất hiện sau cú bật và khi ba vịt đầu đã cán đích (hoặc cả hai nếu phòng chỉ có hai vịt); các vịt còn lại tiếp tục phía sau.
Bảng dùng liquid glass navy/gold, một lớp blur có fallback nền tối, thẻ thứ nhất ở giữa; giữ đọc được tên và thời gian trên nền đua.
Nút đua lại chỉ bật khi toàn bộ lượt đã kết thúc. Xem lại, CSV/PNG và bảng đầy đủ vẫn hoạt động.
Giảm chuyển động tắt cú bật và hiệu ứng mở bảng; tắt tiếng áp dụng cho nhạc, quack và các hiệu ứng cùng lúc.

## Avatar và chuyển cảnh 17/11/2026

Ảnh đại diện tùy chọn khi tham gia; có thể đổi hoặc xóa trong phòng chờ. Ảnh JPG/PNG/WebP tối đa 5 MB được cắt giữa, thu gọn JPEG 128 × 128 trước khi tải.
Ảnh lưu trong R2, phòng chỉ giữ URL để polling 200 người vẫn nhẹ. Quyền đổi ảnh gắn với token của chính người chơi và bị khóa khi vào đường đua.
Phòng chờ, bảng hạng trực tiếp, top 3, bảng kết quả và ảnh PNG dùng avatar; người chưa có ảnh hoặc ảnh lỗi vẫn hiện vịt.
Mô hình trên sông, làn, quỹ đạo và cơ hội thắng giữ nguyên theo kiểu vịt đã chọn.
Chuyển màn dùng màn quét ngôi sao navy/gold và các sao nhỏ tỏa ra trong 0,86 giây; không trì hoãn API hoặc đồng hồ đua.
Không phát lại chuyển cảnh theo mỗi lần polling; giảm chuyển động tắt màn quét, trang vẫn chuyển ngay và nút thao tác không bị chặn.

## Bến sông STAR và giao diện sáng/tối — 17/11/2026

Người dùng cho phép tự chọn hướng và dựng luôn. Home ưu tiên việc nhập PIN, chọn vịt/avatar và vào phòng; phòng chờ ưu tiên đội hình, PIN/QR và nút vào đường đua.
Home dùng mảng bến sông bên trái, form không khung bên phải. Mobile là banner bến sông gọn trên form; màn ngang vẫn hai cột. Ô nhập trơn, không thêm icon bên trái.
Phòng chờ giữ danh sách và khu mời bạn, thêm banner navy mang tên phòng, nền giấy ấm và sông nhỏ trong thẻ mời ở màn đủ cao. Người chơi có vùng chờ xanh nước riêng.
Mỗi loại control dùng lại component hiện có: SkinPicker, AvatarPicker, Dialog, Avatar, DropdownMenu; font Be Vietnam Pro, logo và vai màu STAR giữ nguyên.
Sắc: Tinted theo yêu cầu có màu hơn. Navy là nhận diện; vàng là điểm nhấn/hành động trên nền tối; xanh nước dành cho cảnh bến sông. Không dùng màu trang trí để thay nghĩa trạng thái.

Theme dùng next-themes đã có trong dự án: Sáng / Tối / Hệ thống, mặc định Hệ thống, nhớ theo thiết bị ở khóa `star-duck-theme`. Script áp theme trước khi vẽ, không lóe nền sáng; menu mở ba lựa chọn cùng lúc và đánh dấu mục đã chọn.
Token giao diện ở `components/theme.css`; màu/font gốc ở `app/globals.css`. Nền tối có các tầng trang → bề mặt → hộp thoại sáng dần; ô nhập, menu, avatar picker, HUD, đếm ngược và tạm dừng đều có màu tối riêng. Theme giao diện không đổi khung cảnh 3D mà admin đã chọn.

Motion dùng CSS transform/opacity: vịt nhấp nhô lệch nhịp, hai lớp dòng nước trôi, sao nhỏ nhấp nháy, thẻ người mới hiện vào và số người pop một lần. Không đặt animation vô hạn trên 200 thẻ; key người chơi giữ nguyên khi polling nên thẻ không xuất hiện lại. Giảm chuyển động tắt các motion trang và menu.
Luồng: Home → nhập PIN/tên, chọn vịt/ảnh → phòng chờ → admin đưa cả phòng vào đường đua → bắt đầu tại màn đua. Không thêm bước hoặc dữ liệu giả vào luồng thật. Không cần nối thêm API.

Kiểm bằng mắt: thẻ người chơi cùng chiều cao; nút/đường dẫn nhận ra được; form home bỏ khung lồng; banner/đội hình/khu mời tách rõ; vùng rộng dành cho cảnh sông và đội hình; nút Vào phòng chờ/Vào đường đua là hành động chính. Màn 320 px dùng danh sách một cột để tên dễ đọc.
Kiểm trình duyệt: light/dark/system, lưu lựa chọn sau reload, đổi theme theo hệ thống, menu bàn phím, reduced-motion, 320/375/768/844/1440/1920; avatar và cuộc đua vẫn dùng dữ liệu phòng thật. Ảnh và báo cáo đối chiếu ở `outputs/qa-club` (không đưa vào bản triển khai).

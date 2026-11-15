# STAR Duck Race

Phương án A đã duyệt: phòng chờ chia danh sách và PIN/QR; cuộc đua toàn màn hình.
Màu từ https://star-education.net/: navy #172b63, gold #d2aa61, white.
Font Be Vietnam Pro; fallback system sans. Flat surfaces, viền nhẹ, không bóng trang trí.
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

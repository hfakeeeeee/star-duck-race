# STAR Duck Race

Web app đua vịt bằng tiếng Việt, theo phương án A đã duyệt. Màu thương hiệu lấy từ star-education.net: navy `#172B63`, gold `#D2AA61`, trắng.

## Chạy tại máy

Yêu cầu Node.js 22.13 trở lên (khuyên dùng Node 22 LTS mới nhất).

```powershell
npm install
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_lumpy_bastion.sql
npm run dev
```

Tên file migration thực tế nằm trong `drizzle/`; dùng đúng tên file được tạo ở đó. Chạy mỗi migration một lần, theo thứ tự. `npm run dev` in địa chỉ local, thường là `http://localhost:5173`.

Trang tham gia: `/`. Trang quản trị: `/?view=admin`. Nút **Đăng nhập thử nghiệm** dùng auth mock của starter trên localhost, không cần tài khoản STAR. Đăng xuất rồi dùng cửa sổ ẩn danh để thử người chơi. Bản local chỉ bật đăng nhập mock trên loopback. QR luôn trỏ tới origin hiện tại: QR localhost không truy cập được từ điện thoại khác.

## Chức năng

- Admin tạo phòng: tên, thời lượng 10–1.800 giây, PIN 6 chữ số và QR thật.
- Người chơi nhập PIN/tên, chọn một trong 12 kiểu vịt, vào phòng chờ; tối đa 200 người/phòng. Chặn tên trùng không phân biệt hoa thường. Một thiết bị tham gia lại không tạo bản ghi trùng.
- Admin nhập danh sách bằng dán tên, CSV/TXT/TSV hoặc Excel `.xlsx` (trang tính đầu); chọn cột tên và xác nhận dòng tiêu đề. Import được áp dụng nguyên lô, không thêm dở khi có lỗi. Tệp được đọc ngay trên trình duyệt; máy chủ chỉ nhận tên.
- Admin khóa/mở phòng, xóa người, bắt đầu, tạm dừng/tiếp tục, kết thúc sớm, đóng phòng, đua lại giữ danh sách hoặc loại người thắng.
- Đường đua Three.js/WebGL 3D với 5 khung cảnh (gồm Đêm ánh sao), phụ kiện vịt, nước chuyển động, camera theo dẫn đầu/toàn cảnh/vịt của tôi, minimap, bảng hạng trượt khi đổi vị trí và nhãn người dẫn đầu.
- Đếm ngược trước xuất phát; đồng hồ và hoạt cảnh dựa trên giờ máy chủ. Các seed ngẫu nhiên độc lập sinh quỹ đạo tốc độ dương; thứ hạng suy ra từ quỹ đạo. Tên, skin và làn không ảnh hưởng khả năng thắng.
- Vịt đầu chạm vạch đúng thời lượng đặt trước; các vịt khác lần lượt cán đích trong tối đa 8 giây tiếp theo. Thời gian đua không tính lúc tạm dừng. Kết thúc sớm giữ nguyên kết quả/quỹ đạo của lượt đó.
- Bục top 3, thời gian từng vịt, khoảng cách thời gian so với vịt đầu, CSV và PNG đủ toàn bộ danh sách. Xem lại trên máy của mình ở ¼×, ½×, 1× và tua theo timeline, không ảnh hưởng người khác.
- Biểu cảm cổ vũ được đồng bộ (giới hạn 1 lần/1,5 giây/người), pháo giấy chiến thắng, hai bản nhạc tổng hợp gốc bằng Web Audio, âm báo đổi ngôi/xuất phát/chiến thắng và điều chỉnh âm lượng. Âm thanh mặc định bật; nếu trình duyệt chặn autoplay, AudioContext được mở ở lần chạm hoặc nhấn phím đầu tiên. Người dùng vẫn có nút tắt tiếng.
- Hai mức đồ họa, mô hình vịt dùng instancing cho 200 người; có Canvas 2D nhẹ nếu thiết bị không hỗ trợ WebGL. Space để admin tạm dừng/tiếp tục, M bật/tắt âm thanh; phím tắt bỏ qua khi đang nhập dữ liệu.
- Phòng và danh sách lưu trong D1; tải lại trang không mất dữ liệu. Token thiết bị lưu cục bộ, máy chủ chỉ lưu SHA-256. PIN hết hiệu lực sau 24 giờ.
- Avatar ảnh tùy chọn (JPG/PNG/WebP, tối đa 5 MB): cắt giữa và thu gọn JPEG 128 px trước khi lưu R2. Bảng hạng/top 3/PNG hiện ảnh; trên sông vẫn là vịt. Có thể đổi/xóa ảnh trong phòng chờ.
- Bảng hạng mặc định ẩn khi vào cuộc đua. Chuyển trang có hiệu ứng ngôi sao STAR, tự tắt khi người dùng bật giảm chuyển động.

## Đồng bộ và giới hạn

Client đọc trạng thái mỗi 700 ms; hoạt cảnh nội suy theo thời gian bằng WebGL và cùng công thức trên mọi máy. Độ trễ mạng có thể khiến thiết bị nhận trạng thái bắt đầu/tạm dừng hoặc kết quả muộn. Đồng hồ bù theo thời gian phản hồi máy chủ. Xếp hạng không đổi khi tải lại.

WebGL dùng đồng hồ đơn điệu riêng theo frame; các mẫu thời gian từ giao diện hoặc máy chủ không làm đặt lại tiến trình hoạt cảnh. Hiệu chỉnh clock nhỏ được trải dần, camera làm mượt cả vị trí lẫn hướng nhìn theo delta thời gian. Tạm dừng, tiếp tục và tua replay vẫn đổi trạng thái ngay theo thao tác.

Các cập nhật phòng dùng compare-and-swap theo version trong D1 để tránh ghi đè và vượt sức chứa khi nhiều người tham gia đồng thời. Thứ hạng và thời gian kết quả chỉ được API công bố khi vịt đầu về đích. Seed/quỹ đạo được gửi để mọi thiết bị có thể vẽ và xem lại giống nhau, vì vậy người phân tích dữ liệu vẫn có thể tính trước kết quả. Đây là mô phỏng xác định cho hoạt náo, không phải mô phỏng thủy động lực học đầy đủ hoặc rút thăm có chứng nhận. Việc bình đẳng cơ hội dựa trên seed độc lập và luật chung cho mọi vịt, không phải một kiểm toán thống kê độc lập.

## Admin mock và tích hợp sau

Bản này **chưa tích hợp source hoặc tài khoản STAR**, theo yêu cầu. Bản Sites được giữ **riêng tư cho chủ sở hữu**, sử dụng danh tính ChatGPT đã được nền tảng xác thực. Bản local dùng mock sign-in của starter; các API điều khiển đều kiểm tra người đăng nhập và chủ phòng.

Trước khi cho học viên truy cập công khai: thay hàm `identity()` trong `app/api/[...path]/route.ts` bằng kiểm tra phiên đăng nhập STAR và danh sách admin được phép; thay endpoint `/api/me` tương ứng; thêm rate limit tại gateway. Không công khai bản mock hiện tại, vì tài khoản đã đăng nhập được xem là admin thử nghiệm. Người chơi chỉ cần PIN/tên, không cần tài khoản STAR.

## Kiểm tra

```powershell
npm test
npx tsc --noEmit
npm run build
```

Các test kiểm tra giới hạn 200, khóa phòng, tham gia lại, CSV có dấu ngoặc kép, batch trùng, quỹ đạo 200 vịt tiến liên tục, thời điểm cán đích của từng vịt, clock tạm dừng/tiếp tục, xem lại xác định và không lộ token trong dữ liệu công khai. Browser QA kiểm tra UI chọn vịt, import, 3D thật, camera, 200 vịt, đồng bộ giữa các phiên, xuất tệp, replay và auth. Playwright cài riêng ở thư mục tạm, không thêm dependency vào ứng dụng.

## Công nghệ

React 19 + TypeScript, Vinext/Vite, Three.js, Cloudflare Worker + D1/Drizzle. QR tạo bằng `qrcode`, đọc Excel bằng `read-excel-file`, icon Lucide. Vịt, môi trường và nhạc là nội dung gốc được tạo bằng mã; không sao chép tài sản từ trang tham chiếu. Giữ tích hợp Sites để đóng gói/triển khai; schema migration do Drizzle quản lý. Nâng cấp này mở rộng dữ liệu JSON, không cần migration mới.

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
- Người chơi nhập PIN/tên, vào phòng chờ; tối đa 200 người/phòng. Chặn tên trùng không phân biệt hoa thường. Một thiết bị tham gia lại không tạo bản ghi trùng.
- Admin khóa/mở phòng, xóa người, bắt đầu, đóng phòng và đua lại giữ danh sách.
- Đếm ngược trước xuất phát; đồng hồ và hoạt cảnh dựa trên giờ máy chủ. Máy chủ chọn thứ hạng bằng Fisher–Yates với `crypto.getRandomValues`, mỗi người có xác suất thắng bằng nhau.
- Vịt thắng chạm đích tại mốc hết giờ, có bục top 3, xếp hạng đầy đủ, xuất CSV, tùy chọn âm báo và toàn màn hình.
- Phòng và danh sách lưu trong D1; tải lại trang không mất dữ liệu. Token thiết bị lưu cục bộ, máy chủ chỉ lưu SHA-256. PIN hết hiệu lực sau 24 giờ.

## Đồng bộ và giới hạn

Client đọc trạng thái mỗi 800 ms; hoạt cảnh chạy bằng Canvas và cùng công thức trên mọi máy. Độ trễ mạng có thể khiến thiết bị nhận trạng thái bắt đầu hoặc kết quả muộn. Đồng hồ bù theo thời gian phản hồi máy chủ. Xếp hạng không đổi khi tải lại.

Các cập nhật phòng dùng compare-and-swap theo version trong D1 để tránh ghi đè và vượt sức chứa khi nhiều người tham gia đồng thời. Kết quả được giữ trên máy chủ cho đến 3 giây cuối để hoạt cảnh hội tụ; vì được gửi lúc đó, người mở devtools có thể xem kết quả sớm tối đa 3 giây. Đây là công cụ hoạt náo, không phải hệ thống rút thăm có chứng nhận hoặc phục vụ tiền cược.

## Admin mock và tích hợp sau

Bản này **chưa tích hợp source hoặc tài khoản STAR**, theo yêu cầu. Bản Sites được giữ **riêng tư cho chủ sở hữu**, sử dụng danh tính ChatGPT đã được nền tảng xác thực. Bản local dùng mock sign-in của starter; các API điều khiển đều kiểm tra người đăng nhập và chủ phòng.

Trước khi cho học viên truy cập công khai: thay hàm `identity()` trong `app/api/[...path]/route.ts` bằng kiểm tra phiên đăng nhập STAR và danh sách admin được phép; thay endpoint `/api/me` tương ứng; thêm rate limit tại gateway. Không công khai bản mock hiện tại, vì tài khoản đã đăng nhập được xem là admin thử nghiệm. Người chơi chỉ cần PIN/tên, không cần tài khoản STAR.

## Kiểm tra

```powershell
npm test
npx tsc --noEmit
npm run build
```

Các test kiểm tra giới hạn 200, khóa phòng, tham gia lại, tên/thời lượng, xếp hạng đủ người, thời điểm về đích và không lộ token trong dữ liệu công khai. Browser QA dùng Playwright cài riêng ở thư mục tạm, không thêm dependency vào ứng dụng.

## Công nghệ

React 19 + TypeScript, Vinext/Vite, Cloudflare Worker + D1/Drizzle. QR tạo bằng `qrcode`, icon Lucide, vịt SVG/Canvas tự vẽ. Giữ tích hợp Sites để đóng gói/triển khai; schema migration do Drizzle quản lý.

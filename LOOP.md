# Vòng lặp tự kiểm — hợp đồng cho agent chạy không cần hỏi

Mọi agent làm việc trong repo này chạy theo vòng **làm → đo → sửa → lặp**, và chỉ dừng khi
mục tiêu KIỂM CHỨNG ĐƯỢC BẰNG MÁY đã xanh. Không hỏi giữa chừng, không bàn giao một việc
"gần xong".

Repo này hợp với cách làm đó hơn hầu hết repo khác, vì thứ khó nhất đã có sẵn: **một bậc
thang lệnh nói đúng/sai mà không cần người đọc**. Đó là tín hiệu dừng. Không có nó thì
"vòng lặp" chỉ là đoán nhiều lần.

## Hàng đợi sống ở đâu: Kanzo (bảng kanban trên máy)

Từ 3/11/2026 hàng đợi việc nằm ở **Kanzo**, không ở file markdown nữa. Board tại
`http://localhost:4242`, project `pe-usth`, dữ liệu ở `~/kanzo/kanzo.db`.

```
kanzo                      # bật board (đang chạy thì bỏ qua)
claude mcp add kanzo --scope user -- kanzo mcp    # đã chạy, chỉ cần một lần
```

Phiên có MCP `kanzo` thì dùng tool trực tiếp; không có thì gọi
`http://localhost:4242/mcp` khi board đang chạy.

**Nếp làm, do chính Kanzo dặn:** `next_task` khi bắt đầu (nó tự chuyển sang
`doing`) · `add_comment` nói đã làm gì · `update_task` sang `review` khi xong
hoặc khi tắc. **`done` và task gắn `human` để NGƯỜI quyết** — agent không tự
đóng việc của mình.

**Vì sao đổi, và đây là số đã đo:** hàng đợi dạng markdown tốn ~2 913 token mỗi
lần đọc cộng ~1 000 mỗi lần viết lại; Kanzo tốn ~900 token mô tả tool một lần
mỗi phiên, phản hồi 10–60 token mỗi lượt. Hoà vốn sau khoảng một lượt.

**Thứ KHÔNG chuyển sang Kanzo:** phần "đã bác bỏ, kèm lý do đã đo" và mọi bẫy
trong `AGENTS.md`. Đó là KIẾN THỨC, không phải việc — và SQLite ngoài repo thì
không review được trong PR, không đi theo một lần clone, không ai đọc được khi
Kanzo không chạy.

**MỖI TASK phải trả lời bốn câu**, vì thiếu câu nào thì nó không phải mục tiêu
mà chỉ là một ý tưởng: *xong là gì* (một con số hoặc một lệnh nói đúng/sai, không
phải "cải thiện") · *ai đi qua* (màn nào, bao nhiêu chỗ) · *có cần nạp DB không*
(việc đó bị chặn với agent nên nó đổi thứ tự làm) · *đã đo được gì*.

## Bậc thang — chạy theo đúng thứ tự này

Chạy từ rẻ tới đắt, dừng ở bậc đầu tiên ĐỎ và sửa ngay tại đó. Leo lên bậc sau khi bậc
trước xanh; bậc sau đỏ thì quay lại chạy LẠI từ bậc một (sửa ở tầng trên hay làm đỏ tầng
dưới).

| # | Lệnh | Nói được điều gì |
|---|---|---|
| 1 | `npm run typecheck` · `cd frontend && npx tsc --noEmit` | hình dạng dữ liệu còn khớp |
| 2 | `py scripts/pe-da/build.py` | nguồn dựng được, và các CỔNG trong `main()` còn đúng |
| 3 | `py scripts/pe-da/check.py --strict` | cấu trúc bài, ảnh, sơ đồ, vết, ca chấm, ký tự DB |
| 4 | `py -I scripts/pe-da/check_vanphong.py` | văn phong — **không luật nào được TĂNG** |
| 5 | `node scripts/pe-da/check-pyodide.mjs [mã,cách,nhau,phẩy]` | code bài CHẠY THẬT, khớp `expected` |
| 6 | `node scripts/pe-da/check-practice.mjs` | lời giải mẫu đạt, lời giải sai trượt, cổng file dữ liệu |
| 7 | `npx jest --ci --runInBand` · `cd frontend && npm run test:unit` | hợp đồng mã |
| 8 | lint bằng ĐÚNG lệnh CI (xem AGENTS.md) | trần, chỉ được hạ |
| 9 | `node scripts/check-duong-toi.mjs` | **có ai đi qua không** — xem dưới |

Việc nào không chạm giáo trình thì bỏ bậc 2–6; việc nào không chạm `src/` thì bỏ bậc 7.
Đừng chạy bậc không liên quan — nó chỉ tốn thời gian và làm nhiễu tín hiệu.

## Bốn luật dừng

**Xanh hết ⇒ xong.** Không thêm "cho chắc". Không dọn thứ không ai yêu cầu.

**Đỏ mà không hiểu ⇒ ĐO, đừng đoán.** Repo này ghi lại hàng chục lần một con số đoán ra
đã sai: `loadPackage` không ném khi thiếu wheel, `SIGALRM` có mà `setitimer` không, 12 tên
file đi qua zipfile nguyên vẹn. Mọi con số trong báo cáo phải đến từ một lệnh bạn đã chạy.

**Đỏ vì một ràng buộc thật ⇒ DỪNG và báo.** Ví dụ: cần ghi DB production, cần file chỉ có
trên máy chủ dự án, cần một quyết định sản phẩm. Dừng ở đó, nói rõ đã làm tới đâu và lệnh
để người ta chạy tiếp. **Đừng đi vòng, và đừng nhờ agent khác làm hộ thứ bạn bị chặn.**

**Nhiệm vụ không làm ĐÚNG được ⇒ KHAI BẤT KHẢ — và đó là một kết quả hợp lệ, không
phải thất bại.** Luật trên nói về ràng buộc BÊN NGOÀI. Luật này nói về nhiệm vụ TỰ MÂU
THUẪN: bộ kiểm đòi một hành vi mà đặc tả cấm; ca test khẳng định một con số mà bản dựng
thật không ra; "làm cho xanh" chỉ đạt được bằng cách đổi assert hoặc đặc-cách đúng đầu
vào của test. Khi đó báo đúng như vậy rồi dừng: chỉ ra HAI vế mâu thuẫn, số đo của mỗi
vế, và quyết định cần ai đưa ra. Không đổi assert cho khớp, không nới trần, không viết
nhánh `if` riêng cho dữ liệu test.
Vì sao phải viết ra thành luật: trên ImpossibleBench (nhiệm vụ CỐ Ý không làm được), các
mô hình Claude **>79% số lần là SỬA TEST**; cho phép khai bất khả hạ tỉ lệ gian lận
**54% → 9%**; prompt lỏng thì NÂNG nó lên **66%**; cho thêm lượt thử lại cũng NÂNG
**33% → 38%**. Nên đỏ mà không hiểu thì quay về luật thứ hai — ĐO — chứ đừng thử lại
cho tới khi may mắn xanh. **Giới hạn của các con số này:** chúng đo trên benchmark,
nơi phần thưởng CHÍNH LÀ test; chưa có số nào từ một repo sản phẩm có người duyệt
(xem mục 7 của `reports/Hướng đi tối ưu tiếp theo.md`).

## Bốn cách làm vòng lặp nói dối — đều đã xảy ra ở repo này

**Nới phép kiểm cho xanh.** Nếu bạn thấy mình đang sửa bộ kiểm chứ không sửa việc, dừng
lại. Một luật rộng hơn lý do của chính nó thì chặn sai chỗ: luật "cấm trộn hai hợp đồng"
cấm MỌI bài, trong khi tác hại chỉ có ở bài khai `contract` — và nó chặn đúng cách duy
nhất cứu được một ca chấm. Thu luật về đúng lý do thì được; nới cho qua thì không.

**Đo song song.** Ba bộ test backend và một bộ frontend đọc thẳng `scripts/pe-da/out/lessons.json`.
Chạy test trong lúc có ai đó `build.py` là đọc file đang ghi dở — đo được 10/470 ca đỏ GIẢ.
**Dựng xong rồi mới đo.** Tranh CPU là một kiểu nói dối khác, cùng hậu quả.

**Xanh vì không ai đi qua.** Hình dạng lỗi thống trị của repo: *dựng xong mà không có
đường tới người dùng* — đã **MƯỜI** lần. Bộ kiểm xanh không chứng minh có ai dùng được.
Mỗi việc phải trả lời: **ai bấm vào nó, ở màn nào.** Không trả lời được thì việc chưa xong.

Câu hỏi đó từng chỉ nằm ở đây, trong một file văn xuôi — mà một câu hỏi trong văn xuôi
thì không chặn được ai bỏ qua nó, và nó đã bị bỏ qua mười lần. Nay câu TRẢ LỜI có chỗ
giữ: `scripts/ban-do-tinh-nang.mjs` khai từng tính năng kèm nơi thực hiện, nơi MOUNT, và
một phép ĐẾM chạy trên bản dựng thật. Bậc 9 bắt nó phải đúng:

- `thucHien` trỏ trúng file + ký hiệu còn tồn tại (đổi tên hàm ⇒ đỏ);
- `mount` có thật **và có dấu hiệu dựng tính năng đó** — đây là phép kiểm "ai bấm vào nó";
- phép đếm ≥ sàn, đếm trên `out/lessons.json` chứ không phải một hằng gõ tay;
- đếm 0 thì **bắt buộc** khai `chuaCoDuongToi` kèm lý do — "chưa ai đi qua" được phép tồn
  tại, im lặng thì không;
- và ngược chiều: khai "chưa có đường tới" mà đếm > 0 cũng ĐỎ, kẻo bản đồ chỉ trôi theo
  một chiều rồi thành một danh sách than thở.

Thêm một tính năng người học thấy được ⇒ thêm một mục vào bản đồ. Đó là chỗ duy nhất
trong repo buộc phải viết ra ai đi qua nó.

**Ablate để biết test có răng.** Gỡ bản sửa ra, chạy lại, ĐẾM số ca đỏ, ghi con số đó vào
báo cáo. Gỡ ra mà vẫn xanh nghĩa là test không canh gì — viết lại test, đừng ghi "đã có
test".

## Mẫu báo cáo

Kết quả từng bậc đã chạy kèm **số thật** · ablate từng mảnh kèm **số ca đỏ** · thứ bạn
CHỦ Ý không làm kèm lý do · thứ bị chặn kèm lệnh bàn giao. Không có mục nào trong bốn mục
đó thì báo cáo chưa đọc được.

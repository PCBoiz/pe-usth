# Runner — bộ chạy mã Python cho Programming EDU

App Node độc lập, đặt trên một VM Linux có Docker. Backend (NestJS, trên Render — **không có Docker**) gửi mã tới đây qua HTTPS; runner chạy mã trong một container dùng một lần rồi trả `stdout`/`stderr`.

```
Trình duyệt (Vercel) ──► Backend NestJS (Render) ──HTTPS + Bearer──► Caddy :443 ──► runner 127.0.0.1:8080 ──► docker run py-sandbox
                         PY_RUNNER_MODE=remote                      (VM Azure Ubuntu)
```

- Runner **không** phụ thuộc Prisma, DB hay NestJS. Logic chạy docker nằm ở **một** file dùng chung với backend: [`../src/python-runner/sandbox/docker-sandbox.ts`](../src/python-runner/sandbox/docker-sandbox.ts) (cách ly, giờ chặn, `docker kill`, dọn thư mục tạm). `npm run build` gộp file đó vào `dist/server.js`; **đừng chép nó sang đây** — sửa ở một chỗ thì backend (chế độ `local`) và runner cùng đổi.
- Mỗi lượt chạy: không mạng, FS chỉ đọc, 1 CPU, RAM theo `PY_RUN_MEMORY` (mặc định 1 GB), 128 tiến trình, `--cap-drop ALL`, `--security-opt no-new-privileges`, user không phải root.

## Yêu cầu phiên bản

| Thành phần | Phiên bản |
|---|---|
| **Node** | **≥ 22.12** (khuyên dùng 22 LTS). `engines` trong `package.json` ghi đúng điều này. |
| Docker Engine | bản hiện hành từ kho apt chính thức của Docker |
| Ubuntu | 22.04 hoặc 24.04 |

`node --env-file` (dùng trong `npm start` và pm2) có từ Node 20.6. Đã kiểm với **Node v22.23.3** (bản chính thức từ nodejs.org, kiểm checksum) và v24.21.0: nạp `.env`, nghe đúng cổng, `/health` và `/run` chạy; thiếu `RUNNER_SECRET` thì thoát mã 1 kèm thông báo; file `.env` không tồn tại thì Node tự báo `not found` và không chạy. Việc kiểm này làm trên **Windows**; các lệnh cài đặt Ubuntu bên dưới dựa theo tài liệu chính thức nhưng **chưa chạy trên VM Ubuntu thật** — hãy chạy từng bước và đọc kết quả.

## 1. Tạo VM Azure

1. Ubuntu Server 22.04/24.04. Chọn cỡ VM theo mục [Chọn cỡ VM và hàng đợi](#chọn-cỡ-vm-và-hàng-đợi) bên dưới. Ví dụ: VM 4 vCPU / 8 GB chạy `PY_RUN_MAX_CONCURRENT=4`, `PY_RUN_MEMORY=1.5g`; `Standard_B2s` (2 vCPU, 4 GB) chạy `PY_RUN_MAX_CONCURRENT=2`, `PY_RUN_MEMORY=1g`.
2. **Dùng VM riêng cho runner**, đừng đặt chung với thứ gì có dữ liệu quan trọng (xem mục *Bảo mật*).
3. Tường lửa (Network security group), chiều vào:
   - `22/tcp` — **chỉ IP của bạn**.
   - `80/tcp` và `443/tcp` — mở (Caddy cần 80 để lấy chứng chỉ HTTPS).
   - **Không mở 8080.** Runner chỉ nghe `127.0.0.1`.
4. **Tên miền miễn phí của Azure:** Portal → VM → *Networking* → bấm vào *Public IP* → *Configuration* → ô **DNS name label** → nhập tên, ví dụ `pe-runner` → Save. Tên đầy đủ có dạng:

   ```
   <tên>.<region>.cloudapp.azure.com        ví dụ: pe-runner.southeastasia.cloudapp.azure.com
   ```

   Tên này trỏ đúng vào IP hiện tại của VM, đủ để Caddy lấy HTTPS tự động. (`<region>` là vùng của VM, ví dụ `southeastasia`, `eastasia`.)

## 2. Cài đặt trên Ubuntu

### Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
sudo usermod -aG docker $USER      # rồi đăng xuất/đăng nhập lại để có hiệu lực
docker run --rm hello-world        # kiểm tra
```

### Node 22 và pm2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version                      # phải >= v22.12.0
sudo npm install -g pm2
```

### Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

## 3. Lấy mã và build image sandbox

```bash
git clone <URL-repo> ~/pe && cd ~/pe
docker build -t py-sandbox docker/py-sandbox      # python:3.12-slim + numpy/pandas/psutil, user uid 1000
```

Thử image đúng như runner sẽ gọi (mount chỉ đọc, không mạng, bỏ capability):

```bash
mkdir -p /tmp/t && echo 'print(1+1)' > /tmp/t/main.py
docker run --rm --cpus=1 --memory=1g --memory-swap=1g --pids-limit=128 --network=none --read-only \
  --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:size=64m \
  --mount type=bind,source=/tmp/t,target=/code,readonly py-sandbox python /code/main.py     # → 2
```

## 4. Cấu hình và chạy runner

```bash
cd ~/pe/runner
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # in ra khoá 64 ký tự
nano .env                    # dán khoá vào RUNNER_SECRET; chỉnh PY_RUN_MAX_CONCURRENT theo cỡ VM
npm ci
npm run build                # → dist/server.js (một file, đã gộp sẵn logic docker dùng chung)
npm test                     # 46 ca; không cần Docker
```

Chạy thử một lần trước khi giao cho pm2:

```bash
npm start                    # = node --env-file=.env dist/server.js
curl http://127.0.0.1:8080/health          # {"ok":true,"docker":true}
```

Biến trong `.env` (xem [.env.example](.env.example)). Giá trị sai thì runner liệt kê **mọi** lỗi rồi thoát mã 1.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `RUNNER_SECRET` | — (bắt buộc) | khoá dùng chung với backend, ≥ 32 ký tự |
| `HOST` / `PORT` | `127.0.0.1` / `8080` | địa chỉ nghe (Caddy đứng trước) |
| `PY_SANDBOX_IMAGE` | `py-sandbox` | image build từ `docker/py-sandbox` |
| `PY_RUN_TIMEOUT_MS` | `10000` | hết giờ thì giết container |
| `PY_RUN_MAX_CONCURRENT` | `1` | số bài chạy **song song** (mỗi bài 1 CPU) |
| `PY_RUN_MEMORY` | `1g` | RAM mỗi bài, cho cả `--memory` và `--memory-swap`; nhận `1g`, `1.5g`, `1536m` (bắt buộc có đơn vị) |
| `PY_RUN_QUEUE_MAX` | `100` | số bài tối đa được **xếp hàng**; đầy thì 429 |
| `PY_RUN_QUEUE_TIMEOUT_MS` | `30000` | chờ quá lâu chưa tới lượt thì rút khỏi hàng và 429 |

### Chọn cỡ VM và hàng đợi

Mỗi bài được **1 CPU** và `PY_RUN_MEMORY` RAM. Đặt theo VM:

```
PY_RUN_MAX_CONCURRENT ≤ số vCPU                       (mỗi bài một nhân; > 1,5 × nhân chỉ bị cảnh báo)
PY_RUN_MAX_CONCURRENT × PY_RUN_MEMORY + 1,5 GB ≤ RAM  (1,5 GB chừa cho hệ điều hành + Docker + runner)
```

| VM | `PY_RUN_MAX_CONCURRENT` | `PY_RUN_MEMORY` | RAM cần |
|---|---|---|---|
| 2 vCPU / 4 GB | 2 | `1g` | 2 × 1 + 1,5 = 3,5 GB |
| 4 vCPU / 8 GB | 4 | `1.5g` | 4 × 1,5 + 1,5 = 7,5 GB |

**Runner tự kiểm công thức này lúc khởi động**, bằng `NCPU` và `MemTotal` do `docker info` báo (đó là máy thật đang chạy container, kể cả khi là Docker Desktop/WSL2):

- vượt RAM → **từ chối khởi động**, in số liệu (số bài × RAM, phần chừa, RAM thực có) và gợi ý giảm `PY_RUN_MAX_CONCURRENT` hoặc `PY_RUN_MEMORY`;
- `PY_RUN_MAX_CONCURRENT` > 1,5 × số nhân → chỉ cảnh báo trong log;
- Docker chưa lên lúc khởi động (máy vừa bật, pm2 khởi động trước daemon) → thử lại **5 lần cách 2 giây**, rồi vẫn khởi động kèm cảnh báo "chưa kiểm được cấu hình". Ngay khi `docker info` trả lời lần đầu (lúc có lượt chạy hoặc khi gọi `/health`) việc kiểm được làm lại; nếu lúc đó vượt RAM, runner **từ chối mọi lượt chạy bằng 503** (kèm log số liệu) và `/health` trả 503, cho tới khi bạn sửa cấu hình và khởi động lại runner.

**Hàng đợi.** Còn chỗ thì chạy ngay; hết chỗ thì vào hàng FIFO (ai đến trước chạy trước) thay vì bị từ chối. Chỉ khi hàng đầy (`PY_RUN_QUEUE_MAX`) hoặc chờ quá `PY_RUN_QUEUE_TIMEOUT_MS` mới trả 429 "Máy chủ đang quá tải, thử lại sau". Kết quả có thêm `queuedMs` (thời gian chờ trong hàng; `durationMs` vẫn chỉ là thời gian chạy). Hàng đợi nằm **trong bộ nhớ** của một tiến trình nên runner phải chạy đúng một tiến trình (`instances: 1` trong pm2) — không cần Redis.

**Client ngắt kết nối** (đóng/tải lại tab, backend hết giờ): bài còn đang chờ thì rút khỏi hàng và **không chạy**; bài đang chạy thì runner `docker kill` container đó để nhả chỗ ngay thay vì để nó chạy nốt tới hết giờ. Chỗ chạy luôn được nhả, dù bài lỗi, hết giờ hay bị kill.

`GET /health` (không cần khoá) trả `{ ok, docker, capacity: { status, message? }, slots, running, queued, queueMax }`; `capacity.status` là `ok` | `unchecked` (Docker chưa trả lời) | `insufficient` (HTTP 503, `ok: false`).

### pm2 (tự chạy lại, khởi động cùng VM)

```bash
cd ~/pe/runner
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd          # in ra MỘT lệnh sudo — chạy đúng lệnh đó, rồi: pm2 save
pm2 logs pe-python-runner
```

`ecosystem.config.cjs` dùng `node_args: '--env-file=.env'` và `instances: 1`. **Không tăng `instances`**: bộ đếm đồng thời nằm trong bộ nhớ từng tiến trình, hai tiến trình là hai giới hạn riêng và máy sẽ chịu gấp đôi tải. Hàng đợi cũng nằm trong bộ nhớ nên **khởi động lại runner làm mất các bài đang xếp hàng** (client nhận lỗi kết nối, backend trả 503). `kill_timeout: 45000` cho pm2 chờ tối đa 45 giây (30 giây xếp hàng + 10 giây chạy) để các bài đang dở xong trước khi tắt hẳn: runner ngừng nhận kết nối mới ngay khi nhận `SIGTERM` nhưng vẫn trả lời nốt các request đang có.

### Caddy (HTTPS)

`/etc/caddy/Caddyfile` (thay bằng tên miền Azure của bạn):

```
pe-runner.southeastasia.cloudapp.azure.com {
	request_body {
		max_size 300KB
	}
	reverse_proxy 127.0.0.1:8080
}
```

```bash
sudo systemctl reload caddy
curl https://pe-runner.southeastasia.cloudapp.azure.com/health
```

Lần đầu Caddy mất vài giây để lấy chứng chỉ; nếu lỗi, kiểm tra cổng 80/443 đã mở và DNS label đã lưu.

Thử chạy thật qua HTTPS:

```bash
curl -s https://<tên-miền>/run -H "Authorization: Bearer <RUNNER_SECRET>" -H "Content-Type: application/json" -d '{"code":"print(1+1)"}'
# {"stdout":"2\n","stderr":"","exitCode":0,"timedOut":false,"outputTruncated":false,"durationMs":...}
```

## 5. Nối backend trên Render

Trong *Environment* của dịch vụ backend:

| Biến | Giá trị |
|---|---|
| `PY_RUNNER_MODE` | `remote` |
| `RUNNER_URL` | `https://<tên>.<region>.cloudapp.azure.com` (không có `/run`) |
| `RUNNER_SECRET` | **đúng** khoá đã đặt ở `runner/.env` (≥ 32 ký tự) |
| `PY_RUNNER_PUBLIC` | `true` nếu `/ide` không đăng nhập (xem *Bảo mật*), ngược lại `false` |
| `PY_RUN_TIMEOUT_MS` | **giống runner** (mặc định 10000) |
| `PY_RUN_QUEUE_TIMEOUT_MS` | **giống runner** (mặc định 30000). Backend chờ runner `PY_RUN_QUEUE_TIMEOUT_MS + PY_RUN_TIMEOUT_MS + 10 giây` (mặc định 50 giây): bài vào cuối hàng có thể chờ hết hạn rồi mới chạy. Đặt nhỏ hơn runner thì backend bỏ cuộc trước, người dùng thấy 503 thay vì kết quả. |
| `TRUST_PROXY_HOPS` | xem mục dưới |

Thiếu `RUNNER_URL`/`RUNNER_SECRET` (hoặc khoá ngắn hơn 32 ký tự) khi `PY_RUNNER_MODE=remote` thì backend **từ chối khởi động**, không đợi tới request đầu tiên. `PY_RUN_MAX_CONCURRENT`, `PY_RUN_QUEUE_MAX` và `PY_RUN_MEMORY` của backend **không** có tác dụng ở chế độ này — runner giữ hàng đợi và quyết định; 429 của runner được chuyển tiếp nguyên trạng ra client. `@Throttle` 10 lần/phút của backend vẫn áp cho cả hai chế độ, nhưng nó trả thông điệp **riêng**: "Bạn chạy quá nhiều lần, đợi khoảng 1 phút rồi thử lại" (khác với "Máy chủ đang quá tải, thử lại sau" của hàng đợi), để người dùng biết nên chờ 1 phút hay vài giây.

### Giới hạn thời lượng một request trên Render

**Chưa xác nhận được từ tài liệu chính thức của Render**: các trang tài liệu về web service mà mình đọc không nêu con số giới hạn thời lượng một request. Chỉ có trả lời của nhân viên Render trên diễn đàn cộng đồng nói khoảng **100 phút** — đó là nguồn không chính thức nên hãy tự xác nhận (hỏi support hoặc đọc mục giới hạn trong dashboard) trước khi dựa vào nó. Dù con số thật là bao nhiêu, request của `/ide` ngắn hơn nhiều: tối đa `PY_RUN_QUEUE_TIMEOUT_MS + PY_RUN_TIMEOUT_MS + 10 giây` = **50 giây** với giá trị mặc định (30 + 10 + 10), nên chỉ lo nếu bạn tăng ba giá trị này lên hàng phút. Trình duyệt gọi thẳng backend (không qua Vercel) nên giới hạn của Vercel không áp ở đây.

### `TRUST_PROXY_HOPS` trên Render

Throttle 10 lần/phút tính **theo IP**. Render đứng trước backend như một reverse proxy, nên nếu `TRUST_PROXY_HOPS=0` (giá trị đúng cho local) thì mọi người dùng đều mang IP của proxy Render và **dùng chung một bộ đếm** — người thứ 11 trong cả hệ thống bị chặn. Trên Render đặt **dự kiến `1`** (một proxy: bộ cân bằng tải của Render). Nếu bạn đặt thêm Cloudflare hay proxy nào khác phía trước Render thì là `2`, v.v.

> ⚠️ **Đặt cao hơn số proxy thật là sai theo hướng nguy hiểm.** Express lấy IP ở vị trí thứ N tính từ bên phải của `X-Forwarded-For`; các mục bên trái là do **client tự gửi** và proxy chỉ nối thêm vào. Nếu `TRUST_PROXY_HOPS` lớn hơn số proxy thật, `req.ip` rơi vào một mục do client bịa → kẻ tấn công đổi `X-Forwarded-For` mỗi request là có IP mới mỗi lần, **vượt qua hoàn toàn giới hạn 10 lần/phút** (và mọi giới hạn theo IP khác). Đặt thấp hơn thì ngược lại: ai cũng chung một IP. Đừng đoán — hãy xác nhận:

**Cách 1 — log `req.ip` (chính xác nhất).** Tạm thêm vào `src/main.ts`, ngay sau dòng gọi `setupApiGateway(app)` (phải sau, vì `trust proxy` được đặt trong hàm đó):

```ts
app.use((req, _res, next) => {
  console.log('[ip-check] req.ip =', req.ip, '| X-Forwarded-For =', req.headers['x-forwarded-for']);
  next();
});
```

Deploy, gửi một request từ máy bạn (ví dụ `curl https://<backend>.onrender.com/health`), mở *Logs* trên Render và so `req.ip` với **IP công cộng thật của bạn** (xem tại https://api.ipify.org). Khớp → đúng. Là một IP nội bộ/của Render chứ không phải IP của bạn → số hop còn thấp, tăng thêm 1. Là một IP lạ khác (không phải của bạn, cũng không giống IP của Render) → có thể đã đặt quá cao. Thử thêm `curl -H "X-Forwarded-For: 1.2.3.4" …`: nếu `req.ip` **trở thành `1.2.3.4`** thì giá trị đang **quá cao** — hạ ngay. **Xong thì xoá đoạn log đó.**

**Cách 2 — không cần sửa code (kiểm bằng hành vi throttle).** Gọi `/api/python/run` 11 lần liên tiếp từ mạng A (wifi nhà). Lần 11 phải ra 429. Ngay sau đó, từ mạng B (4G điện thoại) gọi một lần: phải ra **200**. Nếu mạng B cũng bị 429 → mọi người đang chung một IP (hop quá thấp). Rồi thử gửi kèm header `X-Forwarded-For` ngẫu nhiên khác nhau mỗi lần từ mạng A: nếu **không còn bị 429** → hop quá cao (client giả được IP).

## 6. Vận hành

| Việc | Lệnh |
|---|---|
| Xem log | `pm2 logs pe-python-runner` (mỗi dòng: `run exit=… timedOut=… truncated=… queued=<ms> <ms>`; **không** ghi mã của người dùng) |
| Cập nhật code | `cd ~/pe && git pull && cd runner && npm ci && npm run build && pm2 reload pe-python-runner` |
| Cập nhật image | `docker build -t py-sandbox docker/py-sandbox` (lượt chạy sau dùng bản mới) |
| Đổi khoá | sinh khoá mới → sửa `runner/.env` → `pm2 restart pe-python-runner` → sửa `RUNNER_SECRET` trên Render và deploy lại (hai bên lệch nhau vài phút là `/ide` báo 503) |
| Xem tải hiện tại | `curl -s http://127.0.0.1:8080/health` → `running` / `queued` / `slots` |
| Dọn container sót | `docker ps -a --filter name=pyrun-` (bình thường rỗng); `docker rm -f $(docker ps -aq --filter name=pyrun-)` |

### Khi có sự cố

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `/ide` báo "Bộ chạy Python đang tắt, thử lại sau" | runner tắt, Caddy/DNS/tường lửa sai, hoặc `RUNNER_SECRET` lệch. Phân biệt: log backend ghi `Không gọi được runner` (mạng) hay `Runner từ chối khoá (401)` (lệch khoá). |
| `/ide` báo "Máy chủ đang quá tải, thử lại sau" (429) | hàng đợi của runner đầy (`PY_RUN_QUEUE_MAX`) hoặc bài chờ quá `PY_RUN_QUEUE_TIMEOUT_MS`: thật sự quá tải — tăng `PY_RUN_MAX_CONCURRENT` (nếu VM còn nhân/RAM) hoặc cỡ VM. Xem `queued` ở `/health`. |
| `/ide` báo "Bạn chạy quá nhiều lần, đợi khoảng 1 phút rồi thử lại" (429) | một IP vượt 10 lần/phút ở backend. Nếu **mọi người** đều gặp: `TRUST_PROXY_HOPS` đang quá thấp nên cả hệ thống dùng chung một IP (xem mục trên). |
| Runner không khởi động, log "Không đủ RAM: …" | cấu hình vượt RAM của máy chạy Docker. Làm theo gợi ý trong log (giảm `PY_RUN_MAX_CONCURRENT` hoặc `PY_RUN_MEMORY`), rồi `pm2 restart`. |
| `/health` trả 503, `capacity.status: "insufficient"` | như trên nhưng Docker chỉ lên SAU khi runner đã khởi động; runner từ chối mọi lượt chạy cho tới khi sửa cấu hình và khởi động lại. |
| `/health` có `"docker": false` | daemon Docker tắt (`sudo systemctl start docker`) hoặc user chạy runner không thuộc nhóm `docker` |
| Mọi lượt chạy ra `exitCode 125` | image `py-sandbox` chưa được build trên VM này |
| Caddy không lấy được chứng chỉ | cổng 80/443 chưa mở ở NSG, hoặc DNS label chưa lưu |

## 7. Bảo mật — đọc trước khi mở cho người ngoài

- **Một khoá bí mật duy nhất bảo vệ runner.** Ai có `RUNNER_SECRET` chạy được mã tuỳ ý trên VM. Giữ khoá ở Render và `runner/.env` (đã `.gitignore`), không đưa vào repo, log hay chat. Khoá 32 byte ngẫu nhiên không thể dò; so khớp bằng `crypto.timingSafeEqual` trên hai giá trị băm nên không rò độ dài/nội dung qua thời gian phản hồi.
- **Chỉ đi HTTPS** tới runner. Backend cảnh báo lúc khởi động nếu `RUNNER_URL` là `http://` tới máy không phải localhost.
- **Nhóm `docker` tương đương root** trên VM. Nếu có lỗ thoát khỏi container, kẻ tấn công thành root trên máy này — vì vậy dùng **VM riêng**, không đặt khoá/dữ liệu nào khác trên đó. Các cờ `--cap-drop ALL`, `no-new-privileges`, user không root, không mạng và FS chỉ đọc nhằm làm việc thoát đó khó hơn, không loại trừ được hoàn toàn.
- `PY_RUNNER_PUBLIC=true` nghĩa là **bất kỳ ai** mở được trang `/ide` đều khiến runner chạy mã. Giới hạn đang có: 10 lần/phút mỗi IP ở backend (cần `TRUST_PROXY_HOPS` đúng) và `PY_RUN_MAX_CONCURRENT` ở runner. Nếu cần chắc hơn, thêm lớp mạng phía trước backend (IP allowlist/basic auth ở reverse proxy).
- Code chạy **không có mạng** và **không lưu được gì** giữa các lượt; `input()` chưa hỗ trợ (stdin đóng → `EOFError`).
- Runner không tự giới hạn tần suất yêu cầu sai khoá; chống dò khoá dựa vào độ dài khoá. Nếu muốn, đặt giới hạn tốc độ ở Caddy hoặc `ufw`.

## Chạy test

```bash
cd runner
npm ci
npm run typecheck
npm test        # esbuild gộp test rồi node --test; --test-force-exit để test treo vẫn kết thúc và báo lỗi
```

Test của hàng đợi, kiểm tra RAM và `LocalExecutor` nằm ở backend (`npx jest src/python-runner`) vì cùng một mã nguồn dùng chung.

## Load test

`scripts/load-test.mjs` cho N người bấm "Chạy" rải đều trong một khoảng thời gian, gọi thẳng runner:

```bash
cd runner
node scripts/load-test.mjs --users 50 --spread 0 --hang 0.1
```

| Tham số | Ý nghĩa |
|---|---|
| `--users` | số người (mặc định 50) |
| `--spread` | khoảng rải thời điểm bấm, ms (0 = tất cả cùng lúc) |
| `--hang` | tỉ lệ bài treo `while True: pass` (0,1 = 10%); bài còn lại cộng 3 triệu số (~0,3–0,5 s CPU) |
| `--seed` | hạt giống ngẫu nhiên để chạy lại đúng kịch bản (mặc định 1) |
| `--url`, `--env-file`, `--timeout` | đổi địa chỉ runner, file `.env`, thời gian chờ mỗi request |

Khoá đọc từ `runner/.env` và **không bao giờ được in ra**. Kết quả gồm bảng từng người (status, `queuedMs`, tổng ms) và tổng kết: số 200, số 429, thời gian chờ trung bình / lớn nhất / p95. Chạy trên VM thật để đo đúng, không chạy qua mạng Internet làm nhiễu thời gian.

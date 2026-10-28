# Đọc file CSV bằng thư viện csv

## Đọc

### Mở file đúng cách

Thư viện `csv` của Python đọc file theo từng dòng và tự cắt các ô theo dấu phẩy. Điều quan trọng nhất khi mở file CSV là tham số `newline=""`: thiếu nó thì trên Windows mỗi dòng sẽ kèm thêm một ký tự xuống dòng rỗng.

```python
import csv

with open("diem.csv", newline="", encoding="utf-8") as f:
    for row in csv.reader(f):
        print(row)
```

```output
['ten', 'diem']
['Mai', '8.4']
['An', '7.2']
```

Mỗi dòng trả về là một **danh sách chuỗi**, kể cả cột điểm. Muốn tính toán thì phải tự đổi sang số.

### Dùng DictReader khi file có dòng tiêu đề

`csv.DictReader` lấy dòng đầu làm tên cột, nên code đọc theo tên thay vì theo chỉ số — sửa thứ tự cột trong file không làm hỏng chương trình.

```python
import csv

with open("diem.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        print(row["ten"], float(row["diem"]))
```

```output
Mai 8.4
An 7.2
```

Bảng dưới đây so hai cách đọc để chọn đúng việc:

| Cách đọc | Trả về mỗi dòng | Dùng khi |
|---|---|---|
| `csv.reader` | danh sách chuỗi | file không có tiêu đề |
| `csv.DictReader` | dict theo tên cột | file có dòng tiêu đề |

### Kiểm file trước khi viết code

Trước khi viết code, xem vài dòng đầu của file để biết dấu phân cách và phần đầu bảng:

```bash
head -3 diem.csv
```

```output
ten,diem
Mai,8.4
An,7.2
```

## S4 Bài tập

Viết hàm `diem_cao_nhat(dong)` nhận danh sách các dict đã đọc bằng `DictReader` và trả về tên của người có điểm cao nhất. Danh sách rỗng thì trả về `None`.

### Code khởi tạo

```python
def diem_cao_nhat(dong):
    """Trả về tên người có điểm cao nhất, hoặc None nếu danh sách rỗng."""
    pass
```

### Lời giải

```python
def diem_cao_nhat(dong):
    """Trả về tên người có điểm cao nhất, hoặc None nếu danh sách rỗng."""
    if not dong:
        return None
    return max(dong, key=lambda r: float(r["diem"]))["ten"]
```

### Test

| call | expect | name |
|------|--------|------|
| `diem_cao_nhat([])` | `None` | Danh sách rỗng |
| `diem_cao_nhat([{"ten": "Mai", "diem": "8.4"}])` | `"Mai"` | Một người |
| `diem_cao_nhat([{"ten": "Mai", "diem": "8.4"}, {"ten": "An", "diem": "9.1"}])` | `"An"` | So theo số, không theo chuỗi |

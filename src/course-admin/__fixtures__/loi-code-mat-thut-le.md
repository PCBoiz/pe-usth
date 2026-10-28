# Viết hàm đếm từ trong câu

## S4 Bài tập

Đây là hình dạng của một bài ĐÃ ĐI QUA PDF: nội dung còn đủ, heading còn đủ,
nhưng mọi khoảng trắng đầu dòng trong code đã bị bóc mất. Không ký tự nào hỏng
để ai đó nhìn ra, và `validateStudioLesson` không đọc nội dung mã — nên nếu bộ
parse không chặn thì bài vào được DB rồi hỏng ở tay học viên bằng
IndentationError.

### Code khởi tạo

```python
def dem_tu(cau):
"""Trả về số từ trong câu."""
return 0
```

### Lời giải

```python
def dem_tu(cau):
"""Trả về số từ trong câu."""
return len(cau.split())
```

### Test

| call | expect | name |
|------|--------|------|
| `dem_tu("mot hai ba")` | `3` | Ba từ |
| `dem_tu("")` | `0` | Câu rỗng |

## S1 Ngữ cảnh

File này có đủ cấu trúc S1–S2 nhưng THIẾU dòng `# <tên bài học>` ở đầu. Thiếu
tiêu đề thì `validateStudioLesson` đỏ ngay ở cửa vào DB, nên bộ parse phải nói
ra điều đó bằng câu nói rõ thiếu gì chứ không trả về một bài không tên.

```python
total = sum([1, 2, 3])
print(total)
```

## S2 Trắc nghiệm

`sum([1, 2, 3])` trả về giá trị nào?

- [ ] A. 6.0 — sum luôn trả về số thực
- [x] B. 6 — Cộng ba số nguyên vẫn ra số nguyên
- [ ] C. "6" — sum nối chuỗi

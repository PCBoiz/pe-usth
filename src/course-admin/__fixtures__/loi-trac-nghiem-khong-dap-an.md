# Hàm len() và độ dài chuỗi

## S1 Ngữ cảnh

Bài này dùng để kiểm một kiểu hỏng rất dễ xảy ra khi soạn tài liệu: người soạn
gõ cả bốn phương án nhưng QUÊN đổi một dấu `[ ]` thành `[x]`. Trên màn hình thì
bài trông đủ, nhưng không câu trả lời nào được chấm là đúng.

```python
print(len("Xin chao"))
```

### Dự đoán

`len("Xin chao")` trả về bao nhiêu?

- [ ] A. 8 — Đếm cả dấu cách
- [ ] B. 7 — Không đếm dấu cách
- [ ] C. 9 — Đếm thêm ký tự kết thúc chuỗi

## S2 Trắc nghiệm

`len("")` trả về bao nhiêu?

- [x] A. 0 — Chuỗi rỗng không có ký tự nào
- [x] B. 1 — Chuỗi rỗng vẫn chiếm một ô

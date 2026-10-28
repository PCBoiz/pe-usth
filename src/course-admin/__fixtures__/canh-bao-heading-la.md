# Chia lấy nguyên và chia lấy dư

## S1 Ngữ cảnh

Python có hai phép chia riêng: `//` lấy phần nguyên, `%` lấy phần dư. Hai phép
này đi cùng nhau trong mọi bài đổi đơn vị.

```python
giay = 3725
print(giay // 60, giay % 60)
```

### Mở rộng cho người đã biết

Heading này KHÔNG nằm trong mẫu. Bộ parse không hiểu nó, nên nội dung ở đây sẽ
không tới được học viên — và đó đúng là hình dạng lỗi mà AGENTS.md ghi sáu lần.
Nên nó phải ra một CẢNH BÁO, chứ không được im lặng bỏ đi.

### Ngộ nhận

**"a % b luôn cho kết quả không âm"**

Không đúng. Dấu của kết quả theo dấu của `b`, nên `-7 % 3` ra `2` còn `7 % -3`
ra `-2`.

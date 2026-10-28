# Tầng 0 — bảng nhỏ chép thẳng vào khối code của bài

**SINH TỰ ĐỘNG** bởi `scripts/pe-da/gen_dulieu.py`. Đừng sửa tay: sửa
ở đây là tạo ra một bộ từ vựng thứ hai, đúng cái bệnh mà bộ dữ liệu này
ra đời để chữa (hôm nay màn đọc dùng `store`/`amount`, ca chấm dùng
`region`/`qty`).

Đơn vị tiền **VNĐ**, nguyên liệu **g / ml**. Lược đồ: [LUOC-DO.md](../LUOC-DO.md).

## PY12 — `dict` tra giá theo tên món

```python
BANG_GIA = {'ca-phe-den': 20000, 'ca-phe-sua': 25000, 'bac-xiu': 29000, 'latte': 45000, 'tra-dao': 42000}
```

## PY11 — một dòng đã chốt đơn, `tuple`

```python
dong = (1, 39000)  # (so_coc, don_gia), đơn vị VNĐ
```

## M2 — ma trận `ngày × món` (số cốc, Quầy 1)

```python
ngay = ['2025-09-08', '2025-09-09', '2025-09-10', '2025-09-11', '2025-09-12']
mon = ['ca-phe-sua', 'ca-phe-den', 'latte']
so_coc = [
    [6, 5, 3],
    [5, 0, 0],
    [2, 5, 7],
    [8, 12, 4],
    [8, 10, 6],
]
```

## NP17 / PD08 / PD17 / PD20 — ô trống nghĩa là CHƯA MỞ

Quầy 2 mở ngày 05/05/2025, nên tuần đầu tháng 1 nó không có số — và
`None` ở đây **không** phải "bán 0 cốc". Đó là cả bài học.

```python
ngay = ['2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08']
quay = ['Q1', 'Q2']
so_coc = [
    [30, None],
    [31, None],
    [59, None],
    [50, None],
    [41, None],
    [25, None],
    [38, None],
]
```

## PD01–PD11 — 12 dòng đơn hàng, có đủ bốn khiếm khuyết

```python
don_hang = {
    'ma_don': ['DH-2025-011643', 'DH-2025-011644', 'DH-2025-011645', 'DH-2025-011646', 'DH-2025-011647', 'DH-2025-011648', 'DH-2025-011649', 'DH-2025-011696', 'DH-2025-011696', 'DH-2025-011733', 'DH-2025-011828', 'DH-2025-011927'],
    'thoi_diem': ['2025-09-08 07:00:00', '2025-09-08 07:08:58', '2025-09-08 07:33:10', '2025-09-08 08:00:37', '2025-09-08 08:01:31', '2025-09-08 08:18:00', '2025-09-08 08:18:02', '2025-09-09 08:26:13', '2025-09-09 08:26:13', '2025-09-10 07:12:57', '2025-09-12 07:17:49', '2025-09-13 13:26:22'],
    'quay': ['Q2', 'Q1', 'Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q2', 'Q2', 'Q2', 'Q2', 'Q1'],
    'mon': ['americano', 'ca-phe-da-xay', 'bac-xiu', 'ca-phe-sua', 'latte', 'banh-mi-pate', 'tra-sen', 'ca-phe-sua', 'ca-phe-sua', ' ca-phe-den', 'americano', 'tra-sen'],
    'so_coc': [1, 1, 2, 2, 1, 1, 1, 1, 1, 3, 1, 2],
    'don_gia': [39000, 49000, 29000, 25000, 45000, 25000, 39000, 25000, 25000, 20000, 39000, 39000],
    'tong_tien': [39000, 49000, 58000, 50000, 45000, 25000, 39000, 25000, 25000, 60000, 390000, 78000],
    'thanh_toan': ['vi_dien_tu', 'tien_mat', 'the', 'vi_dien_tu', 'vi_dien_tu', 'vi_dien_tu', 'vi_dien_tu', 'the', 'the', 'vi_dien_tu', 'tien_mat', ''],
    'ma_the_tich_diem': ['', 'TD00779', '', '', '', '', '', '', '', '', '', ''],
}
```

## PD16 / PD17 — bảng tra `quay` (3 quầy; `don_hang` chỉ có 2)

```python
quay = {
    'quay': ['Q1', 'Q2', 'Q3'],
    'ten': ['Quầy mặt phố', 'Quầy toà nhà Sao Mai', 'Quầy xe đẩy chợ đêm'],
    'khu_vuc': ['Trung tâm', 'Phía Tây', 'Phía Nam'],
    'ngay_mo': ['2025-01-01', '2025-05-05', '2026-03-01'],
}
```

## PD26 / VZ27 / RD03 — thực đơn `mon` (12 món, 4 nhóm)

```python
mon = {
    'mon': ['ca-phe-den', 'ca-phe-sua', 'bac-xiu', 'espresso', 'americano', 'latte', 'mocha', 'tra-sen', 'tra-dao', 'ca-phe-da-xay', 'banh-mi-pate', 'croissant'],
    'ten_mon': ['Cà phê đen đá', 'Cà phê sữa đá', 'Bạc xỉu', 'Espresso', 'Americano', 'Latte', 'Mocha', 'Trà sen vàng', 'Trà đào cam sả', 'Cà phê đá xay', 'Bánh mì pa-tê', 'Bánh sừng bò'],
    'nhom': ['Cà phê', 'Cà phê', 'Cà phê', 'Cà phê', 'Cà phê', 'Cà phê', 'Cà phê', 'Trà', 'Trà', 'Đá xay', 'Bánh', 'Bánh'],
    'gia_niem_yet': [20000, 25000, 29000, 35000, 39000, 45000, 49000, 39000, 42000, 49000, 25000, 32000],
}
```

## SY25–SY28 — `nguyen_lieu`, quan hệ nhiều–nhiều

```python
nguyenlieu = {
    'mon': ['ca-phe-den', 'ca-phe-den', 'ca-phe-den', 'ca-phe-sua', 'ca-phe-sua', 'ca-phe-sua', 'bac-xiu', 'bac-xiu', 'bac-xiu', 'bac-xiu', 'espresso', 'americano', 'americano', 'latte', 'latte', 'mocha', 'mocha', 'mocha', 'mocha', 'tra-sen', 'tra-sen', 'tra-sen', 'tra-sen', 'tra-dao', 'tra-dao', 'tra-dao', 'tra-dao', 'ca-phe-da-xay', 'ca-phe-da-xay', 'ca-phe-da-xay', 'ca-phe-da-xay', 'ca-phe-da-xay', 'banh-mi-pate', 'banh-mi-pate', 'banh-mi-pate', 'croissant', 'croissant', 'croissant'],
    'nguyen_lieu': ['ca-phe-hat', 'da', 'duong', 'ca-phe-hat', 'sua-dac', 'da', 'ca-phe-hat', 'sua-dac', 'sua-tuoi', 'da', 'ca-phe-hat', 'ca-phe-hat', 'da', 'ca-phe-hat', 'sua-tuoi', 'ca-phe-hat', 'sua-tuoi', 'bot-cacao', 'syrup-caramel', 'tra-den', 'hoa-sen', 'duong', 'da', 'tra-den', 'dao-ngam', 'sa', 'da', 'ca-phe-hat', 'sua-tuoi', 'da', 'syrup-caramel', 'kem-tuoi', 'bot-mi', 'pa-te', 'bo', 'bot-mi', 'bo', 'duong'],
    'luong': [18, 150, 5, 18, 30, 150, 9, 30, 80, 150, 18, 18, 120, 18, 180, 18, 120, 8, 15, 4, 3, 10, 150, 4, 60, 10, 150, 18, 120, 200, 20, 30, 90, 40, 10, 70, 35, 8],
    'don_vi': ['g', 'g', 'g', 'g', 'ml', 'g', 'g', 'ml', 'ml', 'g', 'g', 'g', 'g', 'g', 'ml', 'g', 'ml', 'g', 'ml', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'ml', 'g', 'ml', 'ml', 'g', 'g', 'g', 'g', 'g', 'g'],
}
```

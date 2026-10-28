# Há Cảo — Landing page

Landing page tĩnh cho thương hiệu **Há Cảo** (tiếng Trung cho người mới bắt đầu).

## Cấu trúc

```
├── index.html              # Trang chính
├── css/
│   └── custom.css          # Style bổ sung (placeholder ảnh, nav, reveal)
├── js/
│   └── main.js             # Menu mobile, lazy image, scroll reveal
└── assets/images/
    ├── logo/               # logo
    ├── hero/               # ảnh hero
    ├── highlights/         # icon 3 lý do
    ├── curriculum/         # bìa sách + combo
    ├── outcomes/           # nền lá section kết quả
    └── support/            # icon quà tặng / hỗ trợ
```

## Thêm ảnh

Mỗi slot đang có file `.txt` hướng dẫn. Để hiện ảnh:

1. Đặt file cùng tên trong cùng thư mục, ví dụ:
   - `assets/images/hero/hero-books.jpg`
   - `assets/images/curriculum/pinyin-book.webp`
2. Giữ nguyên tên (không cần sửa HTML). JS tự thử lần lượt: `.jpg` → `.jpeg` → `.webp` → `.png` → `.svg`.
3. Có thể xóa file `.txt` sau khi đã có ảnh thật.

| Section        | File placeholder                         | Tên ảnh cần thêm      |
|----------------|------------------------------------------|------------------------|
| Logo           | `logo/logo.txt`                          | `logo.*`               |
| Hero           | `hero/hero-books.txt`                    | `hero-books.*`         |
| Highlights     | `highlights/icon-*.txt`                  | `icon-curriculum.*` …  |
| Giáo trình     | `curriculum/pinyin-book.txt`             | `pinyin-book.*`        |
|                | `curriculum/hsk1-book.txt`               | `hsk1-book.*`          |
|                | `curriculum/combo-books.txt`             | `combo-books.*`        |
| Outcomes       | `outcomes/leaf-bg.txt`                   | `leaf-bg.*`            |
| Hỗ trợ         | `support/icon-*.txt`                     | `icon-hanzi.*` …       |

## Chạy local

Mở trực tiếp `index.html` trong trình duyệt, hoặc:

```bash
npx serve .
# hoặc: python3 -m http.server 5500
```

Stack: HTML + Tailwind CSS (CDN) + JS thuần. Font: Be Vietnam Pro.

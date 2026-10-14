// Spec mobile responsive (memory-plan/08) — viewport 375×812.
//
// TIÊU CHÍ (DoD): không tràn ngang + nội dung chính hiển thị ở mọi trang.
//
// Chỉ còn các trang KHÔNG cần đăng nhập: trang chủ (lưới khóa học) và trang chi
// tiết từng khóa. Bản trước đo thêm login/register/dashboard/questionaire — các
// trang đó đã gỡ khỏi frontend nên spec đi theo, và nhờ không còn gọi
// `helpers.login()` nên chạy được trong CI mà không cần backend.
import { test, expect, Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

type Offender = { sel: string; left: number; right: number };
type Audit = { vw: number; scrollW: number; offenders: Offender[] };

/** Đo tràn ngang: scrollWidth + phần tử visible vượt mép phải/trái viewport
 *  (bỏ qua phần tử nằm trong container tự cuộn ngang hoặc bị ancestor clip). */
async function auditMobile(page: Page): Promise<Audit> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders: { sel: string; left: number; right: number }[] = [];
    const isClippedOrScrollable = (el: Element): boolean => {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return true;
        node = node.parentElement;
      }
      return false;
    };
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      if (r.right <= vw + 2 && r.left >= -2) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
      if (isClippedOrScrollable(el)) return;
      offenders.push({
        sel:
          el.tagName.toLowerCase() +
          (el.id ? '#' + el.id : '') +
          (typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : ''),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    });
    return { vw, scrollW: document.documentElement.scrollWidth, offenders: offenders.slice(0, 10) };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const a = await auditMobile(page);
  expect
    .soft(a.scrollW, `${label}: scrollWidth ${a.scrollW} > viewport ${a.vw}`)
    .toBeLessThanOrEqual(a.vw + 1);
  expect
    .soft(a.offenders, `${label}: phần tử tràn viewport → ${JSON.stringify(a.offenders)}`)
    .toHaveLength(0);
}

// ── Trang chủ + chi tiết khóa học ───────────────────────────────────────────
// Một đại diện cho mỗi nhánh render: khóa React thuần (python_advanced) và khóa
// dùng JS legacy (db_design — route tĩnh riêng nên vẫn mở được bằng đường dẫn).
// Bản trước đo thêm /courses/java (giáo trình dài nhất, 110 bài): java đã rời
// danh mục tĩnh 13/10/2026 nên route động trả 404, đo một trang 404 là đo vô ích.
for (const path of ['/', '/courses/python_advanced', '/courses/db_design']) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // chờ font/script legacy dựng xong nội dung
    await expectNoHorizontalOverflow(page, path);
  });
}

test('trang chủ chỉ còn ô Python và ô công cụ Bàn thí nghiệm', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Đếm theo `[data-catalog-tile]`, không theo `a[href^="/courses/"]`:
  // 15/10/2026 trang chủ có thêm thẻ "Gợi ý bước tiếp" với lối ra "Tự chọn bài"
  // cũng trỏ vào /courses/… — đếm theo href thì ô khoá bị tính lẫn với lối ra.
  const tiles = page.locator('a[data-catalog-tile][href^="/courses/"]');
  // 13/10/2026: 6 khoá còn lại (cpp, java, htmlcss, db_design*) đã gỡ khỏi danh
  // mục tĩnh cho buổi dùng thử — xem src/lib/catalog.ts. Còn đúng một ô khoá.
  await expect(tiles).toHaveCount(1);
  const hrefs = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs).toEqual(['/courses/python_advanced']);

  // Bàn thí nghiệm là CÔNG CỤ (href /ide, ngoài khối khoá) và hiện SẴN; chỉ ẩn
  // khi build với NEXT_PUBLIC_IDE_ENABLED=off, mà e2e không đặt cờ đó.
  await expect(page.locator('a[href="/ide"]')).toHaveCount(1);

  await page.locator('a[href="/courses/python_advanced"]').click();
  await expect(page).toHaveURL(/\/courses\/python_advanced$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Python');
});

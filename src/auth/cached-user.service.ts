import { Injectable } from '@nestjs/common';
import { User } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

const TTL_MS = 60_000; // 60 giây

// Trần số entry — vượt trần thì gạt entry cũ nhất (Map giữ insertion order nên
// entry đầu tiên là ứng viên tốt). Không có trần, mỗi user từng đăng nhập chiếm
// RAM tới hết đời process — rò rỉ chậm khi có hàng chục nghìn user.
const MAX_ENTRIES = 10_000;

interface CacheEntry {
  user: User;
  expiresAt: number;
}

/**
 * Cache user theo id trong 60s để giảm số query lặp lại trên các route đọc nhiều.
 * Cache in-memory theo từng process — KHÔNG dùng được nếu sau này chạy nhiều
 * instance (cần chuyển sang Redis); chấp nhận ở giai đoạn hiện tại vì chỉ 1 process.
 */
@Injectable()
export class CachedUserService {
  private readonly cache = new Map<number, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<User | null> {
    const hit = this.cache.get(id);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.user;
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user) {
      if (this.cache.size >= MAX_ENTRIES && !this.cache.has(id)) {
        // Duyệt bằng for…of thay cho `.keys().next().value`: lib ES2023 khai
        // `IteratorResult.value` là `any`, nên bản cũ để `any` chảy thẳng vào
        // `cache.delete()` — nếu khoá cache đổi kiểu thì delete() im lặng
        // không xoá gì và Map phình quá MAX_ENTRIES. for…of cho ra `number`
        // thật. Map giữ thứ tự chèn nên phần tử đầu là entry cũ nhất.
        for (const oldest of this.cache.keys()) {
          this.cache.delete(oldest);
          break;
        }
      }
      this.cache.set(id, { user, expiresAt: Date.now() + TTL_MS });
    } else {
      // User bị xoá: dọn entry cũ để lần sau không trả bản stale.
      this.cache.delete(id);
    }
    return user;
  }

  /** Gọi sau MỌI thao tác UPDATE trên user, nếu không cache sẽ trả dữ liệu cũ tới 60s. */
  invalidate(id: number): void {
    this.cache.delete(id);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

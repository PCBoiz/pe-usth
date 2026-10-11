'use client';

// base.html có nút "Đăng xuất" điều hướng thẳng tới /auth/logout (main.js giữ
// nguyên nên URL này phải tồn tại trên frontend): thu hồi refresh token ở
// backend (best-effort), xóa token local rồi về '/' — đúng hành vi Flask cũ
// (session.clear() + redirect '/').
import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    const origin = (window as unknown as { __PE_API_ORIGIN?: string }).__PE_API_ORIGIN || '';
    let legacyRefresh: string | null = null;
    try {
      legacyRefresh = localStorage.getItem('pe_refresh');
      localStorage.removeItem('pe_access');
      localStorage.removeItem('pe_refresh');
    } catch {
      /* private mode */
    }
    // Xoá cookie cờ phiên để proxy.ts chặn lại các trang cần đăng nhập
    try {
      document.cookie = 'pe_has_session=; path=/; max-age=0; SameSite=Lax';
    } catch {
      /* private mode */
    }
    const done = () => window.location.replace('/');
    // Luôn gọi backend: refresh token nằm trong cookie httpOnly, chỉ server
    // thu hồi và xoá được. credentials:'include' để cookie được gửi lên.
    fetch(`${origin}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacyRefresh ? { refresh: legacyRefresh } : {}),
    }).then(done, done);
  }, []);

  return null;
}

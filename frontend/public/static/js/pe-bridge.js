/**
 * pe-bridge.js — cầu nối duy nhất giữa 17 file JS legacy (giữ nguyên byte) và
 * kiến trúc mới (Next.js khác origin + Django JWT). PHẢI load TRƯỚC mọi file
 * legacy khác (main.js tự wrap window.fetch lúc load — nó sẽ wrap bản fetch
 * đã được bridge này thay, chuỗi hoạt động đúng thứ tự).
 *
 * Nhiệm vụ:
 * 1. Rewrite URL tương đối /api/* và /auth/* sang origin backend (NEXT_PUBLIC_API_URL
 *    được layout bơm vào window.__PE_API_ORIGIN trước khi file này chạy).
 * 2. Đính "Authorization: Bearer <access>" vào mọi request tới backend.
 * 3. Tự BẮT access/refresh token từ response /auth/login và /auth/register
 *    (main.js không phải sửa gì — nó chỉ đọc {ok, name, needs_questionnaire}).
 * 4. Khi 401: thử refresh token 1 lần rồi phát lại request; refresh hỏng →
 *    xóa token + đưa về /login (khớp hành vi session hết hạn của bản Flask).
 * 5. Vá DOMContentLoaded: script legacy được nạp SAU khi DOM sẵn sàng (React
 *    mount xong) nên listener DOMContentLoaded đăng ký muộn sẽ không bao giờ
 *    chạy — bridge gọi ngay handler khi readyState đã qua 'loading'.
 */
(function () {
  'use strict';

  var ORIGIN = window.__PE_API_ORIGIN || '';
  var LS_ACCESS = 'pe_access';
  /* Refresh token giờ nằm trong cookie httpOnly do backend đặt (JS không đọc
   * được). Key localStorage cũ chỉ còn đọc MỘT lần để chuyển phiên đang đăng
   * nhập sang cookie, sau đó bị xoá. */
  var LS_LEGACY_REFRESH = 'pe_refresh';

  function getAccess() { try { return localStorage.getItem(LS_ACCESS); } catch (e) { return null; } }
  function getLegacyRefresh() { try { return localStorage.getItem(LS_LEGACY_REFRESH); } catch (e) { return null; } }
  function dropLegacyRefresh() { try { localStorage.removeItem(LS_LEGACY_REFRESH); } catch (e) {} }
  /* Cookie CỜ (không chứa token) để proxy.ts của Next đọc được trạng thái
   * "có phiên" từ server — localStorage server không đọc được. max-age khớp
   * hạn refresh token (8h), được gia hạn mỗi lần login/refresh. */
  function setSessionCookie() {
    try { document.cookie = 'pe_has_session=1; path=/; max-age=28800; SameSite=Lax'; } catch (e) {}
  }
  function clearSessionCookie() {
    try { document.cookie = 'pe_has_session=; path=/; max-age=0; SameSite=Lax'; } catch (e) {}
  }
  function setTokens(access) {
    try {
      if (access) localStorage.setItem(LS_ACCESS, access);
    } catch (e) { /* private mode */ }
    dropLegacyRefresh();
    if (access) setSessionCookie();
  }
  function clearTokens() {
    try { localStorage.removeItem(LS_ACCESS); } catch (e) {}
    dropLegacyRefresh();
    clearSessionCookie();
  }
  window.__PE_setTokens = setTokens;
  window.__PE_clearTokens = clearTokens;

  /* credentials:'include' bắt buộc: backend khác origin, thiếu nó trình duyệt
   * không gửi cookie refresh lên và cũng bỏ qua Set-Cookie trả về. */
  function callRefresh() {
    var legacy = getLegacyRefresh();
    return _origFetch(ORIGIN + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacy ? { refresh: legacy } : {}),
    });
  }

  /* Refresh access token — DÙNG CHUNG cho retry-401 của fetch và SSE.
   * Dedupe bằng 1 promise đang bay trong tab. Hai TAB cùng refresh thì tab
   * chậm hơn gửi cookie cũ và nhận 401 — thử lại đúng 1 lần sau chút ít, lúc
   * đó trình duyệt đã nhận cookie mới từ tab kia. */
  /* Khách chưa đăng nhập thì không có cookie refresh — khỏi gọi mạng. */
  function maybeLoggedIn() {
    return !!(getAccess() || getLegacyRefresh() ||
      document.cookie.indexOf('pe_has_session=1') !== -1);
  }

  var _refreshing = null;
  function refreshAccess() {
    if (_refreshing) return _refreshing;
    if (!maybeLoggedIn()) return Promise.resolve(null);
    _refreshing = callRefresh().then(function (r) {
      if (r.status !== 401) return r;
      return new Promise(function (ok) { setTimeout(ok, 400); }).then(callRefresh);
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) { clearTokens(); return null; }
      if (!r.ok) return null;  // lỗi mạng/5xx: giữ token, thử lại sau
      return r.json().then(function (d) {
        setTokens(d.access);
        return d.access;
      });
    }).catch(function () { return null; });
    _refreshing.then(function () { _refreshing = null; },
                     function () { _refreshing = null; });
    return _refreshing;
  }
  window.__PE_refreshAccess = refreshAccess;

  /* Body lỗi backend có 2 dạng: {error: 'chuỗi'} và {error: {status, message,
   * detail}} (400/404/429/500). Legacy JS alert(res.error) thẳng → object sẽ
   * hiện "[object Object]" — helper này rút message dùng được cho cả hai. */
  window.__PE_errMsg = function (e) {
    if (e && typeof e === 'object') return e.message || JSON.stringify(e);
    return e;
  };

  function isBackendPath(url) {
    return typeof url === 'string' && (url.indexOf('/api/') === 0 || url.indexOf('/api') === 0 && (url === '/api' || url[4] === '/' || url[4] === '?')
      || url.indexOf('/auth/') === 0 || url.indexOf('/health') === 0);
  }

  var _origFetch = window.fetch.bind(window);

  function doFetch(url, opts, triedRefresh) {
    var finalUrl = url;
    var toBackend = false;
    if (isBackendPath(url)) {
      finalUrl = ORIGIN + url;
      toBackend = true;
    } else if (typeof url === 'string' && ORIGIN && url.indexOf(ORIGIN) === 0) {
      toBackend = true;
    }
    opts = opts || {};
    if (toBackend) {
      var headers = new Headers(opts.headers || {});
      var access = getAccess();
      // KHÔNG đính token vào login/register/refresh: đây là endpoint công khai,
      // token cũ hỏng (backend restart đổi SECRET_KEY dev) sẽ làm JWTAuthentication
      // chặn 401 "Chưa đăng nhập" TRƯỚC khi view kịp xét email/mật khẩu.
      var isPublicAuth = url.indexOf('/auth/login') === 0 ||
                         url.indexOf('/auth/register') === 0 ||
                         url.indexOf('/auth/refresh') === 0;
      if (access && !isPublicAuth && !headers.has('Authorization')) {
        headers.set('Authorization', 'Bearer ' + access);
      }
      opts = Object.assign({}, opts, { headers: headers });
      // /auth/*: phải gửi/nhận cookie refresh httpOnly (khác origin).
      if (url.indexOf('/auth/') === 0 || url.indexOf(ORIGIN + '/auth/') === 0) {
        opts.credentials = 'include';
      }
    }
    return _origFetch(finalUrl, opts).then(function (resp) {
      // Bắt token từ login/register (main.js không cần biết JWT tồn tại)
      if (toBackend && resp.ok &&
          (url.indexOf('/auth/login') === 0 || url.indexOf('/auth/register') === 0)) {
        resp.clone().json().then(function (data) {
          if (data && data.access) setTokens(data.access);
        }).catch(function () {});
      }
      // 401 → thử refresh 1 lần (trừ chính các call auth)
      if (toBackend && resp.status === 401 && !triedRefresh &&
          url.indexOf('/auth/') !== 0) {
        return refreshAccess().then(function (access) {
          if (!access) return resp;
          // Xóa header cũ để lần phát lại đính access MỚI (headers.has()
          // ở trên sẽ không ghi đè nếu còn token hết hạn nằm sẵn).
          if (opts.headers && opts.headers.delete) opts.headers.delete('Authorization');
          return doFetch(url, opts, true);
        });
      }
      return resp;
    });
  }

  window.fetch = function (url, opts) { return doFetch(url, opts, false); };

  // ── DOMContentLoaded compat: legacy script nạp sau khi DOM đã sẵn sàng ──
  var _addEventListener = document.addEventListener.bind(document);
  document.addEventListener = function (type, handler, options) {
    if (type === 'DOMContentLoaded' && document.readyState !== 'loading') {
      setTimeout(function () { handler.call(document, new Event('DOMContentLoaded')); }, 0);
      return;
    }
    return _addEventListener(type, handler, options);
  };
})();

/*
 * Markup TĨNH của cảnh (bộ icon + #app). engine.js làm nó sống.
 *
 * Port từ artifact "Góc học PE". Khác bản gốc ở đúng một chỗ, và đó là chỗ
 * quan trọng nhất: MỌI con số về người học đã bị lấy ra khỏi markup. Bản gốc
 * viết thẳng "Hà Thái Sơn · Lv. 14 · 2.340/3.000 XP", "🔥 12", "23 huy hiệu",
 * "Hạng 37 · Giải Bạc", "Nhiệm vụ hôm nay 1/3 xong" vào HTML — tức mở trang
 * chủ lên là thấy tiến độ của một người không tồn tại, mà không có cách nào
 * biết đó không phải của mình.
 *
 * Nay mỗi chỗ đó là một ô trống mang id, mặc định in dấu "—", và engine điền
 * vào khi (và chỉ khi) có số thật từ server. Xem `apDungSo` trong engine.js và
 * luật ở src/lib/goc-hoc.ts.
 */
export const SHELL_HTML = /* html */ `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1 2.5 2 3 0-3 0-6 1-8.5z"/></symbol>
  <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></symbol>
  <symbol id="i-medal" viewBox="0 0 24 24"><path d="M8 3h8l-2 6h-4z"/><circle cx="12" cy="15" r="5"/><path d="m12 13 .8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></symbol>
  <symbol id="i-map" viewBox="0 0 24 24"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/></symbol>
  <symbol id="i-pen" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></symbol>
  <symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></symbol>
  <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3c.6 4.5 3.5 7.4 8 8-4.5.6-7.4 3.5-8 8-.6-4.5-3.5-7.4-8-8 4.5-.6 7.4-3.5 8-8z"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></symbol>
  <symbol id="i-left" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></symbol>
  <symbol id="i-right" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"/></symbol>
  <symbol id="i-send" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></symbol>
</svg>

<div id="app" class="intro">
  <div id="cam">
    <div id="room">
      <img id="roomImg" src="/goc-hoc/room.webp" alt="Góc học: bàn học trước cửa sổ, có laptop, cốc cà phê, cuốn sổ, điện thoại, bảng ghim lộ trình, lịch treo tường, kệ sách và kệ cúp">
      <div id="items"></div>
      <div id="tMul"></div><div id="tDim"></div><div id="tScr"></div>
      <div id="skyWrap" aria-hidden="true"><div id="sgrad"></div><div id="sun"></div><div id="stars"></div><div id="moon"></div><div class="cl" id="clB"></div><div class="cl" id="clR"></div></div>
      <svg id="rainSvg" viewBox="0 0 2752 1536" aria-hidden="true">
        <defs><clipPath id="clipOpen"><rect x="1046" y="160" width="788" height="926"/></clipPath></defs>
        <g clip-path="url(#clipOpen)"><rect x="1040" y="150" width="800" height="950" fill="#27305e" opacity=".22"/><g id="dropG"></g></g>
      </svg>
      <div id="win" aria-hidden="true"><div class="sash l" id="sashL"><div class="tex"></div><img class="gl glowi" data-g="window" src="/goc-hoc/items/sash-l-g.webp" alt=""></div><div class="sash r" id="sashR"><div class="tex"></div><img class="gl glowi" data-g="window" src="/goc-hoc/items/sash-r-g.webp" alt=""></div></div>
      <img id="swag" src="/goc-hoc/swag.png" alt="">
      <div id="itemsTop"></div>
      <img id="front" src="/goc-hoc/front.webp" alt="">
      <div id="cityG"></div>
      <div id="steamG"></div>
      <div id="dustG"></div>
      <div id="dark"></div>
      <div id="lampPool"></div><div id="lampHalo"></div>
      <div id="bulbG"></div>
      <div id="phoneGlow"></div>
      <div id="leafG"></div>
      <img id="blurHole" class="blurL" src="/goc-hoc/room-blur.webp" alt="">
      <img id="blurFull" class="blurL" src="/goc-hoc/room-blur.webp" alt="">
      <div id="glows"></div>
      <svg id="hotHit" viewBox="0 0 2752 1536"></svg>
      <div id="notes" aria-label="Ghi chú trên bàn"></div>
    </div>
  </div>

  <div id="scrim"></div>
  <div id="tags"></div>
  <div id="flash"></div>
  <div id="held" aria-hidden="true"></div>

  <button id="profile" class="glass ui" aria-label="Mở hồ sơ trên điện thoại">
    <div class="ava"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="3"/><circle id="avaRing" cx="26" cy="26" r="24" fill="none" stroke="var(--amber)" stroke-width="3" stroke-linecap="round" stroke-dasharray="0 150.8" transform="rotate(-90 26 26)"/></svg><span id="uInitial">?</span></div>
    <div>
      <div class="pname"><span id="uName">Khách</span></div>
      <div class="xp"><div class="xpbar"><i id="uXpBar"></i></div><span id="uXpText">chưa có phiên học</span></div>
    </div>
  </button>

  <aside id="side" class="ui">
    <div class="pills">
      <div class="pill glass dn" title="Bài đã hoàn thành"><svg class="i"><use href="#i-check"/></svg><span id="pillDone">—</span></div>
      <div class="pill glass xpp" title="Tổng XP"><svg class="i"><use href="#i-bolt"/></svg><span id="pillXp">—</span>&nbsp;XP</div>
      <div class="pill glass bd" title="Huy hiệu"><svg class="i"><use href="#i-medal"/></svg><span id="pillBadge">—</span></div>
      <span class="sp"></span>
      <button class="ib glass" id="bellBtn" aria-label="Ghi chú trên bàn"><svg class="i"><use href="#i-bell"/></svg><span class="badge" id="badge">0</span></button>
      <button class="ib glass" id="demoBtn" aria-label="Tùy chỉnh khung cảnh" aria-expanded="false"><svg class="i"><use href="#i-sliders"/></svg></button>
    </div>
    <button class="hero" data-go="learn">
      <div class="eyebrow" id="heroEyebrow"></div>
      <h2 id="heroTitle">Bắt đầu học</h2>
      <div class="sub" id="heroSub"></div>
      <div class="row"><div class="prog"><i id="heroProg"></i></div><span class="pct" id="heroPct">—</span><span class="play"><svg class="i"><use href="#i-play"/></svg></span></div>
    </button>
    <nav class="menu" aria-label="Điều hướng">
      <button class="mi glass" data-go="roadmap"><span class="ic c-map"><svg class="i"><use href="#i-map"/></svg></span><span><b>Lộ trình</b><small id="navRoadmap"></small></span><svg class="i chev"><use href="#i-right"/></svg></button>
      <button class="mi glass" data-go="courses"><span class="ic c-book"><svg class="i"><use href="#i-book"/></svg></span><span><b>Khoá học</b><small id="navCourses"></small></span><svg class="i chev"><use href="#i-right"/></svg></button>
      <button class="mi glass" data-go="practice"><span class="ic c-pen"><svg class="i"><use href="#i-pen"/></svg></span><span><b>Ôn tập</b><small id="navPractice"></small></span><svg class="i chev"><use href="#i-right"/></svg></button>
      <button class="mi glass" data-go="achievements"><span class="ic c-tro"><svg class="i"><use href="#i-trophy"/></svg></span><span><b>Thành tựu</b><small id="navAchv"></small></span><svg class="i chev"><use href="#i-right"/></svg></button>
      <button class="mi glass" data-go="phone" data-tab="rank"><span class="ic c-ph"><svg class="i"><use href="#i-phone"/></svg></span><span><b>Bảng xếp hạng</b><small id="navRank"></small></span><svg class="i chev"><use href="#i-right"/></svg></button>
    </nav>
    <section class="today glass" aria-label="Khoá đang học">
      <h3>Khoá đang học <span id="courseDone">—</span></h3>
      <div class="prog"><i id="courseProg"></i></div>
      <p class="cnote" id="courseNote"></p>
      <div class="event"><div style="flex:1;min-width:0"><b id="courseName"></b><small id="courseSub"></small></div><a class="btn" id="courseLink" href="/courses/python_advanced">Mở khoá học</a></div>
    </section>
    <div class="music glass" id="music"><button class="ib" id="musicBtn" aria-label="Phát nhạc lofi"><svg class="i"><use href="#i-play"/></svg></button><div class="eq"><i></i><i></i><i></i><i></i></div><span id="musicTxt">Nhạc lofi · đang tắt</span></div>
  </aside>

  <div id="hint" class="ui">
    <div id="reply" class="glass" hidden></div>
    <form class="glass" id="hintForm"><svg class="i"><use href="#i-spark"/></svg><input id="hintIn" placeholder="Hỏi gợi ý…" autocomplete="off" aria-label="Hỏi gợi ý"><button class="ib" aria-label="Gửi"><svg class="i"><use href="#i-send"/></svg></button></form>
  </div>

  <div id="calPop" class="glass" hidden>
    <h4 id="calPopT">Lịch tháng</h4>
    <p id="calPopB"></p>
  </div>

  <div id="notePop" class="glass" role="dialog" aria-label="Chi tiết ghi chú">
    <div class="k" id="npK"></div><h4 id="npT"></h4><p id="npB"></p>
    <div class="row"><button class="btn" id="npGo"></button><button class="btn ghost" id="npDel">Gỡ ghi chú</button></div>
  </div>

  <div id="demo" class="glass" hidden>
    <h4>Giờ trong ngày</h4>
    <div class="clock"><b id="clockT">18:00</b><small id="clockS">theo giờ thật</small></div>
    <input type="range" id="tod" min="0" max="24" step="0.25" value="18" aria-label="Giờ trong ngày">
    <div class="chips2"><button data-h="7">Sáng</button><button data-h="12.5">Trưa</button><button data-h="18">Hoàng hôn</button><button data-h="22">Đêm</button></div>
    <button class="tg" id="tReal" aria-pressed="true">Theo giờ thật<span class="sw"></span></button>
    <h4>Khung cảnh</h4>
    <button class="tg" id="tWin" aria-pressed="false">Mở cửa sổ<span class="sw"></span></button>
    <button class="tg" id="tRain" aria-pressed="false">Mưa ngoài cửa sổ<span class="sw"></span></button>
    <button class="tg" id="tRm" aria-pressed="false">Giảm chuyển động<span class="sw"></span></button>
    <button class="tg" id="tIntro">Xem lại màn mở đầu<svg class="i"><use href="#i-play"/></svg></button>
    <p>Bản thử nghiệm của khung cảnh. Bầu trời đổi theo giờ, còn căn phòng chỉ đổi màu ánh sáng trên một ảnh hoàng hôn; bản sau sẽ có ảnh riêng cho từng buổi. Giáo trình và tiến độ là dữ liệu thật — chỗ nào chưa nối được thì để trống, không điền số mẫu.</p>
  </div>

  <div id="toast" class="glass" role="status"></div>
  <div id="page" aria-live="polite"></div>
  <button id="skip">Bỏ qua mở đầu</button>
</div>
`;

import { DATA, CAL, KEYS, ROAD, SCODE } from './scene-data';

/*
 * Góc học PE — động cơ cảnh, port từ artifact cùng tên.
 *
 * Căn phòng là một sân khấu trong toạ độ ẢNH (2752 × 1536) với từng vật cắt
 * rời thành một lớp riêng, bầu trời chạy theo đồng hồ, giấy nhớ dưới cửa sổ là
 * thông báo, và mỗi vật mở ra một màn bằng Web Animations. Gọi
 * `initStudyRoom(host, state)` sau khi markup của SHELL_HTML đã nằm trong
 * `host`; hàm trả về một `dispose()` dọn sạch mọi timer, vòng khung hình và
 * listener.
 *
 * KHÁC BẢN GỐC — và đây là toàn bộ phần đáng đọc lại:
 *  · Bản gốc tự chứa giáo trình (ba khoá bịa) và số của người học (XP, huy
 *    hiệu, hạng, chuỗi ngày — tất cả viết cứng). Nay cả hai đến từ `state`:
 *    `state.content` là giáo trình THẬT đọc từ curricula.json, `state.user` là
 *    số THẬT của người học hoặc `null` ở từng trường. Không trường nào được
 *    phép "đoán": null thì in dấu "—". Xem src/lib/goc-hoc.ts.
 *  · Bỏ hẳn CHUỖI NGÀY (streak). Sản phẩm này đã gỡ chuỗi ngày (commit
 *    330a469, và e2e/unit/dead-routes.test.mjs canh cho nó không mọc lại), nên
 *    cái pill 🔥 12, vòng tròn đỏ 12 ngày trên lịch và ô "12 ngày liên tiếp"
 *    trong hồ sơ đều đi. Lịch tường nay chỉ khoanh HÔM NAY.
 *  · Bỏ hẳn Ổ KHOÁ trên sách. Mọi bài của khoá đều mở được từ trang khoá học,
 *    nên vẽ ổ khoá là nói sai về sản phẩm.
 */
export function initStudyRoom(host, state) {

/* ---- nội dung và số: giáo trình thật, số thật hoặc trống ---- */
const CONTENT = state.content;
const USER = state.user;
/* Tên hiển thị do người test tự đặt. React giữ localStorage (try/catch ở đó),
   engine chỉ gọi doc()/ghi() — xem StudyRoom.tsx. */
const TEN = state.ten || { doc: () => null, ghi: () => {} };
const MODULES = CONTENT.modules;
/* Ba học phần đầu có kệ sách trong phòng; năm học phần sau chỉ hiện ở màn
   "Khoá học" (bức ảnh chỉ có ba kệ — xem SHELF_SLOTS trong lib/goc-hoc.ts). */
const SHELVES = MODULES.map((m, i) => ({ mi: i,
  key: m.shelfKey, focus: m.focus, name: m.name, short: m.short, lessons: m.lessons })).filter((S) => S.key);
const SO = (v) => (typeof v === 'number' && isFinite(v) ? v.toLocaleString('vi-VN') : '—');
const DONE_COUNT = MODULES.reduce((s, m) => s + m.lessons.filter((l) => l.state === 'done').length, 0);
const TOTAL = CONTENT.course.total;
const PCT = TOTAL ? Math.round((DONE_COUNT / TOTAL) * 100) : 0;
/* Bài được gợi ý học tiếp (hoặc bài đầu khoá khi chưa biết tiến độ) và học
   phần của nó — dùng cho nút "Học tiếp", nhãn vật và màn Bài học. */
const CUR = (() => {
  for (const m of MODULES) for (const l of m.lessons) if (l.state === 'cur') return { m, l };
  const m0 = MODULES[0];
  return m0 && m0.lessons[0] ? { m: m0, l: m0.lessons[0] } : null;
})();
const lessonHref = (no) => CONTENT.course.lessonUrl + '?lesson=' + Math.max(0, no - 1);
/* Ba câu hỏi gợi ý của hộp "Hỏi gợi ý". Chúng là câu hỏi để NGƯỜI HỌC tự trả
   lời, không phải câu trả lời của một trợ lý — bản gốc cũng vậy, nhưng câu của
   nó nói về một bài C++ không tồn tại ở đây. */
const QS = ['Thử kể lại bằng lời: bài vừa đọc giải quyết việc gì, và nếu không có nó thì phải làm thế nào?',
  'Chạy thử đoạn mã trong bài rồi sửa một dòng cho sai hẳn đi — lỗi hiện ra có đúng chỗ bạn vừa sửa không?',
  'Nếu phải giải thích bài này cho một bạn chưa học, bạn sẽ bắt đầu từ câu nào?'];


/* ---- lifecycle helpers: everything the engine starts is tracked so it can be torn down ---- */
let dead = false;
const offs = [], timers = new Set(), rafs = new Set(), spines = new Set();
const on = (target, ev, fn, opts) => { target.addEventListener(ev, fn, opts); offs.push(() => target.removeEventListener(ev, fn, opts)); };
const setTimeout = (fn, ms, ...a) => { const id = window.setTimeout(() => { timers.delete(id); if (!dead) fn(...a); }, ms); timers.add(id); return id; };
const setInterval = (fn, ms, ...a) => { const id = window.setInterval(() => { if (!dead) fn(...a); }, ms); timers.add(id); return id; };
const clearTimeout = id => { timers.delete(id); window.clearTimeout(id); };
const clearInterval = clearTimeout;
const requestAnimationFrame = fn => { if (dead) return 0; const id = window.requestAnimationFrame(t => { rafs.delete(id); if (!dead) fn(t); }); rafs.add(id); return id; };
const cancelAnimationFrame = id => { rafs.delete(id); window.cancelAnimationFrame(id); };
const IW = 2752, IH = 1536;
const $ = (s, r = host) => r.querySelector(s);
const app = $('#app'), cam = $('#cam'), room = $('#room');
const EASE = 'cubic-bezier(.22,1,.36,1)';
let route = null, busy = false, opts = {}, windowOpen = false;
const par = {x:0,y:0,tx:0,ty:0};
let RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (RM) app.classList.add('rm');
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

/* ---------- lessons (one book = one lesson) ---------- */
/* each shelf is a course; each book on it is one lesson */
const BOOKCOL = k => DATA.cols[k] || '#3a3040';
const lighten = (hex,t) => { const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)); return '#'+v.map(c=>Math.round(c+(235-c)*t).toString(16).padStart(2,'0')).join(''); };
const COVER = k => lighten(BOOKCOL(k), .38);

/* ---------- cut-out objects ---------- */
const isBook = k => /^(book|pb|tb)\d+$/.test(k);
const KIND = {laptop:'laptop',notebook:'notebook',phone:'phone',mug:'mug',calendar:'calendar',corkboard:'corkboard',bookcase:'bookcase',
  cupTop:'trophy',cupLow:'trophy',medalTop:'medal',medalLow:'medal',medalHang:'medal'};
const ORIGIN = {calendar:'126px 38px',mug:'50% 85%',medalTop:'50% 22%',medalLow:'50% 20%',medalHang:'50% 14%',corkboard:'50% 0',phone:'50% 50%',notebook:'50% 80%'};
const GROUPS = [
  {g:'learn', route:'learn', label:'Laptop · ' + (CUR ? 'Học tiếp bài ' + CUR.l.no : 'Mở bài học'), keys:['laptop']},
  {g:'roadmap', route:'roadmap', label:'Bảng ghim · Lộ trình ' + MODULES.length + ' học phần', keys:['corkboard']},
  {g:'calendar', route:'calendar', label:'Lịch · Hôm nay', keys:['calendar']},
  {g:'practice', route:'practice', label:'Cuốn sổ · Ôn tập', keys:['notebook']},
  {g:'phone', route:'phone', label:'Điện thoại · Hồ sơ và xếp hạng', keys:['phone']},
  {g:'mug', route:'mug', label:'Cốc cà phê · Nghỉ 5 phút', keys:['mug']},
  {g:'achievements', route:'achievements', label:'Kệ cúp · Thành tựu', keys:['cupTop','medalTop','medalHang','cupLow','medalLow']},
  {g:'window', route:'window', label:'Cửa sổ · Mở để hóng gió', keys:[], poly:[[[1036,158],[1842,158],[1842,1088],[1036,1088]]]},
  /* Một cuốn sách trên kệ = một bài THẬT. `DATA.hits[k]` là phép lọc quan
     trọng: học phần có nhiều bài hơn số chỗ trên kệ (M6 có 9 bài, kệ `tb` chỉ
     8 chỗ) thì bài dư không có cuốn nào trỏ vào — bỏ phép lọc này là
     `DATA.hits[undefined]` và cả cảnh ném lỗi lúc dựng vùng bấm. */
  ...SHELVES.flatMap((S,s)=>S.lessons.map((l,i)=>({g:S.key+i, route:'book', s:S.mi, i, state:l.state,
    label:`${S.short} · Bài ${l.no}: ${l.title}`, keys:[S.key+i]})).filter(G=>DATA.hits[G.keys[0]]))
];
/* Khoá của cuốn sách ứng với bài đang học — để trỏ chuột vào nút "Học tiếp" là
   đúng cuốn đó sáng lên. Bản gốc viết cứng 'book3'. */
const KEY_CUR = (() => {
  if (!CUR) return null;
  const s = SHELVES.findIndex((S) => S.lessons.includes(CUR.l));
  if (s < 0) return null;
  const k = SHELVES[s].key + SHELVES[s].lessons.indexOf(CUR.l);
  return DATA.hits[k] ? k : null;
})();
const itemsEl = $('#items'), glowsEl = $('#glows');
const EL = {}, GEL = {};
Object.entries(DATA.meta).forEach(([k,[x,y,w,h]])=>{
  const kind = isBook(k) ? 'book' : KIND[k];
  const d = document.createElement('div'); d.className = `item k-${kind}`; d.dataset.k = k;
  Object.assign(d.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px',transformOrigin:ORIGIN[k]||'50% 100%'});
  d.innerHTML = `<img src="/goc-hoc/items/${k}.webp" alt="">` + (kind==='trophy' ? `<div class="shine" style="-webkit-mask-image:url(/goc-hoc/items/${k}.webp);mask-image:url(/goc-hoc/items/${k}.webp)"></div>` : '');
  itemsEl.appendChild(d); EL[k] = d;
  const g = document.createElement('div'); g.className = `glowi k-${kind}`; g.dataset.k = k;
  Object.assign(g.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px',transformOrigin:ORIGIN[k]||'50% 100%'});
  g.innerHTML = `<img src="/goc-hoc/items/${k}-g.webp" alt="">`; glowsEl.appendChild(g); GEL[k] = g;
});
// laptop screen life lives inside the laptop layer so it lifts with it
/* the laptop stands in front of the window glass, so it lives above the sash layer and carries its own light tint */
$('#itemsTop').appendChild(EL.laptop);
{ const [fx,fy,fw,fh] = [910, 810, 1166, 637]; Object.assign($('#front').style,{left:fx+'px',top:fy+'px',width:fw+'px',height:fh+'px'}); }
EL.laptop.insertAdjacentHTML('beforeend','<i class="tl m"></i><i class="tl d"></i><i class="tl s"></i>');
EL.laptop.querySelectorAll('.tl').forEach(t=>{ t.style.webkitMaskImage=t.style.maskImage='url(/goc-hoc/items/laptop.webp)'; });
EL.laptop.insertAdjacentHTML('beforeend','<div id="screenWrap" aria-hidden="true"><div id="screenGlow"></div><div id="screen"><div class="sbar"><i></i><i></i><i></i><b>bai_4.cpp</b><span>C++ · Bài 4/9</span></div><div class="sed"><div class="sgut" id="sgut"></div><pre id="scode"></pre></div></div></div>');
/* ---------- lịch tường ----------
 * Các ngày của tháng này, HÔM NAY được khoanh bằng một vòng vẽ tay.
 *
 * Bản gốc khoanh đỏ 12 ngày liên tiếp ("chuỗi học"). Hai lý do bỏ: sản phẩm đã
 * gỡ chuỗi ngày, và kể cả muốn vẽ lại thì cũng KHÔNG CÓ DỮ LIỆU — API chỉ trả
 * một con số `streak`, không trả tập ngày đã học, nên mọi vòng tròn ngoài
 * "hôm nay" đều là bịa. Ô ghi chú trên lịch vì vậy nói tiến độ khoá (số thật)
 * chứ không nói chuỗi. */
function ringPath(cx,cy,rx,ry){ const k=rx/16, j=ry/10, f=v=>v.toFixed(1);
  return `M${f(cx-16*k)} ${f(cy-2*j)}c${f(6*k)} ${f(-11*j)} ${f(26*k)} ${f(-12*j)} ${f(32*k)} ${f(-1*j)} ${f(5*k)} ${f(10*j)} ${f(-6*k)} ${f(18*j)} ${f(-18*k)} ${f(17*j)} ${f(-11*k)} ${f(-1*j)} ${f(-17*k)} ${f(-8*j)} ${f(-13*k)} ${f(-17*j)}`; }
function monthCells(){ const now=new Date(), y=now.getFullYear(), m=now.getMonth(), today=now.getDate();
  const first=(new Date(y,m,1).getDay()+6)%7, days=new Date(y,m+1,0).getDate(); const out=[];
  for (let d=1; d<=days; d++){ let i=first+d-1; if (i>34) i-=7; out.push({d,i,st: d===today?'today':''}); }
  return out; }
function calSVG(cells, labels, cw, fs, withIds){
  const lab=['T2','T3','T4','T5','T6','T7','CN'];
  let s = labels.map((p,i)=>`<text class="cl" x="${p[0]}" y="${p[1]}" font-size="${fs*0.9}">${lab[i]}</text>`).join('');
  monthCells().forEach(c=>{ const [x,y]=cells[c.i];
    s += `<text class="cd${c.st?' on':''}" x="${(x-cw*0.36).toFixed(1)}" y="${(y-cw*0.12).toFixed(1)}" font-size="${fs}">${c.d}</text>`;
    if (c.st) s += `<path class="ring ${c.st}" pathLength="100" ${withIds?'id="calPath"':''} d="${ringPath(x,y+cw*0.04,cw*0.42,cw*0.36)}"/>`; });
  return s; }
/* Chữ trong ô ghi chú dán trên lịch. `lessonsDone === null` nghĩa là CHƯA
   BIẾT (khách chưa có phiên, hay lượt gọi hỏng) — in "—", không in 0. */
const CAL_NOTE = USER.lessonsDone == null
  ? { to: '—', nho: 'chưa có phiên học' }
  : { to: `${USER.lessonsDone}/${TOTAL}`, nho: 'bài đã xong' };
{ const [ox,oy,ow,oh] = DATA.meta.calendar; const rc = CAL.room.cells; const cw = Math.hypot(rc[1][0]-rc[0][0], rc[1][1]-rc[0][1]);
  const [p0,p1] = CAL.room.pic; const nx=(p0[0]+p1[0])/2-ox, ny=(p0[1]+p1[1])/2-oy, nw=(p1[0]-p0[0])*0.86;
  EL.calendar.insertAdjacentHTML('beforeend',`<div id="calNote" aria-hidden="true" style="left:${nx}px;top:${ny}px;--s:${(nw/150).toFixed(3)}"><svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"/></svg><div><b>${CAL_NOTE.to}</b><small>${CAL_NOTE.nho}</small></div></div>
  <svg id="calSvg" viewBox="${ox} ${oy} ${ow} ${oh}" style="width:${ow}px;height:${oh}px">${calSVG(CAL.room.cells, CAL.room.labels, cw, cw*0.34, true)}</svg>`); }


function quadMatrix(w,h,q){
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = q;
  const dx1=x1-x2, dx2=x3-x2, dx3=x0-x1+x2-x3, dy1=y1-y2, dy2=y3-y2, dy3=y0-y1+y2-y3;
  const den = dx1*dy2-dx2*dy1, g=(dx3*dy2-dx2*dy3)/den, hh=(dx1*dy3-dx3*dy1)/den;
  const a=x1-x0+g*x1, b=x3-x0+hh*x3, c=x0, d=y1-y0+g*y1, e=y3-y0+hh*y3, f=y0;
  return `matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${c},${f},0,1)`;
}
$('#screenWrap').style.transform = quadMatrix(560,350,[[50.7, 82.5], [344.0, 50.2], [348.8, 214.0], [76.6, 254.9]]);
/* laptop types the current lesson's code */
const slen = SCODE.map(l=>l.reduce((a,t)=>a+t[1].length,0));
const esc = t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
let sl = 5, sc = 0;
function renderS(){
  let html='';
  for (let i=0;i<SCODE.length;i++){
    if (i<sl) html += SCODE[i].map(([c,t])=>c?`<span class="${c}">${esc(t)}</span>`:esc(t)).join('')+'\n';
    else if (i===sl){ let left=sc, p=''; for (const [c,t] of SCODE[i]){ if (left<=0) break; const part=t.slice(0,left); left-=part.length; p += c?`<span class="${c}">${esc(part)}</span>`:esc(part); } html += p+'<span class="scur"></span>\n'; }
  }
  $('#scode').innerHTML = html; $('#sgut').textContent = SCODE.map((_,i)=>i+1).join('\n');
}
function typeS(){
  if (app.classList.contains('away') || RM || document.hidden){ setTimeout(typeS, 900); return; }
  if (sl >= SCODE.length){ setTimeout(()=>{ sl=5; sc=0; renderS(); setTimeout(typeS,1200); }, 7000); return; }
  sc++;
  if (sc > slen[sl]){ sl++; sc=0; renderS(); setTimeout(typeS, 600 + Math.random()*500); return; }
  renderS(); setTimeout(typeS, 70 + Math.random()*130);
}
renderS(); setTimeout(typeS, 3400);

/* ---------- hit areas (traced from each cut-out) ---------- */
const hotHit = $('#hotHit'); const HITEL = [];
GROUPS.forEach(G=>{
  const kp = G.poly ? G.poly.map(p=>[null,p]) : G.keys.flatMap(k=>DATA.hits[k].map(p=>[k,p])); const polys = kp.map(x=>x[1]);
  const lab = G.label + (G.state==='lock'?' · chưa mở':G.state==='done'?' · đã học':G.state==='cur'?' · đang học':'');
  const h = mk('g',{class:'o',tabindex:'0',role:'button','aria-label':lab},hotHit);
  kp.forEach(([k,p])=>{ const e=mk('polygon',{points:p.map(q=>q.join(',')).join(' ')},h); if (k) e.dataset.k=k; });
  G.hit = h; HITEL.push(h);
  const xs=[],ys=[]; polys.forEach(p=>p.forEach(q=>{xs.push(q[0]);ys.push(q[1]);}));
  G.box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
});
// window first in DOM so books/objects sit above it for hit-testing
hotHit.prepend(GROUPS.find(G=>G.g==='window').hit);

const FOCUS = {
  learn:[806,1050,1126,1300], roadmap:[462,388,725,1040], book:[1955,495,2335,716],
  practice:[1280,1265,1625,1385], achievements:[1920,360,2170,950], phone:[1683,1300,1845,1386],
  pb:[1990,990,2350,1230], tb:[1990,1255,2350,1505], courses:[1945,480,2400,1520], calendar:[745,520,960,800]
};
const ROUTES = ['learn','roadmap','courses','practice','achievements','phone'];
const NAMES = {learn:'Học tiếp',roadmap:'Lộ trình',courses:'Khoá học',practice:'Ôn tập',achievements:'Thành tựu',phone:'Điện thoại'};

/* ---------- ambient ---------- */
const stars = $('#stars');
for (let i=0;i<26;i++){ const s=document.createElement('i'); s.className='star'; const x=Math.random()*788, y=10+Math.random()*380; if (x>352&&x<420) continue;
  Object.assign(s.style,{left:x+'px',top:y+'px',animationDelay:(-Math.random()*3.4).toFixed(2)+'s'}); stars.appendChild(s); }
const dropG = $('#dropG');
for (let k=0;k<2;k++){ const g = mk('g',{class:'drops'},dropG); g.style.animationDelay = (-k*0.31)+'s';
  for (let i=0;i<70;i++){ const x=1040+Math.random()*800, y=130+Math.random()*1920, l=26+Math.random()*30;
    mk('line',{x1:x,y1:y,x2:x-6,y2:y+l,stroke:'rgba(220,230,255,.42)','stroke-width':1.6},g); } }
[[$('#sashL'),11,379],[$('#sashR'),23,395]].forEach(([el,a,b])=>[[2,279],[297,613],[631,928]].forEach(([t,u])=>{ const p=document.createElement('div'); p.className='pane'; Object.assign(p.style,{left:a+'px',top:t+'px',width:(b-a)+'px',height:(u-t)+'px'}); el.insertBefore(p, el.querySelector('.gl')); }));
const cityG = $('#cityG');
[[1112,722,34,48],[1282,990,130,100],[1748,902,150,110],[1535,920,30,40],[1580,745,28,38]].forEach(([x,y,w,h],i)=>{
  const d=document.createElement('div'); d.className='city'; Object.assign(d.style,{left:(x-w/2)+'px',top:(y-h/2)+'px',width:w+'px',height:h+'px',animationDelay:(-i*2.3)+'s'}); cityG.appendChild(d); });
const steamG = $('#steamG');
for (let i=0;i<4;i++){ const w=document.createElement('div'); w.className='wisp'; w.style.animationDelay=(i*1.4)+'s'; w.style.left=(-30+(i%2?8:-6))+'px'; steamG.appendChild(w); }
const dustG = $('#dustG');
for (let i=0;i<16;i++){ const m=document.createElement('div'); m.className='mote';
  Object.assign(m.style,{left:(880+Math.random()*380)+'px',top:(960+Math.random()*260)+'px'});
  m.style.setProperty('--d',(7+Math.random()*7).toFixed(1)+'s'); m.style.setProperty('--dl',(-Math.random()*10).toFixed(1)+'s');
  m.style.setProperty('--mx',(Math.random()*60-30).toFixed(0)+'px'); m.style.setProperty('--my',(-20-Math.random()*50).toFixed(0)+'px'); dustG.appendChild(m); }
const BULBS = [[1430, 112], [1012, 116], [1870, 122], [1451, 130], [1405, 138], [1031, 142], [1489, 146], [1823, 150], [1884, 156], [1076, 157], [1358, 162], [1258, 168], [1589, 171], [1004, 172], [1179, 172], [1544, 173], [1768, 173], [1670, 174], [1313, 177], [1138, 181], [1724, 184], [1226, 191], [1638, 192], [1888, 200], [988, 220], [1866, 244], [991, 284], [1885, 303], [1009, 320], [1869, 354], [1011, 359], [1883, 399], [990, 414], [1878, 461], [1000, 466], [988, 504], [1857, 508], [1008, 557], [1881, 567], [995, 610], [1871, 625], [995, 657], [1877, 676], [1861, 714], [1007, 718], [1874, 769], [1004, 774], [1880, 806], [1019, 820], [1872, 874], [1878, 913], [1894, 957], [1892, 1043], [1900, 1068]];
const bulbG = $('#bulbG');
const bulbEls = BULBS.map(([x,y])=>{ const b=document.createElement('div'); b.className='bulb'; Object.assign(b.style,{left:x+'px',top:y+'px'});
  const i=document.createElement('i'); i.style.setProperty('--d',(2.5+Math.random()*3).toFixed(2)+'s'); i.style.setProperty('--dl',(-Math.random()*4).toFixed(2)+'s'); b.appendChild(i); bulbG.appendChild(b); return b; });

/* ---------- time of day ---------- */
const hx = c => [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const mixC = (a,b,t) => { const A=hx(a),B=hx(b); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`; };
const lerp = (a,b,t) => a+(b-a)*t;
let TOD = 18, realTime = true;
function sample(h){
  let i=0; while (i<KEYS.length-2 && KEYS[i+1].h<=h) i++;
  const A=KEYS[i], B=KEYS[i+1], t=Math.min(1,Math.max(0,(h-A.h)/(B.h-A.h))), s=t*t*(3-2*t);
  const o={}; for (const k in A){ if (k==='h') continue;
    o[k] = Array.isArray(A[k]) ? A[k].map((c,j)=>mixC(c,B[k][j],s)) : typeof A[k]==='string' ? mixC(A[k],B[k],s) : lerp(A[k],B[k],s); }
  return o;
}
const sg=$('#sgrad'), clB=$('#clB'), clR=$('#clR'), moon=$('#moon'), sun=$('#sun');
function applyTOD(h){
  const o = sample(((h%24)+24)%24);
  sg.style.background = `linear-gradient(180deg,${o.sky[0]} 0%,${o.sky[1]} 10%,${o.sky[2]} 41%,${o.sky[3]} 58%,${o.sky[4]} 74%,${o.sky[4]} 100%)`;
  clB.style.background = o.cb; clB.style.opacity = o.ca; clR.style.background = o.cr; clR.style.opacity = o.ra;
  stars.style.opacity = o.star; moon.style.opacity = o.moon; sun.style.opacity = o.sun;
  const hh = ((h%24)+24)%24;
  const mp = ((hh>=18?hh-18:hh+6)/12); moon.style.left = (80+mp*560)+'px'; moon.style.top = (230-Math.sin(mp*Math.PI)*170)+'px';
  const sp = Math.min(1,Math.max(0,(hh-6)/12)); sun.style.left = (120+sp*560)+'px'; sun.style.top = (560-Math.sin(sp*Math.PI)*430)+'px';
  $('#tMul').style.background = o.mul; $('#tMul').style.opacity = o.mo; $('#tDim').style.opacity = o.dim;
  app.style.setProperty('--mulc',o.mul); app.style.setProperty('--mo',o.mo); app.style.setProperty('--dimo',o.dim); app.style.setProperty('--scrc',o.scr); app.style.setProperty('--so',o.so);
  $('#tScr').style.background = o.scr; $('#tScr').style.opacity = o.so;
  $('#lampPool').style.opacity = o.lamp; $('#lampHalo').style.opacity = o.lamp; bulbG.style.opacity = .3 + .7*o.lamp; cityG.style.opacity = o.city;
  const b = 1 - o.mo*0.62 - o.dim*0.7 + o.so*0.5, s = 1 - o.mo*0.25;
  app.style.setProperty('--b', b.toFixed(3)); app.style.setProperty('--s', s.toFixed(3));
  app.classList.toggle('night', o.star > .5);
  const H = Math.floor(hh), M = Math.round((hh-H)*60)%60;
  $('#clockT').textContent = `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`;
  $('#tod').value = hh;
}
const nowH = () => { const d=new Date(); return d.getHours()+d.getMinutes()/60+d.getSeconds()/3600; };
let todAnim = null;
function setTOD(h, animate){
  cancelAnimationFrame(todAnim);
  if (!animate || RM){ TOD = h; applyTOD(TOD); return; }
  let from = TOD, to = h; if (to - from > 12) from += 24; if (from - to > 12) to += 24;
  const t0 = performance.now(), d = 1600;
  (function f(n){ const t=Math.min(1,(n-t0)/d), e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; TOD = from+(to-from)*e; applyTOD(TOD); if (t<1) todAnim=requestAnimationFrame(f); else TOD=((to%24)+24)%24; })(t0);
}
function setReal(v){ realTime = v; $('#tReal').setAttribute('aria-pressed',String(v)); $('#clockS').textContent = v ? 'theo giờ thật' : 'đang chỉnh tay';
  if (v) setTOD(nowH(), true); }
setInterval(()=>{ if (realTime && !todAnim) { TOD = nowH(); applyTOD(TOD); } }, 30000);

/* clouds drift: position follows the clock, plus a slow live drift */
let drift = 0, lastT = performance.now();
(function clouds(n){
  const dt = Math.min(.1,(n-lastT)/1000); lastT = n;
  if (!RM && !document.hidden) drift += dt * (windowOpen ? 16 : 3.5);
  const x = -(((TOD*90 + drift) % 648) + 648) % 648;
  const px = (route||busy) ? 0 : par.x*14;
  clB.style.transform = clR.style.transform = `translateX(${(x+px).toFixed(1)}px)`;
  requestAnimationFrame(clouds);
})(lastT);

/* ---------- layout ---------- */
const L = {s:1, ox:0, oy:0, W:0, H:0, mobile:false, sideLeft:0};
let C = {tx:0, ty:0, k:1};
function layout(){
  const W = app.clientWidth, H = app.clientHeight; L.W=W; L.H=H; L.mobile = W <= 820;
  if (!L.mobile){
    const side = Math.min(380, Math.max(320, W*0.23)); document.documentElement.style.setProperty('--side', side+'px');
    L.sideLeft = W - side - 16;
    let s = H/IH; if (IW*s < W*0.86) s = W*0.86/IW;
    const cL = 495, cR = 2348, avail0 = 6, avail1 = L.sideLeft - 6;
    let ox = (avail0+avail1)/2 - (cL+cR)/2*s;
    if ((cR-cL)*s > avail1-avail0) ox = avail0 - cL*s;
    ox = Math.min(0, ox);
    const oy = Math.min(0, (H - IH*s)*0.8);
    Object.assign(L,{s,ox,oy});
  } else {
    L.sideLeft = W;
    const stageH = H*0.6; const s = Math.max(stageH/IH*1.15, W/IW);
    let ox = W/2 - 1330*s; ox = Math.min(0, Math.max(W - IW*s, ox));
    const oy = Math.min(0, stageH*0.55 - 1150*s);
    Object.assign(L,{s,ox,oy});
  }
  room.style.transform = `translate(${L.ox}px,${L.oy}px) scale(${L.s})`;
  if (route) setCam(focusCam(FOCUS._cur||route)); else setCam({tx:0,ty:0,k:1});
  placeUI();
}
function setCam(c){ C = {...c}; cam.style.transform = `translate(${C.tx}px,${C.ty}px) scale(${C.k})`; }
function w2s(x,y,c=C){ return [c.tx + c.k*(L.ox + L.s*x), c.ty + c.k*(L.oy + L.s*y)]; }
function rectS(r,c=C){ const [a,b]=w2s(r[0],r[1],c), [d,e]=w2s(r[2],r[3],c); return {x:a,y:b,w:d-a,h:e-b,cx:(a+d)/2,cy:(b+e)/2}; }
function focusCam(name){
  const [x0,y0,x1,y1] = FOCUS[name]; const cx=(x0+x1)/2, cy=(y0+y1)/2;
  const rw=(x1-x0)*L.s, rh=(y1-y0)*L.s;
  let k = Math.min(L.W*0.42/rw, L.H*0.5/rh); k = Math.max(1.6, Math.min(name==='learn'?3.8:3.4, k));
  const px = L.ox + L.s*cx, py = L.oy + L.s*cy;
  let tx = L.W/2 - k*px, ty = L.H*0.5 - k*py;
  tx = Math.min(-k*L.ox, Math.max(L.W - k*(L.ox + L.s*IW), tx));
  ty = Math.min(-k*L.oy, Math.max(L.H - k*(L.oy + L.s*IH), ty));
  return {tx, ty, k};
}
function tweenCam(to, dur){
  return new Promise(res=>{
    if (RM || dur<=0){ setCam(to); return res(); }
    const from = {...C}; const W=L.W, H=L.H;
    const c0 = [(W/2-from.tx)/from.k, (H/2-from.ty)/from.k], c1 = [(W/2-to.tx)/to.k, (H/2-to.ty)/to.k];
    const lk0 = Math.log(from.k), lk1 = Math.log(to.k); const t0 = performance.now();
    const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
    (function f(now){ let t = Math.min(1,(now-t0)/dur); const e = ease(t);
      const k = Math.exp(lk0+(lk1-lk0)*e); const cx = c0[0]+(c1[0]-c0[0])*e, cy = c0[1]+(c1[1]-c0[1])*e;
      setCam({k, tx: W/2 - k*cx, ty: H/2 - k*cy}); if (t<1) requestAnimationFrame(f); else { setCam(to); res(); } })(t0);
  });
}

/* ---------- labels ---------- */
const tagsEl = $('#tags');
GROUPS.forEach(G=>{ const t=document.createElement('div'); t.className='tag';
  const st = G.state==='done'?'<i>✓ đã học</i>':G.state==='cur'?'<i>đang học</i>':G.state==='lock'?'<i>chưa mở</i>':'';
  t.innerHTML = G.label + st; tagsEl.appendChild(t); G.tag=t; });
const rankTag = document.createElement('div'); rankTag.className='tag'; rankTag.textContent=''; tagsEl.appendChild(rankTag);
function placeUI(){
  GROUPS.forEach(G=>{ const [x,y]=w2s((G.box[0]+G.box[2])/2, G.box[1]); Object.assign(G.tag.style,{left:x+'px',top:y+'px'}); });
  const [px,py] = w2s(1765,1290); Object.assign(rankTag.style,{left:px+'px',top:py+'px'});
  const demo = $('#demo'); demo.style.right = (L.mobile ? 16 : (L.W - L.sideLeft + 4))+'px'; demo.style.top = '64px';
  const pop = $('#calPop'); const [cx,cy] = w2s(966,560); pop.style.left = Math.min(cx+22, (peeking?L.W-16:L.sideLeft)-(peeking?312:262))+'px'; pop.style.top = Math.max(12,cy)+'px';
  if (notePop.classList.contains('on') && popNote) placeNotePop(popNote);
}

/* ---------- hover: lift the object, light its outline, link the menu ---------- */
function setOn(G, on){
  G.keys.forEach(k=>{ EL[k].classList.toggle('on',on); GEL[k].classList.toggle('on',on); });
  if (G.g==='window') host.querySelectorAll('[data-g="window"]').forEach(g=>g.classList.toggle('on',on));
  G.tag.classList.toggle('on', on && !route && !busy);
  if (G.g==='mug' && on){ steamG.classList.add('puff'); setTimeout(()=>steamG.classList.remove('puff'),2400); }
}
function clearHover(){ GROUPS.forEach(G=>setOn(G,false)); host.querySelectorAll('.hl').forEach(m=>m.classList.remove('hl')); }
const menuKey = G => G.route==='book' ? 'courses' : G.route;
function menuHL(r, on){ host.querySelectorAll(`[data-go="${r}"]`).forEach(m=>m.classList.toggle('hl',on)); }
GROUPS.forEach(G=>{
  const h=G.hit;
  h.addEventListener('pointerenter',()=>{ if (app.classList.contains('intro') || route || busy || peeking) return; setOn(G,true); menuHL(menuKey(G),true); });
  h.addEventListener('pointerleave',()=>{ setOn(G,false); menuHL(menuKey(G),false); });
  h.addEventListener('focus',()=>{ if (h.matches(':focus-visible')) setOn(G,true); });
  h.addEventListener('blur',()=>setOn(G,false));
  const act = (e)=>{ setOn(G,false); activate(G, e && e.target && e.target.dataset ? e.target.dataset.k : null); };
  h.addEventListener('click',act); h.addEventListener('keydown',e=>{ if (e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } });
});
function lightRoute(r, on){
  GROUPS.forEach(G=>{ if (G.route===r || (r==='learn' && KEY_CUR && G.g===KEY_CUR) || (r==='courses' && G.route==='book')) setOn(G,on); });
  const main = GROUPS.find(G=>G.route===r); if (main) main.tag.classList.toggle('on', on && !route && !busy);
}
host.querySelectorAll('[data-go]').forEach(b=>{ const r=b.dataset.go;
  b.addEventListener('pointerenter',()=>lightRoute(r,true)); b.addEventListener('pointerleave',()=>lightRoute(r,false));
  b.addEventListener('click',()=>{ lightRoute(r,false); go(r, r==='phone'?{tab:b.dataset.tab||'rank', pick:'phone'} : r==='practice'?{pick:'notebook'}:{}); }); });
$('#profile').addEventListener('click',()=>go('phone',{tab:'me', pick:'phone'}));
function activate(G, key){
  if (app.classList.contains('intro')) return;
  if (G.route==='window') return toggleWindow();
  if (G.route==='calendar') return peekCal();
  if (G.route==='mug') return sipMug();
  /* Không còn nhánh "bài bị khoá": khoá này không khoá bài nào, mọi bài đều mở
     được từ trang khoá học. G.s là chỉ số HỌC PHẦN (S.mi), không phải chỉ số kệ. */
  if (G.route==='book') return go('learn',{shelf:G.s, lesson:G.i, from:'book', pick:G.keys[0]});
  const pk = {phone:'phone', practice:'notebook', achievements: key || G.keys[0]}[G.route];
  go(G.route, Object.assign(G.route==='phone'?{tab:'me'}:{}, pk?{pick:pk}:{}));
}
function hideBook(i, hide){
  if (hide){ const el=EL[i], g=GEL[i]; el.style.transition='transform .5s cubic-bezier(.5,0,.75,0),opacity .3s .4s'; el.style.transform='translateY(-120px)'; el.style.opacity=0; g.style.opacity=0; el.dataset.out='1'; return; }
  Object.values(EL).forEach(el=>{ if (el.dataset.out){ delete el.dataset.out; const k=el.dataset.k;
    el.style.transition='none'; el.style.transform='translateY(-60px)'; el.style.opacity=0; el.offsetWidth;
    el.style.transition='transform .7s var(--ease),opacity .3s'; el.style.transform=''; el.style.opacity=''; GEL[k].style.opacity='';
    setTimeout(()=>{ el.style.transition=''; }, 800); } });
}

/* ---------- toast & calendar ---------- */
let toastT;
function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('on'),2600); }
const calPath = $('#calPath') || document.createElementNS('http://www.w3.org/2000/svg','path'); const calLen = 100;
calPath.style.strokeDasharray = calLen; calPath.style.strokeDashoffset = calLen;
function drawCal(){ calPath.animate([{strokeDashoffset:calLen},{strokeDashoffset:0}],{duration:RM?1:900,easing:'ease-in-out',fill:'forwards'}); }
function openCal(){ const p=$('#calPop'); placeUI(); p.hidden=false; drawCal(); p.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:RM?1:350,easing:EASE}); }
on(document,'pointerdown',e=>{ const p=$('#calPop'); if (!p.hidden && !p.contains(e.target)){ if (peeking) unpeek(); else p.hidden=true; } });

/* ---------- window & breeze ---------- */
let leafTimer = null;
const GW = GROUPS.find(G=>G.g==='window');
function toggleWindow(force){
  windowOpen = typeof force==='boolean' ? force : !windowOpen;
  app.classList.toggle('open', windowOpen); $('#tWin').setAttribute('aria-pressed', String(windowOpen));
  GW.label = windowOpen ? 'Cửa sổ · Đóng lại' : 'Cửa sổ · Mở để hóng gió'; GW.tag.textContent = GW.label; GW.hit.setAttribute('aria-label',GW.label);
  bulbEls.forEach(b=>b.firstChild.getAnimations().forEach(a=>a.playbackRate = windowOpen?1.7:1));
  clearInterval(leafTimer);
  if (windowOpen && !RM){ leafTimer = setInterval(spawnLeaf, 650); toast('Đã mở cửa sổ. Gió vào phòng rồi.'); }
}
const leafG = $('#leafG');
function spawnLeaf(){
  if (route || document.hidden) return;
  const el = document.createElement('div'); el.className='leaf';
  const pink = Math.random()<.65; el.style.background = pink ? (Math.random()<.5?'#ffc3d4':'#ffd9e3') : (Math.random()<.5?'#9cc58a':'#b9d79a');
  const x = 1120 + Math.random()*640, y = 220 + Math.random()*560; const dx = (Math.random()<.5?-1:1)*(220+Math.random()*520), dy = 420+Math.random()*420;
  const r0 = Math.random()*360, r1 = r0 + (Math.random()<.5?-1:1)*(240+Math.random()*360), sc = 1.4+Math.random()*1.2, d = 5200+Math.random()*2600;
  leafG.appendChild(el);
  el.animate([{transform:`translate(${x}px,${y}px) rotate(${r0}deg) scale(.6)`,opacity:0},
    {transform:`translate(${x+dx*.35}px,${y+dy*.25}px) rotate(${(r0+r1)/2}deg) scale(${sc*.8})`,opacity:.95,offset:.25},
    {transform:`translate(${x+dx*.7}px,${y+dy*.7}px) rotate(${r1-40}deg) scale(${sc})`,opacity:.85,offset:.7},
    {transform:`translate(${x+dx}px,${y+dy}px) rotate(${r1}deg) scale(${sc*1.1})`,opacity:0}],{duration:d,easing:'ease-in-out'}).finished.then(()=>el.remove());
}

/* ---------- sticky-note notifications ---------- */
const SLOTS = [1387,1459,1531,1603], NOTE_TOP = 1152, MAXN = 4;
const notesEl = $('#notes'), notePop = $('#notePop');
let notes = [], poolI = 0, popNote = null, popPinned = false, popT;
function noteEl(n){
  const d = document.createElement('button'); d.className='snote'; d.setAttribute('aria-label', `${n.k}: ${n.t}`);
  d.style.setProperty('--nc', `var(${n.c})`); d.style.setProperty('--rot', (Math.random()*5-2.5).toFixed(1)+'deg');
  d.innerHTML = `<i>${n.ic}</i><i>${n.sh}</i><i>${n.l3||''}</i>`;
  d.addEventListener('pointerenter',()=>{ clearTimeout(popT); if (!popPinned) showPop(n); });
  d.addEventListener('pointerleave',()=>{ if (!popPinned) popT=setTimeout(hidePop,220); });
  d.addEventListener('click',e=>{ e.stopPropagation(); popPinned = true; showPop(n); });
  d.addEventListener('focus',()=>{ if (d.matches(':focus-visible')) showPop(n); });
  return d;
}
function layoutNotes(){ notes.forEach((n,i)=>{ n.el.style.left = SLOTS[SLOTS.length-notes.length+i]+'px'; n.el.style.top = NOTE_TOP+'px'; n.el.style.zIndex = i+1; }); $('#badge').textContent = notes.length; $('#badge').hidden = !notes.length; }
function addNote(n, animate=true){
  n = {...n}; n.el = noteEl(n); notesEl.appendChild(n.el);
  if (notes.length >= MAXN) removeNote(notes[0], true);
  notes.push(n); layoutNotes();
  if (animate && !RM){
    n.el.animate([{transform:'translate(60px,-430px) rotate(38deg) scale(1.9)',opacity:0},
      {transform:'translate(20px,-200px) rotate(-12deg) scale(1.45)',opacity:1,offset:.45},
      {transform:'translate(0,6px) rotate(3deg) scale(1.02,.94)',offset:.82},
      {transform:'none'}],{duration:1150,easing:'cubic-bezier(.3,.7,.3,1)'});
    EL.phone.classList.add('buzz'); setTimeout(()=>EL.phone.classList.remove('buzz'),800);
    $('#bellBtn').animate([{rotate:'0deg'},{rotate:'14deg'},{rotate:'-12deg'},{rotate:'8deg'},{rotate:'0deg'}],{duration:700});
  }
}
function removeNote(n, fromAdd){
  const i = notes.indexOf(n); if (i<0) return; notes.splice(i,1);
  if (popNote===n) hidePop(true);
  const el = n.el; el.style.pointerEvents='none';
  if (RM){ el.remove(); } else {
    el.animate([{transform:'none',opacity:1},{transform:'rotate(-22deg) translate(-6px,4px)',opacity:1,offset:.25},
      {transform:'translate(-60px,330px) rotate(-70deg)',opacity:0}],{duration:1000,easing:'cubic-bezier(.5,0,.75,.4)',fill:'forwards'}).finished.then(()=>el.remove());
  }
  if (!fromAdd) layoutNotes();
}
function nextNote(){ if (!GHI_CHU.length) return; addNote(GHI_CHU[poolI++ % GHI_CHU.length]); }
function placeNotePop(n){
  const r = n.el.getBoundingClientRect(); const w = 268;
  let x = r.left + r.width/2 - w/2; x = Math.max(12, Math.min(x, L.sideLeft - w - 12));
  notePop.style.left = x+'px'; notePop.style.top = Math.max(12, r.top - notePop.offsetHeight - 14)+'px';
}
function showPop(n){
  popNote = n; notes.forEach(m=>m.el.classList.toggle('on', m===n));
  $('#npK').textContent = n.k; $('#npT').textContent = n.t; $('#npB').textContent = n.b;
  const g = $('#npGo'); g.textContent = n.act; g.hidden = false;
  notePop.classList.add('on'); placeNotePop(n);
}
function hidePop(force){ if (popPinned && !force) return; popPinned=false; notePop.classList.remove('on'); notes.forEach(m=>m.el.classList.remove('on')); popNote=null; }
notePop.addEventListener('pointerenter',()=>clearTimeout(popT));
notePop.addEventListener('pointerleave',()=>{ if (!popPinned) popT=setTimeout(hidePop,220); });
$('#npGo').addEventListener('click',()=>{ const n=popNote; if (!n) return; hidePop(true); if (n.go) { removeNote(n); go(n.go[0], {...n.go[1]}); } else removeNote(n); });
$('#npDel').addEventListener('click',()=>{ const n=popNote; if (n) removeNote(n); });
on(document,'pointerdown',e=>{ if (popPinned && !notePop.contains(e.target) && !e.target.closest('.snote')) hidePop(true); });
$('#bellBtn').addEventListener('click',()=>{ if (!notes.length) return toast('Chưa có ghi chú mới');
  notes.forEach((n,i)=>!RM && n.el.animate([{transform:'none'},{transform:'translateY(-10px) rotate(-4deg)'},{transform:'none'}],{duration:500,delay:i*80,easing:EASE}));
  popPinned = true; showPop(notes[notes.length-1]); });

/* ---------- parallax ---------- */
app.addEventListener('pointermove',e=>{ if (RM || L.mobile) return; par.tx = (e.clientX/L.W-.5)*2; par.ty = (e.clientY/L.H-.5)*2; });
(function pl(){ par.x += (par.tx-par.x)*0.06; par.y += (par.ty-par.y)*0.06;
  if (!route && !busy){ room.style.translate = `${-par.x*6}px ${-par.y*4}px`;
    host.querySelectorAll('.ui').forEach(u=>u.style.translate = `${par.x*3}px ${par.y*2}px`); }
  requestAnimationFrame(pl); })();

setInterval(()=>{ if (route || busy || RM || document.hidden) return; $('#phoneGlow').classList.add('ping'); rankTag.classList.add('on');
  setTimeout(()=>{ $('#phoneGlow').classList.remove('ping'); rankTag.classList.remove('on'); }, 3200); }, 23000);

/* ---------- counters ---------- */
const fmt = n => n.toLocaleString('vi-VN');
function countUp(){ host.querySelectorAll('[data-count]').forEach(el=>{ const end=+el.dataset.count; if (RM){ el.textContent=fmt(end); return; }
  const t0=performance.now(), d=1100; (function f(n){ const t=Math.min(1,(n-t0)/d), e=1-Math.pow(1-t,3); el.textContent=fmt(Math.round(end*e)); if(t<1) requestAnimationFrame(f); })(t0); }); }

/* ---------- intro: the lamp clicks on ---------- */
const uiEls = () => [$('#profile'), $('#side'), $('#hint')];
let introAnims = [], introTimer = [], notesStarted = false;
function finishIntro(){
  introAnims.forEach(a=>{ try{ a.cancel(); }catch(e){} }); introAnims=[]; introTimer.forEach(clearTimeout); introTimer=[];
  const dk=$('#dark'); dk.style.opacity=0; dk.style.setProperty('--r','0px');
  app.classList.remove('intro'); placeUI();
  if (!notesStarted){ notesStarted = true; setTimeout(()=>{ if (notes.length<3) nextNote(); }, 5000); setTimeout(()=>{ if (notes.length<4) nextNote(); }, 24000); }
}
function runIntro(){
  if (route) return;
  app.classList.add('intro'); hidePop(true);
  calPath.getAnimations().forEach(a=>a.cancel()); calPath.style.strokeDashoffset = calLen;
  if (RM){ finishIntro(); drawCal(); countUp(); return; }
  const dark=$('#dark'), pool=$('#lampPool'), halo=$('#lampHalo'), scr=$('#screenWrap');
  [dark,pool,halo,scr,...bulbEls,...uiEls(),tagsEl].forEach(e=>e.getAnimations().forEach(a=>a.cancel()));
  dark.style.opacity=1; dark.style.setProperty('--r','-700px');
  const A = (el,k,o) => { const a = el.animate(k,{fill:'both',easing:EASE,...o}); introAnims.push(a); return a; };
  const lf = Math.max(.35, sample(TOD).lamp);
  A(halo,[{opacity:0},{opacity:lf,offset:.2},{opacity:.7*lf,offset:.35},{opacity:lf}],{delay:450,duration:500,easing:'linear'});
  A(pool,[{transform:'scale(.6)'},{transform:'scale(1)'}],{delay:500,duration:900});
  A(dark,[{'--r':'-700px'},{'--r':'420px'}],{delay:500,duration:1100});
  const order = BULBS.map((p,i)=>({i, t: p[1]<205 ? (p[0]-980)/900*0.45 : 0.45 + (p[1]-205)/870*0.55})).sort((a,b)=>a.t-b.t);
  order.forEach((o,n)=>A(bulbEls[o.i],[{opacity:0},{opacity:1}],{delay:1000+n*16,duration:260}));
  A(scr,[{opacity:0},{opacity:.5,offset:.2},{opacity:.2,offset:.35},{opacity:1}],{delay:1500,duration:600,easing:'linear'});
  A(dark,[{opacity:1},{opacity:0}],{delay:1900,duration:900});
  [[ $('#profile'),'translateY(-14px)'],[ $('#side'),'translateX(26px)'],[ $('#hint'),'translateY(14px)']].forEach(([el,t],i)=>
    A(el,[{opacity:0,transform:t},{opacity:1,transform:'none'}],{delay:2150+i*90,duration:800}));
  introTimer.push(setTimeout(countUp,2200));
  introTimer.push(setTimeout(()=>{ drawCal(); finishIntro(); },3100));
}
$('#skip').addEventListener('click',()=>{ finishIntro(); countUp(); drawCal(); });
on(window,'keydown',e=>{ if (e.key==='Escape'){ if (app.classList.contains('intro')){ finishIntro(); countUp(); drawCal(); } else if (route) back(); else if (peeking) unpeek(); else { $('#calPop').hidden=true; hidePop(true); } } });
/* ---------- nội dung các màn ----------
 * Mọi màn dưới đây dựng từ `CONTENT` (giáo trình thật) và `USER` (số thật hoặc
 * null). Chuỗi nào đến từ SERVER (tên người, tên trong bảng xếp hạng, tên huy
 * hiệu) đều đi qua `esc()` trước khi vào innerHTML — chúng là dữ liệu người
 * dùng nhập được, không phải chữ của mình. */
const page = $('#page');

/** Cuốn sách trên kệ ứng với (học phần, bài) — null nếu bài đó không có chỗ. */
const bookKeyOf = (mi, li) => { const m = MODULES[mi];
  const k = m && m.shelfKey ? m.shelfKey + li : null; return k && DATA.hits[k] ? k : null; };
const lessonAt = (mi, li) => (MODULES[mi] ? MODULES[mi].lessons[li] : null);
/** Bài mở ra khi bấm "Học tiếp" / tab "Bài học": bài được gợi ý. */
const CUR_OPTS = (() => {
  if (!CUR) return { shelf: 0, lesson: 0 };
  const mi = MODULES.indexOf(CUR.m);
  return { shelf: Math.max(0, mi), lesson: Math.max(0, CUR.m.lessons.indexOf(CUR.l)) };
})();
/** Màu gáy cho sách KHÔNG có cuốn tương ứng trong phòng (năm học phần cuối). */
const COL_PHU = ['#4f56a3','#5f66b3','#3f4693','#6c2d3b','#51392e','#292349','#572447','#232d42'];
const modStats = (m) => { const d = m.lessons.filter((l) => l.state === 'done').length, n = m.lessons.length;
  return { d, n, pct: n ? Math.round((d / n) * 100) : 0,
    sub: USER.lessonsDone == null ? `${n} bài` : `${d}/${n} bài đã xong` }; };

function topBar(r){
  return `<div class="top" id="topbar"><button class="back glass" id="backBtn"><svg class="i"><use href="#i-left"/></svg>Góc học</button>
  <nav class="tabs glass" aria-label="Các khu trong phòng">${ROUTES.map(x=>`<button class="tab" data-tab="${x}" ${x===r?'aria-current="page"':''}>${NAMES[x]}</button>`).join('')}</nav>
  <div class="pill dn" title="Bài đã hoàn thành"><svg class="i"><use href="#i-check"/></svg>${USER.lessonsDone == null ? '—' : USER.lessonsDone + '/' + TOTAL}</div>
  <div class="pill xpp" title="Tổng XP"><svg class="i"><use href="#i-bolt"/></svg>${SO(USER.xp)}</div></div>`;
}
/** Khối "chưa có số" dùng chung cho mọi màn cần phiên học. */
function trong(tieu, cau){
  return `<div class="empty glass"><b>${tieu}</b><p>${cau}</p></div>`;
}

function body(r){
  if (r==='courses') return `<div class="pg"><div class="pghead"><div><h1>Khoá học</h1><p>${esc(CONTENT.course.name)} · ${MODULES.length} học phần · ${TOTAL} bài. Ba học phần đầu là ba kệ sách trong phòng; mỗi cuốn sách là một bài.</p></div></div>
    <div class="lib">${MODULES.map((m,mi)=>{ const st=modStats(m);
      const books = m.lessons.map((l,i)=>{ const k=bookKeyOf(mi,i); const col = k ? COVER(k) : COL_PHU[(mi+i)%COL_PHU.length];
        return `<button class="bk ${l.state==='cur'?'cur':''}" data-mi="${mi}" data-li="${i}" ${k?`data-k="${k}"`:''} style="--w:${[44,48,42,46,48,44,52,44,48,42,46][i%11]}px;--h:${[176,162,154,170,160,166,180,158,172,164,168][i%11]}px;background:${col}" aria-label="Bài ${l.no}: ${esc(l.title)}${l.state==='done'?' · đã học':''}"><span class="no">${l.no}</span><span class="tt">${esc(l.title)}</span></button>`; }).join('');
      return `<section class="course${m.shelfKey?' room-course':''}"><div class="meta"><h3>${esc(m.name)}</h3><p>${st.sub}${m.shelfKey?'':' · chưa có kệ trong phòng'}</p><div class="bar"><i style="width:${st.pct}%"></i></div></div><div class="shelfrow">${books}</div></section>`; }).join('')}</div></div>`;

  if (r==='roadmap'){
    const d = 'M'+ROAD.map(p=>p.at.join(' ')).join(' L ');
    /* Dây đỏ chỉ chạy qua các học phần ĐÃ XONG HẾT. Chưa xong học phần nào thì
       nó là một điểm (dài 0) — không vẽ thêm đoạn nào để khỏi khoe tiến độ
       không có. */
    const doneMods = MODULES.filter(m=>m.lessons.every(l=>l.state==='done')).length;
    const strPts = ROAD.slice(0, Math.max(1, doneMods)).map(p=>p.at.join(' ')).join(' L ');
    const curMi = MODULES.indexOf(CUR ? CUR.m : null);
    return `<div class="pg"><div class="pghead"><div><h1>Lộ trình</h1><p>${esc(CONTENT.course.name)} · ${MODULES.length} học phần${USER.lessonsDone == null ? '' : ` · đã xong ${USER.lessonsDone}/${TOTAL} bài`}</p></div></div>
    <div class="paperwrap"><div class="board" id="board"><div class="paper" id="paper"><svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
      <path class="path" d="${d}" id="rpath"/><path class="string" id="rstr" d="M${strPts}"/>
      ${ROAD.map((p,i)=>{ const m=MODULES[i]; if(!m) return '';
        const all=m.lessons.every(l=>l.state==='done'); const st = all?'done' : i===curMi?'cur':'next';
        const fill = st==='done'?'#c8323d':st==='cur'?'#e39a4a':'#b8a88a'; const [lx,ly,an]=p.lbl;
        return `<g class="node" style="transform-origin:${p.at[0]}px ${p.at[1]}px">${st==='cur'?`<circle cx="${p.at[0]}" cy="${p.at[1]}" r="30" fill="#ffc97a" opacity=".35"/>`:''}
          <circle cx="${p.at[0]}" cy="${p.at[1]}" r="17" fill="${fill}"/><text class="num" x="${p.at[0]}" y="${p.at[1]+5.5}" text-anchor="middle">${i+1}</text>
          <text x="${lx}" y="${ly}" text-anchor="${an}">${esc(m.name)}${all?' ✓':''}</text></g>`; }).join('')}
    </svg><div class="note" id="note">${CUR?`<b>${esc(CUR.m.short)}</b>${esc(CUR.l.title)}<br>${modStats(CUR.m).sub}<br><button class="btn" data-tab="learn">Xem bài</button>`:'Giáo trình chưa có học phần nào'}</div></div></div></div></div>`;
  }

  if (r==='learn'){
    const mi = opts.shelf ?? CUR_OPTS.shelf, li = opts.lesson ?? CUR_OPTS.lesson;
    const m = MODULES[mi], l = lessonAt(mi, li);
    if (!m || !l) return `<div class="pg">${trong('Không tìm thấy bài', 'Giáo trình không có bài ở vị trí này.')}</div>`;
    /* Khung bên phải KHÔNG dựng lại nội dung bài: nội dung thật (lý thuyết, mã
       chạy được, các màn luyện) nằm ở /lesson/python_advanced và chỉ có ở đó.
       Bản gốc gõ sẵn một đoạn C++ cho mỗi "bài" — tức một bài học bịa nằm ngay
       trong trang chủ. Thay bằng MỤC LỤC thật của học phần, và một nút mở bài
       thật. */
    const muc = m.lessons.map((x)=>`${String(x.no).padStart(2,' ')}  ${x.state==='done'?'✓':x.state==='cur'?'→':'·'} ${x.title}`).join('\n');
    return `<div class="pg"><div class="lesson" id="lesson">
    <div class="lx"><div class="eyebrow">${esc(m.name)} · Bài ${l.no}/${TOTAL}</div><h2>${esc(l.title)}</h2>
      ${l.state==='done'?'<p><span class="done-chip"><svg class="i"><use href="#i-check"/></svg>Đã học</span></p>':''}
      <p class="facts">${l.minutes?`${l.minutes} phút`:''}${l.minutes&&l.xp?' · ':''}${l.xp?`+${l.xp} XP`:''}${l.code?` · mã bài ${esc(l.code)}`:''}</p>
      <p>Bài học thật mở ở màn học: lý thuyết ngắn, ví dụ chạy được trong trình duyệt, rồi các màn luyện. Căn phòng này là lối vào, không phải nơi chứa bài.</p>
      <p><a class="btn" href="${lessonHref(l.no)}">Mở bài ${l.no}</a></p>
      <div class="dots">${m.lessons.map(x=>`<i class="${x.state==='done'?'d':x.state==='cur'?'c':''}"></i>`).join('')}<span>${esc(m.short)} · ${m.lessons.length} bài</span></div></div>
    <div class="edx"><div class="bar"><b>${esc(m.short)}</b><span>mục lục học phần</span></div>
      <div class="code"><div class="gut">${m.lessons.map((_,i)=>i+1).join('\n')}</div><pre>${esc(muc)}</pre></div>
      <div class="out"><small>Dấu</small><pre>✓ đã xong   → đang gợi ý học   · chưa học</pre></div></div></div></div>`;
  }

  if (r==='practice'){
    /* Luật THẬT của /practice: backend đòi kho câu ≥ 5 mà mỗi bài góp 3 câu,
       nên phải xong 2 bài mới sinh được đề (xem lib/practice-plan.ts). Nói
       trước điều đó thay vì để người học bấm rồi nhận lỗi 400. */
    const done = USER.lessonsDone;
    const xong = MODULES.flatMap(m=>m.lessons).filter(l=>l.state==='done');
    const moDuoc = done != null && done >= 2;
    return `<div class="pg"><div class="pghead"><div><h1>Ôn tập</h1><p>Câu hỏi lấy từ chính những bài bạn đã xong — xong càng nhiều thì kho câu càng rộng</p></div></div>
    <div class="spread" id="spread"><div class="leafp l"><h3>Mở được chưa?</h3>
      <p class="hw">${done == null ? 'Chưa đọc được tiến độ của bạn, nên chưa biết. Mở một bài học là máy có phiên và chỗ này tự có số.'
        : moDuoc ? `Rồi. Bạn đã xong ${done} bài, đủ để sinh một đề ôn.`
        : `Chưa. Cần xong 2 bài (bạn đang có ${done}) vì mỗi bài chỉ góp 3 câu, mà một đề cần ít nhất 5 câu.`}</p>
      <p class="hw" style="margin-top:12px"><a class="btn" href="/practice">Mở trang Ôn tập</a></p></div>
      <div class="leafp r"><h3>Bài đã xong</h3>
      ${xong.length ? `<ul class="plist">${xong.slice(-6).reverse().map(l=>`<li><span class="s d"></span><span>${esc(l.title)}<small>Bài ${l.no}${l.code?` · ${esc(l.code)}`:''}</small></span><span class="x">+${l.xp||0}</span></li>`).join('')}</ul>`
        : `<p class="hw">${done == null ? 'Chưa có phiên học trên máy này.' : 'Chưa có bài nào. Xong bài đầu tiên là nó hiện ở đây.'}</p>`}
      </div><div class="flip" id="flip"></div></div></div>`;
  }

  if (r==='achievements'){
    const list = USER.badgeList;
    let than;
    if (list == null) than = trong('Chưa đọc được huy hiệu',
      'Huy hiệu gắn với tài khoản. Mở một bài học để máy có phiên, rồi quay lại đây.');
    else if (!list.length) than = trong('Danh mục huy hiệu đang trống',
      'Server trả về danh sách rỗng: chưa có huy hiệu nào được định nghĩa trong hệ thống (bảng danh mục chưa ai ghi vào). Kệ cúp sẽ tự có đồ khi danh mục có dòng đầu tiên.');
    else {
      const rows = [];
      for (let i=0;i<list.length;i+=8) rows.push(list.slice(i,i+8));
      than = `<div class="trophy" id="trophy">${rows.map(row=>`<div class="plank">${row.map(b=>`<div class="bdg${b.unlocked?'':' soon'}" title="${esc(b.name)}"><div class="med bronze">${esc((b.code||'?').slice(0,4))}</div><span>${esc(b.name)}</span></div>`).join('')}</div>`).join('')}<div class="sweep" id="sweep"></div></div>`;
    }
    const mo = list ? list.filter(b=>b.unlocked).length : null;
    return `<div class="pg"><div class="pghead"><div><h1>Thành tựu</h1><p>${list == null ? 'chưa đọc được' : `${mo}/${list.length} huy hiệu đã mở`}</p></div></div>${than}</div>`;
  }

  if (r==='phone'){
    const t = opts.tab==='rank' ? 'rank' : 'me';
    const ten = TEN.doc();
    const hien = ten || USER.name || 'Khách';
    const board = USER.board;
    const me = board ? board.find(e=>e.isMe) : null;
    return `<div class="pg"><div class="phonewrap"><div class="phone" id="phone"><img class="pframe" src="/goc-hoc/items/page/phone-frame.webp" alt=""><div class="scr"><div class="hd">
      <div class="seg" role="tablist"><button role="tab" data-pt="me" aria-selected="${t==='me'}">Hồ sơ</button><button role="tab" data-pt="rank" aria-selected="${t==='rank'}">Xếp hạng</button></div></div>
      <div class="pv" id="pvMe" ${t!=='me'?'hidden':''}><div class="prof">
        <div class="who"><span class="a">${esc(hien.trim()[0] || '?').toUpperCase()}</span><div><b>${esc(hien)}</b><small>${USER.signedIn ? 'đang có phiên học' : 'chưa có phiên học trên máy này'}</small></div></div>
        <div><div class="xpb"><i style="width:${PCT}%"></i></div><div class="xpl"><span>${USER.lessonsDone == null ? '— bài' : `${USER.lessonsDone}/${TOTAL} bài`}</span><span>${esc(CONTENT.course.name)}</span></div></div>
        <div class="stats"><div><b>${SO(USER.xp)}</b><small>tổng XP</small></div><div><b>${USER.lessonsDone == null ? '—' : USER.lessonsDone}</b><small>bài đã xong</small></div><div><b>${USER.badges ? USER.badges.done : '—'}</b><small>huy hiệu</small></div><div><b>${USER.rank ? USER.rank.rank : '—'}</b><small>hạng theo XP</small></div></div>
        <div class="act"><h5>Khoá đang học</h5><div class="rb" style="display:block"><b style="font-size:15px">${esc(CUR ? CUR.m.name : CONTENT.course.name)}</b><div style="margin-top:6px;color:#5b6890">${CUR ? esc(CUR.l.title) : ''}</div></div></div>
        <div class="sample">Những ô ghi "—" là số chưa đọc được, không phải số 0.</div>
      </div></div>
      <div class="pv" id="pvRank" ${t!=='rank'?'hidden':''}>
        <div class="namebox"><label for="tenIn">Tên hiển thị của bạn</label>
          <div class="nrow"><input id="tenIn" maxlength="24" placeholder="ví dụ: Sơn USTH" value="${esc(ten || '')}"><button class="btn" id="tenSave">Lưu</button></div>
          <small>Tên này chỉ lưu TRONG MÁY BẠN để bạn nhận ra dòng của mình. Backend chưa nhận tên hiển thị, nên người khác vẫn thấy bạn là một tài khoản khách.</small></div>
        ${board == null ? trong('Chưa đọc được bảng xếp hạng', 'Bảng xếp hạng gắn với tài khoản. Mở một bài học để máy có phiên, rồi quay lại đây.')
          : !board.length ? trong('Bảng xếp hạng đang trống', 'Server chưa trả về dòng nào.')
          : `<ul class="lb">${board.map(e=>`<li${e.isMe?' class="mine"':''}><span class="rk">${e.rank}</span><span class="av">${esc((e.isMe && ten ? ten : e.name).trim()[0] || '?').toUpperCase()}</span><span>${esc(e.isMe && ten ? ten : e.name)}${e.isMe?' <span class="up">bạn</span>':''}</span><span class="xp2">${SO(e.value)} XP</span></li>`).join('')}</ul>`}
        ${me ? `<div class="me"><span class="rk">${me.rank}</span><span class="av">${esc((ten || me.name).trim()[0] || '?').toUpperCase()}</span><span>${esc(ten || me.name)}</span><span>${SO(me.value)} XP</span></div>` : ''}
        <div class="sample">Tên của người khác do hệ thống đặt cho tài khoản khách (dạng "Khách XXXX") — chưa ai đặt được tên hiển thị.</div></div>
    </div></div></div></div>`;
  }
}

function wirePage(r, fresh){
  if (fresh) $('#backBtn').addEventListener('click', back);
  (fresh ? page : page.querySelector('.stagearea')).querySelectorAll('[data-tab]').forEach(t=>t.addEventListener('click',()=>{ const n=t.dataset.tab; if (n!==route || n==='learn') sibling(n, n==='learn'?{...CUR_OPTS}:{}); }));
  const sa = page.querySelector('.stagearea');
  if (r==='courses'){
    sa.querySelectorAll('.bk[data-mi]').forEach(b=>b.addEventListener('click',()=>
      sibling('learn',{shelf:+b.dataset.mi, lesson:+b.dataset.li})));
  }
  if (r==='phone'){
    sa.querySelectorAll('[data-pt]').forEach(b=>b.addEventListener('click',()=>{ const t=b.dataset.pt;
      sa.querySelectorAll('[data-pt]').forEach(x=>x.setAttribute('aria-selected', String(x===b)));
      $('#pvMe').hidden = t!=='me'; $('#pvRank').hidden = t!=='rank';
      const v = t==='me'?$('#pvMe'):$('#pvRank'); if (!RM) v.animate([{opacity:0,transform:`translateX(${t==='me'?-16:16}px)`},{opacity:1,transform:'none'}],{duration:350,easing:EASE}); }));
    const inp = $('#tenIn'), nut = $('#tenSave');
    if (inp && nut){
      const luu = ()=>{ const v = inp.value.trim().slice(0,24); TEN.ghi(v);
        toast(v ? `Đã lưu tên hiển thị: ${v}` : 'Đã bỏ tên hiển thị');
        /* Vẽ lại đúng màn đang mở để dòng của mình đổi tên ngay, không phải
           đợi lần mở sau. */
        const cur = page.querySelector('.stagearea'); if (cur){ cur.innerHTML = body('phone'); wirePage('phone', false); }
        /* và cả khung ngoài: tên trên ảnh đại diện phải đổi NGAY, không đợi lần
           mở sau — người vừa đặt tên sẽ đi tìm xem nó hiện ở đâu. */
        apDungSo(); };
      nut.addEventListener('click', luu);
      inp.addEventListener('keydown', e=>{ if (e.key==='Enter'){ e.preventDefault(); luu(); } });
    }
  }
}

/* ---------- transitions ---------- */
const blurHole = $('#blurHole'), blurFull = $('#blurFull'), scrim = $('#scrim');
function anim(el,k,o){ return el.animate(k,{fill:'forwards',easing:EASE,...o}).finished; }
function setHole(r){ const f=FOCUS[r]; const cx=(f[0]+f[2])/2, cy=(f[1]+f[3])/2, rx=(f[2]-f[0])*0.9+60, ry=(f[3]-f[1])*0.9+60;
  const m = `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, transparent 55%, #000 100%)`; blurHole.style.webkitMaskImage = m; blurHole.style.maskImage = m; }
function uiOut(){ const d = RM?1:380;
  return Promise.all([anim($('#side'),[{opacity:1,transform:'none'},{opacity:0,transform:'translateX(40px)'}],{duration:d}),
    anim($('#profile'),[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-16px)'}],{duration:d}),
    anim($('#hint'),[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(16px)'}],{duration:d}),
    anim(tagsEl,[{opacity:1},{opacity:0}],{duration:d*0.6})]); }
function uiIn(){ const d = RM?1:700; [$('#side'),$('#profile'),$('#hint')].forEach((el,i)=>anim(el,[{opacity:0,transform:i===0?'translateX(30px)':i===1?'translateY(-12px)':'translateY(12px)'},{opacity:1,transform:'none'}],{duration:d,delay:RM?0:i*90}));
  anim(tagsEl,[{opacity:0},{opacity:1}],{duration:d,delay:RM?0:300}); }
const focusKey = (r,o) => (r==='learn' && o.from==='book' && MODULES[o.shelf||0] && MODULES[o.shelf||0].focus)
  ? MODULES[o.shelf||0].focus : r;

async function go(r, o={}){
  if (busy || route || peeking || app.classList.contains('intro')) return; busy = true; route = r; opts = o; ghiHash(r);
  closeDemo(); $('#calPop').hidden = true; app.classList.add('away'); clearHover(); hidePop(true); HITEL.forEach(h=>h.setAttribute('tabindex','-1')); notesEl.style.pointerEvents='none';
  host.querySelectorAll('.hl').forEach(m=>m.classList.remove('hl')); room.style.translate='0px 0px';
  if (o.pick){
    const lift = pickStart(o.pick); uiOut(); FOCUS._cur = focusKey(r,o);
    const p = itemRect(o.pick); const kk = 1.06;
    tweenCam({k:kk, tx:(p.cx)*(1-kk), ty:(p.cy)*(1-kk)}, RM?0:1100);
    anim(blurFull,[{opacity:0},{opacity:1}],{duration:RM?1:700}); anim(scrim,[{opacity:0},{opacity:1}],{duration:RM?1:700});
    await lift; await reveal(r, true); busy = false; return;
  }
  const fk = focusKey(r,o); setHole(fk); await uiOut();
  const target = focusCam(fk); FOCUS._cur = fk;
  const p1 = tweenCam(target, RM?0:1000);
  anim(blurHole,[{opacity:0},{opacity:1}],{duration:RM?1:900});
  await p1;
  anim(blurFull,[{opacity:0},{opacity:1}],{duration:RM?1:500}); anim(scrim,[{opacity:0},{opacity:1}],{duration:RM?1:500});
  await reveal(r, true);
  busy = false;
}
async function back(){
  if (busy || !route) return; busy = true; const r = route; ghiHash(null);
  if (opts.pick && PK.k){
    const camBack = tweenCam({tx:0,ty:0,k:1}, RM?0:900);
    const bd = RM?0:(r==='learn'?950:r==='achievements'?500:250);
    anim(blurFull,[{opacity:1},{opacity:0}],{duration:RM?1:700, delay:bd}); anim(scrim,[{opacity:1},{opacity:0}],{duration:RM?1:700, delay:bd});
    if (RM){ page.innerHTML=''; } else { await pickConceal(r); }
    page.innerHTML=''; page.classList.remove('live'); await camBack; pickEnd();
    route = null; placeUI(); uiIn(); app.classList.remove('away'); HITEL.forEach(h=>h.setAttribute('tabindex','0')); notesEl.style.pointerEvents='';
    busy = false; return;
  }
  await conceal(r);
  page.innerHTML=''; page.classList.remove('live');
  anim(blurFull,[{opacity:1},{opacity:0}],{duration:RM?1:500}); anim(scrim,[{opacity:1},{opacity:0}],{duration:RM?1:600});
  const p = tweenCam({tx:0,ty:0,k:1}, RM?0:950); anim(blurHole,[{opacity:1},{opacity:0}],{duration:RM?1:900,delay:RM?0:150});
  await p; route = null; placeUI(); uiIn(); app.classList.remove('away'); HITEL.forEach(h=>h.setAttribute('tabindex','0')); notesEl.style.pointerEvents=''; hideBook(null,false);
  busy = false;
}
async function sibling(r, o={}){
  if (busy) return; busy = true;
  const dir = ROUTES.indexOf(r) >= ROUTES.indexOf(route) ? -1 : 1;
  const content = page.querySelector('.stagearea');
  await anim(content,[{opacity:1,transform:'none'},{opacity:0,transform:`translateX(${dir*60}px)`}],{duration:RM?1:320});
  if (opts.pick) pickEnd();
  route = r; opts = o; ghiHash(r); const fk = focusKey(r,o); setHole(fk); FOCUS._cur = fk;
  content.remove();
  page.querySelectorAll('.tab').forEach(t=>{ if (t.dataset.tab===r) t.setAttribute('aria-current','page'); else t.removeAttribute('aria-current'); });
  await tweenCam(focusCam(fk), RM?0:850);
  await reveal(r, false);
  busy = false;
}

function bookRect(k){ const ps=DATA.hits[k].flat(); const xs=ps.map(p=>p[0]), ys=ps.map(p=>p[1]); return rectS([Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]); }
async function reveal(r, fresh){
  if (fresh){ page.innerHTML = topBar(r) + `<div class="stagearea">${body(r)}</div>`; }
  else { const sa = document.createElement('div'); sa.className='stagearea'; sa.innerHTML = body(r); page.appendChild(sa); }
  page.classList.add('live'); wirePage(r, fresh);
  const top = $('#topbar'); if (fresh) anim(top,[{opacity:0,transform:'translateY(-12px)'},{opacity:1,transform:'none'}],{duration:RM?1:600,delay:RM?0:250}); else top.style.opacity=1;
  const sa = page.querySelector('.stagearea');
  if (RM){ await anim(sa,[{opacity:0},{opacity:1}],{duration:200}); return; }
  const head = sa.querySelector('.pghead'); if (head) anim(head,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:600,delay:450});
  if (opts.pick && PK.clone){
    await pickHandoff(r, sa);
    if (r==='practice'){ const flip=$('#flip'); await flip.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(-180deg)'}],{duration:900,easing:'cubic-bezier(.45,0,.25,1)',fill:'forwards'}).finished; flip.style.display='none';
      sa.querySelectorAll('.leafp .hw li, .plist li').forEach((li,i)=>li.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:450,delay:i*60,easing:EASE,fill:'backwards'})); }
    if (r==='phone') sa.querySelectorAll('.pv:not([hidden]) .lb li, .pv:not([hidden]) .me, .pv:not([hidden]) .prof > *').forEach((li,i)=>li.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:450,delay:i*55,easing:EASE,fill:'backwards'}));
    if (r==='achievements'){ const tr=$('#trophy'); if (!tr) return; tr.style.opacity=''; await anim(tr,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:500});
      const tw = tr.getBoundingClientRect(); $('#sweep').animate([{left:'-30%'},{left:'110%'}],{duration:1300,easing:'ease-in-out',fill:'forwards'});
      sa.querySelectorAll('.bdg:not(.soon) .med').forEach(m=>{ const x=(m.getBoundingClientRect().left - tw.left)/tw.width;
        m.animate([{filter:'brightness(.32) saturate(.3)'},{filter:'brightness(1.5) saturate(1.1)',offset:.4},{filter:'brightness(1) saturate(1)'}],{duration:700,delay:1300*(0.12+x*0.78),fill:'forwards',easing:'ease-out'}); }); }
    return;
  }
  if (r==='courses'){
    const books = [...sa.querySelectorAll('.bk[data-k]')];
    sa.querySelectorAll('.course:not(.room-course)').forEach((c,i)=>c.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],{duration:700,delay:1100+i*120,easing:EASE,fill:'backwards'}));
    sa.querySelectorAll('.room-course .meta').forEach((m,i)=>m.animate([{opacity:0},{opacity:1}],{duration:500,delay:500+i*200,fill:'backwards'}));
    await Promise.all(books.map((b,j)=>{ const k=b.dataset.k, i=j*0.55; const s=bookRect(k); const br=b.getBoundingClientRect();
      const kx=s.w/br.width, ky=s.h/br.height, dx=s.x-br.left, dy=s.y-br.top;
      [...b.children].forEach(ch=>ch.animate([{opacity:0},{opacity:0,offset:.6},{opacity:1}],{duration:1100,delay:i*70,fill:'backwards'}));
      return b.animate([
        {transform:`translate(${dx}px,${dy}px) scale(${kx},${ky})`, backgroundColor:BOOKCOL(k), offset:0},
        {transform:`translate(${dx}px,${dy-28}px) scale(${kx},${ky})`, backgroundColor:BOOKCOL(k), offset:.24},
        {transform:'none', backgroundColor:COVER(k), offset:1}],{duration:1100,delay:i*70,easing:EASE,fill:'backwards'}).finished; }));
  } else if (r==='learn'){
    const les = $('#lesson'); const lr = les.getBoundingClientRect();
    if (opts.from==='book' && bookKeyOf(opts.shelf||0, opts.lesson)){
      const k = bookKeyOf(opts.shelf||0, opts.lesson); const s = bookRect(k);
      const sp = document.createElement('div'); sp.className='spine'; Object.assign(sp.style,{width:lr.width+'px',height:lr.height+'px',background:COVER(k)}); document.body.appendChild(sp); spines.add(sp);
      les.style.opacity = 0;
      await sp.animate([{transform:`translate(${s.x}px,${s.y}px) scale(${s.w/lr.width},${s.h/lr.height})`,backgroundColor:BOOKCOL(k)},
        {transform:`translate(${s.x}px,${s.y-40}px) scale(${s.w/lr.width*1.1},${s.h/lr.height})`,backgroundColor:BOOKCOL(k),offset:.3},
        {transform:`translate(${lr.left}px,${lr.top}px) scale(1,1)`,backgroundColor:'#121725',borderRadius:'18px'}],{duration:1050,easing:EASE,fill:'forwards'}).finished;
      les.style.opacity = ''; les.animate([{opacity:0},{opacity:1}],{duration:300}); sp.animate([{opacity:1},{opacity:0}],{duration:300}).finished.then(()=>{ sp.remove(); spines.delete(sp); });
    } else {
      const s = rectS([806,1066,1110,1262]);
      $('#flash').animate([{opacity:0},{opacity:.85,offset:.35},{opacity:0}],{duration:800,easing:'ease-out'});
      await les.animate([{transform:`translate(${s.x-lr.left}px,${s.y-lr.top}px) scale(${s.w/lr.width},${s.h/lr.height})`,opacity:.3,filter:'brightness(2)'},
        {transform:'none',opacity:1,filter:'brightness(1)'}],{duration:900,easing:EASE,fill:'backwards'}).finished;
    }
  } else if (r==='roadmap'){
    const board = $('#board'), paper = $('#paper'); const s = rectS([456,354,721,1057]); const br = board.getBoundingClientRect();
    paper.style.opacity = 0;
    await board.animate([{transform:`translate(${s.x-br.left}px,${s.y-br.top}px) scale(${s.w/br.width},${s.h/br.height}) perspective(900px) rotateY(-24deg)`,transformOrigin:'0 0',opacity:.7},
      {transform:'none',transformOrigin:'0 0',opacity:1}],{duration:900,easing:EASE,fill:'backwards'}).finished;
    paper.style.opacity = '';
    await paper.animate([{transform:'translateY(-40px) rotate(-5deg) scale(1.06)',opacity:0},{transform:'rotate(-.8deg)',opacity:1}],{duration:520,easing:'cubic-bezier(.3,1.4,.5,1)',fill:'backwards'}).finished;
    const path=$('#rpath'), str=$('#rstr'); const L1=path.getTotalLength(), L2=str.getTotalLength();
    const mask = path.cloneNode(); mask.removeAttribute('id'); mask.setAttribute('style',`stroke:var(--paper);stroke-width:8;stroke-dasharray:${L1};stroke-dashoffset:0`); path.after(mask);
    mask.animate([{strokeDashoffset:0},{strokeDashoffset:-L1}],{duration:1300,easing:'ease-in-out',fill:'forwards'});
    str.style.strokeDasharray=L2; str.animate([{strokeDashoffset:L2},{strokeDashoffset:0}],{duration:1100,delay:450,easing:'ease-in-out',fill:'both'});
    sa.querySelectorAll('.node').forEach((n,i)=>n.animate([{opacity:0,transform:'scale(1.8) translateY(-10px)'},{opacity:1,transform:'none'}],{duration:500,delay:150+i*120,easing:EASE,fill:'backwards'}));
    $('#note').animate([{opacity:0,transform:'translateY(20px) rotate(6deg)'},{opacity:1,transform:'none'}],{duration:700,delay:1300,easing:EASE,fill:'backwards'});
  } else if (r==='practice'){
    const sp = $('#spread'); const s = rectS([1280,1265,1625,1385]); const rr = sp.getBoundingClientRect();
    await sp.animate([{transform:`translate(${s.x-rr.left}px,${s.y-rr.top}px) scale(${s.w/rr.width},${s.h/rr.height})`,opacity:.5},{transform:'none',opacity:1}],{duration:900,easing:EASE,fill:'backwards'}).finished;
    const flip = $('#flip');
    await flip.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(-180deg)'}],{duration:900,easing:'cubic-bezier(.45,0,.25,1)',fill:'forwards'}).finished;
    flip.style.display='none';
    sa.querySelectorAll('.leafp .hw li, .plist li').forEach((li,i)=>li.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:450,delay:i*60,easing:EASE,fill:'backwards'}));
  } else if (r==='achievements'){
    const tr = $('#trophy');
    /* Không có kệ để vẽ: màn Thành tựu đang là khối 'chưa có số' (chưa đọc được
       huy hiệu, hay danh mục rỗng). Bản gốc không bao giờ gặp cảnh này vì nó có
       sẵn 24 huy hiệu viết cứng — ở đây thiếu phép kiểm là một TypeError ngay
       giữa hoạt ảnh và cả màn đứng im. */
    if (!tr){ await anim(sa,[{opacity:0},{opacity:1}],{duration:RM?1:400}); return; }
    await anim(tr,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:600});
    const tw = tr.getBoundingClientRect(); const sweepDur = 1300;
    $('#sweep').animate([{left:'-30%'},{left:'110%'}],{duration:sweepDur,easing:'ease-in-out',fill:'forwards'});
    sa.querySelectorAll('.bdg:not(.soon) .med').forEach(m=>{ const x=(m.getBoundingClientRect().left - tw.left)/tw.width;
      m.animate([{filter:'brightness(.32) saturate(.3)'},{filter:'brightness(1.5) saturate(1.1)',offset:.4},{filter:'brightness(1) saturate(1)'}],{duration:700,delay:sweepDur*(0.12+x*0.78),fill:'forwards',easing:'ease-out'}); });
  } else if (r==='phone'){
    const ph = $('#phone'); const s = rectS([1683,1298,1845,1386]); const pr = ph.getBoundingClientRect();
    const k = Math.hypot(s.w,s.h)*0.62/pr.height;
    await ph.animate([{transform:`translate(${s.cx-(pr.left+pr.width/2)}px,${s.cy-(pr.top+pr.height/2)}px) rotate(-60deg) scale(${k})`,opacity:.6},
      {transform:'translateY(-10px) rotate(4deg)',opacity:1,offset:.7},{transform:'none',opacity:1}],{duration:1050,easing:EASE,fill:'backwards'}).finished;
    sa.querySelectorAll('.pv:not([hidden]) .lb li, .pv:not([hidden]) .me, .pv:not([hidden]) .prof > *').forEach((li,i)=>li.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:450,delay:i*55,easing:EASE,fill:'backwards'}));
  }
}
async function conceal(r){
  const sa = page.querySelector('.stagearea'); const top = $('#topbar');
  if (RM){ page.style.opacity=0; await new Promise(res=>setTimeout(res,120)); page.style.opacity=''; return; }
  anim(top,[{opacity:1},{opacity:0}],{duration:300});
  if (r==='courses'){
    const books=[...sa.querySelectorAll('.bk[data-k]')];
    sa.querySelectorAll('.pghead,.course:not(.room-course),.room-course .meta').forEach(h=>anim(h,[{opacity:1},{opacity:0}],{duration:250}));
    await Promise.all(books.map((b,i)=>{ const k=b.dataset.k; const s=bookRect(k); const br=b.getBoundingClientRect(); [...b.children].forEach(c=>c.style.opacity=0);
      return b.animate([{transform:'none',backgroundColor:COVER(k)},{transform:`translate(${s.x-br.left}px,${s.y-br.top}px) scale(${s.w/br.width},${s.h/br.height})`,backgroundColor:BOOKCOL(k),opacity:.9}],
        {duration:750,delay:(books.length-1-i)*22,easing:'cubic-bezier(.6,0,.3,1)',fill:'forwards'}).finished; }));
    await anim(sa,[{opacity:1},{opacity:0}],{duration:200});
  } else {
    const f = rectS(FOCUS[FOCUS._cur || r]); const box = sa.getBoundingClientRect();
    await anim(sa,[{opacity:1,transform:'none'},{opacity:0,transform:`translate(${f.cx-box.left-box.width/2}px,${f.cy-box.top-box.height/2}px) scale(.25)`}],{duration:520,easing:'cubic-bezier(.6,0,.4,1)'});
  }
}

/* ---------- hint ---------- */
let qi = 0;
$('#hintForm').addEventListener('submit',e=>{ e.preventDefault(); const r=$('#reply'); r.hidden=false;
  r.innerHTML = `<b>Gợi ý</b><br>${QS[qi++%QS.length]}`; $('#hintIn').value='';
  r.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:RM?1:450,easing:EASE}); });


/* ---------- pick up (light objects) ---------- */
const heldEl = $('#held');
const HELD_IMG = {mug:'mug', cupTop:'cupTop', cupLow:'cupLow', medalTop:'medalTop', medalLow:'medalTop', medalHang:'medalHang'};
const PK = {clone:null, k:null, extra:[]};
const LIFT = k => /^(book|pb|tb)\d+$/.test(k) ? `translateY(${-Math.round(itemRect(k).h*0.42)}px) rotate(-3deg)` : 'translateY(-14px) scale(1.05)';
function itemRect(k, c=C){ const [x,y,w,h] = DATA.meta[k]; return rectS([x,y,x+w,y+h], c); }
function makeClone(k, c=C){
  const r = itemRect(k, c); const d = document.createElement('div'); d.className = 'pclone';
  Object.assign(d.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});
  d.innerHTML = `<img src="/goc-hoc/items/${k}.webp" alt="">`; heldEl.appendChild(d); return d;
}
function hideItem(k, on){ [EL[k],GEL[k]].forEach(e=>{ if (e) e.style.visibility = on ? 'hidden' : ''; }); }
function pickStart(k){
  PK.k = k; PK.clone = makeClone(k); hideItem(k, true);
  if (RM) return Promise.resolve();
  return PK.clone.animate([{transform:'none', filter:'drop-shadow(0 0 0 rgba(0,0,0,0))'},{transform:LIFT(k), filter:'drop-shadow(0 18px 14px rgba(10,5,20,.45))'}],
    {duration:/^(book|pb|tb)/.test(k)?520:320, easing:EASE, fill:'forwards'}).finished;
}
/* clone flies into a page element; the element grows out of it */
async function flyInto(target, rot, dur=950){
  const cl = PK.clone; if (!cl){ return; }
  const s = cl.getBoundingClientRect(), t = target.getBoundingClientRect();
  const dx = t.left+t.width/2-(s.left+s.width/2), dy = t.top+t.height/2-(s.top+s.height/2);
  const sc = Math.min(t.width/s.width, t.height/s.height);
  const lift = LIFT(PK.k);
  const prevO = target.style.transformOrigin; target.style.transformOrigin = '50% 50%';
  const a1 = cl.animate([{transform:lift, opacity:1},{opacity:1, offset:.28},{transform:`translate(${dx}px,${dy}px) ${lift} scale(${sc*.85})`, opacity:0, offset:.6},{transform:`translate(${dx}px,${dy}px) ${lift} scale(${sc})`, opacity:0}],
    {duration:dur, easing:EASE, fill:'forwards'});
  const a2 = target.animate([{transform:`translate(${-dx}px,${-dy}px) scale(${1/sc}) ${rot}`, opacity:0},{opacity:0, offset:.22},{opacity:1, offset:.55},{transform:'none', opacity:1}],
    {duration:dur, easing:EASE, fill:'backwards'});
  await Promise.all([a1.finished, a2.finished]); target.style.transformOrigin = prevO;
}
/* page element shrinks back into the object, which then lands in its spot */
async function flyBack(target, rot, dur=800){
  const k = PK.k; const home = itemRect(k, {tx:0,ty:0,k:1});
  const cl = makeClone(k, {tx:0,ty:0,k:1}); PK.clone?.remove(); PK.clone = cl;
  const t = target ? target.getBoundingClientRect() : {left:L.W/2-home.w,top:L.H/2-home.h,width:home.w*2,height:home.h*2};
  const dx = t.left+t.width/2-(home.x+home.w/2), dy = t.top+t.height/2-(home.y+home.h/2);
  const sc = Math.min(t.width/home.w, t.height/home.h); const lift = LIFT(k);
  if (target){ target.style.transformOrigin = '50% 50%';
    target.animate([{transform:'none', opacity:1},{opacity:1, offset:.35},{transform:`translate(${-dx}px,${-dy}px) scale(${1/sc}) ${rot}`, opacity:0}],{duration:dur, easing:'cubic-bezier(.55,0,.25,1)', fill:'forwards'}); }
  await cl.animate([{transform:`translate(${dx}px,${dy}px) ${lift} scale(${sc})`, opacity:0},{opacity:0, offset:.35},{opacity:1, offset:.6},{transform:lift, opacity:1, offset:.82},{transform:'none', opacity:1}],
    {duration:dur+380, easing:'cubic-bezier(.55,0,.25,1)', fill:'forwards'}).finished;
}
function pickEnd(){ if (PK.k) hideItem(PK.k, false); PK.clone?.remove(); PK.extra.forEach(e=>e.remove()); PK.clone=null; PK.extra=[]; PK.k=null; }
function heldImg(k, h){
  const im = document.createElement('img'); im.className='pheld'; im.src = `/goc-hoc/items/held/${HELD_IMG[k]}.webp`; im.alt='';
  const [nw,nh] = {mug:[700,720],cupTop:[607,720],cupLow:[547,720],medalTop:[438,720],medalHang:[333,720]}[HELD_IMG[k]];
  const w = h*nw/nh; Object.assign(im.style,{left:(L.W/2-w/2)+'px',top:(L.H*0.47-h/2)+'px',width:w+'px',height:h+'px'});
  heldEl.appendChild(im); PK.extra.push(im); return im;
}
/* pull a book out, turn its cover to the viewer, open it into the lesson */
function coverEl(k, title, num){
  const h = Math.min(L.H*0.58, 460), w = h*651/900; const d = document.createElement('div'); d.className='pcover';
  Object.assign(d.style,{left:(L.W/2-w*0.15)+'px',top:(L.H*0.48-h/2)+'px',width:w+'px',height:h+'px'}); d.style.setProperty('--c', COVER(k));
  d.innerHTML = `<img src="/goc-hoc/items/page/book-cover.webp" alt=""><i class="tint"></i><i class="tint m"></i><div class="txt"><span class="n">Bài ${num}</span><b>${title}</b><span class="s">${(MODULES[opts.shelf||0]||{}).name||''}</span></div>`;
  heldEl.appendChild(d); PK.extra.push(d); return d;
}
function openBookEl(cv){
  const c = cv.getBoundingClientRect(); const h = c.height*1.02, w = h*1300/940; const d = document.createElement('img'); d.className='pheld popen';
  d.src = '/goc-hoc/items/page/book-open.webp'; d.alt = '';
  Object.assign(d.style,{left:(c.left - w*0.5)+'px', top:(c.top + c.height/2 - h/2)+'px', width:w+'px', height:h+'px'});
  heldEl.insertBefore(d, cv); PK.extra.push(d); return d;
}
async function pickHandoff(r, sa){
  const k = PK.k;
  if (r==='phone'){ await flyInto($('#phone'), 'rotateX(55deg) rotateZ(-28deg)'); PK.clone.remove(); PK.clone=null; return; }
  if (r==='practice'){ await flyInto($('#spread'), 'rotateX(60deg) rotateZ(-3deg)'); PK.clone.remove(); PK.clone=null; return; }
  if (r==='learn'){
    const l = lessonAt(opts.shelf||0, opts.lesson); const cv = coverEl(k, l ? l.title : '', l ? l.no : 0);
    $('#lesson').style.opacity = 0;
    await flyInto(cv, 'rotateY(80deg)', 900); PK.clone.remove(); PK.clone=null;
    await new Promise(res=>setTimeout(res,260));
    const les = $('#lesson'); const c = cv.getBoundingClientRect(), t = les.getBoundingClientRect();
    const ob = openBookEl(cv); ob.animate([{opacity:0},{opacity:1}],{duration:260, fill:'both'});
    cv.style.transformOrigin = '0 50%';
    await cv.animate([{transform:'perspective(1600px) rotateY(0)'},{transform:'perspective(1600px) rotateY(-150deg)', opacity:1, offset:.8},{transform:'perspective(1600px) rotateY(-178deg)', opacity:0}],{duration:900, easing:'cubic-bezier(.45,0,.2,1)', fill:'forwards'}).finished;
    cv.remove(); await new Promise(res=>setTimeout(res,180));
    const o = ob.getBoundingClientRect();
    les.style.opacity = '';
    les.animate([{transform:`translate(${o.left-t.left}px,${o.top-t.top}px) scale(${o.width/t.width},${o.height/t.height})`, opacity:0, transformOrigin:'0 0'},{opacity:1, offset:.5},{transform:'none', opacity:1, transformOrigin:'0 0'}],{duration:780, easing:EASE, fill:'backwards'});
    await ob.animate([{opacity:1, transform:'none'},{opacity:0, transform:'scale(1.15)'}],{duration:620, easing:EASE, fill:'forwards'}).finished; return;
  }
  if (r==='achievements'){
    const h = Math.min(L.H*0.5, 400); const im = heldImg(k, h);
    sa.querySelectorAll('.pghead,#trophy').forEach(e=>e.style.opacity=0);
    await flyInto(im, '', 900);
    sa.querySelectorAll('.pghead').forEach(e=>{ e.style.opacity=''; e.animate([{opacity:0},{opacity:1}],{duration:500}); }); PK.clone.remove(); PK.clone=null;
    im.style.setProperty('--m', `url(/goc-hoc/items/held/${HELD_IMG[k]}.webp)`); im.classList.add('shiny');
    await im.animate([{transform:'perspective(900px) rotateY(0)'},{transform:'perspective(900px) rotateY(22deg)', offset:.3},{transform:'perspective(900px) rotateY(-16deg)', offset:.65},{transform:'perspective(900px) rotateY(0)'}],{duration:1300, easing:'ease-in-out'}).finished;
    im.animate([{transform:'none', opacity:1},{transform:'translateY(-30px) scale(.55)', opacity:0}],{duration:520, easing:EASE, fill:'forwards'});
    return;
  }
}
async function pickConceal(r){
  const sa = page.querySelector('.stagearea'); const top = $('#topbar'); anim(top,[{opacity:1},{opacity:0}],{duration:300});
  if (r==='phone'){ sa.querySelectorAll('.pghead').forEach(h=>h.style.opacity=0); await flyBack($('#phone'), 'rotateX(55deg) rotateZ(-28deg)'); return; }
  if (r==='practice'){ sa.querySelectorAll('.pghead').forEach(h=>anim(h,[{opacity:1},{opacity:0}],{duration:250})); await flyBack($('#spread'), 'rotateX(60deg) rotateZ(-3deg)'); return; }
  if (r==='learn'){
    const l = lessonAt(opts.shelf||0, opts.lesson); const cv = coverEl(PK.k, l ? l.title : '', l ? l.no : 0);
    const les = $('#lesson'); const t = les.getBoundingClientRect(); cv.style.opacity = 0;
    const ob = openBookEl(cv); const o = ob.getBoundingClientRect();
    ob.animate([{opacity:0, transform:'scale(1.15)'},{opacity:1, transform:'none'}],{duration:560, easing:EASE, fill:'both'});
    await les.animate([{transform:'none', opacity:1, transformOrigin:'0 0'},{transform:`translate(${o.left-t.left}px,${o.top-t.top}px) scale(${o.width/t.width},${o.height/t.height})`, opacity:0, transformOrigin:'0 0'}],{duration:560, easing:EASE, fill:'forwards'}).finished;
    cv.style.opacity = ''; cv.style.transformOrigin = '0 50%';
    ob.animate([{opacity:1},{opacity:1, offset:.6},{opacity:0}],{duration:700, fill:'forwards'});
    await cv.animate([{transform:'perspective(1600px) rotateY(-170deg)', opacity:0},{transform:'perspective(1600px) rotateY(-150deg)', opacity:1, offset:.25},{transform:'perspective(1600px) rotateY(0)', opacity:1}],{duration:700, easing:'cubic-bezier(.45,0,.2,1)', fill:'forwards'}).finished;
    cv.style.transformOrigin = '50% 50%'; await flyBack(cv, 'rotateY(80deg)'); return;
  }
  if (r==='achievements'){
    anim(sa,[{opacity:1},{opacity:0}],{duration:300});
    const h = Math.min(L.H*0.5, 400); const im = heldImg(PK.k, h);
    await im.animate([{transform:'translateY(-30px) scale(.55)', opacity:0},{transform:'none', opacity:1}],{duration:420, easing:EASE, fill:'forwards'}).finished;
    await flyBack(im, ''); return;
  }
}
/* the mug is picked up for a sip, then put back */
async function sipMug(){
  if (busy || route || app.classList.contains('intro')) return; busy = true;
  app.classList.add('away'); clearHover(); hidePop(true); closeDemo();
  await pickStart('mug');
  anim(blurFull,[{opacity:0},{opacity:.85}],{duration:RM?1:600}); anim(scrim,[{opacity:0},{opacity:.55}],{duration:RM?1:600});
  const im = heldImg('mug', Math.min(L.H*0.42, 340)); im.style.top = (L.H*0.56 - Math.min(L.H*0.42,340)/2)+'px';
  await flyInto(im, 'rotateX(25deg)', RM?1:850); PK.clone.remove(); PK.clone=null;
  if (!RM){
    const st = document.createElement('div'); st.className='psteam'; const r = im.getBoundingClientRect();
    Object.assign(st.style,{left:(r.left+r.width*0.42)+'px', top:(r.top-30)+'px'}); st.innerHTML='<i></i><i></i><i></i>'; heldEl.appendChild(st); PK.extra.push(st);
    im.style.transformOrigin = '30% 80%';
    await im.animate([{transform:'none'},{transform:'translate(-10px,-34px) rotate(-17deg)', offset:.35},{transform:'translate(-10px,-34px) rotate(-19deg)', offset:.6},{transform:'none'}],{duration:1500, easing:'ease-in-out'}).finished;
  }
  toast('Đã nghỉ một ngụm cà phê. Học tiếp nhé!');
  anim(blurFull,[{opacity:.85},{opacity:0}],{duration:RM?1:700, delay:RM?0:200}); anim(scrim,[{opacity:.55},{opacity:0}],{duration:RM?1:700, delay:RM?0:200});
  if (RM){ pickEnd(); } else { await flyBack(im, 'rotateX(25deg)', 700); pickEnd(); }
  app.classList.remove('away'); busy = false;
}

/* ---------- zoom in (wall / bulky objects): the calendar ---------- */
function bigCal(){
  const h = Math.min(L.H*0.8, 660), w = h*CAL.src.w/CAL.src.h; const d = document.createElement('div'); d.className='pcal';
  Object.assign(d.style,{left:Math.max(16, L.W*0.44 - w/2 - 150)+'px', top:(L.H/2 - h/2)+'px', width:w+'px', height:h+'px'});
  const p0 = CAL.src.pic.slice(0,2), p1 = CAL.src.pic.slice(2); const sx = w/CAL.src.w;
  d.innerHTML = `<img src="/goc-hoc/items/page/calendar.webp" alt=""><svg viewBox="0 0 ${CAL.src.w} ${CAL.src.h}">${calSVG(CAL.src.cells, CAL.src.labels, CAL.src.cw, CAL.src.cw*0.3, false)}</svg>
    <div class="bnote" style="left:${(p0[0]+(p1[0]-p0[0])*0.2)*sx}px;top:${(p0[1]+(p1[1]-p0[1])*0.22)*sx}px;width:${(p1[0]-p0[0])*0.6*sx}px;height:${(p1[1]-p0[1])*0.56*sx}px"><svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"/></svg><div><b>${CAL_NOTE.to}</b><small>${CAL_NOTE.nho}</small></div></div>`;
  heldEl.appendChild(d); return d;
}
let peeking = false;
async function peekCal(){
  if (busy || route || peeking || app.classList.contains('intro')) return; busy = true; peeking = true;
  app.classList.add('away'); clearHover(); hidePop(true); closeDemo(); room.style.translate='0px 0px';
  uiOut(); setHole('calendar');
  anim(blurHole,[{opacity:0},{opacity:1}],{duration:RM?1:900});
  await tweenCam(focusCam('calendar'), RM?0:950);
  const big = bigCal(); PK.extra.push(big);
  anim(blurFull,[{opacity:0},{opacity:1}],{duration:RM?1:500}); anim(scrim,[{opacity:0},{opacity:.6}],{duration:RM?1:500});
  const r = itemRect('calendar'), t = big.getBoundingClientRect(); hideItem('calendar', true);
  await big.animate([{transform:`translate(${r.x-t.left}px,${r.y-t.top}px) scale(${r.w/t.width})`, transformOrigin:'0 0'},{transform:'translateY(-14px) rotate(-1.5deg)', transformOrigin:'0 0', offset:.7},{transform:'none', transformOrigin:'0 0'}],{duration:RM?1:850, easing:EASE, fill:'backwards'}).finished;
  big.querySelectorAll('.ring').forEach((p,i)=>p.animate([{strokeDashoffset:100},{strokeDashoffset:0}],{duration:RM?1:380, delay:RM?0:i*90, easing:'ease-out', fill:'backwards'}));
  const pop = $('#calPop'); pop.classList.add('peek'); pop.hidden = false;
  const bt = big.getBoundingClientRect(); pop.style.left = Math.min(bt.right+20, L.W-320)+'px'; pop.style.top = (bt.top+bt.height*0.42)+'px';
  pop.animate([{opacity:0, transform:'translateX(-14px) scale(.96)'},{opacity:1, transform:'none'}],{duration:RM?1:450, delay:RM?0:500, easing:EASE, fill:'backwards'});
  busy = false;
}
async function unpeek(){
  if (!peeking || busy) return; busy = true; const pop = $('#calPop');
  await pop.animate([{opacity:1},{opacity:0}],{duration:RM?1:200}).finished; pop.hidden = true; pop.classList.remove('peek');
  const big = heldEl.querySelector('.pcal');
  anim(blurFull,[{opacity:1},{opacity:0}],{duration:RM?1:500}); anim(scrim,[{opacity:.6},{opacity:0}],{duration:RM?1:500});
  if (big){ const r = itemRect('calendar'), t = big.getBoundingClientRect();
    await big.animate([{transform:'none', transformOrigin:'0 0'},{transform:`translate(${r.x-t.left}px,${r.y-t.top}px) scale(${r.w/t.width})`, transformOrigin:'0 0'}],{duration:RM?1:650, easing:'cubic-bezier(.55,0,.25,1)', fill:'forwards'}).finished; }
  pickEnd(); hideItem('calendar', false);
  anim(blurHole,[{opacity:1},{opacity:0}],{duration:RM?1:800});
  await tweenCam({tx:0,ty:0,k:1}, RM?0:900);
  uiIn(); app.classList.remove('away'); placeUI(); peeking = false; busy = false;
}

/* ---------- scene settings ---------- */
const demo = $('#demo'), demoBtn = $('#demoBtn');
function closeDemo(){ demo.hidden = true; demoBtn.setAttribute('aria-expanded','false'); }
demoBtn.addEventListener('click',e=>{ e.stopPropagation(); demo.hidden = !demo.hidden; demoBtn.setAttribute('aria-expanded', String(!demo.hidden)); placeUI(); });
on(document,'click',e=>{ if (!demo.hidden && !demo.contains(e.target) && !demoBtn.contains(e.target)) closeDemo(); });
function tog(btn, fn){ btn.addEventListener('click',()=>{ const v = btn.getAttribute('aria-pressed')!=='true'; btn.setAttribute('aria-pressed',String(v)); fn(v); }); }
$('#tod').addEventListener('input',e=>{ if (realTime) setReal(false); cancelAnimationFrame(todAnim); TOD = +e.target.value; applyTOD(TOD); });
demo.querySelectorAll('[data-h]').forEach(b=>b.addEventListener('click',()=>{ setReal(false); setTOD(+b.dataset.h, true); }));
$('#tReal').addEventListener('click',()=>setReal(!realTime));
$('#tWin').addEventListener('click',()=>toggleWindow());
tog($('#tRain'), v=>app.classList.toggle('rain',v));
const tRm = $('#tRm'); tRm.setAttribute('aria-pressed',String(RM)); tog(tRm, v=>{ RM=v; app.classList.toggle('rm',v); if (v) clearInterval(leafTimer); });
$('#tIntro').addEventListener('click',()=>{ closeDemo(); runIntro(); });
let playing=false; $('#musicBtn').addEventListener('click',()=>{ playing=!playing; $('#music').classList.toggle('playing',playing);
  $('#musicBtn').innerHTML = `<svg class="i"><use href="#i-${playing?'pause':'play'}"/></svg>`; $('#musicBtn').setAttribute('aria-label', playing?'Tắt nhạc lofi':'Phát nhạc lofi');
  $('#musicTxt').textContent = playing ? 'Nhạc lofi · bản mẫu, chưa có âm thanh' : 'Nhạc lofi · đang tắt'; });
on(document,'visibilitychange',()=>app.classList.toggle('away', document.hidden || !!route));


/* ---------- điền số vào khung ----------
 * Markup của SHELL_HTML để trống mọi chỗ có số. Hàm này là chỗ DUY NHẤT điền
 * vào, nên muốn biết "con số kia ở đâu ra" thì chỉ phải đọc một hàm.
 * Luật: `null` ⇒ in "—" và nói rõ "chưa có phiên học"; không bao giờ in 0 thay
 * cho một số chưa đọc được. */
function apDungSo(){
  const T = (id, txt) => { const e = $('#'+id); if (e) e.textContent = txt; };
  const ten = TEN.doc();
  const hien = ten || USER.name || 'Khách';
  T('uInitial', (hien.trim()[0] || '?').toUpperCase());
  T('uName', hien);
  T('uXpText', USER.xp == null ? 'chưa có phiên học' : `${SO(USER.xp)} XP · đã xong ${USER.lessonsDone ?? 0}/${TOTAL} bài`);
  const bar = $('#uXpBar'); if (bar) bar.style.width = (USER.xp == null ? 0 : PCT) + '%';
  const ring = $('#avaRing'); if (ring) ring.setAttribute('stroke-dasharray', `${(PCT/100*150.8).toFixed(1)} 150.8`);
  T('pillDone', USER.lessonsDone == null ? '—' : `${USER.lessonsDone}/${TOTAL}`);
  T('pillXp', SO(USER.xp));
  T('pillBadge', USER.badges ? String(USER.badges.done) : '—');

  T('heroEyebrow', CUR ? CUR.m.name : CONTENT.course.name);
  T('heroTitle', USER.lessonsDone ? 'Học tiếp' : 'Bắt đầu học');
  T('heroSub', CUR ? `Bài ${CUR.l.no}/${TOTAL} · ${CUR.l.title}` : '');
  T('heroPct', USER.lessonsDone == null ? '—' : PCT + '%');
  const hp = $('#heroProg'); if (hp) hp.style.width = (USER.lessonsDone == null ? 0 : PCT) + '%';

  T('navRoadmap', `${MODULES.length} học phần · ${TOTAL} bài`);
  T('navCourses', 'Mỗi cuốn sách trên kệ là một bài');
  T('navPractice', USER.lessonsDone == null ? 'Câu hỏi lấy từ bài đã xong' : `Kho câu từ ${USER.lessonsDone} bài đã xong`);
  T('navAchv', USER.badges ? `${USER.badges.done}/${USER.badges.total} huy hiệu` : 'chưa đọc được');
  T('navRank', USER.rank ? `Hạng ${USER.rank.rank} theo XP` : 'chưa đọc được');

  T('courseDone', USER.lessonsDone == null ? '—' : `${USER.lessonsDone}/${TOTAL} bài`);
  const cp = $('#courseProg'); if (cp) cp.style.width = (USER.lessonsDone == null ? 0 : PCT) + '%';
  T('courseNote', USER.lessonsDone == null
    ? 'Chưa có phiên học trên máy này, nên chưa có tiến độ. Mở một bài là có.'
    : `Đang ở học phần ${CUR ? CUR.m.short : '—'}.`);
  T('courseName', CONTENT.course.name);
  T('courseSub', CUR ? `Bài tiếp theo: ${CUR.l.title}` : '');
  const cl = $('#courseLink'); if (cl) cl.href = `/courses/${CONTENT.course.id}`;

  T('calPopT', new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }));
  /* Lịch chỉ khoanh hôm nay: API trả đúng một con số `streak`, không trả tập
     ngày đã học, nên không vẽ được ngày nào khác mà không bịa. */
  T('calPopB', USER.lessonsDone == null
    ? 'Chưa có phiên học, nên lịch chỉ khoanh hôm nay.'
    : `Đã xong ${USER.lessonsDone}/${TOTAL} bài. Lịch chỉ khoanh hôm nay — hệ thống chưa lưu ngày học của từng bài.`);
  if (rankTag) rankTag.textContent = USER.rank ? `Hạng ${USER.rank.rank} theo XP` : 'Xếp hạng · chưa có phiên';
}

/* ---------- giấy nhớ: dựng từ số THẬT ----------
 * Bản gốc có sáu ghi chú mẫu ("Bạn vừa tăng 2 bậc", "Còn 2 ngày cho Đệ quy"…).
 * Không một thông báo nào trong đó có nguồn dữ liệu, nên cả sáu đi; thay bằng
 * hai–ba mẩu dựng từ chính giáo trình và tiến độ. */
const GHI_CHU = (() => {
  const ra = [];
  if (CUR) ra.push({ ic: 'Bài ' + CUR.l.no, sh: CUR.m.short, l3: CUR.l.minutes ? CUR.l.minutes + ' phút' : '',
    k: 'Bài tiếp theo', t: CUR.l.title,
    b: `${CUR.m.name}. ${CUR.l.minutes ? CUR.l.minutes + ' phút' : ''}${CUR.l.xp ? ` · +${CUR.l.xp} XP` : ''}.`,
    act: 'Xem bài', go: ['learn', { ...CUR_OPTS }], c: '--note-y' });
  ra.push(USER.lessonsDone == null
    ? { ic: '—', sh: 'Tiến độ', l3: 'chưa rõ', k: 'Tiến độ', t: 'Chưa đọc được tiến độ',
        b: 'Máy này chưa có phiên học, nên không con số nào về bạn được hiện ra. Mở một bài học là có.',
        act: 'Xem khoá học', go: ['courses', {}], c: '--note-b' }
    : { ic: `${USER.lessonsDone}/${TOTAL}`, sh: 'Tiến độ', l3: PCT + '%', k: 'Khoá đang học',
        t: `Đã xong ${USER.lessonsDone}/${TOTAL} bài`,
        b: `${CONTENT.course.name}. Xem lộ trình để biết đang ở học phần nào.`,
        act: 'Xem lộ trình', go: ['roadmap', {}], c: '--note-g' });
  if (USER.rank) ra.push({ ic: '#' + USER.rank.rank, sh: 'Xếp hạng', l3: SO(USER.rank.value) + ' XP',
    k: 'Bảng xếp hạng', t: `Bạn đang hạng ${USER.rank.rank}`,
    b: 'Xếp theo tổng XP. Tên hiển thị đặt được ngay trong màn này.',
    act: 'Xem xếp hạng', go: ['phone', { tab: 'rank' }], c: '--note-p' });
  return ra;
})();

/* ---------- boot ---------- */
TOD = nowH(); applyTOD(TOD);
apDungSo();
GHI_CHU.slice(0, 2).forEach(n => addNote(n, false)); poolI = Math.min(2, GHI_CHU.length);
on(window,'resize', layout);
layout();

/* ---------- đường dẫn: #learn, #courses… ----------
 * Bản gốc ĐỌC `location.hash` lúc mở trang nhưng không bao giờ GHI, nên mở một
 * màn không đổi URL và nút Back của trình duyệt rời luôn khỏi trang. Đây là
 * thứ người đi test kêu đầu tiên. Nay mỗi lần mở/đóng màn là một mục history,
 * và `hashchange` lái cảnh theo URL.
 * `pushState` KHÔNG bắn `hashchange`, nên không có vòng lặp: chỉ Back/Forward
 * của trình duyệt mới gọi `laiTheoHash`. */
const hashRoute = () => { const h = location.hash.replace(/^#/, ''); return ROUTES.includes(h) ? h : null; };
function ghiHash(r){
  const want = r ? '#' + r : '';
  if ((location.hash || '') === want) return;
  try { history.pushState(null, '', want || location.pathname + location.search); }
  catch (e) { location.hash = want; }
}
let hashThu = 0;
function laiTheoHash(){
  if (dead) return;
  /* Đang giữa một lượt chuyển màn thì go/sibling TỰ BỎ lượt gọi (cả hai mở đầu
     bằng `if (busy) return`), nên nếu không thử lại thì URL đổi mà cảnh đứng
     yên — bấm Back hai lần nhanh là thấy. Thử lại tối đa ~4 giây rồi thôi. */
  if (busy){ if (hashThu++ < 12) setTimeout(laiTheoHash, 350); return; }
  hashThu = 0;
  const h = hashRoute();
  if (h && h !== route){ const o = h === 'learn' ? { ...CUR_OPTS } : {};
    if (route) sibling(h, o); else go(h, o); }
  else if (!h && route) back();
}
on(window,'hashchange', laiTheoHash);

const img = $('#roomImg');
/* `dead` phải kiểm ở đây: StrictMode mount → unmount → mount, và `load` của
   room.webp (2 752 px, có cache hay không là chuyện của trình duyệt) hoàn toàn
   có thể bắn SAU cleanup của lần mount đầu. Không kiểm thì lần mount chết vẫn
   chạy `layout()` + `runIntro()` trên DOM đã bị xoá. */
const start = () => {
  if (dead) return;
  layout();
  const h = hashRoute();
  if (h){ finishIntro(); countUp(); drawCal(); go(h, h === 'learn' ? { ...CUR_OPTS } : {}); }
  else runIntro();
};
if (img.complete) start(); else on(img, 'load', start);
return function dispose(){
  dead = true;
  timers.forEach(id => window.clearTimeout(id)); timers.clear();
  rafs.forEach(id => window.cancelAnimationFrame(id)); rafs.clear();
  offs.forEach(off => off()); offs.length = 0;
  spines.forEach(el => el.remove()); spines.clear();
  document.documentElement.style.removeProperty('--side');
};
}

/* =========================================================
   Personal Life Tracker — core script
   Sections: helpers, storage/DB, auth, shell(nav/theme/toast/modal),
   seed data, and per-page initializers.
   ========================================================= */

/* ---------------- Helpers ---------------- */
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayStr = (d = new Date()) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
};
const fmtMoney = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDateNice = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/* ---------------- Storage / DB ---------------- */
const DB = {
  usersKey: 'plt_users',
  sessionKey: 'plt_session',
  dataKey: (uid) => `plt_data_${uid}`,

  getUsers() { return JSON.parse(localStorage.getItem(this.usersKey) || '[]'); },
  saveUsers(u) { localStorage.setItem(this.usersKey, JSON.stringify(u)); },

  getSession() { return JSON.parse(localStorage.getItem(this.sessionKey) || 'null'); },
  setSession(userId) { localStorage.setItem(this.sessionKey, JSON.stringify({ userId })); },
  clearSession() { localStorage.removeItem(this.sessionKey); },

  currentUser() {
    const s = this.getSession();
    if (!s) return null;
    return this.getUsers().find(u => u.id === s.userId) || null;
  },

  getData(userId) {
    const raw = localStorage.getItem(this.dataKey(userId));
    if (raw) return JSON.parse(raw);
    const fresh = {
      dailyItems: [
        { id: 'wake', name: 'Wake up early', icon: 'sun' },
        { id: 'water', name: 'Drink water (8 glasses)', icon: 'droplet' },
        { id: 'exercise', name: 'Exercise', icon: 'activity' },
        { id: 'meditation', name: 'Meditation', icon: 'circle' },
        { id: 'reading', name: 'Reading', icon: 'book' },
        { id: 'coding', name: 'Coding practice', icon: 'code' },
        { id: 'attendance', name: 'Office / College', icon: 'briefcase' },
        { id: 'sleep', name: 'Sleep on time', icon: 'moon' },
      ],
      routineLog: {},       // { "2026-07-19": { wake: true, ... } }
      water: {},            // { "2026-07-19": 5 }
      food: [],             // { id, date, meal, name, calories, notes }
      transactions: [],     // { id, date, type, category, amount, note }
      recurring: [],        // { id, name, frequencyDays, lastCompleted, history:[] }
    };
    this.saveData(userId, fresh);
    return fresh;
  },
  saveData(userId, data) { localStorage.setItem(this.dataKey(userId), JSON.stringify(data)); },
};

/* seed a demo account + sample data on first load */
(function seed() {
  const users = DB.getUsers();
  if (users.find(u => u.email === 'demo@example.com')) return;
  const demoId = 'demo_user';
  users.push({ id: demoId, name: 'Aarav Mehta', email: 'demo@example.com', password: 'demo1234', createdAt: Date.now() });
  DB.saveUsers(users);

  const data = DB.getData(demoId);
  const today = todayStr();
  data.routineLog[today] = { wake: true, water: true, exercise: true, meditation: false, reading: true, coding: true, attendance: false, sleep: false };
  data.routineLog[addDays(today, -1)] = { wake: true, water: true, exercise: false, meditation: true, reading: true, coding: true, attendance: true, sleep: true };
  data.water[today] = 5;
  data.food.push(
    { id: uid(), date: today, meal: 'Breakfast', name: 'Poha & chai', calories: 320, notes: '' },
    { id: uid(), date: today, meal: 'Lunch', name: 'Dal, rice, sabzi', calories: 520, notes: 'home cooked' }
  );
  data.transactions.push(
    { id: uid(), date: today, type: 'expense', category: 'Food', amount: 220, note: 'Groceries' },
    { id: uid(), date: today, type: 'expense', category: 'Travel', amount: 80, note: 'Auto fare' },
    { id: uid(), date: addDays(today, -2), type: 'income', category: 'Salary', amount: 45000, note: 'Monthly salary' },
    { id: uid(), date: addDays(today, -1), type: 'expense', category: 'Bills', amount: 1200, note: 'Electricity' },
    { id: uid(), date: addDays(today, -3), type: 'expense', category: 'Shopping', amount: 650, note: 'New shoes' }
  );
  data.recurring.push(
    { id: uid(), name: 'Change bedsheet', frequencyDays: 7, lastCompleted: addDays(today, -6), history: [] },
    { id: uid(), name: 'Laundry', frequencyDays: 4, lastCompleted: addDays(today, -5), history: [] },
    { id: uid(), name: 'Haircut', frequencyDays: 30, lastCompleted: addDays(today, -20), history: [] },
    { id: uid(), name: 'Water plants', frequencyDays: 2, lastCompleted: addDays(today, -1), history: [] }
  );
  DB.saveData(demoId, data);
})();

/* ---------------- Auth guard ---------------- */
const AUTH_PAGES = ['login.html', 'register.html', 'forgot-password.html', 'index.html'];
function currentPage() { return location.pathname.split('/').pop() || 'index.html'; }
function requireAuth() {
  if (AUTH_PAGES.includes(currentPage())) return;
  if (!DB.currentUser()) location.href = 'login.html';
}
requireAuth();

/* ---------------- Theme ---------------- */
function applyTheme() {
  const t = localStorage.getItem('plt_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
}
function toggleTheme() {
  const cur = localStorage.getItem('plt_theme') || 'light';
  const next = cur === 'light' ? 'dark' : 'light';
  localStorage.setItem('plt_theme', next);
  applyTheme();
  const icon = qs('#themeToggle .theme-icon');
  if (icon) icon.innerHTML = next === 'dark' ? ICONS.sun : ICONS.moon;
}
applyTheme();

/* ---------------- Toast ---------------- */
function toast(msg, type = '') {
  let stack = qs('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; el.style.transition = 'all .3s ease'; setTimeout(() => el.remove(), 300); }, 2600);
}

/* ---------------- Modal ---------------- */
function openModal(id) { qs('#' + id)?.classList.add('open'); }
function closeModal(id) { qs('#' + id)?.classList.remove('open'); }
function bindModalBackdrops() {
  qsa('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
  });
}

/* ---------------- Confirm dialog ---------------- */
function confirmAction(message, onConfirm) {
  let bd = qs('#confirmModal');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'confirmModal';
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal" style="max-width:340px;">
      <p id="confirmMsg" style="font-size:14.5px;font-weight:600;margin-bottom:18px;"></p>
      <div class="flex gap-8"><button class="btn btn-outline w-full" id="confirmNo">Cancel</button><button class="btn btn-danger w-full" id="confirmYes">Confirm</button></div>
    </div>`;
    document.body.appendChild(bd);
    bd.addEventListener('click', (e) => { if (e.target === bd) closeModal('confirmModal'); });
  }
  qs('#confirmMsg', bd).textContent = message;
  const yes = qs('#confirmYes', bd);
  const no = qs('#confirmNo', bd);
  const newYes = yes.cloneNode(true); yes.replaceWith(newYes);
  newYes.addEventListener('click', () => { closeModal('confirmModal'); onConfirm(); });
  no.onclick = () => closeModal('confirmModal');
  openModal('confirmModal');
}

/* ---------------- Ripple ---------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn, .fab, .icon-btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const r = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  r.className = 'ripple';
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size / 2) + 'px';
  r.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.style.position = btn.style.position || 'relative';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 500);
});

/* ---------------- Icons (feather-style inline svg strings) ---------------- */
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  routine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>',
  analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
};

/* ---------------- Shell: sidebar + bottom nav + topbar ---------------- */
const NAV_ITEMS = [
  { page: 'dashboard.html', label: 'Home', icon: 'home' },
  { page: 'food.html', label: 'Food', icon: 'food' },
  { page: 'money.html', label: 'Money', icon: 'money' },
  { page: 'routine.html', label: 'Routine', icon: 'routine' },
  { page: 'analytics.html', label: 'Analytics', icon: 'analytics' },
];

function buildShell(pageTitle) {
  const user = DB.currentUser();
  const page = currentPage();
  const shellHTML = `
  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <div class="brand-mark">PL</div>
      <span class="brand-text">LifeTrack</span>
      <button class="sidebar-toggle" id="sidebarToggle" title="Collapse">${ICONS.chevron}</button>
    </div>
    <nav class="side-nav">
      ${NAV_ITEMS.map(i => `<a class="side-link ${page === i.page ? 'active' : ''}" href="${i.page}">${ICONS[i.icon]}<span class="side-label">${i.label}</span></a>`).join('')}
      <div style="flex:1"></div>
      <a class="side-link ${page === 'admin.html' ? 'active' : ''}" href="admin.html">${ICONS.admin}<span class="side-label">Admin</span></a>
      <a class="side-link" id="sideLogout">${ICONS.logout}<span class="side-label">Log out</span></a>
    </nav>
  </aside>
  <div class="main-area">
    <header class="topbar" id="topbar">
      <h1 class="page-title">${pageTitle}</h1>
      <div class="topbar-actions">
        <button class="icon-btn" id="themeToggle" title="Toggle theme"><span class="theme-icon">${(localStorage.getItem('plt_theme') === 'dark') ? ICONS.sun : ICONS.moon}</span></button>
        <button class="icon-btn" title="Notifications">${ICONS.bell}</button>
        <div class="avatar" id="avatarBtn" title="${user ? user.name : ''}">${user ? initials(user.name) : '?'}</div>
      </div>
    </header>
    <main class="content" id="pageContent"></main>
  </div>
  <nav class="bottom-nav">
    ${NAV_ITEMS.map(i => `<a class="bn-item ${page === i.page ? 'active' : ''}" href="${i.page}">${ICONS[i.icon]}<span>${i.label}</span></a>`).join('')}
  </nav>`;
  document.body.insertAdjacentHTML('afterbegin', shellHTML);

  qs('#themeToggle').addEventListener('click', toggleTheme);
  qs('#sidebarToggle').addEventListener('click', () => qs('#sidebar').classList.toggle('collapsed'));
  qs('#sideLogout').addEventListener('click', () => { DB.clearSession(); location.href = 'login.html'; });
  qs('#avatarBtn').addEventListener('click', () => {
    confirmAction('Log out of LifeTrack?', () => { DB.clearSession(); location.href = 'login.html'; });
  });
  window.addEventListener('scroll', () => qs('#topbar').classList.toggle('scrolled', window.scrollY > 4));
}

/* ---------------- Score ring builder ---------------- */
function scoreRing(percent, size = 120, stroke = 10, label = 'today') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamp(percent, 0, 100) / 100) * c;
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px;">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${offset}"/>
    </svg>
    <div class="ring-center"><b>${Math.round(percent)}%</b><span>${label}</span></div>
  </div>`;
}
function animateRings(root = document) {
  requestAnimationFrame(() => {
    qsa('.ring-fill', root).forEach(el => { el.style.strokeDashoffset = el.dataset.target; });
  });
}

/* ---------------- Derived data helpers ---------------- */
function dailyPercent(data, dateStr) {
  const log = data.routineLog[dateStr] || {};
  const total = data.dailyItems.length;
  const done = data.dailyItems.filter(i => log[i.id]).length;
  return total ? Math.round((done / total) * 100) : 0;
}
function currentStreak(data, itemId) {
  let streak = 0, d = todayStr();
  while (data.routineLog[d] && data.routineLog[d][itemId]) { streak++; d = addDays(d, -1); }
  return streak;
}
function todaysExpense(data) {
  const t = todayStr();
  return data.transactions.filter(x => x.date === t && x.type === 'expense').reduce((s, x) => s + Number(x.amount), 0);
}
function monthExpense(data) {
  const ym = todayStr().slice(0, 7);
  return data.transactions.filter(x => x.date.startsWith(ym) && x.type === 'expense').reduce((s, x) => s + Number(x.amount), 0);
}
function balance(data) {
  return data.transactions.reduce((s, x) => s + (x.type === 'income' ? Number(x.amount) : -Number(x.amount)), 0);
}
function overdueRecurring(data) {
  return data.recurring.filter(r => addDays(r.lastCompleted, r.frequencyDays) <= todayStr());
}

/* ---------------- Canvas charts (vanilla, no libraries) ---------------- */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function drawBarChart(canvas, labels, values, color) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const pad = { top: 14, right: 10, bottom: 26, left: 8 };
  const max = Math.max(1, ...values);
  const barW = (w - pad.left - pad.right) / values.length;
  const muted = cssVar('--text-muted') || '#64748B';
  const col = color || cssVar('--primary') || '#2563EB';
  ctx.font = '11px Inter, sans-serif';
  values.forEach((v, i) => {
    const barH = ((h - pad.top - pad.bottom) * v) / max;
    const x = pad.left + i * barW + barW * 0.22;
    const bw = barW * 0.56;
    const y = h - pad.bottom - barH;
    const r = Math.min(6, bw / 2);
    ctx.fillStyle = col;
    roundRectPath(ctx, x, y, bw, Math.max(barH, 2), r);
    ctx.fill();
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + bw / 2, h - 8);
  });
}
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawLineChart(canvas, labels, values, color) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const pad = { top: 14, right: 10, bottom: 26, left: 30 };
  const max = Math.max(1, ...values);
  const stepX = (w - pad.left - pad.right) / Math.max(1, values.length - 1);
  const muted = cssVar('--text-muted') || '#64748B';
  const col = color || cssVar('--primary') || '#2563EB';
  const border = cssVar('--border') || '#E2E8F0';
  ctx.strokeStyle = border; ctx.lineWidth = 1;
  for (let g = 0; g <= 3; g++) {
    const y = pad.top + ((h - pad.top - pad.bottom) / 3) * g;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
  }
  const pts = values.map((v, i) => [pad.left + i * stepX, h - pad.bottom - ((h - pad.top - pad.bottom) * v) / max]);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], h - pad.bottom);
  pts.forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.lineTo(pts[pts.length - 1][0], h - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = col + '22';
  ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(...p) : ctx.lineTo(...p));
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  pts.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); });
  ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = muted; ctx.textAlign = 'center';
  labels.forEach((l, i) => ctx.fillText(l, pts[i][0], h - 8));
}
function drawDonut(canvas, entries) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const total = entries.reduce((s, e) => s + e.value, 0) || 1;
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8, inner = r * 0.6;
  let start = -Math.PI / 2;
  entries.forEach(e => {
    const angle = (e.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.arc(cx, cy, inner, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = e.color;
    ctx.fill();
    start += angle;
  });
  ctx.fillStyle = cssVar('--text') || '#1E293B';
  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(fmtMoney(total), cx, cy + 5);
}

/* export to window for page scripts */
Object.assign(window, {
  qs, qsa, uid, todayStr, addDays, fmtMoney, fmtDateNice, clamp, initials,
  DB, toast, openModal, closeModal, bindModalBackdrops, confirmAction, ICONS,
  buildShell, scoreRing, animateRings, dailyPercent, currentStreak, todaysExpense, monthExpense, balance, overdueRecurring, applyTheme,
  drawBarChart, drawLineChart, drawDonut,
});

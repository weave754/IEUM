/* 이음 | 업무도우미 (WEAVE 팀) ↔ Firebase 연결
   앱(index.html)은 원래 Claude 아티팩트의 claude.use('sample'|'db'|'user'|'assets')를 썼어요.
   이 파일은 같은 모양의 기능을 Firebase(로그인·Firestore)와 Gemini(Firebase AI Logic)로 만들어 줘요.
   - sample : Gemini 호출 (무료 등급, 결제 수단 연결 안 함)
   - db     : Cloud Firestore
   - user   : Google 로그인 + 회사(관리자/직원) 정보
   - assets : 쓰지 않아요 (파일 저장소는 유료 요금제가 필요해서, 지침은 글자만 저장해요) */
import { firebaseConfig, AI_MODELS } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.5.0/';
const LSK = 'weave-v1';
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} },
  clearWeave: () => { try { Object.keys(localStorage).filter(k => k.startsWith(LSK)).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const resolveApp = api => window.__weave && window.__weave.resolve(api);

/* ---------- 첫 화면(로그인·회사) ---------- */
const gateEl = () => document.getElementById('gate');
function gate(html) { const g = gateEl(); if (!g) return; g.hidden = false; g.innerHTML = `<div class="gate-in">${html}</div>`; const f = g.querySelector('[autofocus]'); if (f) f.focus(); }
function hideGate() { const g = gateEl(); if (g) { g.hidden = true; g.innerHTML = ''; } }
const brand = `<div class="gate-brand"><span class="logo" role="img" aria-label="이음 업무도우미"><svg viewBox="38 22 356 332" aria-hidden="true" focusable="false"><g fill="none" stroke="#4A9BD6" stroke-width="13" stroke-linecap="round"><path d="M73 57H358"/><path d="M73 185C125 160 175 170 220 184S315 207 358 185"/><path d="M73 313C125 288 175 298 220 312S315 335 358 313"/></g><g fill="#0072B2"><circle cx="73" cy="57" r="30"/><circle cx="73" cy="185" r="30"/><circle cx="73" cy="313" r="30"/></g><g fill="#E69F00"><circle cx="358" cy="57" r="30"/><circle cx="358" cy="185" r="30"/><circle cx="358" cy="313" r="30"/></g></svg></span></div>`;
const gerr = t => t ? `<div class="note warn" role="alert"><div>${esc(t)}</div></div>` : '';
const busyBtn = (btn, on) => { if (btn) { btn.disabled = on; } };

function goLocal(sample) {
  ls.set(LSK + '-local', '1');
  window.WEAVE_ORG = null; window.WEAVE_MEMBER = null;
  window.WEAVE_ACCOUNT = { signedIn: false, company: null, signIn: () => { ls.del(LSK + '-local'); location.reload(); } };
  hideGate();
  resolveApp({ use: n => n === 'sample' ? sample : null });
}

/* ---------- Firestore → 앱이 쓰던 db 모양 ---------- */
function mapErr(e) {
  const c = e && e.code || '';
  const code = /permission-denied|unauthenticated|invalid-argument|failed-precondition|not-found/.test(c) ? 'invalid_argument'
    : /resource-exhausted/.test(c) ? 'quota_exceeded' : 'unavailable';
  return { code, message: String(e && e.message || c) };
}
function makeDb(F, fs) {
  const autoId = () => F.doc(F.collection(fs, '_')).id;
  const snapDoc = s => ({ id: s.id, exists: s.exists(), data: () => s.exists() ? s.data() : undefined, metadata: { fromCache: !!(s.metadata && s.metadata.fromCache), hasPendingWrites: !!(s.metadata && s.metadata.hasPendingWrites) } });
  const snapQuery = s => { const docs = s.docs.map(snapDoc); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: !!(s.metadata && s.metadata.fromCache), hasPendingWrites: !!(s.metadata && s.metadata.hasPendingWrites) } }; };
  const wrapErr = p => p.catch(e => { throw mapErr(e); });
  function docRef(path) {
    const r = F.doc(fs, path);
    return {
      id: r.id, path,
      get: () => wrapErr(F.getDoc(r).then(snapDoc)),
      set: d => wrapErr(F.setDoc(r, d)),
      update: d => wrapErr(F.updateDoc(r, d)),
      delete: () => wrapErr(F.deleteDoc(r)),
      onSnapshot: (next, err) => F.onSnapshot(r, s => next(snapDoc(s)), e => err && err(mapErr(e))),
      collection: p => colRef(path + '/' + p)
    };
  }
  function queryRef(path, cons) {
    const q = () => F.query(F.collection(fs, path), ...cons);
    return {
      where: (f, op, v) => queryRef(path, [...cons, F.where(f, op, v)]),
      orderBy: (f, dir) => queryRef(path, [...cons, F.orderBy(f, dir || 'asc')]),
      limit: n => queryRef(path, [...cons, F.limit(n)]),
      get: () => wrapErr(F.getDocs(q()).then(snapQuery)),
      onSnapshot: (next, err) => F.onSnapshot(q(), { includeMetadataChanges: true }, s => next(snapQuery(s)), e => err && err(mapErr(e)))
    };
  }
  function colRef(path) {
    return Object.assign(queryRef(path, []), {
      path,
      doc: id => docRef(path + '/' + (id || autoId())),
      add: async d => { const ref = docRef(path + '/' + autoId()); await ref.set(d); return ref; }
    });
  }
  return { doc: docRef, collection: colRef };
}

/* ---------- Gemini → 앱이 쓰던 sample 모양 ---------- */
function classifyAi(e) {
  const m = String((e && e.message) || '') + ' ' + String((e && e.customErrorData && e.customErrorData.status) || '') + ' ' + String((e && e.code) || '');
  if (/429|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(m)) return 'rate_limited';
  if (/\b404\b|NOT_FOUND|not found|is not supported|unsupported model/i.test(m)) return 'model_missing';
  if (/SAFETY|blocked|PROHIBITED/i.test(m)) return 'refused';
  if (/token|too large|exceeds/i.test(m) && /input|prompt|context/i.test(m)) return 'prompt_too_large';
  return 'unavailable';
}
function makeSample(F, app) {
  let ai;
  try { ai = F.getAI(app, { backend: new F.GoogleAIBackend() }); } catch (e) { console.error('[WEAVE] AI를 준비하지 못했어요', e); return null; }
  const models = Array.isArray(AI_MODELS) && AI_MODELS.length ? AI_MODELS : ['gemini-3.8-flash'];
  let mi = 0;
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
  async function build(input, images) {
    let system = null, turns;
    if (typeof input === 'string') turns = [{ role: 'user', content: input }];
    else {
      turns = input.slice();
      if (turns.length >= 2 && turns[0].role === 'user' && turns[1].role === 'user') { system = String(turns[0].content || ''); turns = turns.slice(1); }
    }
    const contents = [];
    for (const t of turns) {
      const role = t.role === 'assistant' ? 'model' : 'user', text = String(t.content || '');
      const last = contents[contents.length - 1];
      if (last && last.role === role) last.parts.push({ text }); else contents.push({ role, parts: [{ text }] });
    }
    if (images && images.length) {
      const lastUser = [...contents].reverse().find(c => c.role === 'user');
      for (const img of images) lastUser.parts.push({ inlineData: { mimeType: img.type || 'image/png', data: await b64(img) } });
    }
    return { system, contents };
  }
  async function run(input, opts, json) {
    opts = opts || {};
    const { system, contents } = await build(input, opts.images);
    for (let k = mi; k < models.length; k++) {
      try {
        const params = { model: models[k] };
        if (system) params.systemInstruction = system;
        if (json) params.generationConfig = { responseMimeType: 'application/json' };
        const model = F.getGenerativeModel(ai, params);
        if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: '', text: '' };
        if (opts.onText && !json) {
          const r = await model.generateContentStream({ contents });
          let text = '';
          for await (const ch of r.stream) {
            if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: '', text };
            let d = ''; try { d = ch.text(); } catch (e) {}
            if (d) { text += d; opts.onText({ text, delta: d }); }
          }
          mi = k; return { text, truncated: false };
        }
        const r = await model.generateContent({ contents });
        let text = ''; try { text = r.response.text(); } catch (e) { throw { code: 'refused', message: 'blocked' }; }
        mi = k; return { text, truncated: false };
      } catch (e) {
        if (e && (e.code === 'cancelled' || e.code === 'refused')) throw e;
        const c = classifyAi(e);
        if (c === 'model_missing' && k < models.length - 1) { console.warn('[WEAVE] 모델을 바꿔요:', models[k], '→', models[k + 1]); continue; }
        if (c === 'unavailable') console.error('[WEAVE] AI 호출 실패. Firebase 콘솔에서 AI Logic(Gemini Developer API)을 켰는지 확인해요.', e);
        throw { code: c === 'model_missing' ? 'unavailable' : c, message: String((e && e.message) || e) };
      }
    }
  }
  const sample = (input, opts) => run(input, opts, false);
  sample.json = async (input, opts) => {
    const { text } = await run(input, Object.assign({}, opts, { onText: null }), true);
    const t = String(text || '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
    try { return JSON.parse(t); } catch (e) {
      const m = t.match(/[\[{][\s\S]*[\]}]/); if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
      throw { code: 'invalid_json', message: 'JSON을 읽지 못했어요' };
    }
  };
  sample.limits = async () => ({ tools: false, images: true });
  return sample;
}

/* ---------- 시작 ---------- */
async function loadFirebase() {
  if (window.__weaveFakeFirebase) return window.__weaveFakeFirebase;   // 시험용
  const mods = await Promise.all(['firebase-app', 'firebase-auth', 'firebase-firestore', 'firebase-ai'].map(n => import(SDK + n + '.js')));
  return Object.assign({}, ...mods);
}
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

async function main() {
  const ok = firebaseConfig && firebaseConfig.apiKey && !/여기|YOUR|붙여/i.test(firebaseConfig.apiKey);
  if (!ok) {
    gate(`${brand}<div class="card stack"><h2>Firebase 설정이 아직 없어요</h2><p class="sub">firebase-config.js 파일에 내 Firebase 프로젝트 설정값을 넣으면 로그인, 저장, AI를 쓸 수 있어요. 설치 안내서(README.md) 3단계를 봐요.</p></div>
      <button class="btn big" id="g-local">설정 없이 둘러보기</button><p class="small mute">이 기기에만 저장되고, AI와 회사 기능은 쓸 수 없어요.</p>`);
    document.getElementById('g-local').onclick = () => { hideGate(); resolveApp(null); };
    return;
  }
  let F;
  try { F = await loadFirebase(); }
  catch (e) {
    console.error(e);
    gate(`${brand}<div class="card stack"><h2>연결하지 못했어요</h2><p class="sub">인터넷 연결을 확인하고 다시 열어 주세요.</p></div><button class="btn primary big" onclick="location.reload()">다시 열기</button>`);
    return;
  }
  const app = F.initializeApp(firebaseConfig);
  const auth = F.getAuth(app);
  const fs = F.getFirestore(app);
  const sample = makeSample(F, app);
  const db = makeDb(F, fs);
  try { await F.getRedirectResult(auth); } catch (e) {}
  const user = await new Promise(r => { const u = F.onAuthStateChanged(auth, x => { u(); r(x); }); });

  if (!user) {
    if (ls.get(LSK + '-local') === '1') { goLocal(sample); return; }
    return showLogin(F, auth, sample);
  }
  // 다른 사람이 같은 기기에서 로그인하면, 앞사람 기록이 섞이지 않게 비워요.
  const last = ls.get(LSK + '-uid');
  if (last && last !== user.uid) { ls.clearWeave(); ls.set(LSK + '-uid', user.uid); location.reload(); return; }
  ls.set(LSK + '-uid', user.uid); ls.del(LSK + '-local');
  return enterCompany(F, fs, auth, db, sample, user);
}

function showLogin(F, auth, sample, err) {
  gate(`${brand}
    <div class="stack" style="gap:6px"><h1>이음 | 업무도우미</h1><p class="sub">일을 한 단계씩 알려 주고, 상사가 보낸 일을 한곳에서 볼 수 있어요.</p></div>
    ${gerr(err)}
    <button class="btn primary big" id="g-google">Google로 로그인</button>
    <button class="btn big" id="g-local">로그인 없이 써 보기</button>
    <p class="small mute">로그인하지 않으면 기록이 이 기기에만 남고, 회사(상사·직원) 기능은 쓸 수 없어요.</p>
    <p class="small mute" style="text-align:center">Developed by WEAVE</p>`);
  document.getElementById('g-local').onclick = () => goLocal(sample);
  document.getElementById('g-google').onclick = async e => {
    busyBtn(e.currentTarget, true);
    const provider = new F.GoogleAuthProvider();
    try { await F.signInWithPopup(auth, provider); location.reload(); }
    catch (er) {
      if (er && /popup-blocked|operation-not-supported|popup-closed-by-user|cancelled-popup/.test(er.code || '')) {
        if (/popup-closed|cancelled/.test(er.code)) { busyBtn(e.currentTarget, false); return; }
        try { await F.signInWithRedirect(auth, provider); return; } catch (e2) { er = e2; }
      }
      console.error(er);
      showLogin(F, auth, sample, /unauthorized-domain/.test(er && er.code || '') ? '이 주소에서는 로그인할 수 없어요. Firebase 콘솔의 승인된 도메인에 이 사이트 주소를 넣어 주세요.' : '로그인하지 못했어요. 다시 눌러 주세요.');
    }
  };
}

async function enterCompany(F, fs, auth, db, sample, user) {
  const uid = user.uid, name = user.displayName || (user.email || '').split('@')[0] || '사용자', photo = user.photoURL || '', email = user.email || '';
  const profRef = F.doc(fs, `data/users/${uid}/profile`);
  let prof = {};
  try { const s = await F.getDoc(profRef); prof = s.exists() ? s.data() : {}; } catch (e) { console.error(e); }
  const companies = Array.isArray(prof.companies) ? prof.companies : [];
  let CUR = null;

  async function tryEnter(cid) {
    try {
      const o = await F.getDoc(F.doc(fs, `org/${cid}`));
      if (!o.exists()) return false;
      const d = o.data(), isAdmin = Array.isArray(d.admins) && d.admins.includes(uid);
      if (!isAdmin) { const m = await F.getDoc(F.doc(fs, `org/${cid}/members/${uid}`)); if (!m.exists()) return false; }
      CUR = { cid, name: d.name || '회사', code: d.code || '', isAdmin };
      return true;
    } catch (e) { return false; }
  }
  async function saveProfile(cid) {
    const list = companies.filter(c => c.cid !== (CUR && CUR.cid));
    if (CUR) list.unshift({ cid: CUR.cid, name: CUR.name, role: CUR.isAdmin ? 'admin' : 'member' });
    try { await F.setDoc(profRef, { cid: cid || null, companies: list.slice(0, 10), name, updatedAt: Date.now() }); } catch (e) { console.error(e); }
  }
  async function signOutAll() { try { await F.signOut(auth); } catch (e) {} ls.clearWeave(); location.reload(); }

  function finish() {
    window.WEAVE_ORG = CUR ? 'org/' + CUR.cid : null;
    window.WEAVE_MEMBER = CUR && !CUR.isAdmin ? { code: CUR.code, name, photo } : null;
    window.WEAVE_ACCOUNT = {
      signedIn: true, name, email,
      company: CUR ? { name: CUR.name, code: CUR.code, isAdmin: CUR.isAdmin } : null,
      signOut: signOutAll,
      switchCompany: async () => { try { await F.setDoc(profRef, { cid: null, companies, name, updatedAt: Date.now() }); } catch (e) {} location.reload(); }
    };
    const memberCache = {};
    let roster = null, rosterAt = 0;
    async function getRoster() {
      if (!CUR || !CUR.isAdmin) return [];
      if (roster && Date.now() - rosterAt < 30000) return roster;
      try { const s = await F.getDocs(F.collection(fs, `org/${CUR.cid}/members`)); roster = s.docs.map(d => Object.assign({ id: d.id }, d.data())); rosterAt = Date.now(); roster.forEach(m => memberCache[m.id] = m); }
      catch (e) { roster = []; }
      return roster;
    }
    const prof = (id, m) => ({ id, name: (m && m.name) || '', avatarUrl: (m && m.photo) || '', color: '#0072B2', email: null, isMe: id === uid, guest: false });
    const userApi = {
      id: async () => uid,
      isOwner: async () => !!(CUR && CUR.isAdmin),
      canEdit: async () => !!(CUR && CUR.isAdmin),
      can: async () => null,
      name: async () => name, email: async () => email, avatarUrl: async () => photo || null,
      me: async () => ({ id: uid, name, avatarUrl: photo, color: '#0072B2', email, isOwner: !!(CUR && CUR.isAdmin), canEdit: !!(CUR && CUR.isAdmin) }),
      profiles: async ids => {
        ids = [].concat(ids || []); const out = {};
        if (CUR && CUR.isAdmin && ids.some(id => !memberCache[id])) await getRoster();
        ids.forEach(id => out[id] = id === uid ? prof(id, { name, photo }) : prof(id, memberCache[id]));
        return out;
      },
      search: async q => { const r = await getRoster(), s = String(q || '').trim().toLowerCase(); return r.filter(m => !s || String(m.name || '').toLowerCase().includes(s)).slice(0, 8).map(m => prof(m.id, m)); }
    };
    hideGate();
    resolveApp({ use: n => n === 'sample' ? sample : n === 'db' ? db : n === 'user' ? userApi : null });
  }

  if (prof.cid && await tryEnter(prof.cid)) return finish();

  // 내가 관리하는 회사 찾기
  let owned = [];
  try { const s = await F.getDocs(F.query(F.collection(fs, 'org'), F.where('admins', 'array-contains', uid))); owned = s.docs.map(d => ({ cid: d.id, name: d.data().name || '회사', role: 'admin' })); } catch (e) {}
  const known = [...owned, ...companies.filter(c => !owned.some(o => o.cid === c.cid))];

  function showChoice(err) {
    gate(`${brand}
      <div class="stack" style="gap:6px"><h1>${esc(name)}님, 어떻게 쓸까요?</h1><p class="sub">회사 코드가 있으면 직원으로 들어가요. 상사라면 회사를 만들어요.</p></div>
      ${gerr(err)}
      ${known.length ? `<section class="card stack"><span class="lbl">내 회사</span>${known.map(c => `<button class="btn" data-cid="${esc(c.cid)}">${esc(c.name)} · ${c.role === 'admin' ? '관리자' : '직원'}</button>`).join('')}</section>` : ''}
      <section class="card stack"><h2>직원으로 들어가기</h2>
        <div class="field"><label for="g-code">상사에게 받은 회사 코드</label><input class="input" id="g-code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="예: K7M2QX" style="letter-spacing:.2em;font-weight:700;text-transform:uppercase"></div>
        <button class="btn primary big" id="g-join">들어가기</button></section>
      <section class="card stack"><h2>관리자(상사)로 시작하기</h2>
        <div class="field"><label for="g-org">회사나 팀 이름</label><input class="input" id="g-org" maxlength="40" placeholder="예: 한빛상사 총무팀"></div>
        <button class="btn big" id="g-make">회사 만들기</button></section>
      <button class="btn ghost" id="g-solo">혼자 쓰기</button>
      <button class="btn ghost" id="g-out">로그아웃 (${esc(email)})</button>`);
    const g = gateEl();
    g.querySelectorAll('[data-cid]').forEach(b => b.onclick = async () => { busyBtn(b, true); if (await tryEnter(b.dataset.cid)) { await saveProfile(CUR.cid); finish(); } else showChoice('이 회사에 들어갈 수 없어요. 회사 코드를 다시 넣어 주세요.'); });
    document.getElementById('g-solo').onclick = async () => { CUR = null; await saveProfile(null); finish(); };
    document.getElementById('g-out').onclick = signOutAll;
    document.getElementById('g-join').onclick = async e => {
      const code = document.getElementById('g-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 6) { showChoice('회사 코드 6자리를 넣어 주세요.'); return; }
      busyBtn(e.currentTarget, true);
      try {
        const c = await F.getDoc(F.doc(fs, `codes/${code}`));
        if (!c.exists()) { showChoice('이 코드를 찾지 못했어요. 상사에게 코드를 다시 확인해 주세요.'); return; }
        const cid = c.data().cid, now = Date.now();
        const mref = F.doc(fs, `org/${cid}/members/${uid}`);
        const old = await F.getDoc(mref);
        await F.setDoc(mref, Object.assign({ tasks: {}, joinedAt: now }, old.exists() ? old.data() : {}, { code, name, photo, seenAt: now }));
        if (await tryEnter(cid)) { await saveProfile(cid); finish(); } else showChoice('들어가지 못했어요. 다시 해 주세요.');
      } catch (er) { console.error(er); showChoice('들어가지 못했어요. 코드가 바뀌었는지 상사에게 확인해 주세요.'); }
    };
    document.getElementById('g-make').onclick = async e => {
      const oname = document.getElementById('g-org').value.trim();
      if (!oname) { showChoice('회사나 팀 이름을 넣어 주세요.'); return; }
      busyBtn(e.currentTarget, true);
      try {
        const cid = F.doc(F.collection(fs, 'org')).id;
        let code = newCode();
        await F.setDoc(F.doc(fs, `org/${cid}`), { name: oname.slice(0, 40), code, admins: [uid], createdAt: Date.now() });
        let done = false;
        for (let i = 0; i < 6 && !done; i++) {
          try { await F.setDoc(F.doc(fs, `codes/${code}`), { cid }); done = true; }
          catch (er) { code = newCode(); await F.updateDoc(F.doc(fs, `org/${cid}`), { code }); }
        }
        if (!done) throw new Error('code');
        CUR = { cid, name: oname, code, isAdmin: true };
        await saveProfile(cid);
        gate(`${brand}<div class="card stack" style="text-align:center"><h2>‘${esc(oname)}’을 만들었어요</h2><p class="sub">직원에게 아래 회사 코드를 알려 주세요. 직원은 로그인한 뒤 이 코드를 넣으면 들어와요.</p>
          <p class="gate-code" id="g-codeval">${code}</p><button class="btn soft" id="g-copy">코드 복사</button><p class="small mute">코드는 설정과 관리자 화면의 직원 탭에서도 볼 수 있어요.</p></div>
          <button class="btn primary big" id="g-start">시작하기</button>`);
        document.getElementById('g-copy').onclick = async () => { try { await navigator.clipboard.writeText(code); document.getElementById('g-copy').textContent = '복사했어요'; } catch (e) {} };
        document.getElementById('g-start').onclick = () => { try { localStorage.setItem(LSK + '-mode', 'admin'); } catch (e) {} finish(); };
      } catch (er) { console.error(er); showChoice('회사를 만들지 못했어요. Firestore 보안 규칙을 넣었는지 확인해 주세요.'); }
    };
  }
  showChoice();
}

main().catch(e => {
  console.error('[WEAVE] 시작하지 못했어요', e);
  gate(`${brand}<div class="card stack"><h2>시작하지 못했어요</h2><p class="sub">잠시 뒤 다시 열어 주세요.</p></div><button class="btn big" id="g-local2">이 기기에서만 쓰기</button>`);
  const b = document.getElementById('g-local2'); if (b) b.onclick = () => { hideGate(); resolveApp(null); };
});

/* Digital Learning Hub — pautan masa nyata (Firebase Realtime Database) + mod edit pentadbir (emel + kata laluan).
   Data: ekspresCilik/links/<id> = URL.  Semua pelawat membaca; hanya pentadbir (PIN) boleh menulis. */
(() => {
 'use strict';
 const config = window.FIREBASE_CONFIG;
 const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const LINKS_PATH = 'ekspresCilik/links';
 const listeners = new Set();
 let editing = false, admin = false, database = null, auth = null, baseReady = null, authReady = null;
 let ui = null, editorId = null;

 const safeUrl = v => { try { const u = new URL(String(v || '').trim()); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
 const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script'); s.src = src; s.onload = resolve;
  s.onerror = () => reject(new Error('Tidak dapat memuatkan Firebase. Semak sambungan internet.'));
  document.head.append(s);
 });
 const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
 const text = (node, value) => { node.textContent = value; };

 /* ---------- Firebase: baca pautan (semua pelawat) ---------- */
 function loadBase() {
  if (baseReady) return baseReady;
  baseReady = (async () => {
   if (!config || !config.apiKey || !config.databaseURL) throw new Error('Konfigurasi Firebase belum lengkap.');
   await loadScript(SDK + 'firebase-app-compat.js');
   await loadScript(SDK + 'firebase-database-compat.js');
   if (!firebase.apps.length) firebase.initializeApp(config);
   database = firebase.database();
   database.ref(LINKS_PATH).on('value',
    snap => { const value = snap.val(); if (window.hubSetLinks) window.hubSetLinks(value && typeof value === 'object' ? value : {}); },
    error => console.warn('Firebase (baca pautan):', error.message));
  })();
  baseReady.catch(() => { baseReady = null; });
  return baseReady;
 }

 /* ---------- Firebase: log masuk pentadbir (PIN → custom token) ---------- */
 function loadAuth() {
  if (authReady) return authReady;
  authReady = (async () => {
   await loadBase();
   await loadScript(SDK + 'firebase-auth-compat.js');
   auth = firebase.auth();
   try { await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION); } catch {}
   auth.onAuthStateChanged(user => { if (!user && admin) { admin = false; if (editing) stop(); } });
  })();
  authReady.catch(() => { authReady = null; });
  return authReady;
 }
 async function ensureAdmin() {
  await loadAuth();
  const user = await new Promise(resolve => { const off = auth.onAuthStateChanged(u => { off(); resolve(u); }); });
  if (user) { admin = true; return true; }
  const login = await askLogin();
  if (!login) return false;
  try { await auth.signInWithEmailAndPassword(login.email, login.password); }
  catch (error) {
   const bad = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(error && error.code);
   throw new Error(bad ? 'Emel atau kata laluan salah.' : (error && error.message) || 'Log masuk gagal.');
  }
  admin = true;
  return true;
 }

 /* ---------- UI ---------- */
 function buildUi() {
  if (ui) return ui;
  const bar = el(`<div class="hub-edit-ui hub-edit-bar" role="region" aria-label="Mod edit pautan" hidden>
   <span class="hub-edit-bar-text"><strong>Mod edit pautan</strong><small>Tekan mana-mana kotak untuk ubah pautan.</small></span>
   <button type="button" class="hub-edit-done">Selesai</button></div>`);
  const toast = el(`<div class="hub-edit-ui hub-edit-toast" role="status" aria-live="polite" hidden></div>`);
  const editor = el(`<dialog class="hub-edit-ui hub-edit-dialog" aria-labelledby="hub-edit-title"><form method="dialog" class="hub-edit-form" novalidate>
   <h2 id="hub-edit-title">Edit pautan</h2><p class="hub-edit-name"></p>
   <label for="hub-edit-url">Pautan (https://…)</label>
   <input id="hub-edit-url" name="url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://">
   <p class="hub-edit-default"></p><p class="hub-edit-msg" role="alert"></p>
   <div class="hub-edit-actions"><button type="submit" class="hub-edit-save">Simpan</button><button type="button" class="hub-edit-reset">Pulihkan asal</button><button type="button" class="hub-edit-cancel">Batal</button></div>
  </form></dialog>`);
  const pin = el(`<dialog class="hub-edit-ui hub-edit-dialog" aria-labelledby="hub-pin-title"><form method="dialog" class="hub-edit-form" novalidate>
   <h2 id="hub-pin-title">Log masuk pentadbir</h2><p class="hub-edit-name">Masukkan akaun pentadbir untuk membuka mod edit.</p>
   <label for="hub-login-email">Emel</label>
   <input id="hub-login-email" name="email" type="email" autocomplete="username" autocapitalize="off" spellcheck="false">
   <label for="hub-login-pass">Kata laluan</label>
   <input id="hub-login-pass" name="password" type="password" autocomplete="current-password">
   <p class="hub-edit-msg" role="alert"></p>
   <div class="hub-edit-actions"><button type="submit" class="hub-edit-save">Masuk</button><button type="button" class="hub-edit-cancel">Batal</button></div>
  </form></dialog>`);
  document.body.append(bar, toast, editor, pin);
  ui = { bar, toast, editor, pin, timer: 0 };

  bar.querySelector('.hub-edit-done').addEventListener('click', finish);
  editor.querySelector('.hub-edit-cancel').addEventListener('click', () => editor.close());
  editor.querySelector('.hub-edit-reset').addEventListener('click', () => save(''));
  editor.querySelector('form').addEventListener('submit', event => { event.preventDefault(); save(editor.querySelector('input').value); });
  return ui;
 }
 function say(message) {
  const { toast } = buildUi(); text(toast, message); toast.hidden = false;
  clearTimeout(ui.timer); ui.timer = setTimeout(() => { toast.hidden = true; }, 4200);
 }
 function askLogin() {
  const { pin } = buildUi();
  const form = pin.querySelector('form'), email = form.elements.email, pass = form.elements.password, msg = pin.querySelector('.hub-edit-msg');
  return new Promise(resolve => {
   let value = null;
   pass.value = ''; text(msg, '');
   const onSubmit = event => {
    event.preventDefault();
    const e = email.value.trim(), p = pass.value;
    if (!e || !p) { text(msg, 'Sila isi emel dan kata laluan.'); (e ? pass : email).focus(); return; }
    value = { email: e, password: p }; pin.close();
   };
   const onCancel = () => pin.close();
   const onClose = () => { form.removeEventListener('submit', onSubmit); pin.querySelector('.hub-edit-cancel').removeEventListener('click', onCancel); pin.removeEventListener('close', onClose); pass.value = ''; resolve(value); };
   form.addEventListener('submit', onSubmit);
   pin.querySelector('.hub-edit-cancel').addEventListener('click', onCancel);
   pin.addEventListener('close', onClose);
   pin.showModal(); email.focus();
  });
 }

 /* ---------- Penyunting pautan ---------- */
 function openEditor(target) {
  const id = target.dataset.editId; if (!id) return;
  const info = window.hubLinkInfo ? window.hubLinkInfo(id) : { custom: '', fallback: '' };
  const { editor } = buildUi();
  editorId = id;
  text(editor.querySelector('.hub-edit-name'), target.dataset.editLabel || id);
  editor.querySelector('input').value = info.custom || (/^https?:/i.test(info.fallback) ? info.fallback : '');
  text(editor.querySelector('.hub-edit-default'), info.fallback ? 'Pautan asal: ' + info.fallback : 'Pautan asal: (belum ada pautan)');
  text(editor.querySelector('.hub-edit-msg'), '');
  editor.querySelector('.hub-edit-reset').hidden = !info.custom;
  editor.showModal();
  editor.querySelector('input').select();
 }
 async function save(raw) {
  const { editor } = buildUi();
  const msg = editor.querySelector('.hub-edit-msg'), buttons = editor.querySelectorAll('button');
  const value = String(raw || '').trim();
  const url = value ? safeUrl(value) : '';
  if (value && !url) { text(msg, 'Pautan tidak sah. Gunakan alamat yang bermula dengan https:// atau http://.'); return; }
  if (!database || !admin) { text(msg, 'Log masuk pentadbir diperlukan.'); return; }
  buttons.forEach(b => { b.disabled = true; });
  try {
   const ref = database.ref(LINKS_PATH + '/' + editorId);
   if (url) await ref.set(url); else await ref.remove();
   editor.close();
   say(url ? 'Pautan disimpan dan disegerakkan.' : 'Pautan dipulihkan kepada asal.');
  } catch (error) {
   text(msg, error && error.code === 'PERMISSION_DENIED' ? 'Tiada kebenaran menulis. Log keluar dan masuk semula.' : 'Tidak dapat menyimpan: ' + (error.message || error));
  } finally { buttons.forEach(b => { b.disabled = false; }); }
 }

 /* ---------- Hidup / mati mod edit ---------- */
 const notify = () => listeners.forEach(fn => { try { fn(editing); } catch {} });
 async function finish() {
  stop();
  try { if (auth) await auth.signOut(); } catch {}
  admin = false; say('Selesai');
 }
 function stop() {
  editing = false; document.body.classList.remove('hub-editing');
  if (ui) { ui.bar.hidden = true; if (ui.editor.open) ui.editor.close(); }
  notify();
 }
 async function start() {
  buildUi();
  say('Menyemak akses pentadbir…');
  try {
   if (!(await ensureAdmin())) { ui.toast.hidden = true; return; }
  } catch (error) {
   say('Tidak dapat membuka mod edit: ' + (error && error.message ? error.message : 'ralat tidak diketahui'));
   return;
  }
  editing = true; document.body.classList.add('hub-editing');
  ui.bar.hidden = false; ui.toast.hidden = true; notify();
 }
 document.addEventListener('click', event => {
  if (!editing) return;
  if (event.target.closest('.hub-edit-ui, .hub-music')) return;
  const target = event.target.closest('[data-edit-id]');
  if (!target) return;
  event.preventDefault(); event.stopPropagation();
  openEditor(target);
 }, true);

 window.HubEdit = {
  toggle: () => (editing ? finish() : start()),
  isOn: () => editing,
  onChange: fn => { listeners.add(fn); fn(editing); }
 };
 // Muat turun pautan terkini untuk semua pelawat.
 loadBase().catch(error => console.warn(error.message));
})();

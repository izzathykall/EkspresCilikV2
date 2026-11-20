(() => {
 'use strict';
 const $ = (selector, root=document) => root.querySelector(selector);
 const icons = ['folder','book','video','film','music','headphones','mic','clipboard','palette','gallery','heart','star','sparkle','leaf','ticket','friends','bus','flag','home'];
 const linkFields = [
  ['notes-tekno','Portfolio · EDUP6023 — Nota Pembelajaran'],['tutorials','Portfolio · EDUP6023 — Tutorial Mingguan'],['videos','Portfolio · EDUP6023 — Video Pembelajaran'],
  ['notes-sejarah','Portfolio · EDUP6013 — Nota Pembelajaran'],['kppb-sejarah','Portfolio · EDUP6013 — Tugasan KPPB'],['interview','Portfolio · EDUP6013 — Audio Temu Bual'],
  ['notes-english','Portfolio · MPU6122 — Learning Notes'],['kppb-english','Portfolio · MPU6122 — KPPB Assignments'],['movie','Portfolio · MPU6122 — Movie Review'],
  ['intro','Rak bahan — Video Pengenalan'],['tutorial2','Rak bahan — Tutorial Minggu 2'],['podcast','Rak bahan — Podcast Pembelajaran'],['reels','Rak bahan — Reels Pembelajaran'],['learning','Projek — Ruang Pembelajaran'],['animation','Projek — Video Animasi']
 ];
 const safeText = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeUrl = value => { try { const u=new URL(value,location.href); return ['http:','https:'].includes(u.protocol)?u.href:'#'; } catch { return '#'; } };
 window.escapeAdminText=safeText; window.safeAdminUrl=safeUrl;
 const STORAGE='dlh-admin-data-v1';
 let data={links:{},materials:[]}, database=null, auth=null, currentUser=null, selectedIcon='folder';
 try { data={...data,...JSON.parse(localStorage.getItem(STORAGE)||'{}')}; } catch {}
 window.HUB_ADMIN_DATA=data;
 const status=$('#firebase-status');
 function say(message,kind=''){ if(status){status.textContent=message;status.dataset.state=kind;} }
 function saveLocal(){ try{localStorage.setItem(STORAGE,JSON.stringify(data));}catch{} }
 function renderCustomTabs(){const group=$('.resource-tabs');if(!group)return;group.querySelectorAll('[data-custom-tab]').forEach(node=>node.remove());data.materials.forEach(m=>{const b=document.createElement('button');b.type='button';b.className='chip';b.dataset.resource=m.id;b.dataset.customTab='true';b.innerHTML=`<span class="chip-label">${safeText(m.title)}</span>`;group.append(b);});}
 function refresh(){ renderCustomTabs(); if(window.hubApplyAdminData)window.hubApplyAdminData(); renderMaterialList(); }
 function renderLinkFields(){
  $('#link-settings-list').innerHTML=linkFields.map(([id,label])=>`<label class="admin-link-field"><span>${safeText(label)}</span><input type="url" data-link-id="${id}" value="${safeText(data.links[id]||'')}" placeholder="https://..." inputmode="url"></label>`).join('');
 }
 function renderIcons(){ $('#icon-picker').innerHTML=icons.map(name=>`<button type="button" class="icon-choice ${name===selectedIcon?'selected':''}" data-icon-choice="${name}" aria-label="Ikon ${name}" aria-pressed="${name===selectedIcon}">${window.hubIcon(name)}</button>`).join(''); }
 function renderMaterialList(){
  $('#custom-material-list').innerHTML=data.materials.length?`<h3>Tab bahan yang telah ditambah</h3>${data.materials.map((m,i)=>`<div class="custom-material-row"><span>${window.hubIcon(m.icon||'folder')}</span><div><strong>${safeText(m.title)}</strong><small>${safeText(m.description)}</small></div><button type="button" data-remove-material="${i}" aria-label="Padam ${safeText(m.title)}">${window.hubIcon('close')}</button></div>`).join('')}`:'<p class="admin-empty">Belum ada tab tambahan.</p>';
 }
 async function persist(){
  saveLocal();
  if(database){
   if(!currentUser){say('Sila log masuk sebagai pentadbir Firebase sebelum menyimpan perubahan.','error');return;}
   try { await database.ref('ekspresCilik').set(data); say('Disimpan dan disegerakkan ke Firebase Realtime Database.','success'); }
   catch(error){ say('Tidak dapat menyimpan ke Firebase: '+error.message,'error'); }
  } else say('Disimpan pada peranti ini sahaja. Untuk sync masa nyata antara peranti, masukkan konfigurasi Firebase dalam firebase-config.js.','local');
  refresh();
 }
 $('#save-links').addEventListener('click',async()=>{
  const next={...data.links};
  document.querySelectorAll('[data-link-id]').forEach(input=>{const value=input.value.trim();if(value){if(safeUrl(value)!=='#')next[input.dataset.linkId]=value;}else delete next[input.dataset.linkId];});
  data.links=next; await persist();
 });
 $('#new-material-form').addEventListener('submit',async event=>{
  event.preventDefault(); const form=new FormData(event.currentTarget); const title=String(form.get('title')||'').trim(),description=String(form.get('description')||'').trim(),rawUrl=String(form.get('url')||'').trim();
  if(!title||!description)return; if(rawUrl&&safeUrl(rawUrl)==='#'){say('Sila masukkan pautan http atau https yang sah.','error');return;}
  data.materials.push({id:'material-'+Date.now(),title,description,icon:selectedIcon,url:rawUrl}); event.currentTarget.reset(); await persist();
 });
 document.addEventListener('click',async event=>{
  const choice=event.target.closest('[data-icon-choice]'); if(choice){selectedIcon=choice.dataset.iconChoice;renderIcons();}
  const remove=event.target.closest('[data-remove-material]'); if(remove){data.materials.splice(Number(remove.dataset.removeMaterial),1);await persist();}
 });
 $('#open-sound-settings').addEventListener('click',()=>{
  const toggle=$('.hub-music-toggle'); if(toggle){toggle.click();toggle.scrollIntoView({behavior:'smooth',block:'center'});} else say('Kawalan bunyi belum tersedia pada halaman ini.','error');
 });
 renderLinkFields();renderIcons();renderMaterialList();renderCustomTabs();refresh();
 if(window.FIREBASE_CONFIG&&window.FIREBASE_CONFIG.apiKey&&window.FIREBASE_CONFIG.databaseURL&&window.firebase){
  try{
   if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
   database=firebase.database();auth=firebase.auth();
   database.ref('ekspresCilik').on('value',snapshot=>{const remote=snapshot.val();if(remote&&typeof remote==='object'){data={links:remote.links||{},materials:Array.isArray(remote.materials)?remote.materials:[]};window.HUB_ADMIN_DATA=data;saveLocal();renderLinkFields();refresh();}say('Kandungan disegerakkan daripada Firebase Realtime Database.','success');},error=>say('Ralat Firebase: '+error.message,'error'));
   $('#firebase-login').addEventListener('submit',async event=>{event.preventDefault();const f=new FormData(event.currentTarget);try{await auth.signInWithEmailAndPassword(String(f.get('email')).trim(),String(f.get('password')));}catch(error){say('Log masuk gagal: '+error.message,'error');}});
   $('#firebase-logout').addEventListener('click',()=>auth.signOut());
   auth.onAuthStateChanged(user=>{
    currentUser=user;$('#firebase-login').hidden=!!user;$('#firebase-logout').hidden=!user;
    if(user){say('Log masuk sebagai pentadbir · anda boleh menyimpan perubahan ke Firebase Realtime Database.','success');}
    else {say('Data Firebase boleh dibaca. Log masuk pentadbir untuk menyimpan perubahan.','local');}
   });
  }catch(error){say('Konfigurasi Firebase tidak sah: '+error.message,'error');}
 } else { $('#firebase-login').hidden=true; say('Mod tempatan aktif. Masukkan konfigurasi Firebase dalam firebase-config.js untuk mengaktifkan simpanan Realtime Database.','local'); }
 window.hubAdminReload=refresh;
})();

(() => {
 'use strict';
 const $ = (selector, root=document) => root.querySelector(selector);
 const icons = ['folder','book','video','film','music','headphones','mic','clipboard','palette','gallery','heart','star','sparkle','leaf','ticket','friends','bus','flag','home'];
 const linkFields = [
  ['notes-tekno','Portfolio · EDUP6023 — Nota Pembelajaran'],
  ['tutorials','Portfolio · EDUP6023 — Tutorial Mingguan (pautan terus)'],
  ['tutorial2','Rak bahan — Tutorial Minggu 2'],
  ['videos','Portfolio · EDUP6023 — Video Pembelajaran (pautan terus)'],
  ['notes-sejarah','Portfolio · EDUP6013 — Nota Pembelajaran'],
  ['kppb-sejarah','Portfolio · EDUP6013 — Tugasan KPPB'],
  ['interview','Portfolio / Rak bahan — Audio Temu Bual'],
  ['notes-english','Portfolio · MPU6122 — Learning Notes'],
  ['kppb-english','Portfolio · MPU6122 — KPPB Assignments'],
  ['movie','Portfolio / Rak bahan — Movie Review'],
  ['intro','Rak bahan — Video Pengenalan'],
  ['podcast','Rak bahan — Podcast Pembelajaran'],
  ['reels','Rak bahan — Reels Pembelajaran'],
  ['learning','Projek — Ruang Pembelajaran'],
  ['animation','Projek — Video Animasi']
 ];
 const safeText = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeUrl = value => {
  try { const url = new URL(String(value || '').trim()); return ['http:','https:'].includes(url.protocol) ? url.href : '#'; }
  catch { return '#'; }
 };
 const normalizeData = source => {
  const raw = source && typeof source === 'object' ? source : {};
  const rawLinks = raw.links && typeof raw.links === 'object' ? raw.links : {};
  const links = {};
  Object.entries(rawLinks).forEach(([key,value]) => { const url=safeUrl(value); if(url!=='#') links[key]=url; });
  const rawMaterials = Array.isArray(raw.materials) ? raw.materials : raw.materials && typeof raw.materials === 'object' ? Object.values(raw.materials) : [];
  const materials = rawMaterials.filter(item=>item&&typeof item==='object').map((item,index)=>({
   id:String(item.id || `material-${index+1}`),
   title:String(item.title || '').trim().slice(0,60),
   description:String(item.description || '').trim().slice(0,180),
   icon:icons.includes(item.icon)?item.icon:'folder',
   url:item.url && safeUrl(item.url)!=='#' ? safeUrl(item.url) : ''
  })).filter(item=>item.title && item.description);
  return {links,materials};
 };
 window.escapeAdminText = safeText;
 window.safeAdminUrl = safeUrl;
 const STORAGE='dlh-admin-data-v1';
 let data={links:{},materials:[]}, database=null, auth=null, functionsClient=null, currentUser=null, selectedIcon='folder', editingMaterialId=null;
 try { data=normalizeData(JSON.parse(localStorage.getItem(STORAGE)||'{}')); } catch {}
 window.HUB_ADMIN_DATA=data;
 const status=$('#firebase-status');
 const materialForm=$('#new-material-form');
 const submitMaterialButton=materialForm.querySelector('[type="submit"]');
 const cancelEditButton=$('#cancel-edit-material');
 function say(message,kind=''){ if(status){status.textContent=message;status.dataset.state=kind;} }
 function saveLocal(){ try{localStorage.setItem(STORAGE,JSON.stringify(data));}catch{} }
 function renderCustomTabs(){
  const group=$('.resource-tabs'); if(!group)return;
  group.querySelectorAll('[data-custom-tab]').forEach(node=>node.remove());
  data.materials.forEach(material=>{
   const button=document.createElement('button');
   button.type='button'; button.className='chip'; button.dataset.resource=material.id; button.dataset.customTab='true';
   button.innerHTML=`${window.hubIcon(material.icon||'folder')}<span class="chip-label">${safeText(material.title)}</span>`;
   group.append(button);
  });
 }
 function renderLinkFields(){
  $('#link-settings-list').innerHTML=linkFields.map(([id,label])=>`<label class="admin-link-field"><span>${safeText(label)}</span><input type="url" data-link-id="${id}" value="${safeText(data.links[id]||'')}" placeholder="https://..." inputmode="url"></label>`).join('');
 }
 function renderIcons(){
  $('#icon-picker').innerHTML=icons.map(name=>`<button type="button" class="icon-choice ${name===selectedIcon?'selected':''}" data-icon-choice="${name}" aria-label="Ikon ${name}" aria-pressed="${name===selectedIcon}">${window.hubIcon(name)}</button>`).join('');
 }
 function renderMaterialList(){
  const host=$('#custom-material-list');
  host.innerHTML=data.materials.length?`<h3>Tab bahan yang telah ditambah</h3>${data.materials.map((material,index)=>`<div class="custom-material-row"><span>${window.hubIcon(material.icon||'folder')}</span><div><strong>${safeText(material.title)}</strong><small>${safeText(material.description)}</small>${material.url?`<small class="admin-material-url">${safeText(material.url)}</small>`:''}</div><div class="custom-material-actions"><button type="button" class="admin-edit-material" data-edit-material="${index}" aria-label="Edit ${safeText(material.title)}" title="Edit">${window.hubIcon('edit')}</button><button type="button" class="admin-delete-material" data-remove-material="${index}" aria-label="Padam ${safeText(material.title)}" title="Padam">${window.hubIcon('trash')}</button></div></div>`).join('')}`:'<p class="admin-empty">Belum ada tab tambahan.</p>';
 }
 function refresh(){
  renderCustomTabs();
  if(window.hubApplyAdminData)window.hubApplyAdminData();
  renderMaterialList();
 }
 function resetMaterialForm(){
  materialForm.reset(); editingMaterialId=null; selectedIcon='folder';
  submitMaterialButton.textContent='Tambah tab bahan'; cancelEditButton.hidden=true; renderIcons();
 }
 function editMaterial(index){
  const material=data.materials[index]; if(!material)return;
  editingMaterialId=material.id;
  materialForm.elements.title.value=material.title;
  materialForm.elements.description.value=material.description;
  materialForm.elements.url.value=material.url||'';
  selectedIcon=icons.includes(material.icon)?material.icon:'folder';
  submitMaterialButton.textContent='Simpan perubahan'; cancelEditButton.hidden=false;
  renderIcons(); materialForm.scrollIntoView({behavior:'smooth',block:'center'});
  materialForm.elements.title.focus({preventScroll:true});
 }
 async function persist(){
  saveLocal();
  refresh();
  if(!database){say('Disimpan pada peranti ini sahaja. Firebase belum dapat disambungkan.','local');return;}
  if(!currentUser){say('Perubahan disimpan pada peranti ini sahaja. Log masuk sebagai pentadbir untuk menyimpan ke Firebase.','error');return;}
  try {
   await database.ref('ekspresCilik').set(data);
   say('Berjaya disimpan dan disegerakkan ke Firebase Realtime Database.','success');
  } catch(error) {
   say('Tidak dapat menyimpan ke Firebase: '+error.message,'error');
  }
 }
 $('#save-links').addEventListener('click',async()=>{
  const next={...data.links};
  const inputs=[...document.querySelectorAll('[data-link-id]')];
  const invalid=inputs.find(input=>input.value.trim()&&safeUrl(input.value.trim())==='#');
  if(invalid){say('Pautan tidak sah. Sila gunakan alamat yang bermula dengan https:// atau http://.','error');invalid.focus();return;}
  inputs.forEach(input=>{const value=input.value.trim();if(value)next[input.dataset.linkId]=safeUrl(value);else delete next[input.dataset.linkId];});
  data.links=next; await persist();
 });
 materialForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=new FormData(materialForm);
  const title=String(form.get('title')||'').trim();
  const description=String(form.get('description')||'').trim();
  const rawUrl=String(form.get('url')||'').trim();
  if(!title||!description){say('Sila isi tajuk dan penerangan tab bahan.','error');return;}
  if(rawUrl&&safeUrl(rawUrl)==='#'){say('Pautan tidak sah. Gunakan alamat http:// atau https://.','error');materialForm.elements.url.focus();return;}
  const updated={title,description,icon:selectedIcon,url:rawUrl?safeUrl(rawUrl):''};
  if(editingMaterialId){
   const index=data.materials.findIndex(item=>item.id===editingMaterialId);
   if(index>=0)data.materials[index]={...data.materials[index],...updated};
  } else {
   data.materials.push({id:`material-${Date.now()}`, ...updated});
  }
  resetMaterialForm(); await persist();
 });
 cancelEditButton.addEventListener('click',resetMaterialForm);
 document.addEventListener('click',async event=>{
  const choice=event.target.closest('[data-icon-choice]');
  if(choice){selectedIcon=choice.dataset.iconChoice;renderIcons();return;}
  const edit=event.target.closest('[data-edit-material]');
  if(edit){editMaterial(Number(edit.dataset.editMaterial));return;}
  const remove=event.target.closest('[data-remove-material]');
  if(remove){
   const index=Number(remove.dataset.removeMaterial); const material=data.materials[index];
   if(!material||!window.confirm(`Padam tab "${material.title}"?`))return;
   data.materials.splice(index,1);
   if(editingMaterialId===material.id)resetMaterialForm();
   await persist();
  }
 });
 renderLinkFields(); renderIcons(); renderMaterialList(); refresh();
 function initFirebase(){
  const config=window.FIREBASE_CONFIG;
  const pinForm=$('#firebase-pin-login');
  const logoutButton=$('#firebase-logout');
  if(!config||!config.apiKey||!config.databaseURL||!window.firebase||!firebase.functions){
   pinForm.hidden=true;
   logoutButton.hidden=true;
   say('Mod tempatan aktif. Semak konfigurasi Firebase dan sambungan internet untuk mengaktifkan sync.','local');
   return;
  }
  try{
   if(!firebase.apps.length)firebase.initializeApp(config);
   database=firebase.database();
   auth=firebase.auth();
   functionsClient=firebase.app().functions('asia-southeast1');
   database.ref('ekspresCilik').on('value',snapshot=>{
    const remote=snapshot.val();
    if(remote&&typeof remote==='object'){
     data=normalizeData(remote); window.HUB_ADMIN_DATA=data; saveLocal(); renderLinkFields(); refresh();
     say('Kandungan disegerakkan daripada Firebase Realtime Database.','success');
    } else {
     say('Firebase berjaya disambungkan. Masukkan PIN pentadbir untuk mula mengurus kandungan.','local');
    }
   },error=>say('Tidak dapat membaca Firebase: '+error.message,'error'));
   pinForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const pinInput=pinForm.elements.pin;
    const pin=String(pinInput.value||'').trim();
    if(!/^\d{4,12}$/.test(pin)){
     say('PIN mesti mengandungi 4 hingga 12 digit.','error');
     pinInput.focus();
     return;
    }
    const submitButton=pinForm.querySelector('[type="submit"]');
    submitButton.disabled=true;
    submitButton.textContent='Menyemak...';
    try{
     const verifyPin=functionsClient.httpsCallable('verifyAdminPin');
     const result=await verifyPin({pin});
     if(!result.data||!result.data.token)throw new Error('Token akses tidak diterima daripada Firebase.');
     await auth.signInWithCustomToken(result.data.token);
     pinInput.value='';
    }catch(error){
     pinInput.value='';
     const message=error&&error.message?error.message:'Ralat tidak diketahui.';
     say('PIN tidak dapat disahkan: '+message,'error');
    }finally{
     submitButton.disabled=false;
     submitButton.textContent='Masuk';
    }
   });
   logoutButton.addEventListener('click',async()=>{
    try{await auth.signOut();}catch(error){say('Tidak dapat log keluar: '+error.message,'error');}
   });
   auth.onAuthStateChanged(async user=>{
    if(!user){
     currentUser=null;
     pinForm.hidden=false;
     logoutButton.hidden=true;
     say('Firebase disambungkan. Masukkan PIN pentadbir untuk mengubah dan menyimpan tetapan.','local');
     return;
    }
    try{
     const tokenInfo=await user.getIdTokenResult(true);
     if(user.uid!=='ekspres-admin'||tokenInfo.claims.admin!==true){
      currentUser=null;
      await auth.signOut();
      say('Akses pentadbir tidak sah.','error');
      return;
     }
     currentUser=user;
     pinForm.hidden=true;
     logoutButton.hidden=false;
     say('Akses pentadbir dibuka. Perubahan boleh disimpan ke Firebase.','success');
    }catch(error){
     currentUser=null;
     pinForm.hidden=false;
     logoutButton.hidden=true;
     say('Tidak dapat mengesahkan akses pentadbir: '+error.message,'error');
    }
   });
  }catch(error){
   pinForm.hidden=true;
   say('Ralat konfigurasi Firebase: '+error.message,'error');
  }
 }
 initFirebase();
 window.hubAdminReload=refresh;
})();

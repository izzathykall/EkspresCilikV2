const $=s=>document.querySelector(s);
const icon=window.hubIcon;
/* Pautan boleh diubah: nilai asal di bawah ditimpa oleh pautan dalam Firebase (ekspresCilik/links). */
const LINK_CACHE='dlh-links-v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=v=>{try{const u=new URL(String(v||'').trim());return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
const sanitizeLinks=raw=>{const out={};if(raw&&typeof raw==='object')for(const [k,v] of Object.entries(raw)){const u=safeUrl(v);if(u)out[k]=u}return out};
let linkOverrides={};
try{linkOverrides=sanitizeLinks(JSON.parse(localStorage.getItem(LINK_CACHE)||'{}'))}catch{}
const linkFor=(id,fallback='')=>linkOverrides[id]||fallback||'';
const courses=[
 {id:'tekno',code:'EDUP6023',en:'Technology',title:'Teknologi untuk Pengajaran dan Pembelajaran',desc:'Kursus utama: nota, tutorial, tugasan dan projek digital.',pet:'nana',scene:'scene-read',num:'01',rows:[['book','Nota Pembelajaran','notes-tekno'],['clipboard','Tutorial Minggu 1, 2, 3 dan seterusnya','tutorials'],['folder','Tugasan dan Projek','page:projek'],['video','Video Pembelajaran','videos'],['gallery','Galeri Hasil Kerja','page:galeri']]},
 {id:'sejarah',code:'EDUP6013',en:'History of education',title:'Sejarah Pendidikan di Malaysia',desc:'Kenali perjalanan pendidikan dan kisah di sebaliknya.',pet:'didi',scene:'scene-tech',num:'02',rows:[['book','Nota Pembelajaran','notes-sejarah'],['folder','Tugasan KPPB','kppb-sejarah'],['mic','Audio Temu Bual','interview']]},
 {id:'english',code:'MPU6122',en:'English language',title:'English Language Proficiency',desc:'Explore, express and grow your confidence in English.',pet:'jojo',scene:'scene-art',num:'03',rows:[['book','Learning Notes','notes-english'],['folder','KPPB Assignments','kppb-english'],['video','Movie Review','movie']]}
];
const resources=[
 {id:'intro',title:'Video Pengenalan',desc:'Kenali pembelajaran digital melalui video intro.',icon:'video',tag:'Video · Teknologi',group:'tekno',url:'https://drive.google.com/file/d/18nhTUSDEzggWSfwlYa3z-1Y-UMchM9gh/view?usp=sharing'},
 {id:'tutorial2',title:'Tutorial Minggu 2',desc:'Bahan tutorial kursus Teknologi untuk Pengajaran dan Pembelajaran.',icon:'clipboard',tag:'Tutorial · EDUP6023',group:'tekno',url:'https://drive.google.com/file/d/16RJcHPJBuI_FVUzDzBrOvqanGIjP8AkR/view?usp=drive_link'},
 {id:'podcast',title:'Podcast Pembelajaran',desc:'Pasang telinga dan terokai perkongsian dalam bentuk audio.',icon:'headphones',tag:'Podcast · Teknologi',group:'tekno',url:'https://www.youtube.com/watch?v=fvmf6XZR3wU&authuser=0'},
 {id:'reels',title:'Reels Pembelajaran',desc:'Perkongsian video pendek untuk diterokai.',icon:'video',tag:'YouTube Shorts · Teknologi',group:'tekno',url:'https://youtube.com/shorts/z7xvbJnaOXA?feature=share&authuser=0'},
 {id:'interview',title:'Audio Temu Bual Sejarah',desc:'Imbas kod QR atau buka pautan untuk mengakses audio temu bual Sejarah.',icon:'mic',tag:'Audio · EDUP6013',group:'kppb',qr:'qr-dokumen-01.svg',url:'https://q.me-qr.com/t83qn6ps'},
 {id:'movie',title:'English Movie Review',desc:'Imbas kod QR atau buka pautan untuk mengakses English Movie Review.',icon:'film',tag:'Movie Review · MPU6122',group:'kppb',qr:'qr-dokumen-02.svg',url:'https://q.me-qr.com/skfboiwj'}
];
const projects=[
 {id:'animation',title:'Video Animasi',desc:'Ruang untuk video animasi projek. Pautan video belum disertakan dalam dokumen.',icon:'film',tag:'Video Animasi'},
 {id:'learning',title:'Ruang Pembelajaran',desc:'Terokai laman asal Ekspres Cilik untuk aktiviti pembelajaran interaktif.',icon:'bus',tag:'Ruang Pembelajaran',url:'https://izzathykall.github.io/EkspresCilik/'}
];
function courseCard(c,full=false){return `<article class="course-card ${c.id}"><${full?'div':`a href="#portfolio" data-course="${c.id}"`} class="course-art" ${full?'':`aria-label="Terokai ${c.title}"`}><span class="course-code">${c.code}</span>${icon('sparkle','art-star')}<svg class="course-scene" viewBox="0 0 320 280" aria-hidden="true"><use href="#${c.scene}"/></svg></${full?'div':'a'}><div class="course-content"><small>${c.en}</small><h3>${c.title}</h3><p>${c.desc}</p>${full?`<div class="course-rows">${c.rows.map(r=>`<button class="course-row" data-open="${r[2]}"${r[2].startsWith('page:')?'':` data-edit-id="baris-${c.id}-${r[2]}" data-edit-label="${esc(c.code+' · '+r[1])}"`}><span class="row-icon" aria-hidden="true">${icon(r[0])}</span>${r[1]}<span class="row-arrow" aria-hidden="true">${icon('external')}</span></button>`).join('')}</div>`:`<a href="#portfolio" data-course="${c.id}" class="card-bottom">Terokai kursus <span class="arrow" aria-hidden="true">${icon('external')}</span></a>`}</div></article>`}

// Give each portfolio illustration its own animation state.
const portfolioMotion = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
 for (const entry of entries) {
  entry.target.classList.toggle('scene-visible', entry.isIntersecting);
 }
}) : null;

function observePortfolioScenes() {
 if (!portfolioMotion) return;
 portfolioMotion.disconnect();
 for (const scene of document.querySelectorAll('#portfolio .section-art svg, #portfolio .course-scene')) {
  if (!scene.classList.contains('observed-scene')) {
   const reference = scene.firstElementChild.getAttribute('href');
   const template = document.getElementById(reference.slice(1));
   scene.replaceChildren(...Array.from(template.children, child => child.cloneNode(true)));
   scene.classList.add('observed-scene');
  }
  portfolioMotion.observe(scene);
 }
}

let courseFilter='all';
function filterCourses(id){courseFilter=id;$('#portfolio-courses').innerHTML=courses.filter(c=>id==='all'||c.id===id).map(c=>courseCard(c,true)).join('');document.querySelectorAll('[data-filter]').forEach(b=>{const yes=b.dataset.filter===id;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes)});observePortfolioScenes()}
filterCourses('all');
function resourceCard(r,prefix){const key=prefix+'-'+r.id,url=linkFor(key,r.url),custom=Boolean(linkOverrides[key]),qr=r.qr&&!custom?r.qr:'';return `<article class="resource-card ${qr?'has-resource-qr':''}" data-edit-id="${key}" data-edit-label="${esc((prefix==='projek'?'Tugasan & Projek · ':'Rak bahan · ')+r.title)}"><button type="button" class="edit-handle${custom?' is-custom':''}" data-edit-id="${key}" data-edit-label="${esc((prefix==='projek'?'Tugasan & Projek · ':'Rak bahan · ')+r.title)}" aria-label="Edit pautan ${esc(r.title)}" title="Edit pautan">${icon('edit')}</button><span class="resource-icon" aria-hidden="true">${icon(r.icon)}</span><small>${r.tag}</small><h3>${r.title}</h3><p>${r.desc}</p>${qr?`<figure class="resource-qr"><img src="${qr}" width="190" height="190" alt="Kod QR untuk ${r.title}"><figcaption>Imbas untuk membuka bahan</figcaption></figure>`:''}${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Buka ${r.title}">${r.qr?'Buka bahan':r.id==='learning'?'Buka ruang pembelajaran':r.id==='interview'?'Buka audio temu bual':r.id==='movie'?'Buka movie review':r.id==='podcast'?'Buka podcast':'Buka bahan'} ${icon('external')}<span class="sr-only"> (tab baharu)</span></a>`:'<span class="unavailable">Pautan belum disertakan</span>'}</article>`}

$('#project-list').innerHTML=projects.map(r=>resourceCard(r,'projek')).join('');
let resourceGroup='all';
function renderResources(){
 const q=$('#search').value.toLocaleLowerCase('ms');
 const result=resources.filter(r=>(resourceGroup==='all'||r.group===resourceGroup)&&`${r.title} ${r.desc} ${r.tag}`.toLocaleLowerCase('ms').includes(q));
 $('#resource-list').innerHTML=['tekno','kppb'].map(group=>{
  const items=result.filter(r=>r.group===group);
  return items.length?`<section class="folder-section" aria-labelledby="folder-${group}"><div class="folder-heading"><span class="folder-icon">${icon('folder')}</span><div><h2 id="folder-${group}">${group==='tekno'?'Folder Teknologi':'Folder KPPB'}</h2><p>${group==='tekno'?'EDUP6023 · Video intro, tutorial, podcast dan Reels':'Sejarah & English · Audio temu bual dan movie review'}</p></div></div><div class="resource-grid">${items.map(r=>resourceCard(r,'bahan')).join('')}</div></section>`:'';
 }).join('');
 $('#no-results').hidden=result.length>0;
}
renderResources();$('#search').addEventListener('input',renderResources);
const pages=[['pengenalan','Pengenalan'],['portfolio','My Learning Portfolio'],['projek','Tugasan dan Projek'],['kuiz','Uji Kefahaman'],['galeri','Galeri Hasil Kerja'],['bahan','Folder Bahan Pembelajaran'],['penutup','Penutup']];
// Match both label sizes to the space available after the arrow and padding.
function fitFlowLabels(){
 const nav=$('.flow-nav');
 if(!nav)return;
 nav.style.removeProperty('--flow-label-size');
 const labels=[...nav.querySelectorAll('a')].filter(a=>!a.hidden).map(a=>a.querySelector('span')).filter(Boolean);
 if(!labels.length)return;
 const base=parseFloat(getComputedStyle(labels[0]).fontSize);
 const ratio=Math.min(1,...labels.filter(label=>label.clientWidth>0&&label.scrollWidth>0).map(label=>label.clientWidth/label.scrollWidth));
 if(ratio<1)nav.style.setProperty('--flow-label-size',`${Math.max(1,Math.floor((base*ratio-.15)*10)/10)}px`);
}
function fitFilterLabels(){
 document.querySelectorAll('.course-filters,.resource-tabs').forEach(group=>{
  if(!group.clientWidth)return;
  group.style.removeProperty('--filter-label-size');
  const chips=[...group.querySelectorAll('.chip')];
  const labels=chips.map(chip=>chip.querySelector('.chip-label')).filter(Boolean);
  if(!labels.length)return;
  let size=parseFloat(getComputedStyle(chips[0]).fontSize);
  // Re-measure after each size change because the flexible button widths change too.
  while(size>8&&labels.some(label=>label.scrollWidth>label.clientWidth+.25)){
   size=Math.max(8,size-.25);
   group.style.setProperty('--filter-label-size',`${size}px`);
  }
 });
}
function fitPageControls(){fitFlowLabels();fitFilterLabels()}
function showPage(){
 const id=location.hash.slice(1)||'pengenalan';const index=Math.max(0,pages.findIndex(p=>p[0]===id));const [valid,title]=pages[index];
 document.querySelectorAll('.page').forEach(p=>{p.hidden=p.id!==valid;p.classList.toggle('active',p.id===valid)});
 document.querySelectorAll('[data-page]').forEach(a=>{const yes=a.dataset.page===valid;a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 document.title=`${title} · Digital Learning Hub`;
 $('.nav-inner').classList.remove('expanded');$('.menu-toggle').setAttribute('aria-expanded','false');
 $('#flow-previous').hidden=index===0;
 if(index>0){$('#flow-previous').href=`#${pages[index-1][0]}`;$('#flow-previous').innerHTML=`${icon('left')}<span>${pages[index-1][1]}</span>`;$('#flow-previous').setAttribute('aria-label',`Sebelumnya: ${pages[index-1][1]}`)}
 const next=pages[(index+1)%pages.length];$('#flow-next').href=`#${next[0]}`;$('#flow-next').innerHTML=`<span>${next[1]}</span>${icon('right')}`;$('#flow-next').setAttribute('aria-label',`Seterusnya: ${next[1]}`);
 applyStaticLinks();
 requestAnimationFrame(fitPageControls);
 if(location.hash){window.scrollTo({top:0,behavior:'instant'});$('#kandungan').focus({preventScroll:true})}
}
window.addEventListener('hashchange',showPage);showPage();
// Mobile browser bars can resize the viewport height throughout a scroll.
let lastLayoutWidth = document.documentElement.clientWidth;
let pendingLayout = 0;
window.addEventListener('resize', () => {
 const width = document.documentElement.clientWidth;
 if (width === lastLayoutWidth) return;
 lastLayoutWidth = width;
 cancelAnimationFrame(pendingLayout);
 pendingLayout = requestAnimationFrame(fitPageControls);
});
if(document.fonts)document.fonts.ready.then(fitPageControls);
document.addEventListener('click',event=>{if(event.target.closest('[data-filter],[data-resource]'))requestAnimationFrame(fitFilterLabels)});
$('.menu-toggle').addEventListener('click',()=>{const expanded=$('.nav-inner').classList.toggle('expanded');$('.menu-toggle').setAttribute('aria-expanded',expanded)});
document.addEventListener('click',e=>{const course=e.target.closest('[data-course]');if(course)filterCourses(course.dataset.course);const filter=e.target.closest('[data-filter]');if(filter)filterCourses(filter.dataset.filter);const tab=e.target.closest('[data-resource]');if(tab){resourceGroup=tab.dataset.resource;document.querySelectorAll('[data-resource]').forEach(b=>{const yes=b===tab;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes)});renderResources()}const open=e.target.closest('[data-open]');if(open){const direct=linkOverrides[open.dataset.editId];if(direct)window.open(direct,'_blank','noopener,noreferrer');else openResource(open.dataset.open)}});
const fullContent=window.HUB_CONTENT||{};
for(const [key,selector] of [['intro','#intro-full'],['portfolio','#portfolio-full'],['closing','#closing-full']]){$(selector).innerHTML=(fullContent[key]||[]).map(p=>`<p>${p}</p>`).join('')}
const dialog=$('#resource-dialog');
const collections={
 'notes-tekno':{title:'Nota Pembelajaran',label:'EDUP6023 · TEKNOLOGI',icon:'book',text:'Koleksi nota bagi kursus Teknologi untuk Pengajaran dan Pembelajaran.',missing:'Fail atau pautan nota belum disertakan dalam dokumen.'},
 'notes-sejarah':{title:'Nota Pembelajaran',label:'EDUP6013 · SEJARAH',icon:'book',text:'Koleksi nota bagi kursus Sejarah Pendidikan di Malaysia.',missing:'Fail atau pautan nota belum disertakan dalam dokumen.'},
 'notes-english':{title:'Learning Notes',label:'MPU6122 · ENGLISH',icon:'book',text:'A space for English Language Proficiency learning notes.',missing:'The document does not include links to learning notes yet.'},
 tutorials:{title:'Tutorial Mingguan',label:'EDUP6023 · TEKNOLOGI',icon:'clipboard',text:'Bahan tutorial disusun mengikut minggu untuk memudahkan rujukan.',items:['tutorial2'],missing:'Pautan Minggu 1, Minggu 3 dan minggu seterusnya belum disertakan.'},
 videos:{title:'Video Pembelajaran',label:'EDUP6023 · TEKNOLOGI',icon:'video',text:'Tonton dan dengar bahan pembelajaran berikut.',items:['intro','reels','podcast']},
 'kppb-sejarah':{title:'Tugasan KPPB Sejarah',label:'EDUP6013 · KPPB',icon:'mic',text:'Dokumentasi hasil kerja kursus Sejarah Pendidikan di Malaysia.',items:['interview']},
 'kppb-english':{title:'KPPB Assignments',label:'MPU6122 · KPPB',icon:'film',text:'A collection of work for English Language Proficiency.',items:['movie']}
};
function openResource(id){if(id.startsWith('page:')){location.hash=id.slice(5);return}let info=collections[id];if(!info){const r=resources.find(r=>r.id===id);if(r)info={title:r.title,label:r.tag,icon:r.icon,text:r.desc,items:linkFor('bahan-'+r.id,r.url)?[r.id]:[],missing:linkFor('bahan-'+r.id,r.url)?'':'Pautan bahan belum disertakan.'}}if(!info)return;$('#dialog-icon').innerHTML=icon(info.icon);$('#dialog-label').textContent=info.label;$('#dialog-title').textContent=info.title;$('#dialog-body').innerHTML=`<p>${info.text}</p>${info.missing?`<div class="empty-state">${icon('leaf')} ${info.missing}</div>`:''}`;$('#dialog-actions').innerHTML=(info.items||[]).map(id=>resources.find(r=>r.id===id)).filter(r=>r&&linkFor('bahan-'+r.id,r.url)).map(r=>`<a class="button primary" href="${esc(linkFor('bahan-'+r.id,r.url))}" target="_blank" rel="noopener noreferrer">${icon(r.icon)} ${r.title} <span>${icon('external')}</span></a>`).join('');dialog.showModal()}
$('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});

/* Keep decorative motion in step with system and page visibility. */
(() => {
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
 const update=()=>{document.documentElement.dataset.motionPaused=String(preference.matches||document.hidden)};
 preference.addEventListener('change',update);
 document.addEventListener('visibilitychange',update);
 update();
})();

/* API untuk hub-links.js: terima pautan terkini (Firebase) dan lukis semula bahagian berkaitan. */
function applyStaticLinks(){document.querySelectorAll('a[data-static-link]').forEach(a=>{
 if(a.dataset.defaultHref===undefined){a.dataset.defaultHref=a.getAttribute('href')||'';a.dataset.defaultTarget=a.getAttribute('target')||''}
 const url=linkOverrides[a.dataset.editId];
 if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer'}
 else{a.setAttribute('href',a.dataset.defaultHref);if(a.dataset.defaultTarget)a.target=a.dataset.defaultTarget;else a.removeAttribute('target')}
})}
applyStaticLinks();
window.hubSetLinks=raw=>{
 linkOverrides=sanitizeLinks(raw);
 try{localStorage.setItem(LINK_CACHE,JSON.stringify(linkOverrides))}catch{}
 $('#project-list').innerHTML=projects.map(r=>resourceCard(r,'projek')).join('');
 renderResources();filterCourses(courseFilter);applyStaticLinks();
 requestAnimationFrame(fitPageControls);
};
window.hubLinkInfo=id=>{
 let fallback='';
 const card=id.match(/^(bahan|projek)-(.+)$/);
 if(card){const r=(card[1]==='bahan'?resources:projects).find(x=>x.id===card[2]);fallback=r&&r.url||''}
 else{const a=document.querySelector(`a[data-edit-id="${id}"]`);if(a)fallback=a.dataset.defaultHref||''}
 if(fallback.startsWith('#')||/^baris-[a-z]+-page-/.test(id))fallback='(halaman dalam laman ini)';
 return{custom:linkOverrides[id]||'',fallback};
};

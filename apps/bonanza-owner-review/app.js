'use strict';
const CFG=window.REVIEW_CONFIG||{};
const BASE=CFG.supabaseUrl,KEY=CFG.publishableKey,OWNER=CFG.ownerEmail||'manager.feya@gmail.com';
const TABLE='feya_bonanza_owner_review_drafts_v1',SESS_KEY='thefeya_bonanza_session_v2',CACHE_KEY='thefeya_bonanza_drafts_v2';
const COLORS=[
['gold','Золотой',['#d8ae58']],['silver','Серебряный',['#b9c6cc']],['black','Чёрный',['#181c22']],['white','Белый',['#fff']],['brown','Коричневый',['#9b694d']],['green','Зелёный',['#378763']],['pink','Розовый',['#ed87ba']],
['black_white','Чёрно-белый',['#181c22','#fff']],['black_gold','Чёрно-золотой',['#181c22','#d8ae58']],['black_silver','Чёрно-серебряный',['#181c22','#b9c6cc']],
['white_gold','Бело-золотой',['#fff','#d8ae58']],['white_silver','Бело-серебряный',['#fff','#b9c6cc']],['gold_silver','Золотой + серебряный',['#d8ae58','#b9c6cc']],
['gold_silver_black','Чёрный + золотой + серебряный',['#181c22','#d8ae58','#b9c6cc']],['white_gold_silver','Белый + золотой + серебряный',['#fff','#d8ae58','#b9c6cc']],
['as_pictured','Только как на фото',['#eee','#969c9a']]
];
const MATERIALS=[['vegan_leather','Веганская кожа'],['mirror_vegan_leather','Зеркальная веганская кожа'],['genuine_leather','Натуральная кожа'],['mirror_acrylic','Зеркальный акрил'],['plastic','Пластик'],['stretch_fabric','Эластичная ткань'],['fabric','Ткань'],['patent','Лаковый материал'],['chain','Цепи'],['holographic','Голографический материал'],['other','Другой материал']];
const AUDIENCES=[['women','Женский'],['men','Мужской'],['unisex','Унисекс'],['couples','Парный']];
const CSET=new Set(COLORS.map(x=>x[0])),MSET=new Set(MATERIALS.map(x=>x[0])),ASET=new Set(AUDIENCES.map(x=>x[0]));
const $=x=>document.querySelector(x),$$=x=>Array.from(document.querySelectorAll(x));
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=(list,id)=>((list.find(x=>x[0]===id)||[])[1]||id);
const empty=()=>({colors:[],materials:[],audience:'',confirmed:{colors:false,materials:false,audience:false},customOnRequest:false,hold:false,comment:'',updatedAt:''});
function clean(obj){
 const x=Object.assign(empty(),obj&&typeof obj==='object'?obj:{});
 x.colors=Array.isArray(x.colors)?Array.from(new Set(x.colors.filter(z=>CSET.has(z)))):[];
 x.materials=Array.isArray(x.materials)?Array.from(new Set(x.materials.filter(z=>MSET.has(z)))):[];
 x.audience=ASET.has(x.audience)?x.audience:'';
 x.confirmed={colors:!!(x.confirmed&&x.confirmed.colors),materials:!!(x.confirmed&&x.confirmed.materials),audience:!!(x.confirmed&&x.confirmed.audience)};
 x.customOnRequest=!!x.customOnRequest;x.hold=!!x.hold;x.comment=String(x.comment||'').slice(0,1500);x.updatedAt=String(x.updatedAt||'');
 return x;
}
let catalog=null,all=[],byId=new Map(),decisions={},selected=new Set(),filtered=[],page=1,perPage=30;
let session=null,user=null,dirty=new Set(),saveTimer=null,saving=false,active=null,activePhoto=0,toastTimer=null;
const get=id=>decisions[id]||empty();
const editable=id=>decisions[id]||(decisions[id]=empty());
function missing(d,k){return k==='colors'?(!d.confirmed.colors||(!d.colors.length&&!d.customOnRequest)):k==='materials'?(!d.confirmed.materials||!d.materials.length):(!d.confirmed.audience||!ASET.has(d.audience))}
function isReady(d){return !d.hold&&!missing(d,'colors')&&!missing(d,'materials')&&!missing(d,'audience')}
function status(d){if(d.hold)return 'hold';if(isReady(d))return 'ready';if(d.updatedAt||d.colors.length||d.materials.length||d.audience||d.comment)return 'partial';return 'untouched'}
const statusNames={hold:'Отложено',ready:'Готово',partial:'Частично',untouched:'Не проверено'};
function toast(x){$('#toast').textContent=x;$('#toast').classList.add('open');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('open'),3200)}
function cloud(s,err){$('#cloudStatus').textContent=s;$('#cloudStatus').classList.toggle('error',!!err)}
function storeSession(r){session={access_token:r.access_token,refresh_token:r.refresh_token,expires_at:Date.now()+Number(r.expires_in||3600)*1000};user=r.user||user;localStorage.setItem(SESS_KEY,JSON.stringify({session,user}))}
async function refresh(){
 if(!session||!session.refresh_token)throw Error('Повторно войди в кабинет');
 const r=await api('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},false,false);
 storeSession(r);
}
async function api(path,method,body,authenticated,retry){
 const auth=authenticated!==false;
 if(auth){if(!session||!session.access_token)throw Error('Требуется вход');if(Date.now()>session.expires_at-45000)await refresh()}
 const h={'apikey':KEY,'Content-Type':'application/json'};
 if(auth)h.Authorization='Bearer '+session.access_token;
 const res=await fetch(BASE+path,{method:method||'GET',headers:h,body:body==null?undefined:JSON.stringify(body),cache:'no-store'});
 if(res.status===401&&auth&&retry!==false&&session&&session.refresh_token){await refresh();return api(path,method,body,true,false)}
 const text=await res.text();let obj;try{obj=JSON.parse(text)}catch(e){obj={message:text}}
 if(!res.ok)throw Error(obj.msg||obj.message||obj.error_description||('HTTP '+res.status));
 return obj;
}
function loginView(err){$('#loginView').classList.remove('hidden');$('#appView').classList.add('hidden');$('#loginError').textContent=err||'';$('#loginError').classList.toggle('hidden',!err)}
async function openApp(){
 const u=await api('/auth/v1/user');if(u.email!==OWNER)throw Error('Доступ разрешён только '+OWNER);
 user=u;$('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
 if(!catalog)await loadCatalog();
 await loadCloud();render();
}
async function signin(ev){
 ev.preventDefault();$('#loginButton').disabled=true;$('#loginButton').textContent='Подключение…';
 try{
  const r=await api('/auth/v1/token?grant_type=password','POST',{email:OWNER,password:$('#loginPassword').value},false,false);
  if(!r.access_token)throw Error('Сессия не получена');
  storeSession(r);$('#loginPassword').value='';await openApp();
 }catch(e){loginView('Не удалось войти: '+e.message)}
 finally{$('#loginButton').disabled=false;$('#loginButton').textContent='Войти в рабочий кабинет'}
}
function local(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}');return {decisions:x.decisions||{},dirty:new Set(x.dirty||[])}}catch(e){return {decisions:{},dirty:new Set()}}}
function backupLocal(){try{localStorage.setItem(CACHE_KEY,JSON.stringify({decisions,dirty:Array.from(dirty)}))}catch(e){cloud('Локальное сохранение недоступно — скачай резервную копию',true)}}
async function loadCloud(){
 cloud('Загружаю изменения из Supabase…');
 const rows=await api('/rest/v1/'+TABLE+'?select=canonical_product_id,owner_decision,updated_at&limit=500');
 const remote={};rows.forEach(row=>{if(byId.has(row.canonical_product_id))remote[row.canonical_product_id]=clean(row.owner_decision)});
 const l=local();decisions=remote;dirty=new Set();
 for(const id of l.dirty){if(byId.has(id)&&l.decisions[id]){decisions[id]=clean(l.decisions[id]);dirty.add(id)}}
 backupLocal();cloud('Подключено · '+Object.keys(remote).length+' записей в базе');
 if(dirty.size)scheduleSave(200);
}
function touch(id){const d=editable(id);d.updatedAt=new Date().toISOString();decisions[id]=clean(d);dirty.add(id);backupLocal();cloud('Ожидает сохранения: '+dirty.size);scheduleSave(600)}
function scheduleSave(delay){clearTimeout(saveTimer);saveTimer=setTimeout(flush,delay||700)}
async function flush(){
 if(saving||!dirty.size)return;
 saving=true;cloud('Сохраняю в Supabase…');
 try{
  while(dirty.size){
   const ids=Array.from(dirty).slice(0,25),snap=ids.map(id=>JSON.stringify(clean(decisions[id])));
   const rows=ids.map(id=>({canonical_product_id:id,owner_user_id:user.id,owner_decision:clean(decisions[id])}));
   await api('/rest/v1/'+TABLE+'?on_conflict=canonical_product_id','POST',rows);
   ids.forEach((id,i)=>{if(JSON.stringify(clean(decisions[id]))===snap[i])dirty.delete(id)});
   backupLocal();
  }
  cloud('Сохранено в Supabase ✓');
 }catch(e){cloud('Ошибка облака: '+e.message,true);toast('Ошибка облака. Резервная копия остаётся в браузере.')}
 finally{saving=false}
}
async function loadCatalog(){
 const r=await fetch(CFG.catalogUrl||'/catalog.json',{cache:'no-store'});if(!r.ok)throw Error('Каталог не загрузился (HTTP '+r.status+')');
 catalog=await r.json();
 if(catalog.product_count!==207||catalog.variant_count!==856||catalog.products.length!==207)throw Error('Количество товаров изменилось: проверка остановлена');
 all=catalog.products;byId=new Map(all.map(x=>[x.id,x]));
 initChoices();
}
function tint(hex){let s=[];hex.forEach((v,i)=>s.push(v+' '+Math.floor(i*100/hex.length)+'%,'+v+' '+Math.floor((i+1)*100/hex.length)+'%'));return 'linear-gradient(120deg,'+s.join(',')+')'}
function pill(x,group,checked){
 const id=x[0],name=x[1],square=group==='colors'||group==='one-color';
 const sw=square?'<i class="swatch" style="background:'+tint(x[2])+'"></i>':'';
 const cls=group==='one-color'?'one-color':group==='one-material'?'one-material':group==='one-audience'?'one-audience':group==='audience'?'bulk-audience':'bulk-'+group;
 const type=group==='audience'||group==='one-audience'?'radio':'checkbox',radio=type==='radio'?' name="'+(group==='audience'?'audienceBulk':'audienceSingle')+'"':'';
 return '<label class="chip"><input class="'+cls+'" type="'+type+'" '+radio+' value="'+esc(id)+'" '+(checked?'checked':'')+'><span>'+sw+esc(name)+'</span></label>';
}
function initChoices(){
 $('#bulkColorChoices').innerHTML=COLORS.map(x=>pill(x,'colors',false)).join('');
 $('#bulkMaterialChoices').innerHTML=MATERIALS.map(x=>pill(x,'materials',false)).join('');
 $('#bulkAudiences').innerHTML=AUDIENCES.map(x=>pill(x,'audience',false)).join('');
 $('#colorFilter').insertAdjacentHTML('beforeend',COLORS.map(x=>'<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>').join(''));
 const groups=[...new Set(all.map(x=>x.group))].sort();
 const names={WOMEN_COSTUME:'Женские костюмы',MEN_COSTUME:'Мужские костюмы',COUPLES_REVIEW:'Парные костюмы',COSTUME_ACCESSORY:'Аксессуары',MASK_ACCESSORY:'Маски',BODYSUIT_CORSET_REVIEW:'Боди / корсеты',UNRESOLVED:'Требуют классификации'};
 $('#groupFilter').insertAdjacentHTML('beforeend',groups.map(g=>'<option value="'+esc(g)+'">'+esc(names[g]||g)+'</option>').join(''));
}
function updateStats(){
 let done=0,cm=0,mm=0,am=0;
 all.forEach(p=>{let d=get(p.id);if(isReady(d))done++;if(missing(d,'colors'))cm++;if(missing(d,'materials'))mm++;if(missing(d,'audience'))am++});
 $('#totalMetric').textContent=all.length;$('#doneMetric').textContent=done;$('#missingColorsMetric').textContent=cm;$('#missingMaterialsMetric').textContent=mm;$('#missingAudienceMetric').textContent=am;
 $('#doneProgress').style.width=(100*done/all.length)+'%';
}
function filter(){
 const text=$('#search').value.trim().toLowerCase(),st=$('#statusFilter').value,col=$('#colorFilter').value,aud=$('#audienceFilter').value,group=$('#groupFilter').value;
 filtered=all.filter(p=>{
 const d=get(p.id);
 if(text&&!(p.name+' '+p.etsy+' '+p.components.join(' ')+' '+p.material).toLowerCase().includes(text))return false;
 if(group!=='all'&&p.group!==group)return false;
 if(col==='missing'&&!missing(d,'colors'))return false;
 if(col!=='all'&&col!=='missing'&&!d.colors.includes(col))return false;
 if(aud==='missing'&&!missing(d,'audience'))return false;
 if(aud!=='all'&&aud!=='missing'&&d.audience!==aud)return false;
 if(st==='issues'&&!p.warning)return false;
 if(st==='untouched'&&status(d)!=='untouched')return false;
 if(st==='partial'&&status(d)!=='partial')return false;
 if(st==='ready'&&!isReady(d))return false;
 if(st==='hold'&&!d.hold)return false;
 if(st==='missing_colors'&&!missing(d,'colors'))return false;
 if(st==='missing_materials'&&!missing(d,'materials'))return false;
 if(st==='missing_audience'&&!missing(d,'audience'))return false;
 return true;
 });
 const sort=$('#sortFilter').value;if(sort==='title')filtered.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 if(sort==='missing')filtered.sort((a,b)=>Number(isReady(get(a.id)))-Number(isReady(get(b.id)))||a.index-b.index);
 page=Math.max(1,Math.min(page,Math.ceil(filtered.length/perPage)||1));
 $('#filteredCount').textContent=filtered.length+' товаров';
}
function cards(){
 const chunk=filtered.slice((page-1)*perPage,page*perPage),parts=[];
 for(const p of chunk){
  const d=get(p.id),st=status(d),prices=p.variants.map(v=>Number(v.price)),min=Math.min(...prices).toFixed(2),max=Math.max(...prices).toFixed(2);
  const tags=d.colors.slice(0,2).map(x=>'<span class="tag">'+esc(label(COLORS,x))+'</span>').concat(d.materials.slice(0,1).map(x=>'<span class="tag">'+esc(label(MATERIALS,x))+'</span>')).join('')||'<span class="tag red">Не проверены параметры</span>';
  parts.push('<article class="product '+(selected.has(p.id)?'selected':'')+'" data-id="'+esc(p.id)+'">'+
   '<div class="photo" data-open="'+esc(p.id)+'"><img loading="lazy" src="'+esc(p.images[0])+'" alt="'+esc(p.name)+'" onerror="this.style.objectFit=\'contain\'">'+
   '<label class="cardcheck" data-check="'+esc(p.id)+'" title="Отметить товар"><input class="selectcard" type="checkbox" data-select="'+esc(p.id)+'" '+(selected.has(p.id)?'checked':'')+' aria-label="Выбрать '+esc(p.name)+'"></label>'+
   '<span class="pill '+st+'">'+statusNames[st]+'</span></div>'+
   '<div class="productBody"><span class="mini">№ '+p.index+' · Etsy '+esc(p.etsy)+'</span><h3>'+esc(p.name)+'</h3>'+
   '<span class="price">$'+min+' – $'+max+'</span><div class="tags">'+tags+'</div>'+
   '<div class="checks"><i class="'+(!missing(d,'colors')?'yes':'')+'"></i><i class="'+(!missing(d,'materials')?'yes':'')+'"></i><i class="'+(!missing(d,'audience')?'yes':'')+'"></i></div>'+
   '<div class="productFoot"><span class="mini">'+p.variants.length+' вар. '+(p.warning?'⚠':'')+'</span><button data-open="'+esc(p.id)+'">Подробнее →</button></div></div></article>');
 }
 $('#grid').innerHTML=parts.join('')||'<div class="hintline">Под эти фильтры ничего не найдено.</div>';
 const pages=Math.max(1,Math.ceil(filtered.length/perPage));$('#pageText').textContent=page+' / '+pages;$('#prevPage').disabled=page<=1;$('#nextPage').disabled=page>=pages;
 const arr=chunk.map(p=>p.id);$('#selectPage').checked=!!arr.length&&arr.every(id=>selected.has(id));
 $('#selectPage').indeterminate=arr.some(id=>selected.has(id))&&!$('#selectPage').checked;
 renderDock();
}
function render(){updateStats();filter();cards()}
function renderDock(){$('#selectedCount').textContent='Выбрано: '+selected.size;$('#bulkCount').textContent=selected.size;$('#bulkDock').classList.toggle('hidden',!selected.size);bulkPreview()}
function bulkData(){return {colors:$$('.bulk-colors:checked').map(x=>x.value),materials:$$('.bulk-materials:checked').map(x=>x.value),audience:$('.bulk-audience:checked')?.value||'',custom:$('#bulkCustomOnRequest').checked,hold:$('#bulkHold').checked,colorMode:$('#colorsMode').value,materialMode:$('#materialsMode').value}}
function bulkPreview(){
 if(!selected.size)return;
 const d=bulkData(),v=[];
 if(d.colors.length)v.push('расцветки: '+d.colors.length);
 if(d.materials.length)v.push('материалы: '+d.materials.length);
 if(d.audience)v.push('аудитория: '+label(AUDIENCES,d.audience));
 if(d.custom)v.push('цвет под заказ');
 if(d.hold)v.push('отложить');
 $('#bulkPreview').textContent=v.length?v.join(' · '):'Отметь параметры для выбранных товаров';
 $('#applyBulk').disabled=!v.length;
}
function arrOp(old,values,mode){if(mode==='replace')return [...new Set(values)];if(mode==='remove')return old.filter(x=>!values.includes(x));return [...new Set(old.concat(values))]}
function resetBulk(){$$('.bulkdock input[type="checkbox"],.bulkdock input[type="radio"]').forEach(e=>e.checked=false);$('#colorsMode').value='add';$('#materialsMode').value='add';bulkPreview()}
function bulkApply(){
 const b=bulkData(),n=selected.size;if(!n)return;if(!b.colors.length&&!b.materials.length&&!b.audience&&!b.custom&&!b.hold)return;
 if(n>=50&&!confirm('Применить массовые изменения к '+n+' товарам?'))return;
 if(n>=10&&((b.colorMode==='replace'&&b.colors.length)||(b.materialMode==='replace'&&b.materials.length))&&!confirm('Ты выбрал ЗАМЕНИТЬ. Старые значения у '+n+' товаров будут заменены. Продолжить?'))return;
 for(const id of selected){const d=editable(id);
  if(b.colors.length){d.colors=arrOp(d.colors,b.colors,b.colorMode);d.confirmed.colors=!!(d.colors.length||d.customOnRequest)}
  if(b.custom){d.customOnRequest=true;d.confirmed.colors=true}
  if(b.materials.length){d.materials=arrOp(d.materials,b.materials,b.materialMode);d.confirmed.materials=!!d.materials.length}
  if(b.audience){d.audience=b.audience;d.confirmed.audience=true}
  if(b.hold)d.hold=true;
  touch(id);
 }
 selected.clear();resetBulk();render();scheduleSave(50);toast('Изменено '+n+' товаров; жди сообщения о сохранении.');
}
function openDrawer(id){
 if(!byId.has(id))return;active=id;activePhoto=0;
 $('#drawerBack').classList.remove('hidden');$('#drawer').classList.remove('hidden');document.body.style.overflow='hidden';draw();
}
function closeDrawer(){active=null;$('#drawerBack').classList.add('hidden');$('#drawer').classList.add('hidden');document.body.style.overflow='';render()}
function draw(){
 const p=byId.get(active);if(!p)return;const d=get(active);
 $('#drawerMeta').textContent='№ '+p.index+' · Etsy '+p.etsy;$('#drawerTitle').textContent=p.name;
 const gallery='<img class="hero" src="'+esc(p.images[activePhoto]||p.images[0])+'" alt="'+esc(p.name)+'"><div class="thumbnails">'+p.images.map((u,i)=>'<button data-photo="'+i+'" class="'+(i===activePhoto?'active':'')+'" title="Фото '+(i+1)+'"><img src="'+esc(u)+'" alt=""></button>').join('')+'</div>';
 const colorChoices=COLORS.map(x=>pill(x,'one-color',d.colors.includes(x[0]))).join('');
 const materialChoices=MATERIALS.map(x=>pill(x,'one-material',d.materials.includes(x[0]))).join('');
 const audiences=AUDIENCES.map(x=>pill(x,'one-audience',d.audience===x[0])).join('');
 const rows=p.variants.map(v=>'<tr><td>'+esc(v.suggested_label)+(v.issue!=='NONE'?' ⚠':'')+'</td><td>$'+esc(v.price)+'</td></tr>').join('');
 $('#drawerBody').innerHTML=gallery+
  '<div class="kv"><b>Исходный цвет:</b> '+esc(p.color_hint||'—')+' · <b>Материал:</b> '+esc(p.material||'—')+'<br><b>Состав:</b> '+esc(p.components.join(', '))+'</div>'+
  '<section class="drawer-section"><h3>Расцветки</h3><div class="chips">'+colorChoices+'</div><label class="checkline custom"><input id="singleCustom" type="checkbox" '+(d.customOnRequest?'checked':'')+'>Другие цвета под заказ</label></section>'+
  '<section class="drawer-section"><h3>Материалы</h3><div class="chips">'+materialChoices+'</div></section>'+
  '<section class="drawer-section"><h3>Аудитория</h3><div class="audiencechips">'+audiences+'</div></section>'+
  '<section class="drawer-section"><h3>Комментарий, если нужно</h3><textarea id="singleNote" class="field" rows="3">'+esc(d.comment)+'</textarea></section>'+
  '<section class="drawer-section"><h3>Комплектации и цены (для справки)</h3><table class="variants"><tr><th>Вариант</th><th>Цена</th></tr>'+rows+'</table><p>Не требуется проставлять эти варианты вручную.</p></section>';
 $('#drawerHold').textContent=d.hold?'Вернуть в работу':'Отложить';
}
function onDrawerChange(e){
 if(!active)return;const el=e.target,d=editable(active);
 if(el.classList.contains('one-color')){d.colors=arrOp(d.colors,[el.value],el.checked?'add':'remove');d.confirmed.colors=!!(d.colors.length||d.customOnRequest)}
 if(el.id==='singleCustom'){d.customOnRequest=el.checked;d.confirmed.colors=!!(d.colors.length||d.customOnRequest)}
 if(el.classList.contains('one-material')){d.materials=arrOp(d.materials,[el.value],el.checked?'add':'remove');d.confirmed.materials=!!d.materials.length}
 if(el.classList.contains('one-audience')){d.audience=el.value;d.confirmed.audience=true}
 touch(active);render();
}
function download(name,text){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),link=URL.createObjectURL(blob),a=document.createElement('a');a.href=link;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(link),7000)}
function backup(){
 const obj={type:'THEFEYA_BONANZA_OWNER_REVIEW_V2',created_at:new Date().toISOString(),catalog_version:catalog.generated_at,products_count:207,decisions};
 download('TheFEYA_Bonanza_owner_review_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(obj,null,2));toast('Резервная копия JSON готова');
}
function register(){
 $('#loginForm').addEventListener('submit',signin);
 $('#logoutBtn').addEventListener('click',async()=>{
  if(dirty.size&&!confirm('Есть несохранённые изменения. Выйти?'))return;
  try{await api('/auth/v1/logout','POST')}catch(e){}
  session=null;user=null;localStorage.removeItem(SESS_KEY);loginView('');
 });
 $('#backupBtn').addEventListener('click',backup);
 $('#syncBtn').addEventListener('click',async()=>{await flush();if(!dirty.size){await loadCloud();render();toast('Черновики прочитаны из Supabase')}});
 ['search','statusFilter','colorFilter','audienceFilter','groupFilter','sortFilter'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',()=>{page=1;render()}));
 $('#selectPage').addEventListener('change',e=>{filtered.slice((page-1)*perPage,page*perPage).forEach(p=>e.target.checked?selected.add(p.id):selected.delete(p.id));cards()});
 $('#selectFiltered').addEventListener('click',()=>{filtered.forEach(p=>selected.add(p.id));cards();toast('Выбраны все отфильтрованные: '+filtered.length)});
 $('#clearSelection').addEventListener('click',()=>{selected.clear();cards()});
 $('#prevPage').addEventListener('click',()=>{page=Math.max(1,page-1);cards();window.scrollTo(0,150)});
 $('#nextPage').addEventListener('click',()=>{page++;cards();window.scrollTo(0,150)});
 $('#grid').addEventListener('click',e=>{if(e.target.closest('[data-check]'))return;const button=e.target.closest('[data-open]');if(button)openDrawer(button.dataset.open)});
 $('#grid').addEventListener('change',e=>{const id=e.target.dataset.select;if(!id)return;e.target.checked?selected.add(id):selected.delete(id);cards()});
 $$('.bulkdock input,.bulkdock select').forEach(el=>el.addEventListener('change',bulkPreview));
 $('#applyBulk').addEventListener('click',bulkApply);$('#resetBulk').addEventListener('click',resetBulk);
 $('#closeBulk').addEventListener('click',()=>{selected.clear();cards()});
 $('#drawerClose').addEventListener('click',closeDrawer);$('#drawerBack').addEventListener('click',closeDrawer);
 $('#drawerBody').addEventListener('change',onDrawerChange);
 $('#drawerBody').addEventListener('input',e=>{if(e.target.id==='singleNote'&&active){editable(active).comment=e.target.value.slice(0,1500);touch(active)}});
 $('#drawerBody').addEventListener('click',e=>{const t=e.target.closest('[data-photo]');if(t){activePhoto=Number(t.dataset.photo);draw()}});
 $('#drawerHold').addEventListener('click',()=>{if(!active)return;const d=editable(active);d.hold=!d.hold;touch(active);draw();render()});
 $('#drawerNext').addEventListener('click',()=>{if(!active)return;const ix=filtered.findIndex(p=>p.id===active),n=filtered[ix+1];if(n)openDrawer(n.id);else closeDrawer()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)closeDrawer()});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty.size)flush()});
 window.addEventListener('beforeunload',e=>{if(dirty.size){e.preventDefault();e.returnValue=''}});
}
async function boot(){
 register();if(!BASE||!KEY)return loginView('Не загружена конфигурация');
 try{
  const s=JSON.parse(localStorage.getItem(SESS_KEY)||'null');
  if(s&&s.session&&s.session.access_token){session=s.session;user=s.user;await openApp()}else loginView('');
 }catch(e){localStorage.removeItem(SESS_KEY);session=null;loginView('Не удалось восстановить сеанс: '+e.message)}
}
boot();

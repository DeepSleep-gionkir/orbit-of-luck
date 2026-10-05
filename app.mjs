import {RARITIES,randomRarity,percent,chance,validRecords,dateValue,filterRecords} from './core.mjs';
import {CINEMATICS,INTRO_DURATION,TRANSITION_DURATION} from './cinematics.mjs?v=20261006-1';
const $=s=>document.querySelector(s),STORAGE_KEY='orbit-of-luck:history:v1',COOLDOWN_KEY='orbit-of-luck:cooldown:v1',PAGE_SIZE=30;
const COOLDOWNS_ENABLED=false;
const SEEN_KEY='orbit-of-luck:seen-cinematics:v2';
function readWatched(){try{const value=JSON.parse(localStorage.getItem(SEEN_KEY));return new Set(value?.version===1&&Array.isArray(value.rarities)?value.rarities.filter(n=>Number.isInteger(n)&&n>=0&&n<RARITIES.length):[]);}catch{return new Set();}}
const watched=readWatched();
function hasWatched(index){for(const n of readWatched())watched.add(n);return watched.has(index);}
function markWatched(index){for(const n of readWatched())watched.add(n);watched.add(index);try{localStorage.setItem(SEEN_KEY,JSON.stringify({version:1,rarities:[...watched]}));}catch{}}
let records=[],busy=false,period='all',page=0,scene,finishReveal,storageWarned=false,cooldownUntil=0,hasDrawn=false;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,6500);}
function loadRecords(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?validRecords(JSON.parse(raw)):[];}catch{if(!storageWarned){toast('기록을 읽을 수 없어요. 새 기록은 가능한 경우 저장됩니다.');storageWarned=true;}return [];}}
records=loadRecords();
function readCooldown(){if(!COOLDOWNS_ENABLED)return 0;try{const n=Number(localStorage.getItem(COOLDOWN_KEY));return Number.isFinite(n)&&n>=0&&n<=Date.now()+300000?n:0;}catch{return 0;}}
function saveCooldown(until){if(!COOLDOWNS_ENABLED)return;cooldownUntil=until;try{localStorage.setItem(COOLDOWN_KEY,String(until));}catch{}}
cooldownUntil=readCooldown();
function updateDrawControls(){
 const seconds=Math.max(0,Math.ceil((cooldownUntil-Date.now())/1000)),blocked=busy||seconds>0||$('#batchDialog').open;
 for(const id of ['#drawButton','#draw10Button','#draw100Button'])$(id).disabled=blocked;
 $('#drawLabel').textContent=busy?'행운을 펼치는 중':hasDrawn?'다시 뽑기':'한 번 뽑기';
 $('#cooldownNote').hidden=busy||seconds===0;$('#cooldownNote').textContent=seconds?`모든 뽑기 · ${seconds}초 후 다시 펼칠 수 있어요`:'';
 $('#batchCooldown').hidden=!COOLDOWNS_ENABLED;$('#batchCooldown').textContent=seconds?`다음 뽑기까지 ${seconds}초`:'다음 행운을 펼칠 준비가 됐어요.';
}
function collectionStats(){
 const stats=RARITIES.map(r=>({rarity:r,count:0,first:null}));
 for(const record of records){const entry=stats[record.rarity];entry.count++;entry.first=entry.first===null?record.timestamp:Math.min(entry.first,record.timestamp);}
 return stats;
}
function renderCollection(){
 const stats=collectionStats(),discovered=stats.filter(s=>s.count>0).length;
 $('#collectionCount').textContent=`${discovered}/18`;$('#discoveredCount').textContent=`${discovered} / 18`;
 $('#collectionGrid').innerHTML=stats.map(({rarity:r,count,first})=>`<div class="collection-card ${count?'discovered':'undiscovered'}" role="listitem" style="--item-color:${r.color}"><span class="collection-rank">${String(r.index+1).padStart(2,'0')} / 18</span><span class="collection-star" aria-hidden="true">${count?'✦':'✧'}</span><strong>${r.name}</strong><small>${percent(r)}</small><span class="collection-found">${count?`${count.toLocaleString('ko-KR')}회 발견`:'아직 미발견'}</span>${first!==null?`<time datetime="${new Date(first).toISOString()}">첫 발견 ${new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit'}).format(first)}</time>`:'<span class="collection-unopened">아직 펼쳐지지 않은 가능성</span>'}</div>`).join('');
 return stats;
}
function openCollection(){if(!busy)records=validRecords({version:1,records:[...records,...loadRecords()]});const stats=renderCollection();openDialog($('#collectionDialog'));return stats;}
function best(list){const index=list.reduce((n,r)=>Math.max(n,r.rarity),-1);return index<0?null:RARITIES[index];}
function timeText(timestamp,full=false){return new Intl.DateTimeFormat('ko-KR',full?{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}:{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(timestamp);}
function renderSummary(){
 $('#historyCount').textContent=records.length.toLocaleString('ko-KR');$('#totalDraws').innerHTML=`${records.length.toLocaleString('ko-KR')}<span>회</span>`;
 const top=best(records);$('#bestRarity').textContent=top?.name??'아직 없어요';$('#bestRarity').style.color=top?.color??'';
 $('#recentList').innerHTML=records.length?records.slice(0,6).map(r=>{const x=RARITIES[r.rarity];return `<div class="recent-card" style="--item-color:${x.color}"><span class="rarity-symbol" aria-hidden="true">✦</span><strong>${x.name}</strong><time datetime="${new Date(r.timestamp).toISOString()}">${timeText(r.timestamp)}</time></div>`;}).join(''):'<div class="empty-recent"><span aria-hidden="true">✧</span>첫 번째 행운이 이곳에 남습니다.</div>';
 renderCollection();
}
function renderHistory(){
 let list;try{list=filterRecords(records,period,$('#startDate').value,$('#endDate').value);}catch(e){$('#filterError').textContent=e.message;$('#filterError').hidden=false;return;}
 $('#filterError').hidden=true;const maxPage=Math.max(0,Math.ceil(list.length/PAGE_SIZE)-1);page=Math.min(page,maxPage);
 $('#filteredCount').textContent=`${list.length.toLocaleString('ko-KR')}회`;const top=best(list);$('#filteredBest').textContent=top?`최고 희귀도 · ${top.name}`:'';$('#filteredBest').style.color=top?.color??'';
 $('#historyList').innerHTML=list.length?list.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(r=>{const x=RARITIES[r.rarity];return `<div class="history-row" style="--item-color:${x.color}"><div><strong>✦ ${x.name}</strong><small>${percent(x)} · ${chance(x)}</small></div><time datetime="${new Date(r.timestamp).toISOString()}">${timeText(r.timestamp,true)}</time></div>`;}).join(''):`<div class="history-empty"><span aria-hidden="true">✧</span>${records.length?'이 기간에는 뽑기 기록이 없어요.':'아직 남겨진 순간이 없어요.<br>첫 번째 행운을 펼쳐보세요.'}</div>`;
 $('#pagination').hidden=list.length<=PAGE_SIZE;$('#prevPage').disabled=page===0;$('#nextPage').disabled=page===maxPage;$('#pageLabel').textContent=`${page+1} / ${maxPage+1}`;
}
function updateDialogViewport(){
 const viewport=window.visualViewport;
 document.documentElement.style.setProperty('--dialog-viewport-height',`${viewport?.height??innerHeight}px`);
 document.documentElement.style.setProperty('--dialog-viewport-top',`${viewport?.offsetTop??0}px`);
}
function openDialog(dialog){updateDialogViewport();if(!dialog.open)dialog.showModal();}
updateDialogViewport();
window.addEventListener('resize',updateDialogViewport);
window.visualViewport?.addEventListener('resize',updateDialogViewport);
window.visualViewport?.addEventListener('scroll',updateDialogViewport);
window.addEventListener('pagehide',()=>{
 window.removeEventListener('resize',updateDialogViewport);
 window.visualViewport?.removeEventListener('resize',updateDialogViewport);
 window.visualViewport?.removeEventListener('scroll',updateDialogViewport);
},{once:true});
function openHistory(){if(!busy){records=validRecords({version:1,records:[...records,...loadRecords()]});renderSummary();}renderHistory();openDialog($('#historyDialog'));}
$('#oddsButton').addEventListener('click',()=>openDialog($('#oddsDialog')));$('#historyButton').addEventListener('click',openHistory);$('#allHistoryButton').addEventListener('click',()=>{setPeriod('all');openHistory();});
$('#collectionButton').addEventListener('click',openCollection);
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog:not(#batchDialog)').forEach(d=>d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();}));
$('#oddsList').innerHTML=RARITIES.map(r=>`<div class="odds-row" style="--item-color:${r.color}"><span class="odds-rank">${String(r.index+1).padStart(2,'0')}</span><span class="odds-name"><span class="odds-dot" aria-hidden="true"></span>${r.name}</span><span class="odds-percent">${percent(r)}<small>${chance(r)}</small></span></div>`).join('');
const today=new Date(),weekStart=new Date(today.getFullYear(),today.getMonth(),today.getDate()-6);$('#startDate').value=dateValue(weekStart);$('#endDate').value=dateValue(today);
function setPeriod(next){period=next;page=0;$('#dateFilter').hidden=next!=='custom';document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===next)));renderHistory();}
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>setPeriod(b.dataset.period)));$('#dateFilter').addEventListener('submit',e=>{e.preventDefault();page=0;renderHistory();});
$('#prevPage').addEventListener('click',()=>{page--;renderHistory();});$('#nextPage').addEventListener('click',()=>{page++;renderHistory();});
async function appendBatch(batch,reservedUntil){
 let saved=true,blocked=false;
 const write=()=>{
  cooldownUntil=Math.max(cooldownUntil,readCooldown());
  if(cooldownUntil>Date.now()){blocked=true;return;}
  records=validRecords({version:1,records:[...batch.slice().reverse(),...records,...loadRecords()]});
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,records}));}catch{saved=false;}
  if(reservedUntil)saveCooldown(reservedUntil);
 };
 if(navigator.locks?.request){try{await navigator.locks.request('orbit-luck-history',write);}catch{write();}}else write();
 return {saved,blocked};
}
function showBatch(batch,rarity){
 $('#batchTitle').textContent=batch.length===1?'뽑기 결과':`${batch.length}연속 뽑기 결과`;$('#batchCount').textContent=`${batch.length}회`;
 $('#batchBestLabel').textContent=batch.length===1?'이번 희귀도':'가장 높은 희귀도';$('#batchGrid').classList.toggle('is-single',batch.length===1);$('#batchDialog').classList.toggle('is-single',batch.length===1);
 $('#batchBest').textContent=rarity.name;$('#batchBest').style.color=rarity.color;
 $('#batchProbability').textContent=`개별 확률 ${percent(rarity)}`;
 $('#batchGrid').innerHTML=batch.map((record,index)=>{
  const r=RARITIES[record.rarity],highest=r.index===rarity.index;
  return `<div class="batch-card${highest?' is-best':''}" role="listitem" style="--item-color:${r.color};--card-index:${Math.min(index,8)}"><div class="batch-card-top"><span class="batch-card-index">#${String(index+1).padStart(batch.length===100?3:2,'0')}</span>${highest?'<span class="best-card-label">최고</span>':''}</div><div class="batch-icon-wrap"><span class="batch-card-star" aria-hidden="true">✦</span></div><span class="batch-card-tier">${r.label}</span><strong>${r.name}</strong><small>${percent(r)}</small></div>`;
 }).join('');
 openDialog($('#batchDialog'));$('#batchGrid').scrollTop=0;updateDrawControls();
}
function confirmBatch(){
 const open=$('#batchDialog').open;
 if(open){
  $('#batchDialog').close();$('#batchGrid').innerHTML='';scene?.reset?.();hasDrawn=false;
  $('.draw-surface').classList.remove('is-result','is-revealing');$('#result').classList.remove('enter');
  $('#resultKicker').textContent='18가지 희귀도 중 하나';$('#resultName').textContent='오늘은 어떤 행운일까요?';$('#resultDetail').textContent='가운데 별에 당신의 가능성이 담겨 있어요.';$('#stageStatus').textContent='아직 펼쳐지지 않은 행운';
 }
 updateDrawControls();return {status:open?'confirmed':'already_closed'};
}
$('#confirmBatchButton').addEventListener('click',confirmBatch);
$('#batchDialog').addEventListener('cancel',e=>e.preventDefault());
let cinematicSlots;
function enterCinematic(){
 const skip=$('#skipButton'),rect=($('#sceneSlot')??$('#scene')).getBoundingClientRect();
 cinematicSlots={skipParent:skip.parentNode,skipNext:skip.nextSibling};
 document.body.append(skip);document.body.classList.add('is-cinematic');return rect;
}
function leaveCinematic(){
 document.body.classList.remove('is-cinematic','is-cinematic-ready');
 if(cinematicSlots){const {skipParent,skipNext}=cinematicSlots;skipParent.insertBefore($('#skipButton'),skipNext);cinematicSlots=undefined;}
}
function skipAnimation(){if(!busy||$('#skipButton').hidden||!finishReveal)return {status:'not_available'};finishReveal();return {status:'skipped'};}
function waitForAnimation(duration,canSkip=false){
 return new Promise(resolve=>{
  let done=false,timer,remaining=duration,startedAt=0;
  const complete=skip=>{if(done)return;done=true;clearTimeout(timer);document.removeEventListener('visibilitychange',onVisibility);if(skip)scene?.finish();resolve(skip);};
  const start=()=>{if(document.hidden)return;startedAt=performance.now();timer=setTimeout(()=>complete(false),Math.max(0,remaining));};
  const onVisibility=()=>{if(document.hidden){clearTimeout(timer);if(startedAt){remaining=Math.max(0,remaining-(performance.now()-startedAt));startedAt=0;}}else start();};
  finishReveal=canSkip?()=>complete(true):undefined;
  document.addEventListener('visibilitychange',onVisibility);start();
 });
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function veilReveal(reduced,cancelled){
 const veil=$('#revealVeil');if(reduced||cancelled())return;veil.style.transition='opacity 450ms ease';veil.style.background='#000';veil.style.opacity='1';await sleep(470);if(cancelled())return;
 veil.style.transition=`background ${reduced?100:1050}ms ease-in`;veil.style.background='#fff';await sleep(reduced?100:1080);
}
async function draw(count=1){
 if(![1,10,100].includes(count))throw new Error('1회, 10회, 100회 중 선택해주세요.');
 if(busy)return {status:'busy'};
 if($('#batchDialog').open)return {status:'awaiting_confirmation'};
 cooldownUntil=Math.max(cooldownUntil,readCooldown());
 if(cooldownUntil>Date.now()){updateDrawControls();return {status:'cooldown',remainingSeconds:Math.ceil((cooldownUntil-Date.now())/1000)};}
 busy=true;updateDrawControls();$('#oddsButton').disabled=true;$('#historyButton').disabled=true;$('#collectionButton').disabled=true;
 const surface=$('.draw-surface');let skipped=false,batch=[],cooldownMs=COOLDOWNS_ENABLED?(count===10?5000:count===100?50000:0):0,accepted=false,previouslySeen=false;
 try{
  const timestamp=Date.now();batch=Array.from({length:count},()=>({id:crypto.randomUUID?.()??`${timestamp}-${crypto.getRandomValues(new Uint32Array(1))[0]}`,timestamp,rarity:randomRarity().index}));
  const rarity=best(batch),cinematic=rarity.index>0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preparationDuration=reduced?250:INTRO_DURATION,transitionDuration=cinematic?(reduced?100:TRANSITION_DURATION):0,rarityDuration=cinematic?(reduced?150:CINEMATICS[rarity.index].duration):0,duration=preparationDuration+transitionDuration+rarityDuration;
  const {saved,blocked}=await appendBatch(batch,cooldownMs?Date.now()+duration+(reduced?100:2400)+cooldownMs:0);
  if(blocked)return {status:'cooldown',remainingSeconds:Math.ceil((cooldownUntil-Date.now())/1000)};
  accepted=true;
  await sceneReady;
  previouslySeen=cinematic&&hasWatched(rarity.index);
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  $('#skipButton').hidden=true;surface.classList.remove('is-result');surface.classList.add('is-revealing');surface.style.setProperty('--rarity',rarity.color);$('#result').classList.remove('enter');
  $('#stageStatus').textContent='행운을 발견하는 중';
  finishReveal=undefined;
  const preparation=scene?.reveal(rarity,preparationDuration,{count});
  // The renderer, rather than a wall-clock timeout, confirms the final prep frame.
  if(preparation?.then)await preparation;else await waitForAnimation(preparationDuration);
  if(cinematic){
   const rect=enterCinematic();
   scene?.beginRarity?.(rarity,rarityDuration,transitionDuration,rect);
   $('#skipButton').hidden=!previouslySeen;
   skipped=await waitForAnimation(transitionDuration,previouslySeen);
   document.body.classList.add('is-cinematic-ready');
   if(!skipped)skipped=await waitForAnimation(rarityDuration,previouslySeen);
  }
  const cancelDuringVeil=()=>{skipped=true;$('#revealVeil').style.transition='opacity 100ms';$('#revealVeil').style.opacity='0';};finishReveal=previouslySeen?cancelDuringVeil:undefined;
  if(!skipped)await veilReveal(reduced,()=>skipped);scene?.finish();finishReveal=undefined;
  if(cinematic)markWatched(rarity.index);leaveCinematic();$('#skipButton').hidden=true;
  surface.classList.remove('is-revealing');surface.classList.add('is-result');$('#resultKicker').textContent=`${rarity.label} · ${String(rarity.index+1).padStart(2,'0')} / 18`;
  $('#resultName').textContent=rarity.name;$('#resultDetail').textContent=count>1?`${count}번 중 가장 높은 희귀도 · 개별 확률 ${percent(rarity)}`:`${percent(rarity)}의 가능성 · ${chance(rarity)}`;$('#result').classList.add('enter');$('#stageStatus').textContent=rarity.index>=7?'눈부신 행운을 만났어요':'당신의 행운이 펼쳐졌어요';
  $('#revealVeil').style.transition='opacity 850ms ease-out';$('#revealVeil').style.opacity='0';renderSummary();if($('#historyDialog').open)renderHistory();if(!skipped)await sleep(reduced?100:850);
  hasDrawn=true;if(cooldownMs)saveCooldown(Date.now()+cooldownMs);showBatch(batch,rarity);
  if(!saved)toast('저장 공간이 부족하거나 저장이 차단돼 있어요. 이번 기록은 이 화면을 닫기 전까지만 남습니다.');
  return {status:'revealed',count,rarity:rarity.name,probability:percent(rarity),timestamp,rarities:batch.map(r=>RARITIES[r.rarity].name),cooldownSeconds:cooldownMs/1000,animationPreviouslySeen:previouslySeen,animationSkipped:skipped};
 }catch{finishReveal=undefined;surface.classList.remove('is-revealing');$('#revealVeil').style.opacity='0';$('#resultName').textContent='다시 펼쳐볼까요?';$('#resultDetail').textContent='뽑기를 완료하지 못했어요.';toast('뽑기를 완료하지 못했어요. 다시 눌러주세요.');return {status:'failed'};}
 finally{leaveCinematic();if(accepted&&cooldownMs&&!$('#batchDialog').open)saveCooldown(Date.now()+cooldownMs);busy=false;updateDrawControls();$('#skipButton').hidden=true;$('#oddsButton').disabled=false;$('#historyButton').disabled=false;$('#collectionButton').disabled=false;}
}
$('#drawButton').addEventListener('click',()=>draw(1));$('#draw10Button').addEventListener('click',()=>draw(10));$('#draw100Button').addEventListener('click',()=>draw(100));$('#skipButton').addEventListener('click',skipAnimation);
window.addEventListener('storage',e=>{if(e.key===COOLDOWN_KEY){cooldownUntil=readCooldown();updateDrawControls();}if(e.key===STORAGE_KEY&&!busy){records=validRecords({version:1,records:[...records,...loadRecords()]});renderSummary();if($('#historyDialog').open)renderHistory();}});renderSummary();updateDrawControls();
const cooldownTimer=COOLDOWNS_ENABLED?setInterval(updateDrawControls,250):null;window.addEventListener('pagehide',()=>clearInterval(cooldownTimer),{once:true});
const sceneReady=import('./scene.mjs?v=20261006-1').then(({createScene})=>{scene=createScene($('#scene'));return scene.ready;}).catch(()=>{$('.scene-fallback').hidden=false;});
import('./sky.mjs?v=20261006-1').then(({startSky})=>startSky($('#sky'))).catch(()=>{});
const context=document.modelContext;
if(context?.registerTool){
 const lifecycle=new AbortController(),register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'draw_rarity',title:'희귀도 뽑기',description:'Draw 1, 10 or 100 independently sampled rarities and save every record locally, updating the rarity collection. Always play the shared preparation animation in the unchanged lobby first; it cannot be skipped. Then play a fullscreen 3D space cinematic specific to the highest rarity, except for Common, while the lobby UI is hidden; rarer results have longer animations and richer camera motion and effects. A rarity can be skipped only after its cinematic has been watched once, saved locally. Display result cards requiring confirmation. Cooldowns are currently disabled. Returns when results are visible, or reports busy or awaiting confirmation.',inputSchema:{type:'object',properties:{count:{type:'integer',enum:[1,10,100]}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='count'))throw new Error('Invalid input');return draw(input.count??1);}});
 register({name:'confirm_draw_results',title:'뽑기 결과 확인',description:'Close the visible result cards and return the star to its default lobby animation, as the Confirm button does. Does not remove history or shorten cooldown.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('No arguments are accepted.');return confirmBatch();}});
 register({name:'skip_draw_animation',title:'이미 본 연출 건너뛰기',description:'Skip the currently playing cinematic, as its visible skip button does, only if this same rarity has already been watched fully once. First-time cinematics and the shared preparation cannot be skipped. Does not perform a new draw or alter its results.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('No arguments are accepted.');return skipAnimation();}});
 register({name:'read_rarity_collection',title:'희귀도 도감 조회',description:'Open the rarity collection and read discovery counts and first discovery timestamps derived from all saved local draws. This does not perform a draw or modify history.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('No arguments are accepted.');const stats=openCollection();return {discovered:stats.filter(s=>s.count>0).length,total:RARITIES.length,rarities:stats.map(s=>({name:s.rarity.name,count:s.count,firstDiscoveredAt:s.first}))};}});
 register({name:'read_draw_history',title:'뽑기 기록 조회',description:'Read locally saved history for all time, today, seven calendar days or an inclusive local date range, and open the same history view.',inputSchema:{type:'object',properties:{period:{type:'string',enum:['all','today','week','custom']},start:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},end:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}},required:['period'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['period','start','end'].includes(k)))throw new Error('Invalid input');const list=filterRecords(records,input.period,input.start,input.end);if(input.period==='custom'){$('#startDate').value=input.start;$('#endDate').value=input.end;}setPeriod(input.period);openHistory();return {count:list.length,best:best(list)?.name??null,records:list.slice(0,100).map(r=>({rarity:RARITIES[r.rarity].name,timestamp:r.timestamp})),truncated:list.length>100};}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

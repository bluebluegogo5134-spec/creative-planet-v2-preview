(()=>{
const KEY='creativePlanetSingleScreenV2';
const D={quote:'慢一点也没关系，但不要离自己的星球太远。',projects:[
{id:'p1',name:'江西县城相亲角',stage:'口稿阶段',next:'写完“进入相亲角”第一稿'},
{id:'p2',name:'神明的观众席',stage:'复盘阶段',next:'整理人物与声音复盘'},
{id:'p3',name:'人类研究报告',stage:'设定阶段',next:'补人物与世界观笔记'}],
currentProject:'p1',week:[
{day:'周一',type:'创作',start:'21:00',end:'22:00',node:true,note:'创作连接'},
{day:'周二',type:'健身',start:'19:30',end:'21:00',node:false,note:'健身'},
{day:'周三',type:'创作',start:'21:00',end:'22:00',node:true,note:'推进项目'},
{day:'周四',type:'健身',start:'19:30',end:'21:00',node:false,note:'健身'},
{day:'周五',type:'自由',start:'',end:'',node:false,note:'自由安排'},
{day:'周六',type:'创作',start:'09:30',end:'18:30',node:true,note:'完整创作日'},
{day:'周日',type:'创作',start:'14:00',end:'18:00',node:true,note:'半天创作'}],
logs:[],review:{done:'',goal:''},timer:null};
let S;try{S=JSON.parse(localStorage.getItem(KEY))||D}catch(e){S=D}
S={...D,...S};S.projects=S.projects?.length?S.projects:D.projects;S.week=S.week?.length===7?S.week:D.week;S.logs=Array.isArray(S.logs)?S.logs:[];
const $=x=>document.getElementById(x),save=()=>localStorage.setItem(KEY,JSON.stringify(S)),pad=n=>String(n).padStart(2,'0');
function iso(d=new Date()){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function startWeek(){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function weekLogs(){let a=startWeek(),b=new Date(a);b.setDate(b.getDate()+7);return S.logs.filter(l=>{let d=new Date(l.date+'T12:00:00');return d>=a&&d<b})}
function getP(id){return S.projects.find(p=>p.id===id)||S.projects[0]}
function fmt(m){m=Number(m)||0;if(m<60)return m+'m';let h=Math.floor(m/60),r=m%60;return r?h+'h '+r+'m':h+'h'}
function icon(t){return t==='创作'?'🪶':t==='健身'?'🏋️':t==='自由'?'⭐':'☾'}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),1200)}
function fills(){let o=S.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');['homeProject','sessionProject','manualProject'].forEach(id=>$(id).innerHTML=o);$('homeProject').value=S.currentProject;$('sessionProject').value=S.currentProject;$('manualProject').value=S.currentProject}
function nodes(){let ws=startWeek(),logs=weekLogs(),n=0;S.week.forEach((w,i)=>{if(!w.node)return;let d=new Date(ws);d.setDate(d.getDate()+i);let ds=iso(d);if(logs.some(l=>l.date===ds&&l.type!=='健身'&&l.minutes>0))n++});return n}
function gymCount(){return weekLogs().filter(l=>l.type==='健身').length}
function weekMins(){return weekLogs().filter(l=>l.type!=='健身').reduce((a,b)=>a+Number(b.minutes||0),0)}
function renderHome(){
 $('homeQuote').textContent=S.quote;let n=nodes(),m=weekMins(),g=gymCount();$('nodeStat').textContent=n+'/4';$('weekTimeStat').textContent=fmt(m);$('gymStat').textContent=g+'次';$('nodeBar').style.width=Math.min(100,n/4*100)+'%';$('timeBar').style.width=Math.min(100,m/840*100)+'%';$('gymBar').style.width=Math.min(100,g/2*100)+'%';
 let p=getP(S.currentProject);$('homeProject').value=p.id;$('homeNext').textContent=p.next||'未设置';
 let last=[...S.logs].sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt))[0];$('lastLeave').textContent=last?.next||'还没有记录。';
 let ws=startWeek();$('weekStrip').innerHTML=S.week.map((w,i)=>{let d=new Date(ws);d.setDate(d.getDate()+i);let ds=iso(d),done=S.logs.some(l=>l.date===ds&&l.minutes>0);return `<div class="dayChip ${done?'done':''}"><b>${w.day.replace('周','')}</b><div class="ic">${icon(w.type)}</div>${w.type}${done?'<div>✓</div>':''}</div>`}).join('')
}
function renderProjects(){
 $('projectCarousel').innerHTML=S.projects.map((p,i)=>{let m=S.logs.filter(l=>l.projectId===p.id).reduce((a,b)=>a+Number(b.minutes||0),0);return `<div class="projectCard"><div class="projectThumb" style="background-image:url('./hero${(i%3)+1}.jpg')"></div><div><div class="projectName">${p.name}<span class="tag">${p.stage||'进行中'}</span></div><div class="small" style="margin-top:4px">累计 ${fmt(m)}</div><div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">下一步：${p.next||'未设置'}</div><button class="pill cur" data-id="${p.id}" style="margin-top:5px">${S.currentProject===p.id?'当前项目':'设为当前'}</button></div></div>`}).join('');
 document.querySelectorAll('.cur').forEach(b=>b.onclick=()=>{S.currentProject=b.dataset.id;save();renderAll();toast('已切换项目')})
}
function renderWeek(){
 $('weekGrid').innerHTML=S.week.map((w,i)=>`<div class="weekMini ${i===6?'wide':''}"><div class="dayBadge">${w.day}</div><div><b>${icon(w.type)} ${w.type}</b><div class="weekMeta">${w.start&&w.end?w.start+'–'+w.end:'自由安排'} · ${w.node?'计入节点':'不计节点'}<br>${w.note||''}</div></div><button class="editBtn" data-day="${i}">调整</button></div>`).join('');
 document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openPlan(+b.dataset.day))
}
function group(field){let m={};weekLogs().filter(l=>l.type!=='健身').forEach(l=>{let k=field==='type'?l.type:getP(l.projectId).name;m[k]=(m[k]||0)+Number(l.minutes||0)});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4)}
function renderReview(){
 let n=nodes(),m=weekMins();$('reviewNodes').textContent=n+'/4';$('reviewHours').textContent=fmt(m);$('reviewPass').textContent=n>=4&&m>=840?'是':'否';
 $('typeBreak').innerHTML=group('type').map(([k,v])=>`<div class="listLine"><span>${k}</span><b>${fmt(v)}</b></div>`).join('')||'<div class="small">暂无记录</div>';
 $('projectBreak').innerHTML=group('project').map(([k,v])=>`<div class="listLine"><span>${k}</span><b>${fmt(v)}</b></div>`).join('')||'<div class="small">暂无记录</div>';
 $('reviewPreview').textContent=S.review.done||'还没有写本周复盘。';$('weekDone').value=S.review.done||'';$('nextWeekGoal').value=S.review.goal||''
}
function renderAll(){fills();renderHome();renderProjects();renderWeek();renderReview()}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===id))}
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>{showPage(n.dataset.page);if(n.dataset.page==='session'&&S.timer)updateTimerDisplay()});$('goProjects').onclick=()=>showPage('projects');$('startFromHome').onclick=()=>{showPage('session');$('sessionProject').value=S.currentProject};
$('homeProject').onchange=e=>{S.currentProject=e.target.value;save();renderAll()};$('sessionProject').onchange=e=>{S.currentProject=e.target.value;save();renderAll()};
function openM(id){$(id).classList.add('open')}function closeM(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'))}
document.querySelectorAll('.close').forEach(b=>b.onclick=closeM);document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeM()}));
$('editQuote').onclick=()=>{$('quoteInput').value=S.quote;openM('quoteModal')};$('saveQuote').onclick=()=>{S.quote=$('quoteInput').value.trim()||D.quote;save();renderHome();closeM();toast('已保存')};
$('addProject').onclick=()=>{let n=$('newProject').value.trim();if(!n)return toast('先输入项目名');let id='p'+Date.now();S.projects.push({id,name:n,stage:'新项目',next:'写下这个项目的下一步'});S.currentProject=id;$('newProject').value='';save();renderAll();toast('新项目已建立')};
let editDay=0;function openPlan(i){editDay=i;let w=S.week[i];$('planTitle').textContent='调整'+w.day;$('planType').value=w.type;$('planStart').value=w.start||'';$('planEnd').value=w.end||'';$('planNode').value=String(!!w.node);$('planNote').value=w.note||'';openM('planModal')}
$('savePlan').onclick=()=>{let w=S.week[editDay];w.type=$('planType').value;w.start=$('planStart').value;w.end=$('planEnd').value;w.node=$('planNode').value==='true';w.note=$('planNote').value.trim();save();renderAll();closeM();toast('计划已调整')};
let ticker=null,selectedMood='';
function timerText(s){let h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return [h,m,x].map(v=>pad(v)).join(':')}
function updateTimerDisplay(){if(!S.timer){$('timer').textContent='00:00:00';return}const sec=Math.max(0,Math.floor((Date.now()-S.timer.startedAt)/1000));$('timer').textContent=timerText(sec)}
function resume(){if(!S.timer)return;clearInterval(ticker);updateTimerDisplay();ticker=setInterval(updateTimerDisplay,250);$('timerBtn').textContent='结束并记录'}
$('timerBtn').onclick=()=>{if(!S.timer){S.timer={startedAt:Date.now(),projectId:$('sessionProject').value,type:$('sessionType').value,goal:$('sessionGoal').value.trim()};save();resume();toast('计时已开始')}else{let mins=Math.max(1,Math.round((Date.now()-S.timer.startedAt)/60000));$('endDuration').textContent=fmt(mins);$('endDone').value=S.timer.goal||'';$('endNext').value='';selectedMood='';document.querySelectorAll('.mood').forEach(b=>b.classList.remove('sel'));openM('endModal')}};
document.querySelectorAll('.mood').forEach(b=>b.onclick=()=>{selectedMood=b.dataset.mood;document.querySelectorAll('.mood').forEach(x=>x.classList.toggle('sel',x===b))});
$('saveSession').onclick=()=>{if(!S.timer)return;let mins=Math.max(1,Math.round((Date.now()-S.timer.startedAt)/60000));S.logs.push({date:iso(),minutes:mins,projectId:S.timer.projectId,type:S.timer.type,done:$('endDone').value.trim(),next:$('endNext').value.trim(),mood:selectedMood,createdAt:new Date().toISOString()});let p=getP(S.timer.projectId);if($('endNext').value.trim())p.next=$('endNext').value.trim();S.timer=null;clearInterval(ticker);$('timer').textContent='00:00:00';$('timerBtn').textContent='开始计时';save();renderAll();closeM();showPage('home');toast('已记录')};
$('manualBtn').onclick=()=>{$('manualDate').value=iso();$('manualProject').value=$('sessionProject').value;$('manualType').value=$('sessionType').value;openM('manualModal')};
$('saveManual').onclick=()=>{let mins=Math.max(1,Math.min(900,Number($('manualMinutes').value)||0));S.logs.push({date:$('manualDate').value||iso(),minutes:mins,projectId:$('manualProject').value,type:$('manualType').value,done:$('manualDone').value.trim(),next:'',createdAt:new Date().toISOString()});save();renderAll();closeM();toast('已补录')};
$('openReview').onclick=()=>openM('reviewModal');$('saveReview').onclick=()=>{S.review={done:$('weekDone').value.trim(),goal:$('nextWeekGoal').value.trim()};save();renderReview();closeM();toast('复盘已保存')};
renderAll();if(S.timer)resume();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.timer)updateTimerDisplay()});
})();

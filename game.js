(() => {
'use strict';
const $=id=>document.getElementById(id), W=World;
const modes={search:['寻找外放者','听声翻找',65],rush:['大闹站台','站台巡逻',40],case:['谁在撒谎','失物招领处',85]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), rand=(a,b)=>a+Math.random()*(b-a);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key='wangcheng-patrol-v1',defaults={coins:0,owned:['玩具锤'],weapon:'玩具锤',skill:0,talent:null,rounds:0,sound:true};
let save;try{save={...defaults,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{save={...defaults}}
function persist(){try{localStorage.setItem(key,JSON.stringify(save))}catch{}}
const positions=[[-3.4,-1.48],[-.1,-1.55],[3.4,-1.32],[-3.6,1.70],[.0,2.70],[3.3,2.00]];
const colors={red:'珊瑚红',blue:'海水蓝',green:'青草绿'};
let state='home', mode, p, objects=[], mobs=[], drops=[], fx=[], elapsed=0,left=0,kills=0,energy=100,hit=0,cool=0,spawn=0,beat=0, target=null, inspected=0, proofs=[], culprit, chase=null, combo=0,queued=null,now=0,toastUntil=0,tipUntil=0;
let audio,joy=null,axis={x:0,y:0},keys=new Set(),bird=null,talentClock=0;
function tone(freq=390,len=.08,kind='triangle',vol=.035){
  if(!save.sound||!audio||audio.state!=='running')return;
  const o=audio.createOscillator(),g=audio.createGain();o.type=kind;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(70,freq*.74),audio.currentTime+len);
  g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+len)
}
function unlock(){if(!save.sound)return;try{audio ||=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}}
function notice(s){$('toast').textContent=s;toastUntil=performance.now()+1500}
function options(stamp,title,desc,choices){
  stopInput();$('stamp').textContent=stamp;$('dialogTitle').textContent=title;$('desc').textContent=desc;$('options').replaceChildren();
  choices.forEach(([label,cb,disabled])=>{const b=document.createElement('button');b.textContent=label;b.disabled=!!disabled;b.onclick=()=>{unlock();cb()};$('options').append(b)});$('modal').hidden=false
}
function close(){ $('modal').hidden=true; }
function clearMarks(){for(const o of [...objects,...fx,...drops])o.el?.remove();objects=[];mobs=[];drops=[];fx=[];chase=null;target=null;queued=null;$('marks').replaceChildren()}
function home(){
  clearMarks();stopInput();close();state='home';$('home').hidden=false;$('hud').hidden=true;$('toast').textContent='';
  W.buildStage('home');W.equip(save.weapon);W.snap();$('sound').textContent=save.sound?'◖ 声音开':'◌ 声音关'
}
function shop(){
  const offers=[['玩具锤',0,'横扫'],['黄瓜棒',9,'攻速快'],['糖葫芦',15,'范围大']];
  const choices=offers.map(([name,price,detail])=>[save.weapon===name?'✓ '+name+' · '+detail:save.owned.includes(name)?'装备 '+name:name+' · '+price+' 金币 · '+detail,()=>{
    if(!save.owned.includes(name)){if(save.coins<price)return;save.coins-=price;save.owned.push(name)}
    save.weapon=name;persist();W.equip(name);shop()
  },save.weapon===name||!save.owned.includes(name)&&save.coins<price]);
  const cost=8+save.skill*5;
  choices.push([save.skill>=3?'巡查耐力已满':'训练耐力 '+save.skill+'/3 · '+cost+' 金币',()=>{if(save.coins>=cost&&save.skill<3){save.coins-=cost;save.skill++;persist();shop()}},save.skill>=3||save.coins<cost]);
  if(save.skill>0){
    for(const [id,text] of [['magic','回声魔法 · 更快循声 / 每隔六秒范围挥击'],['bird','站务鸽 · 跟随巡查 / 定时补能']]){
      choices.push([(save.talent===id?'✓ ':save[id]?'启用 ':'解锁 · 12 金币　')+text,()=>{
        if(!save[id]){if(save.coins<12)return;save.coins-=12;save[id]=true}
        save.talent=id;persist();shop()
      },save.talent===id||!save[id]&&save.coins<12])
    }
  }
  choices.push(['返回车站',close]);
  options('巡查装备室','金币 '+save.coins,'耐力提高回能速度；一级耐力解锁回声魔法和站务鸽两条分支。',choices)
}
function mark(o,txt,cl=''){const b=document.createElement('button');b.className='marker '+cl;b.textContent=txt;b.setAttribute('aria-label',txt);b.onpointerdown=e=>e.stopPropagation();b.onclick=()=>{if(state==='play')walkTo(o)};$('marks').append(b);o.el=b}
function addObj(kind,name,pos,mesh,height=1,tint=''){
  const o={kind,name,x:pos[0],z:pos[1],mesh,height,used:false};W.place(mesh,o.x,o.z);mesh.rotation.y=rand(-.18,.55);objects.push(o);mark(o,name,tint);return o
}
function floating(text,x,z,height=1.15,life=.75){const el=document.createElement('span');el.className='float';el.textContent=text;$('marks').append(el);fx.push({el,x,z,height,age:0,life})}
function instruction(txt,sec=3){$('hint').textContent=txt;tipUntil=elapsed+sec}
function begin(id){
  unlock();clearMarks();stopInput();close();mode=id;state='play';elapsed=0;left=modes[id][2];kills=0;inspected=0;energy=100;beat=1;cool=0;hit=0;spawn=.2;combo=0;proofs=[];
  p={x:.3,z:.35,yaw:.48};W.buildStage(id);W.equip(save.weapon);bird=save.talent==='bird'?W.bird():null;talentClock=3;W.snap();$('home').hidden=true;$('hud').hidden=false;$('modeName').textContent=modes[id][1];$('toast').textContent='';
  const spots=shuffle(positions).map(([x,z])=>[x+rand(-.28,.28),z+rand(-.2,.2)]);
  if(id==='search'){
    const names=shuffle(['行李箱','报刊架','长椅','旅行包','花盆']);
    names.forEach((n,i)=>addObj('search',n,spots[i],W.prop(n,i),n==='长椅'?.85:1.0));
    target=objects[Math.floor(Math.random()*objects.length)];
    instruction('拖动走路，点摆设翻找；音符会泄露方向',5)
  }else if(id==='case'){
    const cs=shuffle(Object.keys(colors)),items=shuffle(['帽子','挎包','手机']);
    const looks=shuffle([[cs[0],items[0]],[cs[0],items[1]],[cs[1],items[0]]]);
    const names=shuffle(['阿栗','小陶','阿澄','米米','小伍']);
    looks.forEach(([color,item],i)=>{const o=addObj('suspect',names[i],spots[i],W.person(color,item,i),1.5);Object.assign(o,{color,item});if(color===cs[0]&&item===items[0])culprit=o});
    addObj('proof','查监控',spots[3],W.prop('报刊架',2),1.13,'clue').fact='监控画面：插队的人穿'+colors[cs[0]]+'外套。';
    addObj('proof','问目击者',spots[4],W.person('green','手机',2),1.5,'clue').fact='站务员：插队的人'+({帽子:'戴着帽子',挎包:'背着挎包',手机:'手里拿着手机'})[items[0]]+'。';
    instruction('有人插队还不承认！先查监控，再问站务员',5)
  }else{instruction('拖动走位，靠近自动挥锤；捡起金星回能',5)}
  hud()
}
function walkTo(o){if(!o||state!=='play')return;unlock();stopInput();queued=o;
  if(dist(p,o)<1.10)interact(o);else instruction('小狗正在赶往'+o.name,1.3)}
function nearest(){let best=null;for(const o of objects)if(!best||dist(p,o)<dist(p,best))best=o;return best}
function fightAt(o){if(chase)return;queued=null;const mesh=o.kind==='suspect'?o.mesh:W.place(W.person('red','手机',0),o.x+.25,o.z+.18);
  chase={mesh,x:o.x,z:o.z,count:0,next:0};for(const item of objects)item.el.hidden=true;instruction('找到了！小狗出锤！',2);tone(720,.13)}
function interact(o){
  queued=null;if(!o||chase||state!=='play')return;
  if(o.kind==='search'){
    if(o===target){fightAt(o);return}
    if(!o.used){inspected++;o.used=true;o.el.classList.add('used');o.el.textContent='✓ '+o.name}
    tone(230,.09);instruction(o.name+'里没响动。顺着冒出的音符找。',2.5)
  }else if(o.kind==='proof'){
    if(!o.used){proofs.push(o.fact);o.used=true;o.el.classList.add('used');o.el.textContent='✓ '+o.name;tone(610,.13)}
    state='talk';options('巡查手帐','证据 '+proofs.length+'/2',o.fact,[['记下了',resume]]);hud()
  }else if(o.kind==='suspect'){
    state='talk';const item=({帽子:'戴帽子',挎包:'背挎包',手机:'拿手机'})[o.item];
    const choices=[['继续调查',resume]];if(proofs.length===2)choices.unshift(['指认'+o.name,()=>{resume();if(o===culprit)fightAt(o);else{left=Math.max(0,left-8);instruction('特征对不上！扣 8 秒，再对照两条证据。',4);tone(125,.19)}}]);
    options('乘客口供',o.name+' · '+colors[o.color]+'外套','眼前这位乘客'+item+'，说：“我一直好好排着队！”'+(proofs.length?'\n\n'+proofs.join('\n'):'\n\n先找到两条独立证据。'),choices)
  }
  hud()
}
function resume(){close();state='play';stopInput()}
function finish(win){
  if(state!=='play')return;state='result';stopInput();const earned=mode==='rush'?3+Math.min(18,kills):win?8:0;
  save.coins+=earned;save.rounds++;persist();tone(win?700:160,.18);hud();
  const next=mode==='search'?'rush':mode==='rush'?'case':'search';
  const title=win?(mode==='rush'?'站台清静啦！':mode==='search'?'外放者戴上了耳机！':'插队者乖乖排队！'):'末班车开走了';
  const result=mode==='rush'?'这一班制止了 '+kills+' 次喧闹。':win?'用时 '+Math.ceil(elapsed)+' 秒。':'线索重新洗牌，再巡查一次。';
  options('巡查结算',title,result+'\n本次金币 +'+earned+'　钱包 '+save.coins,[['下一站 · '+modes[next][0],()=>begin(next)],['再玩这关',()=>begin(mode)],['返回车站',home]])
}
function addMob(){
  if(mobs.length>=15)return;let x,z;
  for(let i=0;i<10;i++){const side=Math.floor(rand(0,4));x=side===0?-5.75:side===1?5.75:rand(-5.6,5.6);z=side===2?-2.95:side===3?4.30:rand(-2.9,4.3);if(Math.hypot(x-p.x,z-p.z)>3.4)break}
  const variant=Math.floor(rand(0,5)), mesh=W.person('crowd','',variant);const hp=elapsed>24&&Math.random()<.50?2:1;
  mobs.push({x,z,mesh,hp,speed:rand(.58,.97)+elapsed*.015,phase:rand(0,6),bump:0});W.place(mesh,x,z)
}
function drop(x,z){const el=document.createElement('span');el.className='float';el.textContent='✦';$('marks').append(el);drops.push({x,z,el,age:0})}
function attack(magic=false){
  if(state!=='play'||!magic&&(cool>0||energy<10))return false;
  const reach=magic?3.15:(save.weapon==='糖葫芦'?2.28:1.72)+(kills>=6?.28:0);
  const targets=mobs.filter(m=>dist(p,m)<reach);if(!targets.length)return false;
  if(!magic)energy-=10;else floating('汪——！',p.x,p.z,1.7);
  cool=save.weapon==='黄瓜棒'?.36:.55;hit=.38;tone(250,.07,'sawtooth',.018);
  for(const m of targets){m.hp--;floating(m.hp?'砰':'啪！',m.x,m.z);if(m.hp<=0){kills++;drop(m.x,m.z);W.dispose(m.mesh)}else{const d=dist(p,m)||1;m.x+=(m.x-p.x)/d*.55;m.z+=(m.z-p.z)/d*.55}}
  mobs=mobs.filter(m=>m.hp>0);
  if(kills>=6&&!combo){combo=1;instruction('连战升级！挥击范围扩大',3);tone(810,.18)}
  return true
}
function survival(dt){
  spawn-=dt;if(spawn<=0){addMob();spawn=Math.max(.32,1.02-elapsed*.016)}
  for(const m of mobs){const d=dist(p,m)||.001;m.bump=Math.max(0,m.bump-dt);
    if(d>.47){m.x+=(p.x-m.x)/d*m.speed*dt;m.z+=(p.z-m.z)/d*m.speed*dt}
    if(d<.62&&!m.bump){energy=Math.max(0,energy-5);m.bump=2;}
    W.place(m.mesh,m.x,m.z);m.mesh.position.y=Math.abs(Math.sin(elapsed*6+m.phase))*.055;m.mesh.rotation.y=Math.atan2(p.x-m.x,p.z-m.z)
  }
  for(const d of drops){d.age+=dt;if(dist(p,d)<1.25){energy=Math.min(100,energy+12);d.age=20;tone(580,.045,'sine',.013)}
    const q=W.project(d.x,.4+Math.sin(elapsed*4)*.08,d.z);d.el.style.left=q.x+'px';d.el.style.top=q.y+'px';if(d.age>9)d.el.remove()}
  drops=drops.filter(d=>d.age<=9);attack()
}
function scan(dt){
  if(chase){
    chase.next-=dt;if(chase.next<=0){if(chase.count>=3){finish(true);return}
      hit=.36;energy=Math.max(0,energy-9);chase.count++;chase.next=.48;floating(['砰！','咚！','收工！'][chase.count-1],chase.x,chase.z,1.35);tone(180+chase.count*100,.1,'triangle')}
    chase.mesh.rotation.z=Math.sin(chase.next*15)*.18;return
  }
  if(mode==='search'){beat-=dt;if(beat<=0){const d=dist(p,target);beat=clamp(d*.31,.6,2)*(save.talent==='magic'?.6:1);
    floating('♫',target.x+rand(-.45,.45),target.z+rand(-.45,.45),1.34,.8);tone(520,.12,'square',clamp(.052/(1+d*.6),.006,.035))}}
}
function hud(){
  if(!p)return;$('objective').textContent=mode==='rush'?'尽量多制止喧闹':mode==='search'?'循着铃声找出外放者':'找出插队还说谎的乘客';
  $('time').textContent='◷ '+Math.ceil(Math.max(0,left))+'s';$('status').textContent=mode==='rush'?'制止 '+kills:mode==='search'?'已排除 '+inspected:'证据 '+proofs.length+'/2';
  $('energy').firstElementChild.style.width=energy+'%';$('act').textContent=mode==='rush'?'挥锤':'调查';
  if(elapsed>tipUntil)$('hint').textContent=mode==='rush'?(energy<18?'捡金星或拉开距离回能':'靠近自动挥锤 · 金星回能'):mode==='search'?'留意音符，点可疑摆设翻找':proofs.length<2?'点绿色线索搜证':'点乘客，对照证据指认'
}
function stopInput(){keys.clear();axis.x=axis.y=0;joy=null;queued=null;$('stick').firstElementChild.style.transform=''}
function move(dt){
  let dx=axis.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=axis.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  let wx=dx*W.right.x+dy*W.down.x,wz=dx*W.right.z+dy*W.down.z;
  if(Math.hypot(dx,dy)>.06)queued=null;else if(queued){
    const d=dist(p,queued);if(d<(queued.kind==='floor'?.14:1.03)){const o=queued;queued=null;if(o.kind!=='floor')interact(o);return false}
    wx=(queued.x-p.x)/d;wz=(queued.z-p.z)/d
  }
  const len=Math.hypot(wx,wz);if(len<.06)return false;const speed=dt*3.85/Math.max(1,len);p.x=clamp(p.x+wx*speed,-5.8,5.8);p.z=clamp(p.z+wz*speed,-2.90,4.45);p.yaw=Math.atan2(wx,wz);return true
}
function placeMarks(dt){
  for(const o of objects){const q=W.project(o.x,o.height+.12,o.z);o.el.style.left=clamp(q.x,25,innerWidth-25)+'px';o.el.style.top=clamp(q.y,112,innerHeight-112)+'px'}
  for(const f of fx){f.age+=dt;const q=W.project(f.x,f.height+f.age*.75,f.z);f.el.style.left=q.x+'px';f.el.style.top=q.y+'px';f.el.style.opacity=Math.min(1,(f.life-f.age)*4);if(f.age>=f.life)f.el.remove()}
  fx=fx.filter(f=>f.age<f.life)
}
function pause(){
  if(state!=='play')return;state='pause';options('巡查暂停',modes[mode][0],mode==='case'&&proofs.length?proofs.join('\n'):'拖动走路，或点地面前往。电脑也可用方向键和空格。',[['继续巡查',resume],['重新开始',()=>begin(mode)],['返回车站',home]])
}
const scene=$('scene');
scene.onpointerdown=e=>{if(state!=='play')return;unlock();scene.setPointerCapture(e.pointerId);joy={id:e.pointerId,x:e.clientX,y:e.clientY,drag:false}}
scene.onpointermove=e=>{if(!joy||joy.id!==e.pointerId)return;const dx=e.clientX-joy.x,dy=e.clientY-joy.y,d=Math.hypot(dx,dy);if(d>6)joy.drag=true;if(joy.drag){const scale=Math.max(33,d);axis={x:dx/scale,y:dy/scale};$('stick').firstElementChild.style.transform='translate('+axis.x*17+'px,'+axis.y*17+'px)'}}
scene.onpointerup=e=>{if(!joy||joy.id!==e.pointerId)return;const tap=!joy.drag;stopInput();if(tap&&state==='play'){
  const q=W.ground(e.clientX,e.clientY);if(!q)return;const nearby=objects.filter(o=>Math.hypot(q.x-o.x,q.z-o.z)<.9).sort((a,b)=>Math.hypot(q.x-a.x,q.z-a.z)-Math.hypot(q.x-b.x,q.z-b.z))[0];
  if(nearby)walkTo(nearby);else queued={kind:'floor',x:clamp(q.x,-5.8,5.8),z:clamp(q.z,-2.9,4.45)}
}}
scene.onpointercancel=stopInput;
function action(){if(state!=='play')return;if(mode==='rush'){if(!attack())instruction(energy<10?'能量不足，捡金星回能':'靠近喧闹乘客再挥锤',1.4)}else{const n=nearest();if(n)walkTo(n)}}
$('act').onclick=action;$('pause').onclick=pause;$('shop').onclick=shop;
$('sound').onclick=()=>{save.sound=!save.sound;persist();unlock();$('sound').textContent=save.sound?'◖ 声音开':'◌ 声音关';tone()};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>begin(b.dataset.mode));
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(state==='play'&&['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','escape'].includes(k)){e.preventDefault();keys.add(k);if(!e.repeat&&k===' ')action();if(k==='escape')pause()}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{stopInput();pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
let last=performance.now();function loop(ts){
  const wall=Math.max(0,(ts-last)/1000),dt=Math.min(.08,wall);last=ts;let moving=false;
  if(state==='play'){elapsed+=wall;left-=wall;hit=Math.max(0,hit-dt);cool=Math.max(0,cool-dt);energy=Math.min(100,energy+dt*(9+save.skill*2));
    if(!chase)moving=move(dt);if(state==='play'){
      talentClock-=dt;
      if(bird){bird.position.set(p.x-.7,1.22+Math.sin(elapsed*5)*.13,p.z+.18);bird.rotation.y=p.yaw;
        if(talentClock<=0){energy=Math.min(100,energy+18);talentClock=5;floating('补给',p.x-.6,p.z,1.5)}}
      else if(save.talent==='magic'&&mode==='rush'&&talentClock<=0){attack(true);talentClock=6}
      if(mode==='rush')survival(dt);else scan(dt);if(left<=0&&state==='play'&&!chase)finish(mode==='rush');hud()}}
  W.animate(state==='home'||state==='play'?dt:0,p,moving,Math.min(1,hit/.38),save.weapon);if(state!=='home')placeMarks(state==='play'?dt:0);
  if(ts>toastUntil&&$('toast').textContent)$('toast').textContent='';requestAnimationFrame(loop)
}
home();requestAnimationFrame(loop)
})();

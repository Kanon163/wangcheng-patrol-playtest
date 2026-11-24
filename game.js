(() => {
'use strict';
const $=id=>document.getElementById(id), W=World;
const modes={search:['寻找外放者','听声翻找',65],rush:['街区大巡查','街区巡逻',65],case:['谁在撒谎','调查现场',85]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), rand=(a,b)=>a+Math.random()*(b-a);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key='wangcheng-patrol-v1',defaults={coins:0,owned:['玩具锤'],weapon:'玩具锤',skill:0,talent:null,rounds:0,sound:true,breed:'shiba',wardrobe:['scarf'],wear:{}};
let save;try{save={...defaults,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{save={...defaults}}
function persist(){try{localStorage.setItem(key,JSON.stringify(save))}catch{}}
const colors={red:'橘色',blue:'海水蓝',green:'青草绿'};
let state='home', mode, p, objects=[], mobs=[], drops=[], fx=[], elapsed=0,left=0,kills=0,energy=100,hit=0,cool=0,spawn=0,beat=0, target=null, inspected=0, proofs=[], culprit, chase=null, combo=0,queued=null,now=0,toastUntil=0,tipUntil=0;
let district,order=100,mistakes=0,arrivals=0,zoneIndex=1,zoneClock=0,route=[],routeTarget=null;
let audio,joy=null,axis={x:0,y:0},keys=new Set(),bird=null,talentClock=0;
function tone(freq=390,len=.08,kind='triangle',vol=.035){
  if(window.patrolHost){if(save.sound)window.patrolHost.playTone(freq,vol);return}
  if(!save.sound||!audio||audio.state!=='running')return;
  const o=audio.createOscillator(),g=audio.createGain();o.type=kind;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(70,freq*.74),audio.currentTime+len);
  g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+len)
}
function unlock(){if(!save.sound||window.patrolHost)return;try{audio ||=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}}
function notice(s){$('toast').textContent=s;toastUntil=performance.now()+1500}
function options(stamp,title,desc,choices){
  stopInput();$('stamp').textContent=stamp;$('dialogTitle').textContent=title;$('desc').textContent=desc;$('options').replaceChildren();
  choices.forEach(([label,cb,disabled,art])=>{const b=document.createElement('button');b.textContent=label;b.disabled=!!disabled;if(art){b.dataset.art=art;b.className='art-choice';b.style.backgroundImage='url("art/'+art+'.png")'}b.onclick=()=>{unlock();cb()};$('options').append(b)});$('modal').hidden=false
}
function close(){ $('modal').hidden=true; }
function clearMarks(){for(const o of [...objects,...fx,...drops])o.el?.remove();objects=[];mobs=[];drops=[];fx=[];chase=null;target=null;queued=null;$('marks').replaceChildren()}
function home(){
  clearMarks();stopInput();close();state='home';$('home').hidden=false;$('hud').hidden=true;$('toast').textContent='';
  W.buildStage('home');W.outfit(save.breed,save.wear);W.equip(save.weapon);W.snap();$('sound').textContent=save.sound?'◖ 声音开':'◌ 声音关'
}
function dressed(){persist();W.outfit(save.breed,save.wear);W.equip(save.weapon)}
function locker(){options('汪城巡查队','我的巡查员',Paper.breeds[save.breed]+'　·　钱包 '+save.coins+' 金币',[
  ['选择小狗',breeds],['换装衣柜',wardrobe],['武器与成长',shop],['返回主页',close]])}
function breeds(){options('巡查队员','选择小狗','四位队员都可以直接出勤。',Object.entries(Paper.breeds).map(([id,name])=>[
  (save.breed===id?'✓ ':'')+name,()=>{save.breed=id;dressed();close();notice(name+'出勤！')},false,id]).concat([['返回',locker]]))}
function wardrobe(){options('纸片衣柜','穿戴与购买','钱包 '+save.coins+' 金币　·　薄荷领巾已赠送',Object.entries(Paper.gear).map(([id,[name,slot,cost]])=>{
  const owned=save.wardrobe.includes(id),on=save.wear[slot]===id;
  return [(on?'卸下 ':owned?'穿戴 ':'')+name+(owned?'':' · '+cost+' 金币'),()=>{
    if(!owned){if(save.coins<cost)return;save.coins-=cost;save.wardrobe.push(id)}
    if(on)delete save.wear[slot];else save.wear[slot]=id;dressed();wardrobe()
  },!owned&&save.coins<cost,id]
}).concat([['穿好出勤',close],['返回',locker]]))}
function shop(){
  const offers=[['玩具锤',0,'横扫'],['黄瓜棒',9,'攻速快'],['糖葫芦',15,'范围大']];
  const choices=offers.map(([name,price,detail])=>[save.weapon===name?'✓ '+name+' · '+detail:save.owned.includes(name)?'装备 '+name:name+' · '+price+' 金币 · '+detail,()=>{
    if(!save.owned.includes(name)){if(save.coins<price)return;save.coins-=price;save.owned.push(name)}
    save.weapon=name;persist();W.equip(name);shop()
  },save.weapon===name||!save.owned.includes(name)&&save.coins<price]);
  const cost=8+save.skill*5;
  choices.push([save.skill>=3?'巡查耐力已满':'训练耐力 '+save.skill+'/3 · '+cost+' 金币',()=>{if(save.coins>=cost&&save.skill<3){save.coins-=cost;save.skill++;persist();shop()}},save.skill>=3||save.coins<cost]);
  if(save.skill>0){
    for(const [id,text] of [['magic','回声魔法 · 更快循声 / 每六秒强化一次劝阻'],['bird','巡查鸽 · 跟随巡查 / 定时补能']]){
      choices.push([(save.talent===id?'✓ ':save[id]?'启用 ':'解锁 · 12 金币　')+text,()=>{
        if(!save[id]){if(save.coins<12)return;save.coins-=12;save[id]=true}
        save.talent=id;persist();shop()
      },save.talent===id||!save[id]&&save.coins<12])
    }
  }
  choices.push(['返回',locker]);
  options('巡查装备室','金币 '+save.coins,'耐力提高回能速度；一级耐力解锁回声魔法和巡查鸽两条分支。',choices)
}
function mark(o,txt,cl=''){const b=document.createElement('button');b.className='marker '+cl;b.textContent=txt;b.setAttribute('aria-label',txt);b.onpointerdown=e=>e.stopPropagation();b.onclick=()=>{if(state==='play')walkTo(o)};$('marks').append(b);o.el=b}
function addObj(kind,name,pos,mesh,height=1,tint=''){
  const o={kind,name,x:pos[0],z:pos[1],mesh,height,used:false};W.place(mesh,o.x,o.z);if(!mesh.userData.paper)mesh.rotation.y=rand(-.18,.55);objects.push(o);mark(o,name,tint);return o
}
function floating(text,x,z,height=1.15,life=.75){const el=document.createElement('span');el.className='float';el.textContent=text;$('marks').append(el);fx.push({el,x,z,height,age:0,life})}
function instruction(txt,sec=3){$('hint').textContent=txt;tipUntil=elapsed+sec}
function begin(id){
  unlock();clearMarks();stopInput();close();mode=id;state='play';elapsed=0;left=modes[id][2];kills=0;inspected=0;energy=100;beat=1;cool=0;hit=0;spawn=.2;combo=0;proofs=[];
  p={x:0,z:0,yaw:.48};district=W.buildStage(id);order=100;mistakes=0;arrivals=0;zoneIndex=1;zoneClock=15;[p.x,p.z]=Districts.free(0,0);W.equip(save.weapon);bird=save.talent==='bird'?W.bird():null;talentClock=3;W.snap();$('home').hidden=true;$('hud').hidden=false;$('modeName').textContent=district.name+' · '+modes[id][1];$('toast').textContent='';
  const spots=shuffle([[-9,-5],[-4,3],[.6,-.4],[5,5],[10,-3],[2,9]]).map(([x,z])=>Districts.free(x+rand(-1,1),z+rand(-.8,.8)));
  if(id==='search'){
    const names=shuffle(district.items);
    names.forEach((n,i)=>addObj('search',n,spots[i],W.prop(n,i),n==='长椅'?.85:1.0));
    target=objects[Math.floor(Math.random()*objects.length)];
    instruction('拖动走路，点摆设翻找；音符会泄露方向',5)
  }else if(id==='case'){
    const profiles=shuffle([['red','背着邮包','recycle'],['blue','戴着耳机','listen'],['green','抱着书','quiet']]);
    const names=shuffle(['阿栗','小陶','阿澄','米米','小伍']);
    profiles.forEach(([color,item,art],i)=>{const o=addObj('suspect',names[i],spots[i],W.citizen(art),2);Object.assign(o,{color,item})});
    culprit=objects[Math.floor(Math.random()*3)];
    const other=objects.find(o=>o!==culprit);
    addObj('proof','查监控',spots[3],W.prop('报刊架',2),1.2,'clue').fact='监控反光，外套只看得出是'+shuffle([colors[culprit.color],colors[other.color]]).join('或')+'。';
    addObj('proof','问目击者',spots[4],W.citizen('quiet'),2,'clue').fact='目击者：“'+other.item+'的那位一直排在我身后，我可以替这位作证。”';
    instruction('有人插队！点线索搜证，点名字问话。',5)
  }else{for(let i=0;i<6;i++)addMob(true);instruction('看动作，点捣乱的人。守住秩序 65 秒。',5)}
  hud()
}
function walkTo(o){if(!o||state!=='play')return;unlock();stopInput();queued=o;
  if(dist(p,o)<1.10)interact(o);else instruction('小狗正在赶往'+o.name,1.3)}
function nearest(){let best=null;for(const o of objects)if(!best||dist(p,o)<dist(p,best))best=o;return best}
function fightAt(o){if(chase)return;queued=null;const mesh=o.kind==='suspect'?o.mesh:W.place(W.citizen('speaker'),o.x+.25,o.z+.18);
  chase={mesh,x:o.x,z:o.z,count:0,next:0};for(const item of objects)item.el.hidden=true;instruction('找到了！小狗出锤！',2);tone(720,.13)}
function interact(o){
  queued=null;if(!o||chase||state!=='play')return;if(o.kind==='pedestrian'){attack(o);return}
  if(o.kind==='search'){
    if(o===target){fightAt(o);return}
    if(!o.used){inspected++;o.used=true;o.el.classList.add('used');o.el.textContent='✓ '+o.name}
    tone(230,.09);instruction(o.name+'里没响动。顺着冒出的音符找。',2.5)
  }else if(o.kind==='proof'){
    if(!o.used){proofs.push(o.fact);o.used=true;o.el.classList.add('used');o.el.textContent='✓ '+o.name;tone(610,.13)}
    state='talk';options('巡查手帐','证据 '+proofs.length+'/2',o.fact,[['记下了',resume]]);hud()
  }else if(o.kind==='suspect'){
    state='talk';const item=o.item;
    const choices=[['继续调查',resume]];if(proofs.length===2)choices.unshift(['指认'+o.name,()=>{resume();if(o===culprit)fightAt(o);else{left=Math.max(0,left-8);instruction('特征对不上！扣 8 秒，再对照两条证据。',4);tone(125,.19)}}]);
    options('现场口供',o.name+' · '+colors[o.color]+'外套','眼前这位路人'+item+'，说：“我一直好好排着队！”'+(proofs.length?'\n\n'+proofs.join('\n'):'\n\n先找到两条独立证据。'),choices)
  }
  hud()
}
function resume(){close();state='play';stopInput()}
function finish(win){
  if(state!=='play')return;state='result';stopInput();const earned=mode==='rush'?Math.max(0,Math.min(24,kills*2)-mistakes):win?8:0;
  save.coins+=earned;save.rounds++;persist();tone(win?700:160,.18);hud();
  const next=mode==='search'?'rush':mode==='rush'?'case':'search';
  const title=win?(mode==='rush'?'本次巡查结束':mode==='search'?'外放者戴上了耳机！':'插队者乖乖排队！'):mode==='rush'?'街区秩序失守':'巡查时间到';
  const result=mode==='rush'?'制止 '+kills+' 次，误劝 '+mistakes+' 次。每次制止得 2 金币，误劝扣 1。':win?'用时 '+Math.ceil(elapsed)+' 秒。':'线索重新洗牌，再巡查一次。';
  const choices=[['下一站 · '+modes[next][0],()=>begin(next)],['再玩这关',()=>begin(mode)],['返回主页',home]];
  let bonus=false,pending=false;
  function receipt(){
    const actions=[...choices];
    if(earned>0&&window.patrolHost?.watchReward&&!bonus)actions.push(['▶ 看广告再领 '+earned+' 金币',async()=>{
      if(pending||bonus)return;pending=true;
      options('巡查结算','广告加载中','完成后可领取额外金币。',[]);
      try{if(await window.patrolHost.watchReward()){bonus=true;save.coins+=earned;persist()}else notice('已保留基础金币')}
      catch{notice('广告暂不可用，基础金币已保留')}
      finally{pending=false;receipt()}
    }]);
    options('巡查结算',title,result+'\n本次金币 +'+earned+(bonus?'　广告奖励 +'+earned:'')+'　钱包 '+save.coins,actions)
  }
  receipt()
}
const behaviorNames=['丢纸团','音响外放','举喇叭喊','送纸团回收','戴耳机听歌','示意安静'];
function addMob(opening=false){
  const [cx,cz]=Districts.zones[zoneIndex],i=arrivals++;
  const angle=opening?i*Math.PI/3+Math.random()*.3:rand(0,Math.PI*2),r=opening?rand(2.1,3.8):rand(3,7);
  const [x,z]=Districts.free(clamp(cx+Math.cos(angle)*r,-21,21),clamp(cz+Math.sin(angle)*r,-14,14));
  const type=opening?i%3:Math.floor(rand(0,3)),bad=opening?i%2===0:Math.random()<.58;
  const mesh=W.citizen(Paper.behaviors[type+(bad?0:3)]);
  const m={kind:'pedestrian',name:'这位路人',mesh,x,z,type,bad,age:0,lifetime:rand(13,20),phase:rand(0,6),vx:Math.cos(angle+.9),vz:Math.sin(angle+.9),speed:rand(.17,.37)*(1+elapsed/75),resolved:0};
  mobs.push(m);W.place(mesh,x,z)
}
function drop(x,z){const el=document.createElement('span');el.className='float';el.textContent='✦';$('marks').append(el);drops.push({x,z,el,age:0})}
function attack(m){
  if(!m||m.resolved||state!=='play')return false;
  if(cool>0||energy<10){instruction(energy<10?'歇一下，或捡金星回能':'等小狗收锤再点',1);return false}
  const magic=save.talent==='magic'&&talentClock<=0;
  if(magic)talentClock=6;else energy-=10;
  cool=save.weapon==='黄瓜棒'?.34:.52;hit=.38;m.resolved=1.8;
  if(m.bad){m.bad=false;order=Math.min(100,order+5);kills++;drop(m.x,m.z);W.dispose(m.mesh);m.mesh=W.place(W.citizen(Paper.behaviors[m.type+3]),m.x,m.z);
    floating(magic?'回声汪！':['捡起来啦','戴上耳机','收起喇叭'][m.type],m.x,m.z,1.8);tone(635,.09);
    if(kills===6){combo=1;instruction('六次劝阻！小狗的挥击距离增加了。',3)}
  }else{mistakes++;order=Math.max(0,order-6);energy=Math.max(0,energy-12);floating('误会啦！',m.x,m.z,1.8);instruction('误劝：对方正在'+behaviorNames[m.type+3]+'。',2.3);tone(155,.18)}
  return true
}
function survival(dt){
  spawn-=dt;zoneClock-=dt;
  if(zoneClock<=0){zoneIndex=(zoneIndex+1)%3;zoneClock=16;instruction('新的巡查点：'+district.landmarks[zoneIndex],2.3)}
  if(spawn<=0){addMob();spawn=Math.max(.48,1.05-elapsed*.009)}
  for(const m of mobs){
    m.age+=dt;
    if(m.resolved){m.resolved-=dt;if(m.resolved<=0)m.age=m.lifetime+1}
    else{const x=m.x+m.vx*m.speed*dt,z=m.z+m.vz*m.speed*dt;if(Districts.clear(x,z)){m.x=x;m.z=z}else{m.vx*=-1;m.vz*=-1}}
    W.place(m.mesh,m.x,m.z);m.mesh.userData.paper.position.y=Math.abs(Math.sin(elapsed*4+m.phase))*.055;
    if(m.age>m.lifetime){if(m.bad)order=Math.max(0,order-3);if(queued===m)queued=null;W.dispose(m.mesh)}
  }
  mobs=mobs.filter(m=>m.age<=m.lifetime);if(order<=0){finish(false);return}
  for(const d of drops){d.age+=dt;if(dist(p,d)<1.3){energy=Math.min(100,energy+12);d.age=20;tone(580,.045,'sine',.013)}
    const q=W.project(d.x,.4+Math.sin(elapsed*4)*.08,d.z);d.el.style.left=q.x+'px';d.el.style.top=q.y+'px';if(d.age>9)d.el.remove()}
  drops=drops.filter(d=>d.age<=9)
}
function direction(x,z){
  const dx=x-p.x,dz=z-p.z,screenX=dx*W.right.x+dz*W.right.z,screenY=dx*W.down.x+dz*W.down.z;
  return ['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(screenY,screenX)/(Math.PI/4))+8)%8]
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
  if(!p)return;$('objective').textContent=mode==='rush'?district.landmarks[zoneIndex]+' '+(Math.hypot(p.x-Districts.zones[zoneIndex][0],p.z-Districts.zones[zoneIndex][1])<3?'· 巡查中':direction(...Districts.zones[zoneIndex])):mode==='search'?'循着铃声找出外放者':'找出插队还说谎的人';
  $('time').textContent='◷ '+Math.ceil(Math.max(0,left))+'s';$('status').textContent=mode==='rush'?'秩序 '+order+' · 制止 '+kills:mode==='search'?'已排除 '+inspected:'证据 '+proofs.length+'/2';
  $('energy').firstElementChild.style.width=energy+'%';$('act').textContent=mode==='rush'?'劝阻':'调查';
  if(elapsed>tipUntil)$('hint').textContent=mode==='rush'?(energy<18?'捡金星或拉开距离回能':'点捣乱的人 · 漏劝和误劝会降低秩序'):mode==='search'?'声源 '+direction(target.x,target.z)+'　·　点摆设翻找':proofs.length<2?'线索 '+direction(...(()=>{const o=objects.find(o=>o.kind==='proof'&&!o.used);return [o.x,o.z]})())+'　·　点绿色标签搜证':'点名字，对照证据指认'
}
function stopInput(){keys.clear();axis.x=axis.y=0;joy=null;queued=null;route=[];routeTarget=null;$('stick').firstElementChild.style.transform=''}
function move(dt){
  let dx=axis.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=axis.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  let wx=dx*W.right.x+dy*W.down.x,wz=dx*W.right.z+dy*W.down.z;
  if(Math.hypot(dx,dy)>.06)queued=null;else if(queued){
    const d=dist(p,queued);if(d<(queued.kind==='floor'?.14:queued.kind==='pedestrian'?reach():1.03)){const o=queued;queued=null;if(o.kind!=='floor')interact(o);return false}
    if(routeTarget!==queued){route=Districts.route(p.x,p.z,queued.x,queued.z);routeTarget=queued}
    while(route.length&&Math.hypot(route[0][0]-p.x,route[0][1]-p.z)<.11)route.shift();
    const [tx,tz]=route[0]||[queued.x,queued.z],stride=Math.hypot(tx-p.x,tz-p.z)||1;
    wx=(tx-p.x)/stride;wz=(tz-p.z)/stride;
    if(route.length&&stride<dt*4.65){p.x=tx;p.z=tz;route.shift();return true}
  }
  const len=Math.hypot(wx,wz);if(len<.06)return false;const speed=dt*4.65/Math.max(1,len);const nextX=clamp(p.x+wx*speed,-22,22),nextZ=clamp(p.z+wz*speed,-15,15);
  if(Districts.clear(nextX,p.z))p.x=nextX;if(Districts.clear(p.x,nextZ))p.z=nextZ;p.yaw=Math.atan2(wx,wz);return true
}
function placeMarks(dt){
  for(const o of objects){const q=W.project(o.x,o.height+.12,o.z);o.el.hidden=!!chase||q.x<18||q.x>innerWidth-18||q.y<105||q.y>innerHeight-78;o.el.style.left=q.x+'px';o.el.style.top=q.y+'px'}
  for(const f of fx){f.age+=dt;const q=W.project(f.x,f.height+f.age*.75,f.z);f.el.style.left=q.x+'px';f.el.style.top=q.y+'px';f.el.style.opacity=Math.min(1,(f.life-f.age)*4);if(f.age>=f.life)f.el.remove()}
  fx=fx.filter(f=>f.age<f.life)
}
function pause(){
  if(state!=='play')return;state='pause';options('巡查暂停',modes[mode][0],mode==='case'&&proofs.length?proofs.join('\n'):'拖动走路，或点地面前往。电脑也可用方向键和空格。',[['继续巡查',resume],['重新开始',()=>begin(mode)],['返回主页',home]])
}
const scene=$('scene');
scene.onpointerdown=e=>{if(state!=='play')return;unlock();scene.setPointerCapture(e.pointerId);joy={id:e.pointerId,x:e.clientX,y:e.clientY,drag:false}}
scene.onpointermove=e=>{if(!joy||joy.id!==e.pointerId)return;const dx=e.clientX-joy.x,dy=e.clientY-joy.y,d=Math.hypot(dx,dy);if(d>6)joy.drag=true;if(joy.drag){const scale=Math.max(33,d);axis={x:dx/scale,y:dy/scale};$('stick').firstElementChild.style.transform='translate('+axis.x*17+'px,'+axis.y*17+'px)'}}
scene.onpointerup=e=>{if(!joy||joy.id!==e.pointerId)return;const tap=!joy.drag;stopInput();if(tap&&state==='play'){
  if(mode==='rush'){const target=mobs.filter(m=>!m.resolved&&W.hitsPaper(m,e.clientX,e.clientY)).sort((a,b)=>W.project(b.x,0,b.z).y-W.project(a.x,0,a.z).y)[0];
    if(target){walkTo(target);return}}
  const q=W.ground(e.clientX,e.clientY);if(!q)return;const nearby=objects.filter(o=>Math.hypot(q.x-o.x,q.z-o.z)<.9).sort((a,b)=>Math.hypot(q.x-a.x,q.z-a.z)-Math.hypot(q.x-b.x,q.z-b.z))[0];
  if(nearby)walkTo(nearby);else{const [x,z]=Districts.free(clamp(q.x,-22,22),clamp(q.z,-15,15));queued={kind:'floor',x,z}}
}}
scene.onpointercancel=stopInput;
function reach(){return (save.weapon==='糖葫芦'?2.3:1.6)+(combo?.28:0)}
function action(){if(state!=='play')return;if(mode==='rush'){
  const near=mobs.filter(m=>!m.resolved&&dist(m,p)<reach()).sort((a,b)=>dist(a,p)-dist(b,p))[0];
  if(near)attack(near);else instruction('点选路人，小狗会跑过去劝阻',1.6)
}else{const n=nearest();if(n)walkTo(n)}}
$('act').onclick=action;$('pause').onclick=pause;$('shop').onclick=locker;
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
      
      if(mode==='rush')survival(dt);else scan(dt);if(left<=0&&state==='play'&&!chase)finish(mode==='rush');hud()}}
  W.animate(state==='home'||state==='play'?dt:0,p,moving,Math.min(1,hit/.38),save.weapon);if(state!=='home')placeMarks(state==='play'?dt:0);
  if(ts>toastUntil&&$('toast').textContent)$('toast').textContent='';requestAnimationFrame(loop)
}
home();requestAnimationFrame(loop)
})();

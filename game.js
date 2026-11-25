(() => {
'use strict';
const $=id=>document.getElementById(id), W=World;
const modes={search:['寻找外放者','听声翻找',65],rush:['街区大巡查','街区巡逻',180],case:['谁在撒谎','调查现场',85]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), rand=(a,b)=>a+Math.random()*(b-a);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key='wangcheng-patrol-v1',defaults={coins:0,owned:['玩具锤'],weapon:'玩具锤',skill:0,talent:null,rounds:0,sound:true,music:true,stickScale:100,hammerScale:100,calm:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false,breed:'shiba',wardrobe:['scarf'],wear:{}};
let save;try{save={...defaults,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{save={...defaults}}
function persist(){try{localStorage.setItem(key,JSON.stringify(save))}catch{}}
const colors={red:'橘色',blue:'海水蓝',green:'青草绿'};
let state='home', mode, p, objects=[], mobs=[], drops=[], fx=[], elapsed=0,left=0,kills=0,energy=100,hit=0,cool=0,spawn=0,beat=0, target=null, inspected=0, proofs=[], culprit, chase=null, combo=0,queued=null,now=0,toastUntil=0,tipUntil=0;
let zoneHits=0,crowdDecks;
let district,order=100,mistakes=0,arrivals=0,zoneIndex=1,strike=null,freeze=0,impactPulse=0,impactPower=0,bufferSwing=false,route=[],routeTarget=null;
let audio,joy=null,axis={x:0,y:0},keys=new Set(),bird=null,talentClock=0;
function tone(freq=390,len=.08,kind='triangle',vol=.035){
  if(window.patrolHost){if(save.sound)window.patrolHost.playTone(freq,vol);return}
  if(!save.sound||!audio||audio.state!=='running')return;
  const o=audio.createOscillator(),g=audio.createGain();o.type=kind;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(70,freq*.74),audio.currentTime+len);
  g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+len)
}
const combatAudio=new Map();
let musicSource=null,musicGain=null,musicStart=0,musicOffset=0,hostMusic=false;
function loadSounds(){
  if(!audio)return;
  for(const name of ['swish','thump','knock','knock-deep','stamp','patrol-loop']){
    if(combatAudio.has(name))continue;combatAudio.set(name,null);
    fetch('art/'+name+(name==='patrol-loop'?'.mp3':'.wav')).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()})
      .then(data=>audio.decodeAudioData(data)).then(buffer=>combatAudio.set(name,buffer)).catch(()=>combatAudio.delete(name))
  }
}
function music(playing){
  const enabled=Boolean(playing&&save.music&&save.sound);
  if(window.patrolHost){if(enabled!==hostMusic){hostMusic=enabled;window.patrolHost.music?.(enabled)}return}
  const buf=combatAudio.get('patrol-loop');
  if(!enabled&&musicSource){musicOffset=(audio.currentTime-musicStart)%buf.duration;musicSource.stop();musicSource.disconnect();musicSource=null}
  if(!enabled||musicSource||!buf||audio.state!=='running')return;
  if(!musicGain){musicGain=audio.createGain();musicGain.connect(audio.destination)}
  musicGain.gain.setValueAtTime(.50,audio.currentTime);musicSource=audio.createBufferSource();
  musicSource.buffer=buf;musicSource.loop=true;musicSource.connect(musicGain);musicStart=audio.currentTime-musicOffset;musicSource.start(0,musicOffset)
}
function sfx(name){
  if(!save.sound)return;
  if(window.patrolHost){window.patrolHost.effect(name);return}
  const buffer=combatAudio.get(name);
  if(!buffer||!audio){tone(name==='swish'?470:150,.09,'triangle',.07);return}
  const source=audio.createBufferSource();source.buffer=buffer;
  if(name!=='stamp')source.playbackRate.value=.96+Math.random()*.08;
  source.connect(audio.destination);source.start();
  if(musicSource&&name!=='swish'){const g=musicGain.gain,t=audio.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(.26,t);g.linearRampToValueAtTime(.50,t+.22)}
}
function unlock(){if(!save.sound||window.patrolHost)return;try{audio ||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state!=='running')audio.resume().catch(()=>{});loadSounds()}catch{}}
function notice(s){$('toast').textContent=s;toastUntil=performance.now()+1500}
function options(stamp,title,desc,choices){
  stopInput();$('stamp').textContent=stamp;$('dialogTitle').textContent=title;$('desc').textContent=desc;$('options').replaceChildren();
  choices.forEach(([label,cb,disabled,art])=>{const b=document.createElement('button');b.textContent=label;b.disabled=!!disabled;if(art){b.dataset.art=art;b.className='art-choice';b.style.backgroundImage='url("art/'+art+'.png")'}b.onclick=()=>{unlock();cb()};$('options').append(b)});$('modal').hidden=false
}
function close(){ $('modal').hidden=true; }
function clearMarks(){for(const o of [...objects,...fx,...drops])o.el?.remove();objects=[];mobs=[];drops=[];fx=[];chase=null;target=null;queued=null;$('marks').replaceChildren()}
function home(){
  clearMarks();stopInput();close();state='home';$('home').hidden=false;$('hud').hidden=true;$('toast').textContent='';
  W.buildStage('home');W.outfit(save.breed,{});W.equip(save.weapon);W.snap();dogCards();layoutControls()
}
function dogCards(){
  const cards=$('dogs');cards.replaceChildren();
  for(const [id,name] of Object.entries(Paper.breeds)){
    const card=document.createElement('button');
    card.dataset.art=id;card.dataset.selected=String(save.breed===id);card.textContent=name;
    card.setAttribute('aria-pressed',String(save.breed===id));
    card.style.backgroundImage='url("art/'+id+'.png")';
    card.onclick=()=>{save.breed=id;dressed();dogCards();tone(520)};
    cards.append(card)
  }
}
const sizes=[60,80,100,110,120];
function controlSize(key){return sizes.includes(save[key])?save[key]:100}
function layoutControls(){
  const compact=innerWidth<=700||window.matchMedia?.('(pointer:coarse)').matches||window.patrolHost;
  const stick=(compact?192:134)*controlSize('stickScale')/100;
  const width=(compact?232:164)*controlSize('hammerScale')/100,height=(compact?152:98)*controlSize('hammerScale')/100;
  const fit=Math.min(1,(innerHeight*.48)/Math.max(stick,height), (innerWidth-20)/Math.max(width,stick));
  const diameter=Math.round(stick*fit),w=Math.round(width*fit),h=Math.round(height*fit);
  const margin=8, gap=8, dx=innerWidth-2*margin-(diameter+w)/2;
  const rx=(diameter+w)/2+gap, ry=(diameter+h)/2+gap;
  const lift=dx>=rx?0:Math.ceil((diameter-h)/2+ry*Math.sqrt(Math.max(0,1-(dx/rx)**2)));
  const pad=$('stick'),act=$('act');
  Object.assign(pad.style,{width:diameter+'px',height:diameter+'px',left:margin+'px'});
  Object.assign(act.style,{width:w+'px',height:h+'px',right:margin+'px',bottom:'calc(env(safe-area-inset-bottom) + '+(8+lift)+'px)'});
  act.dataset.lift=String(lift)
}
function settings(){
  const adjust=(label,key)=>[-1,1].map(dir=>{
    const i=sizes.indexOf(controlSize(key)),next=sizes[i+dir];
    return [(dir<0?'缩小':'放大')+label+' · '+sizes[i]+'%',()=>{save[key]=next;persist();layoutControls();settings()},next===undefined]
  });
  options('巡查站','设置','100% 为本版默认尺寸。',[
    ...adjust('摇杆','stickScale'),...adjust('挥锤键','hammerScale'),
    [save.sound?'游戏声音 · 开':'游戏声音 · 关',()=>{save.sound=!save.sound;persist();settings()}],
    [save.music?'背景音乐 · 开':'背景音乐 · 关',()=>{save.music=!save.music;persist();settings()}],
    [save.calm?'轻动效 · 开':'轻动效 · 关',()=>{save.calm=!save.calm;persist();settings()}],
    ['返回',state==='pause'?pause:close]])
}
function dressed(){persist();W.outfit(save.breed,{});W.equip(save.weapon)}
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
  choices.push(['返回',close]);
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
  p={x:0,z:0,yaw:.48};district=W.buildStage(id);order=100;mistakes=0;arrivals=0;zoneIndex=0;zoneHits=0;crowdDecks=[[],[]];strike=null;freeze=impactPulse=0;bufferSwing=false;[p.x,p.z]=id==='rush'?[-14.5,0]:Districts.free(0,0);if(id==='rush')p.yaw=Math.PI/2;W.equip(save.weapon);bird=save.talent==='bird'?W.bird():null;talentClock=3;W.snap(p);$('home').hidden=true;$('hud').hidden=false;$('modeName').textContent=district.name+' · '+modes[id][1];$('toast').textContent='';
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
  }else{for(let i=0;i<8;i++)addMob(true);addMob(false,true);instruction('到金圈附近，面对捣乱者按挥锤。穿过八站，集齐八枚巡章。',4)}
  hud()
}
function walkTo(o){if(!o||state!=='play')return;unlock();stopInput();queued=o;
  if(dist(p,o)<1.10)interact(o);else instruction('小狗正在赶往'+o.name,1.3)}
function nearest(){let best=null;for(const o of objects)if(!best||dist(p,o)<dist(p,best))best=o;return best}
function fightAt(o){if(chase)return;queued=null;const mesh=o.kind==='suspect'?o.mesh:W.place(W.citizen('speaker'),o.x+.25,o.z+.18);
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
  
  const title=win?(mode==='rush'?'全街巡查完成！':mode==='search'?'外放者戴上了耳机！':'插队者乖乖排队！'):mode==='rush'?(order<=0?'街区秩序失守':'收队时间到了'):'巡查时间到';
  const result=mode==='rush'?'巡章 '+zoneIndex+'/'+Street.checkpoints.length+'，制止 '+kills+' 次，误击 '+mistakes+' 次。':win?'用时 '+Math.ceil(elapsed)+' 秒。':'线索重新洗牌，再巡查一次。';
  const choices=[['再巡一次',()=>begin('rush')],['重新选狗',home]];
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
function streetPoint(){return Street.nodes[Street.checkpoints[zoneIndex%Street.checkpoints.length]]}
function addMob(opening=false,incident=false){
  const i=arrivals++,node=Street.checkpoints[zoneIndex%Street.checkpoints.length],start=incident?node:opening?[4,4,5,5,1,6,0,9][i%8]:Math.random()<.65?node:Math.floor(rand(0,12));
  const [sx,sz]=Street.nodes[start],lane=rand(-.72,.72),bad=incident||((opening?i%3===1:Math.random()<.36)),deck=crowdDecks[bad?1:0];
  if(!deck.length)deck.push(...shuffle([0,1,2,3,4,5]));
  const type=incident?Street.incidents[(zoneIndex+zoneHits)%Street.incidents.length]:deck.pop();
  const x=opening&&i<2?-12.6+i*.6:sx+rand(-.8,.8),z=opening&&i<2?lane:sz+lane;
  const footpath=bad?lane:(lane<0?-1:1)*rand(1.55,1.94);
  const mesh=W.pedestrian((bad?'rogue-':'local-')+type),next=Street.neighbor(start,-1);
  const m={mesh,x,z,type,bad,incident,origin:start,node:start,next,lane:footpath,age:0,speed:rand(.82,1.38),wait:rand(0,.65),phase:rand(0,8),facing:1,reaction:0,done:false,visits:0};
  mobs.push(m);W.place(mesh,x,z)
}
function drop(x,z){const el=document.createElement('span');el.className='float';el.textContent='✦';$('marks').append(el);drops.push({x,z,el,age:0})}
function swing(){
  if(strike||cool>0){if(freeze>0||strike?.age>.27||cool>0)bufferSwing=true;return}const tired=energy<10;
  const magic=save.talent==='magic'&&talentClock<=0;
  if(magic)talentClock=6;else energy=Math.max(0,energy-10);
  strike={age:0,yaw:p.yaw,contact:false,magic,tired};sfx('swish')
}
function contact(){
  const forwardX=Math.sin(strike.yaw),forwardZ=Math.cos(strike.yaw);
  const touched=mobs.filter(m=>{const dx=m.x-p.x,dz=m.z-p.z,d=Math.hypot(dx,dz);return !m.done&&!m.reaction&&d<(strike.tired?reach()*.70:reach())&&
    (d<.46||dx*forwardX+dz*forwardZ>d*.05)&&Districts.line(p.x,p.z,m.x,m.z)});
  const villains=touched.filter(m=>m.bad),targets=villains.length?villains:touched;
  if(!targets.length)return;
  const force=villains.length?(villains.length>1||strike.magic?1:.76):.37;
  freeze=villains.length?(.057+.048*force):.056;impactPower=force;impactPulse=.23;
  sfx(villains.length?(kills%2||force===1?'knock-deep':'knock'):'thump');let atCheckpoint=0;
  for(const m of targets){m.reaction=.52;m.pushX=forwardX;m.pushZ=forwardZ;
    W.pedestrianPose(m,m.type>=3?4:m.bad?2:4,!save.calm,0,true);
    if(m.bad){kills++;drop(m.x,m.z);order=Math.min(100,order+4);
      const [gx,gz]=streetPoint();if(Math.hypot(p.x-gx,p.z-gz)<3.2)atCheckpoint++;
    }else{mistakes++;order=Math.max(0,order-6);floating('打错啦！',m.x,m.z,1.6)}
  }
  if(villains.length){const m=villains[0];floating(strike.magic?'汪！':villains.length>1?'一锤 ×'+villains.length:'嘭！',m.x,m.z,1.55,.48)}
  if(kills>=6)combo=1;
  zoneHits+=atCheckpoint;
  if(atCheckpoint&&zoneHits<Street.quotas[zoneIndex])instruction('本站已制止 '+zoneHits+'/'+Street.quotas[zoneIndex]+'，留意下一个捣乱者',2);
  if(atCheckpoint&&zoneHits>=Street.quotas[zoneIndex]){zoneHits=0;sfx('stamp');zoneIndex++;W.goal(zoneIndex);for(const m of mobs){if(m.incident){m.incident=false;m.next=Street.neighbor(m.node,-1)}}
    if(zoneIndex<Street.checkpoints.length){addMob(false,true);instruction('巡章到手！去'+Street.names[zoneIndex]+'。',2.4)}
  }
}
function survival(dt,wall){
  impactPulse=Math.max(0,impactPulse-wall);
  if(strike){strike.age+=dt;if(strike.age>=.125&&!strike.contact){strike.age=.125;strike.contact=true;contact()}
    if(strike.age>(strike.tired?.56:save.weapon==='黄瓜棒'?.33:.43)){strike=null;cool=.025;if(zoneIndex>=Street.checkpoints.length){finish(true);return}}}
  if(freeze>0)return;
  if(!strike&&cool<=0&&bufferSwing){bufferSwing=false;swing()}
  spawn-=dt;if(spawn<=0){if(mobs.length<30)addMob();spawn=1.13}
  for(const m of mobs){
    m.age+=dt;m.phase+=dt;
    if(m.reaction>0){m.reaction=Math.max(0,m.reaction-dt);const dx=m.pushX*dt*2.2,dz=m.pushZ*dt*2.2;
      if(Districts.clear(m.x+dx,m.z+dz)){m.x+=dx;m.z+=dz}
      const squash=m.reaction>.33,frame=m.type>=3?(squash?4:m.reaction>.16?5:6):(m.bad?2:4)+(squash?0:1);
      W.pedestrianPose(m,frame,!save.calm&&m.reaction>.47,save.calm?0:Math.sin((.52-m.reaction)*58)*Math.pow(m.reaction/.52,2),m.reaction>.34);
      if(!m.reaction){if(m.bad)m.done=true;else m.wait=1.5}
    }else{
      let tx,tz;if(m.incident){const [cx,cz]=Street.nodes[m.origin];tx=cx+(m.visits%2?1:-1)*1.15;tz=cz+m.lane}
      else{const [cx,cz]=Street.nodes[m.next];tx=cx+m.lane;tz=cz+m.lane}
      const dx=tx-m.x,dz=tz-m.z,d=Math.hypot(dx,dz),walking=m.wait<=0;
      if(!walking)m.wait-=dt;
      else if(d<.12){m.visits++;m.wait=m.incident?rand(.55,1.3):m.visits%2===0?rand(.7,2):rand(.08,.35);
        const prev=m.node;m.node=m.next;m.next=Street.neighbor(m.node,prev)}
      else{const v=Math.min(d,m.speed*dt);m.x+=dx/d*v;m.z+=dz/d*v;const screen=dx*W.right.x+dz*W.right.z;if(Math.abs(screen)>.1)m.facing=Math.sign(screen)}
      const frame=m.type>=3?(walking?Math.floor(m.phase*6)%4:(Math.floor(m.phase*2)%2?3:7)):m.bad?(walking?Math.floor(m.phase*5)%2:0):(walking?Math.floor(m.phase*7)%3:3);
      W.pedestrianPose(m,frame,false,0,false)
    }
    W.place(m.mesh,m.x,m.z);if(!m.incident&&m.age>28&&dist(m,p)>7)m.done=true;
    if(m.done)W.dispose(m.mesh)
  }
  mobs=mobs.filter(m=>!m.done);
  if(zoneIndex<Street.checkpoints.length&&!mobs.some(m=>m.incident&&!m.reaction))addMob(false,true);
  if(order<=0){finish(false);return}
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
const streetActions=[['捡拾垃圾','牵绳遛狗','扶人过街'],['公共场所吸烟','随地吐痰','乱甩湿伞']];
function patrolHint(){
  if(energy<18)return '体力低，捡星回能';
  let closest=null,range=2.6;
  for(const m of mobs){if(m.type<3||m.reaction||m.done)continue;const distance=dist(p,m);if(distance<range){closest=m;range=distance}}
  return closest?'街头见闻 · '+streetActions[closest.bad?1:0][closest.type-3]:'拖动摇杆走街巷 · 面向目标挥锤'
}
function hud(){
  if(!p)return;$('objective').textContent=mode==='rush'?(zoneIndex>=Street.checkpoints.length?'巡章已集齐':Street.names[zoneIndex]+' '+(Math.hypot(p.x-streetPoint()[0],p.z-streetPoint()[1])<3.2?'· 制止 '+zoneHits+'/'+Street.quotas[zoneIndex]:direction(...streetPoint())+' '+Math.ceil(Math.hypot(p.x-streetPoint()[0],p.z-streetPoint()[1]))+'m')):mode==='search'?'循着铃声找出外放者':'找出插队还说谎的人';
  $('time').textContent='◷ '+Math.ceil(Math.max(0,left))+'s';$('status').textContent=mode==='rush'?'巡章 '+zoneIndex+'/'+Street.checkpoints.length+' · 制止 '+kills:mode==='search'?'已排除 '+inspected:'证据 '+proofs.length+'/2';
  $('energy').firstElementChild.style.width=energy+'%';$('act').textContent=mode==='rush'?'挥锤':'调查';
  if(elapsed>tipUntil)$('hint').textContent=mode==='rush'?patrolHint():mode==='search'?'声源 '+direction(target.x,target.z)+'　·　点摆设翻找':proofs.length<2?'线索 '+direction(...(()=>{const o=objects.find(o=>o.kind==='proof'&&!o.used);return [o.x,o.z]})())+'　·　点绿色标签搜证':'点名字，对照证据指认'
}
function stopInput(){keys.clear();axis.x=axis.y=0;joy=null;queued=null;route=[];routeTarget=null;$('stick').firstElementChild.style.transform=''}
function move(dt){
  let dx=axis.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=axis.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  let wx=dx*W.right.x+dy*W.down.x,wz=dx*W.right.z+dy*W.down.z;
  if(Math.hypot(dx,dy)>.06)queued=null;else if(queued){
    const d=dist(p,queued);if(d<(queued.kind==='floor'?.14:1.03)){const o=queued;queued=null;if(o.kind!=='floor')interact(o);return false}
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
function sidebarActions(){const sidebar=window.patrolHost?.sidebar;return sidebar?.available?[['去抖音侧边栏',()=>sidebar.open()]]:[]}
function pause(){
  if(state!=='play'&&state!=='pause')return;state='pause';bufferSwing=false;music(false);options('巡查暂停',modes[mode][0],'拖动摇杆走路，面向目标按挥锤。',[['继续巡查',resume],['设置',settings],['重新开始',()=>begin('rush')],['重新选狗',home]])

}
const scene=$('scene');
scene.onpointerdown=e=>{if(joy||state!=='play')return;unlock();scene.setPointerCapture(e.pointerId);joy={id:e.pointerId,x:e.clientX,y:e.clientY,drag:false}}
scene.onpointermove=e=>{if(!joy||joy.id!==e.pointerId)return;const dx=e.clientX-joy.x,dy=e.clientY-joy.y,d=Math.hypot(dx,dy);if(d>6)joy.drag=true;if(joy.drag){const radius=parseFloat($('stick').style.width)*.28,scale=Math.max(radius,d);axis={x:dx/scale,y:dy/scale};$('stick').firstElementChild.style.transform='translate('+axis.x*radius+'px,'+axis.y*radius+'px)'}}
scene.onpointerup=e=>{if(!joy||joy.id!==e.pointerId)return;const tap=!joy.drag;stopInput();if(tap&&state==='play'){
  const q=W.ground(e.clientX,e.clientY);if(!q)return;const nearby=objects.filter(o=>Math.hypot(q.x-o.x,q.z-o.z)<.9).sort((a,b)=>Math.hypot(q.x-a.x,q.z-a.z)-Math.hypot(q.x-b.x,q.z-b.z))[0];
  if(nearby)walkTo(nearby);else{const [x,z]=Districts.free(clamp(q.x,-22,22),clamp(q.z,-15,15));queued={kind:'floor',x,z}}
}}
scene.onpointercancel=stopInput;
const stick=$('stick');
function steerStick(e){
  if(joy?.id!==e.pointerId)return;
  const dx=e.clientX-joy.x,dy=e.clientY-joy.y,r=parseFloat(stick.style.width)*.28,n=Math.max(r,Math.hypot(dx,dy));
  axis={x:dx/n,y:dy/n};stick.firstElementChild.style.transform='translate('+axis.x*r+'px,'+axis.y*r+'px)'
}
stick.onpointerdown=e=>{
  if(state!=='play'||joy)return;
  unlock();const r=stick.getBoundingClientRect();stick.setPointerCapture?.(e.pointerId);
  joy={id:e.pointerId,x:r.left+r.width/2,y:r.top+r.height/2,drag:true};queued=null;steerStick(e)
};
stick.onpointermove=steerStick;
stick.onpointerup=stick.onpointercancel=e=>{if(joy?.id===e.pointerId)stopInput()};

function reach(){return (save.weapon==='糖葫芦'?2.3:1.6)+(combo?.28:0)}
function action(){if(state!=='play')return;if(mode==='rush'){
  swing()
}else{const n=nearest();if(n)walkTo(n)}}
$('act').onpointerdown=e=>{if(mode==='rush'){e.stopPropagation();unlock();action()}};
$('act').onclick=e=>{if(mode!=='rush'||!e||e.detail===0)action()};$('pause').onclick=pause;
$('start').onclick=()=>begin('rush');$('settings').onclick=settings;$('shop').onclick=shop;
addEventListener('resize',layoutControls);
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(state==='play'&&['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','escape'].includes(k)){e.preventDefault();keys.add(k);if(!e.repeat&&k===' ')action();if(k==='escape')pause()}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{stopInput();pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
let last=performance.now();function loop(ts){
  const wall=Math.max(0,(ts-last)/1000);let dt=Math.min(.08,wall);last=ts;if(state==='play'&&mode==='rush'&&freeze>0){freeze=Math.max(0,freeze-wall);dt=0}let moving=false;
  if(state==='play'){elapsed+=wall;left-=wall;hit=Math.max(0,hit-dt);cool=Math.max(0,cool-dt);energy=Math.min(100,energy+dt*(9+save.skill*2));
    if(!chase&&dt>0&&(!strike||strike.age>.25))moving=move(dt);if(state==='play'){
      talentClock-=dt;
      if(bird){bird.position.set(p.x-.7,1.22+Math.sin(elapsed*5)*.13,p.z+.18);bird.rotation.y=p.yaw;
        if(talentClock<=0){energy=Math.min(100,energy+18);talentClock=5;floating('补给',p.x-.6,p.z,1.5)}}
      
      if(mode==='rush')survival(dt,wall);else scan(dt);if(left<=0&&state==='play'&&!chase)finish(mode==='rush'&&zoneIndex>=Street.checkpoints.length);hud()}}
  music(state==='play'&&mode==='rush'&&!document.hidden);
  W.animate(state==='home'||state==='play'?dt:0,p,moving,Math.min(1,hit/.38),save.weapon,mode==='rush'?{step:strike?(strike.age<.065?4:strike.age<.125?5:strike.age<.25?6:7):null,direction:strike?Math.sign(Math.sin(strike.yaw)*W.right.x+Math.cos(strike.yaw)*W.right.z):0,shake:save.calm?0:impactPower*(impactPulse/.23)**2*Math.sin((.23-impactPulse)*58),progress:strike?strike.age:0}:null);if(state!=='home')placeMarks(state==='play'?dt:0);
  if(ts>toastUntil&&$('toast').textContent)$('toast').textContent='';requestAnimationFrame(loop)
}
home();
requestAnimationFrame(loop)
})();

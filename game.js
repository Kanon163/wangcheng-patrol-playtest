(() => {
'use strict';
const $=id=>document.getElementById(id), W=World;
const modes={search:['寻找外放者','听声翻找',65],rush:['街区大巡查','街区巡逻',180],case:['谁在撒谎','调查现场',85]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), rand=(a,b)=>a+Math.random()*(b-a);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key='wangcheng-patrol-v2',defaults={coins:0,owned:['玩具锤'],weapon:'玩具锤',skill:0,talent:null,rounds:0,sound:true,music:true,stickScale:100,hammerScale:100,calm:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false,breed:'shiba',wardrobe:['scarf'],wear:{}};
let save;try{save={...defaults,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{save={...defaults}}
function persist(){try{localStorage.setItem(key,JSON.stringify(save))}catch{}}
const colors={red:'橘色',blue:'海水蓝',green:'青草绿'};
let state='home', mode, p, objects=[], mobs=[], drops=[], fx=[], elapsed=0,left=0,kills=0,energy=100,hit=0,cool=0,spawn=0,beat=0, target=null, inspected=0, proofs=[], culprit, chase=null, combo=0,queued=null,now=0,toastUntil=0,tipUntil=0;
let crowdDecks;
let district,mistakes=0,strike=null,freeze=0,impactPulse=0,impactPower=0,bufferSwing=false,route=[],routeTarget=null;
let audio,joy=null,axis={x:0,y:0},keys=new Set(),bird=null,talentClock=0;
function tone(freq=390,len=.08,kind='triangle',vol=.035){
  if(window.patrolHost){if(save.sound)window.patrolHost.playTone(freq,vol);return}
  if(!save.sound||!audio||audio.state!=='running')return;
  const o=audio.createOscillator(),g=audio.createGain();o.type=kind;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(70,freq*.74),audio.currentTime+len);
  g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+len)
}
const combatAudio=new Map();
let musicSource=null,musicGain=null,musicStart=0,musicOffset=0,hostMusic=false;
const soundLoads=new Map();
function loadSound(name){
  if(!soundLoads.has(name)){
    const url=window.patrolSounds?.[name]||'art/'+name+(name==='patrol-loop'?'.mp3':'.wav');
    const request=fetch(url).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()})
      .then(data=>audio.decodeAudioData(data)).then(buffer=>{combatAudio.set(name,buffer);return buffer})
      .catch(()=>{soundLoads.delete(name);return null});
    soundLoads.set(name,request)
  }
  return soundLoads.get(name)
}
function loadSounds(){
  if(audio)for(const name of ['swish','thump','knock','knock-deep','stamp','patrol-loop','patrol-win','patrol-loss'])loadSound(name)
}
let resultSource=null,resultSequence=0;
function stopResultMusic(){
  resultSequence++;
  if(window.patrolHost){window.patrolHost.resultMusic?.(null);return}
  if(resultSource){resultSource.stop();resultSource.disconnect();resultSource=null}
}
async function playResultMusic(win){
  stopResultMusic();
  if(!save.sound||!save.music)return;
  const name=win?'patrol-win':'patrol-loss',sequence=resultSequence;
  if(window.patrolHost){window.patrolHost.resultMusic?.(name);return}
  if(!audio)return;
  const buffer=await loadSound(name);
  if(!buffer||sequence!==resultSequence||state!=='result')return;
  resultSource=audio.createBufferSource();resultSource.buffer=buffer;
  resultSource.connect(audio.destination);resultSource.start()
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
  choices.forEach(([label,cb,disabled,art])=>{const b=document.createElement('button');b.textContent=label;b.disabled=!!disabled;if(art){b.dataset.art=art;b.className='art-choice';b.style.backgroundImage='url("'+GameImages.url(art)+'")'}b.onclick=()=>{unlock();cb()};$('options').append(b)});$('modal').hidden=false
}
function close(){ $('modal').hidden=true; }
function clearMarks(){for(const o of [...objects,...fx,...drops])o.el?.remove();objects=[];mobs=[];drops=[];fx=[];chase=null;target=null;queued=null;$('marks').replaceChildren()}
function home(){
  clearMarks();stopInput();close();state='home';$('home').hidden=false;$('hud').hidden=true;$('toast').textContent='';
  W.buildStage('home');W.outfit(save.breed,{});W.equip(gear.weapon);W.snap();dogCards();layoutControls()
}
function dogCards(){
  const cards=$('dogs');cards.replaceChildren();
  for(const [id,name] of Object.entries(Paper.breeds)){
    const card=document.createElement('button');
    card.dataset.art=id;card.dataset.selected=String(save.breed===id);card.textContent=name;
    card.setAttribute('aria-pressed',String(save.breed===id));
    card.style.backgroundImage='url("'+GameImages.url(id)+'")';
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
  const fit=.65*Math.min(1,(innerHeight*.48)/Math.max(stick,height), (innerWidth-20)/Math.max(width,stick));
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
function dressed(){persist();W.outfit(save.breed,{});W.equip(gear.weapon)}
const gear=Rush.profile;
const missedIncidents=[];
let wave=1,goalCount=0,spawned=0;
function shop(message=''){
  const price=gear.levels[gear.weapon]*2,ridePrice=(gear.scooter+1)*6;
  const actions=[
    ['抽扭蛋 · 3代币',()=>shop(Rush.draw()),gear.tokens<3],
    ['升级'+gear.weapon+' · '+price+'碎片',()=>{Rush.upgrade();shop('武器已升级，下一局能量增加40')},gear.shards<price],
    [(gear.scooter?'升级':'解锁')+'滑板车 · '+ridePrice+'代币',()=>{Rush.ride();shop('滑板车续航 +12 秒')},gear.tokens<ridePrice,'scooter']
  ];
  for(const id of Object.keys(gear.levels))if(id!==gear.weapon)actions.push(['装备'+id,()=>{gear.weapon=id;Rush.store();shop()}]);
  actions.push(['开始第 '+gear.stage+' 关',()=>begin('rush')],['返回巡查站',home]);
  options('敌潮装备室','装备升级',[message,'代币 '+gear.tokens+'　武器碎片 '+gear.shards,gear.weapon+' Lv.'+gear.levels[gear.weapon]+'　能量 '+Rush.capacity(),'滑板车 Lv.'+gear.scooter+'　额外续航 '+gear.scooter*12+' 秒','扭蛋：有未获得的武器时，8% 获得整件，其余为碎片。'].filter(Boolean).join('\n'),actions)
}
function mark(o,txt,cl=''){const b=document.createElement('button');b.className='marker '+cl;b.textContent=txt;b.setAttribute('aria-label',txt);b.onpointerdown=e=>e.stopPropagation();b.onclick=()=>{if(state==='play')walkTo(o)};$('marks').append(b);o.el=b}
function addObj(kind,name,pos,mesh,height=1,tint=''){
  const o={kind,name,x:pos[0],z:pos[1],mesh,height,used:false};W.place(mesh,o.x,o.z);if(!mesh.userData.paper)mesh.rotation.y=rand(-.18,.55);objects.push(o);mark(o,name,tint);return o
}
function floating(text,x,z,height=1.15,life=.75){const el=document.createElement('span');el.className='float';el.textContent=text;$('marks').append(el);fx.push({el,x,z,height,age:0,life})}
function instruction(txt,sec=3){$('hint').textContent=txt;tipUntil=elapsed+sec}
let loadAttempt=0;
async function loadScene(title,names,start){
  const attempt=++loadAttempt;state='loading';music(false);
  $('hud').hidden=true;$('home').hidden=true;$('toast').textContent='';
  options('素材加载',title,'准备图片 0 / '+names.length,[]);
  window.patrolBoot?.started();
  let count=0,next=0,building=false;
  async function worker(){
    while(next<names.length&&state==='loading'&&attempt===loadAttempt){
      const name=names[next++];
      try{await GameImages.load(name)}catch{if(attempt!==loadAttempt||state!=='loading')return;await GameImages.load(name,1)}
      if(attempt===loadAttempt&&state==='loading')$('desc').textContent='准备图片 '+(++count)+' / '+names.length
    }
  }
  try{
    await Promise.all(Array.from({length:Math.min(4,names.length)},worker));
    if(attempt!==loadAttempt)return;
    building=true;start()
  }catch(error){
    if(attempt!==loadAttempt)return;
    state='loadError';$('home').hidden=true;$('hud').hidden=true;
    options('素材加载',building?'场景启动失败':'图片未加载成功',String(error.message||error),[
      ['重新加载',()=>loadScene(title,names,start)]])
  }
}
function begin(id){
  if(state==='loading')return;stopResultMusic();unlock();
  return loadScene('正在准备街区',GameImages.level(id,save.breed,gear.scooter),()=>startLevel(id))
}
function startLevel(id){
  last=performance.now();unlock();clearMarks();stopInput();close();mode=id;state='play';elapsed=0;left=modes[id][2];kills=0;inspected=0;energy=100;beat=1;cool=0;hit=0;spawn=.2;combo=0;proofs=[];
  p={x:0,z:0,yaw:.48};district=W.buildStage(id);mistakes=0;crowdDecks=[[],[]];strike=null;freeze=impactPulse=0;bufferSwing=false;[p.x,p.z]=id==='rush'?Street.nodes[0]:Districts.free(0,0);if(id==='rush')p.yaw=Math.PI/2;W.equip(id==='rush'?gear.weapon:save.weapon);bird=id!=='rush'&&save.talent==='bird'?W.bird():null;talentClock=3;W.snap(p);$('home').hidden=true;$('hud').hidden=false;$('modeName').textContent=district.name+' · '+modes[id][1];$('toast').textContent='';
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
  }else{
    wave=gear.stage;const rules=Rush.rules(wave);goalCount=rules.count;left=rules.seconds;energy=Rush.capacity();spawned=0;missedIncidents.length=0;
    W.goal(Street.checkpoints.length);
    for(let i=0;i<goalCount;i++)addMob(false,true);
    for(let i=0;i<5;i++)addMob(true);
    $('modeName').textContent='敌潮 · 第 '+wave+' 关 · '+district.name;
    instruction('',0)
  }
  hud();
  W.animate(0,p,false,0,id==='rush'?gear.weapon:save.weapon,null);
  if(id==='rush'&&wave<=3){
    state='briefing';
    options('敌潮 · 第 '+wave+' 关','本关巡查目标',
      '胜利：在 '+left+' 秒内制止 '+goalCount+' 起不文明行为。\n失败：续航时间到，或挥锤能量用尽时仍未完成目标。\n本关有 '+energy+' 点能量，每锤消耗 10 点，空挥和误击也会消耗。',
      [['开始巡查',resume]])
  }
  last=performance.now();if(document.hidden)pause()
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
function resume(){close();last=performance.now();state='play';stopInput()}
function finish(win,cause){
  if(mode==='rush'){
    if(state!=='play')return;state='result';stopInput();music(false);playResultMusic(win);
    if(win){gear.stage=Math.max(gear.stage,wave+1);Rush.store()}
    const watch=window.patrolHost?.watchReward,why=win?'巡查胜利':cause==='energy'?'巡查失败 · 能量耗尽':'巡查失败 · 续航时间到';
    function result(msg=''){
      const retry=async()=>{if(state!=='result'||!watch)return;state='rewardPending';
        options('敌潮','等待激励视频','完整观看后重开本关',[]);
        try{if(await watch()){begin('rush');return}msg='视频未完成'}catch{msg='视频暂未加载'}
        state='result';result(msg)
      };
      const choices=win?[['进入第 '+gear.stage+' 关',()=>begin('rush')]]:[[watch?'看广告重来':'激励视频暂不可用',retry,!watch]];
      choices.push(['装备升级',()=>shop()]);
      options('敌潮 · 第 '+wave+' 关',why,[msg,win?'全部不文明行为已制止。':'还有 '+(goalCount-kills)+' 起不文明行为未制止。','已处理 '+kills+'/'+goalCount+'　误击 '+mistakes,'本关获得 '+kills*2+' 代币，已存入钱包'].filter(Boolean).join('\n'),choices)
    }
    result();return
  }
  if(state!=='play')return;state='result';stopInput();const earned=win?8:0;
  save.coins+=earned;save.rounds++;persist();
  options('巡查结算',win?'巡查完成':'巡查时间到','获得 '+earned+' 金币',[['再玩一次',()=>begin(mode)],['返回',home]])
}

// 先检查本帧已占用的脚底位置，再提交位移。避让不会把旁人推向墙体。
function openFoot(actor,x,z){
  if(!Districts.clear(x,z))return false;
  if(actor!==p&&Math.hypot(p.x-x,p.z-z)<.88)return false;
  return !mobs.some(m=>m!==actor&&!m.entering&&!m.done&&Math.hypot(m.x-x,m.z-z)<(actor===p?.88:1.04))
}
function stepFoot(actor,dx,dz,steer){
  for(const angle of (steer?[0,.48,-.48,1.0,-1.0,1.48,-1.48]:[0])){
    const sn=Math.sin(angle),cs=Math.cos(angle),x=actor.x+dx*cs-dz*sn,z=actor.z+dx*sn+dz*cs;
    if(openFoot(actor,x,z)&&Districts.line(actor.x,actor.z,x,z)){actor.x=x;actor.z=z;return true}
  }
  return false
}
function replacementNode(missed){
  const candidates=Street.nodes.map(([x,z],i)=>({x,z,i})).filter(n=>n.i!==missed.origin&&dist(n,missed)>6);
  const score=n=>Math.min(dist(n,p),12)-Math.abs(dist(n,missed)-13)*.5-
    (mobs.some(m=>m.bad&&m.origin===n.i)?6:0)+rand(0,4);
  return candidates.map(n=>({id:n.i,score:score(n)})).sort((a,b)=>b.score-a.score)[0]?.id
}
function addMob(opening=false,incident=false,missed=null){
  const slot=spawned%Math.min(Street.checkpoints.length,Math.ceil(goalCount/2));
  const node=missed?replacementNode(missed):Street.checkpoints[slot],start=incident?node:opening&&mobs.filter(m=>!m.bad).length<2?0:Math.floor(rand(0,Street.nodes.length));
  if(start===undefined)return false;
  const [sx,sz]=Street.nodes[start],lane=rand(-.72,.72),bad=incident,deck=crowdDecks[bad?1:0];
  if(!deck.length)deck.push(...shuffle([0,1,2,3,4,5]));
  const type=deck.pop();
  let x,z,placed=false;
  for(let n=0;n<32;n++){
    x=sx+rand(-1.85,1.85);z=sz+rand(-1.85,1.85);
    if(openFoot(null,x,z)){placed=true;break}
  }
  if(!placed)return;
  const footpath=bad?lane:(lane<0?-1:1)*rand(.75,1.17);
  const mesh=W.pedestrian((bad?'rogue-':'local-')+type),next=Street.neighbor(start,-1);
  const m={mesh,x,z,type,bad,incident,origin:start,node:start,next,lane:footpath,age:0,speed:rand(.82,1.38),wait:rand(0,.65),phase:rand(0,8),facing:1,reaction:0,done:false,visits:0};
  m.nextVisit=incident?(wave<4?rand(17,25):rand(11,19)):rand(2,7);
  m.hideAt=m.nextVisit;
  m.hp=missed?missed.strength:incident&&wave>=4&&spawned%2===0?3:1;m.strength=m.hp;
  if(m.hp>1)mesh.scale.setScalar(1.32);
  if(incident&&!missed)spawned++;
  mobs.push(m);W.place(mesh,x,z);return true
}

function swing(){
  if(strike||cool>0){if(freeze>0||strike?.age>.27||cool>0)bufferSwing=true;return}if(energy<=0)return;
  energy=Math.max(0,energy-10);
  strike={age:0,yaw:p.yaw,contact:false,magic:false,tired:false};sfx('swish')
}
function contact(){
  const forwardX=Math.sin(strike.yaw),forwardZ=Math.cos(strike.yaw);
  const touched=mobs.filter(m=>{const dx=m.x-p.x,dz=m.z-p.z,d=Math.hypot(dx,dz);return !m.entering&&!m.done&&!m.reaction&&d<(strike.tired?reach()*.70:reach())&&
    (d<.46||dx*forwardX+dz*forwardZ>d*.05)&&Districts.line(p.x,p.z,m.x,m.z)});
  const villains=touched.filter(m=>m.bad),targets=villains.length?villains:touched;
  if(!targets.length)return;
  const force=villains.length?(villains.length>1||strike.magic?1:.76):.37;
  freeze=villains.length?(.057+.048*force):.056;impactPower=force;impactPulse=.23;
  sfx(villains.length?(kills%2||force===1?'knock-deep':'knock'):'thump');
  for(const m of targets){m.reaction=.52;m.pushX=forwardX;m.pushZ=forwardZ;
    W.pedestrianPose(m,m.type>=3?4:m.bad?2:4,!save.calm,0,true);
    if(m.bad){
      m.hp--;if(m.hp===0){kills++;Rush.reward();floating('+2 代币',m.x,m.z,1.6)}
      else floating('还需 '+m.hp+' 锤',m.x,m.z,2.3)
    }else{mistakes++;floating('打错啦！',m.x,m.z,1.6)}
  }
}
function visitBuilding(m,dt){
  if(m.entering){
    m.entering=Math.min(1,m.entering+dt*1.8);
    const t=m.entering,door=m.door;
    m.x=m.fromX+(door.fx-m.fromX)*t;m.z=m.fromZ+(door.fz-m.fromZ)*t;
    m.mesh.scale.setScalar((m.strength>1?1.32:1)*(1-t*.92));m.done=t===1;return true
  }
  if(!m.door&&m.age>=m.nextVisit){
    m.nextVisit=m.age+rand(3,6);
    const options=Street.doors.filter(d=>!mobs.some(n=>n.door===d)&&Districts.clear(d.x,d.z))
      .sort((a,b)=>dist(m,a)-dist(m,b));
    for(const door of options.slice(0,5)){
      const path=Districts.route(m.x,m.z,door.x,door.z);if(!path)continue;
      m.door=door;m.routeToDoor=[...path,[door.x,door.z]];m.visitDelay=0;break
    }
  }
  if(!m.door)return false;
  const [x,z]=m.routeToDoor[0],dx=x-m.x,dz=z-m.z,length=Math.hypot(dx,dz);
  if(length<.14){
    m.routeToDoor.shift();m.visitDelay=0;
    if(!m.routeToDoor.length){m.entering=.001;m.fromX=m.x;m.fromZ=m.z;if(queued?.walker===m)cancelCommand()}
  }else{
    const v=Math.min(1,m.speed*dt/length);stepFoot(m,dx*v,dz*v,true);
    const screen=dx*W.right.x+dz*W.right.z;if(Math.abs(screen)>.1)m.facing=Math.sign(screen);
    m.visitDelay=Math.hypot(x-m.x,z-m.z)<length-.003?0:m.visitDelay+dt;
    if(m.visitDelay>1.4){m.door=null;m.path=null;m.nextVisit=m.age+rand(2,4)}
  }
  W.pedestrianPose(m,Math.floor(m.phase*6)%(m.type>=3?4:m.bad?2:3),false,0,false);return true
}
function survival(dt,wall){
  impactPulse=Math.max(0,impactPulse-wall);
  if(strike){strike.age+=dt;if(strike.age>=.125&&!strike.contact){strike.age=.125;strike.contact=true;contact();if(kills===goalCount||energy<=0){finish(kills===goalCount,'energy');return}}
    if(strike.age>(strike.tired?.56:gear.weapon==='黄瓜棒'?.33:.43)){strike=null;cool=.025;}}
  if(freeze>0)return;
  if(!strike&&cool<=0&&bufferSwing){bufferSwing=false;swing()}
  spawn-=dt;if(spawn<=0){if(mobs.filter(m=>!m.bad).length<7)addMob();spawn=rand(3.8,5.6)}
  for(const m of mobs){
    m.age+=dt;m.phase+=dt;
    if(!m.reaction&&m.hp>0&&visitBuilding(m,dt)){
      W.place(m.mesh,m.x,m.z);
      if(m.done){
        if(m.bad)missedIncidents.push({origin:m.origin,x:m.x,z:m.z,strength:m.strength});
        W.dispose(m.mesh)
      }
      continue
    }
    if(m.reaction>0){m.reaction=Math.max(0,m.reaction-dt);const dx=m.pushX*dt*2.2,dz=m.pushZ*dt*2.2;
      stepFoot(m,dx,dz,false);
      const squash=m.reaction>.33,frame=m.type>=3?(squash?4:m.reaction>.16?5:6):(m.bad?2:4)+(squash?0:1);
      W.pedestrianPose(m,frame,!save.calm&&m.reaction>.47,save.calm?0:Math.sin((.52-m.reaction)*58)*Math.pow(m.reaction/.52,2),m.reaction>.34);
      if(!m.reaction){if(m.bad&&m.hp===0)m.done=true;else m.wait=.45}
    }else{
      const dest=m.incident?m.origin:m.next,[cx,cz]=Street.nodes[dest];
      const tx=cx+(m.incident?(m.visits%2?1:-1)*1.15:m.lane),tz=cz+m.lane;
      let walking=false;
      if(m.wait>0)m.wait-=dt;
      else if(Math.hypot(tx-m.x,tz-m.z)<.23||m.blocked>.85){
        m.visits++;m.wait=rand(.2,1.1);m.path=null;m.blocked=0;
        if(!m.incident){const prev=m.node;if(Math.hypot(m.x-cx,m.z-cz)<2.4)m.node=m.next;
          m.next=Street.neighbor(m.node,prev);m.lane=-m.lane}
      }else{
        if(!m.path){const goal=Districts.free(tx,tz);m.path=Districts.route(m.x,m.z,...goal);
          if(m.path)m.path.push(goal)}
        if(m.path?.length){
          const [gx,gz]=m.path[0],dx=gx-m.x,dz=gz-m.z,d=Math.hypot(dx,dz);
          if(d<.15){m.path.shift();if(!m.path.length)m.path=null}
          else{const v=Math.min(1,m.speed*dt/d);walking=stepFoot(m,dx*v,dz*v,true);
            const screen=dx*W.right.x+dz*W.right.z;if(walking&&Math.abs(screen)>.1)m.facing=Math.sign(screen)}
        }
        m.blocked=walking?0:(m.blocked||0)+dt
      }
      const frame=m.type>=3?(walking?Math.floor(m.phase*6)%4:(Math.floor(m.phase*2)%2?3:7)):m.bad?(walking?Math.floor(m.phase*5)%2:0):(walking?Math.floor(m.phase*7)%3:3);
      W.pedestrianPose(m,frame,false,0,false)
    }
    W.place(m.mesh,m.x,m.z);
    if(m.done)W.dispose(m.mesh)
  }
  mobs=mobs.filter(m=>!m.done);
  if(spawned<goalCount)addMob(false,true);
  if(missedIncidents.length&&addMob(false,true,missedIncidents[0]))missedIncidents.shift()
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
  let closest=null,range=2.6;
  for(const m of mobs){if(m.type<3||m.reaction||m.done)continue;const distance=dist(p,m);if(distance<range){closest=m;range=distance}}
  return closest?'街头见闻 · '+streetActions[closest.bad?1:0][closest.type-3]:''
}
function hud(){
  if(mode==='rush'){
    const target=mobs.filter(m=>m.bad&&m.hp>0&&!m.entering).sort((a,b)=>dist(p,a)-dist(p,b))[0];
    const remaining=target?Math.ceil(target.hideAt-target.age):0;
    const clue=remaining<=0?'正在逃离':remaining<=5?'将逃离 '+remaining+'s':'发现线索';
    $('objective').textContent=target?clue+' '+direction(target.x,target.z)+' '+Math.ceil(dist(p,target))+'m':'巡查中';
    $('time').textContent='续航 '+Math.ceil(Math.max(0,left))+'s';$('status').textContent='制止 '+kills+'/'+goalCount;
    $('charge').textContent='能量 '+energy;
    $('time').dataset.low=String(left<=15);$('charge').dataset.low=String(energy<=20);
    $('energy').firstElementChild.style.width=100*energy/Rush.capacity()+'%';
    if(elapsed>tipUntil)$('hint').textContent=patrolHint();return
  }
  if(!p)return;$('objective').textContent=mode==='search'?'循着铃声找出外放者':'找出插队还说谎的人';
  $('time').textContent='◷ '+Math.ceil(Math.max(0,left))+'s';$('status').textContent=mode==='search'?'已排除 '+inspected:'证据 '+proofs.length+'/2';
  $('energy').firstElementChild.style.width=energy+'%';$('act').textContent=mode==='rush'?'':'调查';
  if(elapsed>tipUntil)$('hint').textContent=mode==='rush'?patrolHint():mode==='search'?'声源 '+direction(target.x,target.z)+'　·　点摆设翻找':proofs.length<2?'线索 '+direction(...(()=>{const o=objects.find(o=>o.kind==='proof'&&!o.used);return [o.x,o.z]})())+'　·　点绿色标签搜证':'点名字，对照证据指认'
}
let commandMark=null;
function cancelCommand(){commandMark?.remove();commandMark=null;queued=null;route=[];routeTarget=null}
function pointCommand(x,z,walker){
  cancelCommand();
  const [gx,gz]=walker?[walker.x,walker.z]:Districts.free(x,z);
  queued={kind:walker?'walker':'strikePoint',x:gx,z:gz,walker,stuck:0};
  commandMark=document.createElement('span');commandMark.className='float command';commandMark.textContent=walker?'⌖':'◎';$('marks').append(commandMark)
}
function stopInput(){keys.clear();axis.x=axis.y=0;joy=null;cancelCommand();$('stick').firstElementChild.style.transform=''}
function move(dt){
  let dx=axis.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=axis.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  let wx=dx*W.right.x+dy*W.down.x,wz=dx*W.right.z+dy*W.down.z;
  let remaining=Infinity;
  if(Math.hypot(dx,dy)>.06)cancelCommand();
  else if(queued){
    const order=queued,m=order.walker;
    if(m){if(m.entering||m.done||m.reaction||!mobs.includes(m)){cancelCommand();return false}
      order.x=m.x;order.z=m.z}
    const gap=dist(p,order),attackOrder=order.kind==='strikePoint'||!!m;
    const crowded=order.kind==='strikePoint'&&mobs.some(other=>!other.done&&Math.hypot(other.x-order.x,other.z-order.z)<.88);
    const range=m||crowded?Math.max(.94,(energy<10?.70:1)*reach()*.86):attackOrder?.17:order.kind==='floor'?.14:1.03;
    if(gap<=range&&Districts.line(p.x,p.z,order.x,order.z)){
      if(attackOrder){
        if(strike||cool>0)return false;
        if(gap>.025)p.yaw=Math.atan2(order.x-p.x,order.z-p.z);
        cancelCommand();swing()
      }else{cancelCommand();if(order.kind!=='floor')interact(order)}
      return false
    }
    if(routeTarget!==order||m&&Math.hypot(order.x-order.planX,order.z-order.planZ)>.55){
      route=Districts.route(p.x,p.z,order.x,order.z);routeTarget=order;
      if(!route){cancelCommand();notice('那里走不到');return false}
      order.planX=order.x;order.planZ=order.z
    }
    while(route.length&&Math.hypot(route[0][0]-p.x,route[0][1]-p.z)<.13)route.shift();
    const [tx,tz]=route[0]||[order.x,order.z];remaining=Math.hypot(tx-p.x,tz-p.z);
    wx=(tx-p.x)/(remaining||1);wz=(tz-p.z)/(remaining||1);
  }
  const len=Math.hypot(wx,wz);if(len<.06)return false;
  const step=Math.min(dt*4.65,remaining)/Math.max(1,len);p.yaw=Math.atan2(wx,wz);
  let moved=stepFoot(p,wx*step,wz*step,Boolean(queued));
  if(!moved&&!queued)moved=(Math.abs(wx)>.01&&stepFoot(p,wx*step,0,false))||(Math.abs(wz)>.01&&stepFoot(p,0,wz*step,false));
  if(queued&&!moved){queued.stuck=(queued.stuck||0)+dt;if(queued.stuck>.45){routeTarget=null;queued.stuck=0}}
  return moved
}
function placeMarks(dt){
  if(commandMark&&queued){const q=W.project(queued.x,queued.walker?2.34:.10,queued.z);
    commandMark.style.left=q.x+'px';commandMark.style.top=q.y+'px'}

  for(const o of objects){const q=W.project(o.x,o.height+.12,o.z);o.el.hidden=!!chase||q.x<18||q.x>innerWidth-18||q.y<105||q.y>innerHeight-78;o.el.style.left=q.x+'px';o.el.style.top=q.y+'px'}
  for(const f of fx){f.age+=dt;const q=W.project(f.x,f.height+f.age*.75,f.z);f.el.style.left=q.x+'px';f.el.style.top=q.y+'px';f.el.style.opacity=Math.min(1,(f.life-f.age)*4);if(f.age>=f.life)f.el.remove()}
  fx=fx.filter(f=>f.age<f.life)
}
function sidebarActions(){const sidebar=window.patrolHost?.sidebar;return sidebar?.available?[['去抖音侧边栏',()=>sidebar.open()]]:[]}
function pause(){
  if(state!=='play'&&state!=='pause')return;state='pause';bufferSwing=false;music(false);options('巡查暂停',modes[mode][0],'',[['继续巡查',resume],['设置',settings],['重新开始',()=>begin('rush')],['重新选狗',home]])

}
const scene=$('scene');
scene.onpointerdown=e=>{if(joy||state!=='play')return;unlock();scene.setPointerCapture(e.pointerId);joy={id:e.pointerId,x:e.clientX,y:e.clientY,drag:false}}
scene.onpointermove=e=>{if(!joy||joy.id!==e.pointerId)return;const dx=e.clientX-joy.x,dy=e.clientY-joy.y,d=Math.hypot(dx,dy);if(d>6)joy.drag=true;if(joy.drag){const radius=parseFloat($('stick').style.width)*.28,scale=Math.max(radius,d);axis={x:dx/scale,y:dy/scale};$('stick').firstElementChild.style.transform='translate('+axis.x*radius+'px,'+axis.y*radius+'px)'}}
scene.onpointerup=e=>{if(!joy||joy.id!==e.pointerId)return;const tap=!joy.drag;stopInput();if(tap&&state==='play'){
  const q=W.ground(e.clientX,e.clientY);if(!q)return;
  if(mode==='rush'){pointCommand(q.x,q.z,W.pickWalker(e.clientX,e.clientY,mobs.filter(m=>!m.entering)));return}
  const nearby=objects.filter(o=>Math.hypot(q.x-o.x,q.z-o.z)<.9).sort((a,b)=>Math.hypot(q.x-a.x,q.z-a.z)-Math.hypot(q.x-b.x,q.z-b.z))[0];
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
  joy={id:e.pointerId,x:r.left+r.width/2,y:r.top+r.height/2,drag:true};cancelCommand();steerStick(e)
};
stick.onpointermove=steerStick;
stick.onpointerup=stick.onpointercancel=e=>{if(joy?.id===e.pointerId)stopInput()};

function reach(){return (gear.weapon==='糖葫芦'?2.3:1.6)+(combo?.28:0)}
function action(){if(state!=='play')return;if(mode==='rush'){
  swing()
}else{const n=nearest();if(n)walkTo(n)}}
$('act').onpointerdown=e=>{if(mode==='rush'){e.stopPropagation();unlock();action()}};
$('act').onclick=e=>{if(mode!=='rush'||!e||e.detail===0)action()};$('pause').onclick=pause;
$('start').onclick=()=>begin('rush');$('settings').onclick=settings;$('shop').onclick=()=>shop();
addEventListener('resize',layoutControls);
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(state==='play'&&['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','escape'].includes(k)){e.preventDefault();keys.add(k);if(!e.repeat&&k===' ')action();if(k==='escape')pause()}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{stopInput();pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
let last=performance.now();function loop(ts){
  if(state==='loading'||state==='loadError'){last=ts;requestAnimationFrame(loop);return}
  const wall=Math.max(0,(ts-last)/1000);let dt=Math.min(.08,wall);last=ts;if(state==='play'&&mode==='rush'&&freeze>0){freeze=Math.max(0,freeze-wall);dt=0}let moving=false;
  if(state==='play'){elapsed+=wall;left-=wall;hit=Math.max(0,hit-dt);cool=Math.max(0,cool-dt);if(mode!=='rush')energy=Math.min(100,energy+dt*(9+save.skill*2));
    if(left<=0&&mode==='rush'){finish(false,'time')}
    if(state==='play'&&!chase&&dt>0&&(!strike||strike.age>.25))moving=move(dt);if(state==='play'){
      talentClock-=dt;
      if(bird){bird.position.set(p.x-.7,1.22+Math.sin(elapsed*5)*.13,p.z+.18);bird.rotation.y=p.yaw;
        if(talentClock<=0){energy=Math.min(100,energy+18);talentClock=5;floating('补给',p.x-.6,p.z,1.5)}}
      
      if(mode==='rush')survival(dt,wall);else scan(dt);if(left<=0&&state==='play'&&!chase)finish(false,'time');hud()}}
  music(state==='play'&&mode==='rush'&&!document.hidden);
  W.animate(state==='home'||state==='play'?dt:0,p,moving,Math.min(1,hit/.38),mode==='rush'?gear.weapon:save.weapon,mode==='rush'?{step:strike?(strike.age<.065?4:strike.age<.125?5:strike.age<.25?6:7):null,direction:strike?Math.sign(Math.sin(strike.yaw)*W.right.x+Math.cos(strike.yaw)*W.right.z):0,shake:save.calm?0:impactPower*(impactPulse/.23)**2*Math.sin((.23-impactPulse)*58),progress:strike?strike.age:0}:null);if(state!=='home')placeMarks(state==='play'?dt:0);
  if(ts>toastUntil&&$('toast').textContent)$('toast').textContent='';requestAnimationFrame(loop)
}
loadScene('正在打开巡查站',Object.keys(Paper.breeds),home);
requestAnimationFrame(loop)
})();

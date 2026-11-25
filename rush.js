// 敌潮进度单独存储，旧版金币、耐力和其他模式的装备不参与结算。
const Rush=(()=>{
  const key='wangcheng-rush-v2',weapons={'玩具锤':10,'黄瓜棒':12,'糖葫芦':14};
  function integer(n,fallback=0){return Number.isSafeInteger(n)&&n>=0?n:fallback}
  function load(fresh=false){
    let raw={};try{if(!fresh)raw=JSON.parse(localStorage.getItem(key))||{}}catch{}
    const levels={'玩具锤':Math.max(1,integer(raw.levels?.['玩具锤'],1))};
    for(const id of Object.keys(weapons))if(integer(raw.levels?.[id]))levels[id]=raw.levels[id];
    return {stage:Math.max(1,integer(raw.stage,1)),tokens:integer(raw.tokens),shards:integer(raw.shards),scooter:integer(raw.scooter),levels,weapon:levels[raw.weapon]?raw.weapon:'玩具锤'}
  }
  const profile=load();
  function store(){localStorage.setItem(key,JSON.stringify(profile))}
  function capacity(){return (weapons[profile.weapon]+(profile.levels[profile.weapon]-1)*4)*10}
  function rules(stage){return {count:stage<4?stage+1:Math.min(12,stage+2),seconds:(stage<4?65:55)+profile.scooter*12}}
  function draw(){
    if(profile.tokens<3)return '';profile.tokens-=3;
    const locked=Object.keys(weapons).filter(w=>!profile.levels[w]);
    let result;if(Math.random()<.08&&locked.length){const id=locked[Math.floor(Math.random()*locked.length)];profile.levels[id]=1;result='整件武器 · '+id}
    else{profile.shards++;result='武器碎片 ×1'}
    store();return result
  }
  function upgrade(){const cost=profile.levels[profile.weapon]*2;if(profile.shards<cost)return;profile.shards-=cost;profile.levels[profile.weapon]++;store()}
  function ride(){const cost=(profile.scooter+1)*6;if(profile.tokens<cost)return;profile.tokens-=cost;profile.scooter++;store()}
  function reward(){profile.tokens+=2;store()}
  function reset(){Object.assign(profile,load(true));store()}
  return {profile,reset,store,capacity,rules,draw,upgrade,ride,reward}
})();

// 场景、贴图和界面共用已解码的图片。加载失败的请求可重试。
const GameImages=(()=>{
  const ready=new Map(),pending=new Map();
  function url(name){return window.patrolPictures?.[name]||'art/'+name+'.png'}
  function load(name,attempt=0){
    if(ready.has(name))return Promise.resolve(ready.get(name));
    if(pending.has(name))return pending.get(name);
    const request=new Promise((resolve,reject)=>{
      const img=window.patrolHost?.createImage?window.patrolHost.createImage():new Image();
      let done=false;
      const fail=()=>{if(done)return;done=true;clearTimeout(timer);reject(new Error(name+'.png'))};
      const timer=setTimeout(fail,12000);
      img.onerror=fail;
      img.onload=async()=>{
        try{// onload guarantees that the image can be drawn; some webviews never settle decode().
          if(!img.width||!img.height)throw Error();
          if(done)return;window.patrolHost?.cacheIcon?.(name,img);ready.set(name,img);clearTimeout(timer);done=true;resolve(img)
        }catch{fail()}
      };
      img.src=url(name)+(attempt&&!window.patrolHost&&!window.patrolPictures?'?retry='+Date.now():'')
    }).finally(()=>pending.delete(name));
    pending.set(name,request);return request
  }
  function bind(texture,name){
    const attach=img=>{texture.image=img;texture.needsUpdate=true};
    if(ready.has(name))attach(ready.get(name));else load(name).then(attach,()=>{});
  }
  const six=prefix=>Array.from({length:6},(_,i)=>prefix+i);
  function level(id,breed,ride){
    if(id==='rush')return [(ride?'ride-':'run-')+breed,'hammer-key',...six('local-'),...six('rogue-'),...six('shop-')];
    return [breed,'speaker','recycle','listen','quiet']
  }
  return {load,bind,level,url,clear:()=>ready.clear(),get:name=>ready.get(name)}
})();

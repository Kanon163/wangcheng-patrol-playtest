// 道路、行人邻接表与可走区域来自同一次生长。
const Street=(()=>{
  const nodes=[],edges=[],links=[],roads=[],checkpoints=[];
  const names=['早点铺','唱片巷','果栏口','戏院街','修车铺','茶楼后巷','南市口','西牌坊'];
  const shops=[['早点铺','#b85739'],['海风唱片','#307575'],['阿娟果栏','#548352'],['红星戏院','#a74f55'],['单车修理','#526f88'],['顺记茶楼','#448374']];
  const quotas=[1,1,1,2,2,2,3,3],incidents=[3,4,5,0,1,2];
  const random=(min,max)=>min+Math.random()*(max-min),pick=a=>a[Math.floor(Math.random()*a.length)];
  function connect(a,b){edges.push([a,b]);links[a].push(b);links[b].push(a)}
  function adjacent(id){return [id%5>0?id-1:-1,id%5<4?id+1:-1,id>=5?id-5:-1,id<15?id+5:-1].filter(n=>n>=0)}
  function distances(start){
    const d=nodes.map(()=>Infinity),queue=[start];d[start]=0;
    for(let i=0;i<queue.length;i++)for(const j of links[queue[i]])if(d[j]===Infinity){d[j]=d[queue[i]]+1;queue.push(j)}
    return d
  }
  function generate(){
    for(const list of [nodes,edges,links,roads,checkpoints])list.length=0;
    const xs=[-18,-9,0,9,18].map(x=>x+random(-.7,.7)),zs=[-11.7,-4,4,11.7].map(z=>z+random(-.55,.55));
    const ids=[Math.floor(random(0,20))],count=Math.floor(random(11,16));
    function insert(id){nodes.push([xs[id%5],zs[Math.floor(id/5)]]);links.push([])}
    insert(ids[0]);
    while(ids.length<count){
      const options=[];ids.forEach((id,i)=>{for(const next of adjacent(id))if(!ids.includes(next))options.push([i,next])});
      const [parent,id]=pick(options);insert(id);connect(parent,ids.length);ids.push(id)
    }
    ids.forEach((id,i)=>{for(const n of adjacent(id)){const j=ids.indexOf(n);if(j>i&&!links[i].includes(j)&&Math.random()<.38)connect(i,j)}});
    const visited=new Set([0]);let at=0;
    while(checkpoints.length<names.length){
      const d=distances(at),available=nodes.map((_,i)=>i).filter(i=>!visited.has(i));
      const desired=checkpoints.length===0?1:Math.floor(random(2,5));
      const cost=i=>Math.abs(desired-d[i]),best=Math.min(...available.map(cost));at=pick(available.filter(i=>cost(i)===best));checkpoints.push(at);visited.add(at)
    }
    for(const [a,b] of edges){
      const [x,z]=nodes[a],[u,v]=nodes[b],half=random(2.22,2.65);
      roads.push({x:(x+u)/2,z:(z+v)/2,hx:Math.abs(x-u)/2+half,hz:Math.abs(z-v)/2+half,half,horizontal:z===v})
    }
  }
  function contains(x,z,padding=0){return roads.some(r=>Math.abs(x-r.x)<=r.hx-padding&&Math.abs(z-r.z)<=r.hz-padding)}
  function neighbor(i,previous){const choices=links[i].filter(j=>j!==previous);return choices.length?pick(choices):links[i][0]}
  function layout(g,{cube,ball,cyl,label},block,makeBuilding){
    generate();
    const box=(...v)=>cube(g,...v),post=(...v)=>cyl(g,...v);
    box('#91a98b',0,-.42,0,132,.65,106);
    for(const r of roads){
      const w=r.hx*2,d=r.hz*2;box('#d9bfa0',r.x,-.036,r.z,w,.09,d);
    }
    for(const [i,[a,b]] of edges.entries()){
      const r=roads[i],[ax,az]=nodes[a],[bx,bz]=nodes[b],length=Math.hypot(ax-bx,az-bz);
      const w=r.horizontal?length+3:2*r.half-1.15,d=r.horizontal?2*r.half-1.15:length+3,y=.018+(i%4)*.002;
      box('#737d7e',r.x,y,r.z,w,.024,d);StreetArt.plane(g,'asphalt',r.x,y+.014,r.z,w,d,3.8);
      for(let along=-length/2+2.65;along<length/2-1.9;along+=2.65){
        box('#eac78b',r.x+(r.horizontal?along:0),.056,r.z+(r.horizontal?0:along),r.horizontal?1:.07,.012,r.horizontal?.07:1)
      }
    }
    for(let i=0;i<nodes.length;i++){
      if(links[i].length<2)continue;
      const [x,z]=nodes[i],[u,v]=nodes[links[i][0]],sx=Math.sign(u-x),sz=Math.sign(v-z);
      for(let n=-2;n<=2;n++)box('#e8dcc0',x+sx*2.10+sz*n*.49,.066,z+sz*2.10+sx*n*.49,sx?.53:.24,.012,sz?.53:.24)
    }
    const lots=[];
    function vacant(x,z,w,d){
      return roads.every(r=>Math.abs(x-r.x)>w/2+r.hx+.08||Math.abs(z-r.z)>d/2+r.hz+.08)&&
        lots.every(l=>Math.abs(x-l.x)>(w+l.w)/2+.25||Math.abs(z-l.z)>(d+l.d)/2+.25)
    }
    for(let i=0;i<nodes.length;i++){
      const [x,z]=nodes[i],station=checkpoints.indexOf(i),id=station>=0?station%6:i%6;
      const corners=[[-1,-1],[1,-1],[-1,1],[1,1]],first=Math.floor(Math.random()*4);
      for(let k=0;k<4;k++){
        const [sx,sz]=corners[(k+first)%4],w=random(3.1,4.9),d=random(2.6,3.8),bx=x+sx*(2.76+w/2),bz=z+sz*(2.76+d/2);
        if(!vacant(bx,bz,w,d))continue;
        lots.push({x:bx,z:bz,w,d});block(bx,bz+.23,w+.34,d+.48);makeBuilding(bx,bz,w,d,random(2.6,3.9),id,shops[id],station>=0&&station<3);
        if(station>=0||k>0)break
      }
      if(station>=0){
        const px=x-1.48,pz=z-1.48;post('#385759',px,.89,pz,.085,1.78,.085);block(px,pz,.2,.2);
        label(g,names[station],px,1.78,pz,1.40,.43,'#39665e','#fff1c7')
      }
    }
    // 余下的街面放小铺和绿地，使巷道边缘在斜视镜头下也清楚。
    for(const r of roads){
      const w=random(2.7,4.1),d=random(2.4,3.5),side=Math.random()<.5?-1:1;
      const x=r.x+(r.horizontal?0:side*(r.half+w/2+.3)),z=r.z+(r.horizontal?side*(r.half+d/2+.3):0);
      if(vacant(x,z,w,d)){const id=Math.floor(random(0,6));lots.push({x,z,w,d});
        block(x,z+.22,w+.34,d+.48);makeBuilding(x,z,w,d,random(2.3,3.2),id,shops[id],false)}
    }
    for(let x=-25;x<=25;x+=3.5)for(let z=-19;z<=19;z+=3.5){
      const tx=x+random(-.6,.6),tz=z+random(-.6,.6);
      if(!vacant(tx,tz,2.1,2.1)||Math.random()>.39)continue;
      box('#849c77',tx,-.215,tz,2.1,.08,1.85);
      post('#816447',tx,.49,tz,.11,1.1,.11);
      ball(g,'#577f5f',tx,1.21,tz,.68,.66,.66);ball(g,'#78976b',tx+.22,1.55,tz-.12,.55,.55,.51)
    }
    // 陈设靠路肩，中央留给相向而行的路人和巡查员。
    for(const r of roads){if(Math.random()<.19)continue;
      const side=Math.random()<.5?-1:1,along=random(-.8,.8);
      const x=r.x+(r.horizontal?along:side*(r.half-.38)),z=r.z+(r.horizontal?side*(r.half-.38):along);
      const style=Math.floor(random(0,3));
      if(style===0){box('#947b64',x,.22,z,.82,.42,.77);post('#825940',x,.85,z,.10,1.3,.10);ball(g,'#568465',x,1.68,z,.66,.72,.62);block(x,z,.85,.80)}
      else if(style===1){box('#3e847a',x,.34,z,.53,.68,.5);box('#324d49',x,.70,z,.60,.10,.55);block(x,z,.60,.55)}
      else{box('#b77949',x,.24,z,.79,.48,.7);for(const dx of [-.19,.12])ball(g,'#eca448',x+dx,.54,z,.17,.15,.17);block(x,z,.82,.72)}
    }
  }
  return {nodes,edges,checkpoints,names,quotas,incidents,neighbor,contains,layout}
})();

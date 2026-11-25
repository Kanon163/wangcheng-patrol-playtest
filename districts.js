const Districts=(()=>{
  const catalog={
    classroom:['教室','#deb985','#699e87',['阅读角','黑板旁','后排'],['书包','讲台','书架','花盆','长椅']],
    cinema:['电影院','#a88591','#a84656',['检票口','放映厅','零食柜'],['零食柜','座椅','报刊架','背包','花盆']],
    street:['街头','#aeb9ad','#da8452',['步行街','斑马线','报亭'],['报刊架','旅行包','长椅','行李箱','花盆']],
    train:['列车','#afc9c0','#418f92',['餐车','连接处','安静车厢'],['行李箱','旅行包','长椅','报刊架','背包']],
    park:['公园','#9fbd82','#428969',['喷泉边','林荫道','花园'],['长椅','花盆','背包','报刊架','旅行包']],
    office:['办公室','#bdc9c2','#62899d',['前台','工位区','茶水间'],['文件柜','书架','背包','花盆','长椅']]
  };
  const zones=[[-12,-7],[0,0],[12,7]],last={};
  function choose(mode){if(mode==='rush')return {id:'market',name:Street.nextDistrict(),landmarks:Street.names};const ids=Object.keys(catalog).filter(id=>id!==last[mode]);const id=mode==='home'?'park':ids[Math.floor(Math.random()*ids.length)];
    if(mode!=='home')last[mode]=id;const [name,floor,accent,landmarks,items]=catalog[id];return {id,name,floor,accent,landmarks,items}}
  let solids=[],market=false,grid=null;
  const width=89,height=61,radius=.46;
  function clear(x,z){
    if(Math.abs(x)>22||Math.abs(z)>15||market&&!Street.contains(x,z,radius))return false;
    return !solids.some(([a,b,w,d])=>{
      const dx=Math.max(0,Math.abs(x-a)-w),dz=Math.max(0,Math.abs(z-b)-d);
      return dx*dx+dz*dz<radius*radius
    })
  }
  function point(i){return [(i%width)/2-22,Math.floor(i/width)/2-15]}
  function gridMap(){
    if(!grid){grid=new Uint8Array(width*height);for(let i=0;i<grid.length;i++){const [x,z]=point(i);grid[i]=clear(x,z)?1:0}}
    return grid
  }
  function free(x,z){
    if(clear(x,z))return [x,z];
    const map=gridMap();let nearest=0,best=Infinity;
    for(let i=0;i<map.length;i++)if(map[i]){
      const [a,b]=point(i),d=(a-x)**2+(b-z)**2;if(d<best){best=d;nearest=i}
    }
    return point(nearest)
  }
  function line(ax,az,bx,bz){
    const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.16));
    for(let i=1;i<=steps;i++)if(!clear(ax+(bx-ax)*i/steps,az+(bz-az)*i/steps))return false;
    return true
  }
  function route(ax,az,bx,bz){
    if(line(ax,az,bx,bz))return [];
    const map=gridMap(),seen=new Int32Array(map.length);seen.fill(-1);
    const queue=[];let end=-1;
    const col=Math.round((ax+22)*2),row=Math.round((az+15)*2);
    for(let z=Math.max(0,row-1);z<=Math.min(height-1,row+1);z++)for(let x=Math.max(0,col-1);x<=Math.min(width-1,col+1);x++){
      const id=z*width+x;if(map[id]&&line(ax,az,...point(id))){seen[id]=id;queue.push(id)}
    }
    for(let i=0;i<queue.length;i++){
      const id=queue[i],[x,z]=point(id);
      if(Math.hypot(x-bx,z-bz)<1.05&&line(x,z,bx,bz)){end=id;break}
      for(const n of [id-1,id+1,id-width,id+width]){
        if(!map[n]||seen[n]!==-1)continue;
        const [nx,nz]=point(n);if(Math.abs(nx-x)>.51||!clear((nx+x)/2,(nz+z)/2))continue;
        seen[n]=id;queue.push(n)
      }
    }
    if(end<0)return null;
    const path=[];for(let i=end;;i=seen[i]){path.push(point(i));if(seen[i]===i)break}
    path.reverse();path.push([bx,bz]);
    const corners=[];let x=ax,z=az;
    for(let i=0;i<path.length;){let j=i;while(j+1<path.length&&line(x,z,...path[j+1]))j++;
      [x,z]=path[j];corners.push(path[j]);i=j+1
    }
    corners.pop();return corners
  }
  function build(g,d,{cube,ball,cyl,bench,plant,label,makeBuilding},home){
    solids=[];grid=null;market=d.id==='market';const block=(x,z,w,d)=>solids.push([x,z,w/2,d/2]);
    if(d.id==='market'){Street.layout(g,{cube,ball,cyl,label},block,makeBuilding);return}
    const box=(...v)=>cube(g,...v),round=(...v)=>ball(g,...v),post=(...v)=>cyl(g,...v),sign=(...v)=>label(g,...v);
    const {id,floor,accent}=d, ink='#344b4c',white='#fff1ce';
    box('#577267',0,-.26,0,48,.48,34);box(floor,0,-.055,0,48,.09,34);
    for(let x=-22;x<=22;x+=4)box('#a6a994',x,-.005,0,.035,.012,34);
    for(let z=-16;z<=16;z+=4)box('#a6a994',0,-.004,z,48,.012,.035);
    function tree(x,z){block(x,z,.4,.4);post('#986c49',x,.65,z,.12,1.3,.12);round(accent,x,1.65,z,.86,.87,.75);round('#87ad65',x+.34,1.92,z+.1,.57,.59,.49)}
    function desk(x,z,pc){block(x,z+.29,1.8,1.50);box('#825f48',x,.78,z,1.75,.14,.92);for(const s of [-1,1])box(ink,x+s*.68,.38,z,.12,.75,.7);
      box(accent,x,.45,z+.76,.65,.13,.51);box(accent,x,.70,z+1,.66,.52,.10);
      if(pc){box(ink,x,.99,z,.13,.42,.15);box(ink,x,1.32,z,1.07,.64,.1);box('#88c1ca',x,1.32,z+.06,.91,.48,.03)}
      else box(white,x+.25,.88,z+.03,.5,.045,.34)}
    function screen(x,z,board){block(x,z,4.4,.22);box(ink,x,1.64,z,4.4,2.5,.18);box(board?'#477a69':'#fbe7b0',x,1.66,z+.11,4.17,2.23,.07);
      if(board){for(let k=0;k<3;k++)box(white,x-.5,2-k*.33,z+.16,1+k*.27,.045,.025)}
      else{round('#efa654',x+.68,1.9,z+.16,.36,.36,.025);box('#7eada3',x-.45,1.17,z+.16,2.25,.28,.025)}}
    function seats(x,z,cinema){block(x,z,2.04,.65);for(let j=-1;j<=1;j++){const a=x+j*.68;box(cinema?'#a13e51':accent,a,.43,z,.61,.22,.63);box(cinema?'#be5962':accent,a,.83,z-.26,.63,.79,.16);box(ink,a,.21,z,.23,.42,.32)}}
    function stall(x,z){block(x,z,3.1,1.65);box('#e5b77c',x,.95,z,3,1.9,1.35);box('#566c6d',x,1.27,z+.70,2.55,.88,.1);
      for(let j=-2;j<=2;j++)box(j%2?white:accent,x+j*.61,2.06,z+.24,.61,.19,1.88);box(white,x,.75,z+.8,3.1,.16,.45)}
    function fountain(x,z){block(x,z,2.6,2.6);post('#c9c5a6',x,.17,z,1.36,.34,1.36);post('#68afae',x,.35,z,1.18,.04,1.18);post('#d9c49a',x,.62,z,.20,.62,.20);post('#abd4ca',x,.95,z,.67,.12,.67);round('#7ac6cf',x,1.12,z,.17,.32,.17)}
    if(id==='street'||id==='park'){
      box(id==='park'?'#decc94':'#818e8f',0,.004,0,48,.016,4.4);
      for(let x=-22;x<23;x+=3)box(white,x,.018,0,1.15,.015,.08);
      if(id==='street')for(const x of [-12,0,12])for(let k=-3;k<=3;k++)box(white,x+k*.32,.025,0,.19,.014,3.8)
    }
    if(id==='train')for(let row=-1;row<=1;row++){let z=row*10-3;
      
      for(let x=-22;x<23;x+=3){block(x,z,2.28,.2);box('#7eaba5',x,.91,z,2.28,1.85,.16);box(ink,x,1.24,z+.12,1.98,.85,.08);box('#a7cdcc',x,1.25,z+.17,1.82,.70,.03)}}
    for(let row=-1;row<=1;row++)for(let col=-2;col<=2;col++){
      const x=col*9+(Math.random()-.5)*1.2,z=row*10-2.8+(Math.random()-.5)*.95;
      if(home&&Math.abs(x)<3&&Math.abs(z)<5)continue;
      switch(id){
        case 'classroom':if(col===-2||row===-1&&col===0)screen(x,z,true);else{desk(x,z,false);desk(x+2.1,z,false)}break;
        case 'cinema':if(col===-2||row===-1&&col===0)screen(x,z,false);else{seats(x,z,true);seats(x+2.2,z,true)}break;
        case 'office':desk(x,z,true);if(col%2)desk(x+2.15,z,true);else plant(g,x+1.8,z);break;
        case 'street':if((col+row)%2)stall(x,z);else{tree(x,z);bench(g,x+2,z)}break;
        case 'train':seats(x,z+.8,false);post('#c8ad6e',x+1.26,1.04,z+.7,.055,2.08,.055);break;
        case 'park':if(col===0&&row===0||col===-1&&row===-1)fountain(x,z);else{tree(x-.6,z);if((col+row)%2)bench(g,x+1.5,z);else plant(g,x+1.6,z)}break
      }
    }
    if(home){tree(-2.4,-2.6);bench(g,1.5,-3.5);plant(g,2.6,-2.8);return}
    zones.forEach(([x,z],i)=>{post(ink,x-2,.68,z-1.55,.058,1.36,.058);sign(d.landmarks[i],x-2,1.35,z-1.55,1.95,.43,accent,white)});
  }
  return {choose,build,zones,free,clear,route,line}
})();

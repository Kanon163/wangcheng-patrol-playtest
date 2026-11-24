/* 原创低多边形车站与角色。模型以米为单位，地面为 XZ 平面。 */
const World = (() => {
  const T = THREE, canvas = document.querySelector('#scene');
  const renderer = new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  const scene = new T.Scene(), camera = new T.OrthographicCamera();
  scene.background = new T.Color(0xadd8c9);
  scene.add(new T.HemisphereLight(0xfff5d9,0x87abc2,2.35));
  const sun = new T.DirectionalLight(0xffdfa9,2.3);sun.position.set(-6,12,8);scene.add(sun);
  const box = new T.BoxGeometry(), orb = new T.SphereGeometry(1,10,8), cone = new T.ConeGeometry(1,1,4), tube = new T.CylinderGeometry(1,1,1,10);
  const ink='#22363d',gold='#f1ac32',cream='#fff0c9',teal='#16887b';
  const mats=new Map(), signMats=new Map();
  function material(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,flatShading:true,roughness:.94}));return mats.get(c)}
  function shape(g,geo,c,x,y,z,sx,sy,sz){const m=new T.Mesh(geo,typeof c==='string'?material(c):c);m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m}
  const cube=(g,c,x,y,z,w,h,d)=>shape(g,box,c,x,y,z,w,h,d);
  const ball=(g,c,x,y,z,w,h,d)=>shape(g,orb,c,x,y,z,w,h,d);
  const cyl=(g,c,x,y,z,w,h,d)=>shape(g,tube,c,x,y,z,w,h,d);
  function grp(parent){const g=new T.Group();parent.add(g);return g}
  // Batch fixed models so the tiled platform and miniature figures cost few draw calls.
  function bake(group){
    group.updateMatrixWorld(true);const inv=group.matrixWorld.clone().invert(), buckets=new Map();
    for(const child of [...group.children]){
      if(!child.isMesh)continue;
      const original=child.geometry, geo=original.index?original.toNonIndexed():original.clone();
      geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,child.matrixWorld));
      let b=buckets.get(child.material);if(!b){b={p:[],n:[],uv:[]};buckets.set(child.material,b)}
      for(const [key,attr] of [['p','position'],['n','normal'],['uv','uv']])b[key].push(...geo.getAttribute(attr).array);
      geo.dispose();group.remove(child)
    }
    for(const [mat,b] of buckets){const g=new T.BufferGeometry();
      for(const [key,attr,size] of [['p','position',3],['n','normal',3],['uv','uv',2]])g.setAttribute(attr,new T.Float32BufferAttribute(b[key],size));
      const mesh=new T.Mesh(g,mat);mesh.userData.baked=true;group.add(mesh)
    }
  }
  function dispose(root){root.traverse(o=>{if(o.userData.baked)o.geometry.dispose()});root.removeFromParent()}
  function sign(text,bg,fg){
    const key=text+bg+fg;if(signMats.has(key))return signMats.get(key);
    const c=document.createElement('canvas');c.width=512;c.height=128;const p=c.getContext('2d');
    p.fillStyle=bg;p.fillRect(0,0,512,128);p.fillStyle=fg;p.font='900 74px "Microsoft YaHei",sans-serif';p.textAlign='center';p.textBaseline='middle';p.fillText(text,256,66,490);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tex});signMats.set(key,m);return m
  }
  function label(g,text,x,y,z,w,h,bg=ink,fg=cream){cube(g,sign(text,bg,fg),x,y,z,w,h,.045)}
  function shadow(g,x,z,w,d){cyl(g,'#769990',x,.012,z,w,.018,d)}
  let stage=grp(scene),actors=grp(scene),dog,head,legs,tail,hammer,home=true,t=0;
  function makeDog(){
    const g=grp(actors);shadow(g,0,0,.57,.61);const body=grp(g);
    ball(body,'#c97529',0,.56,-.07,.40,.43,.56);ball(body,cream,0,.56,.24,.33,.36,.34);
    ball(body,teal,0,.77,.04,.43,.17,.45);const scarf=cube(body,'#0b706e',-.37,.65,.09,.17,.38,.2);scarf.rotation.z=-.33;
    cube(body,gold,0,.73,.45,.15,.15,.06).rotation.z=.78;
    legs=[];for(const x of [-.25,.25])for(const z of [-.30,.28]){const f=grp(g);f.position.set(x,.09,z);ball(f,cream,0,.12,0,.14,.18,.16);legs.push(f)}
    head=grp(g);head.position.set(0,1,.12);
    ball(head,'#df8a33',0,.1,0,.48,.43,.42);
    for(const side of [-1,1]){
      const ear=shape(head,cone,'#ab572a',side*.31,.51,-.025,.223,.50,.18);ear.rotation.z=-side*.17;ear.rotation.y=Math.PI/4;
      const pink=shape(head,cone,'#f4a989',side*.31,.50,.073,.135,.32,.06);pink.rotation.y=Math.PI/4;pink.rotation.z=-side*.17;
      ball(head,cream,side*.207,.24,.305,.115,.055,.048);
      ball(head,ink,side*.185,.106,.362,.062,.079,.041);
      ball(head,'#ffffff',side*.18-.014,.132,.4,.017,.019,.010);
      ball(head,cream,side*.14,-.06,.30,.215,.165,.185);
    }
    ball(head,ink,0,-.015,.488,.10,.064,.055);ball(head,'#cb6356',.02,-.16,.413,.062,.068,.036);
    tail=grp(g);tail.position.set(0,.68,-.47);ball(tail,'#d17f29',.08,.1,-.11,.17,.25,.17);ball(tail,cream,.13,.28,-.08,.13,.115,.14);
    hammer=grp(g);hammer.position.set(.43,.54,.25);cube(hammer,'#704630',0,.26,0,.09,.65,.09);cube(hammer,'#cf5147',0,.63,0,.49,.26,.28);for(const x of [-.25,.25])cube(hammer,'#ffcb4a',x,.63,0,.085,.31,.32);hammer.rotation.z=-.55;
    for(const part of [body,head,tail,hammer,...legs])bake(part);return g
  }
  const jackets=['#de664b','#277f8a','#bb8442','#675b93','#639553'],skins=['#e9ab7f','#c28b6c','#f0be96'];
  function person(color='red',item='',variant=0){
    const g=grp(actors);const coat=({blue:'#2478b0',red:'#e96652',green:'#488d62'})[color]||jackets[variant%5],skin=skins[variant%3];
    shadow(g,0,0,.36,.29);
    for(const s of [-1,1]){cube(g,ink,s*.12,.18,0,.16,.35,.18);cube(g,'#493e39',s*.12,.07,.045,.19,.13,.26);ball(g,skin,s*.285,.58,.06,.085,.16,.093)}
    cube(g,coat,0,.56,0,.47,.49,.31);cube(g,cream,0,.72,.165,.105,.11,.04);
    ball(g,skin,0,1.02,0,.253,.267,.239);ball(g,variant%2?'#533c39':'#322f38',0,1.18,-.035,.26,.14,.24);
    for(const s of [-1,1])ball(g,ink,s*.092,1.045,.213,.027,.031,.026);
    if(item==='帽子'){cyl(g,gold,0,1.28,0,.29,.09,.28);cyl(g,gold,0,1.32,0,.20,.12,.19)}
    else if(item==='挎包'){cube(g,gold,.17,.44,.17,.25,.20,.12);cube(g,'#76552e',0,.62,.18,.047,.5,.025).rotation.z=-.55}
    else cube(g,'#273a44',.27,.61,.125,.13,.20,.055);
    bake(g);return g
  }
  function bench(g,x,z){
    for(let i=-1;i<=1;i++){cube(g,teal,x+i*.64,.50,z,.58,.13,.53);cube(g,'#42a99b',x+i*.64,.75,z-.24,.58,.48,.1)}
    for(const a of [-.63,.63])cube(g,ink,x+a,.23,z,.09,.46,.32)
  }
  function plant(g,x,z){cyl(g,'#cf7651',x,.23,z,.32,.45,.32);cyl(g,cream,x,.45,z,.35,.11,.35);
    for(let i=0;i<6;i++){const a=i*1.15;const l=ball(g,i%2?'#5b9b58':'#39816b',x+Math.cos(a)*.19,.68+i%2*.15,z+Math.sin(a)*.15,.13,.34,.12);l.rotation.z=Math.sin(a)*.65}}
  function buildStage(mode){
    dispose(stage);dispose(actors);stage=grp(scene);actors=grp(scene);home=mode==='home';
    cube(stage,'#355f60',0,-.43,0,13.3,.75,10.7);cube(stage,'#e6c890',0,-.14,0,13.5,.26,10.9);
    for(let ix=-6;ix<=6;ix++)for(let iz=-5;iz<=5;iz++){const v=(ix*21+iz*13)%7;cube(stage,v===0?'#d6d3b3':v%3===0?'#c8d4be':'#e7ddc1',ix,-.047,iz,.987,.075,.987)}
    for(let i=-6;i<=6;i++){cube(stage,'#e6ac39',i,.003,-3.15,.98,.05,.34);for(let j=0;j<4;j++)cube(stage,'#bb8834',i-.37+j*.25,.034,-3.15,.05,.012,.17)}
    // A cutaway metro carriage, with glass, split doors and a route stripe.
    cube(stage,'#334f56',0,.44,-4.65,13.25,.84,1.45);cube(stage,'#d4e8d7',0,1.53,-4.72,13.3,1.96,1.36);
    cube(stage,'#568781',0,2.55,-4.71,13.45,.21,1.45);cube(stage,'#288f87',0,.98,-4.012,13.30,.19,.05);
    for(let ix=-5;ix<=5;ix+=2){cube(stage,ink,ix,1.83,-4.015,1.53,.79,.07);cube(stage,'#74afbb',ix,1.85,-3.97,1.4,.62,.05);cube(stage,'#b4d7cf',ix-.42,1.90,-3.935,.12,.50,.025).rotation.z=-.38}
    for(const x of [-3.95,0,3.95]){cube(stage,'#739899',x,1.49,-3.95,.78,1.89,.12);cube(stage,ink,x,1.49,-3.875,.032,1.82,.02);for(const s of [-1,1])cube(stage,'#385c6a',x+s*.19,1.84,-3.875,.24,.56,.02)}
    const stationName=({search:'静 音 线',rush:'下 班 高 峰',case:'失 物 招 领'})[mode]||'汪 城 线';
    label(stage,stationName,1.92,2.36,-3.98,1.45,.31);
    if(mode==='case'){
      const side=Math.random()>.5?1:-1;
      for(let i=0;i<3;i++) {const x=side*(2.4+i*.88);cyl(stage,ink,x,.29,3.65,.05,.55,.05);cyl(stage,'#ad9d82',x,.05,3.65,.15,.08,.15);
        if(i!==2)cube(stage,'#cf6650',x+side*.44,.51,3.65,.87,.08,.035)}
    }else if(mode==='rush'){
      for(const x of [-3,0,3]){cube(stage,'#769e91',x,.002,2.7,.13,.016,.43);
        for(const s of [-1,1])cube(stage,'#769e91',x+s*.105,.004,2.53,.09,.018,.29).rotation.y=s*.74}
    }
    bench(stage,-4.60,-2.06);bench(stage,4.45,-2.1);plant(stage,-5.9,-2.1);plant(stage,5.85,-1.9);
    const decorX=(Math.random()>.5?1:-1)*4.95;plant(stage,decorX,3.8);
    cube(stage,ink,-6.25,1.5,.55,.12,3,.13);label(stage,'B · 出口',-6.23,2.78,.59,1.25,.42,'#26716b','#fff7d8');
    bake(stage);dog=makeDog();dog.rotation.y=.48;if(home){dog.scale.setScalar(1.85);dog.position.set(0,0,0)}
    return dog
  }
  function prop(kind,colorIndex){
    const g=grp(actors), c=['#e1a642','#49a297','#dc745a','#6287b2','#a180ac'][colorIndex%5];shadow(g,0,0,.52,.41);
    if(kind==='报刊架'){cube(g,ink,0,.46,0,.72,.89,.32);for(let j=0;j<2;j++){cube(g,cream,0,.37+j*.35,.18,.62,.25,.05);cube(g,c,-.12,.38+j*.35,.215,.25,.12,.012)}}
    else if(kind==='长椅'){bench(g,0,0);cube(g,c,.27,.69,.05,.45,.32,.33)}
    else if(kind==='花盆'){plant(g,0,0)}
    else{cube(g,c,0,.46,0,.70,.77,.45);for(const x of [-.22,.22]){cyl(g,ink,x,.08,0,.09,.12,.09);cube(g,cream,x,.47,.236,.035,.60,.02)}cube(g,ink,0,.9,0,.26,.085,.08)}
    bake(g);return g
  }
  function place(mesh,x,z){mesh.position.x=x;mesh.position.z=z;return mesh}
  const focus=new T.Vector3(), camDir=new T.Vector3(8,13,10).normalize(),screenPos=new T.Vector3(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  function cameraUpdate(dt){
    const w=innerWidth,h=innerHeight,ratio=w/h;const height=home?(ratio>1.2?6.1:Math.max(6.6,3.2/ratio)):Math.max(8.0,8.1/ratio);
    let fx=home?(ratio>1.2?1.5:0):dog.position.x*.67, fz=home?0:dog.position.z*.67;
    focus.lerp(new T.Vector3(fx,home?1.38:.15,fz),dt>=1?1:1-Math.exp(-dt*5));
    camera.left=-height*ratio/2;camera.right=-camera.left;camera.top=height/2;camera.bottom=-height/2;camera.near=.1;camera.far=110;
    camera.position.copy(focus).addScaledVector(camDir,32);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  function project(x,y,z){screenPos.set(x,y,z).project(camera);return {x:(screenPos.x+1)*innerWidth/2,y:(1-screenPos.y)*innerHeight/2}}
  function ground(x,y){ray.setFromCamera({x:x/innerWidth*2-1,y:1-y/innerHeight*2},camera);const p=new T.Vector3();ray.ray.intersectPlane(plane,p);return p}
  function resize(){renderer.setSize(innerWidth,innerHeight,false);if(dog)cameraUpdate(1)}
  addEventListener('resize',resize);resize();
  function animate(dt,p,moving,swing,weapon){
    t+=dt;if(!home){place(dog,p.x,p.z);if(moving)dog.rotation.y=p.yaw}
    head.rotation.z=Math.sin(t*(moving?12:2))*(moving?.055:.034);head.position.y=1+Math.sin(t*(moving?14:2.5))*(moving?.06:.018);
    tail.rotation.z=Math.sin(t*7)*.27;legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(t*14+i%2*Math.PI+Math.floor(i/2)*Math.PI)*.57:0);
    hammer.rotation.z=-.48-Math.sin(swing*Math.PI)*1.8;hammer.rotation.x=-Math.sin(swing*Math.PI)*1.35;
    cameraUpdate(dt);renderer.render(scene,camera)
  }
  function equip(name){const colors=name==='黄瓜棒'?['#458755','#8bb756']:name==='糖葫芦'?['#b52a3e','#f17a50']:['#cf5147','#ffcb4a'];
    // Keep the handle, replace the head with the selected silhouette.
    dispose(hammer);hammer=grp(dog);hammer.position.set(.43,.54,.25);cube(hammer,'#704630',0,.26,0,.09,.65,.09);
    if(name==='糖葫芦'){for(let i=0;i<3;i++)ball(hammer,colors[i%2],0,.49+i*.16,0,.117,.115,.115)}
    else if(name==='黄瓜棒'){ball(hammer,colors[0],0,.62,0,.12,.35,.12);for(let i=0;i<3;i++)ball(hammer,colors[1],.095,.48+i*.13,.03,.035,.035,.035)}
    else{cube(hammer,colors[0],0,.63,0,.49,.26,.28);for(const x of [-.25,.25])cube(hammer,colors[1],x,.63,0,.085,.31,.32)}
    bake(hammer)
  }
  function bird(){
    const g=grp(actors);ball(g,'#3a9293',0,0,0,.23,.19,.31);ball(g,'#407c88',0,.15,.20,.17,.17,.17);
    ball(g,cream,0,.12,.32,.13,.11,.08);shape(g,cone,gold,0,.12,.405,.065,.11,.06).rotation.x=Math.PI/2;
    for(const s of [-1,1]){ball(g,ink,s*.09,.19,.31,.025,.03,.02);ball(g,'#8bd5ce',s*.22,.015,-.03,.16,.06,.16)}
    bake(g);return g
  }
  return {buildStage,person,prop,bird,place,dispose,project,ground,animate,equip,snap:()=>cameraUpdate(1),right:{x:10/Math.sqrt(164),z:-8/Math.sqrt(164)},down:{x:8/Math.sqrt(164),z:10/Math.sqrt(164)}}
})();

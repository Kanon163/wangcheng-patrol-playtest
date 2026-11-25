/* 固定斜视相机，纸片角色与分区三维场景。 */
const World = (() => {
  const T = THREE, canvas = document.querySelector('#scene');
  const renderer = new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  window.patrolHost?.attachRenderer(renderer);
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
  function dispose(root){root.traverse(o=>{if(o.userData.baked)o.geometry.dispose();if(o.userData.ownMat)o.material.dispose();if(o.userData.rigged)o.skeleton.dispose()});root.removeFromParent()}
  function sign(text,bg,fg){
    const key=text+bg+fg;if(signMats.has(key))return signMats.get(key);
    const c=document.createElement('canvas');c.width=512;c.height=128;const p=c.getContext('2d');
    p.fillStyle=bg;p.fillRect(0,0,512,128);p.fillStyle=fg;p.font='900 74px "Microsoft YaHei",sans-serif';p.textAlign='center';p.textBaseline='middle';p.fillText(text,256,66,490);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tex});signMats.set(key,m);return m
  }
  function label(g,text,x,y,z,w,h,bg=ink,fg=cream){cube(g,sign(text,bg,fg),x,y,z,w,h,.045)}
  const shadowGeo=new T.CircleGeometry(1,40),shadowMat=new T.MeshBasicMaterial({color:'#344538',transparent:true,opacity:.19,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function shadow(g,x,z,w,d){const disc=new T.Mesh(shadowGeo,shadowMat);disc.rotation.x=-Math.PI/2;disc.scale.set(w,d,1);disc.position.set(x,.038,z);g.add(disc)}
  let stage=grp(scene),actors=grp(scene),dog,rig,hammer,home=true,t=0,district,look='shiba',clothes={};
  const streetShade=new T.MeshBasicMaterial({color:0x293c46,transparent:true,opacity:.18,depthWrite:false});
  let buildings=[],stroke,stamp;
  function goal(index){if(!stamp)return;stamp.visible=index<3;if(stamp.visible){const [x,z]=Street.nodes[Street.checkpoints[index]];stamp.position.set(x,.095,z)}}
  function makeBuilding(x,z,w,d,h,id,[name,accent],landmark){
    const b=grp(stage);b.position.set(x,0,z);buildings.push({b,x,z,w,d,h});
    cube(b,'#977e6c',0,h/2,0,w,h,d);
    const front=Cels.material('shop-'+id);
    const facade=(width,xx,zz,rot)=>{const m=new T.Mesh(new T.PlaneGeometry(width,h),front);m.userData.baked=true;m.rotation.y=rot;m.position.set(xx,h/2,zz);b.add(m)};
    facade(w,0,d/2+.012,0);
    // A quieter side elevation frames the illustrated shopfront at each corner.
    cube(b,'#cfbba2',w/2+.015,h/2,0,.06,h,d);
    for(const zz of [-d*.27,d*.22]){
      cube(b,'#535f5c',w/2+.057,h*.69,zz,.08,h*.34,.92);
      cube(b,'#85a3a2',w/2+.11,h*.69,zz,.05,h*.27,.76);
      cube(b,'#d6c29f',w/2+.15,h*.69,zz,.05,h*.31,.06);
      cube(b,'#746958',w/2+.17,h*.52,zz,.25,.085,1.08)}
    cube(b,'#897e6b',w/2+.10,.22,0,.16,.44,d);
    cube(b,'#657873',w/2+.12,h*.47,-d*.43,.12,h*.93,.11);
    cube(b,'#53675e',0,h+.04,0,w+.20,.13,d+.18);cube(b,'#aa9a76',0,h+.15,0,w-.1,.14,d-.1);
    cube(b,accent,0,h*.51,d*.5+.14,w+.13,.14,.55);label(b,name,0,h*.64,d*.5+.05,w*.63,.43,accent,'#fff0ca');
    StreetArt.plane(b,id%2?'slate':'terracotta',0,h+.232,0,w-.15,d-.15,3.4);
    cube(b,'#7c8884',-w*.27,h+.40,-d*.18,.83,.46,.70);
    for(let k=0;k<4;k++)cube(b,'#495b59',-w*.27-.26+k*.17,h+.642,-d*.18,.08,.036,.55);
    if(id%2===0){cube(b,'#536566',w*.25,h+.33,-d*.15,1.07,.19,.78);cube(b,'#a3bfbd',w*.25,h+.45,-d*.15,.87,.08,.57)}
    else{cyl(b,'#b5a188',w*.25,h+.60,-d*.15,.41,.88,.41);cyl(b,'#677974',w*.25,h+1.05,-d*.15,.45,.09,.45)}
    if(landmark){
      const zf=d/2;cube(b,accent,0,h*.48,zf+.28,w+.18,.16,.84);
      for(let k=0;k<12;k++){const bx=(k-5.5)*w/12;cube(b,k%2?accent:'#f3dbac',bx,h*.48+.045,zf+.42,w/12,.115,.83).rotation.x=.12;
        cube(b,k%2?accent:'#f3dbac',bx,h*.48-.09,zf+.82,w/12,.18,.075)}
      cube(b,'#344b47',w*.41,h*.85,zf+.30,.095,.085,.73);StreetArt.emblem(b,id,w*.41,h*.77-.25,zf+.66);
      if(id===0){for(const px of [-.55,.40]){cyl(b,'#9b6846',px,.37,zf+.33,.39,.58,.39);cyl(b,'#dbb16c',px,.68,zf+.33,.43,.11,.43);
        for(let k=-1;k<2;k++)ball(b,'#fff0c8',px+k*.18,.77,zf+.33,.12,.10,.12)}}
      if(id===2){for(let k=0;k<3;k++){const px=(k-1)*.68;cube(b,'#ae7952',px,.28,zf+.26,.63,.50,.54);
        for(const dx of [-.14,.14])ball(b,k%2?'#edb544':'#d98337',px+dx,.56,zf+.28,.14,.14,.13)}}
    }
    const cast=new T.Mesh(new T.PlaneGeometry(w+.18,d+.17),streetShade);cast.rotation.x=-Math.PI/2;cast.position.set(x+.47,.103,z+.27);cast.userData.baked=true;stage.add(cast);
    bake(b)
  }
  function pedestrian(id){const g=grp(actors);shadow(g,0,0,.37,.26);const card=Cels.actor(id,2.12);g.add(card);face(card);g.userData.paper=card;
    const form=new T.Shape();for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?.20:(i%4?.42:.66);if(!i)form.moveTo(r,0);else form.lineTo(Math.cos(a)*r,Math.sin(a)*r)}form.closePath();
    const spark=grp(card),burst=new T.ShapeGeometry(form);
    for(const [size,color,depth] of [[1,'#543524',0],[.86,'#ffb541',.009],[.56,'#fff4c3',.019]]){
      const ray=new T.Mesh(burst,material(color));ray.scale.setScalar(size);ray.position.z=depth;spark.add(ray)}
    spark.children[0].userData.baked=true;spark.position.set(-.27,1.01,.09);spark.visible=false;g.userData.spark=spark;return g}
  function pedestrianPose(m,frame,flash,shake,spark){
    const card=m.mesh.userData.paper,art=card.userData.card,age=.52-m.reaction;
    const bounce=m.reaction>0?Math.exp(-age*10)*Math.cos(age*24):0;
    Cels.frame(card,frame,flash);card.scale.x=m.facing||1;
    art.scale.set(1+bounce*.16,1-bounce*.11,1);art.position.y=2.12*.475*art.scale.y;
    card.position.x=shake*.068;art.rotation.z=shake*.048;
    const star=m.mesh.userData.spark;star.visible=spark;
    if(spark){star.scale.setScalar(.71+Math.min(1,age/.105)*.35);star.rotation.z=-.19+age*.95}
  }
  function person(color,item,variant=0){return citizen(Paper.behaviors[3+({red:0,blue:1,green:2}[color]??variant%3)])}
  function citizen(id){const g=grp(actors);shadow(g,0,0,.37,.28);const paper=Paper.npc(id);g.add(paper);g.userData.paper=paper;face(paper);return g}
  function face(card){card.quaternion.copy(camera.quaternion)}
  function outfit(breed,wear){look=Paper.breeds[breed]?breed:'shiba';clothes=wear||{};if(!dog)return;
    if(rig)dispose(rig.g);rig=district?.id==='market'?Cels.dog(look,clothes):Paper.dog(look,clothes);dog.add(rig.g);face(rig.g);hammer=null}
  function bench(g,x,z){
    for(let i=-1;i<=1;i++){cube(g,teal,x+i*.64,.50,z,.58,.13,.53);cube(g,'#42a99b',x+i*.64,.75,z-.24,.58,.48,.1)}
    for(const a of [-.63,.63])cube(g,ink,x+a,.23,z,.09,.46,.32)
  }
  function plant(g,x,z){cyl(g,'#cf7651',x,.23,z,.32,.45,.32);cyl(g,cream,x,.45,z,.35,.11,.35);
    for(let i=0;i<6;i++){const a=i*1.15;const l=ball(g,i%2?'#5b9b58':'#39816b',x+Math.cos(a)*.19,.68+i%2*.15,z+Math.sin(a)*.15,.13,.34,.12);l.rotation.z=Math.sin(a)*.65}}
  function buildStage(mode){
    dispose(stage);dispose(actors);stage=grp(scene);actors=grp(scene);home=mode==='home';
    buildings=[];stroke=null;stamp=null;district=Districts.choose(mode);Districts.build(stage,district,{cube,ball,cyl,bench,plant,label,makeBuilding},home);bake(stage);
    dog=grp(actors);shadow(dog,0,0,.50,.35);rig=null;outfit(look,clothes);
    if(home)dog.scale.setScalar(1.58);
    if(mode==='rush'){stamp=grp(actors);
      for(const [inner,outer,color] of [[1.25,1.49,'#264c4c'],[1.31,1.43,'#ffd465']]){
        const ring=new T.Mesh(new T.RingGeometry(inner,outer,44),new T.MeshBasicMaterial({color,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=inner*.01;ring.userData.baked=ring.userData.ownMat=true;stamp.add(ring)}
      goal(0);stroke=new T.Mesh(new T.RingGeometry(.89,1.02,21,1,-.75,2.25),new T.MeshBasicMaterial({color:'#ffe9a6',side:T.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));stroke.userData.baked=true;stroke.userData.ownMat=true;rig.g.add(stroke);stroke.position.set(.20,.89,.05);stroke.visible=false}
    return district
  }
  function prop(kind,colorIndex){
    const g=grp(actors), c=['#e1a642','#49a297','#dc745a','#6287b2','#a180ac'][colorIndex%5];shadow(g,0,0,.52,.41);
    if(['报刊架','书架','文件柜','零食柜','讲台'].includes(kind)){cube(g,ink,0,.46,0,.72,.89,.32);for(let j=0;j<2;j++){cube(g,cream,0,.37+j*.35,.18,.62,.25,.05);cube(g,c,-.12,.38+j*.35,.215,.25,.12,.012)}}
    else if(kind==='长椅'||kind==='座椅'){bench(g,0,0);cube(g,c,.27,.69,.05,.45,.32,.33)}
    else if(kind==='花盆'){plant(g,0,0)}
    else{cube(g,c,0,.46,0,.70,.77,.45);for(const x of [-.22,.22]){cyl(g,ink,x,.08,0,.09,.12,.09);cube(g,cream,x,.47,.236,.035,.60,.02)}cube(g,ink,0,.9,0,.26,.085,.08)}
    bake(g);return g
  }
  function place(mesh,x,z){mesh.position.x=x;mesh.position.z=z;return mesh}
  const focus=new T.Vector3(), camDir=new T.Vector3(8,13,10).normalize(),screenPos=new T.Vector3(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  function cameraUpdate(dt){
    const w=innerWidth,h=innerHeight,ratio=w/h;const height=home?(ratio>1.2?6.1:Math.max(6.6,3.2/ratio)):(district?.id==='market'?Math.max(9.8,9.0/ratio):Math.max(7.5,6.7/ratio));
    let fx=home?(ratio>1.2?1.5:0):dog.position.x, fz=home?0:dog.position.z;
    focus.lerp(new T.Vector3(fx,home?1.33:.5,fz),dt>=1?1:1-Math.exp(-dt*5));
    camera.left=-height*ratio/2;camera.right=-camera.left;camera.top=height/2;camera.bottom=-height/2;camera.near=.1;camera.far=110;
    camera.position.copy(focus).addScaledVector(camDir,32);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  function project(x,y,z){screenPos.set(x,y,z).project(camera);return {x:(screenPos.x+1)*innerWidth/2,y:(1-screenPos.y)*innerHeight/2}}
  function ground(x,y){ray.setFromCamera({x:x/innerWidth*2-1,y:1-y/innerHeight*2},camera);const p=new T.Vector3();ray.ray.intersectPlane(plane,p);return p}
  function resize(){renderer.setSize(innerWidth,innerHeight,false);if(dog)cameraUpdate(1)}
  addEventListener('resize',resize);resize();
  function animate(dt,p,moving,swing,weapon,combat){
    t+=dt;if(!home)place(dog,p.x,p.z);
    cameraUpdate(dt);face(rig.g);
    if(moving){const vx=Math.sin(p.yaw)*.78-Math.cos(p.yaw)*.625;if(Math.abs(vx)>.12)rig.g.scale.x=Math.sign(vx)}
    if(rig.cels){
      Cels.dogPose(rig,t,moving,combat?.step);const arc=Math.min(1,Math.max(0,((combat?.progress||0)-.055)/.21));
      stroke.visible=arc>0&&arc<1;stroke.rotation.z=.98-1.78*(1-(1-arc)**3);stroke.scale.setScalar(.80+.33*arc);stroke.material.opacity=.87*(1-arc*arc);
      if(combat?.direction)rig.g.scale.x=combat.direction;
      const shake=combat?.shake||0;if(shake){camera.position.x+=shake*.065;camera.position.z-=shake*.043;camera.updateMatrixWorld()}
      for(const {b,x,z,w,d,h} of buildings){const dx=x-p.x,dz=z-p.z,depth=.625*dx+.781*dz;
        const occluding=depth>0&&depth<h+3&&Math.abs(dx*.781-dz*.625)<w*.36+d*.29+.32;
        b.scale.y+=((occluding?.24:1)-b.scale.y)*(1-Math.exp(-dt*16))}
    }else Paper.pose(rig,t,moving,swing,home);renderer.render(scene,camera)
  }
  function equip(name){const colors=name==='黄瓜棒'?['#458755','#8bb756']:name==='糖葫芦'?['#b52a3e','#f17a50']:['#cf5147','#ffcb4a'];
    // Keep the handle, replace the head with the selected silhouette.
    if(hammer)dispose(hammer);hammer=grp(rig.hand);if(rig.cels){hammer.position.set(0,-.09,.025);hammer.scale.setScalar(1.28)}else{hammer.position.set(.20,-.30,.06);hammer.scale.setScalar(.66);hammer.rotation.z=-.68}cube(hammer,'#704630',0,.26,0,.09,.65,.09);
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
  return {goal,pedestrian,pedestrianPose,buildStage,outfit,citizen,person,prop,bird,place,dispose,project,ground,animate,equip,snap:p=>{if(p)place(dog,p.x,p.z);cameraUpdate(1)},right:{x:10/Math.sqrt(164),z:-8/Math.sqrt(164)},down:{x:8/Math.sqrt(164),z:10/Math.sqrt(164)}}
})();

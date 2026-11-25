// 无 WebGL 时沿用同一场景、投影、精灵和碰撞，静态街景只绘制一次。
function canvasView(canvas){
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('此浏览器无法创建画布');
  const v=new THREE.Vector3(),origin=new THREE.Vector3(),scale=26;
  let pixel=1,previous,back;
  function terrain(stage,camera){
    back=document.createElement('canvas');back.width=1900;back.height=1360;
    const g=back.getContext('2d'),faces=[],inv=camera.matrixWorldInverse;
    stage.traverse(mesh=>{
      if(!mesh.isMesh||mesh.material.opacity<.4)return;
      const geom=mesh.geometry,pos=geom.attributes.position,index=geom.index;
      const color=mesh.material.color.clone();
      if(mesh.material.map)color.set(mesh.material.color.getHex()===0xffffff?(mesh.parent===stage?'#798582':'#aa8061'):'#b19b80');
      const points=[];for(let i=0;i<pos.count;i++){
        v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
        const x=v.x*inv.elements[0]+v.y*inv.elements[4]+v.z*inv.elements[8],y=v.x*inv.elements[1]+v.y*inv.elements[5]+v.z*inv.elements[9];
        points.push([950+x*scale,680-y*scale,v.x*inv.elements[2]+v.y*inv.elements[6]+v.z*inv.elements[10],v.y])
      }
      const fill='#'+color.getHexString();for(let i=0;i<(index?index.count:pos.count);i+=3){
        const a=points[index?index.getX(i):i],b=points[index?index.getX(i+1):i+1],c=points[index?index.getX(i+2):i+2];
        if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>=0)continue;
        const top=Math.max(a[3],b[3],c[3]);
        faces.push({a,b,c,fill,floor:top<.15,top,z:(a[2]+b[2]+c[2])/3})
      }
    });
    faces.sort((a,b)=>Number(b.floor)-Number(a.floor)||(a.floor?a.top-b.top:0)||a.z-b.z);
    for(const {a,b,c,fill} of faces){g.fillStyle=fill;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(c[0],c[1]);g.closePath();g.fill()}
    previous=stage
  }
  function draw(scene,camera,stage,actors,dog,rig,breed,home,weapon){
    scene.updateMatrixWorld(true);const w=innerWidth,h=innerHeight,unit=w/(camera.right-camera.left);
    if(previous!==stage)terrain(stage,camera);
    const screen=point=>{v.copy(point).project(camera);return [(v.x+1)*w/2,(1-v.y)*h/2]};
    const [ox,oy]=screen(origin);ctx.setTransform(pixel,0,0,pixel,0,0);ctx.fillStyle='#add8c9';ctx.fillRect(0,0,w,h);
    ctx.drawImage(back,ox-950*unit/scale,oy-680*unit/scale,back.width*unit/scale,back.height*unit/scale);
    const cast=actors.children.filter(a=>a===dog||a.userData.paper);
    cast.sort((a,b)=>(a.position.z-b.position.z)*10+(a.position.x-b.position.x)*8);
    for(const a of cast){
      const paper=a===dog?rig.g:a.userData.paper,u=paper.userData,mesh=u.card;
      const img=mesh?.material.map.image||GameImages.get(breed);if(!img)continue;
      const [x,y]=screen(a.position);ctx.fillStyle='rgba(36,53,47,.22)';ctx.beginPath();ctx.ellipse(x,y,unit*.39,unit*.15,0,0,Math.PI*2);ctx.fill();
      const size=mesh?mesh.geometry.parameters.height*unit*a.scale.y:2.7*unit,frame=u.index||0;
      ctx.save();ctx.translate(x,y);ctx.scale(paper.scale.x<0?-1:1,1);
      if(mesh){const sw=img.width/4,sh=img.height/2;ctx.drawImage(img,(frame%4)*sw,Math.floor(frame/4)*sh,sw,sh,-size/2,-size*.97,size,size)}
      else ctx.drawImage(img,-size*img.width/img.height/2,-size,size*img.width/img.height,size);
      ctx.restore();
      if(a===dog&&!home){const hand=screen(rig.hand.getWorldPosition(new THREE.Vector3())),hammer=GameImages.get('hammer-key');if(hammer&&weapon==='玩具锤')ctx.drawImage(hammer,hand[0]-unit*.3,hand[1]-unit*.55,unit*.92,unit*.64);
        else{ctx.fillStyle=weapon==='黄瓜棒'?'#458755':'#b52a3e';ctx.fillRect(hand[0],hand[1]-unit*.48,unit*.15,unit*.55)}}
    }
  }
  return {setPixelRatio:n=>{pixel=n},setSize:(w,h)=>{canvas.width=Math.round(w*pixel);canvas.height=Math.round(h*pixel)},draw}
}

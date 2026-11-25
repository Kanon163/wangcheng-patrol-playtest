// 正面插画在相机平面内蒙皮。头、两只爪子和两条腿各自有旋转支点。
const Paper = (() => {
  const T=THREE, materials=new Map();
  const ratios={collie:272/430,sharpei:278/430,shiba:279/430,poodle:259/430,litter:286/322,speaker:251/322,shout:319/322,recycle:255/322,listen:192/322,quiet:159/322,bucket:280/205,cap:312/205,mask:357/205,scarf:209/205,cape:286/205,bag:160/205};
  const breeds={collie:'边牧',sharpei:'沙皮',shiba:'柴犬',poodle:'贵宾'};
  const gear={bucket:['渔夫帽','head',4],cap:['巡查帽','head',8],mask:['闪电面罩','face',6],scarf:['薄荷领巾','neck',4],cape:['英雄披风','back',10],bag:['邮差挎包','body',6]};
  const behaviors=['litter','speaker','shout','recycle','listen','quiet'];
  function mat(id){
    if(materials.has(id))return materials.get(id);
    const texture=new T.Texture();texture.colorSpace=T.SRGBColorSpace;
    const m=new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.12,depthWrite:true,side:T.DoubleSide,toneMapped:false});
    materials.set(id,m);
    GameImages.bind(texture,id);return m
  }
  function sheet(id,h){const g=new T.PlaneGeometry(h*ratios[id],h);const mesh=new T.Mesh(g,mat(id));mesh.userData.baked=true;return mesh}
  function npc(id){const g=new T.Group(),card=sheet(id,1.7);card.position.y=.86;g.add(card);return g}
  function dog(breed,wear){
    const g=new T.Group(), H=1.73,W=ratios[breed]*H;
    const geo=new T.PlaneGeometry(W,H,18,28);geo.translate(0,H/2,0);
    const mesh=new T.SkinnedMesh(geo,mat(breed));mesh.userData.baked=true;mesh.frustumCulled=false;g.add(mesh);
    const bones=[],coords=[[0,0],[0,.32],[0,.66],[-.23,.56],[.23,.56],[-.16,.28],[.16,.28]];
    coords.forEach(([x,y],i)=>{const b=new T.Bone(),parent=i===0?-1:i===1||i>=5?0:1;
      b.position.set((x-(coords[parent]?.[0]||0))*W,(y-(coords[parent]?.[1]||0))*H,0);
      (parent<0?mesh:bones[parent]).add(b);bones.push(b)});
    const indices=[],weights=[],pos=geo.attributes.position,clip=n=>Math.min(1,Math.max(0,n));
    for(let i=0;i<pos.count;i++){
      const y=pos.getY(i)/H,x=pos.getX(i)/W;
      const h=clip((y-.62)/.09),leg=(1-clip((y-.18)/.16)),arm=clip((Math.abs(x)-.17)/.18)*clip((.68-y)/.12)*clip((y-.23)/.1);
      const limb=y<.30?leg:arm,idx=y<.30?(x<0?5:6):(x<0?3:4);
      indices.push(2,idx,1,0);weights.push(h,(1-h)*limb,(1-h)*(1-limb),0)
    }
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    mesh.bind(new T.Skeleton(bones));mesh.userData.rigged=true;
    const fittings={bucket:[2,.09,.62,.48],cap:[2,.09,.60,.50],mask:[2,.085,.24,.30],scarf:[1,.04,.48,.38],bag:[1,.12,.33,.68],cape:[1,-.20,.35,.75]};
    for(const id of Object.values(wear||{})){if(!gear[id])continue;const [b,x,y,h]=fittings[id],part=sheet(id,h);
      part.position.set(x,y,id==='cape'?-.025:.025+b*.003);bones[b].add(part)}
    return {g,bones,hand:bones[4]}
  }
  function pose(r,t,walk,hit,home){
    const b=r.bones,s=Math.sin(t*(walk?12:2.2)),pop=Math.sin(hit*Math.PI);
    b[0].position.y=walk?Math.abs(s)*.085:Math.max(0,pop)*.10;b[1].rotation.z=s*(walk?.06:.025)-pop*.16;
    b[2].rotation.z=Math.sin(t*2.5)*.075+pop*.12;b[3].rotation.z=walk?s*.34:Math.cos(t*2)*.06;
    b[4].rotation.z=pop*1.8+(home&&Math.sin(t*.9)>.5?.65+Math.sin(t*11)*.22:walk?-s*.3:0);
    b[5].rotation.z=walk?s*.29:.02;b[6].rotation.z=walk?-s*.29:-.02
  }
  return {accessory:sheet,dog,npc,pose,breeds,gear,behaviors}
})();

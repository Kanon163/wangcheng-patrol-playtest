const Cels=(()=>{
  const T=THREE,cache=new Map();
  function material(name,flash=false){
    const key=name+(flash?'-hit':'');if(cache.has(key))return cache.get(key);
    if(flash){const m=material(name).clone();m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.89);')};m.customProgramCacheKey=()=>'chalk';cache.set(key,m);return m}
    const texture=new T.Texture();texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.generateMipmaps=name.startsWith('shop-');if(texture.generateMipmaps){texture.minFilter=T.LinearMipmapLinearFilter;texture.anisotropy=4}
    const m=new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.09,toneMapped:false,side:T.DoubleSide});cache.set(key,m);
    GameImages.bind(texture,name);return m
  }
  const masks=new Map();
  function visiblePixel(name,uv){
    if(!masks.has(name)){
      const img=material(name).map.image;if(!img)return false;
      const canvas=document.createElement('canvas');canvas.width=208;canvas.height=104;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,208,104);
      masks.set(name,ctx.getImageData(0,0,208,104).data)
    }
    const x=Math.max(0,Math.min(207,Math.floor(uv.x*208))),y=Math.max(0,Math.min(103,Math.floor((1-uv.y)*104)));
    return masks.get(name)[(y*208+x)*4+3]>35
  }
  function actor(name,size){
    const g=new T.Group(),geo=new T.PlaneGeometry(size,size),card=new T.Mesh(geo,material(name));
    card.position.y=size*.475;card.userData.baked=true;g.add(card);g.userData.card=card;g.userData.name=name;frame(g,0);return g
  }
  function frame(g,index,flash=false){
    const u=g.userData,card=u.card;if(u.index!==index){u.index=index;const x=(index%4)/4,y=1-Math.floor(index/4)/2,uv=card.geometry.attributes.uv;
      uv.setXY(0,x,y);uv.setXY(1,x+.25,y);uv.setXY(2,x,y-.5);uv.setXY(3,x+.25,y-.5);uv.needsUpdate=true}
    card.material=material(u.name,flash)
  }
  function dog(breed,wear){const g=actor((Rush.profile.scooter?'ride-':'run-')+breed,2.16),hand=new T.Group();g.add(hand);
    const wardrobe=new T.Group();g.add(wardrobe);const anchors={bucket:[.02,1.72,.53],cap:[.02,1.7,.54],mask:[.11,1.42,.34],scarf:[.05,1.13,.34],cape:[-.22,1.02,.65],bag:[-.03,.86,.55]};
    for(const id of Object.values(wear)){if(!anchors[id])continue;const [x,y,h]=anchors[id],part=Paper.accessory(id,h);part.position.set(x,y,id==='cape'?-.015:.025);wardrobe.add(part)}
    return {g,hand,wardrobe,cels:true}
  }
  const handPos=[[.55,.80,-.68],[.39,.65,-.53],[.56,.81,-.72],[.45,.91,-.61],[-.44,1.14,.84],[.09,1.83,1.0],[.83,.73,-1.43],[.59,.67,-1.85]];
  function dogPose(r,t,walk,step){const i=step??(walk?Math.floor(t*9)%4:0),[x,y,angle]=handPos[i];frame(r.g,i);
    r.hand.position.set(x,y,.07);r.hand.rotation.z=angle;r.wardrobe.rotation.z=i===6?-.16:i===5?.10:0;r.wardrobe.position.y=i===6?-.12:walk?Math.sin(t*9)*.025:0}
  return {material,visiblePixel,actor,frame,dog,dogPose}
})();

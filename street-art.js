// 小尺度铺面和屋面纹理；纹理的重复次数由实际世界尺寸决定。
const StreetArt=(()=>{
  const T=THREE,cache=new Map();
  function texture(key,paint,repeat){
    if(cache.has(key))return cache.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const c=canvas.getContext('2d');paint(c);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
    if(repeat)tex.wrapS=tex.wrapT=T.RepeatWrapping;
    const m=new T.MeshBasicMaterial({map:tex,transparent:!repeat,alphaTest:repeat?0:.12,side:T.DoubleSide});cache.set(key,m);return m
  }
  function surface(kind){
    return texture(kind,c=>{
      let seed=1147;function rand(){seed=seed*16807%2147483647;return seed/2147483647}
      if(kind==='asphalt'){
        c.fillStyle='#727e80';c.fillRect(0,0,256,256);
        for(let i=0;i<3400;i++){c.fillStyle=i%2?'rgba(238,226,198,.09)':'rgba(30,51,61,.09)';c.fillRect(rand()*256,rand()*256,1+rand()*2,1.4)}
        c.strokeStyle='rgba(57,65,68,.21)';c.lineWidth=1.3;c.beginPath();c.moveTo(91,57);c.lineTo(87,68);c.lineTo(91,77);c.lineTo(89,85);c.stroke()
      }else{
        const warm=kind==='terracotta';c.fillStyle=warm?'#8c5347':'#52686b';c.fillRect(0,0,256,256);
        for(let row=0;row<8;row++)for(let i=-1;i<9;i++){
          const x=i*32+(row%2)*16,y=row*32,light=rand()*7;
          c.fillStyle=warm?'hsl(13,34%,'+(49+light)+'%)':'hsl(184,13%,'+(42+light)+'%)';c.fillRect(x+1,y+2,30,28);
          c.fillStyle=warm?'#d99776':'#93a9a5';c.fillRect(x+3,y+3,3,23);
          c.fillStyle='rgba(35,43,42,.19)';c.fillRect(x+26,y+4,4,24)
        }
      }
    },true)
  }
  function plane(g,kind,x,y,z,w,d,period){
    const geo=new T.PlaneGeometry(w,d),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/period,uv.getY(i)*d/period);
    const mesh=new T.Mesh(geo,surface(kind));mesh.userData.baked=true;mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);g.add(mesh)
  }
  function emblem(g,id,x,y,z){
    const mat=texture('sign'+id,c=>{
      const disc=(x,y,r,fill)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill()};
      disc(128,128,123,'#283e40');disc(128,128,112,'#fff0cc');disc(128,128,103,['#bc5c45','#397c79','#66804b'][id]);
      if(id===1){disc(128,128,76,'#263c46');for(const r of [59,66]){c.strokeStyle='#607980';c.lineWidth=3;c.beginPath();c.arc(128,128,r,.4,4.9);c.stroke()}disc(128,128,26,'#e9ab5b');disc(128,128,6,'#283b44')}
      else if(id===2){disc(108,140,42,'#f6aa42');disc(160,144,38,'#ffcc61');c.fillStyle='#2f6956';c.beginPath();c.ellipse(144,92,31,13,-.55,0,Math.PI*2);c.fill()}
      else{c.fillStyle='#ffe8ba';c.beginPath();c.moveTo(47,158);c.quadraticCurveTo(53,115,111,90);c.quadraticCurveTo(128,72,141,92);c.quadraticCurveTo(197,105,210,157);c.quadraticCurveTo(142,187,47,158);c.fill();
        c.strokeStyle='#c38754';c.lineWidth=6;for(const dx of [-42,-17,22,49]){c.beginPath();c.moveTo(128+dx*.2,97);c.quadraticCurveTo(128+dx,113,128+dx,140);c.stroke()}}
    },false);
    const m=new T.Mesh(new T.PlaneGeometry(1.0,1.0),mat);m.userData.baked=true;m.position.set(x,y,z);m.rotation.y=.58;g.add(m)
  }
  return {plane,emblem}
})();

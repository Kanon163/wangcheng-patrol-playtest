// 巡查沿汪顺街和两条横巷进行。路口、人行路线和巡查目的地共用同一张路网。
const Street=(()=>{
  const xs=[-17,-5,6,17],zs=[-9,0,9],nodes=zs.flatMap(z=>xs.map(x=>[x,z]));
  const checkpoints=[5,1,2,6,10,9,8,4],names=['早点铺','唱片巷','果栏口','戏院街','修车铺','茶楼后巷','南市口','西牌坊'];
  const quotas=[1,1,1,2,2,2,3,3],incidents=[3,4,5,0,1,2];
  function neighbor(i,previous){const candidates=[i%4>0?i-1:-1,i%4<3?i+1:-1,i>=4?i-4:-1,i<8?i+4:-1].filter(n=>n>=0&&n!==previous);
    return candidates[Math.floor(Math.random()*candidates.length)]}
  function layout(g,{cube,ball,cyl,label},block,makeBuilding){
    const box=(...v)=>cube(g,...v),post=(...v)=>cyl(g,...v);
    const asphalt='#657378',stone='#d2bba5',cream='#f6dba6',ink='#36474d';
    box('#8da19b',0,-.53,0,110,.35,90);
    for(let x=-35;x<=35;x+=6){const h=2+(Math.abs(x)%4)*.38;box('#94a49c',x,h/2,-20,5.86,h,5);box('#839796',x,h+.1,-20,5.98,.22,5.12)}
    box('#ad9984',0,-.21,0,50,.40,36);
    for(const z of zs){box(asphalt,0,.007,z,48,.023,3.3);
      StreetArt.plane(g,'asphalt',0,.021,z,48,3.3,4);
      for(let x=-23;x<=23;x+=2.4){if(xs.some(a=>Math.abs(a-x)<1.9))continue;box('#e5c680',x,.028,z,1.12,.014,.06)}
      for(const side of [-1,1])for(let x=-23;x<24;x+=2){
        if(xs.some(a=>Math.abs(a-x)<2))continue;
        box(stone,x,.048,z+side*2.13,1.97,.082,.97);box(cream,x,.089,z+side*1.69,1.95,.07,.14)
      }}
    for(const x of xs){box(asphalt,x,.021,0,3.2,.021,33);StreetArt.plane(g,'asphalt',x,.036,0,3.2,33,4);
      for(const z of zs){for(let j=-3;j<=3;j++)box('#f4e2b9',x+j*.38,.046,z+1.92,.22,.02,.91)}
      for(let z=-15;z<16;z+=2.9)if(zs.every(a=>Math.abs(a-z)>2))box('#ecd193',x,.047,z,.07,.018,1.25)}
    const shops=[['早 点 铺','#b85739'],['海 风 唱 片','#307575'],['阿 娟 果 栏','#548352'],['红 星 戏 院','#a74f55'],['单 车 修 理','#526f88'],['顺 记 茶 楼','#448374']];
    const fronts=[[-22,-13],[-11,-13],[.5,-13],[11.5,-13],[22,-13],[-22,-4.5],[-11,-4.5],[.5,-4.5],[11.5,-4.5],[22,-4.5],[-22,4.5],[-11,4.5],[.5,4.5],[11.5,4.5],[22,4.5],[-11,13],[.5,13],[11.5,13]];
    const salt=Math.floor(Math.random()*6);
    fronts.forEach(([x,z],i)=>{const idx=({6:0,1:1,2:2,7:3,12:4,11:5})[i]??(i+salt)%6,w=Math.abs(x)>20?4.9:Math.abs(x+.0)<1?6.8:7.2,d=Math.abs(z)>12?4.9:4.4,h=2.8+(i*3%4)*.47;
      block(x,z,w,d);makeBuilding(x,z,w,d,h,idx,shops[idx],[6,1,2].includes(i));});
    for(const [i,[x,z]] of nodes.entries()){
      post(ink,x-1.9,1.12,z-1.32,.07,2.15,.07);box(ink,x-1.68,2.20,z-1.32,.55,.09,.11);box('#ffdc83',x-1.45,2.10,z-1.32,.32,.17,.30);
      if([0,2,5,7,9].includes(i)){box('#93795e',x+2.2,.14,z+1.8,.87,.28,.81);box('#594f44',x+2.2,.29,z+1.8,.73,.06,.65);post('#825d47',x+2.2,.8,z+1.8,.11,1.2,.11);
        for(const [ox,oy,oz,r,color] of [[-.19,1.58,.14,.55,'#447761'],[.26,1.72,-.12,.57,'#528265'],[-.04,1.96,-.05,.46,'#7b9b67']])ball(g,color,x+2.2+ox,oy,z+1.8+oz,r,r*.75,r*.89)}
      if(i===8||i===4){const color=i===8?'#9f4937':'#42786f';
        for(const side of [-1,1])post(ink,x+side*1.67,1.15,z+.75,.09,2.3,.09);
        label(g,i===8?'南 市 口':'西 牌 坊',x,2.34,z+.75,3.65,.57,color,cream)}
      if(i%3===2){box('#438780',x-2.4,.34,z+.82,.41,.65,.44);box(ink,x-2.4,.70,z+.82,.44,.12,.47)}
      if(i%3===1){for(let j=0;j<3;j++){box('#ae7047',x+2.4+j*.52,.26,z-2,.47,.49,.49);ball(g,'#eda947',x+2.4+j*.52,.54,z-2,.19,.14,.18)}}
    }
  }
  return {nodes,checkpoints,names,quotas,incidents,neighbor,layout}
})();

// 巡查沿汪顺街和两条横巷进行。路口、人行路线和巡查目的地共用同一张路网。
const Street=(()=>{
  const xs=[-17,-5,6,17],zs=[-9,0,9],nodes=zs.flatMap(z=>xs.map(x=>[x,z]));
  const checkpoints=[5,1,2,6,10,9,8,4],names=['早点铺','唱片巷','果栏口','戏院街','修车铺','茶楼后巷','南市口','西牌坊'];
  function neighbor(i,previous){const candidates=[i%4>0?i-1:-1,i%4<3?i+1:-1,i>=4?i-4:-1,i<8?i+4:-1].filter(n=>n>=0&&n!==previous);
    return candidates[Math.floor(Math.random()*candidates.length)]}
  function layout(g,{cube,ball,cyl,label},block,makeBuilding){
    const box=(...v)=>cube(g,...v),post=(...v)=>cyl(g,...v);
    const asphalt='#657378',stone='#d2bba5',cream='#f6dba6',ink='#36474d';
    box('#ad9984',0,-.21,0,50,.40,36);
    for(const z of zs){box(asphalt,0,.007,z,48,.023,3.3);
      for(let x=-23;x<=23;x+=2.4){box('#e5c680',x,.028,z,1.12,.014,.06)}
      for(const side of [-1,1])for(let x=-23;x<24;x+=2){
        box(stone,x,.048,z+side*2.13,1.97,.082,.97);box(cream,x,.089,z+side*1.69,1.95,.07,.14)
      }}
    for(const x of xs){box(asphalt,x,.021,0,3.2,.021,33);
      for(const z of zs){for(let j=-3;j<=3;j++)box('#f4e2b9',x+j*.38,.046,z+1.92,.22,.02,.91)}
      for(let z=-15;z<16;z+=2.9)if(zs.every(a=>Math.abs(a-z)>2))box('#ecd193',x,.047,z,.07,.018,1.25)}
    const shops=[['早 点 铺','#b85739'],['海 风 唱 片','#307575'],['阿 娟 果 栏','#548352'],['红 星 戏 院','#a74f55'],['单 车 修 理','#526f88'],['顺 记 茶 楼','#448374']];
    const fronts=[[-22,-13],[-11,-13],[.5,-13],[11.5,-13],[22,-13],[-22,-4.5],[-11,-4.5],[.5,-4.5],[11.5,-4.5],[22,-4.5],[-22,4.5],[-11,4.5],[.5,4.5],[11.5,4.5],[22,4.5],[-11,13],[.5,13],[11.5,13]];
    const salt=Math.floor(Math.random()*6);
    fronts.forEach(([x,z],i)=>{const idx=({6:0,1:1,2:2})[i]??(i+salt)%6,w=Math.abs(x)>20?4.9:Math.abs(x+.0)<1?6.8:7.2,d=Math.abs(z)>12?4.9:4.4,h=2.8+(i*3%4)*.47;
      block(x,z,w,d);makeBuilding(x,z,w,d,h,idx,shops[idx]);});
    for(const [i,[x,z]] of nodes.entries()){
      post(ink,x-1.9,1.12,z-1.32,.07,2.15,.07);box(ink,x-1.68,2.20,z-1.32,.55,.09,.11);box('#ffdc83',x-1.45,2.10,z-1.32,.32,.17,.30);
      if(i%2===0){post('#955c43',x+2.2,.52,z+1.8,.12,1,.12);ball(g,'#51826a',x+2.2,1.27,z+1.8,.59,.61,.48)}
      if(i%3===2){box('#438780',x-2.4,.34,z+.82,.41,.65,.44);box(ink,x-2.4,.70,z+.82,.44,.12,.47)}
      if(i%3===1){for(let j=0;j<3;j++){box('#ae7047',x+2.4+j*.52,.26,z-2,.47,.49,.49);ball(g,'#eda947',x+2.4+j*.52,.54,z-2,.19,.14,.18)}}
    }
  }
  return {nodes,checkpoints,names,neighbor,layout}
})();

import { BODY_CALIBRATION } from './body-calibration.js';
import { PARTS } from './rules.js';
const mix=(a,b,t)=>a+(b-a)*t;
const SCALE=552/1430;
function region(y) {
  if(y<=430)return 'head';if(y<=485)return 'neck';if(y<=510)return 'shoulders';
  if(y<=640)return 'chest';if(y<=800)return 'abs';if(y<=990)return 'glutes';
  if(y<=1060)return 'thighs';if(y<=1140)return 'knees';if(y<=1330)return 'calves';return 'feet';
}
function influence(area,s,back) {
  const torso=back?s.back:s.chest,middle=back?s.back:s.abs;
  switch(area){
    case 'head':return [0,0]; // Same face/hair throughout this selected series.
    case 'neck':return [torso*.3+s.shoulders*.7,s.shoulders];
    case 'shoulders':return [torso*.7+s.shoulders*.3,s.shoulders];
    case 'chest':return [torso,s.shoulders*.3+s.arms*.7];
    case 'abs':return [middle,s.arms];case 'glutes':return [s.glutes,s.arms];
    case 'thighs':return [s.thighs,s.arms];case 'knees':return [s.thighs*.35+s.calves*.65,s.arms];
    case 'calves':return [s.calves,s.arms];default:return [(s.thighs+s.calves)/2,(s.thighs+s.calves)/2];
  }
}
export function buildBodyMesh(values,{bodyType,back=false,active=[],smooth=false},shapeStage) {
  const frames=BODY_CALIBRATION[bodyType][back?'back':'front'];
  const s=Object.fromEntries(PARTS.map(p=>[p.id,shapeStage(values[p.id])]));
  const pose=Math.max(back?s.back:s.chest,s.shoulders,s.arms*.65,s.glutes*.7);
  const profile=(row,k,side)=>{
    const lo=Math.min(3,Math.floor(k)),t=k-lo;
    return frames[lo][row][side].map((n,i)=>mix(n,frames[lo+1][row][side][i],t));
  };
  let vertices=[];
  for(let row=0;row<frames[0].length;row++){
    const y=frames[0][row].y,area=region(y),[bodyStage,armStage]=influence(area,s,back);
    for(let col=-8;col<=8;col++){
      const j=Math.abs(col),sign=Math.sign(col),side=col<0?'left':'right';
      const body=profile(row,bodyStage,side),arm=profile(row,armStage,side),target=[...body];
      if(y>430&&y<=990){
        const posing=profile(row,pose,side),support=y<=510?.5:y<=600?.25:0;
        target[2]=mix(body[2],Math.max(body[2],posing[2]),support);target[1]=body[1]*target[2]/body[2];
        const half=(arm[6]-arm[4])/2,center=Math.max(posing[5],target[2]+half+2);
        target[4]=center-half;target[5]=center;target[6]=center+half;target[7]=target[6]+5;target[3]=(target[2]+target[4])/2;
      }
      const stage=area==='head'?0:j<=2?bodyStage:armStage,uv=[];
      for(let k=0;k<5;k++){
        const source=area==='head'?0:k,x=512+sign*frames[source][row][side][j];
        uv.push((k+x/1024)/5,((back?1:0)+y/1536)/2);
      }
      const affected=area==='head'?null:j>=4&&y<=990?(y<=600?'shoulders':'arms'):area==='chest'?(back?'back':'chest'):area==='abs'?(back?'back':'abs'):area==='knees'?'calves':area;
      vertices.push([200+sign*target[j]*SCALE,(y-70)*SCALE,...uv,stage,active.includes(affected)?1:0,1]);
    }
  }
  if(smooth){
    const dense=[];
    for(let row=0;row<frames[0].length-1;row++)for(let step=0;step<4;step++){
      const t=step/4,curve=t*t*(3-2*t);
      for(let col=0;col<17;col++){
        const a=vertices[row*17+col],b=vertices[(row+1)*17+col];
        dense.push(a.map((v,i)=>mix(v,b[i],i===1||i>=3&&i<=11&&i%2?t:curve)));
      }
    }
    dense.push(...vertices.slice(-17));vertices=dense;
  }
  const triangles=[];
  for(let row=0;row<vertices.length/17-1;row++)for(let col=0;col<16;col++){
    const a=row*17+col,b=a+1,c=a+17,d=c+1;triangles.push(a,b,c,b,d,c);
  }
  return {vertices,triangles};
}

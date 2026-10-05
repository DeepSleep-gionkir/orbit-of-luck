// Every rarity above Common has its own motion and camera choreography.
export const INTRO_DURATION=3600;
export const TRANSITION_DURATION=1000;
export const CINEMATICS=[
  null,
  {motion:'arc',duration:1300,arc:.32,height:.55,zoom:.8,roll:.012,rise:0,finale:'arc-glint',vanish:false},
  {motion:'pendulum',duration:2000,arc:.48,height:.9,zoom:1.1,roll:.018,rise:0,finale:'pendulum-sparks',vanish:false},
  {motion:'comet',duration:2700,arc:.65,height:1.1,zoom:1.4,roll:.025,rise:0,finale:'comet-fountain',vanish:false},
  {motion:'heartbeat',duration:3400,arc:.8,height:1.3,zoom:1.8,roll:.03,rise:0,finale:'heartbeat-flare',vanish:false},
  {motion:'figure-eight',duration:4100,arc:1.1,height:1.5,zoom:2.1,roll:.04,rise:0,finale:'hero-wings',vanish:false},
  {motion:'helix',duration:4800,arc:1.3,height:1.7,zoom:2.2,roll:.045,rise:0,finale:'helix-fan',vanish:false},
  {motion:'coronation',duration:5500,arc:1.5,height:1.9,zoom:2.3,roll:.05,rise:0,finale:'golden-crown',vanish:false},
  {motion:'triple-heart',duration:6200,arc:1.75,height:2.1,zoom:2.5,roll:.06,rise:0,finale:'mythic-nova',vanish:true},
  {motion:'warp-dance',duration:6900,arc:2,height:2.3,zoom:2.5,roll:.07,rise:0,finale:'warp-break',vanish:true},
  {motion:'ascension',duration:7600,arc:1.7,height:2.6,zoom:2.4,roll:.065,rise:5.2,finale:'skyfall',vanish:true},
  {motion:'nebula-spiral',duration:8300,arc:2.4,height:2.4,zoom:2.6,roll:.08,rise:0,finale:'nebula-bloom',vanish:true},
  {motion:'rebirth',duration:9000,arc:2.6,height:2.7,zoom:2.7,roll:.085,rise:0,finale:'rebirth-core',vanish:false},
  {motion:'infinity',duration:9700,arc:2.8,height:2.8,zoom:2.8,roll:.09,rise:0,finale:'infinity-gates',vanish:false},
  {motion:'genesis',duration:10700,arc:3,height:3.1,zoom:2.9,roll:.1,rise:0,finale:'genesis-wave',vanish:true},
  {motion:'sovereign',duration:11900,arc:3.2,height:3.3,zoom:3,roll:.11,rise:0,finale:'sovereign-cross',vanish:false},
  {motion:'boundless',duration:13100,arc:3.6,height:3.5,zoom:3.1,roll:.12,rise:0,finale:'boundless-vortex',vanish:true},
  {motion:'miracle',duration:14300,arc:4,height:3.7,zoom:3.2,roll:.13,rise:0,finale:'miracle-supernova',vanish:true},
];
const clamp=n=>Math.max(0,Math.min(1,n));
export const ease=n=>{const t=clamp(n);return t*t*(3-2*t);};
export function rarityMotion(level,progress,target={}){
  const preset=CINEMATICS[level],p=clamp(progress),t=p*Math.PI*2;
  const envelope=Math.sin(clamp(p/.76)*Math.PI);
  let x=0,y=0,z=0,scale=1;
  switch(preset?.motion){
    case 'arc':x=Math.sin(t)*.5;y=Math.sin(t*.5)*.2;scale=1+Math.sin(t)*.06;break;
    case 'pendulum':x=Math.sin(t*1.5)*.8;y=Math.cos(t*1.5)*.28;scale=1+Math.sin(t*2)*.1;break;
    case 'comet':x=Math.sin(t)*1.4;y=-Math.sin(t)*.7;z=Math.sin(t*.5)*.45;scale=1+Math.sin(t)*.12;break;
    case 'heartbeat':x=Math.sin(t)*.6;y=Math.sin(t*2)*.35;scale=1+Math.sin(t*3)*.22;break;
    case 'figure-eight':x=Math.sin(t*1.6)*1.6;y=Math.sin(t*3.2)*.65;scale=1+Math.cos(t*2)*.16;break;
    case 'helix':x=Math.sin(t*2)*1.3;y=Math.cos(t*2)*.8;z=Math.sin(t)*.9;scale=1+Math.sin(t*2)*.2;break;
    case 'coronation':x=Math.sin(t*1.3)*1.1;y=Math.sin(t*.7)*.7;scale=1+Math.sin(t*2)*.24;break;
    case 'triple-heart':x=Math.sin(t*2)*1.4;y=Math.sin(t*3)*.9;z=Math.cos(t*1.5)*.5;scale=1+Math.sin(t*4)*.28;break;
    case 'warp-dance':x=Math.sin(t*3)*2.3;y=Math.cos(t*1.5)*.8;z=Math.sin(t*2)*.8;scale=1+Math.sin(t*3)*.27;break;
    case 'ascension':x=Math.sin(t*1.5)*1.2;y=Math.sin(t*.65)*1.7;z=Math.sin(t)*.6;scale=1+Math.cos(t*2)*.25;break;
    case 'nebula-spiral':x=Math.cos(t*2.5)*1.7;y=Math.sin(t*2.5)*1.3;z=Math.sin(t*1.2)*1;scale=1+Math.sin(t*3)*.32;break;
    case 'rebirth':x=Math.sin(t*2)*1.5;y=Math.sin(t*1.5)*1.1;z=Math.cos(t*2)*1;scale=1+Math.sin(t*3.5)*.38;break;
    case 'infinity':x=Math.sin(t*2)*2.5;y=Math.sin(t*4)*1.3;z=Math.cos(t*2)*1.1;scale=1+Math.cos(t*3)*.32;break;
    case 'genesis':x=Math.sin(t*2.5)*2.4;y=Math.cos(t*3)*1.7;z=Math.sin(t*1.5)*1.3;scale=1+Math.sin(t*4)*.38;break;
    case 'sovereign':x=Math.sin(t*4)*2.9;y=Math.sin(t*2)*1.5;z=Math.cos(t*2.5)*1.2;scale=1+Math.sin(t*4.5)*.42;break;
    case 'boundless':x=Math.cos(t*3)*2.7;y=Math.sin(t*3)*2;z=Math.sin(t*2)*1.5;scale=1+Math.sin(t*5)*.43;break;
    case 'miracle':x=Math.sin(t*4)*3.1;y=Math.sin(t*2.5)*2.1;z=Math.cos(t*3)*1.6;scale=1+Math.sin(t*5.5)*.46;break;
  }
  x*=envelope;y*=envelope;z*=envelope;scale=1+(scale-1)*envelope;
  const finish=ease((p-.7)/.12),compression=Math.sin(finish*Math.PI);
  switch(preset?.finale){
    case 'arc-glint':y+=finish*.25;break;
    case 'pendulum-sparks':scale+=compression*.12;break;
    case 'comet-fountain':x+=finish*.6;z-=finish*.3;break;
    case 'heartbeat-flare':scale+=compression*.28;break;
    case 'hero-wings':y+=finish*.45;scale+=compression*.3;break;
    case 'helix-fan':z-=finish*.4;scale+=compression*.35;break;
    case 'golden-crown':y+=finish*.65;scale+=finish*.2;break;
    case 'mythic-nova':scale*=1-compression*.7;break;
    case 'warp-break':x+=finish*3.5;z-=finish*.7;break;
    case 'skyfall':y+=finish*preset.rise;break;
    case 'nebula-bloom':scale*=1-compression*.5;break;
    case 'rebirth-core':scale*=1-compression*.82;scale+=ease((p-.85)/.1)*.45;break;
    case 'infinity-gates':scale+=finish*.3;break;
    case 'genesis-wave':z+=finish*2.2;scale+=compression*.5;break;
    case 'sovereign-cross':scale+=finish*.55;break;
    case 'boundless-vortex':z-=finish*3.2;scale*=1-compression*.8;break;
    case 'miracle-supernova':scale*=1-compression*.85;scale+=compression*compression*.15;break;
  }
  const visibility=preset?.vanish?1-ease((p-.825)/.035):1;
  scale*=visibility;
  target.x=x;target.y=y;target.z=z;target.scale=scale;target.visibility=visibility;
  return target;
}

// Distinct three-dimensional finale shapes, evaluated into a reusable object.
export function burstMotion(finale,p,index,seed,target={}){
  const d=seed.direction,theta=index*2.399,reach=.45+p*(2.2+seed.speed*2.6),spiral=theta+p*4;
  let x=d.x*reach,y=d.y*reach,z=d.z*reach;
  switch(finale){
    case 'arc-glint':y=y*.5+Math.sin(theta)*p;break;
    case 'pendulum-sparks':x+=Math.sin(theta)*p*1.5;y*=.45;break;
    case 'comet-fountain':x=reach*(.4+d.x*.7);y*=.6;break;
    case 'heartbeat-flare':x*=1+Math.sin(p*12)*.15;y*=1+Math.sin(p*12)*.15;break;
    case 'hero-wings':x=Math.sign(d.x)*reach;y=Math.sin(theta)*reach*.5;z*=.4;break;
    case 'helix-fan':x=Math.cos(spiral)*reach;y=d.y*reach*.7;z=Math.sin(spiral)*reach;break;
    case 'golden-crown':x=Math.cos(theta)*reach*.75;z=Math.sin(theta)*reach*.75;y=Math.abs(d.y)*reach*1.5-.4;break;
    case 'mythic-nova':x*=1.25;y*=1.25;z*=1.25;break;
    case 'warp-break':x=reach*(1+d.x*.7);y*=.5;z*=.6;break;
    case 'skyfall':y-=p*p*6;x*=1.15;break;
    case 'nebula-bloom':x=Math.cos(spiral)*reach*1.5;z=Math.sin(spiral)*reach*1.5;y=d.y*reach*.18;break;
    case 'rebirth-core':x=Math.sign(d.x)*reach*1.2;y=(Math.abs(d.x)*1.4-.4)*reach;z*=.35;break;
    case 'infinity-gates':x=Math.sin(theta)*reach*1.35;y=Math.sin(theta*2)*reach*.65;z=d.z*reach*.3;break;
    case 'genesis-wave':z*=1.8;x*=1.35;y*=1.35;break;
    case 'sovereign-cross':{
      const axis=index%3,sign=index%2?1:-1,scatter=reach*.12;
      x=d.x*scatter;y=d.y*scatter;z=d.z*scatter;
      if(axis===0)x+=sign*reach*1.75;if(axis===1)y+=sign*reach*1.75;if(axis===2)z+=sign*reach*1.75;
      break;
    }
    case 'boundless-vortex':x=Math.cos(spiral)*reach;y=Math.sin(spiral)*reach;z=-reach*(.6+p*1.4);break;
    case 'miracle-supernova':{
      const wave=1+Math.sin(index*.7+p*8)*.2; x*=wave*1.7;y*=wave*1.7;z*=wave*1.7;break;
    }
  }
  target.x=x;target.y=y;target.z=z;return target;
}

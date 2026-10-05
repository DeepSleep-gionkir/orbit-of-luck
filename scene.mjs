import * as THREE from './vendor/three.module.min.js';
import {CINEMATICS,INTRO_DURATION,rarityMotion,burstMotion} from './cinematics.mjs?v=20261006-1';

// Each face grows into an outward point, including on the front and back.
function createStarGeometry() {
  const base=new THREE.IcosahedronGeometry(.20,0),faces=base.getAttribute('position'),positions=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),tip=new THREE.Vector3();
  const triangle=(p,q,r)=>positions.push(p.x,p.y,p.z,q.x,q.y,q.z,r.x,r.y,r.z);
  for(let i=0;i<faces.count;i+=3) {
    a.fromBufferAttribute(faces,i);b.fromBufferAttribute(faces,i+1);c.fromBufferAttribute(faces,i+2);
    tip.copy(a).add(b).add(c).normalize().multiplyScalar(1.40);
    triangle(a,b,tip);triangle(b,c,tip);triangle(c,a,tip);
  }
  base.dispose();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

function createCloudNoise(){
  const size=128,data=new Uint8Array(size*size*4);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const noise=(x,y,period)=>{
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
    const a=hash(ix%period,iy%period),b=hash((ix+1)%period,iy%period),c=hash(ix%period,(iy+1)%period),d=hash((ix+1)%period,(iy+1)%period);
    return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,value=Math.round((noise(u*4,v*4,4)*.55+noise(u*8,v*8,8)*.3+noise(u*16,v*16,16)*.15)*255),index=(y*size+x)*4;
    data[index]=data[index+1]=data[index+2]=value;data[index+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}

function makeRibbon(width,strength,rainbow) {
  const rows=64,positions=new Float32Array(rows*2*3),uvs=new Float32Array(rows*2*2),indices=[];
  for(let i=0;i<rows;i++) {
    for(let side=0;side<2;side++){uvs[(i*2+side)*2]=i/(rows-1);uvs[(i*2+side)*2+1]=side;}
    if(i<rows-1){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{strength:{value:strength},rainbow:{value:rainbow}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform float strength;uniform float rainbow;
      void main(){float across=abs(vUv.y-.5)*2.;
        vec3 spectrum=.52+.48*cos(6.28318*(vUv.x*.75+vUv.y*.65+vec3(0.,.33,.67)));
        float whiteCore=pow(max(0.,1.-across),4.);
        vec3 color=mix(vec3(1.),mix(spectrum,vec3(1.),whiteCore),rainbow);
        float alpha=exp(-across*across*5.)*pow(1.-vUv.x,1.25)*strength;
        gl_FragColor=vec4(color,alpha);}`,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  return {mesh,positions,width,rows,strength};
}

export function createScene(host) {
  const lobbySlot=document.querySelector('#sceneSlot')??host;
  const lobbyRect=()=>lobbySlot.getBoundingClientRect();
  if(lobbySlot!==host)document.body.appendChild(host);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}
  catch{host.querySelector('.scene-fallback').hidden=false;return {reveal(){},beginRarity(){},finish(){},reset(){}};}
  // Preserve crisp spike edges at the screen's density. Frame timing must never
  // reduce resolution, including after a cinematic returns to the lobby.
  const screenPixelRatio=()=>Math.min(devicePixelRatio||1,2);
  renderer.setPixelRatio(screenPixelRatio());renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);
  camera.position.set(0,0,8);
  world.add(new THREE.AmbientLight(0xdfe6ff,.85));
  const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(3,4,5);world.add(key);
  const rim=new THREE.DirectionalLight(0xbda2ff,2.1);rim.position.set(-4,1,2);world.add(rim);
  const backlight=new THREE.DirectionalLight(0x91d6ff,1.3);backlight.position.set(2,-2,-3);world.add(backlight);
  const group=new THREE.Group();world.add(group);
  const starGeometry=createStarGeometry();
  const material=new THREE.MeshPhysicalMaterial({
    color:0xe7e5f8,metalness:.32,roughness:.23,clearcoat:1,clearcoatRoughness:.15,
    iridescence:.4,iridescenceIOR:1.35,emissive:0xc8c1e8,emissiveIntensity:.16,
  });
  const star=new THREE.Mesh(starGeometry,material);group.add(star);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(starGeometry,27),new THREE.LineBasicMaterial({color:0xf6f0ff,transparent:true,opacity:.13}));
  group.add(outline);
  const haloMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{tint:{value:new THREE.Color(0xece5ff)},strength:{value:.45}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){float d=length(vUv-.5)*2.;float glow=pow(max(0.,1.-d),3.5);gl_FragColor=vec4(tint,glow*strength);}',
  });
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(6,6),haloMaterial);halo.position.z=-.5;group.add(halo);
  const coreGlowMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{tint:{value:new THREE.Color(0xece5ff)},strength:{value:.85}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float strength;
      void main(){float d=length(vUv-.5)*2.;float core=exp(-d*d*44.);
        float bloom=exp(-d*d*8.)*.36;float edge=1.-smoothstep(.75,1.,d);
        vec3 light=mix(tint,vec3(1.),core);
        gl_FragColor=vec4(light,(core+bloom)*edge*strength);}`,
  });
  const coreGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.55),coreGlowMaterial);
  coreGlow.renderOrder=3;group.add(coreGlow);

  // Ribbons live in world space and trace where the star actually travelled.
  const trailGroup=new THREE.Group();world.add(trailGroup);
  const ribbons=[makeRibbon(.38,.23,1),makeRibbon(.13,.9,1),makeRibbon(.034,1.05,0)];
  ribbons.forEach(r=>trailGroup.add(r.mesh));
  const trailCount=150,trailData=new Float32Array(trailCount*3),trailColors=new Float32Array(trailCount*3);
  const trailPhases=new Float32Array(trailCount),trailSizes=new Float32Array(trailCount),trailGeo=new THREE.BufferGeometry();
  for(let i=0;i<trailCount;i++){
    const color=new THREE.Color().setHSL(i/trailCount,.65,.75).lerp(new THREE.Color(0xffffff),.4);
    color.toArray(trailColors,i*3);trailPhases[i]=Math.random()*Math.PI*2;trailSizes[i]=.035+Math.random()*.045;
  }
  trailGeo.setAttribute('position',new THREE.BufferAttribute(trailData,3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute('color',new THREE.BufferAttribute(trailColors,3));
  trailGeo.setAttribute('phase',new THREE.BufferAttribute(trailPhases,1));
  trailGeo.setAttribute('size',new THREE.BufferAttribute(trailSizes,1));
  const sparkleMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{time:{value:0},opacity:{value:1},pixelRatio:{value:renderer.getPixelRatio()},pointScale:{value:1},pointStretch:{value:new THREE.Vector2(1,1)}},
    vertexShader:`attribute vec3 color;attribute float phase;attribute float size;
      uniform float time;uniform float pixelRatio;uniform float pointScale;varying vec3 vColor;varying float vAlpha;
      void main(){vColor=color;vAlpha=.8+.2*sin(phase);
        vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;
        gl_PointSize=max(1.,size*240.*pixelRatio*pointScale/-p.z);}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float opacity;uniform vec2 pointStretch;
      void main(){float d=length((gl_PointCoord-.5)*2.*pointStretch);float glow=pow(max(0.,1.-d),2.);
        gl_FragColor=vec4(mix(vColor,vec3(1.),glow),glow*vAlpha*opacity);}`,
  });
  const trailPoints=new THREE.Points(trailGeo,sparkleMaterial);trailPoints.frustumCulled=false;trailGroup.add(trailPoints);
  let history=[],sampleClock=-1,sampleIndex=0;
  const samplePool=Array.from({length:256},()=>({time:0,position:new THREE.Vector3()}));
  const pointA=new THREE.Vector3(),trailNormal=new THREE.Vector3();
  function pathPoint(age,target) {
    const when=clock-age;
    if(!history.length)return target.copy(group.position);
    if(when>=history[0].time)return target.copy(history[0].position);
    if(when<=history.at(-1).time)return target.copy(history.at(-1).position);
    let lo=0,hi=history.length-1;
    while(hi-lo>1){const middle=(lo+hi)>>1;if(history[middle].time>when)lo=middle;else hi=middle;}
    const newer=history[lo],older=history[hi],blend=(newer.time-when)/Math.max(.0001,newer.time-older.time);
    return target.copy(newer.position).lerp(older.position,blend);
  }
  function updateTrail(fade) {
    const lifespan=3.1;
    trailNormal.set(0,1,0).applyQuaternion(camera.quaternion);
    if(clock-sampleClock>.016||history.length===0){const sample=samplePool[sampleIndex++%samplePool.length];sample.time=clock;sample.position.copy(group.position);history.unshift(sample);sampleClock=clock;}
    while(history.length>2&&history.at(-2).time<clock-lifespan)history.pop();
    for(const ribbon of ribbons){
      ribbon.mesh.material.uniforms.strength.value=ribbon.strength*fade;
      for(let i=0;i<ribbon.rows;i++){
        const age=i/(ribbon.rows-1),elapsed=age*lifespan;
        pathPoint(elapsed,pointA);
        // Stable screen-facing strips do not flip their cross section at a turn.
        const width=ribbon.width*Math.pow(1-age,.65);
        for(let side=0;side<2;side++){const sign=side===0?-1:1,idx=(i*2+side)*3;
          const offset=width*sign-age*.055;
          ribbon.positions[idx]=pointA.x+trailNormal.x*offset;
          ribbon.positions[idx+1]=pointA.y+trailNormal.y*offset;
          ribbon.positions[idx+2]=pointA.z+trailNormal.z*offset-.28;
        }
      }
      ribbon.mesh.geometry.attributes.position.needsUpdate=true;
    }
    for(let i=0;i<trailCount;i++){
      const age=i/(trailCount-1);pathPoint(age*lifespan,pointA);
      const spread=.04+age*.1;
      trailData[i*3]=pointA.x+Math.sin(i*4.7)*spread;
      trailData[i*3+1]=pointA.y+Math.cos(i*3.3)*spread-age*.06;
      trailData[i*3+2]=pointA.z-.24+Math.sin(i)*.04;
    }
    trailGeo.attributes.position.needsUpdate=true;sparkleMaterial.uniforms.time.value=clock;sparkleMaterial.uniforms.opacity.value=fade;
  }

  const gatheringCount=220,gatheringData=new Float32Array(gatheringCount*3),gatheringGeometry=new THREE.BufferGeometry();
  const gatheringColors=new Float32Array(gatheringCount*3),gatheringSizes=new Float32Array(gatheringCount),gatheringPhases=new Float32Array(gatheringCount);
  for(let i=0;i<gatheringCount;i++){
    gatheringColors[i*3]=.9;gatheringColors[i*3+1]=.94;gatheringColors[i*3+2]=1;
    gatheringSizes[i]=.035+(i%7)*.006;gatheringPhases[i]=i*2.399;
  }
  gatheringGeometry.setAttribute('position',new THREE.BufferAttribute(gatheringData,3).setUsage(THREE.DynamicDrawUsage));
  gatheringGeometry.setAttribute('color',new THREE.BufferAttribute(gatheringColors,3));
  gatheringGeometry.setAttribute('size',new THREE.BufferAttribute(gatheringSizes,1));
  gatheringGeometry.setAttribute('phase',new THREE.BufferAttribute(gatheringPhases,1));
  const gatheringMaterial=sparkleMaterial.clone();gatheringMaterial.uniforms.opacity.value=0;
  const gatheringDust=new THREE.Points(gatheringGeometry,gatheringMaterial);gatheringDust.frustumCulled=false;world.add(gatheringDust);
  const frameCoords=[],size=1.68,corner=.32;
  for(const x of [-1,1])for(const y of [-1,1])frameCoords.push(x*size,y*(size+.05),.4,x*(size-corner),y*(size+.05),.4,x*size,y*(size+.05),.4,x*size,y*(size+.05-corner),.4);
  const frameGeo=new THREE.BufferGeometry();frameGeo.setAttribute('position',new THREE.Float32BufferAttribute(frameCoords,3));
  const revealFrame=new THREE.LineSegments(frameGeo,new THREE.LineBasicMaterial({color:0xe1d4ff,transparent:true,opacity:0}));world.add(revealFrame);
  const orbitGroup=new THREE.Group();group.add(orbitGroup);const rings=[];
  for(let i=0;i<7;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.55+i*.1,.007+(i%2)*.004,5,140),new THREE.MeshBasicMaterial({color:0xd3beff,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));
    ring.rotation.set(.65+i*.32,.2+i*.55,.1+i*.23);orbitGroup.add(ring);rings.push(ring);
  }
  const satellites=[];
  for(let i=0;i<18;i++){const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.06,0),new THREE.MeshBasicMaterial({color:0xd2c4ff,transparent:true,opacity:0}));group.add(mesh);satellites.push(mesh);}
  const count=2000,particleData=new Float32Array(count*3),particleColors=new Float32Array(count*3),particleSizes=new Float32Array(count),directions=[];
  for(let i=0;i<count;i++){
    directions.push({direction:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),speed:.7+Math.random()*2.5});
    particleSizes[i]=.7+Math.random()*1.6;
  }
  const particleGeo=new THREE.BufferGeometry();
  particleGeo.setAttribute('position',new THREE.BufferAttribute(particleData,3).setUsage(THREE.DynamicDrawUsage));
  particleGeo.setAttribute('color',new THREE.BufferAttribute(particleColors,3).setUsage(THREE.DynamicDrawUsage));
  particleGeo.setAttribute('size',new THREE.BufferAttribute(particleSizes,1));
  const particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{opacity:{value:0},pixelRatio:{value:renderer.getPixelRatio()},pointScale:{value:1},pointStretch:{value:new THREE.Vector2(1,1)},strength:{value:1}},
    vertexShader:`attribute vec3 color;attribute float size;uniform float pixelRatio;uniform float pointScale;uniform float strength;varying vec3 vColor;
      void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;
        gl_PointSize=clamp(size*55.*pixelRatio*strength*pointScale/-p.z,1.5,24.);}`,
    fragmentShader:`varying vec3 vColor;uniform float opacity;uniform vec2 pointStretch;void main(){vec2 p=(gl_PointCoord-.5)*2.*pointStretch;float r=length(p);
      float glow=exp(-r*r*5.);float cross=exp(-abs(p.x*p.y)*50.)*pow(max(0.,1.-r),3.);
      gl_FragColor=vec4(mix(vColor,vec3(1.),glow*.75),(glow*.65+cross*.35)*opacity);}`,
  });
  const particles=new THREE.Points(particleGeo,particleMaterial);particles.frustumCulled=false;world.add(particles);
  const rayCount=96,rayData=new Float32Array(rayCount*6),rayColors=new Float32Array(rayCount*6),rayGeometry=new THREE.BufferGeometry();
  rayGeometry.setAttribute('position',new THREE.BufferAttribute(rayData,3).setUsage(THREE.DynamicDrawUsage));
  rayGeometry.setAttribute('color',new THREE.BufferAttribute(rayColors,3).setUsage(THREE.DynamicDrawUsage));
  const rays=new THREE.LineSegments(rayGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));rays.frustumCulled=false;world.add(rays);
  // Hundreds of rotating fragments share geometry, material and one GPU draw call.
  const shardCount=144,shards=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}),shardCount);
  shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);shards.frustumCulled=false;world.add(shards);
  const shardTransform=new THREE.Object3D(),burstState={},rayState={},effectColor=new THREE.Color(),white=new THREE.Color(0xffffff);
  let activeParticles=0,activeRays=0,activeShards=0;
  const burstGlowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{tint:{value:new THREE.Color(0xffffff)},strength:{value:0},rainbow:{value:0},phase:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float strength;uniform float rainbow;uniform float phase;
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p),angle=atan(p.y,p.x);
        float core=exp(-r*r*38.),bloom=exp(-r*r*4.)*.48;
        float spokes=pow(max(0.,sin(angle*12.+phase)),18.)*exp(-r*r*6.)*.22;
        vec3 spectrum=.45+.45*cos(angle+vec3(0.,2.094,4.189));
        vec3 color=mix(tint,spectrum,rainbow*.8);color=mix(color,vec3(1.),core);
        float edge=1.-smoothstep(.7,1.,r);gl_FragColor=vec4(color,(core+bloom+spokes)*edge*strength);}`,
  });
  const burstGlow=new THREE.Mesh(new THREE.PlaneGeometry(8,8),burstGlowMaterial);burstGlow.renderOrder=5;world.add(burstGlow);
  const shockwaves=[];
  for(let i=0;i<4;i++){const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.012,6,150),new THREE.MeshBasicMaterial({color:0xffe6b8,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));world.add(mesh);shockwaves.push(mesh);}

  const cosmos=new THREE.Group();cosmos.visible=false;world.add(cosmos);
  const skyCount=2100,skyPositions=new Float32Array(skyCount*3),skyColors=new Float32Array(skyCount*3),skyPhases=new Float32Array(skyCount),skySizes=new Float32Array(skyCount);
  for(let i=0;i<skyCount;i++){
    const radius=i<760?9+Math.random()*19:32+Math.random()*40;
    const direction=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(radius);
    direction.toArray(skyPositions,i*3);
    new THREE.Color().setHSL(.54+Math.random()*.26,.25+Math.random()*.35,.72+Math.random()*.25).toArray(skyColors,i*3);
    skyPhases[i]=Math.random()*Math.PI*2;skySizes[i]=.12+Math.random()**3*.45;
  }
  const skyGeometry=new THREE.BufferGeometry();
  skyGeometry.setAttribute('position',new THREE.BufferAttribute(skyPositions,3));skyGeometry.setAttribute('color',new THREE.BufferAttribute(skyColors,3));
  skyGeometry.setAttribute('phase',new THREE.BufferAttribute(skyPhases,1));skyGeometry.setAttribute('size',new THREE.BufferAttribute(skySizes,1));
  const cosmicSkyMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{time:{value:0},opacity:{value:1},pixelRatio:{value:renderer.getPixelRatio()},pointScale:{value:1},pointStretch:{value:new THREE.Vector2(1,1)}},
    vertexShader:`attribute vec3 color;attribute float phase;attribute float size;
      uniform float time;uniform float pixelRatio;uniform float pointScale;varying vec3 vColor;varying float vAlpha;
      float hash(float n){return fract(sin(n)*43758.5453);}
      void main(){float phaseTime=time*(.7+phase*.08)+phase;float cycle=(phaseTime+1.5707963)/6.2831853;
        float n=floor(cycle),blend=smoothstep(0.,.13,fract(cycle));
        vec2 previous=vec2(hash(n-1.+phase),hash(n-1.+phase+8.));
        vec2 next=vec2(hash(n+phase),hash(n+phase+8.));
        vec3 pos=position;pos.xy+=(mix(previous,next,blend)-.5)*.07;
        vColor=color;vAlpha=.18+.82*pow((sin(phaseTime)+1.)*.5,1.4);
        vec4 p=modelViewMatrix*vec4(pos,1.);gl_Position=projectionMatrix*p;
        gl_PointSize=clamp(size*360.*pixelRatio*pointScale/-p.z,1.2,10.);}`,
    fragmentShader:`uniform float opacity;uniform vec2 pointStretch;varying vec3 vColor;varying float vAlpha;
      void main(){float d=length((gl_PointCoord-.5)*2.*pointStretch);float glow=pow(max(0.,1.-d),2.5);
        gl_FragColor=vec4(mix(vColor,vec3(1.),glow),glow*vAlpha*opacity);}`,
  });
  const cosmicSky=new THREE.Points(skyGeometry,cosmicSkyMaterial);cosmicSky.frustumCulled=false;cosmos.add(cosmicSky);
  const nebulae=[],cloudNoise=createCloudNoise();
  for(let i=0;i<6;i++){
    const nebulaMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},tint:{value:new THREE.Color(0x9d8ddd)},opacity:{value:0},seed:{value:i*3.7},noiseMap:{value:cloudNoise}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 tint;uniform float opacity;uniform float seed;uniform sampler2D noiseMap;
        void main(){vec2 uv=vUv-.5;float d=length(uv)*2.;float edge=pow(max(0.,1.-d),2.);
          float cloud=texture2D(noiseMap,vUv+vec2(seed,time*.00375)).r;
          float ridge=pow(cloud,2.5);vec3 color=mix(tint,vec3(.38,.56,1.),vUv.x*.35);
          gl_FragColor=vec4(color,ridge*edge*opacity);}`,
    });
    const nebula=new THREE.Mesh(new THREE.PlaneGeometry(27+(i%3)*4,23+(i%3)*3),nebulaMaterial);
    const angle=i/6*Math.PI*2;
    nebula.position.set(Math.sin(angle)*25,i%2?12:-10,Math.cos(angle)*28);cosmos.add(nebula);nebulae.push(nebula);
  }
  const outerRings=[];
  for(let i=0;i<5;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(3.3+i*.8,.006+i*.002,5,180),new THREE.MeshBasicMaterial({color:0xe2d0ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    ring.rotation.set(.35+i*.38,.1+i*.42,i*.28);cosmos.add(ring);outerRings.push(ring);
  }
  const warpCount=320,warpData=new Float32Array(warpCount*6),warpLanes=Array.from({length:warpCount},()=>{const angle=Math.random()*Math.PI*2,radius=4+Math.random()*20;return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,phase:Math.random()};});
  const warpGeometry=new THREE.BufferGeometry();warpGeometry.setAttribute('position',new THREE.BufferAttribute(warpData,3).setUsage(THREE.DynamicDrawUsage));
  const warpLines=new THREE.LineSegments(warpGeometry,new THREE.LineBasicMaterial({color:0xc9dcff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  warpLines.frustumCulled=false;cosmos.add(warpLines);
  const dustCount=360,dustData=new Float32Array(dustCount*3),dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustData,3).setUsage(THREE.DynamicDrawUsage));
  const cosmicDust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xd8d0ff,size:.035,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));cosmicDust.frustumCulled=false;cosmos.add(cosmicDust);
  const flareMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{tint:{value:new THREE.Color(0xece5ff)},strength:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){vec2 p=abs(vUv-.5)*2.;float light=exp(-p.y*p.y*80.)*pow(max(0.,1.-p.x),2.);gl_FragColor=vec4(mix(tint,vec3(1.),.75),light*strength);}',
  });
  const flare=new THREE.Mesh(new THREE.PlaneGeometry(9,1.1),flareMaterial);flare.renderOrder=4;cosmos.add(flare);
  let animation=null,resultLevel=-1,burstAt=0,last=performance.now(),clock=0,raf;
  const resultColor=new THREE.Color(0xece5ff),idleColor=new THREE.Color(0xece5ff),surfaceColor=new THREE.Color(0xe7e5f8),trailTint=new THREE.Color(0xdce9ff);
  const nebulaPalette=[new THREE.Color(0x647bcd),new THREE.Color(0x9968c8)];
  const motionState={},effectAnchor=new THREE.Vector3(),cameraTarget=new THREE.Vector3();
  let idlePhase=0,moveSpeed=.8+Math.random()*.4,movementSegment=0,lobbyEnteredAt=-Infinity,rotationClock=0;
  let renderWidth=0,renderHeight=0,layoutWidth=0,layoutHeight=0,lobbyHeight=405;
  function updatePointProjection(){
    const w=host.clientWidth,h=host.clientHeight;
    const stretch=(renderWidth/renderHeight)/(w/h),pointScale=Math.max(1,1/stretch);
    for(const shader of [sparkleMaterial,cosmicSkyMaterial,particleMaterial,gatheringMaterial]){
      shader.uniforms.pixelRatio.value=renderer.domElement.width/w;
      shader.uniforms.pointScale.value=pointScale;
      shader.uniforms.pointStretch.value.set(pointScale,Math.max(1,stretch));
    }
  }
  function setResolution(ratio){
    const w=innerWidth,h=innerHeight;
    if(w===renderWidth&&h===renderHeight&&Math.abs(renderer.getPixelRatio()-ratio)<.025)return;
    // Keep a viewport-sized buffer ready throughout the lobby and cinematic.
    // The UI fade changes only CSS and projection, with no GPU buffer allocation.
    renderer.setDrawingBufferSize(w,h,ratio);renderWidth=w;renderHeight=h;updatePointProjection();
  }
  const idleScale=.78*.7,travelTime=1400;
  const smooth=t=>{const n=Math.min(1,Math.max(0,t));return n*n*(3-2*n);};
  const defaultZ=()=>{const rect=lobbyRect();return (rect.width<500?9.7:8)*innerHeight/rect.height;};
  function resetCamera(){
    const rect=lobbyRect();lobbyHeight=rect.height;camera.position.set(0,0,defaultZ());camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.fov=38;
    camera.setViewOffset(innerWidth,innerHeight,innerWidth/2-(rect.left+rect.width/2),innerHeight/2-(rect.top+rect.height/2),innerWidth,innerHeight);
    camera.updateProjectionMatrix();
  }
  function resize(){
    setResolution(screenPixelRatio());
    const w=host.clientWidth,h=host.clientHeight;
    if(w===layoutWidth&&h===layoutHeight)return;
    layoutWidth=w;layoutHeight=h;camera.aspect=w/h;updatePointProjection();
    if(!animation||animation.mode==='preparation')resetCamera();else camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(()=>resize());observer.observe(host);resize(true);
  let hiddenStarted=0;
  function onVisibility(){
    if(document.hidden)hiddenStarted=performance.now();
    else{const now=performance.now();if(animation&&hiddenStarted){animation.start+=now-hiddenStarted;animation.lastPresentedAt=now;}hiddenStarted=0;last=now;}
  }
  document.addEventListener('visibilitychange',onVisibility);
  function reveal(rarity,duration=INTRO_DURATION,{count=1}={}){
    // Preparation belongs to the lobby. Its camera, background and UI stay put.
    const phase=resultLevel<0?idlePhase:0;
    let resolvePreparation;const completion=new Promise(resolve=>{resolvePreparation=resolve;});
    animation={mode:'preparation',batchCount:count,elapsed:0,resolvePreparation,start:performance.now(),duration,preparationDuration:duration,cinematic:false,level:rarity.index,color:new THREE.Color(rarity.color),phase,startY:group.position.y,startScale:group.scale.x,initialCamera:camera.position.clone()};
    if(document.hidden)hiddenStarted=performance.now();
    gatheringGeometry.setDrawRange(0,count===100?220:count===10?128:64);
    resultLevel=-1;burstAt=0;host.dataset.motion='preparation';return completion;
  }
  function beginRarity(rarity,duration,transitionDuration,rect){
    const a=animation;if(!a)return;
    const level=rarity.index,preset=CINEMATICS[level];
    resize();
    const introCamera=new THREE.Vector3(0,.1,14.5),points=[introCamera.clone()];
    for(let i=1;i<=8;i++){
      const p=i/8,angle=p*preset.arc*Math.PI,radius=14.5-Math.sin(p*Math.PI)*preset.zoom;
      const height=Math.sin(p*Math.PI*(1+(level%3)))*preset.height;
      points.push(new THREE.Vector3(Math.sin(angle)*radius,height,Math.cos(angle)*radius));
    }
    points.push(new THREE.Vector3(-2,preset.height*.6,16+level/17*6),new THREE.Vector3(0,1.2,15+level/17*4));
    Object.assign(a,{mode:'rarity',start:performance.now(),duration,transitionDuration,cinematic:true,preset,introCamera,path:new THREE.CatmullRomCurve3(points,false,'centripetal'),transitionScale:group.scale.x,
      startCamera:a.initialCamera.clone(),offsetX:host.clientWidth/2-(rect.left+rect.width/2),offsetY:host.clientHeight/2-(rect.top+rect.height/2),anchorSet:false});
    if(document.hidden)hiddenStarted=performance.now();
    host.dataset.motion=preset.motion;host.dataset.finale=preset.finale;
    warpGeometry.setDrawRange(0,(level<5?18+level*8:65+Math.floor(Math.max(0,(level-4)/13)*255))*2);
    dustGeometry.setDrawRange(0,Math.floor(60+Math.max(0,(level-4)/13)*300));
    const richness=level/17;
    activeParticles=Math.floor(90+Math.pow(richness,1.5)*1910);particleGeo.setDrawRange(0,activeParticles);
    activeRays=Math.floor(4+richness*richness*92);rayGeometry.setDrawRange(0,activeRays*2);
    activeShards=level<5?0:Math.floor(12+Math.pow(richness,2)*132);shards.count=activeShards;
    for(let i=0;i<count;i++){
      effectColor.copy(a.color).lerp(white,.3+(i%7)/14);
      if(level>=16)effectColor.setHSL((i*.61803398875)%1,.9,.58).lerp(white,.12);
      effectColor.toArray(particleColors,i*3);
      if(i<rayCount){effectColor.toArray(rayColors,i*6);effectColor.toArray(rayColors,i*6+3);}
      if(i<shardCount)shards.setColorAt(i,effectColor);
    }
    particleGeo.attributes.color.needsUpdate=true;rayGeometry.attributes.color.needsUpdate=true;shards.instanceColor.needsUpdate=true;
    particleMaterial.uniforms.strength.value=.7+richness*.8;
  }
  function finish(){if(animation){resultLevel=animation.level;resultColor.copy(animation.color);animation=null;burstAt=0;group.position.set(0,0,0);resetCamera();}}
  function reset(){
    animation=null;resultLevel=-1;resultColor.copy(idleColor);burstAt=0;
    idlePhase=0;moveSpeed=.8+Math.random()*.4;movementSegment=0;lobbyEnteredAt=performance.now();
    group.position.set(0,0,0);history=[];sampleClock=-1;resetCamera();
  }
  function tick(now){
    raf=requestAnimationFrame(tick);if(document.hidden)return;
    const a=animation,frameInterval=reduced?1000/30:a?1000/60:1000/45;
    if(now-last<frameInterval-.7)return;
    const frameElapsed=now-last,dt=Math.max(0,Math.min(frameElapsed/1000,.065));last=now;clock+=dt;
    // Browser zoom or moving to a different-density display may change DPR
    // without changing the CSS canvas dimensions.
    if(Math.abs(screenPixelRatio()-renderer.getPixelRatio())>.025)resize();
    const preparing=!!a&&a.mode==='preparation';
    if(preparing){const step=Math.max(0,now-(a.lastPresentedAt??a.start));a.lastPresentedAt=now;a.elapsed=Math.min(a.duration,a.elapsed+Math.min(step,40));}
    const elapsed=preparing?a.elapsed:a?Math.max(0,now-a.start):0;
    const preparation=preparing?smooth(elapsed/a.duration):0;
    const transitioning=!!a&&a.cinematic&&elapsed<a.transitionDuration;
    const transition=a&&a.cinematic?smooth(elapsed/a.transitionDuration):0;
    const story=a&&a.cinematic?Math.min(1,Math.max(0,(elapsed-a.transitionDuration)/Math.max(1,a.duration))):0;
    const charge=preparing?smooth((elapsed-travelTime-80)/450):0;
    const energy=a?(preparing?charge*(.25+preparation*.35):a.cinematic?transitioning?THREE.MathUtils.lerp(.6,.15,transition):.15+smooth(story)*.85:0):0;
    const level=preparing?-1:a?a.level:resultLevel,high=Math.max(0,(level-4)/13),richness=Math.max(0,level/17),color=preparing?idleColor:a?a.color:resultColor;
    const isIdle=!a&&resultLevel<0,stage=preparing?'preparation':transitioning?'rarity-transition':a&&a.cinematic?(story>=.82?'rarity-finale':'rarity-animation'):isIdle?'lobby':'result';
    if(host.dataset.phase!==stage)host.dataset.phase=stage;
    let x=0,y=0,z=0,scale=1.18,visibility=1;
    if(isIdle){
      if(!reduced){idlePhase+=dt*1.35*moveSpeed;const segment=Math.floor((idlePhase+Math.PI/2)/Math.PI);if(segment!==movementSegment){movementSegment=segment;moveSpeed=.8+Math.random()*.4;}}
      const enter=smooth((now-lobbyEnteredAt)/700);
      x=reduced?0:Math.sin(idlePhase)*1.35*enter;y=reduced?0:Math.sin(idlePhase*.8)*.13*enter;
      scale=THREE.MathUtils.lerp(1.18,idleScale,enter);
    }else if(a){
      if(preparing){
        const travel=reduced?1:Math.min(1,elapsed/travelTime),settle=smooth(travel);
        x=reduced?0:Math.sin(a.phase+travel*Math.PI*3)*1.35*(1-settle);
        y=a.startY*(1-settle)+(reduced?0:Math.sin(travel*Math.PI*3)*.12*(1-settle));
        scale=THREE.MathUtils.lerp(a.startScale,1.18,smooth(elapsed/Math.min(1800,a.duration)));
        if(travel>=1&&!reduced){x+=Math.sin(now*.071)*charge*.013;y+=Math.cos(now*.059)*charge*.013;}
      }else if(transitioning){scale=THREE.MathUtils.lerp(a.transitionScale,.94,transition);}else{
        const motion=rarityMotion(a.level,story,motionState);
        if(!reduced){x=motion.x;y=motion.y;z=motion.z;scale=.94*motion.scale;visibility=motion.visibility;}
        else scale=.94;
      }
    }
    group.position.set(x,y,z);group.visible=visibility>.001;group.scale.setScalar(Math.max(0,scale+(reduced?0:Math.sin(clock*1.8)*.008*visibility)));
    rotationClock+=dt*(reduced?0:isIdle?.38:preparing?.6:.65+energy*(.5+high*1.8));
    star.rotation.y=reduced?.25:rotationClock;star.rotation.x=reduced?.15:rotationClock*.47;
    star.rotation.z=reduced?0:isIdle?-.09*Math.cos(idlePhase):Math.sin(clock*.8)*(.06+high*.15);
    outline.rotation.copy(star.rotation);
    material.color.lerp(level>=0?color:surfaceColor,.06);material.emissive.copy(color);material.emissiveIntensity=.16+energy*.5;
    outline.material.color.copy(color);haloMaterial.uniforms.tint.value.copy(isIdle?idleColor:color);
    haloMaterial.uniforms.strength.value=.45+(reduced?0:Math.sin(clock*2.2)*.04)+energy*.65;
    coreGlowMaterial.uniforms.tint.value.copy(isIdle?idleColor:color);coreGlowMaterial.uniforms.strength.value=.85+energy*.35;
    const lobbyPointScale=(isIdle||preparing)?innerHeight/lobbyHeight:transitioning?THREE.MathUtils.lerp(innerHeight/lobbyHeight,1,transition):1;
    sparkleMaterial.uniforms.pointScale.value=gatheringMaterial.uniforms.pointScale.value=lobbyPointScale;
    gatheringDust.visible=!reduced&&(preparing&&elapsed>travelTime||transitioning);
    if(gatheringDust.visible){
      const gatherTime=preparing?elapsed:a.preparationDuration+elapsed,active=gatheringGeometry.drawRange.count;
      gatheringDust.position.copy(group.position);
      gatheringMaterial.uniforms.opacity.value=preparing?charge*(.18+preparation*.26):(1-transition)*.44;
      for(let i=0;i<active;i++){
        const progress=(i/active+gatherTime/2600)%1,radius=.18+(1-progress)*(2+active/220),angle=i*2.399+gatherTime*.0015,offset=i*3;
        gatheringData[offset]=Math.cos(angle)*radius;gatheringData[offset+1]=Math.sin(angle)*radius*.7;gatheringData[offset+2]=Math.sin(i*.71+gatherTime*.0008)*radius*.5;
      }
      gatheringGeometry.attributes.position.needsUpdate=true;
    }
    const trailFade=reduced?0:isIdle?1:a?(preparing?1:a.cinematic?(.22+high*.25)*visibility:1):0;
    trailGroup.visible=trailFade>.01;
    revealFrame.material.opacity=a?(preparing||!a.cinematic?charge*.8:(1-smooth(story/.22))*.7*visibility):resultLevel>=0?.12:0;
    revealFrame.material.color.copy(color);revealFrame.position.copy(group.position);revealFrame.scale.setScalar(1+energy*.1);
    const speed=reduced?0:a?.5+energy*(.8+high*4):.25;
    orbitGroup.rotation.y+=dt*speed*.2;orbitGroup.rotation.z+=dt*(reduced?0:.07+energy*high*.5);
    rings.forEach((ring,i)=>{
      ring.visible=preparing?i<2:i<(level>=5?3+Math.floor(high*4):2);if(!ring.visible)return;
      ring.material.color.copy(color);ring.material.opacity=preparing?charge*(.12+preparation*.18):transitioning?(i<2?THREE.MathUtils.lerp(.3,.15*(.3+high*.3),transition):transition*.15*(.3+high*.3)):a?energy*(.3+high*.3):resultLevel>=0?(i<2?.2:.13):0;
      ring.scale.setScalar(1+energy*i*.02);if(!reduced)ring.rotation.z+=dt*(i%2?1:-1)*energy*(.2+high);
    });
    satellites.forEach((mesh,i)=>{
      mesh.visible=level>=5&&i<3+Math.floor(high*15);if(!mesh.visible)return;
      mesh.material.color.copy(color);mesh.material.opacity=a?energy*.8:resultLevel>=5?.55:0;
      const angle=clock*(.2+high*.4)+i*2.399,radius=1.75+Math.sin(i*1.7)*.2;
      mesh.position.set(Math.cos(angle)*radius,Math.sin(angle)*(1.1+high*.35),Math.sin(angle+i)*.8);mesh.rotation.set(clock,clock*.6,i);mesh.scale.setScalar(.8+high*.7);
    });
    const since=a&&a.cinematic&&story>=.82?(story-.82)/.18:2,burst=Math.max(0,1-since);
    if(a?.cinematic&&story>=.82&&!a.anchorSet){effectAnchor.copy(group.position);a.anchorSet=true;}
    const hasBurst=!!a?.cinematic&&burst>0&&!reduced;
    particles.visible=rays.visible=burstGlow.visible=hasBurst;shards.visible=hasBurst&&activeShards>0;
    if(hasBurst){
      const finale=a.preset.finale;
      burstGlow.position.copy(effectAnchor);burstGlow.quaternion.copy(camera.quaternion);
      burstGlow.scale.setScalar((.2+Math.sqrt(since)*.9)*(.4+richness*1.3));
      burstGlowMaterial.uniforms.tint.value.copy(color);burstGlowMaterial.uniforms.rainbow.value=level>=16?1:0;
      burstGlowMaterial.uniforms.phase.value=since*3;
      burstGlowMaterial.uniforms.strength.value=(Math.exp(-since*5)*(1+richness*1.5)+Math.sin(since*Math.PI)*richness*.3)*burst;
      particleMaterial.uniforms.opacity.value=Math.sin(Math.min(1,since*2.5)*Math.PI*.5)*burst*(.65+richness*.45);
      rays.material.opacity=Math.sin(since*Math.PI)*(.25+richness*.7);shards.material.opacity=burst*(.3+richness*.7);
      for(let i=0;i<activeParticles;i++){
        burstMotion(finale,since,i,directions[i],burstState);
        particleData[i*3]=effectAnchor.x+burstState.x;particleData[i*3+1]=effectAnchor.y+burstState.y;particleData[i*3+2]=effectAnchor.z+burstState.z;
      }
      particleGeo.attributes.position.needsUpdate=true;
      for(let i=0;i<activeRays;i++){
        const index=i*19;
        burstMotion(finale,since*.55+.1,index,directions[index],burstState);
        const offset=i*6,stretch=1.3+richness*.7;
        rayData[offset]=effectAnchor.x+burstState.x*.22;rayData[offset+1]=effectAnchor.y+burstState.y*.22;rayData[offset+2]=effectAnchor.z+burstState.z*.22;
        rayData[offset+3]=effectAnchor.x+burstState.x*stretch;rayData[offset+4]=effectAnchor.y+burstState.y*stretch;rayData[offset+5]=effectAnchor.z+burstState.z*stretch;
      }
      rayGeometry.attributes.position.needsUpdate=true;
      for(let i=0;i<activeShards;i++){
        const index=i*13;
        burstMotion(finale,since,index,directions[index],rayState);
        shardTransform.position.set(effectAnchor.x+rayState.x,effectAnchor.y+rayState.y,effectAnchor.z+rayState.z);
        shardTransform.rotation.set(i+since*4,i*.7+since*3,i*.4-since*2);
        const size=(.015+(i%7)*.003)*(1+richness*.5)*burst;
        shardTransform.scale.set(size,size*(3+richness*4),size);shardTransform.updateMatrix();shards.setMatrixAt(i,shardTransform.matrix);
      }
      shards.instanceMatrix.needsUpdate=true;
    }
    shockwaves.forEach((mesh,i)=>{
      const p=since-i*.13;mesh.visible=hasBurst&&level>=7&&p>0&&p<1;if(!mesh.visible)return;
      mesh.position.copy(effectAnchor);mesh.material.color.copy(color);mesh.material.opacity=(1-p)*(.28+high*.35);mesh.scale.setScalar(.5+p*(3+high*2));mesh.rotation.set(.15*i,.2*i,0);
    });
    cosmos.visible=!!a?.cinematic;
    if(a?.cinematic){
      if(!reduced){
        if(transitioning){
          camera.position.lerpVectors(a.startCamera,a.introCamera,transition);camera.lookAt(0,0,0);
          camera.setViewOffset(innerWidth,innerHeight,a.offsetX*(1-transition),a.offsetY*(1-transition),innerWidth,innerHeight);
        }else{
          if(camera.view?.enabled)camera.clearViewOffset();a.path.getPoint(smooth(story),camera.position);
          const envelope=Math.sin(story*Math.PI);
          camera.position.x+=Math.sin(story*Math.PI*6)*high*.9*envelope;
          camera.position.y+=Math.cos(story*Math.PI*5+a.level)*high*.55*envelope;
          const shake=story>.82&&story<.98?Math.sin((story-.82)/.16*Math.PI)*(.012+high*.045):0;
          camera.position.x+=Math.sin(now*.049)*shake;camera.position.y+=Math.cos(now*.061)*shake;
          const yFollow=a.preset.rise&&story>.7?.6-.32*smooth((story-.7)/.12):.6;
          cameraTarget.set(group.position.x*.35,group.position.y*yFollow,group.position.z*.2);camera.lookAt(cameraTarget);
          camera.rotation.z+=Math.sin(story*Math.PI*3)*a.preset.roll;
          camera.fov=38+Math.sin(story*Math.PI)*high*4;camera.updateProjectionMatrix();
        }
      }else{camera.clearViewOffset();camera.position.copy(a.introCamera);camera.lookAt(0,0,0);camera.updateProjectionMatrix();}
      cosmicSkyMaterial.uniforms.time.value=reduced?0:clock;cosmicSkyMaterial.uniforms.opacity.value=transition*(1+richness*.4);
      nebulae.forEach((mesh,i)=>{
        mesh.quaternion.copy(camera.quaternion);mesh.material.uniforms.time.value=reduced?0:clock;
        mesh.material.uniforms.tint.value.copy(color).lerp(nebulaPalette[i%2],.45);
        mesh.material.uniforms.opacity.value=transition*(.65+richness*1.25+energy*.3+(hasBurst?Math.sin(since*Math.PI)*richness*.8:0));
      });
      outerRings.forEach((ring,i)=>{
        ring.visible=level>=5&&i<1+Math.floor(high*4);if(!ring.visible)return;
        ring.position.copy(group.position).multiplyScalar(.45);ring.material.color.copy(color);
        ring.material.opacity=smooth(energy*2)*(.08+high*.15)*(1-smooth((story-.96)/.04));
        ring.scale.setScalar(1+smooth((story-.66)/.3)*(.2+high*.8));
        if(!reduced){ring.rotation.z+=dt*(i%2?1:-1)*(.05+high*.16);ring.rotation.y+=dt*(.03+high*.08);}
      });
      const warp=transitioning?0:smooth((story-.04)/.4)*(1-smooth((story-.82)/.16));
      warpLines.visible=!reduced&&warp>.005;
      if(warpLines.visible){
        warpLines.material.color.copy(color).lerp(trailTint,.7);warpLines.material.opacity=warp*(.08+high*.24);
        const active=warpGeometry.drawRange.count/2;
        for(let i=0;i<active;i++){
          const lane=warpLanes[i],z=-35+((clock*(.13+high*.2)+lane.phase)%1)*65,offset=i*6;
          warpData[offset]=lane.x;warpData[offset+1]=lane.y;warpData[offset+2]=z;
          warpData[offset+3]=lane.x;warpData[offset+4]=lane.y;warpData[offset+5]=z+.3+warp*(.8+high*3.5);
        }
        warpGeometry.attributes.position.needsUpdate=true;
      }
      cosmicDust.visible=level>=5&&!reduced;
      if(cosmicDust.visible){
        cosmicDust.position.copy(group.position);cosmicDust.material.color.copy(color);cosmicDust.material.opacity=smooth(energy*2)*(.25+high*.4)*(visibility*.8+.2);
        const active=dustGeometry.drawRange.count;
        for(let i=0;i<active;i++){
          const angle=i*2.399+clock*(.2+high*.4),radius=1.7+(i%29)/29*(1+high*2.8),offset=i*3;
          dustData[offset]=Math.cos(angle)*radius;dustData[offset+1]=Math.sin(angle)*radius*(.5+high*.3);dustData[offset+2]=Math.sin(i*.71+clock*.3)*(.7+high*.9);
        }
        dustGeometry.attributes.position.needsUpdate=true;
      }
      const impact=story>.79?Math.sin(Math.min(1,(story-.79)/.21)*Math.PI):0;
      flare.visible=impact>.005;flare.position.copy(group.position);flare.quaternion.copy(camera.quaternion);flareMaterial.uniforms.tint.value.copy(color);
      flareMaterial.uniforms.strength.value=reduced?0:impact*(.25+high*.9);flare.scale.setScalar(.8+high*1.1);
    }
    if(trailGroup.visible)updateTrail(trailFade);
    halo.quaternion.copy(camera.quaternion);coreGlow.quaternion.copy(camera.quaternion);revealFrame.quaternion.copy(camera.quaternion);
    renderer.render(world,camera);
    if(preparing&&elapsed>=a.duration&&!a.preparationPresented){
      a.preparationPresented=true;
      // Leave the final centered, charged star on screen for an actual frame.
      requestAnimationFrame(()=>a.resolvePreparation?.());
    }
  }
  // Include instance colors in the initial shader variant, then warm GPU uploads
  // offscreen before a draw can begin. Nothing compiles during the UI fade.
  for(let i=0;i<shardCount;i++)shards.setColorAt(i,white);
  cosmos.visible=true;
  let disposed=false;
  const ready=renderer.compileAsync(world,camera).then(()=>{
    if(disposed)return;
    const warmTarget=new THREE.WebGLRenderTarget(64,64,{depthBuffer:true});
    renderer.setRenderTarget(warmTarget);renderer.render(world,camera);renderer.setRenderTarget(null);warmTarget.dispose();
    cosmos.visible=particles.visible=rays.visible=shards.visible=burstGlow.visible=gatheringDust.visible=false;
    last=performance.now();raf=requestAnimationFrame(tick);
  });
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);animation?.resolvePreparation?.();renderer.domElement.hidden=true;host.querySelector('.scene-fallback').hidden=false;});
  window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);cloudNoise.dispose();world.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.dispose();},{once:true});
  return {reveal,beginRarity,finish,reset,ready};
}

export function startSky(canvas){
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,turn=Math.PI*2;
  let width,height,stars=[],frame,last=0;
  const dots=['#aac2ff','#faebff'].map(color=>{
    const dot=document.createElement('canvas');dot.width=dot.height=16;
    const paint=dot.getContext('2d');paint.fillStyle=color;paint.beginPath();paint.arc(8,8,4,0,turn);paint.fill();return dot;
  });
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio,1.5);
    canvas.width=width*dpr;canvas.height=height*dpr;
    canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.min(1300,Math.max(450,width*height/1300));
    stars=Array.from({length:count},()=>{
      const phase=Math.random()*turn;
      return {x:Math.random()*width,y:Math.random()*height,r:.3+Math.random()**3*1.5,
        phase,speed:.65+Math.random()*.8,alpha:.25+Math.random()*.7,blue:Math.random()>.5,
        cycle:Math.floor((phase+Math.PI/2)/turn),dx:0,dy:0,targetX:0,targetY:0};
    });
  }
  function paint(now){
    frame=requestAnimationFrame(paint);if(document.hidden||document.body.classList.contains('is-cinematic-ready')||now-last<42)return;
    const dt=last?Math.min((now-last)/1000,.06):0;last=now;
    ctx.clearRect(0,0,width,height);
    for(const s of stars){
      if(!reduced){
        s.phase+=dt*s.speed;
        const cycle=Math.floor((s.phase+Math.PI/2)/turn);
        // Choose a tiny new offset at the dimmest point of each twinkle.
        if(cycle!==s.cycle){s.cycle=cycle;s.targetX=(Math.random()-.5)*3.2;s.targetY=(Math.random()-.5)*3.2;}
        const blend=1-Math.exp(-dt*3);
        s.dx+=(s.targetX-s.dx)*blend;s.dy+=(s.targetY-s.dy)*blend;
      }
      const brightness=reduced?.72:(Math.sin(s.phase)+1)/2;
      const alpha=s.alpha*(.14+.86*brightness**1.6),x=s.x+s.dx,y=s.y+s.dy;
      ctx.globalAlpha=alpha;const size=s.r*4;ctx.drawImage(dots[s.blue?0:1],x-size/2,y-size/2,size,size);
      if(s.r>1.1){
        ctx.globalAlpha=alpha*.15;ctx.fillStyle='#d2d8ff';
        ctx.beginPath();ctx.arc(x,y,s.r*3.5,0,turn);ctx.fill();
        ctx.globalAlpha=alpha*brightness**3*.35;ctx.strokeStyle='#e6e7ff';ctx.lineWidth=.5;
        const reach=s.r*(1.8+brightness*1.5);
        ctx.beginPath();ctx.moveTo(x-reach,y);ctx.lineTo(x+reach,y);ctx.moveTo(x,y-reach);ctx.lineTo(x,y+reach);ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
  }
  resize();frame=requestAnimationFrame(paint);window.addEventListener('resize',resize);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);},{once:true});
}

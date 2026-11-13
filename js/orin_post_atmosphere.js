(() => {
  'use strict';
  const canvas=document.getElementById('article-dust'),ctx=canvas?.getContext('2d');
  if(!ctx)return;
  const configNode=document.getElementById('orin-post-config');
  const config=configNode?JSON.parse(configNode.textContent):{particles:canvas.dataset.particles!=='false'};
  if(config.particles===false){canvas.hidden=true;return}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const events=new AbortController(),{signal}=events;
  let width=0,height=0,frame=0,measureFrame=0,lastTime=0,stars=[],exclusions=[],disposed=false;
  let pointer={x:-1000,y:-1000};
  function measure(){
    measureFrame=0;
    // Cache layout only on resize/scroll. Leave every reading and input region clear.
    exclusions=[...document.querySelectorAll('.site-header,.preview-note,.reading-column,.reading-rail,.site-footer,.hero-inner h1,.hero-inner .dek,.hero-inner .eyebrow,.hero-inner .article-meta,#orin-pages h1,#orin-pages h2,#orin-pages p,.entry-side,.entry-labels,.list-tools,.section-links,.person-row,.page-pagination,.friend')].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<height).map(r=>({left:r.left-18,right:r.right+18,top:r.top-14,bottom:r.bottom+14}));
  }
  function draw(dt){
    ctx.clearRect(0,0,width,height);
    if(reduced.matches){canvas.dataset.motion='reduced';return}
    for(const star of stars){
      star.x=(star.x+star.vx*dt+width)%width;star.y=(star.y-star.vy*dt+height)%height;
      const dx=star.x-pointer.x,dy=star.y-pointer.y,d=Math.hypot(dx,dy)||1;
      const force=fine.matches?Math.max(0,1-d/105)*7:0;
      const x=star.x+dx/d*force,y=star.y+dy/d*force;
      if(exclusions.some(r=>x>r.left&&x<r.right&&y>r.top&&y<r.bottom))continue;
      ctx.fillStyle='#c5dfff';ctx.globalAlpha=star.alpha;ctx.beginPath();ctx.arc(x,y,star.r,0,Math.PI*2);ctx.fill();
      if(star.r>1.2){ctx.globalAlpha=.055;ctx.beginPath();ctx.arc(x,y,star.r*3.2,0,Math.PI*2);ctx.fill()}
    }
    ctx.globalAlpha=1;
  }
  function tick(now){
    frame=0;if(disposed||document.hidden)return;
    if(reduced.matches){draw(0);return}
    if(!lastTime||now-lastTime>=32){draw(lastTime?Math.min((now-lastTime)/1000,.07):0);lastTime=now}
    frame=requestAnimationFrame(tick);
  }
  function start(){if(!disposed&&!frame&&!document.hidden&&!reduced.matches){lastTime=0;canvas.dataset.motion='running';frame=requestAnimationFrame(tick)}}
  function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;canvas.dataset.motion='paused'}
  function resize(){
    width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    let seed=1987;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
    stars=Array.from({length:width<=600?32:Math.min(110,Math.ceil(width*height/12500))},()=>({x:random()*width,y:random()*height,r:.5+random()*1.1,vx:(random()-.5)*3,vy:3+random()*5,alpha:.24+random()*.24}));
    measure();draw(0);start();
  }
  const queueMeasure=()=>{if(!measureFrame)measureFrame=requestAnimationFrame(()=>{measure();draw(0)})};
  window.addEventListener('resize',resize,{signal,passive:true});
  window.addEventListener('scroll',queueMeasure,{signal,passive:true});
  window.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')pointer={x:e.clientX,y:e.clientY}},{signal,passive:true});
  document.addEventListener('pointerleave',()=>pointer={x:-1000,y:-1000},{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()},{signal});
  reduced.addEventListener('change',()=>{stop();draw(0);start()},{signal});
  const observer=new ResizeObserver(queueMeasure);observer.observe(document.body);
  window.addEventListener('pagehide',()=>{stop();cancelAnimationFrame(measureFrame);measureFrame=0},{signal});
  window.addEventListener('pageshow',()=>{measure();draw(0);start()},{signal});
  window.disposeArticleAtmosphere=()=>{disposed=true;stop();cancelAnimationFrame(measureFrame);events.abort();observer.disconnect();ctx.clearRect(0,0,width,height)};
  resize();
})();
